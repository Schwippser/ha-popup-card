# Changelog

## 0.3.6 (beta)

- Fix: the visibility of a **section** in the popup dashboard (for example "show only to certain users") is now respected. Before, the popup showed all cards of the section even for users the section was hidden from; only the visibility of single cards worked. Supported conditions: user, state, numeric state, screen, and, or, not. If the section is not visible for the current user, the popup shows a short note instead of the cards, and an open popup closes when the conditions stop being met.

## 0.3.5 (beta)

- Fix: the popup is now placed inside `<home-assistant>` instead of `<body>`. Cards that need the Home Assistant connection through the frontend context (for example camera streams, as in the Reolink App Card) showed a black picture (`Cannot read properties of undefined (reading 'callWS')`) in the popup.

## 0.3.4 (beta)

- Fix: if the same popup is already open and the action fires again (for example from a card inside the popup), the popup is no longer rebuilt, so its cards keep their state.

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
