import { createSignal, For, Show, type Accessor } from "solid-js"
import { useNavigate, useParams } from "@solidjs/router"
import { base64Encode } from "@opencode-ai/util/encode"
import type { Session } from "@opencode-ai/sdk/v2/client"

type Props = {
  sessions: Accessor<Session[]>
  dir: Accessor<string>
  onNew: () => void
}

export function ChatHistoryPanel(props: Props) {
  const [expanded, setExpanded] = createSignal(false)
  const navigate = useNavigate()
  const params = useParams()

  const go = (id: string) => {
    const dir = props.dir()
    if (!dir) return
    navigate(`/${base64Encode(dir)}/session/${id}`)
  }

  return (
    <Show
      when={expanded()}
      fallback={
        /* ── COLLAPSED (w=40) ── */
        <div
          class="shrink-0 flex flex-col items-center"
          style={{
            width: "40px",
            background: "#FAF6F0",
            "border-right": "1px solid #E8D0B8",
            padding: "12px 0",
            gap: "12px",
          }}
        >
          {/* History icon — click to expand */}
          <button
            onClick={() => setExpanded(true)}
            title="Verlauf"
            style={{ color: "#B8906A", display: "flex", "align-items": "center", "justify-content": "center" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="#B8906A" stroke-width="1.4" />
              <polyline
                points="9,5 9,9 12,11"
                stroke="#B8906A"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          {/* Separator */}
          <div style={{ background: "#E8D0B8", width: "24px", height: "1px", "flex-shrink": "0" }} />

          {/* Recent session dots */}
          <For each={props.sessions().slice(0, 5)}>
            {(session, i) => {
              const active = () => params.id === session.id
              return (
                <button
                  onClick={() => go(session.id)}
                  title={session.title ?? "Chat"}
                  class="flex items-center justify-center"
                  style={{
                    width: "24px",
                    height: "24px",
                    "border-radius": "6px",
                    background: active() ? "#FFF0E4" : "transparent",
                    "flex-shrink": "0",
                  }}
                >
                  {/* Icon squares using first letter */}
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <rect x="1" y="1" width="5" height="5" rx="1.2" fill={active() ? "#CF6A37" : "#C0906A"} />
                    <rect x="7" y="1" width="5" height="5" rx="1.2" fill={active() ? "#CF6A37" : "#C0906A"} />
                    <rect x="1" y="7" width="5" height="5" rx="1.2" fill={active() ? "#CF6A37" : "#C0906A"} />
                    <rect x="7" y="7" width="5" height="5" rx="1.2" fill={active() ? "#CF6A37" : "#C0906A"} />
                  </svg>
                </button>
              )
            }}
          </For>
        </div>
      }
    >
      {/* ── EXPANDED (w=240) ── */}
      <div
        class="shrink-0 flex flex-col"
        style={{
          width: "240px",
          background: "#FAF6F0",
          "border-right": "1px solid #E8D0B8",
          padding: "12px 8px",
          gap: "12px",
        }}
      >
        {/* Header */}
        <div
          class="flex items-center justify-between"
          style={{
            "border-bottom": "1px solid #E8D0B8",
            padding: "0 4px 8px 4px",
          }}
        >
          <span
            style={{
              "font-family": "Inter, sans-serif",
              "font-size": "10px",
              "font-weight": "700",
              color: "#B8906A",
              "letter-spacing": "1.2px",
            }}
          >
            VERLAUF
          </span>
          <button onClick={() => setExpanded(false)} style={{ color: "#B8906A", display: "flex" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="2" y1="2" x2="12" y2="12" stroke="#B8906A" stroke-width="1.4" stroke-linecap="round" />
              <line x1="12" y1="2" x2="2" y2="12" stroke="#B8906A" stroke-width="1.4" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        {/* New Chat button */}
        <button
          onClick={props.onNew}
          class="flex items-center gap-2 w-full"
          style={{
            background: "#FFF8F0",
            border: "1px solid rgba(232,184,128,0.5)",
            "border-radius": "8px",
            padding: "9px 11px",
            "font-family": "Inter, sans-serif",
            "font-size": "12px",
            "font-weight": "500",
            color: "#3A200E",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ "flex-shrink": "0" }}>
            <line x1="7" y1="2" x2="7" y2="12" stroke="#CF6A37" stroke-width="1.4" stroke-linecap="round" />
            <line x1="2" y1="7" x2="12" y2="7" stroke="#CF6A37" stroke-width="1.4" stroke-linecap="round" />
          </svg>
          Neuer Chat
        </button>

        {/* Session list */}
        <div class="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col" style={{ gap: "1px" }}>
          <For each={props.sessions()}>
            {(session) => {
              const active = () => params.id === session.id
              return (
                <button
                  onClick={() => go(session.id)}
                  class="flex items-center gap-2 w-full text-left"
                  style={{
                    padding: "7px 8px",
                    "border-radius": "6px",
                    background: active() ? "#FFF0E4" : "transparent",
                    border: active() ? "1px solid rgba(232,184,128,0.4)" : "1px solid transparent",
                    "font-family": "Inter, sans-serif",
                    "font-size": "12px",
                    "font-weight": active() ? "500" : "normal",
                    color: active() ? "#3A200E" : "#8A6A50",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ "flex-shrink": "0" }}>
                    <rect x="1" y="1" width="5" height="5" rx="1.2" fill={active() ? "#CF6A37" : "#C0906A"} />
                    <rect x="7" y="1" width="5" height="5" rx="1.2" fill={active() ? "#CF6A37" : "#C0906A"} />
                    <rect x="1" y="7" width="5" height="5" rx="1.2" fill={active() ? "#CF6A37" : "#C0906A"} />
                    <rect x="7" y="7" width="5" height="5" rx="1.2" fill={active() ? "#CF6A37" : "#C0906A"} />
                  </svg>
                  <span class="truncate">{session.title ?? "Neuer Chat"}</span>
                </button>
              )
            }}
          </For>
        </div>

        {/* Bottom bar */}
        <div
          class="flex items-center gap-[10px]"
          style={{
            "border-top": "1px solid #E8D0B8",
            "padding-top": "10px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2" stroke="#B8906A" stroke-width="1.3" />
            <path
              d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1 1M10.2 10.2l1 1M11.2 2.8l-1 1M3.8 10.2l-1 1"
              stroke="#B8906A"
              stroke-width="1.3"
              stroke-linecap="round"
            />
          </svg>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#B8906A" stroke-width="1.3" />
            <line x1="7" y1="6" x2="7" y2="10" stroke="#B8906A" stroke-width="1.3" stroke-linecap="round" />
            <circle cx="7" cy="4" r="0.7" fill="#B8906A" />
          </svg>
          <span
            style={{ "font-family": "Inter, sans-serif", "font-size": "10px", color: "#C0A080", "margin-left": "auto" }}
          >
            OpenCode
          </span>
        </div>
      </div>
    </Show>
  )
}
