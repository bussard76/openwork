# openwork — Browser-Tab

## Status

Konzept — noch nicht implementiert.

---

## Ausgangslage

Im Work-Modus öffnet openwork Dateien (`.docx`, `.pptx`, `.xlsx`, `.md`, etc.) als Tabs im Preview-Panel. Das gleiche Panel soll auch Webseiten rendern können — analog zu einem eingebetteten Browser-Tab.

Ziel: Nutzer sollen URLs direkt im Client öffnen können, ohne die App zu verlassen. Gleichzeitig soll der KI-Agent den Inhalt geöffneter Seiten als Kontext nutzen können.

---

## Konzept

Browser-Tabs erscheinen im selben Tab-Bereich wie Datei-Tabs. Ein Browser-Tab unterscheidet sich von einem Datei-Tab durch:

- eine **Adressleiste** (URL-Feld + Navigation-Buttons) unterhalb der Tab-Bar
- Rendering via **Tauri WebView** statt eigenem Renderer
- einen **Tab-Typ** `"browser"` (analog zu `"file"`, `"preview"`, etc.)

Mehrere Browser-Tabs können gleichzeitig geöffnet sein.

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Sidebar (240 px)  │  Chat-Spalte (640 px)  │  Tab-Panel    │
│                    │                        │  (flex)       │
│                    │                        │               │
│                    │                        │  Tab-Bar:     │
│                    │                        │  [AGENTS.md ✕]│
│                    │                        │  [🌐 google ✕]│  ← Browser-Tab
│                    │                        │  [report.docx]│
│                    │                        │               │
│                    │                        │  Adressleiste:│
│                    │                        │  ← → ↺ [url] │  ← nur bei Browser-Tab
│                    │                        │               │
│                    │                        │  WebView      │
│                    │                        │  (Tauri)      │
└──────────────────────────────────────────────────────────────┘
```

Die Adressleiste ist nur sichtbar wenn ein Browser-Tab aktiv ist. Bei Datei-Tabs bleibt die Adressleiste ausgeblendet.

---

## Tab-Typen

| Typ       | Icon              | Inhalt                                 | Adressleiste |
| --------- | ----------------- | -------------------------------------- | ------------ |
| `file`    | Datei-Icon        | Dateiinhalt (Markdown, DOCX-Preview …) | Nein         |
| `browser` | Favicon der Seite | Webseite via Tauri WebView             | Ja           |

Das Tab-Icon zeigt das **Favicon** der geladenen Seite. Solange die Seite lädt oder kein Favicon verfügbar ist, wird ein Globus-Icon als Fallback gezeigt.

---

## Adressleiste

Erscheint direkt unter der Tab-Bar, nur wenn ein Browser-Tab aktiv ist.

```
┌───────────────────────────────────────────────────────────┐
│  ←  →  ↺   https://docs.anthropic.com/...           🔖   │
└───────────────────────────────────────────────────────────┘
```

| Element            | Funktion                                      |
| ------------------ | --------------------------------------------- |
| `←`                | Zurück (Browser-History)                      |
| `→`                | Vorwärts (Browser-History)                    |
| `↺`                | Reload                                        |
| URL-Feld           | Zeigt aktuelle URL, editierbar, Enter lädt    |
| `🔖` (Lesezeichen) | Seite als Kontext-Pin markieren (siehe unten) |

---

## URL-Quellen

### Manuell

Nutzer öffnet einen neuen Browser-Tab über:

- **Tastenkürzel** — `Cmd+T` (neuer Browser-Tab, leer); `Cmd+L` fokussiert die Adressleiste
- **Kontextmenü im Chat** — Rechtsklick auf einen Link → „In Browser-Tab öffnen"
- **Adressleiste** — URL-Feld in einem bestehenden Browser-Tab bearbeiten

### Durch den Agenten

Der Agent kann eine URL programmatisch als Browser-Tab öffnen. Dazu erhält er ein neues Tool:

```typescript
// Tool-Definition (konzeptuell):
open_browser_tab({ url: string }): { tab_id: string }
```

Der Agent nutzt dieses Tool z. B. beim Recherchieren, um eine Seite zu öffnen und dem Nutzer sichtbar zu machen. Die geöffnete Seite wird gleichzeitig als Kontext geladen (siehe unten).

---

## Agent-Integration (Seite als Kontext)

Ist ein Browser-Tab geöffnet, kann der Agent dessen Inhalt in seinen Kontext aufnehmen. Zwei Mechanismen:

### Automatisch beim Öffnen

Öffnet der Agent selbst einen Browser-Tab (`open_browser_tab`), liest er den gerenderten Text automatisch aus dem WebView und fügt ihn als Kontext-Snippet in die aktuelle Session ein.

### Manuell durch den Nutzer (Kontext-Pin)

Nutzer kann über das `🔖`-Icon in der Adressleiste die aktuelle Seite **pinnen** — ihr Inhalt wird als persistenter Kontext für die Chat-Session gespeichert, ähnlich wie eine angeheftete Datei.

```
Gepinnter Kontext:
  🌐 docs.anthropic.com/api — Tool Use                [✕]
  📄 AGENTS.md                                        [✕]
```

Der gepinnte Webseiteninhalt erscheint im Input-Bereich unter dem Kontext-Indikator (analog zu angehängten Dateien).

### Lesemodell

Der Rohtext der Seite wird via `webview.evaluate_script("document.body.innerText")` ausgelesen. Keine Screenshots, kein DOM-Traversal — nur Text. Das ist zugleich die Basis für den Firecrawl-MCP-Fallback falls eine Seite kein JavaScript benötigt (z. B. statische Dokumentationsseiten).

---

## Tab-Persistenz

| Zustand               | Verhalten                                                                     |
| --------------------- | ----------------------------------------------------------------------------- |
| App schließen         | Geöffnete Browser-Tabs werden **nicht** persistiert — beim nächsten Start weg |
| Workspace wechseln    | Browser-Tabs bleiben offen (sie gehören keinem Workspace)                     |
| Chat-Session wechseln | Browser-Tabs bleiben offen                                                    |
| Gepinnte Seite (🔖)   | Pin wird mit der Chat-Session gespeichert (URL + gecachter Text)              |

**Begründung:** Browser-Tabs sind flüchtige Arbeitsmittel. Persistenz würde den Startup verlangsamen (Seiten müssen neu geladen werden) und bringt wenig Mehrwert.

---

## Sicherheit

| Thema                | Entscheidung                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Tauri WebView        | Standard-Tauri-WebView; `X-Frame-Options`-Header werden ignoriert — Seiten werden immer gerendert                              |
| Inter-App-Navigation | Links die aus dem WebView heraus auf externe Apps zeigen (`mailto:`, etc.) werden im System-Browser geöffnet, nicht im WebView |
| Downloads            | Downloads im WebView werden im Standard-Download-Ordner gespeichert (Tauri-Standard)                                           |
| Kontext-Extraktion   | Nur `document.body.innerText` — kein Zugriff auf Cookies, LocalStorage oder Anmeldedaten                                       |
| Agent-Steuerung      | Phase 1: Agent kann Tabs öffnen und Text lesen, aber nicht interagieren. Phase 2 (Playwright): siehe unten.                    |

---

## Tastaturkürzel

| Kürzel  | Aktion                                             |
| ------- | -------------------------------------------------- |
| `Cmd+T` | Neuen Browser-Tab öffnen                           |
| `Cmd+L` | Adressleiste fokussieren (URL auswählen)           |
| `Cmd+R` | Aktiven Browser-Tab neu laden                      |
| `Cmd+W` | Aktiven Tab schließen (Browser-Tab oder Datei-Tab) |
| `Cmd+[` | Im Browser zurück navigieren                       |
| `Cmd+]` | Im Browser vorwärts navigieren                     |

Kein hartes Tab-Limit — Nutzer entscheidet selbst wie viele Tabs offen bleiben.

---

## Playwright-Integration (Phase 2)

Langfristiges Ziel: Der Agent soll nicht nur Seiten lesen, sondern auch mit ihnen interagieren können — Formulare ausfüllen, Buttons klicken, Scrollen. Das erfordert eine Playwright-Integration als separates MCP-Tool oder als eigenes Skill.

**Abgrenzung zur aktuellen Phase:**

| Fähigkeit           | Phase 1 (Browser-Tab) | Phase 2 (Playwright)          |
| ------------------- | --------------------- | ----------------------------- |
| Seite öffnen        | ✓ (WebView)           | ✓ (Playwright Browser)        |
| Text lesen          | ✓ (`innerText`)       | ✓ (Playwright `textContent`)  |
| Klicken / Ausfüllen | ✗                     | ✓                             |
| Sichtbar für Nutzer | ✓ (im Tab-Panel)      | Optional (headless oder live) |

Die Playwright-Phase wird als separates Konzept erarbeitet wenn Phase 1 implementiert ist.
