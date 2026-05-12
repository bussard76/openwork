import { createEffect, createSignal, onCleanup } from "solid-js"
import { IconButton } from "@opencode-ai/ui/icon-button"

export function isBrowserTab(tab: string): boolean {
  return tab.startsWith("browser://")
}

export function browserTabUrl(tab: string): string {
  return tab.slice("browser://".length)
}

export function makeBrowserTab(url: string): string {
  return `browser://${url}`
}

export function BrowserTabContent(props: {
  tab: string
  onPin: (url: string, text: string) => void
  onUrlChange: (tab: string, newUrl: string) => void
}) {
  let iframe: HTMLIFrameElement | undefined
  let addressInput: HTMLInputElement | undefined

  const [url, setUrl] = createSignal(browserTabUrl(props.tab))
  const [input, setInput] = createSignal(browserTabUrl(props.tab))
  const [history, setHistory] = createSignal<string[]>([browserTabUrl(props.tab)])
  const [idx, setIdx] = createSignal(0)

  const canBack = () => idx() > 0
  const canForward = () => idx() < history().length - 1

  createEffect(() => {
    const next = browserTabUrl(props.tab)
    if (next !== url()) {
      setUrl(next)
      setInput(next)
    }
  })

  const navigate = (target: string) => {
    const full = target.startsWith("http://") || target.startsWith("https://") ? target : `https://${target}`
    const i = idx()
    const trimmed = history().slice(0, i + 1)
    setHistory([...trimmed, full])
    setIdx(trimmed.length)
    setUrl(full)
    setInput(full)
    props.onUrlChange(props.tab, full)
  }

  const goBack = () => {
    if (!canBack()) return
    const i = idx() - 1
    setIdx(i)
    const u = history()[i]
    setUrl(u)
    setInput(u)
    props.onUrlChange(props.tab, u)
  }

  const goForward = () => {
    if (!canForward()) return
    const i = idx() + 1
    setIdx(i)
    const u = history()[i]
    setUrl(u)
    setInput(u)
    props.onUrlChange(props.tab, u)
  }

  const reload = () => {
    if (!iframe) return
    // eslint-disable-next-line no-self-assign
    iframe.src = iframe.src
  }

  const handleKey = (e: KeyboardEvent) => {
    if (e.key !== "Enter") return
    navigate(input())
  }

  const pin = async () => {
    if (!iframe) return
    const current = url()
    // Fetch text via the backend tool won't work cross-origin in iframe;
    // best-effort: use document.title from iframe if same-origin, else just url
    let text = current
    try {
      text = iframe.contentDocument?.body?.innerText ?? current
    } catch {
      // cross-origin — ignore
    }
    props.onPin(current, text)
  }

  const onFocusAddressBar = (e: Event) => {
    const detail = (e as CustomEvent).detail as { tab?: string }
    if (detail.tab && detail.tab !== props.tab) return
    addressInput?.focus()
    addressInput?.select()
  }

  const onReload = (e: Event) => {
    const detail = (e as CustomEvent).detail as { tab?: string }
    if (detail.tab && detail.tab !== props.tab) return
    reload()
  }

  const onBack = (e: Event) => {
    const detail = (e as CustomEvent).detail as { tab?: string }
    if (detail.tab && detail.tab !== props.tab) return
    goBack()
  }

  const onForward = (e: Event) => {
    const detail = (e as CustomEvent).detail as { tab?: string }
    if (detail.tab && detail.tab !== props.tab) return
    goForward()
  }

  document.addEventListener("browser-tab:focus-address-bar", onFocusAddressBar)
  document.addEventListener("browser-tab:reload", onReload)
  document.addEventListener("browser-tab:back", onBack)
  document.addEventListener("browser-tab:forward", onForward)

  onCleanup(() => {
    document.removeEventListener("browser-tab:focus-address-bar", onFocusAddressBar)
    document.removeEventListener("browser-tab:reload", onReload)
    document.removeEventListener("browser-tab:back", onBack)
    document.removeEventListener("browser-tab:forward", onForward)
  })

  return (
    <div class="flex flex-col h-full w-full overflow-hidden">
      <div class="shrink-0 flex items-center gap-1 px-2 py-1 border-b border-border-weak-base bg-background-stronger">
        <IconButton
          icon="arrow-left"
          variant="ghost"
          class="h-6 w-6"
          disabled={!canBack()}
          onClick={goBack}
          aria-label="Back"
        />
        <IconButton
          icon="arrow-right"
          variant="ghost"
          class="h-6 w-6"
          disabled={!canForward()}
          onClick={goForward}
          aria-label="Forward"
        />
        <button
          class="h-6 w-6 flex items-center justify-center rounded text-text-weak hover:text-text-base hover:bg-surface-subtle"
          onClick={reload}
          aria-label="Reload"
        >
          ↺
        </button>
        <input
          ref={addressInput}
          class="flex-1 min-w-0 px-2 py-0.5 rounded text-13-regular bg-background-base border border-border-weak-base text-text-base focus:outline-none focus:border-border-base"
          value={input()}
          onInput={(e) => setInput(e.currentTarget.value)}
          onKeyDown={handleKey}
        />
        <button
          class="h-6 w-6 flex items-center justify-center rounded text-text-weak hover:text-text-base hover:bg-surface-subtle"
          onClick={pin}
          aria-label="Pin page"
        >
          🔖
        </button>
      </div>
      <iframe
        ref={iframe}
        src={url()}
        class="flex-1 w-full border-none"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  )
}
