/*
 * Heating Panel: sidebar panel for zones, weekly schedules, manual and vacation mode.
 * Plain web component without build step. Talks to the integration via websocket.
 */

const DOMAIN = "heatingpanel";
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WORKDAYS = DAYS.slice(0, 5);
// Must match const.py: a schedule day runs from 05:00 to 05:00.
const DAY_START = 5 * 60;
const DAY_MINUTES = 24 * 60;
const STEP = 15;
const HOURS = Array.from({ length: 24 }, (_, i) => i + 1);
const MODE_ICONS = {
  schedule: "mdi:calendar-month-outline",
  manual: "mdi:hand-pointing-up",
  vacation: "mdi:airplane",
};
const DEFAULT_BOUNDS = [120, 240, 600, 960];
const ARROWS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 7 5.5 12l5 5zM13.5 7l5 5-5 5z"/></svg>';

const STRINGS = {
  en: {
    title: "Heating control",
    not_loaded: "The integration is not loaded.",
    unreachable: "Heating Panel is not available: {error}",
    loading: "Loading zones …",
    no_zones: "No zones yet. Use “Add zone” to create your first zone and assign thermostats to it.",
    add_zone: "Add zone",
    mode_schedule: "Schedule",
    mode_manual: "Manual mode",
    mode_vacation: "Vacation mode",
    manual_text: "Manual mode sets the temperature of the selected zones for a number of hours.",
    vacation_text: "Vacation mode holds the selected zones at one temperature until you switch it off.",
    configure: "Configure",
    temperature: "Temperature:",
    duration: "For:",
    zones_selected: "{count} of {total} zones selected",
    turn_on: "Turn on",
    cancel: "Cancel",
    manual_until: "Manual until {time}",
    no_thermostats: "No thermostats assigned",
    thermostats_unavailable: "{count} of {total} thermostats unavailable",
    end_manual: "End manual mode",
    end_vacation: "End vacation mode",
    off: "OFF",
    manage: "Manage",
    current: "Current {temp}",
    zone_name: "Zone name",
    rename: "Rename",
    thermostats: "Thermostats ({count})",
    delete: "Delete",
    save: "Save",
    unsaved: "Unsaved changes",
    week: "Week",
    week_hint: "Shifts a time boundary on all days by the same amount.",
    zone_thermostats: "Thermostats in this zone",
    search: "Search",
    in_zone: "in zone “{zone}”",
    not_found: "not found",
    no_climate: "No thermostats (climate entities) found.",
    manual_active: "Manual mode active: {temp} until {time}",
    turn_off: "turn off",
    manual_is_off: "Manual mode is off",
    after_first_save: "Available after the zone has been saved.",
    no_selection: "no selection",
    switch_on: "turn on",
    vacation_active: "Vacation mode active: {temp}",
    afterwards: " (afterwards)",
    night: "Night",
    range_label: "{day}, {from} to {to}",
    expand: "Expand {day}",
    collapse: "Collapse {day}",
    boundary: "{name}, boundary {number}",
    select_days: "Select days",
    whole_week: "Whole week",
    workdays: "Workdays",
    copy_to: "Copy to:",
    copy: "Copy",
    toast_manual_on: "Manual mode turned on",
    toast_vacation_on: "Vacation mode turned on",
    toast_manual_off: "Manual mode turned off",
    toast_vacation_off: "Vacation mode turned off",
    new_zone: "New zone",
    confirm_discard: "Discard unsaved changes?",
    confirm_delete: "Really delete zone “{name}”? The thermostats keep their last temperature.",
    toast_deleted: "Zone deleted",
    toast_copied: "{day} copied to {targets}",
    name_required: "Please enter a name.",
    toast_saved: "“{name}” saved",
    days_short: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    days_long: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  },
  de: {
    title: "Heizungssteuerung",
    not_loaded: "Die Integration ist nicht geladen.",
    unreachable: "Die Heizungssteuerung ist nicht erreichbar: {error}",
    loading: "Lade Zonen …",
    no_zones: "Noch keine Zonen angelegt. Lege mit „Zone hinzufügen“ deine erste Zone an und weise ihr Thermostate zu.",
    add_zone: "Zone hinzufügen",
    mode_schedule: "Zeitplan-Modus",
    mode_manual: "Manueller Modus",
    mode_vacation: "Urlaubsmodus",
    manual_text: "Der manuelle Modus ermöglicht es, die Temperatur in jeder Zone für eine bestimmte Anzahl an Stunden anzupassen.",
    vacation_text: "Der Urlaubsmodus ermöglicht es, die Temperatur Ihres Zuhauses von unterwegs aus in jeder Zone anzupassen.",
    configure: "Konfigurieren",
    temperature: "Temperatur:",
    duration: "Für:",
    zones_selected: "{count} von {total} Zonen ausgewählt",
    turn_on: "Einschalten",
    cancel: "Abbrechen",
    manual_until: "Manuell bis {time}",
    no_thermostats: "Keine Thermostate zugewiesen",
    thermostats_unavailable: "{count} von {total} Thermostaten nicht erreichbar",
    end_manual: "Manuellen Modus beenden",
    end_vacation: "Urlaubsmodus beenden",
    off: "OFF",
    manage: "Verwalten",
    current: "Ist {temp}",
    zone_name: "Name der Zone",
    rename: "Umbenennen",
    thermostats: "Thermostate ({count})",
    delete: "Löschen",
    save: "Speichern",
    unsaved: "Ungespeicherte Änderungen",
    week: "Woche",
    week_hint: "Verschiebt eine Zeitgrenze an allen Tagen gleichzeitig um denselben Betrag.",
    zone_thermostats: "Thermostate dieser Zone",
    search: "Suchen",
    in_zone: "in Zone „{zone}“",
    not_found: "nicht gefunden",
    no_climate: "Keine Thermostate (climate-Entitäten) gefunden.",
    manual_active: "Manueller Modus aktiv: {temp} bis {time}",
    turn_off: "ausschalten",
    manual_is_off: "Der manuelle Modus ist ausgeschaltet",
    after_first_save: "Nach dem ersten Speichern verfügbar.",
    no_selection: "keine Auswahl",
    switch_on: "einschalten",
    vacation_active: "Urlaubsmodus aktiv: {temp}",
    afterwards: " (danach)",
    night: "Nacht",
    range_label: "{day}, {from} bis {to}",
    expand: "{day} aufklappen",
    collapse: "{day} zuklappen",
    boundary: "{name}, Grenze {number}",
    select_days: "Tage auswählen",
    whole_week: "Die ganze Woche",
    workdays: "Arbeitstage",
    copy_to: "Kopieren für:",
    copy: "Kopieren",
    toast_manual_on: "Manueller Modus eingeschaltet",
    toast_vacation_on: "Urlaubsmodus eingeschaltet",
    toast_manual_off: "Manueller Modus ausgeschaltet",
    toast_vacation_off: "Urlaubsmodus ausgeschaltet",
    new_zone: "Neue Zone",
    confirm_discard: "Ungespeicherte Änderungen verwerfen?",
    confirm_delete: "Zone „{name}“ wirklich löschen? Die Thermostate behalten ihre letzte Temperatur.",
    toast_deleted: "Zone gelöscht",
    toast_copied: "{day} auf {targets} kopiert",
    name_required: "Bitte einen Namen vergeben.",
    toast_saved: "„{name}“ gespeichert",
    days_short: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    days_long: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
  },
};

// Language of the user and temperature unit of the instance, updated from hass and the subscription.
const i18n = { lang: "en", locale: "en" };
const units = { unit: "°C", min: 4, max: 30, step: 0.5, defaultDay: [19, 20, 19, 20, 19] };

/** Take the language from the user profile. Returns true when it changed. */
function setLanguage(hass) {
  const locale = hass.locale?.language || hass.language || "en";
  const base = locale.split("-")[0];
  const lang = STRINGS[base] ? base : "en";
  const changed = lang !== i18n.lang || locale !== i18n.locale;
  i18n.lang = lang;
  i18n.locale = locale;
  return changed;
}

function t(key, params = {}) {
  const text = STRINGS[i18n.lang][key] ?? STRINGS.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
}

const dayShort = (day) => STRINGS[i18n.lang].days_short[DAYS.indexOf(day)];
const dayLong = (day) => STRINGS[i18n.lang].days_long[DAYS.indexOf(day)];

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const clone = (value) => JSON.parse(JSON.stringify(value));
const pct = (minutes) => (minutes / DAY_MINUTES) * 100;

function fmtTemp(value) {
  if (value == null || Number.isNaN(Number(value))) return `--${units.unit}`;
  const digits = units.step < 1 ? 1 : 0;
  const number = Number(value).toLocaleString(i18n.locale, { minimumFractionDigits: digits, maximumFractionDigits: 1 });
  return `${number}${units.unit}`;
}

/** Colour of a period: cold below 17 °C, hot from 22 °C. */
function tempClass(value) {
  const celsius = units.unit === "°F" ? ((value - 32) * 5) / 9 : value;
  return celsius < 17 ? "cold" : celsius >= 22 ? "hot" : "ok";
}

/** Choice of temperatures for the selects, plus a stored value that is off the grid. */
function temperatures(current) {
  const list = [];
  for (let value = units.min; value <= units.max + 1e-9; value += units.step) list.push(Math.round(value * 10) / 10);
  if (current != null && !list.includes(current)) list.push(current);
  return list.sort((a, b) => a - b);
}

/** Clock time of a minute offset within a schedule day. */
function clock(offset, pad = true) {
  const minutes = (DAY_START + offset) % DAY_MINUTES;
  const h = Math.floor(minutes / 60);
  return `${pad ? String(h).padStart(2, "0") : h}:${String(minutes % 60).padStart(2, "0")}`;
}

function fmtUntil(iso) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString(i18n.locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString(i18n.locale, { weekday: "short" })} ${time}`;
}

/** Keep a bound between its neighbours with at least one step per period. */
function clampBound(bounds, idx, value) {
  const low = idx === 0 ? STEP : bounds[idx - 1] + STEP;
  const high = idx === bounds.length - 1 ? DAY_MINUTES - STEP : bounds[idx + 1] - STEP;
  return Math.min(high, Math.max(low, Math.round(value / STEP) * STEP));
}

function tempSelect(change, value, attrs = "", allowNone = false) {
  const none = allowNone ? `<option value="" ${value == null ? "selected" : ""}>${t("no_selection")}</option>` : "";
  const options = temperatures(value)
    .map((temp) => `<option value="${temp}" ${temp === value ? "selected" : ""}>${fmtTemp(temp)}</option>`)
    .join("");
  return `<select class="select" data-change="${change}" ${attrs}>${none}${options}</select>`;
}

function hoursSelect(change, value) {
  const options = HOURS.map(
    (h) => `<option value="${h}" ${h === value ? "selected" : ""}>${String(h).padStart(2, "0")} h</option>`,
  ).join("");
  return `<select class="select" data-change="${change}">${options}</select>`;
}

function checkbox(attrs, checked, disabled = false) {
  return `<input type="checkbox" class="check" ${attrs} ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>`;
}

class HeatingPanel extends HTMLElement {
  constructor() {
    super();
    this._zones = null;
    this._loadError = null;
    this._view = "list";
    this._config = null;
    this._draft = null;
    this._original = null;
    this._weekBounds = null;
    this._openDay = "mon";
    this._showEntities = false;
    this._entityFilter = "";
    this._editingName = false;
    this._manualForm = null;
    this._copyOpen = false;
    this._copyTargets = new Set();
    this._drag = null;
    this._pointerDown = false;
    this._pendingRender = false;
    this._busy = false;
    this._signature = "";
    this._unsubPromise = null;
    this._toastTimer = null;

    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STYLE}</style>
      <div class="toolbar"><span class="menu"></span><div class="title"></div></div>
      <div class="content"></div>
      <div class="toast" hidden></div>`;
    this._menuButton = document.createElement("ha-menu-button");
    root.querySelector(".menu").append(this._menuButton);

    root.addEventListener("click", (ev) => this._onClick(ev));
    root.addEventListener("change", (ev) => this._onChange(ev));
    root.addEventListener("input", (ev) => this._onInput(ev));
    root.addEventListener("keydown", (ev) => this._onKeyDown(ev));
    root.addEventListener("focusout", (ev) => this._onFocusOut(ev));
    root.addEventListener("pointerdown", (ev) => this._onPointerDown(ev));
    this._onPointerUp = () => {
      this._pointerDown = false;
      if (this._pendingRender) setTimeout(() => this._requestRender(), 0);
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._menuButton.hass = hass;
    this._subscribe();
    const languageChanged = setLanguage(hass);
    const signature = this._climateSignature();
    if (languageChanged || signature !== this._signature) {
      this._signature = signature;
      this._requestRender();
    }
  }

  get hass() {
    return this._hass;
  }

  set narrow(narrow) {
    this._narrow = narrow;
    this._menuButton.narrow = narrow;
    this.toggleAttribute("narrow", Boolean(narrow));
  }

  set panel(_panel) {}

  set route(_route) {}

  connectedCallback() {
    window.addEventListener("pointerup", this._onPointerUp);
    window.addEventListener("pointercancel", this._onPointerUp);
    this._subscribe();
    this._render();
  }

  disconnectedCallback() {
    window.removeEventListener("pointerup", this._onPointerUp);
    window.removeEventListener("pointercancel", this._onPointerUp);
    if (this._unsubPromise) {
      this._unsubPromise.then((unsub) => unsub()).catch(() => {});
      this._unsubPromise = null;
    }
  }

  _subscribe() {
    if (this._unsubPromise || !this._hass || !this.isConnected) return;
    this._loadError = null;
    this._unsubPromise = this._hass.connection.subscribeMessage(
      (msg) => {
        this._zones = msg.zones;
        Object.assign(units, {
          unit: msg.unit ?? units.unit,
          min: msg.min_temp ?? units.min,
          max: msg.max_temp ?? units.max,
          step: msg.step ?? units.step,
          defaultDay: msg.default_day ?? units.defaultDay,
        });
        this._requestRender();
      },
      { type: `${DOMAIN}/subscribe` },
    );
    this._unsubPromise.catch((err) => {
      this._unsubPromise = null;
      this._loadError = err?.message || t("not_loaded");
      this._render();
    });
  }

  /* ---------- data helpers ---------- */

  _climateSignature() {
    const states = this._hass?.states || {};
    let signature = "";
    for (const id in states) {
      if (!id.startsWith("climate.")) continue;
      const s = states[id];
      signature += `${id}|${s.state}|${s.attributes.current_temperature}|${s.attributes.friendly_name};`;
    }
    return signature;
  }

  _climateEntities() {
    const states = this._hass?.states || {};
    return Object.keys(states)
      .filter((id) => id.startsWith("climate."))
      .map((id) => ({
        id,
        name: states[id].attributes.friendly_name || id,
        current: states[id].attributes.current_temperature,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, i18n.locale));
  }

  _currentTemp(zone) {
    const values = zone.entities
      .map((id) => this._hass?.states[id]?.attributes.current_temperature)
      .filter((value) => typeof value === "number");
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }

  _unavailable(zone) {
    return zone.entities.filter((id) => {
      const state = this._hass?.states[id]?.state;
      return state === undefined || state === "unavailable" || state === "unknown";
    }).length;
  }

  _zone(id) {
    return this._zones?.find((zone) => zone.id === id);
  }

  _dirty() {
    return this._draft && JSON.stringify(this._draft) !== this._original;
  }

  async _call(msg, success) {
    if (this._busy) return [false];
    this._busy = true;
    try {
      const result = await this._hass.callWS(msg);
      if (success) this._showToast(success);
      return [true, result];
    } catch (err) {
      this._showToast(err?.message || String(err), true);
      return [false];
    } finally {
      this._busy = false;
    }
  }

  _showToast(message, error = false) {
    const toast = this.shadowRoot.querySelector(".toast");
    toast.textContent = message;
    toast.classList.toggle("error", error);
    toast.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => (toast.hidden = true), error ? 6000 : 3000);
  }

  /* ---------- rendering ---------- */

  /** Render unless that would break an ongoing interaction (drag, open select, click). */
  _requestRender() {
    const active = this.shadowRoot.activeElement;
    const typing = active && (active.tagName === "SELECT" || (active.tagName === "INPUT" && active.type !== "checkbox"));
    if (this._drag || this._pointerDown || typing) {
      this._pendingRender = true;
      return;
    }
    this._render();
  }

  _render() {
    this._pendingRender = false;
    const content = this.shadowRoot.querySelector(".content");
    if (!this._hass) return;
    this.shadowRoot.querySelector(".toolbar .title").textContent = t("title");
    if (this._loadError) {
      content.innerHTML = `<div class="card"><div class="empty">${esc(t("unreachable", { error: this._loadError }))}</div></div>`;
      return;
    }
    if (this._zones === null) {
      content.innerHTML = `<div class="card"><div class="empty">${t("loading")}</div></div>`;
      return;
    }
    content.innerHTML = this._view === "edit" && this._draft ? this._renderEditor() : this._renderList();
    if (this._view === "edit") {
      this._applyEntityFilter();
      const input = this.shadowRoot.querySelector("[data-input=name]");
      if (input && this.shadowRoot.activeElement !== input) {
        input.focus();
        input.select();
      }
    }
  }

  _renderList() {
    const zones = this._zones;
    const rows = zones.length
      ? zones.map((zone) => this._renderZoneRow(zone)).join("")
      : `<div class="empty">${esc(t("no_zones"))}</div>`;
    return `<div class="card">
      <div class="modes">${this._renderModeCard("manual")}${this._renderModeCard("vacation")}</div>
      <div class="zones">${rows}</div>
      <div class="center"><button class="btn pill" data-action="add-zone">${t("add_zone")}</button></div>
    </div>`;
  }

  _renderModeCard(type) {
    const manual = type === "manual";
    const title = t(`mode_${type}`);
    const icon = MODE_ICONS[type];
    const config = this._config?.type === type ? this._config : null;
    if (!config) {
      const text = t(manual ? "manual_text" : "vacation_text");
      return `<div class="mode-card">
        <ha-icon class="big-icon" icon="${icon}"></ha-icon>
        <div class="mode-body">
          <div class="mode-title">${title}</div>
          <div class="mode-text">${text}</div>
          <div class="mode-actions">
            <button class="btn pill" data-action="open-config" data-type="${type}" ${this._zones.length ? "" : "disabled"}>${t("configure")}</button>
          </div>
        </div>
      </div>`;
    }
    const hours = manual
      ? `<label class="form-label">${t("duration")}</label>${hoursSelect("cfg-hours", config.hours)}`
      : "";
    return `<div class="mode-card active">
      <ha-icon class="big-icon" icon="${icon}"></ha-icon>
      <div class="mode-body">
        <div class="mode-title">${title}</div>
        <div class="form-grid"><label class="form-label">${t("temperature")}</label>${tempSelect("cfg-temp", config.temperature)}${hours}</div>
        <div class="mode-hint">${t("zones_selected", { count: config.selected.size, total: this._zones.length })}</div>
        <div class="mode-actions">
          <button class="btn pill" data-action="apply-config" ${config.selected.size ? "" : "disabled"}>${t("turn_on")}</button>
          <button class="btn pill outline" data-action="cancel-config">${t("cancel")}</button>
        </div>
      </div>
    </div>`;
  }

  _renderZoneRow(zone) {
    const status = zone.status;
    const label = status.mode === "manual" ? t("manual_until", { time: fmtUntil(status.until) }) : t(`mode_${status.mode}`);
    const current = this._currentTemp(zone);
    const unavailable = this._unavailable(zone);
    let warning = "";
    if (!zone.entities.length) warning = t("no_thermostats");
    else if (unavailable) warning = t("thermostats_unavailable", { count: unavailable, total: zone.entities.length });

    let actions;
    if (this._config) {
      actions = checkbox(`data-change="cfg-zone" data-zone="${esc(zone.id)}" aria-label="${esc(zone.name)}"`, this._config.selected.has(zone.id));
    } else {
      const off =
        status.mode === "schedule"
          ? ""
          : `<button class="btn off" data-action="clear-override" data-zone="${esc(zone.id)}" title="${t(status.mode === "manual" ? "end_manual" : "end_vacation")}">${t("off")}</button>`;
      actions = `${off}<button class="btn small blue" data-action="manage" data-zone="${esc(zone.id)}">${t("manage")}</button>`;
    }
    return `<div class="zone-row">
      <div class="zone-name">${esc(zone.name)}${warning ? `<span class="warn">${esc(warning)}</span>` : ""}</div>
      <div class="zone-temp"><span class="target">${fmtTemp(status.target)}</span>${current != null ? `<span class="current">${t("current", { temp: fmtTemp(current) })}</span>` : ""}</div>
      <div class="zone-mode"><ha-icon icon="${MODE_ICONS[status.mode]}"></ha-icon><span>${esc(label)}</span></div>
      <div class="zone-actions">${actions}</div>
    </div>`;
  }

  _renderEditor() {
    const draft = this._draft;
    const live = draft.id ? this._zone(draft.id) : null;
    const title = this._editingName
      ? `<input class="name-input" data-input="name" value="${esc(draft.name)}" maxlength="64" aria-label="${t("zone_name")}">`
      : `<h1>${esc(draft.name)}</h1><button class="icon-btn" data-action="edit-name" title="${t("rename")}"><ha-icon icon="mdi:pencil"></ha-icon></button>`;
    return `<div class="card editor">
      <div class="ed-head">
        <div class="ed-title">${title}</div>
        <div class="ed-buttons">
          <button class="btn small blue ${this._showEntities ? "pressed" : ""}" data-action="toggle-entities">${t("thermostats", { count: draft.entities.length })}</button>
          <button class="btn small gray" data-action="cancel-edit">${t("cancel")}</button>
          ${draft.id ? `<button class="btn small red" data-action="delete-zone">${t("delete")}</button>` : ""}
          <button class="btn small green" data-action="save-zone">${t("save")}</button>
        </div>
      </div>
      ${this._dirty() ? `<div class="dirty">${t("unsaved")}</div>` : ""}
      ${this._showEntities ? this._renderEntities() : ""}
      ${this._renderOverrides(live)}
      <div class="schedule">
        ${DAYS.map((day) => this._renderDay(day)).join("")}
        <div class="grid-row axis-row"><span></span>${this._renderAxis()}<span></span></div>
        <div class="day week">
          <div class="grid-row">
            <div class="day-label">${t("week")}</div>
            ${this._renderBar("week", this._weekBounds, null)}
            <span></span>
          </div>
          <div class="week-hint">${t("week_hint")}</div>
        </div>
      </div>
    </div>`;
  }

  _renderEntities() {
    const draft = this._draft;
    const climates = this._climateEntities();
    const known = new Set(climates.map((c) => c.id));
    const missing = draft.entities.filter((id) => !known.has(id)).map((id) => ({ id, name: id, missing: true }));
    const rows = [...climates, ...missing]
      .map((entity) => {
        const owner = this._zones.find((zone) => zone.id !== draft.id && zone.entities.includes(entity.id));
        const checked = draft.entities.includes(entity.id);
        let info = entity.id;
        if (owner) info += ` · ${t("in_zone", { zone: owner.name })}`;
        if (entity.missing) info += ` · ${t("not_found")}`;
        return `<label class="entity ${owner ? "taken" : ""}" data-search="${esc(`${entity.name} ${entity.id}`.toLowerCase())}">
          ${checkbox(`data-change="toggle-entity" data-entity="${esc(entity.id)}"`, checked, Boolean(owner))}
          <span class="entity-text"><span class="entity-name">${esc(entity.name)}</span><span class="entity-id">${esc(info)}</span></span>
          ${typeof entity.current === "number" ? `<span class="entity-temp">${fmtTemp(entity.current)}</span>` : ""}
        </label>`;
      })
      .join("");
    return `<div class="box entities">
      <div class="box-head">
        <span>${t("zone_thermostats")}</span>
        <input type="search" class="search" placeholder="${t("search")}" data-input="entity-filter" value="${esc(this._entityFilter)}">
      </div>
      ${rows ? `<div class="entity-list">${rows}</div>` : `<div class="empty">${t("no_climate")}</div>`}
    </div>`;
  }

  _applyEntityFilter() {
    const term = this._entityFilter.trim().toLowerCase();
    this.shadowRoot.querySelectorAll(".entity").forEach((row) => {
      row.hidden = Boolean(term) && !row.dataset.search.includes(term);
    });
  }

  _renderOverrides(live) {
    const draft = this._draft;
    const manualOn = live?.status.mode === "manual";
    let manual;
    if (manualOn) {
      manual = `<div class="box-line">
        <span>${t("manual_active", { temp: `<b>${fmtTemp(live.status.target)}</b>`, time: fmtUntil(live.status.until) })}</span>
        <button class="btn small gray" data-action="manual-off">${t("turn_off")}</button>
      </div>`;
    } else {
      const form = this._manualForm;
      manual = `<div class="box-line">
        <span>${t("manual_is_off")}</span>
        <button class="link" data-action="toggle-manual-form" ${draft.id ? "" : "disabled"}>${t("configure")} <span class="caret ${form ? "down" : ""}"></span></button>
      </div>
      ${draft.id ? "" : `<div class="muted small">${t("after_first_save")}</div>`}
      ${
        form
          ? `<div class="manual-form">
              <label class="form-label">${t("temperature")}</label>${tempSelect("manual-temp", form.temperature, "", true)}
              <label class="form-label">${t("duration")}</label>${hoursSelect("manual-hours", form.hours)}
              <button class="btn small gray" data-action="manual-on" ${form.temperature == null ? "disabled" : ""}>${t("switch_on")}</button>
            </div>`
          : ""
      }`;
    }
    const vacation = live?.vacation
      ? `<div class="box-line vacation">
          <span><ha-icon icon="${MODE_ICONS.vacation}"></ha-icon> ${t("vacation_active", { temp: `<b>${fmtTemp(live.vacation.temperature)}</b>` })}${manualOn ? t("afterwards") : ""}</span>
          <button class="btn small gray" data-action="vacation-off">${t("turn_off")}</button>
        </div>`
      : "";
    return `<div class="box">${manual}${vacation}</div>`;
  }

  _renderDay(day) {
    const entry = this._draft.schedule[day];
    const open = this._openDay === day;
    let details = "";
    if (open) {
      const edges = [0, ...entry.bounds, DAY_MINUTES];
      const field = (prefix, idx, temp, from, to) => `<label class="temp-field">
          <span class="muted">${prefix}${clock(from)}–${clock(to)}</span>
          ${tempSelect("seg-temp", temp, `data-day="${day}" data-idx="${idx}" aria-label="${esc(t("range_label", { day: dayLong(day), from: prefix + clock(from), to: clock(to) }))}"`)}
        </label>`;
      // First and last period are the night around the 05:00 day start and share one temperature.
      const temps =
        [1, 2, 3].map((i) => field("", i, entry.temps[i], edges[i], edges[i + 1])).join("") +
        field(`${t("night")} `, "night", entry.temps[4], edges[4], edges[1]);
      details = `<div class="day-details">
        <div class="grid-row axis-row"><span></span>${this._renderAxis()}<span></span></div>
        <div class="temps">${temps}</div>
        ${this._renderCopy(day)}
      </div>`;
    }
    return `<div class="day ${open ? "open" : ""}">
      <div class="grid-row">
        <button class="day-label" data-action="toggle-day" data-day="${day}">${dayShort(day)}</button>
        ${this._renderBar(day, entry.bounds, entry.temps)}
        <button class="day-toggle" data-action="toggle-day" data-day="${day}" aria-label="${t(open ? "collapse" : "expand", { day: dayLong(day) })}"><span class="caret ${open ? "down" : ""}"></span></button>
      </div>
      ${details}
    </div>`;
  }

  _renderBar(day, bounds, temps) {
    const edges = [0, ...bounds, DAY_MINUTES];
    const segments = edges
      .slice(0, -1)
      .map((start, i) => {
        const end = edges[i + 1];
        const style = `left:${pct(start)}%;width:${pct(end - start)}%`;
        if (!temps) return `<div class="seg w${i}" style="${style}"></div>`;
        const temp = temps[i];
        return `<div class="seg ${tempClass(temp)}" style="${style}" title="${clock(start)}–${clock(end)}: ${fmtTemp(temp)}"><span>${fmtTemp(temp)}</span></div>`;
      })
      .join("");
    const name = day === "week" ? t("week") : dayLong(day);
    const handles = bounds
      .map(
        (bound, i) => `<div class="handle" data-handle="${day}:${i}" style="left:${pct(bound)}%" tabindex="0" role="slider"
          aria-label="${t("boundary", { name, number: i + 1 })}" aria-valuetext="${clock(bound)}">${ARROWS}<span class="bubble">${clock(bound)}</span></div>`,
      )
      .join("");
    return `<div class="bar ${temps ? "" : "week-bar"}" data-bar="${day}"><div class="track">${segments}</div>${handles}</div>`;
  }

  /** Update positions in place while dragging, so the pointer capture survives. */
  _paintBar(day) {
    const bar = this.shadowRoot.querySelector(`[data-bar="${day}"]`);
    if (!bar) return;
    const bounds = day === "week" ? this._weekBounds : this._draft.schedule[day].bounds;
    const edges = [0, ...bounds, DAY_MINUTES];
    bar.querySelectorAll(".seg").forEach((seg, i) => {
      seg.style.left = `${pct(edges[i])}%`;
      seg.style.width = `${pct(edges[i + 1] - edges[i])}%`;
    });
    bar.querySelectorAll(".handle").forEach((handle, i) => {
      handle.style.left = `${pct(bounds[i])}%`;
      handle.setAttribute("aria-valuetext", clock(bounds[i]));
      handle.querySelector(".bubble").textContent = clock(bounds[i]);
    });
  }

  _renderAxis() {
    let ticks = "";
    for (let m = 0; m <= DAY_MINUTES; m += 120) {
      ticks += `<span class="tick ${(m / 120) % 2 ? "minor" : ""}" style="left:${pct(m)}%">${clock(m, false)}</span>`;
    }
    return `<div class="axis">${ticks}</div>`;
  }

  _renderCopy(day) {
    const others = DAYS.filter((d) => d !== day);
    const workdays = WORKDAYS.filter((d) => d !== day);
    const selected = this._copyTargets;
    const option = (key, text, checked) =>
      `<label class="copy-option">${checkbox(`data-change="copy-target" data-key="${key}" data-day="${day}"`, checked)}<span>${text}</span></label>`;
    const label = selected.size
      ? DAYS.filter((d) => selected.has(d)).map(dayShort).join(", ")
      : t("select_days");
    const menu = this._copyOpen
      ? `<div class="copy-menu">
          ${option("week", t("whole_week"), others.every((d) => selected.has(d)))}
          ${option("workdays", t("workdays"), workdays.every((d) => selected.has(d)))}
          ${others.map((d) => option(d, dayLong(d), selected.has(d))).join("")}
        </div>`
      : "";
    return `<div class="copy-row">
      <span class="muted">${t("copy_to")}</span>
      <div class="copy-select">
        <button class="select select-btn" data-action="toggle-copy">${label}</button>
        ${menu}
      </div>
      <button class="btn small gray" data-action="do-copy" data-day="${day}" ${selected.size ? "" : "disabled"}>${t("copy")}</button>
    </div>`;
  }

  /* ---------- events ---------- */

  async _onClick(ev) {
    let render = false;
    if (this._copyOpen && !ev.target.closest(".copy-select")) {
      this._copyOpen = false;
      render = true;
    }
    const el = ev.target.closest("[data-action]");
    if (!el || el.disabled) {
      if (render) this._render();
      return;
    }
    const zoneId = el.dataset.zone;
    switch (el.dataset.action) {
      case "open-config": {
        const type = el.dataset.type;
        let selected = this._zones.filter((z) => type !== "vacation" || !z.vacation).map((z) => z.id);
        if (!selected.length) selected = this._zones.map((z) => z.id);
        const fahrenheit = units.unit === "°F";
        const temperature = type === "manual" ? (fahrenheit ? 72 : 22) : fahrenheit ? 59 : 15;
        this._config = { type, temperature, hours: 2, selected: new Set(selected) };
        break;
      }
      case "cancel-config":
        this._config = null;
        break;
      case "apply-config": {
        const config = this._config;
        const zoneIds = [...config.selected].filter((id) => this._zone(id));
        const msg =
          config.type === "manual"
            ? { type: `${DOMAIN}/manual/set`, zone_ids: zoneIds, temperature: config.temperature, hours: config.hours }
            : { type: `${DOMAIN}/vacation/set`, zone_ids: zoneIds, temperature: config.temperature };
        const [ok] = await this._call(msg, t(config.type === "manual" ? "toast_manual_on" : "toast_vacation_on"));
        if (ok) this._config = null;
        break;
      }
      case "clear-override": {
        const zone = this._zone(zoneId);
        if (!zone) break;
        const kind = zone.status.mode === "manual" ? "manual" : "vacation";
        await this._call({ type: `${DOMAIN}/${kind}/clear`, zone_ids: [zone.id] });
        break;
      }
      case "manage": {
        const zone = this._zone(zoneId);
        if (zone) this._openEditor(clone({ id: zone.id, name: zone.name, entities: zone.entities, schedule: zone.schedule }));
        break;
      }
      case "add-zone": {
        const day = { bounds: [...DEFAULT_BOUNDS], temps: [...units.defaultDay] };
        const schedule = Object.fromEntries(DAYS.map((d) => [d, clone(day)]));
        this._openEditor({ id: null, name: t("new_zone"), entities: [], schedule });
        this._editingName = true;
        this._showEntities = true;
        break;
      }
      case "edit-name":
        this._editingName = true;
        break;
      case "toggle-entities":
        this._showEntities = !this._showEntities;
        break;
      case "cancel-edit":
        if (this._dirty() && !confirm(t("confirm_discard"))) return;
        this._closeEditor();
        break;
      case "delete-zone": {
        if (!confirm(t("confirm_delete", { name: this._draft.name }))) return;
        const [ok] = await this._call({ type: `${DOMAIN}/zone/delete`, zone_id: this._draft.id }, t("toast_deleted"));
        if (ok) this._closeEditor();
        break;
      }
      case "save-zone":
        await this._save();
        break;
      case "toggle-manual-form":
        this._manualForm = this._manualForm ? null : { temperature: null, hours: 2 };
        break;
      case "manual-on": {
        const form = this._manualForm;
        const [ok] = await this._call(
          { type: `${DOMAIN}/manual/set`, zone_ids: [this._draft.id], temperature: form.temperature, hours: form.hours },
          t("toast_manual_on"),
        );
        if (ok) this._manualForm = null;
        break;
      }
      case "manual-off":
        await this._call({ type: `${DOMAIN}/manual/clear`, zone_ids: [this._draft.id] }, t("toast_manual_off"));
        break;
      case "vacation-off":
        await this._call({ type: `${DOMAIN}/vacation/clear`, zone_ids: [this._draft.id] }, t("toast_vacation_off"));
        break;
      case "toggle-day": {
        const day = el.dataset.day;
        this._openDay = this._openDay === day ? null : day;
        this._copyOpen = false;
        this._copyTargets = new Set();
        break;
      }
      case "toggle-copy":
        this._copyOpen = !this._copyOpen;
        break;
      case "do-copy": {
        const day = el.dataset.day;
        const targets = DAYS.filter((d) => this._copyTargets.has(d));
        for (const target of targets) this._draft.schedule[target] = clone(this._draft.schedule[day]);
        this._copyTargets = new Set();
        this._copyOpen = false;
        this._showToast(t("toast_copied", { day: dayLong(day), targets: targets.map(dayShort).join(", ") }));
        break;
      }
      default:
        return;
    }
    this._render();
  }

  _onChange(ev) {
    const el = ev.target;
    const kind = el.dataset?.change;
    if (!kind) return;
    switch (kind) {
      case "cfg-temp":
        this._config.temperature = Number(el.value);
        break;
      case "cfg-hours":
        this._config.hours = Number(el.value);
        break;
      case "cfg-zone":
        if (el.checked) this._config.selected.add(el.dataset.zone);
        else this._config.selected.delete(el.dataset.zone);
        break;
      case "manual-temp":
        this._manualForm.temperature = el.value === "" ? null : Number(el.value);
        break;
      case "manual-hours":
        this._manualForm.hours = Number(el.value);
        break;
      case "seg-temp": {
        const temps = this._draft.schedule[el.dataset.day].temps;
        const indexes = el.dataset.idx === "night" ? [0, temps.length - 1] : [Number(el.dataset.idx)];
        for (const i of indexes) temps[i] = Number(el.value);
        break;
      }
      case "toggle-entity": {
        const id = el.dataset.entity;
        const entities = this._draft.entities.filter((e) => e !== id);
        if (el.checked) entities.push(id);
        this._draft.entities = entities;
        break;
      }
      case "copy-target": {
        const day = el.dataset.day;
        const key = el.dataset.key;
        const group =
          key === "week" ? DAYS.filter((d) => d !== day) : key === "workdays" ? WORKDAYS.filter((d) => d !== day) : [key];
        const all = group.every((d) => this._copyTargets.has(d));
        for (const d of group) {
          if (all) this._copyTargets.delete(d);
          else this._copyTargets.add(d);
        }
        break;
      }
      default:
        return;
    }
    el.blur?.();
    this._render();
  }

  _onInput(ev) {
    if (ev.target.dataset?.input === "entity-filter") {
      this._entityFilter = ev.target.value;
      this._applyEntityFilter();
    }
  }

  _onFocusOut(ev) {
    if (ev.target.dataset?.input === "name" && this._editingName) {
      this._commitName(ev.target.value);
      this._requestRender();
      return;
    }
    if (this._pendingRender) setTimeout(() => this._requestRender(), 0);
  }

  _onKeyDown(ev) {
    const handle = ev.target.closest?.("[data-handle]");
    if (handle) {
      const delta = { ArrowLeft: -STEP, ArrowDown: -STEP, ArrowRight: STEP, ArrowUp: STEP }[ev.key];
      if (!delta) return;
      ev.preventDefault();
      const [day, idx] = this._handleRef(handle);
      const bounds = day === "week" ? this._weekBounds : this._draft.schedule[day].bounds;
      this._moveBound(day, idx, bounds[idx] + delta * (ev.shiftKey ? 4 : 1));
      this._render();
      this.shadowRoot.querySelector(`[data-handle="${day}:${idx}"]`)?.focus();
      return;
    }
    if (ev.target.dataset?.input === "name") {
      if (ev.key === "Enter") ev.target.blur();
      if (ev.key === "Escape") {
        this._editingName = false;
        this._render();
      }
      return;
    }
    if (ev.key === "Escape" && this._copyOpen) {
      this._copyOpen = false;
      this._render();
    }
  }

  _onPointerDown(ev) {
    this._pointerDown = true;
    const handle = ev.target.closest?.("[data-handle]");
    if (!handle || ev.button > 0) return;
    ev.preventDefault();
    const [day, idx] = this._handleRef(handle);
    const bar = handle.closest(".bar");
    handle.setPointerCapture(ev.pointerId);
    handle.classList.add("dragging");
    this._drag = { day, idx };
    const start = day === "week" ? this._boundSnapshot(idx) : null;
    const move = (e) => {
      const rect = bar.getBoundingClientRect();
      this._moveBound(day, idx, ((e.clientX - rect.left) / rect.width) * DAY_MINUTES, start);
      if (day === "week") ["week", ...DAYS].forEach((d) => this._paintBar(d));
      else this._paintBar(day);
    };
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      this._drag = null;
      this._pointerDown = false;
      this._render();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  _handleRef(handle) {
    const [day, idx] = handle.dataset.handle.split(":");
    return [day, Number(idx)];
  }

  /** Positions of one bound on the week slider and every day, taken when a move starts. */
  _boundSnapshot(idx) {
    return {
      week: this._weekBounds[idx],
      days: Object.fromEntries(DAYS.map((d) => [d, this._draft.schedule[d].bounds[idx]])),
    };
  }

  /**
   * Move one bound. The week slider shifts that bound on every day by the same amount,
   * so days with different times keep their differences. Measuring from the snapshot
   * lets a day that hit a neighbour recover when the handle is dragged back.
   */
  _moveBound(day, idx, value, start = null) {
    if (day !== "week") {
      const bounds = this._draft.schedule[day].bounds;
      bounds[idx] = clampBound(bounds, idx, value);
      return;
    }
    const before = start ?? this._boundSnapshot(idx);
    this._weekBounds[idx] = clampBound(this._weekBounds, idx, value);
    const delta = this._weekBounds[idx] - before.week;
    for (const d of DAYS) {
      const bounds = this._draft.schedule[d].bounds;
      bounds[idx] = clampBound(bounds, idx, before.days[d] + delta);
    }
  }

  _commitName(value) {
    const name = value.trim();
    if (name) this._draft.name = name;
    this._editingName = false;
  }

  _openEditor(draft) {
    this._view = "edit";
    this._draft = draft;
    this._original = JSON.stringify(draft);
    this._weekBounds = [...draft.schedule.mon.bounds];
    this._openDay = "mon";
    this._showEntities = false;
    this._entityFilter = "";
    this._editingName = false;
    this._manualForm = null;
    this._copyOpen = false;
    this._copyTargets = new Set();
    this._config = null;
    this.scrollTop = 0;
  }

  _closeEditor() {
    this._view = "list";
    this._draft = null;
    this._original = null;
    this._editingName = false;
  }

  async _save() {
    const input = this.shadowRoot.querySelector("[data-input=name]");
    if (input) this._commitName(input.value);
    const draft = this._draft;
    if (!draft.name.trim()) {
      this._showToast(t("name_required"), true);
      return;
    }
    const zone = { name: draft.name, entities: draft.entities, schedule: draft.schedule };
    if (draft.id) zone.id = draft.id;
    const [ok] = await this._call({ type: `${DOMAIN}/zone/save`, zone }, t("toast_saved", { name: draft.name }));
    if (ok) this._closeEditor();
  }
}

const STYLE = `
:host {
  --hp-page: #111;
  --hp-card: #262626;
  --hp-row: #1a1a1a;
  --hp-black: #000;
  --hp-border: #3a3a3a;
  --hp-text: #ececec;
  --hp-muted: #8c8c8c;
  --hp-accent: #3a9ae0;
  --hp-handle: #1e8fff;
  --hp-ok: #2e8b22;
  --hp-hot: #a8231f;
  --hp-cold: #1f6fb5;
  display: block;
  height: 100%;
  overflow-y: auto;
  background: var(--hp-page);
  color: var(--hp-text);
  color-scheme: dark;
  font-family: var(--paper-font-body1_-_font-family, Roboto, "Helvetica Neue", Arial, sans-serif);
  font-size: 14px;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
ha-icon { --mdc-icon-size: 24px; }
button { font: inherit; color: inherit; }

.toolbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 4px;
  height: 56px; padding: 0 12px;
  background: linear-gradient(#2b8ad6, #0c4f8c);
  color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,.5);
}
.toolbar .menu { display: none; }
:host([narrow]) .toolbar .menu { display: block; }
.toolbar .title { font-size: 18px; font-weight: 500; padding-left: 8px; }

.content { max-width: 860px; margin: 16px auto 40px; padding: 0 16px; }
.card { background: var(--hp-card); border: 1px solid var(--hp-border); border-radius: 4px; padding: 0 0 24px; }
.empty { padding: 32px 24px; color: var(--hp-muted); text-align: center; line-height: 1.5; }
.muted { color: var(--hp-muted); }
.small { font-size: 12px; }
.center { display: flex; justify-content: center; padding-top: 8px; }

/* buttons */
.btn { cursor: pointer; border: 1px solid transparent; white-space: nowrap; }
.btn:disabled { opacity: .45; cursor: default; }
.btn.pill {
  min-width: 130px; padding: 9px 22px; border-radius: 22px; font-weight: 700;
  background: linear-gradient(#2f80c8, #0e4b88); border-color: #6aaae6; color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.6);
}
.btn.pill:not(:disabled):hover { background: linear-gradient(#3a90da, #125aa0); }
.btn.pill.outline { background: transparent; border-color: #bbb; }
.btn.small { padding: 5px 12px; border-radius: 3px; font-size: 13px; }
.btn.blue { background: linear-gradient(#2e8be0, #1062b2); border-color: #0b4c8c; color: #fff; }
.btn.blue.pressed { box-shadow: inset 0 2px 4px rgba(0,0,0,.6); }
.btn.gray { background: linear-gradient(#444, #2c2c2c); border-color: #555; color: #ddd; }
.btn.red { background: linear-gradient(#d23a3a, #a01c1c); border-color: #7a1212; color: #fff; }
.btn.green { background: linear-gradient(#3a9a3e, #22702a); border-color: #185a1e; color: #fff; }
.btn.off { padding: 5px 10px; border-radius: 3px; background: #333; border-color: #555; color: #bbb; font-size: 12px; }
.icon-btn { background: none; border: 0; color: var(--hp-muted); cursor: pointer; padding: 4px; }
.link { background: none; border: 0; cursor: pointer; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; }
.link:disabled { opacity: .45; cursor: default; }
.caret { display: inline-block; width: 0; height: 0; border-style: solid; border-width: 7px 9px 7px 0; border-color: transparent #888 transparent transparent; }
.caret.down { border-width: 9px 7px 0 7px; border-color: #888 transparent transparent transparent; }

/* form controls */
.select {
  background: var(--hp-black); color: var(--hp-accent); border: 1px solid #222; border-radius: 2px;
  padding: 6px 8px; font: inherit; min-width: 110px; cursor: pointer;
}
.check {
  appearance: none; -webkit-appearance: none; flex: none;
  width: 22px; height: 22px; margin: 0; cursor: pointer;
  background: #151515; border: 1px solid #555; border-radius: 3px;
}
.check:checked {
  background: #151515 center / 16px no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%233a9ae0' d='M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'/%3E%3C/svg%3E");
}
.check:disabled { opacity: .35; cursor: default; }
.form-grid { display: grid; grid-template-columns: auto auto; gap: 8px 12px; align-items: center; justify-content: start; margin: 12px 0 4px; }
.form-label { color: var(--hp-muted); font-size: 13px; }

/* mode cards */
.modes { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--hp-border); }
.mode-card { display: flex; gap: 20px; padding: 24px 20px 20px; }
.mode-card + .mode-card { border-left: 1px solid var(--hp-border); }
.big-icon { --mdc-icon-size: 48px; color: #fff; flex: none; }
.mode-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.mode-title { font-size: 16px; margin-bottom: 10px; }
.mode-text { color: var(--hp-muted); font-size: 12px; line-height: 1.6; }
.mode-hint { color: var(--hp-muted); font-size: 12px; margin-top: 6px; }
.mode-actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: flex-end; margin-top: 16px; }

/* zone list */
.zones { display: flex; flex-direction: column; gap: 14px; padding: 16px 16px 20px; }
.zone-row {
  display: grid; grid-template-columns: minmax(0, 1.4fr) auto minmax(0, 1.5fr) auto;
  grid-template-areas: "name temp mode actions"; gap: 12px; align-items: center;
  min-height: 52px; padding: 8px 24px 8px 16px;
  background: var(--hp-row); border: 1px solid var(--hp-border); border-radius: 26px;
}
.zone-name { grid-area: name; font-weight: 700; display: flex; flex-direction: column; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
.warn { color: #e0a030; font-weight: 400; font-size: 11px; }
.zone-temp { grid-area: temp; display: flex; flex-direction: column; align-items: flex-end; }
.zone-temp .target { font-size: 18px; }
.zone-temp .current { color: var(--hp-muted); font-size: 11px; }
.zone-mode { grid-area: mode; display: flex; align-items: center; gap: 8px; color: var(--hp-accent); min-width: 0; }
.zone-mode ha-icon { --mdc-icon-size: 28px; flex: none; }
.zone-actions { grid-area: actions; display: flex; align-items: center; justify-content: flex-end; gap: 12px; }

/* editor */
.editor { padding: 24px 20px; }
.ed-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.ed-title { display: flex; align-items: center; gap: 4px; min-width: 0; }
.ed-title h1 { margin: 0; font-size: 24px; font-weight: 400; overflow-wrap: anywhere; }
.name-input { font: inherit; font-size: 22px; background: var(--hp-black); color: var(--hp-text); border: 1px solid var(--hp-accent); border-radius: 3px; padding: 4px 8px; width: min(320px, 100%); }
.ed-buttons { display: flex; flex-wrap: wrap; gap: 10px; }
.dirty { color: #e0a030; font-size: 12px; text-align: right; margin: -8px 0 12px; }
.box { background: var(--hp-black); border: 1px solid var(--hp-border); padding: 20px; margin-bottom: 16px; }
.box-line { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; font-size: 16px; }
.box-line + .box-line { margin-top: 16px; padding-top: 16px; border-top: 1px solid #222; }
.box-line.vacation ha-icon { color: var(--hp-accent); --mdc-icon-size: 20px; vertical-align: -4px; }
.manual-form { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #222; }
.manual-form .btn { margin-left: auto; }

.box-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; font-size: 16px; }
.search { background: #111; color: var(--hp-text); border: 1px solid #444; border-radius: 3px; padding: 6px 10px; font: inherit; width: min(240px, 100%); }
.entity-list { display: flex; flex-direction: column; max-height: 320px; overflow-y: auto; }
.entity { display: flex; align-items: center; gap: 12px; padding: 8px 4px; border-bottom: 1px solid #1d1d1d; cursor: pointer; }
.entity.taken { cursor: default; opacity: .6; }
.entity-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.entity-name { overflow-wrap: anywhere; }
.entity-id { color: var(--hp-muted); font-size: 11px; overflow-wrap: anywhere; }
.entity-temp { color: var(--hp-muted); font-size: 12px; }

/* schedule */
.schedule { border: 1px solid var(--hp-border); background: var(--hp-card); }
.grid-row { display: grid; grid-template-columns: 52px minmax(0, 1fr) 36px; align-items: center; }
.day { background: var(--hp-black); border-bottom: 1px solid var(--hp-border); padding: 18px 8px 14px; }
.day.open { background: var(--hp-card); }
.day.week { background: var(--hp-card); border-bottom: 0; border-top: 1px solid var(--hp-border); }
.day-label { background: none; border: 0; padding: 0 0 0 8px; text-align: left; font-weight: 700; font-size: 13px; cursor: pointer; }
.day.week .day-label { cursor: default; }
.day-toggle { background: none; border: 0; cursor: pointer; display: flex; justify-content: center; padding: 6px 0; }
.week-hint { color: var(--hp-muted); font-size: 11px; padding: 10px 0 0 52px; }

.bar { position: relative; height: 32px; margin: 0 14px; }
.track { position: absolute; left: 0; right: 0; top: 5px; height: 22px; border-radius: 11px; overflow: hidden; }
.seg {
  position: absolute; top: 0; height: 100%; overflow: hidden;
  color: #fff; font-weight: 700; font-size: 12px; line-height: 22px; text-align: center; white-space: nowrap;
}
.seg span { padding: 0 2px; }
.seg.ok { background: var(--hp-ok); }
.seg.hot { background: var(--hp-hot); }
.seg.cold { background: var(--hp-cold); }
.seg.w0 { background: #4a4a4a; } .seg.w1 { background: #666; } .seg.w2 { background: #8a8a8a; } .seg.w3 { background: #b4b4b4; } .seg.w4 { background: #dedede; }
.handle {
  position: absolute; top: 2px; width: 28px; height: 28px; margin-left: -14px; z-index: 2;
  border-radius: 50%; background: var(--hp-handle); box-shadow: 0 1px 3px rgba(0,0,0,.7);
  display: flex; align-items: center; justify-content: center;
  cursor: ew-resize; touch-action: none; outline: none;
}
.handle svg { width: 22px; height: 22px; fill: #fff; pointer-events: none; }
.handle:focus-visible { box-shadow: 0 0 0 3px rgba(255,255,255,.6); }
.handle.dragging { z-index: 3; transform: scale(1.12); }
.bubble {
  display: none; position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
  background: #000; border: 1px solid var(--hp-handle); border-radius: 3px; padding: 2px 6px;
  font-size: 12px; color: #fff; white-space: nowrap; pointer-events: none;
}
.handle:hover .bubble, .handle:focus-visible .bubble, .handle.dragging .bubble { display: block; }

.day-details { margin-top: 10px; }
.axis-row { padding: 10px 8px; border-top: 1px solid #3a3a3a; }
.day-details .axis-row { padding: 10px 0; border-bottom: 1px solid #3a3a3a; }
.axis { position: relative; height: 16px; margin: 0 14px; }
.tick { position: absolute; transform: translateX(-50%); color: var(--hp-muted); font-size: 12px; white-space: nowrap; }
.temps { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px 16px; padding: 14px 36px 14px 52px; border-bottom: 1px solid #3a3a3a; }
.temp-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.temp-field .select { width: 100%; }
.copy-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; padding: 14px 36px 0 52px; }
.copy-select { position: relative; flex: 1; min-width: 180px; max-width: 240px; }
.select-btn { width: 100%; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.copy-menu {
  position: absolute; top: calc(100% + 2px); left: 0; z-index: 10; min-width: 100%;
  background: #000; border: 1px solid #333; box-shadow: 0 4px 12px rgba(0,0,0,.7); padding: 6px 0;
}
.copy-option { display: flex; align-items: center; gap: 12px; padding: 7px 14px; cursor: pointer; font-weight: 700; font-size: 13px; white-space: nowrap; }
.copy-option:hover { background: #1e8fff; }

.toast {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 50;
  max-width: calc(100% - 32px); padding: 10px 18px; border-radius: 4px;
  background: #2b2b2b; border: 1px solid #555; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,.6);
}
.toast.error { background: #6b1414; border-color: #a33; }

@media (max-width: 640px) {
  .content { padding: 0 8px; margin-top: 8px; }
  .modes { grid-template-columns: 1fr; }
  .mode-card + .mode-card { border-left: 0; border-top: 1px solid var(--hp-border); }
  .mode-card { padding: 18px 16px 16px; gap: 14px; }
  .big-icon { --mdc-icon-size: 36px; }
  .btn.pill { min-width: 0; padding: 8px 18px; }
  .zones { padding: 12px 8px 16px; gap: 10px; }
  .zone-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "name temp" "mode actions";
    padding: 10px 14px; border-radius: 20px;
  }
  .editor { padding: 16px 10px; }
  .box { padding: 14px; }
  .grid-row { grid-template-columns: 34px minmax(0, 1fr) 28px; }
  .day { padding: 16px 4px 12px; }
  .day-label { padding-left: 4px; }
  .tick.minor { display: none; }
  .temps, .copy-row { padding-left: 0; padding-right: 0; }
  .temps { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
  .week-hint { padding-left: 34px; }
  .seg { font-size: 11px; }
}
`;

if (!customElements.get("heatingpanel-panel")) {
  customElements.define("heatingpanel-panel", HeatingPanel);
}
