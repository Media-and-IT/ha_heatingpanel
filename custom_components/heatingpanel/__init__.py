"""Heating Panel: zones with weekly schedule, manual and vacation mode."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from . import services, websocket
from .const import DOMAIN
from .controller import HeatingController
from .panel import async_register_panel, async_unregister_panel
from .store import HeatingStore

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register websocket commands and actions once."""
    websocket.async_register(hass)
    services.async_register(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Load the zones, start the controller and show the panel."""
    store = HeatingStore(hass)
    await store.async_load()
    controller = HeatingController(hass, store)
    hass.data[DOMAIN] = controller
    await controller.async_start()
    await async_register_panel(hass)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Stop the controller and remove the panel."""
    controller: HeatingController | None = hass.data.pop(DOMAIN, None)
    if controller is not None:
        controller.async_stop()
    async_unregister_panel(hass)
    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Delete the stored zones when the integration is removed."""
    await HeatingStore(hass).async_remove()
