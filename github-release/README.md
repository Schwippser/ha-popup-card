# HA Popup Card

![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Marketplace-blue) ![version](https://img.shields.io/github/v/release/Schwippser/ha-popup-card?include_prereleases&label=version&color=blue) ![status](https://img.shields.io/badge/status-beta-yellow)

<a href="https://www.buymeacoffee.com/tomreim0s" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" ></a>

Opens a section of a dashboard as a popup. It comes with the **Popup Card** (`custom:ha-popup-card`, with a visual editor) and can also be triggered from **any other card** that supports the `fire-dom-event` action (Tile, Button, Bubble Card, button-card, ...). The popup uses the Home Assistant default look.

*[Deutsche Version](README.de.md)*


## Installation

1. Add the file as a dashboard resource (type: JavaScript module).
   - Marketplace: install *HA Popup Card*, the resource is added automatically.
   - Manual: copy `dist/ha-popup-card.js` to `/config/www/` and add `/local/ha-popup-card.js` as resource.
2. Reload the browser (Ctrl+F5).
3. Create the popup dashboard (next chapter).

## 1. Build the popup dashboard

All popups live in **one separate dashboard**. Every popup is **one section** of that dashboard.

1. **Settings → Dashboards → Add dashboard → New dashboard from scratch.** Title e.g. `Popups`. The URL path **`popups`** is the default of the card; use another path if you like and select it in the card editor.
2. Open the new dashboard, switch to edit mode and make sure the view is a **Sections** view (the default for new dashboards).
3. Add a **section** for every popup. Use the section menu to widen it if the popup needs more room (see *Width*).
4. In every section the **first card is a *Heading* card**. Its text is the **name of the popup**. It is shown as the title of the popup and it is what you select later in the card editor. Keep the names unique.
5. Add the content of the popup below the heading: any cards (Tile, Graph, Camera, Media control, custom cards, ...). Everything except the heading card is shown in the popup.

Example (YAML view of the popup dashboard):

```yaml
views:
  - type: sections
    title: Popups
    sections:
      - type: grid
        cards:
          - type: heading
            heading: Cameras          # <- name of the popup
          - type: picture-entity
            entity: camera.front_door
          - type: tile
            entity: light.porch
      - type: grid
        column_span: 2                # <- wider section = wider popup (width: auto)
        cards:
          - type: heading
            heading: Energy
          - type: statistics-graph
            entities: [sensor.power]
```

Rules:
- Heading text, view path and view title are compared without regard to upper/lower case.
- **Width `auto`**: the popup is as wide as the section (`column_span` columns). In wide popups the cards are laid out in the same 12-column grid as in a sections view, including `grid_options` (`columns`, `rows`).
- **Only one card of a section:** set `card`, e.g. `card: camera.front_door` (in the editor: field *Card (optional)*). The value can be the position (`2` = second card), or the name, title, heading or entity of the card.
- **A whole view as popup:** if no section matches, a view whose *path* or *title* matches the name is used and all its cards are shown.

## 2. Add the Popup Card and choose the popup in the editor

1. Open a dashboard in edit mode → **Add card** → **Popup Card**.
2. In the visual editor:

| Field | What to do |
|---|---|
| **Name** / **Secondary text** | Text on the button. |
| **Icon** / **Icon color** | Symbol and its color. |
| **Popup dashboard** | A drop-down with **Overview (default dashboard)** and all your dashboards as `Title (url_path)`. Default is `popups`. |
| **Section** | After the dashboard is chosen, the drop-down lists the **heading text of every section** of that dashboard (all views). Pick one. You can also type your own text, for example `Cameras#2` for one card. |
| **Card (optional)** | Drop-down with the cards of the chosen section (position and name). Opens only this card instead of the whole section. Leave empty for the whole section. |
| **Popup title (optional)** | Own title of the popup. It replaces the section heading, or names the popup when only one card is shown. |
| **Hide title** | Hides the title (useful for a single card). A popup title entered above is still shown. |
| **Width** | *Automatic* (width of the section), *Small* (360 px), *Medium* (560 px), *Large* (860 px) or *Full width* (90 % of the window). |
| **Close automatically** | Seconds until the popup closes by itself, `0` = off. |

If a drop-down stays empty (for example because the dashboard cannot be read with your user rights), the field turns into a normal text field: type the dashboard path and the section name by hand.

3. Save. Tap the card: the popup opens. Tap outside of it, press the close button or **Esc** to close it.

YAML of the card:

```yaml
type: custom:ha-popup-card
name: Cameras
icon: mdi:cctv
section: Cameras        # heading of the section
dashboard: popups       # optional, default: popups
width: medium           # optional: auto | small | medium | large | full
auto_close: 0           # optional, seconds
```

## Trigger from other cards (hidden extra)

Any card that supports the `fire-dom-event` action can open a popup, no Popup Card needed:

```yaml
type: button
name: Cameras
tap_action:
  action: fire-dom-event
  ha_popup:
    section: Cameras
    card: camera.front_door   # optional
    popup_title: Front door   # optional
    hide_title: false         # optional
    dashboard: popups
    width: medium
```

Short form: `ha_popup: Cameras`. From JavaScript: `window.__haPopupOpener.open({ section: "Cameras" })` and `window.__haPopupOpener.close()`.

## Notes

- Opening another popup closes the current one.
- The popup is a modal `<dialog>`. Windows that other cards add directly to `<body>` (for example the event details of the LLM Vision card) can end up behind it.
- Cards in the popup are updated live while it is open.

## License

[MIT](LICENSE)
