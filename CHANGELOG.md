# Changelog

## 0.3.0 (beta)

- New: external trigger. The card opens its popup when another entity (or one of its attributes) changes: `trigger_entity`, `trigger_attribute` (optional), `trigger_state` (optional, empty = every change). Editor section **External trigger**.
- Does not react on page load and not in the editor preview.

## 0.2.0 (beta)

- First public version.
- `custom:ha-popup-card` with a visual editor: popup dashboard, section, optional single card, popup title, hide title, width, auto close.
- Trigger from any other card with the `fire-dom-event` action (`ha_popup`).
- Popup in the Home Assistant default look, cards update live.
