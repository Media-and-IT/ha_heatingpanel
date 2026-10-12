"""Persistent storage of the zones."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

import voluptuous as vol

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY, STORAGE_VERSION
from .model import default_schedule, validate_schedule


class HeatingStore:
    """Keeps the zones in memory and in .storage/heatingpanel."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the store."""
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self.zones: list[dict[str, Any]] = []

    async def async_load(self) -> None:
        """Load the zones from disk."""
        data = await self._store.async_load() or {}
        self.zones = [self._sanitize(zone) for zone in data.get("zones", [])]

    async def async_save(self) -> None:
        """Write the zones to disk."""
        await self._store.async_save({"zones": self.zones})

    async def async_remove(self) -> None:
        """Delete the storage file."""
        await self._store.async_remove()

    def get(self, zone_id: str) -> dict[str, Any] | None:
        """Return a zone by id."""
        return next((zone for zone in self.zones if zone["id"] == zone_id), None)

    def upsert(self, data: dict[str, Any]) -> dict[str, Any]:
        """Create or update name, thermostats and schedule of a zone.

        Manual and vacation overrides are left untouched, they have their own commands.
        """
        zone = self.get(data["id"]) if data.get("id") else None
        if zone is None:
            zone = {"id": uuid4().hex, "vacation": None, "manual": None}
            self.zones.append(zone)
        zone["name"] = data["name"]
        zone["entities"] = list(data["entities"])
        zone["schedule"] = data["schedule"]
        return zone

    def delete(self, zone_id: str) -> dict[str, Any] | None:
        """Remove a zone and return it."""
        zone = self.get(zone_id)
        if zone is not None:
            self.zones.remove(zone)
        return zone

    def _sanitize(self, zone: dict[str, Any]) -> dict[str, Any]:
        """Fill in missing keys of a stored zone."""
        try:
            schedule = validate_schedule(zone.get("schedule"))
        except vol.Invalid:
            schedule = default_schedule(self.hass.config.units.temperature_unit)
        return {
            "id": zone.get("id") or uuid4().hex,
            "name": zone.get("name") or "Zone",
            "entities": list(zone.get("entities") or []),
            "schedule": schedule,
            "vacation": zone.get("vacation"),
            "manual": zone.get("manual"),
        }
