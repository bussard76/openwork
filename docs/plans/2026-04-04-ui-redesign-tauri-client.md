# openwork — UI-Redesign Tauri Client

## Status

Work in progress — wird schrittweise erarbeitet.

---

## Ausgangslage

Der openwork-Client basiert auf dem OpenCode-Upstream (`packages/app`, `packages/ui`). Die aktuelle Oberfläche ist funktional aber nicht als openwork-Produkt erkennbar. Ziel ist ein visuelles Redesign das:

- openwork als eigenständige Marke sichtbar macht
- für den täglichen Einsatz in Enterprise-Kontexten optimiert ist
- ein Theme-System mitbringt mit eingebauten Styles und der Möglichkeit für Custom-Themes

Designbasis: **UI.pen** im Repo-Root — zeigt drei eingebaute Themes (noch nicht final, werden weiter angepasst):

- `Claude Style – Light` (`kOZ13`) — warmes Off-White, **Standard-Theme**
- `Claude Style – Dark` (`dMzIc`) — warmes Dunkelbraun
- `Blue Light Frame` (`sscLN`) — kühles Blau-Weiß

---

## Theme-System

### Konzept

Jeder openwork-Style ist ein **Theme** — ein benannter Satz von Design-Tokens (CSS Custom Properties). Der Client kennt drei eingebaute Themes. Nutzer können zusätzlich eigene Themes definieren.

Das aktive Theme wird manuell in den Einstellungen gewählt. Standard beim ersten Start: **Light**.

### Theme-Wechsel

Einstiegspunkt: Settings → Appearance → Theme. Dropdown oder Kachel-Auswahl zeigt alle verfügbaren Themes (Built-in + Custom). Wechsel wird sofort angewendet, ohne Neustart.

Das gewählte Theme wird in `opencode.json` unter `openwork.theme` persistiert:

```jsonc
"openwork": {
  "theme": "light" // "light" | "dark" | "blue" | oder Name eines Custom-Themes
}
```

### Eingebaute Themes

| ID      | Name           | Charakter                  |
| ------- | -------------- | -------------------------- |
| `light` | openwork Light | Warmes Off-White, Standard |
| `dark`  | openwork Dark  | Warmes Dunkelbraun         |
| `blue`  | openwork Blue  | Kühles Blau-Weiß           |

### Custom Themes

Nutzer können eigene Themes als JSON-Datei definieren und in den Einstellungen laden. Format: Token-Map analog zu den eingebauten Themes (vollständig oder als Override-Set über einem Built-in-Basis-Theme).

Speicherort: `~/.config/opencode/themes/<name>.json`

```jsonc
// ~/.config/opencode/themes/my-theme.json
{
  "name": "my-theme",
  "display_name": "Mein Theme",
  "base": "light", // Optional: erbt alle Tokens von einem Built-in
  "tokens": {
    "accent": "#0F7B6C",
    "bg-surface": "#F0FDF4",
    // Nur überschriebene Tokens müssen angegeben werden
  },
}
```

Der Client lädt beim Start alle `.json`-Dateien aus `~/.config/opencode/themes/` und macht sie im Theme-Picker verfügbar.

---

## Layout-Struktur

Alle drei Varianten teilen dieselbe dreispaltige Grundstruktur (1312 × 920 px):

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (240 px)  │  Chat-Spalte (640 px)  │  Preview  │
│                    │                        │  (flex)   │
│  Logo              │  Topbar (Titel)         │  Tab-Bar  │
│  Neuer-Chat-Button │  Message-Area          │  Content  │
│  WORKSPACES        │  Input-Bar             │           │
│  FILES             │                        │           │
│  Sidebar-Bottom    │                        │           │
└─────────────────────────────────────────────────────────┘
```

---

## Design-Tokens

Alle Themes verwenden denselben Token-Satz. Die Tokens werden als CSS Custom Properties auf `:root` gesetzt. Komponenten referenzieren ausschließlich Tokens — nie direkte Hex-Werte.

### Token-Satz

| Token                   | Beschreibung                                       |
| ----------------------- | -------------------------------------------------- |
| `bg-base`               | Haupt-Hintergrundfarbe der App                     |
| `bg-sidebar`            | Sidebar-Hintergrund (kann von `bg-base` abweichen) |
| `bg-chat`               | Chat-Spalte und Preview-Hintergrund                |
| `bg-elevated`           | Leicht erhöhte Fläche (z. B. Chat-Spalte in Dark)  |
| `bg-surface`            | Interaktive Flächen: Buttons, aktive Rows, Input   |
| `bg-input`              | Explizit für Input-Felder                          |
| `bg-code`               | Code-Block-Hintergrund                             |
| `border`                | Primäre Trennlinien                                |
| `border-subtle`         | Schwächere Borders: Inputs, Pills, Hover           |
| `text-primary`          | Wichtigster Text: Überschriften, aktive Items      |
| `text-body`             | Standardtext: Titel, wichtige Labels               |
| `text-secondary`        | KI-Antworttext, Sekundärtexte                      |
| `text-muted`            | Inaktive Items, Metadaten                          |
| `text-faint`            | Section-Labels (WORKSPACES, FILES), Icons          |
| `text-dimmed`           | Sehr schwache Elemente: Version, Hilfs-Icons       |
| `accent`                | Primärfarbe: aktive Tabs, Icons, CTA-Buttons       |
| `accent-gradient-start` | Logo-Gradient Startfarbe                           |
| `accent-gradient-end`   | Logo-Gradient Endfarbe                             |
| `error`                 | Fehler- und Warnmarkierungen                       |

### Built-in Token-Werte

#### openwork Light (Standard)

| Token                   | Wert      |
| ----------------------- | --------- |
| `bg-base`               | `#F7F4F0` |
| `bg-sidebar`            | `#FAF6F0` |
| `bg-chat`               | `#FFFBF7` |
| `bg-elevated`           | `#FFFBF7` |
| `bg-surface`            | `#FFF0E4` |
| `bg-input`              | `#FFFFFF` |
| `bg-code`               | `#FFF8F0` |
| `border`                | `#E8D0B8` |
| `border-subtle`         | `#E8C890` |
| `text-primary`          | `#1A120A` |
| `text-body`             | `#3A200E` |
| `text-secondary`        | `#5A3A20` |
| `text-muted`            | `#8A6A50` |
| `text-faint`            | `#B8906A` |
| `text-dimmed`           | `#C0A080` |
| `accent`                | `#CF6A37` |
| `accent-gradient-start` | `#CF6A37` |
| `accent-gradient-end`   | `#E8963F` |
| `error`                 | `#DC4A3A` |

#### openwork Dark

| Token                   | Wert      |
| ----------------------- | --------- |
| `bg-base`               | `#1A1410` |
| `bg-sidebar`            | `#1A1410` |
| `bg-chat`               | `#1A1410` |
| `bg-elevated`           | `#211810` |
| `bg-surface`            | `#2C221B` |
| `bg-input`              | `#2C221B` |
| `bg-code`               | `#130E0A` |
| `border`                | `#2C221B` |
| `border-subtle`         | `#4A3828` |
| `text-primary`          | `#F0EBE3` |
| `text-body`             | `#F0EBE3` |
| `text-secondary`        | `#C8BDB0` |
| `text-muted`            | `#8A7868` |
| `text-faint`            | `#7A6858` |
| `text-dimmed`           | `#4A3828` |
| `accent`                | `#CF6A37` |
| `accent-gradient-start` | `#CF6A37` |
| `accent-gradient-end`   | `#E8963F` |
| `error`                 | `#E8635A` |

#### openwork Blue

| Token                   | Wert      |
| ----------------------- | --------- |
| `bg-base`               | `#FAFCFF` |
| `bg-sidebar`            | `#F4F8FD` |
| `bg-chat`               | `#FAFCFF` |
| `bg-elevated`           | `#FAFCFF` |
| `bg-surface`            | `#E0EFFA` |
| `bg-input`              | `#FFFFFF` |
| `bg-code`               | `#F2F8FF` |
| `border`                | `#C0D8EE` |
| `border-subtle`         | `#A0C8E8` |
| `text-primary`          | `#0A2A4A` |
| `text-body`             | `#1A3A5A` |
| `text-secondary`        | `#2A4A6A` |
| `text-muted`            | `#3A5A7A` |
| `text-faint`            | `#6A9DC8` |
| `text-dimmed`           | `#5A8FC0` |
| `accent`                | `#1A6FBF` |
| `accent-gradient-start` | `#1A6FBF` |
| `accent-gradient-end`   | `#3AABCF` |
| `error`                 | `#C03030` |

---

## Modi

### Konzept

Der Client hat zwei Modi: **Chat** und **Work**. Der Umschalter sitzt prominent oben in der Titelleiste — zentriert, analog zum Stil des Claude-Desktopclients.

```
┌──────────────────────────────────────────────────────────┐
│  openwork          [ Chat │ Work ]              ···  ✕   │
├──────────────────────────────────────────────────────────┤
│  ...                                                     │
```

Der aktive Modus wird als Segment hervorgehoben (Hintergrund-Fill + Border). Wechsel ist jederzeit möglich, der laufende Chat bleibt erhalten.

### Chat-Modus

> Pencil-Frames: **`18Fgg`** (History eingeklappt) · **`GHAP5`** (History aufgeklappt)

Reduzierte Ansicht — schnelle, kontextfreie Fragen ohne Workspace-Overhead.

```
┌────────────────────────────────────────────────────────────┐
│  openwork       [ Chat │ Work ]   🔍 Suchen...      ···  ⬆ │
├───┬────────────────────────────────────────────────────────┤
│ ≡ │                                                        │
│   │                  Chat-Spalte (voll)                    │
│   │                                                        │
└───┴────────────────────────────────────────────────────────┘
```

- Kein Workspace-Sidebar (Workspaces, Files ausgeblendet)
- Kein Preview-Panel
- **History-Panel** (40 px, links, eingeklappt): schmale Leiste mit Burger-Icon (☰). Enthält die Chat-Historie des globalen Home-Workspaces — analog zum "Home-Laufwerk" im Betriebssystem. Per Klick aufklappbar.
- Chat-Spalte nimmt die verbleibende Breite ein
- Der Home-Workspace ist immer verfügbar, unabhängig vom aktiven Work-Workspace

#### History-Panel (eingeklappt)

> Pencil-Frame: **`18Fgg`** — `historyPanel` (node `7jZXK`)

- Breite: **40 px**, feste Breite
- Hintergrund: `bg-sidebar` (`#FAF6F0`)
- Rechte Kante: 1 px Border (`border`)
- Inhalt: Burger-Icon (☰) oben, darunter kleine Icons der letzten Chats

#### History-Panel (aufgeklappt)

> Pencil-Frame: **`GHAP5`** — `historyPanel` (node `jDo4a`)

```
┌──────────────────────────┐
│  VERLAUF              ✕  │  ← Header + Close-Icon
│  + Neuer Chat            │  ← direkt unter Header
├──────────────────────────┤
│  ● AGENTS.md analysieren │  ← aktive Session (hervorgehoben)
│  ○ Wie funktioniert Bun? │
│  ○ Drizzle Schema erkl.  │
│  ○ TypeScript Fehler fix │
│  ○ React Performance     │
│                          │
│  (scrollbar bei mehr)    │
├──────────────────────────┤
│  ⚙  ℹ  OpenCode v0.6.0  │  ← Bottom-Bar
└──────────────────────────┘
```

- Breite: **240 px** (gleich wie Work-Sidebar)
- Header: "VERLAUF" Label (CAPS, 10 px) + Close-Icon rechts
- **"Neuer Chat" Button** direkt unter dem Header, vor der Chat-Liste
- Scrollbare Liste vergangener Chat-Sessions des Home-Workspaces
- Aktive Session hervorgehoben (`bg-surface` + Stroke)
- Bottom-Bar: settings-Icon + info-Icon + Versionstext (identisch zur Work-Sidebar)
- Eingeklappt-Zustand wird **nicht** persistiert — beim nächsten Start immer eingeklappt

### Work-Modus

> Pencil-Frames: **`9D23X`** (Workspace-Liste eingeklappt) · **`E1fKI`** (Workspace-Liste aufgeklappt)

Vollständige Ansicht — die dreipaltige Struktur aus den UI.pen-Mockups:

```
┌──────────────────────────────────────────────────────────┐
│                    [ Chat │ Work ]                       │
├──────────────┬───────────────────────┬───────────────────┤
│  Sidebar     │  Chat-Spalte          │  Preview          │
│  (240 px)    │  (640 px)             │  (flex)           │
│  Workspaces  │                       │                   │
│  Files       │                       │                   │
└──────────────┴───────────────────────┴───────────────────┘
```

- Sidebar mit Workspaces und File-Tree sichtbar
- Preview-Panel sichtbar (sofern eine Datei geöffnet ist)
- Für konzentriertes Arbeiten mit Kontext

### Persistenz

Der zuletzt genutzte Modus wird gespeichert und beim nächsten Start wiederhergestellt. Standard beim ersten Start: **Work**.

---

## Komponenten im Detail

### Sidebar

Nur im **Work-Modus** sichtbar. Breite: 240 px, fest.

**Aufbau (von oben nach unten):**

1. **Logo-Block** — Logomark + "openwork" Text + "Neuer Chat" Button.
2. **Workspace-Sektion** — kollabierbare Liste (siehe unten).
3. **File Browser** — nimmt den verbleibenden Platz ein (siehe unten).
4. **Sidebar-Bottom** — settings-Icon + info-Icon + Versionstext, oben Trennlinie.

---

#### Workspace-Sektion (kollabierbar)

Die Workspace-Liste ist standardmäßig **eingeklappt** — es wird nur der aktive Workspace angezeigt. Per Klick klappt die vollständige Liste nach unten auf und schiebt den File Browser nach unten.

> Pencil-Frames: **`9D23X`** (eingeklappt) · **`E1fKI`** (aufgeklappt)
> Nodes: `wsLabel` (`kt9Ze`) — Section-Header mit chevron; `wsList` — collapsed: `gfksI` (1 Row), expanded: `YuvQY` (height:184, clip:true, 5 Rows)

**Eingeklappt:**

```
┌─────────────────────────────────┐
│  WORKSPACES            ˅        │
│  ┌─────────────────────────┐    │
│  │  ■  2025_08_Product...  │    │  ← nur aktiver Workspace
│  └─────────────────────────┘    │
├─────────────────────────────────┤
│  File Browser (voller Platz)    │
│  ...                            │
└─────────────────────────────────┘
```

**Aufgeklappt:**

```
┌─────────────────────────────────┐
│  WORKSPACES            ˄        │
│  ┌─────────────────────────┐    │
│  │  ■  2025_08_Product...  │    │  ← aktiv (hervorgehoben)
│  └─────────────────────────┘    │
│     ■  Customer Controlling     │
│     ■  openEP                   │
│     ■  VNG HV KAUZIMON          │
│     ■  Ressort Energy – FEIG    │
├─────────────────────────────────┤
│  File Browser (reduzierter Pl.) │
│  ...                            │
└─────────────────────────────────┘
```

- Der chevron im Section-Label dreht sich beim Auf-/Zuklappen (↓ → ↑)
- Klick auf einen inaktiven Workspace wechselt diesen und klappt die Liste wieder ein
- Klick auf den bereits aktiven Workspace klappt die Liste ebenfalls ein (ohne Wechsel)
- Der aufgeklappte Zustand wird **nicht** persistiert — beim nächsten Start immer eingeklappt

**Workspace-Row:**

- Badge: 22×22 px, cornerRadius 5, workspace-spezifische Farbe (z. B. `VPE55`: blau `#3B5BDB`, `nh3jp`: indigo `#E0E7FF`, `6vpei`: grün `#D1FAE5`)
- Name: 12 px Inter
- Aktive Row: erhöhter Hintergrund (`bg-surface`) + optionaler Stroke
- Inaktive Rows: kein Hintergrund, gedämpfte Textfarbe (`text-muted`)

---

#### File Browser

Nimmt den verbleibenden vertikalen Platz der Sidebar ein (`fill_container`).

> Pencil-Frames: **`9D23X`** · **`E1fKI`**
> Nodes (collapsed/expanded): `filesLabel` (`JizSF`/`z6QPh`) — Section-Header; `lfchg` (`AB3qK`/`H7hCY`) — Änderungen + Alle-Dateien-Button; `fileTree` (`Rhhhl`/`SkG71`) — scrollbarer Dateibaum (clip:true, height:fill_container)

**Aufbau:**

- Header-Zeile: "FILES" Label (CAPS, 10 px) + chevron-down Icon; rechts "X Änderungen" + "Alle Dateien" Button
- File-Tree darunter: scrollbar (`clip:true`), Verzeichnisse mit `chevron-right` Icon, Dateien eingerückt (padding-left 20 px)
- Aktive Datei: erhöhter Hintergrund (`#FFF0E4`), farbiges `file-text` Icon (`#CF6A37`), Bold-Text (fontWeight 500)

---

**Theme-Unterschiede Sidebar:**

| Bereich           | Dark                  | Light                   | Blue                   |
| ----------------- | --------------------- | ----------------------- | ---------------------- |
| Workspace-Badges  | Vollfarbig dunkel     | Pastellfarben (hell)    | Blaue Punkte (8×8 px)  |
| Neuer-Chat-Button | Dark surface + Stroke | Helles Surface + Stroke | Solider Blau-Fill      |
| Logo-Text         | `#F0EBE3` (hell)      | `#1A120A` (dunkel)      | `#1A6FBF` (Blau, Bold) |
| Aktive Datei      | Dark surface          | Orange-Tint surface     | Blau-Tint surface      |

### Chat-Spalte

**Aufbau:**

1. **Topbar** — Session-Titel links, Loader + Ellipsis-Icons rechts. Bottom-Border.
2. **Message-Area** — Scrollbare Liste, padding `[32,40]`, gap 24.
   - **User-Bubble** — Rechtsbündig. Innerer Frame (width 460/380), cornerRadius 14, erhöhter Hintergrund mit Stroke.
   - **AI-Row** — Tool-Badges (horizontal, gap 6) + KI-Text (lineHeight 1.65) + Bullet-Liste.
3. **Input-Bar** — Oben Trennlinie, padding `[10,16,14,16]`.
   - Input-Feld: cornerRadius 12, weißer/dunkler Hintergrund, Schatten, Stroke.
   - Meta-Bar: Pfeil `>>`, Model-Pill, Code-Pill, Standard-Pill — alle cornerRadius 6.

**Tool-Badges** (in AI-Row): Kleine Pills mit Icon + Text, zeigen aufgerufene Tools.

### Preview-Panel

**Aufbau:**

1. **Tab-Bar** — "Preview" / "Source" / "Console" Tabs + Spacer + Close-Button (22×22). Aktiver Tab: Accent-Farbe + 2 px Bottom-Border.
2. **Preview-Content** — Markdown-Rendering: H1 (20 px, Bold), H2 (15 px, SemiBold), H3 (13 px, SemiBold), Body (12 px, lineHeight 1.7), Code-Block (Courier Prime, 11–12 px, cornerRadius 8).

**Breite:** `fill_container` — nimmt verbleibenden Platz nach Sidebar (240) und Chat (640).

---

## Typografie

| Rolle          | Font          | Größe    | Gewicht | Anmerkung         |
| -------------- | ------------- | -------- | ------- | ----------------- |
| Logo           | Inter         | 14 px    | 600     |                   |
| Button         | Inter         | 12 px    | 500     |                   |
| Section-Label  | Inter         | 10 px    | 700     | letterSpacing 1.2 |
| Workspace-Name | Inter         | 12 px    | 500/400 | Aktiv: 500        |
| Dateiname      | Inter         | 11 px    | 500/400 | Aktiv: 500        |
| Session-Titel  | Inter         | 13 px    | 500/600 |                   |
| KI-Text        | Inter         | 13 px    | 400     | lineHeight 1.65   |
| Body-Text      | Inter         | 12 px    | 400     | lineHeight 1.7    |
| Input          | Inter         | 13 px    | 400     |                   |
| Versionsnummer | Inter         | 10 px    | 400     |                   |
| Preview H1     | Inter         | 20 px    | 700     |                   |
| Preview H2     | Inter         | 15 px    | 600     |                   |
| Preview H3     | Inter         | 13 px    | 600     |                   |
| Code           | Courier Prime | 11–12 px | 400     |                   |

---

## Offene Punkte

- [ ] Welche Variante wird Standard-Theme beim ersten Start?
- [ ] Animations- und Übergangsverhalten (Sidebar collapse, Workspace-Wechsel)
- [ ] Leerer Zustand: Wie sieht die Chat-Spalte ohne aktive Session aus?
- [ ] Mobile / kleinere Fenstergrößen: Sidebar kollabierbar?
- [ ] Umsetzungspriorität: Welche Bereiche zuerst?
