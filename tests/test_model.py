"""Tests for the schedule calculations."""

from __future__ import annotations

from datetime import datetime

import pytest
import voluptuous as vol

from custom_components.heatingpanel.model import (
    default_day,
    schedule_position,
    scheduled_temperature,
    validate_day,
)

SCHEDULE = {
    day: {"bounds": [120, 240, 600, 960], "temps": [float(i), 10.0 + i, 20.0, 21.0, 22.0 + i * 0.5]}
    for i, day in enumerate(("mon", "tue", "wed", "thu", "fri", "sat", "sun"))
}


@pytest.mark.parametrize(
    ("now", "expected"),
    [
        (datetime(2026, 10, 12, 5, 0), ("mon", 0)),
        (datetime(2026, 10, 12, 4, 59), ("sun", 1439)),
        (datetime(2026, 10, 13, 0, 30), ("mon", 1170)),
        (datetime(2026, 10, 18, 23, 0), ("sun", 1080)),
    ],
)
def test_schedule_position(now: datetime, expected: tuple[str, int]) -> None:
    """The schedule day starts at 05:00."""
    assert schedule_position(now) == expected


@pytest.mark.parametrize(
    ("now", "expected"),
    [
        (datetime(2026, 10, 12, 6, 59), 0.0),  # Monday first period
        (datetime(2026, 10, 12, 7, 0), 10.0),  # bound belongs to the next period
        (datetime(2026, 10, 12, 15, 0), 21.0),
        (datetime(2026, 10, 13, 3, 0), 22.0),  # Monday night, already Tuesday by date
        (datetime(2026, 10, 13, 5, 0), 1.0),  # Tuesday first period
        (datetime(2026, 10, 12, 4, 0), 25.0),  # Sunday night
    ],
)
def test_scheduled_temperature(now: datetime, expected: float) -> None:
    """The right period is picked for a time of day."""
    assert scheduled_temperature(SCHEDULE, now) == expected


def test_validate_day_rounds_temperatures() -> None:
    """Temperatures are rounded to half degrees."""
    day = validate_day({"bounds": [15, 30, 45, 1425], "temps": [19.2, 20, 21.74, 4, 30]})
    assert day == {"bounds": [15, 30, 45, 1425], "temps": [19.0, 20.0, 21.5, 4.0, 30.0]}


@pytest.mark.parametrize(
    "day",
    [
        {"bounds": [120, 240, 600], "temps": [19, 19, 19, 19, 19]},
        {"bounds": [120, 240, 600, 960], "temps": [19, 19, 19, 19]},
        {"bounds": [120, 120, 600, 960], "temps": [19, 19, 19, 19, 19]},
        {"bounds": [0, 240, 600, 960], "temps": [19, 19, 19, 19, 19]},
        {"bounds": [120, 240, 600, 1440], "temps": [19, 19, 19, 19, 19]},
        {"bounds": [125, 240, 600, 960], "temps": [19, 19, 19, 19, 19]},
        {"bounds": [120, 240, 600, 960], "temps": [19, 19, 19, 19, 90]},
        {"bounds": [120, 240, 600, 960], "temps": [19, 19, 19, 19, 3.5]},
        None,
    ],
)
def test_validate_day_rejects(day) -> None:
    """Broken days are rejected."""
    with pytest.raises(vol.Invalid):
        validate_day(day)


@pytest.mark.parametrize("unit", ["°C", "°F"])
def test_default_day_is_valid(unit: str) -> None:
    """The default for new zones passes validation in both units."""
    assert validate_day(default_day(unit)) == default_day(unit)
