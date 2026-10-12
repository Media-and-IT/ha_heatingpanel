"""Tests for setup, websocket API, controller and actions."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from unittest.mock import patch

from freezegun.api import FrozenDateTimeFactory
import pytest

from homeassistant import config_entries
from homeassistant.const import ATTR_TEMPERATURE
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.exceptions import ServiceValidationError
from homeassistant.util import dt as dt_util
from homeassistant.util.unit_system import US_CUSTOMARY_SYSTEM

from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
    async_mock_service,
)

from custom_components.heatingpanel.const import DOMAIN
from custom_components.heatingpanel.model import default_schedule


def next_monday_8() -> datetime:
    """Next Monday 08:00, the default schedule wants 20 °C from 07:00 to 09:00.

    Always in the future, so timers scheduled at setup still fire when time moves on.
    """
    now = dt_util.now()
    days = (7 - now.weekday()) % 7 or 7
    return (now + timedelta(days=days)).replace(hour=8, minute=0, second=0, microsecond=0)


@pytest.fixture
def calls(hass: HomeAssistant) -> list[ServiceCall]:
    """Thermostat stubs that follow set_temperature calls."""
    for entity_id in ("climate.wohnzimmer", "climate.bad"):
        hass.states.async_set(entity_id, "heat", {ATTR_TEMPERATURE: 17.0, "min_temp": 5, "max_temp": 28})
    recorded = async_mock_service(hass, "climate", "set_temperature")
    return recorded


async def save_zone(client, **zone: Any) -> dict[str, Any]:
    zone.setdefault("schedule", default_schedule())
    await client.send_json_auto_id({"type": f"{DOMAIN}/zone/save", "zone": zone})
    msg = await client.receive_json()
    assert msg["success"], msg
    return msg["result"]


async def ws(client, **payload: Any) -> dict[str, Any]:
    await client.send_json_auto_id(payload)
    return await client.receive_json()


def targets(calls: list[ServiceCall]) -> list[tuple[str, float]]:
    return [(call.data["entity_id"], call.data[ATTR_TEMPERATURE]) for call in calls]


async def test_config_flow_single_instance(hass: HomeAssistant, mock_panel) -> None:
    """The flow creates one entry and refuses a second one."""
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert mock_panel[0].called

    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.ABORT


async def test_schedule_applies_and_follows_time(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, calls, setup_integration, hass_ws_client
) -> None:
    """A saved zone gets the scheduled temperature and the next one at the bound."""
    client = await hass_ws_client(hass)
    start = next_monday_8()
    freezer.move_to(start)
    zone = await save_zone(client, name="Wohnzimmer", entities=["climate.wohnzimmer"])
    await hass.async_block_till_done()
    assert targets(calls) == [("climate.wohnzimmer", 20.0)]

    await client.send_json_auto_id({"type": f"{DOMAIN}/subscribe"})
    assert (await client.receive_json())["success"]
    event = (await client.receive_json())["event"]
    assert event["zones"][0]["id"] == zone["id"]
    assert event["zones"][0]["status"] == {"mode": "schedule", "target": 20.0, "until": None}

    # Nothing is sent again while the target stays the same.
    freezer.move_to(start + timedelta(minutes=30))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(calls) == 1

    freezer.move_to(start + timedelta(hours=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert targets(calls)[-1] == ("climate.wohnzimmer", 19.0)



async def test_manual_overrides_vacation_and_expires(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, calls, setup_integration, hass_ws_client
) -> None:
    """Manual beats vacation, vacation beats schedule, manual ends by itself."""
    client = await hass_ws_client(hass)
    start = next_monday_8()
    freezer.move_to(start)
    zone = await save_zone(client, name="Bad", entities=["climate.bad"])

    msg = await ws(client, type=f"{DOMAIN}/vacation/set", zone_ids=[zone["id"]], temperature=15)
    assert msg["success"]
    msg = await ws(client, type=f"{DOMAIN}/manual/set", zone_ids=[zone["id"]], temperature=25, hours=2)
    assert msg["success"]
    await hass.async_block_till_done()
    assert targets(calls) == [("climate.bad", 20.0), ("climate.bad", 15.0), ("climate.bad", 25.0)]

    freezer.move_to(start + timedelta(hours=2))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert targets(calls)[-1] == ("climate.bad", 15.0)
    assert hass.data[DOMAIN].store.get(zone["id"])["manual"] is None

    msg = await ws(client, type=f"{DOMAIN}/vacation/clear", zone_ids=[zone["id"]])
    assert msg["success"]
    await hass.async_block_till_done()
    assert targets(calls)[-1] == ("climate.bad", 19.0)


async def test_target_is_clamped_and_off_is_respected(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, calls, setup_integration, hass_ws_client
) -> None:
    """Limits of the thermostat apply and switched off thermostats stay off."""
    client = await hass_ws_client(hass)
    start = next_monday_8()
    freezer.move_to(start)
    hass.states.async_set("climate.bad", "off", {ATTR_TEMPERATURE: 17.0})
    zone = await save_zone(client, name="Mix", entities=["climate.wohnzimmer", "climate.bad"])
    await ws(client, type=f"{DOMAIN}/manual/set", zone_ids=[zone["id"]], temperature=30, hours=1)
    await hass.async_block_till_done()
    assert targets(calls) == [("climate.wohnzimmer", 20.0), ("climate.wohnzimmer", 28.0)]

    # Switched on again: the current target is sent on the next tick.
    hass.states.async_set("climate.bad", "heat", {ATTR_TEMPERATURE: 17.0})
    freezer.tick(timedelta(minutes=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert targets(calls)[-1] == ("climate.bad", 30.0)


async def test_thermostat_only_in_one_zone(hass: HomeAssistant, calls, setup_integration, hass_ws_client) -> None:
    """A thermostat cannot be assigned to two zones."""
    client = await hass_ws_client(hass)
    await save_zone(client, name="A", entities=["climate.bad"])
    msg = await ws(
        client,
        type=f"{DOMAIN}/zone/save",
        zone={"name": "B", "entities": ["climate.bad"], "schedule": default_schedule()},
    )
    assert not msg["success"]
    assert msg["error"]["code"] == "entity_in_use"


async def test_invalid_schedule_rejected(hass: HomeAssistant, setup_integration, hass_ws_client) -> None:
    """Overlapping bounds are refused by the websocket schema."""
    client = await hass_ws_client(hass)
    schedule = default_schedule()
    schedule["tue"]["bounds"] = [600, 240, 700, 960]
    msg = await ws(client, type=f"{DOMAIN}/zone/save", zone={"name": "X", "entities": [], "schedule": schedule})
    assert not msg["success"]
    assert msg["error"]["code"] == "invalid_format"


async def test_save_keeps_overrides_and_delete(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, calls, setup_integration, hass_ws_client
) -> None:
    """Saving the schedule keeps vacation mode, deleting removes the zone."""
    client = await hass_ws_client(hass)
    start = next_monday_8()
    freezer.move_to(start)
    zone = await save_zone(client, name="Bad", entities=["climate.bad"])
    await ws(client, type=f"{DOMAIN}/vacation/set", zone_ids=[zone["id"]], temperature=12)
    saved = await save_zone(client, id=zone["id"], name="Badezimmer", entities=["climate.bad"])
    assert saved["name"] == "Badezimmer"
    assert saved["vacation"] == {"temperature": 12.0}

    msg = await ws(client, type=f"{DOMAIN}/zone/delete", zone_id=zone["id"])
    assert msg["success"]
    assert hass.data[DOMAIN].store.zones == []
    msg = await ws(client, type=f"{DOMAIN}/zone/delete", zone_id=zone["id"])
    assert msg["error"]["code"] == "zone_not_found"


async def test_actions_by_zone_name(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, calls, setup_integration, hass_ws_client
) -> None:
    """Actions accept zone names and default to all zones."""
    client = await hass_ws_client(hass)
    start = next_monday_8()
    freezer.move_to(start)
    a = await save_zone(client, name="Wohnzimmer", entities=["climate.wohnzimmer"])
    b = await save_zone(client, name="Bad", entities=["climate.bad"])
    store = hass.data[DOMAIN].store

    await hass.services.async_call(DOMAIN, "set_vacation", {"temperature": 16}, blocking=True)
    assert store.get(a["id"])["vacation"] == store.get(b["id"])["vacation"] == {"temperature": 16.0}

    await hass.services.async_call(DOMAIN, "clear_vacation", {"zones": ["wohnzimmer"]}, blocking=True)
    assert store.get(a["id"])["vacation"] is None
    assert store.get(b["id"])["vacation"] is not None

    await hass.services.async_call(DOMAIN, "set_manual", {"zones": "Bad", "temperature": 24, "hours": 1.5}, blocking=True)
    assert store.get(b["id"])["manual"]["until"] == (start + timedelta(hours=1, minutes=30)).isoformat()

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(DOMAIN, "clear_manual", {"zones": ["Keller"]}, blocking=True)


async def test_zones_survive_reload(hass: HomeAssistant, calls, setup_integration, hass_ws_client, mock_panel) -> None:
    """Zones are stored and loaded again, unload removes the panel."""
    client = await hass_ws_client(hass)
    await save_zone(client, name="Wohnzimmer", entities=["climate.wohnzimmer"])
    entry: MockConfigEntry = setup_integration

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert mock_panel[1].called
    assert [zone["name"] for zone in hass.data[DOMAIN].store.zones] == ["Wohnzimmer"]


async def test_temperature_limits(hass: HomeAssistant, calls, setup_integration, hass_ws_client) -> None:
    """Temperatures outside the limits of the unit are refused."""
    client = await hass_ws_client(hass)
    zone = await save_zone(client, name="Bad", entities=["climate.bad"])
    msg = await ws(client, type=f"{DOMAIN}/vacation/set", zone_ids=[zone["id"]], temperature=31)
    assert msg["error"]["code"] == "invalid_temperature"
    schedule = default_schedule()
    schedule["sun"]["temps"][2] = 40
    msg = await ws(client, type=f"{DOMAIN}/zone/save", zone={"name": "X", "entities": [], "schedule": schedule})
    assert msg["error"]["code"] == "invalid_temperature"


async def test_fahrenheit(hass: HomeAssistant, calls, mock_panel, hass_ws_client) -> None:
    """With US units the panel gets °F limits and °F values are accepted."""
    hass.config.units = US_CUSTOMARY_SYSTEM
    entry = MockConfigEntry(domain=DOMAIN)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    sub = await hass_ws_client(hass)
    await sub.send_json_auto_id({"type": f"{DOMAIN}/subscribe"})
    assert (await sub.receive_json())["success"]
    event = (await sub.receive_json())["event"]
    assert event["unit"] == "°F"
    assert (event["min_temp"], event["max_temp"], event["step"]) == (40.0, 86.0, 1.0)
    assert event["default_day"] == [66.0, 68.0, 66.0, 68.0, 66.0]

    client = await hass_ws_client(hass)
    zone = await save_zone(client, name="Den", entities=["climate.bad"], schedule=default_schedule("°F"))
    msg = await ws(client, type=f"{DOMAIN}/vacation/set", zone_ids=[zone["id"]], temperature=50)
    assert msg["success"]
    msg = await ws(client, type=f"{DOMAIN}/vacation/set", zone_ids=[zone["id"]], temperature=20)
    assert msg["error"]["code"] == "invalid_temperature"


async def test_options_change_sidebar(hass: HomeAssistant, setup_integration, mock_panel) -> None:
    """The options flow sets title and icon and the panel is registered again."""
    register = mock_panel[0]
    assert register.call_args.args[1:] == ("Heating", "mdi:radiator")
    entry: MockConfigEntry = setup_integration
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"sidebar_title": "Heizung OG", "sidebar_icon": "mdi:fire"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert register.call_args.args[1:] == ("Heizung OG", "mdi:fire")


async def test_sidebar_title_follows_language(hass: HomeAssistant, mock_panel) -> None:
    """German instances get a German sidebar title."""
    hass.config.language = "de"
    entry = MockConfigEntry(domain=DOMAIN)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    assert mock_panel[0].call_args.args[1] == "Heizung"


async def test_panel_registration(hass: HomeAssistant) -> None:
    """The panel is registered with a cache busting module url."""
    from custom_components.heatingpanel import panel

    class FakeHttp:
        def __init__(self) -> None:
            self.paths = []

        async def async_register_static_paths(self, configs) -> None:
            self.paths.extend(configs)

    hass.http = FakeHttp()
    with patch.object(panel.panel_custom, "async_register_panel") as register:
        await panel.async_register_panel(hass, "Heating", "mdi:radiator")
        await panel.async_register_panel(hass, "Heating", "mdi:radiator")
    assert len(hass.http.paths) == 1
    assert hass.http.paths[0].url_path == "/heatingpanel_static"
    kwargs = register.call_args.kwargs
    assert kwargs["webcomponent_name"] == "heatingpanel-panel"
    assert kwargs["module_url"].startswith("/heatingpanel_static/heatingpanel-panel.js?v=")
    assert (kwargs["sidebar_title"], kwargs["sidebar_icon"]) == ("Heating", "mdi:radiator")
