"""Actions for automations, e.g. vacation mode when everybody has left."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN
from .controller import HeatingController, ZoneError
from .model import valid_temperature

ZONES = vol.All(cv.ensure_list, [cv.string])

SCHEMA_ZONES = vol.Schema({vol.Optional("zones", default=[]): ZONES})
SCHEMA_VACATION = SCHEMA_ZONES.extend({vol.Required("temperature"): valid_temperature})
SCHEMA_MANUAL = SCHEMA_VACATION.extend(
    {vol.Required("hours"): vol.All(vol.Coerce(float), vol.Range(min=0.25, max=24 * 14))}
)


def _resolve(hass: HomeAssistant, call: ServiceCall) -> tuple[HeatingController, list[str]]:
    """Return the controller and the ids of the zones named in the call (all if none)."""
    controller: HeatingController | None = hass.data.get(DOMAIN)
    if controller is None:
        raise ServiceValidationError("Heating Panel is not set up")
    zones = controller.store.zones
    names = call.data["zones"]
    if not names:
        return controller, [zone["id"] for zone in zones]
    ids = []
    for name in names:
        wanted = name.strip().casefold()
        zone = next(
            (z for z in zones if z["id"] == name or z["name"].casefold() == wanted),
            None,
        )
        if zone is None:
            raise ServiceValidationError(f"Unknown zone: {name}")
        ids.append(zone["id"])
    return controller, ids


@callback
def async_register(hass: HomeAssistant) -> None:
    """Register the actions."""

    async def set_vacation(call: ServiceCall) -> None:
        controller, ids = _resolve(hass, call)
        await _run(controller.async_set_vacation(ids, call.data["temperature"]))

    async def clear_vacation(call: ServiceCall) -> None:
        controller, ids = _resolve(hass, call)
        await _run(controller.async_clear_vacation(ids))

    async def set_manual(call: ServiceCall) -> None:
        controller, ids = _resolve(hass, call)
        await _run(controller.async_set_manual(ids, call.data["temperature"], call.data["hours"]))

    async def clear_manual(call: ServiceCall) -> None:
        controller, ids = _resolve(hass, call)
        await _run(controller.async_clear_manual(ids))

    hass.services.async_register(DOMAIN, "set_vacation", set_vacation, SCHEMA_VACATION)
    hass.services.async_register(DOMAIN, "clear_vacation", clear_vacation, SCHEMA_ZONES)
    hass.services.async_register(DOMAIN, "set_manual", set_manual, SCHEMA_MANUAL)
    hass.services.async_register(DOMAIN, "clear_manual", clear_manual, SCHEMA_ZONES)


async def _run(job: Any) -> None:
    try:
        await job
    except ZoneError as err:
        raise ServiceValidationError(str(err)) from err
