"""Config flow: one click, everything else happens in the panel."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import selector

from .const import (
    CONF_SIDEBAR_ICON,
    CONF_SIDEBAR_TITLE,
    DOMAIN,
    PANEL_ICON,
    PANEL_TITLE_DEFAULT,
    PANEL_TITLES,
)


def default_sidebar_title(hass: HomeAssistant) -> str:
    """Return the sidebar title in the language of the instance."""
    return PANEL_TITLES.get((hass.config.language or "").split("-")[0], PANEL_TITLE_DEFAULT)


class HeatingPanelConfigFlow(ConfigFlow, domain=DOMAIN):
    """Create the single Heating Panel entry."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Confirm the setup."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is not None:
            return self.async_create_entry(title="Heating Panel", data={})
        return self.async_show_form(step_id="user")

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        """Return the options flow."""
        return HeatingPanelOptionsFlow()


class HeatingPanelOptionsFlow(OptionsFlow):
    """Change title and icon of the sidebar entry."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Show the options."""
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        options = self.config_entry.options
        schema = vol.Schema(
            {
                vol.Required(
                    CONF_SIDEBAR_TITLE,
                    default=options.get(CONF_SIDEBAR_TITLE) or default_sidebar_title(self.hass),
                ): selector.TextSelector(),
                vol.Required(
                    CONF_SIDEBAR_ICON,
                    default=options.get(CONF_SIDEBAR_ICON) or PANEL_ICON,
                ): selector.IconSelector(),
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)
