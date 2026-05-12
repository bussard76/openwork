import { createSignal } from "solid-js"

const STORAGE_KEY = "openwork-mode"

type Mode = "chat" | "work"

const saved = (localStorage.getItem(STORAGE_KEY) ?? "work") as Mode
const [mode, setModeSignal] = createSignal<Mode>(saved)

export { mode }

export function setMode(next: Mode) {
  setModeSignal(next)
  localStorage.setItem(STORAGE_KEY, next)
}
