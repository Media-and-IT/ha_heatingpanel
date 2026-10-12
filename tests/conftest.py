"""Fixtures for Heating Panel tests."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from homeassistant.core import HomeAssistant

from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.heatingpanel.const import DOMAIN


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Allow loading custom_components in every test."""
    return


@pytest.fixture
def mock_panel():
    """Skip the sidebar panel, the test environment has no frontend."""
    with (
        patch("custom_components.heatingpanel.async_register_panel") as register,
        patch("custom_components.heatingpanel.async_unregister_panel") as unregister,
    ):
        yield register, unregister


@pytest.fixture
async def setup_integration(hass: HomeAssistant, mock_panel) -> MockConfigEntry:
    """Set up the integration with an empty store."""
    entry = MockConfigEntry(domain=DOMAIN, title="Heizungssteuerung")
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry
