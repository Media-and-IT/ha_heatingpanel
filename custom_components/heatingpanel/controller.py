"""Applies the zone target temperatures to the thermostats."""

from __future__ import annotations

import asyncio
from collections.abc import Callable, Iterable
from datetime import datetime, timedelta
import logging
from typing import Any

import voluptuous as vol

from homeassistant.const import (
    ATTR_ENTITY_ID,
    ATTR_TEMPERATURE,
    STATE_OFF,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_time_change
from homeassistant.util import dt as dt_util

from .const import SIGNAL_UPDATED
from .model import manual_active, schedule_temperatures, unit_preset, zone_status
from .store import HeatingStore

_LOGGER = logging.getLogger(__name__)

CLIMATE_DOMAIN = "climate"
SERVICE_SET_TEMPERATURE = "set_temperature"


class ZoneError(Exception):
    """Raised when a zone operation is not possible."""

    def __init__(self, code: str, message: str) -> None:
        """Initialize the error."""
        super().__init__(message)
        self.code = code


class HeatingController:
    """Checks every minute which temperature each zone wants and sends it on change.

    A temperature is only sent when the zone's target changes (or after a restart),
    so a thermostat adjusted by hand keeps its value until the next change.
    """

    def __init__(self, hass: HomeAssistant, store: HeatingStore) -> None:
        """Initialize the controller."""
        self.hass = hass
        self.store = store
        self._applied: dict[str, float] = {}
        self._statuses: dict[str, dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        self._unsub_tick: Callable[[], None] | None = None

    async def async_start(self) -> None:
        """Start the minute tick and apply the current targets."""
        self._unsub_tick = async_track_time_change(self.hass, self._handle_tick, second=0)
        await self.async_refresh()

    @callback
    def async_stop(self) -> None:
        """Stop the minute tick."""
        if self._unsub_tick is not None:
            self._unsub_tick()
            self._unsub_tick = None

    @callback
    def _handle_tick(self, _now: datetime) -> None:
        self.hass.async_create_task(self.async_refresh(), eager_start=True)

    @property
    def unit(self) -> str:
        """Temperature unit of the Home Assistant instance."""
        return self.hass.config.units.temperature_unit

    def snapshot(self) -> dict[str, Any]:
        """Return all zones with their current status and the unit settings for the panel."""
        now = dt_util.now()
        preset = unit_preset(self.unit)
        return {
            "zones": [{**zone, "status": zone_status(zone, now)} for zone in self.store.zones],
            "unit": self.unit,
            "min_temp": preset["min"],
            "max_temp": preset["max"],
            "step": preset["step"],
            "default_day": list(preset["day"]),
        }

    def _check_temperatures(self, temperatures: Iterable[float]) -> None:
        """Reject temperatures outside the limits of the configured unit."""
        preset = unit_preset(self.unit)
        for temperature in temperatures:
            if not preset["min"] <= temperature <= preset["max"]:
                raise ZoneError(
                    "invalid_temperature",
                    f"{temperature} {self.unit} is outside {preset['min']} to {preset['max']} {self.unit}",
                )

    async def async_refresh(self, *, notify: bool = False) -> None:
        """Expire manual overrides, apply targets and notify the panel on changes."""
        async with self._lock:
            now = dt_util.now()
            expired = False
            for zone in self.store.zones:
                if zone.get("manual") and not manual_active(zone, now):
                    zone["manual"] = None
                    expired = True
            if expired:
                await self.store.async_save()

            statuses: dict[str, dict[str, Any]] = {}
            jobs = []
            for zone in self.store.zones:
                status = zone_status(zone, now)
                statuses[zone["id"]] = status
                jobs.extend(self._async_apply(entity_id, status["target"]) for entity_id in zone["entities"])
            if jobs:
                await asyncio.gather(*jobs)

            if notify or expired or statuses != self._statuses:
                self._statuses = statuses
                async_dispatcher_send(self.hass, SIGNAL_UPDATED)

    async def _async_apply(self, entity_id: str, target: float) -> None:
        if self._applied.get(entity_id) == target:
            return
        state = self.hass.states.get(entity_id)
        # Unavailable thermostats are retried on the next tick. Thermostats switched
        # off on purpose (e.g. in summer) are left alone until they are on again.
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN, STATE_OFF):
            return
        temperature = _clamp(target, state.attributes)
        if state.attributes.get(ATTR_TEMPERATURE) != temperature:
            try:
                await self.hass.services.async_call(
                    CLIMATE_DOMAIN,
                    SERVICE_SET_TEMPERATURE,
                    {ATTR_ENTITY_ID: entity_id, ATTR_TEMPERATURE: temperature},
                    blocking=True,
                )
            except (HomeAssistantError, vol.Invalid) as err:
                _LOGGER.warning("Could not set %s to %s %s: %s", entity_id, temperature, self.unit, err)
                return
            _LOGGER.debug("Set %s to %s %s", entity_id, temperature, self.unit)
        self._applied[entity_id] = target

    def _forget(self, entity_ids: Iterable[str]) -> None:
        for entity_id in entity_ids:
            self._applied.pop(entity_id, None)

    def _zones(self, zone_ids: Iterable[str]) -> list[dict[str, Any]]:
        zones = []
        for zone_id in zone_ids:
            zone = self.store.get(zone_id)
            if zone is None:
                raise ZoneError("zone_not_found", f"Zone {zone_id} not found")
            zones.append(zone)
        return zones

    async def _async_commit(self, entity_ids: Iterable[str]) -> None:
        await self.store.async_save()
        self._forget(entity_ids)
        await self.async_refresh(notify=True)

    async def async_save_zone(self, data: dict[str, Any]) -> dict[str, Any]:
        """Create or update a zone."""
        zone_id = data.get("id")
        self._check_temperatures(schedule_temperatures(data["schedule"]))
        if zone_id and self.store.get(zone_id) is None:
            raise ZoneError("zone_not_found", f"Zone {zone_id} not found")
        for other in self.store.zones:
            if other["id"] == zone_id:
                continue
            taken = set(other["entities"]) & set(data["entities"])
            if taken:
                raise ZoneError(
                    "entity_in_use",
                    f"{', '.join(sorted(taken))} already belongs to zone {other['name']}",
                )
        previous = self.store.get(zone_id)["entities"] if zone_id else []
        zone = self.store.upsert(data)
        await self._async_commit([*previous, *zone["entities"]])
        return zone

    async def async_delete_zone(self, zone_id: str) -> None:
        """Delete a zone. Its thermostats keep their last temperature."""
        (zone,) = self._zones([zone_id])
        self.store.delete(zone_id)
        await self._async_commit(zone["entities"])

    async def async_set_manual(self, zone_ids: Iterable[str], temperature: float, hours: float) -> None:
        """Override the zones with a fixed temperature for a number of hours."""
        self._check_temperatures([temperature])
        zones = self._zones(zone_ids)
        start = dt_util.now().replace(second=0, microsecond=0)
        until = (start + timedelta(hours=hours)).isoformat()
        for zone in zones:
            zone["manual"] = {"temperature": temperature, "until": until}
        await self._async_commit(e for zone in zones for e in zone["entities"])

    async def async_clear_manual(self, zone_ids: Iterable[str]) -> None:
        """End the manual override."""
        zones = self._zones(zone_ids)
        for zone in zones:
            zone["manual"] = None
        await self._async_commit(e for zone in zones for e in zone["entities"])

    async def async_set_vacation(self, zone_ids: Iterable[str], temperature: float) -> None:
        """Hold the zones at a fixed temperature until vacation mode is switched off."""
        self._check_temperatures([temperature])
        zones = self._zones(zone_ids)
        for zone in zones:
            zone["vacation"] = {"temperature": temperature}
        await self._async_commit(e for zone in zones for e in zone["entities"])

    async def async_clear_vacation(self, zone_ids: Iterable[str]) -> None:
        """End vacation mode."""
        zones = self._zones(zone_ids)
        for zone in zones:
            zone["vacation"] = None
        await self._async_commit(e for zone in zones for e in zone["entities"])


def _clamp(target: float, attributes: dict[str, Any]) -> float:
    """Keep the target within the limits the thermostat reports."""
    low = attributes.get("min_temp")
    high = attributes.get("max_temp")
    if isinstance(low, (int, float)):
        target = max(target, float(low))
    if isinstance(high, (int, float)):
        target = min(target, float(high))
    return target
