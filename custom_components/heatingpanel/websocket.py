"""Websocket API used by the panel."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from functools import wraps
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import DOMAIN, SIGNAL_UPDATED
from .controller import HeatingController, ZoneError
from .model import valid_temperature, validate_schedule

ZONE_SCHEMA = vol.Schema(
    {
        vol.Optional("id"): vol.Any(None, cv.string),
        vol.Required("name"): vol.All(cv.string, vol.Strip, vol.Length(min=1, max=64)),
        vol.Required("entities"): [cv.entity_domain("climate")],
        vol.Required("schedule"): validate_schedule,
    }
)
ZONE_IDS = vol.All([cv.string], vol.Length(min=1))
HOURS = vol.All(vol.Coerce(float), vol.Range(min=0.25, max=24 * 14))


def _controller(hass: HomeAssistant) -> HeatingController | None:
    return hass.data.get(DOMAIN)


def _handler(
    func: Callable[[HeatingController, dict[str, Any]], Awaitable[Any]],
) -> Callable[[HomeAssistant, websocket_api.ActiveConnection, dict[str, Any]], Awaitable[None]]:
    """Look up the controller, run the command and turn errors into websocket errors."""

    @wraps(func)
    async def wrapper(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        controller = _controller(hass)
        if controller is None:
            connection.send_error(msg["id"], "not_loaded", "Heating Panel is not set up")
            return
        try:
            result = await func(controller, msg)
        except ZoneError as err:
            connection.send_error(msg["id"], err.code, str(err))
            return
        connection.send_result(msg["id"], result)

    return wrapper


@callback
def async_register(hass: HomeAssistant) -> None:
    """Register the websocket commands."""
    for command in (
        ws_subscribe,
        ws_save_zone,
        ws_delete_zone,
        ws_set_manual,
        ws_clear_manual,
        ws_set_vacation,
        ws_clear_vacation,
    ):
        websocket_api.async_register_command(hass, command)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/subscribe"})
@callback
def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Send all zones now and again after every change."""
    controller = _controller(hass)
    if controller is None:
        connection.send_error(msg["id"], "not_loaded", "Heating Panel is not set up")
        return

    @callback
    def forward() -> None:
        connection.send_message(websocket_api.event_message(msg["id"], controller.snapshot()))

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, SIGNAL_UPDATED, forward)
    connection.send_result(msg["id"])
    forward()


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/zone/save", vol.Required("zone"): ZONE_SCHEMA})
@websocket_api.async_response
@_handler
async def ws_save_zone(controller: HeatingController, msg: dict[str, Any]) -> dict[str, Any]:
    """Create or update a zone."""
    return await controller.async_save_zone(msg["zone"])


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/zone/delete", vol.Required("zone_id"): cv.string})
@websocket_api.async_response
@_handler
async def ws_delete_zone(controller: HeatingController, msg: dict[str, Any]) -> None:
    """Delete a zone."""
    await controller.async_delete_zone(msg["zone_id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/manual/set",
        vol.Required("zone_ids"): ZONE_IDS,
        vol.Required("temperature"): valid_temperature,
        vol.Required("hours"): HOURS,
    }
)
@websocket_api.async_response
@_handler
async def ws_set_manual(controller: HeatingController, msg: dict[str, Any]) -> None:
    """Switch zones to manual mode."""
    await controller.async_set_manual(msg["zone_ids"], msg["temperature"], msg["hours"])


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/manual/clear", vol.Required("zone_ids"): ZONE_IDS})
@websocket_api.async_response
@_handler
async def ws_clear_manual(controller: HeatingController, msg: dict[str, Any]) -> None:
    """End manual mode."""
    await controller.async_clear_manual(msg["zone_ids"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/vacation/set",
        vol.Required("zone_ids"): ZONE_IDS,
        vol.Required("temperature"): valid_temperature,
    }
)
@websocket_api.async_response
@_handler
async def ws_set_vacation(controller: HeatingController, msg: dict[str, Any]) -> None:
    """Switch zones to vacation mode."""
    await controller.async_set_vacation(msg["zone_ids"], msg["temperature"])


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/vacation/clear", vol.Required("zone_ids"): ZONE_IDS})
@websocket_api.async_response
@_handler
async def ws_clear_vacation(controller: HeatingController, msg: dict[str, Any]) -> None:
    """End vacation mode."""
    await controller.async_clear_vacation(msg["zone_ids"])
