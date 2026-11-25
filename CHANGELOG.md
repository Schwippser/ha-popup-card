# Changelog

## 0.3.3 (beta)

- Fix: the button no longer loses the theme background (gradient, glass) when the mouse is over it. The hover effect is now a light overlay instead of a flat color.

## 0.3.2 (beta)

- The popup takes over the theme of the element that opens it: theme variables set on the dashboard view or the card (view theme, card theme) and the look of a card there (background or gradient, border, corner radius, shadow, blur). Before, the popup only saw the global theme.

## 0.3.1 (beta)

- The popup window now follows the selected Home Assistant theme: card background (`--ha-card-background`), border, corner radius, shadow, blur (`--ha-card-backdrop-filter`), font and backdrop color.

## 0.3.0 (beta)

- New: external trigger. The card opens its popup when another entity (or one of its attributes) changes: `trigger_entity`, `trigger_attribute` (optional), `trigger_state` (optional, empty = every change). Editor section **External trigger**.
- Does not react on page load and not in the editor preview.

## 0.2.0 (beta)

- First public version.
- `custom:ha-popup-card` with a visual editor: popup dashboard, section, optional single card, popup title, hide title, width, auto close.
- Trigger from any other card with the `fire-dom-event` action (`ha_popup`).
- Popup in the Home Assistant default look, cards update live.
