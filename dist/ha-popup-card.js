/*!
 * HA Popup Card
 * Opens a section of a dashboard ("popup dashboard") as a popup from any card.
 * No card of its own: it listens for the `fire-dom-event` action (event `ll-custom`) with an `ha_popup` key.
 *
 *   tap_action:
 *     action: fire-dom-event
 *     ha_popup:
 *       section: Cameras        # heading of a section in the popup dashboard
 *       card: camera.front_door # optional: open only one card of the section (position, name, title, heading or entity)
 *       popup_title: My popup   # optional: title of the popup (overrides the section heading)
 *       hide_title: true        # optional: hide the title (default: false)
 *       dashboard: popups       # URL path of the popup dashboard (default: popups)
 *       width: medium           # small | medium | large | full | auto (default: auto = width of the section)
 *       auto_close: 0           # seconds, 0 = off
 *
 * The card itself can also open its popup by an external trigger (no tap needed):
 *   type: custom:ha-popup-card
 *   section: Cameras
 *   trigger_entity: binary_sensor.doorbell
 *   trigger_attribute: battery_level  # optional: watch this attribute instead of the state
 *   trigger_state: "on"               # optional: only when it changes to this value (empty = every change)
 */
(() => {
  const VERSION = "0.3.8";
  if (window.__haPopupOpener) return;

  const TEXT = {
    en: { loading: "Loading…", notFound: "Popup not found:", cardNotFound: "Card not found in the popup:", noCards: "This popup has no cards.", notVisible: "This popup is not available for you.", noHelpers: "Cards could not be created.", failed: "Popup dashboard could not be loaded:", close: "Close" },
    de: { loading: "Lädt…", notFound: "Popup nicht gefunden:", cardNotFound: "Karte im Popup nicht gefunden:", noCards: "Dieses Popup enthält keine Karten.", notVisible: "Dieses Popup ist für dich nicht verfügbar.", noHelpers: "Karten konnten nicht erstellt werden.", failed: "Popup-Dashboard konnte nicht geladen werden:", close: "Schließen" }
  };
  const WIDTHS = { small: 360, medium: 560, large: 860 };
  const norm = (value) => String(value ?? "").trim().toLowerCase();
  const homeAssistant = () => document.querySelector("home-assistant");
  const getHass = () => homeAssistant()?.hass;
  const t = (key) => (TEXT[String(getHass()?.language ?? "en").slice(0, 2)] ?? TEXT.en)[key];

  // Visibility conditions of a section ("visibility" in the sections view), evaluated like Home Assistant does for a card.
  // Supported: user, state, numeric_state, screen, and, or, not. Unknown types (e.g. time, location) do not hide the section.
  const asList = (value) => Array.isArray(value) ? value : [value];
  const conditionMet = (condition, hass) => {
    if (!condition || typeof condition !== "object") return true;
    // Home Assistant stores the entity as "entity_id" (newer versions) or "entity" (older ones)
    const entityOf = (c) => { const e = c.entity_id ?? c.entity; return Array.isArray(e) ? e[0] : e; };
    const type = condition.condition ?? (entityOf(condition) ? (condition.above !== undefined || condition.below !== undefined ? "numeric_state" : "state") : "");
    const stateOf = (entityId) => hass?.states?.[entityId]?.state;
    switch (type) {
      case "user": return !Array.isArray(condition.users) || condition.users.includes(hass?.user?.id);
      case "state": {
        const value = stateOf(entityOf(condition)) ?? "unavailable";
        const ref = (x) => (typeof x === "string" && hass?.states?.[x]) ? hass.states[x].state : x;
        if (condition.state !== undefined) return asList(condition.state).map(ref).map(String).includes(String(value));
        if (condition.state_not !== undefined) return !asList(condition.state_not).map(ref).map(String).includes(String(value));
        return true;
      }
      case "numeric_state": {
        const num = (x) => typeof x === "string" && hass?.states?.[x] ? Number(hass.states[x].state) : Number(x);
        const value = Number(stateOf(entityOf(condition)));
        if (Number.isNaN(value)) return false;
        if (condition.above !== undefined && condition.above !== null && !(value > num(condition.above))) return false;
        if (condition.below !== undefined && condition.below !== null && !(value < num(condition.below))) return false;
        return true;
      }
      case "screen": return !condition.media_query || !!window.matchMedia?.(condition.media_query).matches;
      case "and": return conditionsMet(condition.conditions, hass);
      case "or": return !Array.isArray(condition.conditions) || !condition.conditions.length || condition.conditions.some((c) => conditionMet(c, hass));
      case "not": return !Array.isArray(condition.conditions) || !condition.conditions.some((c) => conditionMet(c, hass));
      default: return true;
    }
  };
  const conditionsMet = (conditions, hass) => !Array.isArray(conditions) || conditions.every((c) => conditionMet(c, hass));

  const STYLE = `
    dialog.ha-popup-opener { box-sizing: border-box; width: min(520px, 90vw); max-width: 90vw; max-height: 85vh; margin: auto; padding: 0;
      /* Same theme variables as a Home Assistant card, so the popup follows the selected theme (background, border, corners, shadow, blur, font) */
      border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, transparent));
      border-radius: var(--ha-card-border-radius, 12px); background: var(--ha-card-background, var(--card-background-color, #fff)); color: var(--primary-text-color, #000);
      box-shadow: var(--ha-card-box-shadow, 0 8px 32px rgba(0,0,0,.4)); -webkit-backdrop-filter: var(--ha-card-backdrop-filter, none); backdrop-filter: var(--ha-card-backdrop-filter, none);
      font-family: var(--ha-font-family-body, var(--primary-font-family, inherit)); overflow: hidden; }
    dialog.ha-popup-opener[open] { display: flex; flex-direction: column; }
    dialog.ha-popup-opener::backdrop { background: var(--mdc-dialog-scrim-color, rgba(0, 0, 0, .55)); }
    .ha-popup-opener-head { display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 20px; flex: none; }
    .ha-popup-opener-title { flex: 1; min-width: 0; font-size: 20px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ha-popup-opener-close { all: unset; cursor: pointer; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; color: var(--secondary-text-color, #727272); }
    .ha-popup-opener-close:hover { background: var(--secondary-background-color, rgba(127,127,127,.2)); }
    .ha-popup-opener-body { display: flex; flex-direction: column; gap: 12px; padding: 0 12px 12px; min-height: 0; max-height: calc(85vh - 64px); overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; }
    .ha-popup-opener-body > * { flex: none; }
    .ha-popup-opener-note { opacity: .7; font-size: 14px; padding: 8px; }
  `;
  // The popup lives inside <home-assistant> (its shadow root), not directly in <body>: newer Home Assistant components (e.g. the camera stream)
  // get their connection (callWS) through a context that only reaches elements below <home-assistant>.
  const popupRoot = () => homeAssistant()?.shadowRoot ?? document.body;
  const ensureStyle = (root) => {
    const inRoot = root instanceof ShadowRoot;
    if ((inRoot ? root : document).getElementById("ha-popup-opener-style")) return;
    const style = document.createElement("style");
    style.id = "ha-popup-opener-style";
    style.textContent = STYLE;
    (inRoot ? root : document.head).append(style);
  };

  let current = null;

  // The popup is a child of <body>, so it only sees the global theme. Theme values that only apply to the dashboard view or the card
  // (view theme, card theme) and the look of the card itself (glass, gradient, blur, corners) are taken over from the opening element.
  const themeVariableNames = () => {
    const names = new Set();
    const add = (object) => Object.keys(object || {}).forEach((key) => { if (key !== "modes") names.add(key.startsWith("--") ? key : `--${key}`); });
    for (const theme of Object.values(getHass()?.themes?.themes ?? {})) { add(theme); add(theme?.modes?.light); add(theme?.modes?.dark); }
    return names;
  };
  const applyTheme = (dialog, source) => {
    try {
      if (!source || !source.getRootNode) return;
      // 1) theme variables that Home Assistant sets directly on elements above the source (view or card theme), outermost first
      const chain = [];
      for (let node = source, i = 0; node && i < 80; i++) { chain.push(node); node = node.assignedSlot || node.parentElement || node.getRootNode?.()?.host; }
      const wanted = themeVariableNames();
      for (const element of chain.reverse()) {
        const style = element.style;
        if (!style) continue;
        for (let i = 0; i < style.length; i++) {
          const name = style[i];
          if (name.startsWith("--") && (wanted.has(name) || name.startsWith("--ha-card-"))) dialog.style.setProperty(name, style.getPropertyValue(name));
        }
      }
      // 2) look of a card in the same place (an unhovered probe card), so card styles of the theme apply as well
      const scope = source.getRootNode?.();
      const host = scope instanceof ShadowRoot ? scope : document.body;
      const probe = document.createElement("ha-card");
      probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;";
      host.append(probe);
      const css = getComputedStyle(probe);
      const color = css.backgroundColor, image = css.backgroundImage;
      const visible = (image && image !== "none") || (color && !/^(transparent|rgba\(\s*0,\s*0,\s*0,\s*0\s*\))$/i.test(color));
      if (visible) { dialog.style.backgroundColor = color; dialog.style.backgroundImage = image; }
      if (parseFloat(css.borderTopWidth) > 0 && css.borderTopStyle !== "none") { dialog.style.borderWidth = css.borderTopWidth; dialog.style.borderStyle = css.borderTopStyle; dialog.style.borderColor = css.borderTopColor; }
      if (css.borderTopLeftRadius) dialog.style.borderRadius = css.borderTopLeftRadius;
      if (css.boxShadow && css.boxShadow !== "none") dialog.style.boxShadow = css.boxShadow;
      const blur = css.backdropFilter || css.webkitBackdropFilter;
      if (blur && blur !== "none") { dialog.style.backdropFilter = blur; dialog.style.webkitBackdropFilter = blur; }
      probe.remove();
    } catch { /* the popup still works with the global theme */ }
  };

  const closeCurrent = () => {
    if (!current) return;
    try { current.dialog.close(); } catch { current.finish(); }
  };

  async function open(cfg, source) {
    const hass = getHass();
    if (!hass) return;
    // Same popup already open (e.g. a card inside it fires the action again): keep it, do not rebuild its cards
    const key = JSON.stringify([cfg.dashboard || "popups", cfg.section ?? cfg.name ?? "", cfg.card ?? ""]);
    if (current && current.key === key && current.dialog.isConnected) return;
    closeCurrent();
    const root = popupRoot();
    ensureStyle(root);

    const mode = norm(cfg.width) || "auto";
    const fixed = WIDTHS[mode];
    let name = String(cfg.section ?? cfg.name ?? "").trim();
    const dash = String(cfg.dashboard || "popups").trim();
    if (!name) return;
    let pick = String(cfg.card ?? "").trim();

    const dialog = document.createElement("dialog");
    dialog.className = "ha-popup-opener";
    dialog.style.width = fixed ? `min(${fixed}px,90vw)` : mode === "full" ? "90vw" : "min(520px,90vw)";
    applyTheme(dialog, source);
    const head = document.createElement("div");
    head.className = "ha-popup-opener-head";
    const title = document.createElement("span");
    title.className = "ha-popup-opener-title";
    title.textContent = name;
    const close = document.createElement("button");
    close.type = "button"; close.className = "ha-popup-opener-close";
    close.setAttribute("aria-label", t("close")); close.title = t("close");
    close.innerHTML = '<ha-icon icon="mdi:close"></ha-icon>';
    head.append(title, close);
    const body = document.createElement("div");
    body.className = "ha-popup-opener-body";
    dialog.append(head, body);

    // width of the theme border (left + right), part of the dialog width (border-box)
    const edge = () => Math.round((parseFloat(getComputedStyle(dialog).borderLeftWidth) || 0) + (parseFloat(getComputedStyle(dialog).borderRightWidth) || 0));
    const popup = current = { dialog, cards: [], timer: 0, hassTimer: 0, finish: null, key };
    popup.finish = () => {
      clearTimeout(popup.timer); clearInterval(popup.hassTimer);
      if (current === popup) current = null;
      dialog.remove();
    };
    const note = (text) => { body.replaceChildren(); const p = document.createElement("div"); p.className = "ha-popup-opener-note"; p.textContent = text; body.append(p); };
    close.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", popup.finish);
    root.append(dialog);
    dialog.showModal();

    const autoClose = Number(cfg.auto_close);
    if (autoClose > 0) popup.timer = setTimeout(() => { try { dialog.close(); } catch { popup.finish(); } }, autoClose * 1000);
    note(t("loading"));

    try {
      const config = await hass.callWS({ type: "lovelace/config", url_path: ["", "lovelace", "default"].includes(dash) ? null : dash });
      const heading = (card) => card?.type === "heading" ? card.heading ?? card.title : undefined;
      const findSection = (sectionName) => {
        for (const view of config.views ?? []) {
          for (const section of view.sections ?? []) {
            const cards = section.cards ?? [];
            const index = cards.findIndex((card) => norm(heading(card)) === norm(sectionName));
            if (index >= 0) return { title: heading(cards[index]), span: Number(section.column_span) || 1, visibility: section.visibility, cards: cards.filter((_, i) => i !== index) };
          }
        }
        return null;
      };
      let found = findSection(name);
      // "Section#card": try the whole name first, otherwise split at the last #
      if (!found && name.includes("#")) {
        const cut = name.lastIndexOf("#");
        const sectionName = name.slice(0, cut).trim();
        const candidate = findSection(sectionName);
        if (candidate) { found = candidate; if (!pick) pick = name.slice(cut + 1).trim(); name = sectionName; }
      }
      // Fallback: a view with a matching path or title
      if (!found) {
        const view = (config.views ?? []).find((v) => norm(v.path) === norm(name) || norm(v.title) === norm(name));
        if (view) found = { title: view.title ?? name, parts: [{ cards: view.cards ?? [] }, ...(view.sections ?? []).map((s) => ({ visibility: s.visibility, cards: s.cards ?? [] }))] };
      }
      if (current !== popup) return;
      if (!found) { note(t("notFound") + " " + name); return; }
      // Whole view (path/title): keep only the sections whose visibility conditions are met
      const visibleKey = (h) => found.parts ? found.parts.map((part) => conditionsMet(part.visibility, h) ? "1" : "0").join("") : "";
      if (found.parts) {
        const h = getHass() ?? hass;
        found.cards = found.parts.filter((part) => conditionsMet(part.visibility, h)).flatMap((part) => part.cards);
        if (!found.cards.length && found.parts.some((part) => part.cards.length && !conditionsMet(part.visibility, h))) { title.textContent = ""; note(t("notVisible")); return; }
      }
      const initialKey = visibleKey(getHass() ?? hass);
      // Section visibility (for example only for certain users): not shown when the conditions are not met
      if (!conditionsMet(found.visibility, getHass() ?? hass)) { title.textContent = ""; note(t("notVisible")); return; }
      const customTitle = String(cfg.popup_title ?? "").trim();
      title.textContent = customTitle || (cfg.hide_title ? "" : String(found.title ?? name));

      let sectionWidth = 0;
      if (!fixed && mode !== "full" && found.span) {
        // Column width and gap like the sections view (theme variables, default 500 px / 32 px) plus padding of the popup
        const style = getComputedStyle(document.documentElement);
        const px = (variable, fallback) => parseFloat(style.getPropertyValue(variable)) || fallback;
        const column = px("--ha-view-sections-column-max-width", 500), gap = px("--ha-view-sections-column-gap", 32);
        sectionWidth = Math.round(found.span * column + (found.span - 1) * gap);
        dialog.style.width = `min(${sectionWidth + 24 + edge()}px,90vw)`;
      }
      if (pick) {
        const wanted = norm(pick);
        const labels = (card) => [card.name, card.title, card.heading, card.entity, card.entity_id].map(norm).filter(Boolean);
        const card = /^\d+$/.test(pick) ? found.cards[Number(pick) - 1]
          : found.cards.find((c) => labels(c).includes(wanted)) ?? found.cards.find((c) => labels(c).some((l) => l.includes(wanted)));
        if (!card) { note(t("cardNotFound") + " " + pick); return; }
        found.cards = [card];
      }

      const helpers = await window.loadCardHelpers?.();
      if (!helpers) { note(t("noHelpers")); return; }
      body.replaceChildren();
      // Grid like the sections view: 12 columns per section column; card width from grid_options.columns ("full" = whole width, default 12)
      const total = 12 * (found.span || 1);
      const useGrid = !!sectionWidth && !pick && found.cards.length > 0 && Math.min(sectionWidth + 24, window.innerWidth * 0.9) >= 600;
      if (useGrid) { body.style.display = "grid"; body.style.gridTemplateColumns = `repeat(${total}, minmax(0, 1fr))`; body.style.gap = "8px"; body.style.alignContent = "start"; }
      const columnsOf = (cardConfig, element) => {
        const wanted = cardConfig.grid_options?.columns ?? cardConfig.layout_options?.grid_columns;
        if (wanted === "full") return total;
        const fromCard = Number(wanted) || Number(element.getGridOptions?.()?.columns) || 12;
        return Math.max(1, Math.min(total, Math.round(fromCard)));
      };
      for (const cardConfig of found.cards) {
        const element = await helpers.createCardElement(cardConfig);
        if (current !== popup) return;
        element.hass = getHass();
        popup.cards.push(element);
        const columns = columnsOf(cardConfig, element);
        if (useGrid) {
          element.style.gridColumn = `span ${columns}`;
          const rows = Number(cardConfig.grid_options?.rows ?? cardConfig.layout_options?.grid_rows);
          if (rows > 0) element.style.minHeight = `${rows * 56 + (rows - 1) * 8}px`;
        } else if (pick && sectionWidth) {
          dialog.style.width = `min(${Math.max(320, Math.round(sectionWidth * columns / total)) + 24 + edge()}px,90vw)`;
        }
        body.append(element);
      }
      if (!found.cards.length) { note(t("noCards")); return; }
      // Keep the cards up to date while the popup is open
      let lastHass = getHass();
      popup.hassTimer = setInterval(() => {
        const next = getHass();
        if (!next || next === lastHass) return;
        lastHass = next;
        if (!conditionsMet(found.visibility, next) || visibleKey(next) !== initialKey) { try { dialog.close(); } catch { popup.finish(); } return; }
        popup.cards.forEach((card) => { card.hass = next; });
      }, 500);
    } catch (error) {
      if (current === popup) note(t("failed") + " " + (error?.message || dash));
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Card "ha-popup-card" with visual editor (Home Assistant default look)
  // ---------------------------------------------------------------------------------------------
  const CARD_TEXT = {
    en: { name: "Name", secondary: "Secondary text", icon: "Icon", icon_color: "Icon color", dashboard: "Popup dashboard", section: "Section", card: "Card (optional)", popup_title: "Popup title (optional)", hide_title: "Hide title", width: "Width", auto_close: "Close automatically after (seconds, 0 = off)", triggerTitle: "External trigger", trigger_entity: "Trigger entity (optional)", trigger_attribute: "Trigger attribute (optional, otherwise the state)", trigger_state: "Trigger value (empty = every change)",
      triggerHelp: "Opens the popup automatically when the entity (or its attribute) changes to this value. Leave empty to open on every change. Works while a dashboard with this card is open; not when the page loads and not in the card editor preview.",
      sectionHelp: "Heading of a section in the popup dashboard.", cardHelp: "Opens only this card of the section. Leave empty to open the whole section. Position (1 = first card), name, title, heading or entity.", popup_titleHelp: "Overrides the section heading, or names the popup when only one card is shown.", hide_titleHelp: "Hides the title of the popup (useful for a single card). A popup title entered above is still shown.", hintTitle: "Open the popup from other cards", hintText: "Any other card can open this popup with the action \"Fire DOM event\" (tap_action / hold_action). Add this to the YAML of the card:", dashboardHelp: "URL path of the dashboard that holds the popups.",
      auto: "Automatic (width of the section)", small: "Small", medium: "Medium", large: "Large", full: "Full width", defaultDashboard: "Overview (default dashboard)", hint: "Choose a section in the editor" },
    de: { name: "Name", secondary: "Zusatztext", icon: "Symbol", icon_color: "Symbolfarbe", dashboard: "Popup-Dashboard", section: "Abschnitt", card: "Karte (optional)", popup_title: "Name des Popups (optional)", hide_title: "Titel ausblenden", width: "Breite", auto_close: "Automatisch schließen nach (Sekunden, 0 = aus)", triggerTitle: "Externer Auslöser", trigger_entity: "Auslöser-Entität (optional)", trigger_attribute: "Auslöser-Attribut (optional, sonst der Zustand)", trigger_state: "Auslöser-Wert (leer = jede Änderung)",
      triggerHelp: "Öffnet das Popup automatisch, wenn die Entität (oder ihr Attribut) auf diesen Wert wechselt. Leer lassen, um bei jeder Änderung zu öffnen. Funktioniert, solange ein Dashboard mit dieser Karte geöffnet ist; nicht beim Laden der Seite und nicht in der Vorschau des Karten-Editors.",
      sectionHelp: "Überschrift eines Abschnitts im Popup-Dashboard.", cardHelp: "Öffnet nur diese Karte des Abschnitts. Leer lassen, um den ganzen Abschnitt zu öffnen. Position (1 = erste Karte), Name, Titel, Überschrift oder Entität.", popup_titleHelp: "Überschreibt den Abschnitts-Titel bzw. gibt dem Popup einen Namen, wenn nur eine Karte angezeigt wird.", hide_titleHelp: "Blendet den Titel des Popups aus (sinnvoll bei einer einzelnen Karte). Ein oben eingetragener Popup-Name wird trotzdem angezeigt.", hintTitle: "Popup aus anderen Karten öffnen", hintText: "Jede andere Karte kann dieses Popup mit der Aktion „DOM-Ereignis auslösen“ (tap_action / hold_action) öffnen. Im YAML der Karte eintragen:", dashboardHelp: "URL-Pfad des Dashboards, das die Popups enthält.",
      auto: "Automatisch (Breite des Abschnitts)", small: "Klein", medium: "Mittel", large: "Groß", full: "Volle Breite", defaultDashboard: "Übersicht (Standard-Dashboard)", hint: "Abschnitt im Editor wählen" }
  };
  const ct = (hass, key) => (CARD_TEXT[String(hass?.language ?? getHass()?.language ?? "en").slice(0, 2)] ?? CARD_TEXT.en)[key];
  const colorValue = (color) => !color ? "" : /^(#|rgb|hsl|var\()/i.test(color) ? color : `var(--${color}-color, var(--primary-color))`;
  const esc = (text) => String(text ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  class HaPopupCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._config = null;
    }
    static getConfigElement() { return document.createElement("ha-popup-card-editor"); }
    static getStubConfig() { return { name: "Popup", icon: "mdi:window-restore", dashboard: "popups", section: "", width: "auto" }; }
    setConfig(config) {
      if (!config) throw new Error("Invalid configuration");
      this._config = { ...config };
      this._trigReady = false;
      this._render();
    }
    set hass(hass) {
      this._hass = hass;
      this._trigger(hass);
    }
    // External trigger: opens the popup when the trigger entity (or one of its attributes) changes (not on page load, not in the editor preview)
    _trigger(hass) {
      const c = this._config, id = c?.trigger_entity;
      if (!id || !c.section) { this._trigReady = false; return; }
      const object = hass?.states?.[id], attr = String(c.trigger_attribute ?? "").trim();
      const raw = !object ? undefined : attr ? object.attributes?.[attr] : object.state;
      const now = raw === undefined || raw === null ? undefined : typeof raw === "object" ? JSON.stringify(raw) : String(raw);
      const prev = this._trigPrev;
      this._trigPrev = now;
      if (!this._trigReady) { this._trigReady = true; return; }
      if (now === undefined || now === prev) return;
      const want = String(c.trigger_state ?? "").trim().toLowerCase();
      if (want && now.toLowerCase() !== want) return;
      if (this._inPreview()) return;
      this._open();
    }
    _inPreview() {
      let node = this;
      for (let i = 0; i < 30 && node; i++) {
        if (["hui-card-preview", "hui-dialog-edit-card", "hui-card-element-editor"].includes(node.localName)) return true;
        node = node.parentElement || node.getRootNode?.()?.host;
      }
      return false;
    }
    getCardSize() { return 1; }
    getGridOptions() { return { columns: 6, rows: 1, min_columns: 3, min_rows: 1 }; }
    connectedCallback() { if (this._config) this._render(); }
    _open() {
      const c = this._config;
      if (!c?.section) return;
      open({ section: c.section, card: c.card, popup_title: c.popup_title, hide_title: c.hide_title, dashboard: c.dashboard, width: c.width, auto_close: c.auto_close }, this);
    }
    _render() {
      const c = this._config;
      if (!c) return;
      const color = colorValue(c.icon_color) || "var(--primary-color, #03a9f4)";
      const name = c.name ?? "";
      const secondary = c.secondary ?? (c.section ? "" : ct(this._hass, "hint"));
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; }
          ha-card { height: 100%; box-sizing: border-box; display: flex; align-items: center; gap: 12px; padding: 0 12px; min-height: 56px; cursor: pointer;
            -webkit-tap-highlight-color: transparent; transition: background-color .15s; }
          ha-card:hover { box-shadow: inset 0 0 0 999px color-mix(in srgb, var(--primary-text-color, #000) 5%, transparent), var(--ha-card-box-shadow, none); }
          ha-card:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -2px; }
          .icon { flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; color: ${color};
            background: color-mix(in srgb, ${color} 20%, transparent); }
          .info { min-width: 0; display: flex; flex-direction: column; justify-content: center; }
          .name { font-size: var(--ha-font-size-m, 14px); font-weight: var(--ha-font-weight-medium, 500); line-height: 20px; color: var(--primary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .secondary { font-size: var(--ha-font-size-s, 12px); line-height: 16px; color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        </style>
        <ha-card role="button" tabindex="0" aria-label="${esc(name)}">
          ${c.icon !== "" ? `<div class="icon"><ha-icon icon="${esc(c.icon || "mdi:window-restore")}"></ha-icon></div>` : ""}
          <div class="info">${name ? `<div class="name">${esc(name)}</div>` : ""}${secondary ? `<div class="secondary">${esc(secondary)}</div>` : ""}</div>
        </ha-card>`;
      const card = this.shadowRoot.querySelector("ha-card");
      card.addEventListener("click", () => this._open());
      card.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); this._open(); } });
    }
  }

  class HaPopupCardEditor extends HTMLElement {
    constructor() {
      super();
      this._config = {};
      this._dashboards = null;
      this._sections = [];
      this._sectionsFor = null;
      this._cardsBySection = {};
    }
    setConfig(config) {
      this._config = { ...config };
      this._ensureForm();
      this._refresh();
      this._loadSections();
    }
    set hass(hass) {
      const first = !this._hass;
      this._hass = hass;
      this._ensureForm();
      if (this._form) this._form.hass = hass;
      if (first) { this._loadDashboards(); this._loadSections(); }
    }
    _ensureForm() {
      if (this._form) return;
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (item) => ct(this._hass, item.name) || item.name;
      this._form.computeHelper = (item) => item.name === "section" ? ct(this._hass, "sectionHelp") : item.name === "card" ? ct(this._hass, "cardHelp") : item.name === "popup_title" ? ct(this._hass, "popup_titleHelp") : item.name === "hide_title" ? ct(this._hass, "hide_titleHelp") : item.name === "dashboard" ? ct(this._hass, "dashboardHelp") : item.name === "trigger_state" ? ct(this._hass, "triggerHelp") : "";
      this._form.addEventListener("value-changed", (event) => this._changed(event));
      this._hint = document.createElement("div");
      this._hint.style.cssText = "margin-top:16px;font-size:14px;color:var(--secondary-text-color);";
      this.append(this._form, this._hint);
      if (this._hass) this._form.hass = this._hass;
    }
    async _loadDashboards() {
      try {
        const list = await this._hass.callWS({ type: "lovelace/dashboards/list" });
        this._dashboards = [{ value: "lovelace", label: ct(this._hass, "defaultDashboard") }, ...list.map((d) => ({ value: d.url_path, label: `${d.title} (${d.url_path})` }))];
      } catch { this._dashboards = []; }
      this._refresh();
    }
    async _loadSections() {
      const dash = String(this._config.dashboard || "popups");
      if (!this._hass || this._sectionsFor === dash) return;
      this._sectionsFor = dash;
      let sections = [];
      try {
        const config = await this._hass.callWS({ type: "lovelace/config", url_path: ["", "lovelace", "default"].includes(dash) ? null : dash });
        for (const view of config.views ?? []) for (const section of view.sections ?? []) {
          const heading = (section.cards ?? []).find((card) => card?.type === "heading");
          const text = heading?.heading ?? heading?.title;
          if (!text) continue;
          sections.push(String(text));
          const cards = (section.cards ?? []).filter((card) => card !== heading);
          const labelOf = (card) => [card.name, card.title, card.heading, card.entity, card.entity_id].find((v) => v && String(v).trim());
          const seen = {};
          cards.forEach((card) => { const l = labelOf(card); if (l) seen[l] = (seen[l] || 0) + 1; });
          this._cardsBySection[String(text).trim().toLowerCase()] = cards.map((card, i) => {
            const l = labelOf(card);
            return { value: l && seen[l] === 1 ? String(l) : String(i + 1), label: `${i + 1}. ${l ? String(l) : card.type || "card"}` };
          });
        }
      } catch { sections = []; this._cardsBySection = {}; }
      if (this._sectionsFor !== dash) return;
      this._sections = [...new Set(sections)];
      this._refresh();
    }
    _schema() {
      const h = this._hass;
      const select = (name, options) => options?.length
        ? { name, selector: { select: { options, custom_value: true, mode: "dropdown" } } }
        : { name, selector: { text: {} } };
      return [
        { name: "name", selector: { text: {} } },
        { name: "secondary", selector: { text: {} } },
        { type: "grid", name: "", schema: [{ name: "icon", selector: { icon: {} } }, { name: "icon_color", selector: { ui_color: {} } }] },
        select("dashboard", this._dashboards),
        select("section", this._sections.map((s) => ({ value: s, label: s }))),
        select("card", this._cardsBySection[String(this._config.section || "").trim().toLowerCase()]),
        { name: "popup_title", selector: { text: {} } },
        { name: "hide_title", selector: { boolean: {} } },
        { name: "width", selector: { select: { mode: "dropdown", options: ["auto", "small", "medium", "large", "full"].map((value) => ({ value, label: ct(h, value) })) } } },
        { name: "auto_close", selector: { number: { min: 0, max: 600, step: 1, mode: "box", unit_of_measurement: "s" } } },
        { type: "expandable", name: "", title: ct(h, "triggerTitle"), flatten: true, expanded: !!this._config.trigger_entity, schema: [
          { name: "trigger_entity", selector: { entity: {} } },
          { name: "trigger_attribute", selector: { attribute: {} }, context: { filter_entity: "trigger_entity" } },
          { name: "trigger_state", selector: { text: {} } }
        ] }
      ];
    }
    _refresh() {
      if (!this._form) return;
      this._form.data = { dashboard: "popups", width: "auto", auto_close: 0, ...this._config };
      this._form.schema = this._schema();
      this._renderHint();
    }
    _renderHint() {
      if (!this._hint) return;
      const h = this._hass;
      const lines = ["tap_action:", "  action: fire-dom-event", "  ha_popup:", `    section: ${this._config.section || "Cameras"}`];
      if (this._config.card) lines.push(`    card: ${this._config.card}`);
      if (this._config.popup_title) lines.push(`    popup_title: ${this._config.popup_title}`);
      if (this._config.hide_title) lines.push("    hide_title: true");
      if (this._config.dashboard) lines.push(`    dashboard: ${this._config.dashboard}`);
      if (this._config.width) lines.push(`    width: ${this._config.width}`);
      if (this._config.auto_close) lines.push(`    auto_close: ${this._config.auto_close}`);
      this._hint.replaceChildren();
      const title = document.createElement("div"); title.style.cssText = "font-weight:500;color:var(--primary-text-color);margin-bottom:4px;"; title.textContent = ct(h, "hintTitle");
      const text = document.createElement("div"); text.textContent = ct(h, "hintText");
      const code = document.createElement("pre"); code.style.cssText = "margin:8px 0 0;padding:8px 12px;border-radius:8px;background:var(--secondary-background-color,rgba(127,127,127,.15));color:var(--primary-text-color);overflow:auto;font-size:13px;"; code.textContent = lines.join("\n");
      this._hint.append(title, text, code);
    }
    _changed(event) {
      event.stopPropagation();
      const value = event.detail?.value ?? {};
      const config = { ...this._config, ...value };
      for (const key of Object.keys(config)) if (config[key] === "" || config[key] === undefined || config[key] === null) delete config[key];
      if (config.width === "auto") delete config.width;
      if (!config.auto_close) delete config.auto_close;
      if (!config.hide_title) delete config.hide_title;
      if (config.dashboard === "popups") delete config.dashboard;
      if ((this._config.section || "") !== (config.section || "")) delete config.card;
      if ((this._config.trigger_entity || "") !== (config.trigger_entity || "")) delete config.trigger_attribute;
      if (!config.trigger_entity) { delete config.trigger_attribute; delete config.trigger_state; }
      const dashboardChanged = (this._config.dashboard || "popups") !== (config.dashboard || "popups");
      this._config = config;
      if (dashboardChanged) this._loadSections();
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
    }
  }

  if (!customElements.get("ha-popup-card")) customElements.define("ha-popup-card", HaPopupCard);
  if (!customElements.get("ha-popup-card-editor")) customElements.define("ha-popup-card-editor", HaPopupCardEditor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === "ha-popup-card")) {
    window.customCards.push({ type: "ha-popup-card", name: "Popup Card", description: "Button that opens a section of a popup dashboard as a popup.", preview: true });
  }

  // fire-dom-event: Home Assistant fires `ll-custom` with the whole action config as detail
  window.addEventListener("ll-custom", (event) => {
    const cfg = event.detail?.ha_popup;
    if (!cfg) return;
    open(typeof cfg === "string" ? { section: cfg } : cfg, event.composedPath?.()[0]);
  });

  window.__haPopupOpener = { version: VERSION, open, close: closeCurrent };
  console.info(`%c HA Popup Card %c v${VERSION} `, "background:#03a9f4;color:#fff;border-radius:4px 0 0 4px;padding:2px 4px", "background:#555;color:#fff;border-radius:0 4px 4px 0;padding:2px 4px");
})();
