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

MIN_TEMP = 4.0
MAX_TEMP = 30.0
TEMP_STEP = 0.5

MODE_SCHEDULE = "schedule"
MODE_MANUAL = "manual"
MODE_VACATION = "vacation"

SIGNAL_UPDATED = f"{DOMAIN}_updated"

PANEL_URL_PATH = "heatingpanel"
PANEL_ELEMENT = "heatingpanel-panel"
PANEL_FILENAME = "heatingpanel-panel.js"
PANEL_TITLE = "Heizung"
PANEL_ICON = "mdi:radiator"
FRONTEND_URL = "/heatingpanel_static"

DATA_STATIC_REGISTERED = f"{DOMAIN}_static_registered"
