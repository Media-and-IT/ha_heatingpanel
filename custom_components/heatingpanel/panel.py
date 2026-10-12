"""Registers the sidebar panel."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from .const import (
    DATA_STATIC_REGISTERED,
    FRONTEND_URL,
    PANEL_ELEMENT,
    PANEL_FILENAME,
    PANEL_URL_PATH,
)

FRONTEND_DIR = Path(__file__).parent / "frontend"


async def async_register_panel(hass: HomeAssistant, title: str, icon: str) -> None:
    """Serve the panel script and add the panel to the sidebar."""
    if not hass.data.get(DATA_STATIC_REGISTERED):
        # Static paths cannot be removed again, so they survive a reload.
        await hass.http.async_register_static_paths(
            [StaticPathConfig(FRONTEND_URL, str(FRONTEND_DIR), False)]
        )
        hass.data[DATA_STATIC_REGISTERED] = True

    # The file time busts the browser cache after an update.
    mtime = await hass.async_add_executor_job(lambda: int((FRONTEND_DIR / PANEL_FILENAME).stat().st_mtime))
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=PANEL_ELEMENT,
        frontend_url_path=PANEL_URL_PATH,
        sidebar_title=title,
        sidebar_icon=icon,
        module_url=f"{FRONTEND_URL}/{PANEL_FILENAME}?v={mtime}",
        require_admin=False,
        config={},
    )


def async_unregister_panel(hass: HomeAssistant) -> None:
    """Remove the panel from the sidebar."""
    frontend.async_remove_panel(hass, PANEL_URL_PATH)
