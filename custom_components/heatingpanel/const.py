"""Constants for the Heating Panel integration."""

from __future__ import annotations

DOMAIN = "heatingpanel"

STORAGE_KEY = DOMAIN
STORAGE_VERSION = 1

# A schedule day runs from 05:00 until 05:00 on the following day, so the
# night belongs to the evening before (same as the original timeline).
DAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
DAY_START_MINUTES = 5 * 60
DAY_MINUTES = 24 * 60
SEGMENTS = 5
STEP_MINUTES = 15

# Temperatures are stored in the unit of the Home Assistant instance.
# The schema only checks this wide range, the unit specific limits are checked later.
TEMP_STEP = 0.5
ABSOLUTE_MIN_TEMP = 4.0
ABSOLUTE_MAX_TEMP = 86.0
UNIT_PRESETS = {
    "°C": {"min": 4.0, "max": 30.0, "step": 0.5, "day": (19.0, 20.0, 19.0, 20.0, 19.0)},
    "°F": {"min": 40.0, "max": 86.0, "step": 1.0, "day": (66.0, 68.0, 66.0, 68.0, 66.0)},
}

MODE_SCHEDULE = "schedule"
MODE_MANUAL = "manual"
MODE_VACATION = "vacation"

SIGNAL_UPDATED = f"{DOMAIN}_updated"

PANEL_URL_PATH = "heatingpanel"
PANEL_ELEMENT = "heatingpanel-panel"
PANEL_FILENAME = "heatingpanel-panel.js"
PANEL_ICON = "mdi:radiator"
PANEL_TITLES = {"de": "Heizung"}
PANEL_TITLE_DEFAULT = "Heating"

CONF_SIDEBAR_TITLE = "sidebar_title"
CONF_SIDEBAR_ICON = "sidebar_icon"
FRONTEND_URL = "/heatingpanel_static"

DATA_STATIC_REGISTERED = f"{DOMAIN}_static_registered"
