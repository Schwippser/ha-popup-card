# HA Popup Card

![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Marketplace-blue) ![version](https://img.shields.io/github/v/release/Schwippser/ha-popup-card?include_prereleases&label=version&color=blue) ![status](https://img.shields.io/badge/status-beta-yellow)

<a href="https://www.buymeacoffee.com/tomreim0s" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" ></a>

Öffnet einen Abschnitt eines Dashboards als Popup. Es gibt die **Popup-Karte** (`custom:ha-popup-card`, mit visuellem Editor); das Popup lässt sich außerdem aus **jeder anderen Karte** auslösen, die die Aktion `fire-dom-event` unterstützt (Kachel, Button, Bubble Card, button-card, ...). Das Popup nutzt das Standardaussehen von Home Assistant.

*[English version](README.md)*


## Installation

1. Die Datei als Dashboard-Ressource hinzufügen (Typ: JavaScript-Modul).
   - Marketplace: *HA Popup Card* installieren, die Ressource wird automatisch angelegt.
   - Manuell: `dist/ha-popup-card.js` nach `/config/www/` kopieren und `/local/ha-popup-card.js` als Ressource eintragen.
2. Browser neu laden (Strg+F5).
3. Das Popup-Dashboard anlegen (nächstes Kapitel).

## 1. Das Popup-Dashboard aufbauen

Alle Popups liegen in **einem eigenen Dashboard**. Jedes Popup ist **ein Abschnitt** dieses Dashboards.

1. **Einstellungen → Dashboards → Dashboard hinzufügen → Neues Dashboard von Grund auf.** Titel z. B. `Popups`. Der URL-Pfad **`popups`** ist der Standard der Karte; einen anderen Pfad wählst du später im Karteneditor aus.
2. Das neue Dashboard öffnen, in den Bearbeitungsmodus wechseln und sicherstellen, dass die Ansicht eine **Bereiche-Ansicht** (Sections) ist, was bei neuen Dashboards der Standard ist.
3. Für jedes Popup einen **Abschnitt** anlegen. Im Abschnittsmenü lässt er sich verbreitern, wenn das Popup mehr Platz braucht (siehe *Breite*).
4. In jedem Abschnitt ist die **erste Karte eine Überschrift-Karte (*Heading*)**. Ihr Text ist der **Name des Popups**: Er erscheint als Titel des Popups und wird später im Karteneditor ausgewählt. Die Namen sollten eindeutig sein.
5. Darunter den Inhalt des Popups einfügen: beliebige Karten (Kachel, Verlauf, Kamera, Mediensteuerung, eigene Karten, ...). Alles außer der Überschrift-Karte erscheint im Popup.

Beispiel (YAML-Ansicht des Popup-Dashboards):

```yaml
views:
  - type: sections
    title: Popups
    sections:
      - type: grid
        cards:
          - type: heading
            heading: Kameras          # <- Name des Popups
          - type: picture-entity
            entity: camera.haustuer
          - type: tile
            entity: light.eingang
      - type: grid
        column_span: 2                # <- breiterer Abschnitt = breiteres Popup (Breite: automatisch)
        cards:
          - type: heading
            heading: Energie
          - type: statistics-graph
            entities: [sensor.leistung]
```

Regeln:
- Überschrift, Ansichtspfad und Ansichtstitel werden ohne Beachtung von Groß-/Kleinschreibung verglichen.
- **Breite `auto`**: Das Popup ist so breit wie der Abschnitt (`column_span` Spalten). In breiten Popups werden die Karten im gleichen 12-Spalten-Raster wie in einer Bereiche-Ansicht angeordnet, einschließlich `grid_options` (`columns`, `rows`).
- **Nur eine Karte eines Abschnitts:** `card` setzen, z. B. `card: camera.haustuer` (im Editor: Feld *Karte (optional)*). Der Wert kann die Position sein (`2` = zweite Karte) oder Name, Titel, Überschrift oder Entität der Karte.
- **Eine ganze Ansicht als Popup:** Passt kein Abschnitt, wird eine Ansicht verwendet, deren *Pfad* oder *Titel* dem Namen entspricht, und alle ihre Karten erscheinen.

## 2. Popup-Karte hinzufügen und das Popup im Editor auswählen

1. Ein Dashboard im Bearbeitungsmodus öffnen → **Karte hinzufügen** → **Popup Card**.
2. Im visuellen Editor:

| Feld | Was zu tun ist |
|---|---|
| **Name** / **Zusatztext** | Text auf der Schaltfläche. |
| **Symbol** / **Symbolfarbe** | Symbol und seine Farbe. |
| **Popup-Dashboard** | Auswahlliste mit **Übersicht (Standard-Dashboard)** und allen deinen Dashboards als `Titel (url_path)`. Standard ist `popups`. |
| **Abschnitt** | Nach der Dashboard-Auswahl listet die Auswahl den **Überschriften-Text jedes Abschnitts** dieses Dashboards (alle Ansichten). Einen auswählen. Du kannst auch eigenen Text eintippen, z. B. `Kameras#2` für eine einzelne Karte. |
| **Karte (optional)** | Auswahlliste mit den Karten des gewählten Abschnitts (Position und Name). Öffnet nur diese Karte statt des ganzen Abschnitts. Leer lassen für den ganzen Abschnitt. |
| **Name des Popups (optional)** | Eigener Titel des Popups. Er ersetzt den Abschnitts-Titel bzw. benennt das Popup, wenn nur eine Karte angezeigt wird. |
| **Titel ausblenden** | Blendet den Titel aus (sinnvoll bei einer einzelnen Karte). Ein oben eingetragener Popup-Name wird trotzdem angezeigt. |
| **Breite** | *Automatisch* (Breite des Abschnitts), *Klein* (360 px), *Mittel* (560 px), *Groß* (860 px) oder *Volle Breite* (90 % des Fensters). |
| **Automatisch schließen** | Sekunden, bis das Popup von selbst schließt, `0` = aus. |

Bleibt eine Auswahlliste leer (z. B. weil das Dashboard mit deinen Benutzerrechten nicht gelesen werden kann), wird das Feld zum normalen Textfeld: Dashboard-Pfad und Abschnittsname dann von Hand eintragen.

3. Speichern. Auf die Karte tippen: Das Popup öffnet sich. Zum Schließen außerhalb tippen, den Schließen-Knopf nutzen oder **Esc** drücken.

YAML der Karte:

```yaml
type: custom:ha-popup-card
name: Kameras
icon: mdi:cctv
section: Kameras        # Überschrift des Abschnitts
dashboard: popups       # optional, Standard: popups
width: medium           # optional: auto | small | medium | large | full
auto_close: 0           # optional, Sekunden
```

## Auslösen aus anderen Karten (versteckter Zusatz)

Jede Karte mit der Aktion `fire-dom-event` kann ein Popup öffnen, die Popup-Karte ist dafür nicht nötig:

```yaml
type: button
name: Kameras
tap_action:
  action: fire-dom-event
  ha_popup:
    section: Kameras
    card: camera.haustuer   # optional
    popup_title: Haustür   # optional
    hide_title: false      # optional
    dashboard: popups
    width: medium
```

Kurzform: `ha_popup: Kameras`. Aus JavaScript: `window.__haPopupOpener.open({ section: "Kameras" })` und `window.__haPopupOpener.close()`.

## Hinweise

- Ein weiteres Popup zu öffnen schließt das aktuelle.
- Das Popup ist ein modaler `<dialog>`. Fenster, die andere Karten direkt an `<body>` hängen (z. B. die Ereignisdetails der LLM-Vision-Karte), können dahinter landen.
- Karten im Popup werden live aktualisiert, solange es offen ist.

## Lizenz

[MIT](LICENSE)
