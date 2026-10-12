"""Config flow: one click, everything else happens in the panel."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN


class HeatingPanelConfigFlow(ConfigFlow, domain=DOMAIN):
    """Create the single Heating Panel entry."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Confirm the setup."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is not None:
            return self.async_create_entry(title="Heizungssteuerung", data={})
        return self.async_show_form(step_id="user")
