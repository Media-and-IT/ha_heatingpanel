/*
 * Heating Panel: sidebar panel for zones, weekly schedules, manual and vacation mode.
 * Plain web component without build step. Talks to the integration via websocket.
 * All colours come from the Home Assistant theme, so light and dark themes just work.
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
  schedule: "mdi:calendar-clock",
  manual: "mdi:timer-outline",
  vacation: "mdi:airplane",
};
const DEFAULT_BOUNDS = [120, 240, 600, 960];
// Colour scale of the schedule bars as [°C, [hue, saturation, lightness]]:
// frost blue, eco green, then amber, orange and red across the comfort range.
const COLOR_STOPS = [
  [8, [210, 75, 52]],
  [13, [180, 65, 38]],
  [16, [125, 45, 42]],
  [18, [46, 92, 50]],
  [20, [30, 95, 52]],
  [22, [12, 85, 52]],
  [24, [-8, 70, 46]],
];

const STRINGS = {
  en: {
    title: "Heating",
    menu: "Sidebar",
    back: "Back",
    not_loaded: "The integration is not loaded.",
    unreachable: "Heating Panel is not available: {error}",
    loading: "Loading zones …",
    zones: "Zones",
    no_zones: "No zones yet. Create a zone and assign the thermostats of a room to it.",
    add_zone: "Add zone",
    mode_schedule: "Schedule",
    mode_manual: "Manual mode",
    mode_vacation: "Vacation mode",
    manual_text: "Sets the selected zones to a fixed temperature for a number of hours. Afterwards the schedule applies again.",
    vacation_text: "Holds the selected zones at one temperature until you switch it off.",
    configure: "Configure",
    temperature: "Temperature",
    duration: "Duration",
    hours_value: "{h} h",
    zones_selected: "{count} of {total} zones selected. Choose the zones below.",
    turn_on: "Turn on",
    cancel: "Cancel",
    active_in_one: "Active in 1 zone",
    active_in: "Active in {count} zones",
    end_all: "End all",
    end: "End",
    manual_until: "Manual until {time}",
    current: "Current {temp}",
    no_thermostats: "No thermostats assigned",
    thermostats_unavailable: "{count} of {total} thermostats unavailable",
    end_manual: "End manual mode",
    end_vacation: "End vacation mode",
    delete: "Delete",
    save: "Save",
    name: "Name",
    thermostats_title: "Thermostats",
    choose: "Choose",
    done: "Done",
    none_selected: "No thermostats selected yet.",
    search: "Search",
    in_zone: "in zone “{zone}”",
    not_found: "not found",
    no_climate: "No thermostats (climate entities) found.",
    manual_inactive: "Manual mode is off",
    manual_active: "{temp} until {time}",
    vacation_active: "Vacation mode: {temp}",
    afterwards: "applies again when manual mode ends",
    after_first_save: "Available after the zone has been saved.",
    no_selection: "Choose",
    schedule_title: "Weekly schedule",
    schedule_hint: "A day runs from 05:00 to 05:00 the next day.",
    night: "Night",
    range_label: "{day}, {from} to {to}",
    expand: "Expand {day}",
    collapse: "Collapse {day}",
    boundary: "{name}, boundary {number}",
    all_days: "All days",
    all_days_hint: "Shifts a boundary on every day by the same amount.",
    copy_to: "Copy to",
    whole_week: "Whole week",
    workdays: "Workdays",
    copy: "Copy",
    toast_manual_on: "Manual mode turned on",
    toast_vacation_on: "Vacation mode turned on",
    toast_manual_off: "Manual mode turned off",
    toast_vacation_off: "Vacation mode turned off",
    new_zone: "New zone",
    discard_title: "Discard changes?",
    discard_text: "The changes to this zone have not been saved.",
    discard: "Discard",
    delete_title: "Delete zone?",
    delete_text: "“{name}” will be deleted. The thermostats keep their last temperature.",
    toast_deleted: "Zone deleted",
    toast_copied: "{day} copied to {targets}",
    name_required: "Please enter a name.",
    toast_saved: "“{name}” saved",
    days_short: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    days_long: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  },
  de: {
    title: "Heizung",
    menu: "Seitenleiste",
    back: "Zurück",
    not_loaded: "Die Integration ist nicht geladen.",
    unreachable: "Die Heizungssteuerung ist nicht erreichbar: {error}",
    loading: "Lade Zonen …",
    zones: "Zonen",
    no_zones: "Noch keine Zonen angelegt. Lege eine Zone an und weise ihr die Thermostate eines Raums zu.",
    add_zone: "Zone hinzufügen",
    mode_schedule: "Zeitplan",
    mode_manual: "Manueller Modus",
    mode_vacation: "Urlaubsmodus",
    manual_text: "Setzt die gewählten Zonen für einige Stunden auf eine feste Temperatur. Danach gilt wieder der Zeitplan.",
    vacation_text: "Hält die gewählten Zonen auf einer Temperatur, bis du den Urlaubsmodus beendest.",
    configure: "Konfigurieren",
    temperature: "Temperatur",
    duration: "Dauer",
    hours_value: "{h} h",
    zones_selected: "{count} von {total} Zonen ausgewählt. Wähle unten die Zonen aus.",
    turn_on: "Einschalten",
    cancel: "Abbrechen",
    active_in_one: "In 1 Zone aktiv",
    active_in: "In {count} Zonen aktiv",
    end_all: "Alle beenden",
    end: "Beenden",
    manual_until: "Manuell bis {time}",
    current: "Ist {temp}",
    no_thermostats: "Keine Thermostate zugewiesen",
    thermostats_unavailable: "{count} von {total} Thermostaten nicht erreichbar",
    end_manual: "Manuellen Modus beenden",
    end_vacation: "Urlaubsmodus beenden",
    delete: "Löschen",
    save: "Speichern",
    name: "Name",
    thermostats_title: "Thermostate",
    choose: "Auswählen",
    done: "Fertig",
    none_selected: "Noch keine Thermostate ausgewählt.",
    search: "Suchen",
    in_zone: "in Zone „{zone}“",
    not_found: "nicht gefunden",
    no_climate: "Keine Thermostate (climate-Entitäten) gefunden.",
    manual_inactive: "Der manuelle Modus ist ausgeschaltet",
    manual_active: "{temp} bis {time}",
    vacation_active: "Urlaubsmodus: {temp}",
    afterwards: "gilt wieder, wenn der manuelle Modus endet",
    after_first_save: "Nach dem ersten Speichern verfügbar.",
    no_selection: "Auswählen",
    schedule_title: "Wochenplan",
    schedule_hint: "Ein Tag läuft von 05:00 bis 05:00 am Folgetag.",
    night: "Nacht",
    range_label: "{day}, {from} bis {to}",
    expand: "{day} aufklappen",
    collapse: "{day} zuklappen",
    boundary: "{name}, Grenze {number}",
    all_days: "Alle Tage",
    all_days_hint: "Verschiebt eine Grenze an allen Tagen um denselben Betrag.",
    copy_to: "Kopieren nach",
    whole_week: "Die ganze Woche",
    workdays: "Arbeitstage",
    copy: "Kopieren",
    toast_manual_on: "Manueller Modus eingeschaltet",
    toast_vacation_on: "Urlaubsmodus eingeschaltet",
    toast_manual_off: "Manueller Modus ausgeschaltet",
    toast_vacation_off: "Urlaubsmodus ausgeschaltet",
    new_zone: "Neue Zone",
    discard_title: "Änderungen verwerfen?",
    discard_text: "Die Änderungen an dieser Zone wurden noch nicht gespeichert.",
    discard: "Verwerfen",
    delete_title: "Zone löschen?",
    delete_text: "„{name}“ wird gelöscht. Die Thermostate behalten ihre letzte Temperatur.",
    toast_deleted: "Zone gelöscht",
    toast_copied: "{day} nach {targets} kopiert",
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
const icon = (name) => `<ha-icon icon="${name}"></ha-icon>`;

function fmtTemp(value) {
  // Non-breaking space, so a temperature never wraps between number and unit.
  if (value == null || Number.isNaN(Number(value))) return `--\u00a0${units.unit}`;
  const digits = units.step < 1 ? 1 : 0;
  const number = Number(value).toLocaleString(i18n.locale, { minimumFractionDigits: digits, maximumFractionDigits: 1 });
  return `${number}\u00a0${units.unit}`;
}

function tempHsl(value) {
  const celsius = units.unit === "°F" ? ((value - 32) * 5) / 9 : value;
  const last = COLOR_STOPS[COLOR_STOPS.length - 1];
  if (celsius <= COLOR_STOPS[0][0]) return COLOR_STOPS[0][1];
  if (celsius >= last[0]) return last[1];
  const i = COLOR_STOPS.findIndex(([limit]) => celsius < limit);
  const [t0, c0] = COLOR_STOPS[i - 1];
  const [t1, c1] = COLOR_STOPS[i];
  const f = (celsius - t0) / (t1 - t0);
  return c0.map((v, k) => v + (c1[k] - v) * f);
}

/** Colour of a temperature on the scale from frost blue to hot red. */
function tempColor(value) {
  const [h, s, l] = tempHsl(value);
  return `hsl(${((h + 360) % 360).toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(0)}%)`;
}

/** Dark text on the bright yellow part of the scale, white text everywhere else. */
function tempTextClass(value) {
  const [h] = tempHsl(value);
  return h >= 38 && h <= 100 ? "dark-text" : "";
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

function selectField(label, change, options, attrs = "") {
  return `<label class="field select"><span class="field-label">${esc(label)}</span>
    <select data-change="${change}" ${attrs}>${options}</select></label>`;
}

function tempOptions(value, allowNone = false) {
  const none = allowNone ? `<option value="" ${value == null ? "selected" : ""}>${t("no_selection")}</option>` : "";
  return (
    none +
    temperatures(value)
      .map((temp) => `<option value="${temp}" ${temp === value ? "selected" : ""}>${fmtTemp(temp)}</option>`)
      .join("")
  );
}

function hourOptions(value) {
  return HOURS.map((h) => `<option value="${h}" ${h === value ? "selected" : ""}>${t("hours_value", { h })}</option>`).join("");
}

function checkbox(attrs, checked, disabled = false) {
  return `<input type="checkbox" class="check" ${attrs} ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>`;
}

function badge(iconName, color) {
  return `<span class="badge" style="--badge-color:${color}">${icon(iconName)}</span>`;
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
    this._entitiesOpen = false;
    this._entityFilter = "";
    this._focusName = false;
    this._manualForm = null;
    this._copyOpen = false;
    this._copyTargets = new Set();
    this._dialog = null;
    this._drag = null;
    this._pointerDown = false;
    this._pendingRender = false;
    this._busy = false;
    this._signature = "";
    this._unsubPromise = null;
    this._toastTimer = null;

    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STYLE}</style>
      <div class="toolbar"></div>
      <div class="content"></div>
      <div class="toast" hidden></div>`;

    root.addEventListener("click", (ev) => this._onClick(ev));
    root.addEventListener("change", (ev) => this._onChange(ev));
    root.addEventListener("input", (ev) => this._onInput(ev));
    root.addEventListener("keydown", (ev) => this._onKeyDown(ev));
    root.addEventListener("focusout", () => {
      if (this._pendingRender) setTimeout(() => this._requestRender(), 0);
    });
    root.addEventListener("pointerdown", (ev) => this._onPointerDown(ev));
    this._onPointerUp = () => {
      this._pointerDown = false;
      if (this._pendingRender) setTimeout(() => this._requestRender(), 0);
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._subscribe();
    const languageChanged = setLanguage(hass);
    const signature = `${hass.dockedSidebar}|${this._climateSignature()}`;
    if (languageChanged || signature !== this._signature) {
      this._signature = signature;
      this._requestRender();
    }
  }

  get hass() {
    return this._hass;
  }

  set narrow(narrow) {
    if (this._narrow === narrow) return;
    this._narrow = narrow;
    this._requestRender();
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

  _entityName(id) {
    return this._hass?.states[id]?.attributes.friendly_name || id;
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
    return Boolean(this._draft) && JSON.stringify(this._draft) !== this._original;
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

  /** Confirmation dialog in the style of Home Assistant. Resolves to true on confirm. */
  _confirm(title, text, confirmLabel, destructive = false) {
    return new Promise((resolve) => {
      this._dialog = { title, text, confirmLabel, destructive, resolve };
      this._render();
      this.shadowRoot.querySelector("[data-action=dialog-confirm]")?.focus();
    });
  }

  /* ---------- rendering ---------- */

  /** Render unless that would break an ongoing interaction (drag, open select, typing, click). */
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
    if (!this._hass) return;
    const editing = this._view === "edit" && this._draft;
    this._renderToolbar(editing);
    const content = this.shadowRoot.querySelector(".content");
    let html;
    if (this._loadError) {
      html = `<div class="card"><div class="empty">${esc(t("unreachable", { error: this._loadError }))}</div></div>`;
    } else if (this._zones === null) {
      html = `<div class="card"><div class="empty">${t("loading")}</div></div>`;
    } else {
      html = editing ? this._renderEditor() : this._renderList();
    }
    content.innerHTML = html + this._renderDialog();
    if (editing) {
      this._applyEntityFilter();
      if (this._focusName) {
        this._focusName = false;
        const input = this.shadowRoot.querySelector("[data-input=name]");
        input?.focus();
        input?.select();
      }
    }
  }

  _renderToolbar(editing) {
    const toolbar = this.shadowRoot.querySelector(".toolbar");
    let leading = "";
    if (editing) {
      leading = `<button class="icon-btn" data-action="back" title="${t("back")}" aria-label="${t("back")}">${icon("mdi:arrow-left")}</button>`;
    } else if (this._narrow || this._hass.dockedSidebar === "always_hidden") {
      leading = `<button class="icon-btn" data-action="menu" title="${t("menu")}" aria-label="${t("menu")}">${icon("mdi:menu")}</button>`;
    }
    const title = editing ? this._draft.name || t("new_zone") : t("title");
    const trailing =
      editing && this._draft.id
        ? `<button class="icon-btn" data-action="delete-zone" title="${t("delete")}" aria-label="${t("delete")}">${icon("mdi:delete-outline")}</button>`
        : "";
    toolbar.classList.toggle("has-leading", Boolean(leading));
    toolbar.innerHTML = `${leading}<div class="title">${esc(title)}</div>${trailing}`;
  }

  _renderDialog() {
    const d = this._dialog;
    if (!d) return "";
    return `<div class="dialog-backdrop">
      <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="hp-dialog-title">
        <div class="dialog-title" id="hp-dialog-title">${esc(d.title)}</div>
        <div class="dialog-text">${esc(d.text)}</div>
        <div class="dialog-actions">
          <button class="btn plain" data-action="dialog-cancel">${t("cancel")}</button>
          <button class="btn plain ${d.destructive ? "danger" : ""}" data-action="dialog-confirm">${esc(d.confirmLabel)}</button>
        </div>
      </div>
    </div>`;
  }

  /* list view */

  _renderList() {
    const zones = this._zones;
    const body = zones.length
      ? `<div class="zone-list">${zones.map((zone) => this._renderZoneRow(zone)).join("")}</div>`
      : `<div class="empty">${icon("mdi:radiator")}<p>${esc(t("no_zones"))}</p></div>`;
    return `<div class="page">
      <div class="modes">${this._renderModeCard("manual")}${this._renderModeCard("vacation")}</div>
      <div class="card">
        <div class="card-header">${t("zones")}</div>
        ${body}
      </div>
    </div>
    <button class="fab" data-action="add-zone">${icon("mdi:plus")}<span>${t("add_zone")}</span></button>`;
  }

  _renderModeCard(type) {
    const manual = type === "manual";
    const color = manual ? "var(--state-climate-heat-color, #ff8100)" : "var(--state-climate-cool-color, #2b9af9)";
    const active = this._zones.filter((zone) => (manual ? zone.status.mode === "manual" : zone.vacation));
    const config = this._config?.type === type ? this._config : null;
    const head = `<div class="mode-head">
      ${badge(MODE_ICONS[type], color)}
      <div class="mode-titles">
        <div class="mode-title">${t(`mode_${type}`)}</div>
        ${active.length ? `<div class="mode-active">${active.length === 1 ? t("active_in_one") : t("active_in", { count: active.length })}</div>` : ""}
      </div>
    </div>`;
    if (config) {
      const duration = manual ? selectField(t("duration"), "cfg-hours", hourOptions(config.hours)) : "";
      return `<div class="card mode-card active">
        ${head}
        <div class="mode-form">${selectField(t("temperature"), "cfg-temp", tempOptions(config.temperature))}${duration}</div>
        <div class="mode-text">${t("zones_selected", { count: config.selected.size, total: this._zones.length })}</div>
        <div class="card-actions">
          <button class="btn plain" data-action="cancel-config">${t("cancel")}</button>
          <button class="btn filled" data-action="apply-config" ${config.selected.size ? "" : "disabled"}>${t("turn_on")}</button>
        </div>
      </div>`;
    }
    return `<div class="card mode-card">
      ${head}
      <div class="mode-text">${t(manual ? "manual_text" : "vacation_text")}</div>
      <div class="card-actions">
        ${active.length ? `<button class="btn plain" data-action="end-all" data-type="${type}">${t("end_all")}</button>` : ""}
        <button class="btn plain" data-action="open-config" data-type="${type}" ${this._zones.length ? "" : "disabled"}>${t("configure")}</button>
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
    const now = current != null ? t("current", { temp: fmtTemp(current) }).replace(/ /g, "\u00a0") : "";
    const secondary = now ? `${label} · ${now}` : label;

    let trailing;
    const selecting = Boolean(this._config);
    if (selecting) {
      trailing = checkbox(`tabindex="-1" aria-hidden="true"`, this._config.selected.has(zone.id));
    } else {
      const end =
        status.mode === "schedule"
          ? ""
          : `<button class="btn plain small end" data-action="clear-override" data-zone="${esc(zone.id)}"
              title="${t(status.mode === "manual" ? "end_manual" : "end_vacation")}">${icon("mdi:close-circle-outline")}<span>${t("end")}</span></button>`;
      trailing = `${end}<span class="chevron">${icon("mdi:chevron-right")}</span>`;
    }
    return `<div class="zone-row ${selecting && this._config.selected.has(zone.id) ? "selected" : ""}" role="button" tabindex="0"
        data-action="${selecting ? "toggle-select" : "manage"}" data-zone="${esc(zone.id)}">
      ${badge(MODE_ICONS[status.mode], tempColor(status.target))}
      <div class="zone-info">
        <div class="zone-name">${esc(zone.name)}</div>
        <div class="secondary">${esc(secondary)}</div>
        ${warning ? `<div class="warn">${icon("mdi:alert-outline")}${esc(warning)}</div>` : ""}
      </div>
      <div class="zone-target">${fmtTemp(status.target)}</div>
      <div class="zone-trailing">${trailing}</div>
    </div>`;
  }

  /* editor view */

  _renderEditor() {
    const draft = this._draft;
    const live = draft.id ? this._zone(draft.id) : null;
    return `<div class="page editor">
      <div class="card">
        <div class="card-content">
          <label class="field text"><span class="field-label">${t("name")}</span>
            <input data-input="name" value="${esc(draft.name)}" maxlength="64" autocomplete="off"></label>
          ${this._renderEntities()}
        </div>
      </div>
      ${this._renderOverrides(live)}
      <div class="card schedule">
        <div class="card-header">${t("schedule_title")}<div class="card-subtitle">${t("schedule_hint")}</div></div>
        ${DAYS.map((day) => this._renderDay(day)).join("")}
        <div class="day all-days">
          <div class="day-row">
            <span class="day-label">${t("all_days")}</span>
            ${this._renderBar("week", this._weekBounds, null)}
            <span></span>
          </div>
          <div class="indent secondary small">${t("all_days_hint")}</div>
        </div>
      </div>
    </div>
    <button class="fab" data-action="save-zone">${icon("mdi:content-save-outline")}<span>${t("save")}</span></button>`;
  }

  _renderEntities() {
    const draft = this._draft;
    const chips = draft.entities.length
      ? draft.entities.map((id) => `<span class="chip">${icon("mdi:thermostat")}${esc(this._entityName(id))}</span>`).join("")
      : `<span class="secondary">${t("none_selected")}</span>`;
    let list = "";
    if (this._entitiesOpen) {
      const climates = this._climateEntities();
      const known = new Set(climates.map((c) => c.id));
      const missing = draft.entities.filter((id) => !known.has(id)).map((id) => ({ id, name: id, missing: true }));
      const rows = [...climates, ...missing]
        .map((entity) => {
          const owner = this._zones.find((zone) => zone.id !== draft.id && zone.entities.includes(entity.id));
          let info = entity.id;
          if (owner) info += ` · ${t("in_zone", { zone: owner.name })}`;
          if (entity.missing) info += ` · ${t("not_found")}`;
          return `<label class="entity ${owner ? "taken" : ""}" data-search="${esc(`${entity.name} ${entity.id}`.toLowerCase())}">
            ${checkbox(`data-change="toggle-entity" data-entity="${esc(entity.id)}"`, draft.entities.includes(entity.id), Boolean(owner))}
            <span class="entity-text"><span>${esc(entity.name)}</span><span class="secondary small">${esc(info)}</span></span>
            ${typeof entity.current === "number" ? `<span class="secondary">${fmtTemp(entity.current)}</span>` : ""}
          </label>`;
        })
        .join("");
      list = `<div class="entity-picker">
        <label class="field text search">${icon("mdi:magnify")}<input type="search" placeholder="${t("search")}" data-input="entity-filter" value="${esc(this._entityFilter)}"></label>
        ${rows ? `<div class="entity-list">${rows}</div>` : `<div class="secondary">${t("no_climate")}</div>`}
      </div>`;
    }
    return `<div class="subheader">
        <span>${t("thermostats_title")}</span>
        <button class="btn plain small" data-action="toggle-entities">${t(this._entitiesOpen ? "done" : "choose")}</button>
      </div>
      <div class="chips">${chips}</div>
      ${list}`;
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
    const heat = "var(--state-climate-heat-color, #ff8100)";
    let manual;
    if (manualOn) {
      manual = `<div class="status-row">
        ${badge(MODE_ICONS.manual, heat)}
        <div><div>${t("mode_manual")}</div><div class="secondary">${t("manual_active", { temp: fmtTemp(live.status.target), time: fmtUntil(live.status.until) })}</div></div>
        <button class="btn plain" data-action="manual-off">${t("end")}</button>
      </div>`;
    } else {
      const form = this._manualForm;
      manual = `<div class="status-row">
        ${badge(MODE_ICONS.manual, "var(--disabled-text-color, #9e9e9e)")}
        <div><div>${t("manual_inactive")}</div>${draft.id ? "" : `<div class="secondary">${t("after_first_save")}</div>`}</div>
        ${form ? "" : `<button class="btn plain" data-action="toggle-manual-form" ${draft.id ? "" : "disabled"}>${t("configure")}</button>`}
      </div>
      ${
        form
          ? `<div class="manual-form">
              ${selectField(t("temperature"), "manual-temp", tempOptions(form.temperature, true))}
              ${selectField(t("duration"), "manual-hours", hourOptions(form.hours))}
              <div class="form-actions">
                <button class="btn plain" data-action="toggle-manual-form">${t("cancel")}</button>
                <button class="btn filled" data-action="manual-on" ${form.temperature == null ? "disabled" : ""}>${t("turn_on")}</button>
              </div>
            </div>`
          : ""
      }`;
    }
    const vacation = live?.vacation
      ? `<div class="status-row">
          ${badge(MODE_ICONS.vacation, "var(--state-climate-cool-color, #2b9af9)")}
          <div><div>${t("vacation_active", { temp: fmtTemp(live.vacation.temperature) })}</div>${manualOn ? `<div class="secondary">${t("afterwards")}</div>` : ""}</div>
          <button class="btn plain" data-action="vacation-off">${t("end")}</button>
        </div>`
      : "";
    return `<div class="card">${manual}${vacation}</div>`;
  }

  _renderDay(day) {
    const entry = this._draft.schedule[day];
    const open = this._openDay === day;
    let details = "";
    if (open) {
      const edges = [0, ...entry.bounds, DAY_MINUTES];
      const field = (prefix, idx, temp, from, to) => {
        const label = `${prefix}${clock(from)}–${clock(to)}`;
        const aria = t("range_label", { day: dayLong(day), from: prefix + clock(from), to: clock(to) });
        return selectField(label, "seg-temp", tempOptions(temp), `data-day="${day}" data-idx="${idx}" aria-label="${esc(aria)}"`);
      };
      // First and last period are the night around the 05:00 day start and share one temperature.
      const periods =
        [1, 2, 3].map((i) => field("", i, entry.temps[i], edges[i], edges[i + 1])).join("") +
        field(`${t("night")} `, "night", entry.temps[4], edges[4], edges[1]);
      details = `<div class="day-row axis-row"><span></span>${this._renderAxis()}<span></span></div>
        <div class="periods indent">${periods}</div>
        ${this._renderCopy(day)}`;
    }
    return `<div class="day ${open ? "open" : ""}">
      <div class="day-row">
        <button class="day-label" data-action="toggle-day" data-day="${day}">${dayShort(day)}</button>
        ${this._renderBar(day, entry.bounds, entry.temps)}
        <button class="icon-btn day-toggle" data-action="toggle-day" data-day="${day}"
          aria-label="${t(open ? "collapse" : "expand", { day: dayLong(day) })}" aria-expanded="${open}">${icon("mdi:chevron-down")}</button>
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
        return `<div class="seg ${tempTextClass(temp)}" style="${style};background:${tempColor(temp)}" title="${clock(start)}–${clock(end)}: ${fmtTemp(temp)}"><span>${fmtTemp(temp)}</span></div>`;
      })
      .join("");
    const name = day === "week" ? t("all_days") : dayLong(day);
    const handles = bounds
      .map(
        (bound, i) => `<div class="handle" data-handle="${day}:${i}" style="left:${pct(bound)}%" tabindex="0" role="slider"
          aria-label="${esc(t("boundary", { name, number: i + 1 }))}" aria-valuetext="${clock(bound)}"><span class="knob"></span><span class="bubble">${clock(bound)}</span></div>`,
      )
      .join("");
    return `<div class="bar" data-bar="${day}"><div class="track">${segments}</div>${handles}</div>`;
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
      `<label class="menu-item">${checkbox(`data-change="copy-target" data-key="${key}" data-day="${day}"`, checked)}<span>${text}</span></label>`;
    const label = selected.size ? DAYS.filter((d) => selected.has(d)).map(dayShort).join(", ") : t("copy_to");
    const menu = this._copyOpen
      ? `<div class="menu">
          ${option("week", t("whole_week"), others.every((d) => selected.has(d)))}
          ${option("workdays", t("workdays"), workdays.every((d) => selected.has(d)))}
          <div class="menu-divider"></div>
          ${others.map((d) => option(d, dayLong(d), selected.has(d))).join("")}
        </div>`
      : "";
    return `<div class="copy-row indent">
      <div class="copy-wrap">
        <button class="btn outlined small" data-action="toggle-copy" aria-expanded="${this._copyOpen}">${icon("mdi:content-copy")}<span>${esc(label)}</span>${icon("mdi:menu-down")}</button>
        ${menu}
      </div>
      <button class="btn filled small" data-action="do-copy" data-day="${day}" ${selected.size ? "" : "disabled"}>${t("copy")}</button>
    </div>`;
  }

  /* ---------- events ---------- */

  async _onClick(ev) {
    let render = false;
    if (this._copyOpen && !ev.target.closest(".copy-wrap")) {
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
      case "menu":
        this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true }));
        return;
      case "dialog-cancel":
      case "dialog-confirm": {
        const dialog = this._dialog;
        this._dialog = null;
        this._render();
        dialog?.resolve(el.dataset.action === "dialog-confirm");
        return;
      }
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
      case "end-all": {
        const manual = el.dataset.type === "manual";
        const ids = this._zones.filter((z) => (manual ? z.status.mode === "manual" : z.vacation)).map((z) => z.id);
        if (ids.length) {
          await this._call(
            { type: `${DOMAIN}/${manual ? "manual" : "vacation"}/clear`, zone_ids: ids },
            t(manual ? "toast_manual_off" : "toast_vacation_off"),
          );
        }
        break;
      }
      case "toggle-select":
        if (this._config.selected.has(zoneId)) this._config.selected.delete(zoneId);
        else this._config.selected.add(zoneId);
        break;
      case "clear-override": {
        const zone = this._zone(zoneId);
        if (!zone) break;
        const kind = zone.status.mode === "manual" ? "manual" : "vacation";
        await this._call(
          { type: `${DOMAIN}/${kind}/clear`, zone_ids: [zone.id] },
          t(kind === "manual" ? "toast_manual_off" : "toast_vacation_off"),
        );
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
        this._focusName = true;
        this._entitiesOpen = true;
        break;
      }
      case "toggle-entities":
        this._entitiesOpen = !this._entitiesOpen;
        break;
      case "back":
        if (this._dirty() && !(await this._confirm(t("discard_title"), t("discard_text"), t("discard"), true))) return;
        this._closeEditor();
        break;
      case "delete-zone": {
        const name = this._draft.name;
        if (!(await this._confirm(t("delete_title"), t("delete_text", { name }), t("delete"), true))) return;
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
    const kind = ev.target.dataset?.input;
    if (kind === "entity-filter") {
      this._entityFilter = ev.target.value;
      this._applyEntityFilter();
    } else if (kind === "name") {
      this._draft.name = ev.target.value;
      this.shadowRoot.querySelector(".toolbar .title").textContent = ev.target.value.trim() || t("new_zone");
    }
  }

  _onKeyDown(ev) {
    if (this._dialog && ev.key === "Escape") {
      this.shadowRoot.querySelector("[data-action=dialog-cancel]")?.click();
      return;
    }
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
    if (ev.target.getAttribute?.("role") === "button" && (ev.key === "Enter" || ev.key === " ")) {
      ev.preventDefault();
      ev.target.click();
      return;
    }
    if (ev.target.dataset?.input === "name" && ev.key === "Enter") {
      ev.target.blur();
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

  _openEditor(draft) {
    this._view = "edit";
    this._draft = draft;
    this._original = JSON.stringify(draft);
    this._weekBounds = [...draft.schedule.mon.bounds];
    this._openDay = "mon";
    this._entitiesOpen = false;
    this._entityFilter = "";
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
    this.scrollTop = 0;
  }

  async _save() {
    const draft = this._draft;
    const name = draft.name.trim();
    if (!name) {
      this._showToast(t("name_required"), true);
      return;
    }
    const zone = { name, entities: draft.entities, schedule: draft.schedule };
    if (draft.id) zone.id = draft.id;
    const [ok] = await this._call({ type: `${DOMAIN}/zone/save`, zone }, t("toast_saved", { name }));
    if (ok) this._closeEditor();
  }
}

const STYLE = `
:host {
  --hp-primary: var(--primary-color, #03a9f4);
  --hp-on-primary: var(--text-primary-color, #fff);
  --hp-text: var(--primary-text-color, #212121);
  --hp-secondary: var(--secondary-text-color, #727272);
  --hp-disabled: var(--disabled-text-color, #bdbdbd);
  --hp-bg: var(--primary-background-color, #fafafa);
  --hp-card: var(--ha-card-background, var(--card-background-color, #fff));
  --hp-divider: var(--divider-color, rgba(0, 0, 0, 0.12));
  --hp-fill: var(--input-fill-color, var(--secondary-background-color, #f5f5f5));
  --hp-line: var(--input-idle-line-color, rgba(0, 0, 0, 0.42));
  --hp-error: var(--error-color, #db4437);
  --hp-warning: var(--warning-color, #ffa600);
  --hp-radius: var(--ha-card-border-radius, 12px);
  --hp-hover: color-mix(in srgb, var(--hp-text) 6%, transparent);
  display: block;
  height: 100%;
  overflow-y: auto;
  background: var(--hp-bg);
  color: var(--hp-text);
  font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, Noto, sans-serif));
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
button { font: inherit; color: inherit; }
ha-icon { --mdc-icon-size: 24px; display: inline-flex; flex: none; }

/* top bar like the other Home Assistant pages */
.toolbar {
  position: sticky; top: 0; z-index: 4;
  display: flex; align-items: center; gap: 4px;
  height: var(--header-height, 56px); padding: 0 4px 0 16px;
  background: var(--app-header-background-color, var(--hp-primary));
  color: var(--app-header-text-color, var(--hp-on-primary));
  border-bottom: var(--app-header-border-bottom, none);
}
.toolbar.has-leading { padding-left: 4px; }
.toolbar .title {
  flex: 1; min-width: 0; margin-left: 8px;
  font-size: 20px; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.toolbar:not(.has-leading) .title { margin-left: 0; }

.content { padding: 16px 16px 104px; }
.page { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
.editor { max-width: 900px; }

/* cards */
.card {
  background: var(--hp-card);
  border-radius: var(--hp-radius);
  border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--hp-divider));
  box-shadow: var(--ha-card-box-shadow, none);
}
.card-header { padding: 16px 16px 8px; font-size: 20px; font-weight: 400; line-height: 28px; }
.card-subtitle { font-size: 14px; color: var(--hp-secondary); line-height: 20px; }
.card-content { padding: 16px; }
.card-actions {
  display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px;
  padding: 8px; border-top: 1px solid var(--hp-divider); margin-top: auto;
}
.secondary { color: var(--hp-secondary); }
.small { font-size: 12px; }
.empty { padding: 32px 24px; text-align: center; color: var(--hp-secondary); line-height: 1.5; }
.empty ha-icon { --mdc-icon-size: 48px; color: var(--hp-disabled); }
.empty p { margin: 8px auto 0; max-width: 420px; }

/* buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 36px; padding: 0 16px; border-radius: 18px; border: 0;
  font-size: 14px; font-weight: 500; letter-spacing: 0.1px; white-space: nowrap;
  cursor: pointer; background: transparent;
}
.btn ha-icon { --mdc-icon-size: 18px; }
.btn.small { height: 32px; padding: 0 12px; }
.btn.plain { color: var(--hp-primary); }
.btn.plain:not(:disabled):hover { background: color-mix(in srgb, var(--hp-primary) 10%, transparent); }
.btn.filled { background: var(--hp-primary); color: var(--hp-on-primary); }
.btn.filled:not(:disabled):hover { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); }
.btn.outlined { color: var(--hp-primary); border: 1px solid var(--hp-divider); }
.btn.outlined:not(:disabled):hover { background: color-mix(in srgb, var(--hp-primary) 8%, transparent); }
.btn.danger { color: var(--hp-error); }
.btn.plain.danger:not(:disabled):hover { background: color-mix(in srgb, var(--hp-error) 10%, transparent); }
.btn:disabled { opacity: 0.38; cursor: default; }
.btn:focus-visible, .icon-btn:focus-visible, .zone-row:focus-visible, .day-label:focus-visible {
  outline: 2px solid var(--hp-primary); outline-offset: 2px;
}
.icon-btn {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 40px; height: 40px; border-radius: 50%; border: 0; padding: 0;
  background: transparent; color: inherit; cursor: pointer;
}
.icon-btn:hover { background: color-mix(in srgb, currentColor 10%, transparent); }
.fab {
  position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); z-index: 5;
  display: inline-flex; align-items: center; gap: 12px;
  height: 56px; padding: 0 20px 0 16px; border: 0; border-radius: 16px;
  background: var(--hp-primary); color: var(--hp-on-primary);
  font-size: 14px; font-weight: 500; letter-spacing: 0.1px; cursor: pointer;
  box-shadow: 0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 6px 10px 0 rgba(0, 0, 0, 0.14), 0 1px 18px 0 rgba(0, 0, 0, 0.12);
}
.fab:hover { filter: brightness(1.05); }

/* round icon like on tiles */
.badge {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 40px; height: 40px; border-radius: 50%;
  color: var(--badge-color);
  background: color-mix(in srgb, var(--badge-color) 20%, transparent);
}

/* form fields like Home Assistant text fields */
.field {
  position: relative; display: flex; flex-direction: column; justify-content: center;
  min-width: 140px; min-height: 56px; padding: 6px 12px 4px;
  background: var(--hp-fill); border-radius: 4px 4px 0 0;
  border-bottom: 1px solid var(--hp-line);
}
.field:focus-within { border-bottom: 2px solid var(--hp-primary); padding-bottom: 3px; }
.field-label { font-size: 12px; color: var(--hp-secondary); line-height: 16px; }
.field:focus-within .field-label { color: var(--hp-primary); }
.field select, .field input {
  appearance: none; -webkit-appearance: none; width: 100%;
  border: 0; outline: none; background: transparent; color: var(--hp-text);
  font: inherit; font-size: 16px; padding: 2px 0 4px;
}
.field select { padding-right: 24px; cursor: pointer; }
.field select option { background: var(--hp-card); color: var(--hp-text); }
.field.select::after {
  content: ""; position: absolute; right: 12px; top: 50%; margin-top: -2px; pointer-events: none;
  border: 5px solid transparent; border-top-color: var(--hp-secondary);
}
.field.text input::placeholder { color: var(--hp-secondary); }
.field.search { flex-direction: row; align-items: center; gap: 8px; min-height: 48px; padding-top: 4px; }
.field.search ha-icon { color: var(--hp-secondary); }

.check {
  appearance: none; -webkit-appearance: none; flex: none; position: relative;
  width: 18px; height: 18px; margin: 3px; cursor: pointer;
  border: 2px solid var(--hp-secondary); border-radius: 2px; background: transparent;
}
.check:checked { background: var(--hp-primary); border-color: var(--hp-primary); }
.check:checked::after {
  content: ""; position: absolute; left: 4px; top: 0; width: 5px; height: 10px;
  border: solid var(--hp-on-primary); border-width: 0 2px 2px 0; transform: rotate(45deg);
}
.check:disabled { opacity: 0.38; cursor: default; }

/* mode cards */
.modes { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.mode-card { display: flex; flex-direction: column; }
.mode-head { display: flex; align-items: center; gap: 16px; padding: 16px 16px 8px; }
.mode-title { font-size: 16px; font-weight: 500; }
.mode-active { font-size: 14px; color: var(--hp-primary); font-weight: 500; }
.mode-text { padding: 4px 16px 16px; color: var(--hp-secondary); line-height: 20px; }
.mode-form { display: flex; flex-wrap: wrap; gap: 12px; padding: 8px 16px; }
.mode-form .field { flex: 1; }

/* zone list */
.zone-list { padding-bottom: 8px; }
.zone-row {
  display: flex; align-items: center; gap: 16px;
  min-height: 64px; padding: 8px 8px 8px 16px; cursor: pointer;
}
.zone-row + .zone-row { border-top: 1px solid var(--hp-divider); }
.zone-row:hover { background: var(--hp-hover); }
.zone-row.selected { background: color-mix(in srgb, var(--hp-primary) 8%, transparent); }
.zone-info { flex: 1; min-width: 0; }
.zone-name { font-size: 16px; overflow-wrap: anywhere; }
.zone-info .secondary { margin-top: 2px; }
.warn { display: flex; align-items: center; gap: 4px; margin-top: 2px; color: var(--hp-warning); font-size: 12px; }
.warn ha-icon { --mdc-icon-size: 16px; }
.zone-target { font-size: 22px; font-weight: 400; white-space: nowrap; }
.zone-trailing { display: flex; align-items: center; gap: 4px; min-width: 40px; justify-content: flex-end; }
.zone-trailing .check { margin-right: 8px; pointer-events: none; }
.chevron { display: inline-flex; color: var(--hp-secondary); padding: 0 4px; }

/* editor */
.subheader { display: flex; align-items: center; justify-content: space-between; margin: 20px 0 8px; font-weight: 500; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px 0 8px;
  border: 1px solid var(--hp-divider); border-radius: 8px; font-size: 14px;
}
.chip ha-icon { --mdc-icon-size: 18px; color: var(--hp-primary); }
.entity-picker { margin-top: 12px; display: flex; flex-direction: column; gap: 4px; }
.entity-list { max-height: 320px; overflow-y: auto; }
.entity { display: flex; align-items: center; gap: 16px; padding: 8px 4px; cursor: pointer; border-radius: 8px; }
.entity:hover { background: var(--hp-hover); }
.entity.taken { cursor: default; opacity: 0.55; }
.entity-text { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow-wrap: anywhere; }
.status-row { display: flex; align-items: center; gap: 16px; padding: 12px 8px 12px 16px; min-height: 64px; }
.status-row > div { flex: 1; min-width: 0; }
.status-row + .status-row { border-top: 1px solid var(--hp-divider); }
.manual-form { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 0 16px 16px 72px; }
.manual-form .field { flex: 1; }
.form-actions { display: flex; gap: 8px; margin-left: auto; }

/* weekly schedule */
.schedule { padding-bottom: 8px; }
.day { padding: 4px 4px 4px 16px; border-top: 1px solid var(--hp-divider); }
.day.open { background: color-mix(in srgb, var(--hp-primary) 5%, transparent); padding-bottom: 16px; }
.day-row { display: grid; grid-template-columns: 52px minmax(0, 1fr) 40px; gap: 8px; align-items: center; }
.indent { padding-left: 60px; padding-right: 48px; }
.day-label {
  background: none; border: 0; padding: 0; text-align: left; cursor: pointer;
  font-size: 14px; font-weight: 500; color: var(--hp-text);
}
.all-days .day-label { cursor: default; font-weight: 400; color: var(--hp-secondary); }
.all-days .indent { padding-top: 2px; padding-bottom: 8px; }
.day-toggle { color: var(--hp-secondary); }
.day-toggle ha-icon { transition: transform 0.2s; }
.day.open .day-toggle ha-icon { transform: rotate(180deg); }

.bar { position: relative; height: 48px; margin: 0 6px; }
.track {
  position: absolute; left: 0; right: 0; top: 8px; height: 32px;
  border-radius: 8px; overflow: hidden; background: var(--hp-fill);
}
.seg {
  position: absolute; top: 0; height: 100%; container-type: inline-size;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
  color: #fff; font-size: 12px; font-weight: 500; white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}
@container (max-width: 52px) { .seg span { display: none; } }
.seg.dark-text { color: rgba(0, 0, 0, 0.8); text-shadow: none; }
.seg.w0 { background: color-mix(in srgb, var(--hp-primary) 18%, var(--hp-fill)); }
.seg.w1 { background: color-mix(in srgb, var(--hp-primary) 32%, var(--hp-fill)); }
.seg.w2 { background: color-mix(in srgb, var(--hp-primary) 46%, var(--hp-fill)); }
.seg.w3 { background: color-mix(in srgb, var(--hp-primary) 60%, var(--hp-fill)); }
.seg.w4 { background: color-mix(in srgb, var(--hp-primary) 74%, var(--hp-fill)); }
.handle {
  position: absolute; top: 0; z-index: 2; width: 28px; height: 48px; margin-left: -14px;
  display: flex; align-items: center; justify-content: center;
  cursor: ew-resize; touch-action: none; outline: none;
}
.knob {
  width: 8px; height: 40px; border-radius: 4px; background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.1);
  transition: transform 0.1s;
}
.handle:hover .knob, .handle.dragging .knob { transform: scaleX(1.3); }
.handle:focus-visible .knob { box-shadow: 0 0 0 2px var(--hp-primary), 0 1px 3px rgba(0, 0, 0, 0.4); }
.bubble {
  display: none; position: absolute; bottom: calc(100% - 2px); left: 50%; transform: translateX(-50%); z-index: 3;
  padding: 4px 8px; border-radius: 4px; white-space: nowrap; pointer-events: none;
  background: rgba(97, 97, 97, 0.95); color: #fff; font-size: 12px;
}
.handle:hover .bubble, .handle:focus-visible .bubble, .handle.dragging .bubble { display: block; }

.axis-row { margin-top: -4px; }
.axis { position: relative; height: 16px; margin: 0 6px; }
.tick { position: absolute; transform: translateX(-50%); font-size: 11px; color: var(--hp-secondary); white-space: nowrap; }
.periods { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-top: 12px; }
.copy-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
.copy-wrap { position: relative; }
.copy-wrap .btn span { max-width: 220px; overflow: hidden; text-overflow: ellipsis; }
.menu {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 6; min-width: 220px; padding: 8px 0;
  background: var(--hp-card); border-radius: 4px;
  box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);
}
.menu-item { display: flex; align-items: center; gap: 16px; height: 48px; padding: 0 16px; cursor: pointer; white-space: nowrap; }
.menu-item:hover { background: var(--hp-hover); }
.menu-divider { height: 1px; margin: 8px 0; background: var(--hp-divider); }

/* dialog and snackbar */
.dialog-backdrop {
  position: fixed; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.32); padding: 16px;
}
.dialog {
  width: min(480px, 100%); padding: 24px 24px 12px;
  background: var(--mdc-theme-surface, var(--hp-card)); color: var(--hp-text);
  border-radius: var(--ha-dialog-border-radius, 24px);
  box-shadow: 0 11px 15px -7px rgba(0, 0, 0, 0.2), 0 24px 38px 3px rgba(0, 0, 0, 0.14);
}
.dialog-title { font-size: 22px; line-height: 28px; margin-bottom: 12px; }
.dialog-text { color: var(--hp-secondary); line-height: 20px; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.toast {
  position: fixed; left: 50%; bottom: calc(24px + env(safe-area-inset-bottom, 0px)); z-index: 11;
  transform: translateX(-50%); max-width: calc(100% - 32px); min-width: 280px;
  padding: 14px 16px; border-radius: 4px;
  background: #323232; color: #fff; box-shadow: 0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 6px 10px 0 rgba(0, 0, 0, 0.14);
}
.toast.error { background: var(--hp-error); }

@media (max-width: 600px) {
  .content { padding: 8px 8px 96px; }
  .page { gap: 8px; }
  .modes { grid-template-columns: 1fr; gap: 8px; }
  .zone-row { gap: 12px; padding-left: 12px; }
  .zone-target { font-size: 18px; }
  .btn.end span { display: none; }
  .btn.end { padding: 0 8px; }
  .day { padding-left: 8px; padding-right: 0; }
  .day-row { grid-template-columns: 36px minmax(0, 1fr) 36px; gap: 4px; }
  .indent { padding-left: 0; padding-right: 8px; }
  .periods { grid-template-columns: 1fr 1fr; }
  .tick.minor { display: none; }
  .manual-form { padding-left: 16px; }
  .fab span { display: none; }
  .fab { width: 56px; padding: 0; justify-content: center; }
}
`;

if (!customElements.get("heatingpanel-panel")) {
  customElements.define("heatingpanel-panel", HeatingPanel);
}
