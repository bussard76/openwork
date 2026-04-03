# openwork — Server & Skill Registry Konzept

## Begriffe

| Begriff             | Definition                                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Skill**           | Eine `SKILL.md`-Datei mit Instruktionen die dem Modell erklären wie es sich in einem bestimmten Kontext verhalten soll (z. B. wie Word-Dokumente erstellt werden) |
| **MCP-Server**      | Ein Dienst der dem Modell Werkzeuge (Tools) bereitstellt, mit denen es externe Systeme ansprechen kann (z. B. HubSpot, Firecrawl, Perplexity)                     |
| **config-registry** | Zentraler Verwaltungsdienst auf dem openwork-server — gibt fertige `opencode.json`-Fragmente (MCP-Einträge, Provider-Konfig, Skill-Konfig) an Clients aus         |
| **LiteLLM**         | OpenAI-kompatibler Modell-Proxy — kapselt alle LLM-Provider-Keys serverseitig                                                                                     |
| **Degraded Mode**   | Betriebszustand des Clients wenn der Server nicht erreichbar ist — lokale Skills verfügbar, kein LLM-Betrieb (außer GitHub Copilot)                               |

Skills und MCP-Server sind unabhängige Konzepte. Ein Skill kann optional einen MCP-Server _voraussetzen_ — z. B. ein Skill der erklärt wie man HubSpot-Daten abfragt, setzt den HubSpot-MCP-Server voraus. Der MCP-Server selbst ist aber kein Skill.

---

## Überblick

Der **openwork-server** ist die serverseitige Ergänzung zum openwork-Client. Er stellt Docker-basierte Services zentral bereit: einen Modell-Proxy (LiteLLM), MCP-Server für externe Dienste, und einen config-registry der den Client beim Start vollständig konfiguriert.

**Designprinzip: maximale Nähe zum OpenCode-Standard.** Der Client bleibt ein normaler OpenCode-Client. Die einzige Konfigurationsdatei ist die bestehende `~/.config/opencode/opencode.json`. Der openwork-Server liefert beim Login fertige JSON-Fragmente die in diese Datei eingetragen werden — der User muss nichts manuell konfigurieren.

**Skills** liegen primär lokal beim Client (`~/.config/opencode/skills/`) und werden zyklisch aus einem zentralen Git-Monorepo aktualisiert.

Kein User muss API-Keys kennen, MCPs manuell konfigurieren oder Skills selbst installieren.

---

## Gesamtarchitektur

```
╔══════════════════════════════════════════════╗
║  INTERNET / EXTERNE DIENSTE                  ║
║                                              ║
║  ┌───────────┐ ┌──────────┐ ┌─────────────┐ ║
║  │ OpenAI /  │ │Firecrawl │ │  HubSpot /  │ ║
║  │ Anthropic │ │Perplexity│ │  weitere    │ ║
║  └─────┬─────┘ └────┬─────┘ └──────┬──────┘ ║
╚════════╪════════════╪══════════════╪═════════╝
         │            │              │
╔════════╪════════════╪══════════════╪══════════════════╗  ╔══════════════════════════════════╗
║  OPENWORK-SERVER                                       ║  ║  SKILL-MONOREPO                  ║
║  https://openwork.company.internal                     ║  ║  (GitHub / GitLab)               ║
║  Docker-Netz — MCP-Server nur intern erreichbar        ║  ║                                  ║
║                                                        ║  ║  skills/                         ║
║  ┌──────────────┐  ┌─────────────────────────────┐    ║  ║  ├── docx/SKILL.md               ║
║  │   Keycloak   │  │       config-registry        │◄───╫──╫──├── xlsx/SKILL.md               ║
║  │ (OIDC-Broker)│  │  - MCP remote-Einträge       │    ║  ║  ├── pptx/SKILL.md               ║
║  │  → Firmen-AD │  │  - Provider-Konfig + Key     │    ║  ║  ├── pdf/SKILL.md                ║
║  │  → Azure AD  │  │  - Skill-Konfig (repo, ref)  │    ║  ║  ├── hubspot-usage/SKILL.md      ║
║  │  → Okta      │  │  - Repo-Token (privat)       │    ║  ║  └── ...                         ║
║  └──────────────┘  └─────────────────────────────┘    ║  ║                                  ║
║                                                        ║  ║  registry.yaml                   ║
║  ┌───────────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ ║  ╚══════════════════════════════════╝
║  │    LiteLLM    │ │mcp-fire- │ │mcp-per-  │ │mcp-  │ ║
║  │ (Modell-Proxy)│ │crawl     │ │plexity   │ │hub-  │ ║
║  │ OpenAI-komp.  │ │          │ │          │ │spot  │ ║
║  └───────────────┘ └──────────┘ └──────────┘ └──────┘ ║
║                                                        ║
║  ┌──────────────┐                                      ║
║  │  PostgreSQL  │ ← Keycloak-Datenbank                 ║
║  └──────────────┘                                      ║
╚════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════════════╗
║  OPENWORK-CLIENT (org-spezifisch gebauter OpenCode-Client)                ║
║                                                                           ║
║  Eingebettet: OPENWORK_SERVER_URL=https://openwork.company.internal       ║
║                                                                           ║
║  ~/.config/opencode/opencode.json   ← einzige Konfig (OpenCode-Standard) ║
║  ~/.config/opencode/skills/         ← lokale Skill-Kopien                ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## Client-Konfiguration (`opencode.json`)

Der Client verwendet ausschließlich die Standard-OpenCode-Konfigurationsdatei `~/.config/opencode/opencode.json`. Es gibt **keine zusätzliche openwork-spezifische Konfigurationsdatei**.

Beim Login liefert der config-registry ein JSON-Fragment das in die `opencode.json` eingetragen wird. Dieses Fragment folgt vollständig dem OpenCode-Schema — der Client behandelt es wie jede andere Konfiguration.

### Was der config-registry liefert

**MCP-Einträge** — aus lokalen `type: "local"` werden serverseitige `type: "remote"` Einträge:

```jsonc
// Vorher (manuell, lokal, API-Key im Klartext):
"mcp": {
  "hubspot": {
    "type": "local",
    "command": ["uvx", "hubspot-mcp-server"],
    "environment": { "HUBSPOT_API_KEY": "pat-eu1-..." }
  }
}

// Nachher (vom config-registry, kein Key im Client):
"mcp": {
  "hubspot": {
    "type": "remote",
    "url": "https://openwork.company.internal/mcp/hubspot",
    "headers": { "Authorization": "Bearer {env:OPENWORK_SESSION_TOKEN}" }
  },
  "firecrawl": {
    "type": "remote",
    "url": "https://openwork.company.internal/mcp/firecrawl",
    "headers": { "Authorization": "Bearer {env:OPENWORK_SESSION_TOKEN}" }
  }
}
```

**Provider-Konfiguration** — LiteLLM statt direkter Provider-Keys:

```jsonc
// Vom config-registry geliefert:
"provider": {
  "openai": {
    "options": {
      "baseURL": "https://openwork.company.internal/litellm",
      "apiKey": "{env:OPENWORK_LITELLM_KEY}"
    }
  }
},
"model": "openai/gpt-4o"
```

**Skills-Konfiguration** — welches Repo, welche Pflicht-Skills:

```jsonc
// Vom config-registry geliefert (openwork-Erweiterung des OpenCode-Schemas):
"openwork": {
  "skills": {
    "repo": "https://github.com/openwork/skills",
    "ref": "main",
    "required": ["docx", "xlsx", "pptx", "pdf", "hubspot-usage", "internal-comms"],
    "extra_sources": [
      {
        "repo": "https://gitlab.company.internal/openwork/skills",
        "ref": "main",
        "required": ["company-specific-skill"]
      }
    ]
  }
}
```

### Vollständiges Beispiel nach Login

```jsonc
// ~/.config/opencode/opencode.json (nach Login durch openwork)
{
  "$schema": "https://opencode.ai/config.json",

  // Standard OpenCode — vom config-registry gesetzt:
  "model": "openai/gpt-4o",
  "provider": {
    "openai": {
      "options": {
        "baseURL": "https://openwork.company.internal/litellm",
        "apiKey": "{env:OPENWORK_LITELLM_KEY}",
      },
    },
  },
  "mcp": {
    "hubspot": {
      "type": "remote",
      "url": "https://openwork.company.internal/mcp/hubspot",
      "headers": { "Authorization": "Bearer {env:OPENWORK_SESSION_TOKEN}" },
    },
    "firecrawl": {
      "type": "remote",
      "url": "https://openwork.company.internal/mcp/firecrawl",
      "headers": { "Authorization": "Bearer {env:OPENWORK_SESSION_TOKEN}" },
    },
    "perplexity": {
      "type": "remote",
      "url": "https://openwork.company.internal/mcp/perplexity",
      "headers": { "Authorization": "Bearer {env:OPENWORK_SESSION_TOKEN}" },
    },
  },

  // openwork-Erweiterung — Skill-Verwaltung:
  "openwork": {
    "server": "https://openwork.company.internal",
    "skills": {
      "repo": "https://github.com/openwork/skills",
      "ref": "main",
      "required": ["docx", "xlsx", "pptx", "pdf", "hubspot-usage", "internal-comms"],
    },
  },

  // Persönliche Einstellungen des Users (unberührt vom Server):
  "plugin": ["opencode-working-memory"],
}
```

### Was der Server nie anfasst

- Persönliche Einstellungen: `plugin`, `theme`, `keybinds`, `username`
- Bestehende `mcp`-Einträge die nicht vom Server verwaltet werden (z. B. lokale Dev-Tools)
- Der `openwork`-Abschnitt kann vom User manuell überschrieben werden (Server-Konfig wird dann übersprungen)

---

## Services

### Keycloak

OIDC-Broker für User-Authentifizierung.

- Bindet an das Firmen-AD, Azure AD, Okta oder einen anderen Identity Provider via LDAP/SAML/OIDC
- Stellt den OIDC-Login-Flow für den Client bereit
- Gruppen und Rollen aus dem AD können genutzt werden um Zugriff auf bestimmte MCP-Server zu steuern (spätere Phase)

### config-registry

Zentraler Verwaltungsdienst — das Herzstück des openwork-servers.

- Liefert beim Login fertige `opencode.json`-Fragmente: MCP `remote`-Einträge, Provider-Konfig, Skill-Konfig
- API-Keys für MCP-Services bleiben serverseitig — werden nie an den Client weitergegeben
- LiteLLM-Key: user-spezifisch, wird als `OPENWORK_LITELLM_KEY` Umgebungsvariable gesetzt
- Session-Token: wird als `OPENWORK_SESSION_TOKEN` Umgebungsvariable gesetzt — authentifiziert den Client gegenüber allen Remote-MCP-Servern
- Repo-Token für private Skill-Repos: wird nie an den Client weitergegeben, Server klont im Auftrag des Clients

### LiteLLM

Zentraler Modell-Proxy — alle Clients sprechen gegen LiteLLM statt direkt gegen LLM-Provider.

- OpenAI-kompatibler HTTP-Proxy: Client verwendet die Standard-OpenAI-API, LiteLLM routet zu den konfigurierten Providern
- Provider-API-Keys (OpenAI, Anthropic, Azure OpenAI, etc.) bleiben serverseitig
- Zentrale Kostenkontrolle: Budgets, Rate-Limits und Modell-Allowlists server-seitig konfigurierbar
- Provider-Wechsel oder Modell-Updates erfordern keine Client-Änderung

### mcp-firecrawl

MCP-Server für Web-Scraping und Crawling via Firecrawl-API.

- Kapselt den Firecrawl-API-Key serverseitig
- Exponiert einen HTTP/SSE-Endpunkt den OpenCode als `type: "remote"` anspricht
- Stellt MCP-Tools bereit: `crawl`, `scrape`, `map`

### mcp-perplexity

MCP-Server für KI-gestützte Websuche via Perplexity-API.

- Kapselt den Perplexity-API-Key serverseitig
- Stellt MCP-Tools bereit: `search`, `ask`

### mcp-hubspot

MCP-Server für CRM-Integration via HubSpot-API.

- Kapselt den HubSpot-API-Key serverseitig
- Stellt MCP-Tools bereit: `get_contact`, `search_deals`, `create_note`, etc.

---

## Startup-Flow

```
openwork-client                  openwork-server              Skill-Monorepo
      │                                │                            │
      │  Start                         │                            │
      ├─── Hat gültiges OIDC-Token? ───┤                            │
      │         Nein                   │                            │
      │                                │                            │
      ├─── Keycloak Login-Flow ────────►                            │
      │◄── OIDC-Token ─────────────────┤                            │
      │                                │                            │
      ├─── GET /config  ───────────────►                            │
      │    (mit OIDC-Token)            │                            │
      │◄── opencode.json-Fragment:     │                            │
      │    MCP remote-Einträge,        │                            │
      │    Provider-Konfig + Key,      │                            │
      │    Skill-Konfig ───────────────┤                            │
      │                                │                            │
      ├─── opencode.json aktualisieren │                            │
      │    (Umgebungsvariablen setzen) │                            │
      │                                │                            │
      ├─── Skill-Versionen prüfen ─────────────────────────────────►
      │◄── Geänderte SKILL.md-Dateien ─────────────────────────────┤
      │                                │                            │
      ├─── Skills in ~/.config/opencode/skills/ speichern          │
      │                                │                            │
      │  Bereit ✓                      │                            │
```

### Session-Management

Der Client führt im Hintergrund einen **Silent Refresh** des OIDC-Tokens durch bevor er abläuft. Schlägt der Refresh fehl, läuft die aktuelle Session weiter bis zum nächsten Client-Start — dann wird ein erneuter Login-Flow ausgelöst.

---

## Fallback (Server nicht erreichbar)

```
openwork-client startet — Server nicht erreichbar
        │
        ├── Letzter gecachter opencode.json-Stand vorhanden?
        │       Ja → MCP remote-Einträge + Skill-Konfig aus gecachtem Stand verwenden
        │       Nein → Nur manuell konfigurierte MCPs + lokal vorhandene Skills
        │
        ├── LiteLLM nicht erreichbar
        │       → Kein KI-Betrieb möglich
        │       → Ausnahme: GitHub Copilot (eigene OAuth-Auth, kein Server nötig)
        │
        ├── MCP-Server nicht erreichbar (remote-Endpunkte nicht erreichbar)
        │       → Skills mit requires_mcp werden deaktiviert
        │       → Skills ohne MCP-Abhängigkeit funktionieren normal
        │
        └── User erhält Hinweis: Server nicht erreichbar, Degraded Mode aktiv
```

**Bewusste Designentscheidung:** Keine Provider-Keys lokal = keine Umgehungsmöglichkeit, volle Kostenkontrolle bleibt beim Server. GitHub Copilot ist der einzige sinnvolle Fallback-Provider da er eigene User-Authentifizierung mitbringt.

---

## Skills

### Konzept

Skills sind `SKILL.md`-Dateien mit Instruktionen für das Modell. Sie liegen primär lokal beim Client (`~/.config/opencode/skills/`) — dem Standard-OpenCode-Pfad — und werden zyklisch aus einem zentralen Git-Monorepo aktualisiert. Der openwork-server gibt vor welche Skills Pflicht sind — der Client lädt und wendet sie automatisch an.

**Skills sind Teil des Client-Repos** (`packages/desktop/skills/`). Sie werden beim App-Build ins Tauri-Bundle aufgenommen und beim App-Start automatisch nach `~/.config/opencode/skills/` kopiert. Damit sind Skills vom ersten Start an verfügbar — ohne Netzwerkzugriff, ohne Login.

### Kategorien

**Universelle Pflicht-Skills** — für jeden Client, unabhängig von der Organisation. Rein lokal, kein MCP-Server erforderlich, funktionieren vollständig im Degraded Mode:

| Skill  | Funktion                                           |
| ------ | -------------------------------------------------- |
| `docx` | Verarbeitung und Erstellung von Word-Dokumenten    |
| `xlsx` | Verarbeitung und Erstellung von Excel-Dateien      |
| `pptx` | Verarbeitung und Erstellung von PowerPoint-Dateien |
| `pdf`  | Lesen und Erzeugen von PDF-Dokumenten              |

**Org-spezifische Pflicht-Skills** — vom Admin für die Organisation definiert. Oft begleiten sie einen MCP-Server und erklären dem Modell wie es dessen Tools nutzen soll.

Beispiele: `hubspot-usage` (setzt `mcp-hubspot` voraus), `internal-comms`

### Skill-Struktur im Repo

Skills liegen im Client-Repo unter `packages/desktop/skills/` — damit sind sie versioniert, über PRs pflegbar, und werden mit jedem App-Release automatisch ausgerollt:

```
packages/desktop/
└── skills/
    ├── docx/
    │   ├── SKILL.md          ← Instruktionen für das Modell
    │   └── skill.yaml        ← Metadaten inkl. version
    ├── xlsx/
    │   ├── SKILL.md
    │   └── skill.yaml
    ├── pptx/
    │   ├── SKILL.md
    │   └── skill.yaml
    ├── pdf/
    │   ├── SKILL.md
    │   └── skill.yaml
    └── hubspot-usage/
        ├── SKILL.md
        └── skill.yaml        ← requires_mcp: hubspot
```

Das Tauri-Bundle (`bundle.resources`) schließt dieses Verzeichnis ein. Beim App-Start kopiert die `initialize()`-Funktion in `lib.rs` die gebundelten Skills nach `~/.config/opencode/skills/`.

`skill.yaml` ohne MCP-Abhängigkeit:

```yaml
name: docx
display_name: Word-Dokumente (DOCX)
description: Verarbeitung und Erstellung von Word-Dokumenten
version: 1.0.0
author: openwork
```

`skill.yaml` mit MCP-Abhängigkeit:

```yaml
name: hubspot-usage
display_name: HubSpot CRM
description: Anleitung zur Nutzung des HubSpot-MCP — Kontakte, Deals, Aktivitäten
version: 1.2.0
author: openwork
requires_mcp: hubspot # muss mit MCP-Name in opencode.json übereinstimmen
```

### Skill-Update-Zyklus (beim App-Start)

```
App-Start (initialize() in lib.rs)
        │
        ├── Für jeden gebundelten Skill in packages/desktop/skills/:
        │       skill.yaml aus Bundle lesen → Bundle-Version ermitteln
        │       ~/.config/opencode/skills/<name>/skill.yaml vorhanden?
        │           Nein → Skill vollständig kopieren
        │           Ja   → Installierte Version vs. Bundle-Version vergleichen
        │                   Bundle neuer → überschreiben
        │                   Bundle gleich/älter → nicht anfassen
        │
        └── Skills ab sofort für OpenCode verfügbar (kein Neustart nötig)
```

**Versionierungsregel:** Die `version`-Angabe in `skill.yaml` entscheidet ob ein Skill überschrieben wird. Lokal modifizierte Skills bleiben erhalten solange keine neuere Bundle-Version verfügbar ist.

**App-Updates:** Da Skills Teil des Client-Repos (`packages/desktop/skills/`) sind, bringt jede neue App-Version automatisch aktualisierte Skills mit. Der Tauri-Updater ersetzt das App-Bundle — beim nächsten Start greift der Versionsvergleich und neuere Skills werden kopiert.

### Org-eigene (private) Skills

Organisationen können eigene Skills in einem privaten Repo pflegen. Die Konfiguration liegt im `openwork`-Abschnitt der `opencode.json`:

```jsonc
"openwork": {
  "skills": {
    "repo": "https://github.com/openwork/skills",
    "ref": "main",
    "required": ["docx", "xlsx", "pptx", "pdf", "hubspot-usage", "internal-comms"],
    "extra_sources": [
      {
        "repo": "https://gitlab.company.internal/openwork/skills",
        "ref": "main",
        "required": ["company-specific-skill"]
      }
    ]
  }
}
```

Private Repos erfordern ein Access-Token, das serverseitig im `config-registry` hinterlegt wird — nie im Client. Im Offline-Fall wird der zuletzt gecachte Stand der privaten Skills genutzt.

---

## Deployment

Initiales Setup via **Docker Compose**:

```yaml
# docker-compose.yml (noch nicht finalisiert)
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  keycloak:
    image: quay.io/keycloak/keycloak:latest
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${POSTGRES_PASSWORD}
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
    ports: ["8080:8080"]
    depends_on: [postgres]

  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    ports: ["4000:4000"]
    volumes:
      - ./litellm-config.yaml:/app/config.yaml
    command: ["--config", "/app/config.yaml"]
    environment:
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      # weitere Provider nach Bedarf

  config-registry:
    image: openwork/config-registry
    ports: ["3000:3000"]
    environment:
      KEYCLOAK_URL: http://keycloak:8080
      KEYCLOAK_REALM: openwork

  mcp-firecrawl:
    image: openwork/mcp-firecrawl
    environment:
      FIRECRAWL_API_KEY: ${FIRECRAWL_API_KEY}

  mcp-perplexity:
    image: openwork/mcp-perplexity
    environment:
      PERPLEXITY_API_KEY: ${PERPLEXITY_API_KEY}

  mcp-hubspot:
    image: openwork/mcp-hubspot
    environment:
      HUBSPOT_API_KEY: ${HUBSPOT_API_KEY}

volumes:
  postgres_data:
```

Späterer Schritt: Migration zu Kubernetes für höhere Verfügbarkeit und einfacheres Skalieren einzelner MCP-Container.

---

## Entscheidungen

| Thema                  | Entscheidung                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Client-Konfiguration   | Ausschließlich `opencode.json` — kein separates openwork-Konfigurationsformat                         |
| Authentifizierung      | Keycloak (OIDC) gegen Firmen-AD / Azure AD / Okta                                                     |
| MCP-Konfiguration      | config-registry liefert `type: "remote"` Einträge — Client braucht keine lokalen Keys                 |
| MCP-Authentifizierung  | Session-Token als HTTP-Header — MCP-Server validieren gegen Keycloak                                  |
| Modell-Proxy           | LiteLLM — OpenAI-kompatibler Proxy, Provider-Keys serverseitig                                        |
| LiteLLM-Auth           | User-spezifischer Key, als Umgebungsvariable (`OPENWORK_LITELLM_KEY`) gesetzt                         |
| Session-Refresh        | Silent Refresh im Hintergrund                                                                         |
| Multi-Tenancy          | Eine Server-Instanz pro Organisation                                                                  |
| Logging/Audit          | Kein zentrales Logging                                                                                |
| config-registry API    | `GET /config` — Response ist direkt das `opencode.json`-Fragment, kein Wrapper                        |
| Org-Konfiguration      | Flat File (YAML/JSON) auf dem Server — kein Admin-UI, direkt editierbar                               |
| Admin-UI               | Kein UI — Flat File per SSH/direkt editieren                                                          |
| Skill-Update-Zeitpunkt | Nur beim App-Start                                                                                    |
| Skill-Update-Quelle    | Ausschließlich via App-Bundle (Tauri Updater) — kein separater Git-Pull                               |
| Degraded Mode UX       | Statusindikator (Icon/Badge) in der UI, automatischer Retry im Hintergrund, kein Copilot-Hinweis      |
| Skill-Primärspeicher   | Lokal beim Client (`~/.config/opencode/skills/`) — Standard-OpenCode-Pfad                             |
| Skill-Repository       | `packages/desktop/skills/` im Client-Repo — versioniert mit dem App-Release                           |
| Skill-Bundling         | Tauri `bundle.resources` → kopiert bei App-Start via `initialize()` nach `~/.config/opencode/skills/` |
| Skill-Versionierung    | `version` in `skill.yaml` — Bundle überschreibt nur wenn neuer                                        |
| Manuelle Konfig        | `openwork`-Abschnitt in `opencode.json` kann manuell gesetzt werden (überschreibt Server-Konfig)      |

---

## Offene Fragen

- [x] config-registry API: Nur `GET /config` — Response ist direkt das `opencode.json`-Fragment, kein Wrapper-Objekt.
- [ ] `openwork`-Abschnitt in `opencode.json`: Wird dieser als OpenCode-Extension registriert oder ignoriert OpenCode ihn (strict schema)?
- [x] Admin-UI für Skill-Konfig: Kein UI — Admins editieren das Flat File (YAML/JSON) direkt auf dem Server.
- [ ] Skill-Monorepo: nur openwork-Team oder auch Community-Contributions?
- [x] Skill-Update-Intervall: Skills werden nur beim App-Start geprüft und aktualisiert — ausschließlich via App-Bundle (Tauri Updater), kein separater Git-Pull.
- [x] UX im Degraded Mode: Statusindikator (Icon/Badge) in der UI — kein Banner. Automatischer Retry im Hintergrund. Kein expliziter Copilot-Hinweis.
