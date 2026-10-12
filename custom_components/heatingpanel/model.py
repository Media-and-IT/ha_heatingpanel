"""Zone data model and schedule calculations."""

from __future__ import annotations

from bisect import bisect_right
from datetime import datetime
from typing import Any

import voluptuous as vol

from homeassistant.util import dt as dt_util

from .const import (
    DAY_MINUTES,
    DAY_START_MINUTES,
    DAYS,
    MAX_TEMP,
    MIN_TEMP,
    MODE_MANUAL,
    MODE_SCHEDULE,
    MODE_VACATION,
    SEGMENTS,
    STEP_MINUTES,
    TEMP_STEP,
)


def round_temperature(value: float) -> float:
    """Round a temperature to the configured step (0.5 °C)."""
    return round(round(float(value) / TEMP_STEP) * TEMP_STEP, 1)


def valid_temperature(value: Any) -> float:
    """Voluptuous validator for a target temperature."""
    temperature = round_temperature(vol.Coerce(float)(value))
    if not MIN_TEMP <= temperature <= MAX_TEMP:
        raise vol.Invalid(f"temperature must be between {MIN_TEMP} and {MAX_TEMP}")
    return temperature


def default_day() -> dict[str, list]:
    """Return the schedule for a single day of a new zone."""
    # 07:00, 09:00, 15:00 and 21:00 as offsets from the 05:00 day start.
    return {"bounds": [120, 240, 600, 960], "temps": [19.0, 20.0, 19.0, 20.0, 19.0]}


def default_schedule() -> dict[str, dict[str, list]]:
    """Return the weekly schedule for a new zone."""
    return {day: default_day() for day in DAYS}


def validate_day(value: Any) -> dict[str, list]:
    """Validate one day: four ascending bounds and five temperatures."""
    if not isinstance(value, dict):
        raise vol.Invalid("day must be an object")
    try:
        bounds = [int(bound) for bound in value["bounds"]]
        temps = [valid_temperature(temp) for temp in value["temps"]]
    except (KeyError, TypeError, ValueError) as err:
        raise vol.Invalid(f"invalid day: {err}") from err
    if len(bounds) != SEGMENTS - 1 or len(temps) != SEGMENTS:
        raise vol.Invalid(f"a day needs {SEGMENTS - 1} bounds and {SEGMENTS} temperatures")
    previous = 0
    for bound in [*bounds, DAY_MINUTES]:
        if bound % STEP_MINUTES:
            raise vol.Invalid(f"bounds must be multiples of {STEP_MINUTES} minutes")
        if bound - previous < STEP_MINUTES:
            raise vol.Invalid("periods must be at least one step long")
        previous = bound
    return {"bounds": bounds, "temps": temps}


def validate_schedule(value: Any) -> dict[str, dict[str, list]]:
    """Validate a full week."""
    if not isinstance(value, dict):
        raise vol.Invalid("schedule must be an object")
    return {day: validate_day(value.get(day)) for day in DAYS}


def schedule_position(now: datetime) -> tuple[str, int]:
    """Return the schedule day and the minute offset within it for a local time."""
    offset = now.hour * 60 + now.minute - DAY_START_MINUTES
    weekday = now.weekday()
    if offset < 0:
        offset += DAY_MINUTES
        weekday = (weekday - 1) % 7
    return DAYS[weekday], offset


def scheduled_temperature(schedule: dict[str, dict[str, list]], now: datetime) -> float:
    """Return the temperature the weekly schedule asks for at the given time."""
    day, offset = schedule_position(now)
    entry = schedule[day]
    return entry["temps"][bisect_right(entry["bounds"], offset)]


def manual_active(zone: dict[str, Any], now: datetime) -> bool:
    """Return True while the zone's manual override has not expired."""
    manual = zone.get("manual")
    if not manual:
        return False
    until = dt_util.parse_datetime(manual["until"])
    return until is not None and until > now


def zone_status(zone: dict[str, Any], now: datetime) -> dict[str, Any]:
    """Return the effective mode and target temperature of a zone.

    Precedence: manual (time limited) over vacation over the weekly schedule.
    """
    if manual_active(zone, now):
        manual = zone["manual"]
        return {"mode": MODE_MANUAL, "target": manual["temperature"], "until": manual["until"]}
    if zone.get("vacation"):
        return {"mode": MODE_VACATION, "target": zone["vacation"]["temperature"], "until": None}
    return {
        "mode": MODE_SCHEDULE,
        "target": scheduled_temperature(zone["schedule"], now),
        "until": None,
    }
