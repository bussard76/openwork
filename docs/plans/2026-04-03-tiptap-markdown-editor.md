# Tiptap Markdown Editor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate a WYSIWYG Markdown editor (Tiptap) into the existing tab system. `.md`/`.mdx` files open in **read-only rendered view by default**. An explicit "Edit" button switches the tab into WYSIWYG edit mode. Users can create new Markdown files (saved to project root), edit existing ones, paste/drag images, and use Undo/Redo.

**Architecture:**

- Tiptap Core (headless, no React binding) is wrapped in a SolidJS component in `packages/ui`
- `.md`/`.mdx` files default to read-only rendered view (existing `<Markdown>` component)
- The existing Rendered/Text toggle bar (`lines 1006–1025` in `file-tabs.tsx`) is **replaced** with a new header bar: filename left, `"Edit"` button right — matching the pattern of `DocxPreview`/`XlsxPreview`/`PdfPreview`
- Clicking "Edit" switches a per-tab signal `mdMode` from `"view"` → `"edit"`, which mounts `<MarkdownEditor>` (Tiptap) in place of `<Markdown>`
- In edit mode the header shows a `"Done"` button (or `"View"`) to return to read-only view
- New files skip the read-only step and open directly in edit mode
- File read/write goes through the existing `file` context (`sdk.client.file.read` / `sdk.client.file.write`)
- Images are saved as files relative to the Markdown file and referenced with relative paths
- Undo/Redo is handled entirely by Tiptap's built-in `@tiptap/extension-history` (ProseMirror)
- The "+" button in the tab bar gains a second option: "New Markdown File" which creates a file in the project root

**Decisions:**

- Read-only rendered view by default; explicit "Edit" button activates WYSIWYG mode
- Edit mode is always WYSIWYG (no raw Markdown text editing via Tiptap)
- Returning to view mode auto-saves immediately (no manual save needed)
- New files land in the project root and open directly in edit mode
- Images: Drag & Drop + Paste, stored as relative paths

**Tech Stack:** SolidJS, Tiptap Core, `@tiptap/extension-markdown`, Tailwind CSS v4, Kobalte, existing `file` context

---

### Task 1: Add Tiptap dependencies to `packages/ui`

**Files:**

- Modify: `packages/ui/package.json`

**Step 1: Add the following to `dependencies`**

```json
"@tiptap/core": "^2.11.5",
"@tiptap/pm": "^2.11.5",
"@tiptap/extension-document": "^2.11.5",
"@tiptap/extension-paragraph": "^2.11.5",
"@tiptap/extension-text": "^2.11.5",
"@tiptap/extension-heading": "^2.11.5",
"@tiptap/extension-bold": "^2.11.5",
"@tiptap/extension-italic": "^2.11.5",
"@tiptap/extension-strike": "^2.11.5",
"@tiptap/extension-code": "^2.11.5",
"@tiptap/extension-code-block-lowlight": "^2.11.5",
"@tiptap/extension-blockquote": "^2.11.5",
"@tiptap/extension-bullet-list": "^2.11.5",
"@tiptap/extension-ordered-list": "^2.11.5",
"@tiptap/extension-list-item": "^2.11.5",
"@tiptap/extension-horizontal-rule": "^2.11.5",
"@tiptap/extension-link": "^2.11.5",
"@tiptap/extension-image": "^2.11.5",
"@tiptap/extension-history": "^2.11.5",
"@tiptap/extension-placeholder": "^2.11.5",
"@tiptap/extension-typography": "^2.11.5",
"@tiptap/extension-markdown": "^2.11.5",
"lowlight": "^3.3.0"
```

**Step 2: Install**

```bash
bun install
```

Expected: lockfile updated, no peer dep errors.

**Step 3: Verify Tiptap core resolves**

```bash
cd packages/ui && bun run tsc --noEmit 2>&1 | head -20
```

Expected: no module-not-found errors for `@tiptap/*`.

---

### Task 2: Create `packages/ui/src/components/editor/types.ts`

**Files:**

- Create: `packages/ui/src/components/editor/types.ts`

**Context:** Shared types used by all editor sub-components.

```ts
import type { Editor } from "@tiptap/core"

export type EditorProps = {
  content: string
  onChange: (markdown: string) => void
  placeholder?: string
  autofocus?: boolean
  readonly?: boolean
  class?: string
}

export type EditorInstance = Editor
```

---

### Task 3: Create `packages/ui/src/components/editor/editor.tsx`

**Files:**

- Create: `packages/ui/src/components/editor/editor.tsx`

**Context:** The core SolidJS wrapper around Tiptap. Uses `onMount`/`onCleanup` to manage the Tiptap `Editor` lifecycle. Exposes the editor instance as a signal so child components (toolbar, bubble menu) can react to state changes.

```tsx
import { createSignal, onCleanup, onMount, type JSX } from "solid-js"
import { Editor } from "@tiptap/core"
import Document from "@tiptap/extension-document"
import Paragraph from "@tiptap/extension-paragraph"
import Text from "@tiptap/extension-text"
import Heading from "@tiptap/extension-heading"
import Bold from "@tiptap/extension-bold"
import Italic from "@tiptap/extension-italic"
import Strike from "@tiptap/extension-strike"
import Code from "@tiptap/extension-code"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import Blockquote from "@tiptap/extension-blockquote"
import BulletList from "@tiptap/extension-bullet-list"
import OrderedList from "@tiptap/extension-ordered-list"
import ListItem from "@tiptap/extension-list-item"
import HorizontalRule from "@tiptap/extension-horizontal-rule"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import History from "@tiptap/extension-history"
import Placeholder from "@tiptap/extension-placeholder"
import Typography from "@tiptap/extension-typography"
import { Markdown } from "@tiptap/extension-markdown"
import { common, createLowlight } from "lowlight"
import type { EditorProps } from "./types"

const lowlight = createLowlight(common)

export function TiptapEditor(props: EditorProps): JSX.Element {
  let el: HTMLDivElement | undefined
  const [editor, setEditor] = createSignal<Editor | undefined>()

  onMount(() => {
    const instance = new Editor({
      element: el!,
      autofocus: props.autofocus ?? false,
      editable: !props.readonly,
      extensions: [
        Document,
        Paragraph,
        Text,
        Heading.configure({ levels: [1, 2, 3] }),
        Bold,
        Italic,
        Strike,
        Code,
        CodeBlockLowlight.configure({ lowlight }),
        Blockquote,
        BulletList,
        OrderedList,
        ListItem,
        HorizontalRule,
        Link.configure({ openOnClick: false }),
        Image,
        History.configure({ depth: 100 }),
        Placeholder.configure({ placeholder: props.placeholder ?? "Write something..." }),
        Typography,
        Markdown.configure({ transformPastedText: true, transformCopiedText: true }),
      ],
      content: props.content,
      onUpdate({ editor: e }) {
        props.onChange(e.storage.markdown.getMarkdown())
      },
    })
    setEditor(instance)
  })

  onCleanup(() => editor()?.destroy())

  return (
    <div class={props.class} data-tiptap-root>
      <div ref={el} />
    </div>
  )
}
```

**Note:** `props.content` is intentionally not reactive after mount — content is loaded once when the tab opens. If the content needs to be replaced (e.g. external reload), the component is remounted via the `key` prop in `FileTabContent` (already handled by the existing tab architecture).

---

### Task 4: Create `packages/ui/src/components/editor/toolbar.tsx`

**Files:**

- Create: `packages/ui/src/components/editor/toolbar.tsx`

**Context:** Formatting toolbar rendered above the editor. Uses `editor.isActive()` for active state and `editor.can()` for disabled state. Reactivity is achieved by subscribing to editor's `transaction` event via a SolidJS signal that increments on every transaction.

```tsx
import { createSignal, onCleanup, onMount, Show, type JSX } from "solid-js"
import type { Editor } from "@tiptap/core"
import { IconButton } from "../icon-button"
import { Icon } from "../icon"

type Props = {
  editor: Editor
}

export function EditorToolbar(props: Props): JSX.Element {
  // tick increments on every editor transaction to trigger reactive re-reads
  const [tick, setTick] = createSignal(0)

  onMount(() => {
    const handler = () => setTick((t) => t + 1)
    props.editor.on("transaction", handler)
    onCleanup(() => props.editor.off("transaction", handler))
  })

  const active = (name: string, attrs?: Record<string, unknown>) => {
    tick() // subscribe to updates
    return props.editor.isActive(name, attrs)
  }

  const can = (cmd: () => boolean) => {
    tick()
    return cmd()
  }

  const run = (cmd: () => boolean) => () => cmd()

  return (
    <div class="flex items-center gap-0.5 px-2 py-1 border-b border-border-subtle flex-wrap">
      {/* Undo / Redo */}
      <IconButton
        size="sm"
        variant="ghost"
        disabled={!can(() => props.editor.can().undo())}
        onClick={run(() => props.editor.chain().focus().undo().run())}
        tooltip="Undo (⌘Z)"
      >
        <Icon name="undo" />
      </IconButton>
      <IconButton
        size="sm"
        variant="ghost"
        disabled={!can(() => props.editor.can().redo())}
        onClick={run(() => props.editor.chain().focus().redo().run())}
        tooltip="Redo (⌘⇧Z)"
      >
        <Icon name="redo" />
      </IconButton>

      <div class="w-px h-4 bg-border-subtle mx-1" />

      {/* Headings */}
      <IconButton
        size="sm"
        variant={active("heading", { level: 1 }) ? "soft" : "ghost"}
        onClick={run(() => props.editor.chain().focus().toggleHeading({ level: 1 }).run())}
        tooltip="Heading 1"
      >
        <span class="text-xs font-bold">H1</span>
      </IconButton>
      <IconButton
        size="sm"
        variant={active("heading", { level: 2 }) ? "soft" : "ghost"}
        onClick={run(() => props.editor.chain().focus().toggleHeading({ level: 2 }).run())}
        tooltip="Heading 2"
      >
        <span class="text-xs font-bold">H2</span>
      </IconButton>
      <IconButton
        size="sm"
        variant={active("heading", { level: 3 }) ? "soft" : "ghost"}
        onClick={run(() => props.editor.chain().focus().toggleHeading({ level: 3 }).run())}
        tooltip="Heading 3"
      >
        <span class="text-xs font-bold">H3</span>
      </IconButton>

      <div class="w-px h-4 bg-border-subtle mx-1" />

      {/* Inline formatting */}
      <IconButton
        size="sm"
        variant={active("bold") ? "soft" : "ghost"}
        onClick={run(() => props.editor.chain().focus().toggleBold().run())}
        tooltip="Bold (⌘B)"
      >
        <Icon name="bold" />
      </IconButton>
      <IconButton
        size="sm"
        variant={active("italic") ? "soft" : "ghost"}
        onClick={run(() => props.editor.chain().focus().toggleItalic().run())}
        tooltip="Italic (⌘I)"
      >
        <Icon name="italic" />
      </IconButton>
      <IconButton
        size="sm"
        variant={active("strike") ? "soft" : "ghost"}
        onClick={run(() => props.editor.chain().focus().toggleStrike().run())}
        tooltip="Strikethrough"
      >
        <Icon name="strikethrough" />
      </IconButton>
      <IconButton
        size="sm"
        variant={active("code") ? "soft" : "ghost"}
        onClick={run(() => props.editor.chain().focus().toggleCode().run())}
        tooltip="Inline Code"
      >
        <Icon name="code" />
      </IconButton>

      <div class="w-px h-4 bg-border-subtle mx-1" />

      {/* Block formatting */}
      <IconButton
        size="sm"
        variant={active("bulletList") ? "soft" : "ghost"}
        onClick={run(() => props.editor.chain().focus().toggleBulletList().run())}
        tooltip="Bullet List"
      >
        <Icon name="list-unordered" />
      </IconButton>
      <IconButton
        size="sm"
        variant={active("orderedList") ? "soft" : "ghost"}
        onClick={run(() => props.editor.chain().focus().toggleOrderedList().run())}
        tooltip="Ordered List"
      >
        <Icon name="list-ordered" />
      </IconButton>
      <IconButton
        size="sm"
        variant={active("blockquote") ? "soft" : "ghost"}
        onClick={run(() => props.editor.chain().focus().toggleBlockquote().run())}
        tooltip="Blockquote"
      >
        <Icon name="quote" />
      </IconButton>
      <IconButton
        size="sm"
        variant={active("codeBlock") ? "soft" : "ghost"}
        onClick={run(() => props.editor.chain().focus().toggleCodeBlock().run())}
        tooltip="Code Block"
      >
        <Icon name="code-block" />
      </IconButton>
      <IconButton
        size="sm"
        variant="ghost"
        onClick={run(() => props.editor.chain().focus().setHorizontalRule().run())}
        tooltip="Horizontal Rule"
      >
        <Icon name="separator" />
      </IconButton>
    </div>
  )
}
```

**Note on Icon names:** Check `packages/ui/src/components/icon.tsx` (or the sprite sheet) for valid icon names. Replace icon names above with the closest matching ones found in the existing icon set (e.g. `arrow-counterclockwise` for undo, `arrow-clockwise` for redo, `text-bold`, `text-italic`, etc.).

---

### Task 5: Create `packages/ui/src/components/editor/bubble-menu.tsx`

**Files:**

- Create: `packages/ui/src/components/editor/bubble-menu.tsx`

**Context:** Floating toolbar that appears when text is selected. Uses ProseMirror's `view.coordsAtPos()` to compute absolute screen position. Portals into `document.body` to avoid clipping.

```tsx
import { createSignal, onCleanup, onMount, Show, type JSX } from "solid-js"
import { Portal } from "solid-js/web"
import type { Editor } from "@tiptap/core"
import { IconButton } from "../icon-button"
import { Icon } from "../icon"

type Props = { editor: Editor }

type Pos = { top: number; left: number }

export function BubbleMenu(props: Props): JSX.Element {
  const [pos, setPos] = createSignal<Pos | undefined>()
  const [tick, setTick] = createSignal(0)

  onMount(() => {
    const handler = () => {
      setTick((t) => t + 1)
      const { state, view } = props.editor
      const { selection } = state
      if (selection.empty) {
        setPos(undefined)
        return
      }
      const coords = view.coordsAtPos(selection.from)
      setPos({ top: coords.top - 44, left: coords.left })
    }
    props.editor.on("selectionUpdate", handler)
    props.editor.on("blur", () => setPos(undefined))
    onCleanup(() => {
      props.editor.off("selectionUpdate", handler)
    })
  })

  const active = (name: string) => {
    tick()
    return props.editor.isActive(name)
  }
  const run = (cmd: () => boolean) => () => cmd()

  return (
    <Show when={pos()}>
      {(p) => (
        <Portal>
          <div
            class="fixed z-50 flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-surface-overlay border border-border-subtle shadow-lg"
            style={{ top: `${p().top}px`, left: `${p().left}px` }}
          >
            <IconButton
              size="sm"
              variant={active("bold") ? "soft" : "ghost"}
              onClick={run(() => props.editor.chain().focus().toggleBold().run())}
              tooltip="Bold"
            >
              <Icon name="bold" />
            </IconButton>
            <IconButton
              size="sm"
              variant={active("italic") ? "soft" : "ghost"}
              onClick={run(() => props.editor.chain().focus().toggleItalic().run())}
              tooltip="Italic"
            >
              <Icon name="italic" />
            </IconButton>
            <IconButton
              size="sm"
              variant={active("strike") ? "soft" : "ghost"}
              onClick={run(() => props.editor.chain().focus().toggleStrike().run())}
              tooltip="Strikethrough"
            >
              <Icon name="strikethrough" />
            </IconButton>
            <IconButton
              size="sm"
              variant={active("code") ? "soft" : "ghost"}
              onClick={run(() => props.editor.chain().focus().toggleCode().run())}
              tooltip="Inline Code"
            >
              <Icon name="code" />
            </IconButton>
          </div>
        </Portal>
      )}
    </Show>
  )
}
```

---

### Task 6: Create `packages/ui/src/components/editor/slash-menu.tsx`

**Files:**

- Create: `packages/ui/src/components/editor/slash-menu.tsx`

**Context:** Notion-like "/" command menu. Implemented as a Tiptap `Extension` that intercepts `/` at the start of an empty paragraph, shows a filtered list of block types, and executes the chosen block command on selection. The menu UI is a SolidJS component rendered via a Portal.

The extension communicates with the UI component through a shared reactive signal store.

```tsx
import { createSignal, For, onCleanup, Show, type JSX } from "solid-js"
import { Portal } from "solid-js/web"
import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import type { Editor } from "@tiptap/core"

// Block command definitions
const BLOCKS = [
  {
    id: "paragraph",
    label: "Text",
    desc: "Plain paragraph",
    icon: "text",
    cmd: (e: Editor) => e.chain().focus().setParagraph().run(),
  },
  {
    id: "h1",
    label: "Heading 1",
    desc: "Large section heading",
    icon: "h1",
    cmd: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    label: "Heading 2",
    desc: "Medium section heading",
    icon: "h2",
    cmd: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    label: "Heading 3",
    desc: "Small section heading",
    icon: "h3",
    cmd: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bulletList",
    label: "Bullet List",
    desc: "Unordered list",
    icon: "list-bullet",
    cmd: (e: Editor) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "orderedList",
    label: "Ordered List",
    desc: "Numbered list",
    icon: "list-number",
    cmd: (e: Editor) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "blockquote",
    label: "Quote",
    desc: "Blockquote",
    icon: "quote",
    cmd: (e: Editor) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "codeBlock",
    label: "Code Block",
    desc: "Code with syntax highlighting",
    icon: "code",
    cmd: (e: Editor) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "hr",
    label: "Divider",
    desc: "Horizontal rule",
    icon: "minus",
    cmd: (e: Editor) => e.chain().focus().setHorizontalRule().run(),
  },
]

type MenuState = {
  open: boolean
  query: string
  pos: { top: number; left: number }
  selected: number
}

// Factory: returns the Extension + the JSX component (sharing state via closures)
export function createSlashMenu(editor: () => Editor | undefined) {
  const [state, setState] = createSignal<MenuState>({
    open: false,
    query: "",
    pos: { top: 0, left: 0 },
    selected: 0,
  })

  const filtered = () => {
    const q = state().query.toLowerCase()
    return q ? BLOCKS.filter((b) => b.label.toLowerCase().includes(q) || b.desc.toLowerCase().includes(q)) : BLOCKS
  }

  const close = () => setState((s) => ({ ...s, open: false, query: "" }))

  const select = (idx: number) => {
    const block = filtered()[idx]
    if (!block || !editor()) return
    close()
    // Delete the "/" character before inserting the block
    editor()!
      .chain()
      .focus()
      .deleteRange({
        from: editor()!.state.selection.from - 1 - state().query.length,
        to: editor()!.state.selection.from,
      })
      .run()
    block.cmd(editor()!)
  }

  // Tiptap Extension that hooks into keydown events
  const SlashExtension = Extension.create({
    name: "slashMenu",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("slashMenu"),
          props: {
            handleKeyDown(view, event) {
              const s = state()
              if (s.open) {
                if (event.key === "ArrowDown") {
                  setState((prev) => ({ ...prev, selected: Math.min(prev.selected + 1, filtered().length - 1) }))
                  return true
                }
                if (event.key === "ArrowUp") {
                  setState((prev) => ({ ...prev, selected: Math.max(prev.selected - 1, 0) }))
                  return true
                }
                if (event.key === "Enter") {
                  select(s.selected)
                  return true
                }
                if (event.key === "Escape") {
                  close()
                  return true
                }
                return false
              }
              return false
            },
            handleTextInput(view, from, _to, text) {
              if (text !== "/") return false
              // Only trigger at start of empty line
              const { $from } = view.state.selection
              if ($from.parentOffset !== 0) return false
              const coords = view.coordsAtPos(from)
              setState({ open: true, query: "", pos: { top: coords.bottom + 4, left: coords.left }, selected: 0 })
              return false // let the "/" be inserted normally
            },
          },
        }),
      ]
    },
  })

  // Subscribe to editor updates to track query string after "/"
  const onUpdate = ({ editor: e }: { editor: Editor }) => {
    if (!state().open) return
    const { $from } = e.state.selection
    const text = $from.parent.textContent
    const slashIdx = text.lastIndexOf("/")
    if (slashIdx === -1) {
      close()
      return
    }
    setState((s) => ({ ...s, query: text.slice(slashIdx + 1), selected: 0 }))
  }

  // JSX Menu Component
  function SlashMenuUI(): JSX.Element {
    return (
      <Show when={state().open && filtered().length > 0}>
        <Portal>
          <div
            class="fixed z-50 w-64 rounded-lg bg-surface-overlay border border-border-subtle shadow-xl overflow-hidden"
            style={{ top: `${state().pos.top}px`, left: `${state().pos.left}px` }}
          >
            <For each={filtered()}>
              {(block, i) => (
                <button
                  class={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-hover transition-colors ${i() === state().selected ? "bg-surface-hover" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    select(i())
                  }}
                  onMouseEnter={() => setState((s) => ({ ...s, selected: i() }))}
                >
                  <span class="text-13-medium text-text-strong">{block.label}</span>
                  <span class="text-12-regular text-text-weak">{block.desc}</span>
                </button>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    )
  }

  return { SlashExtension, SlashMenuUI, onUpdate }
}
```

**Usage in `editor.tsx`:** Call `createSlashMenu(() => editor())` in the component, add `SlashExtension` to the extensions array, register `onUpdate` in the editor's `onUpdate` callback, and render `<SlashMenuUI />` alongside the editor div.

---

### Task 7: Create `packages/ui/src/components/editor/image-handler.ts`

**Files:**

- Create: `packages/ui/src/components/editor/image-handler.ts`

**Context:** Handles paste and drag-and-drop of images into the editor. Images are uploaded via the file context's write API and inserted as relative `![](./images/filename.ext)` markdown references.

The handler is a factory that receives callbacks for writing the file and getting the current document path. It returns a Tiptap `Extension`.

```ts
import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"

type Options = {
  // absolute path of the markdown file being edited
  docPath: () => string
  // write a file and return the relative path from docPath
  writeImage: (filename: string, data: ArrayBuffer, mime: string) => Promise<string>
}

export function createImageHandler(opts: Options) {
  return Extension.create({
    name: "imageHandler",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("imageHandler"),
          props: {
            handlePaste(_view, event) {
              const items = Array.from(event.clipboardData?.items ?? [])
              const img = items.find((i) => i.type.startsWith("image/"))
              if (!img) return false
              event.preventDefault()
              img.getAsFile() && handleFile(this, img.getAsFile()!)
              return true
            },
            handleDrop(_view, event) {
              const files = Array.from(event.dataTransfer?.files ?? [])
              const img = files.find((f) => f.type.startsWith("image/"))
              if (!img) return false
              event.preventDefault()
              handleFile(this, img)
              return true
            },
          },
        }),
      ]

      async function handleFile(plugin: Plugin, file: File) {
        const buf = await file.arrayBuffer()
        const ext = file.type.split("/")[1] ?? "png"
        const name = `${Date.now()}.${ext}`
        const rel = await opts.writeImage(name, buf, file.type)
        // Insert image node — the editor instance is accessed via plugin's spec (workaround: use a closure)
        // The actual editor.chain().insertContent() call must be done via a stored editor ref
        // See note below.
      }
    },
  })
}
```

**Note on editor access inside the plugin:** ProseMirror plugins do not have direct access to the Tiptap `Editor` instance. The recommended pattern is to store the editor reference in the Extension's `storage` and access it via `this.editor` within `addProseMirrorPlugins`. The actual implementation should use `this.editor.chain().focus().setImage({ src: rel }).run()` after the upload completes.

**Image write logic** (in `MarkdownEditor` component, see Task 9):

- Parse the directory from `docPath()` (e.g. `/project/docs/readme.md` → `/project/docs/`)
- Write the image to `{dir}/images/{name}` via `sdk.client.file.write()`
- Return `./images/{name}` as the relative path inserted into Markdown

---

### Task 8: Create `packages/ui/src/components/editor/index.tsx`

**Files:**

- Create: `packages/ui/src/components/editor/index.tsx`

**Context:** Public re-export of the editor components for use by `packages/app`.

```ts
export { TiptapEditor } from "./editor"
export { EditorToolbar } from "./toolbar"
export { BubbleMenu } from "./bubble-menu"
export { createSlashMenu } from "./slash-menu"
export { createImageHandler } from "./image-handler"
export type { EditorProps, EditorInstance } from "./types"
```

Also add the export to `packages/ui/src/index.ts` (or wherever the package's public exports are declared):

```ts
export * from "./components/editor"
```

---

### Task 9: Create `MarkdownEditor` component in `packages/app`

**Files:**

- Create: `packages/app/src/pages/session/markdown-editor.tsx`

**Context:** This is the app-layer wrapper component. It glues together the `TiptapEditor` from `@opencode-ai/ui` with the file context (read/write/dirty state). It is rendered by `FileTabContent` in place of the read-only `<Markdown>` component for `.md`/`.mdx` files.

```tsx
import { createEffect, createSignal, onCleanup, Show, type JSX } from "solid-js"
import { TiptapEditor, EditorToolbar, BubbleMenu, createSlashMenu, createImageHandler } from "@opencode-ai/ui/editor"
import type { EditorInstance } from "@opencode-ai/ui/editor"
import { useFile } from "~/context/file"
import { useSDK } from "~/context/sdk"
import path from "path-browserify" // or use manual string splitting

type Props = {
  tab: string // the file:// tab URI
  path: string // relative file path, e.g. "docs/readme.md"
}

export function MarkdownEditor(props: Props): JSX.Element {
  const file = useFile()
  const sdk = useSDK()

  const [editor, setEditor] = createSignal<EditorInstance | undefined>()
  const [dirty, setDirty] = createSignal(false)
  const [saving, setSaving] = createSignal(false)

  // Initial content from file context (loaded before this component mounts)
  const initial = () => file.get(props.path)?.content?.content ?? ""

  const save = async (markdown: string) => {
    setSaving(true)
    await sdk.client.file.write({ path: props.path, content: markdown })
    setSaving(false)
    setDirty(false)
  }

  // Debounced auto-save
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  const onChange = (markdown: string) => {
    setDirty(true)
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => save(markdown), 500)
  }
  onCleanup(() => clearTimeout(saveTimer))

  // Image upload handler
  const writeImage = async (name: string, data: ArrayBuffer, _mime: string): Promise<string> => {
    const dir = props.path.includes("/") ? props.path.slice(0, props.path.lastIndexOf("/") + 1) : ""
    const imgPath = `${dir}images/${name}`
    await sdk.client.file.write({ path: imgPath, content: btoa(String.fromCharCode(...new Uint8Array(data))) })
    return `./images/${name}`
  }

  const { SlashExtension, SlashMenuUI, onUpdate: slashUpdate } = createSlashMenu(() => editor())
  const imageExtension = createImageHandler({ docPath: () => props.path, writeImage })

  return (
    <div class="flex flex-col h-full">
      <Show when={editor()}>
        {(e) => (
          <>
            <EditorToolbar editor={e()} />
            <BubbleMenu editor={e()} />
            <SlashMenuUI />
          </>
        )}
      </Show>

      <div class="flex-1 overflow-y-auto">
        <TiptapEditor
          content={initial()}
          onChange={onChange}
          placeholder="Start writing..."
          autofocus
          class="h-full px-8 py-6 max-w-3xl mx-auto"
          extraExtensions={[SlashExtension, imageExtension]}
          onEditorReady={setEditor}
          onUpdate={slashUpdate}
        />
      </div>

      {/* Save indicator */}
      <div class="absolute bottom-2 right-4 text-11-regular text-text-weak pointer-events-none">
        <Show when={saving()}>Saving…</Show>
        <Show when={!saving() && !dirty()}>Saved</Show>
      </div>
    </div>
  )
}
```

**Note:** The `TiptapEditor` component needs two additional props added in Task 3:

- `extraExtensions?: Extension[]` — merged into the extensions array on mount
- `onEditorReady?: (editor: Editor) => void` — called after `new Editor(...)` in `onMount`
- `onUpdate?: (ctx: { editor: Editor }) => void` — additional update callback (called alongside the internal `onChange`)

Update `editor.tsx` (Task 3) accordingly.

---

### Task 10: Extend `file` context with `isDirty` signal

**Files:**

- Modify: `packages/app/src/context/file.tsx`

**Context:** The `SortableTab` component (tab label) needs to know whether a file has unsaved changes to show the `•` dirty indicator. A simple reactive map of `path → boolean` is added to the file context.

**Step 1: Add dirty state to the file store**

In `file.tsx`, add to the store shape:

```ts
dirty: {} as Record<string, boolean>
```

**Step 2: Add `setDirty` and `isDirty` to the context value**

```ts
setDirty(path: string, val: boolean) {
  setStore("dirty", path, val)
},
isDirty(path: string) {
  return store.dirty[path] ?? false
},
```

**Step 3: Export the new methods from the context**

Ensure `useFile()` returns `setDirty` and `isDirty`.

**Step 4: Update `MarkdownEditor` (Task 9)**

Replace the local `dirty` signal with calls to `file.setDirty(props.path, true/false)`.

---

### Task 11: Show dirty indicator in `SortableTab`

**Files:**

- Modify: `packages/app/src/components/session/session-sortable-tab.tsx`

**Context:** The tab label currently shows only the file icon and basename. When a file is dirty (unsaved), prefix the filename with `•` — the conventional IDE pattern.

**Step 1: Import `useFile` and read `isDirty`**

```tsx
import { useFile } from "~/context/file"

// inside SortableTab component:
const file = useFile()
const dirty = () => file.isDirty(/* derive path from props.tab */)
```

**Step 2: Derive path from tab value**

```ts
const filePath = () => file.pathFromTab(props.tab)
const dirty = () => (filePath() ? file.isDirty(filePath()!) : false)
```

**Step 3: Prepend `•` to the displayed filename**

```tsx
<span>
  {dirty() ? "• " : ""}
  {basename}
</span>
```

---

### Task 12: Wire Markdown view/edit modes into `FileTabContent`

**Files:**

- Modify: `packages/app/src/pages/session/file-tabs.tsx`

**Context:** `FileTabContent` currently renders an existing Rendered/Text toggle bar (lines 1006–1025) and a `<Match>` for rendered markdown (lines 1068–1072). This task replaces that entire header + both render branches with a new view/edit system.

**Step 1: Import `MarkdownEditor`**

```tsx
import { MarkdownEditor } from "./markdown-editor"
```

**Step 2: Add a per-tab `mdMode` signal**

Inside `FileTabContent`, add after the existing `mdView` signal (line ~517):

```ts
// Replace the existing mdView signal entirely:
// const [mdView, setMdView] = createSignal<"text" | "rendered">("rendered")
// with:
const [mdMode, setMdMode] = createSignal<"view" | "edit">("view")
```

**Step 3: Replace the existing markdown toolbar (lines 1006–1025)**

Remove the current Rendered/Text toggle bar:

```tsx
// DELETE this entire block:
<Show when={isMarkdown() && state()?.loaded}>
  <div class="shrink-0 flex gap-1 px-3 py-1.5 border-b border-border-subtle">
    <button onClick={() => setMdView("rendered")} ...>Rendered</button>
    <button onClick={() => setMdView("text")} ...>Text</button>
  </div>
</Show>
```

Replace with the new header bar — matching the `DocxPreview`/`PdfPreview` header pattern exactly:

```tsx
<Show when={isMarkdown() && state()?.loaded}>
  <div class="shrink-0 flex items-center justify-between px-6 py-3 border-b border-border-subtle">
    <span class="text-14-semibold text-text-strong">{path()?.split("/").pop()}</span>
    <Show
      when={mdMode() === "view"}
      fallback={
        <Button size="small" variant="ghost" onClick={() => setMdMode("view")}>
          <Icon name="check" />
          Done
        </Button>
      }
    >
      <Button size="small" variant="ghost" onClick={() => setMdMode("edit")}>
        <Icon name="pencil-line" />
        Edit
      </Button>
    </Show>
  </div>
</Show>
```

**Step 4: Update the Markdown `<Match>` branch (lines 1068–1072)**

Replace the single rendered match with two conditional branches:

```tsx
{
  /* View mode — read-only rendered Markdown */
}
;<Match when={state()?.loaded && isMarkdown() && mdMode() === "view"}>
  <div class="px-6 py-4 pb-40">
    <Markdown text={contents()} class="text-14-regular" />
  </div>
</Match>

{
  /* Edit mode — Tiptap WYSIWYG editor */
}
;<Match when={state()?.loaded && isMarkdown() && mdMode() === "edit" && path()}>
  {(_) => <MarkdownEditor tab={props.tab} path={path()!} onDone={() => setMdMode("view")} />}
</Match>
```

The old `<Match when={state()?.loaded && isMarkdown() && mdView() === "text"}>` (raw text view) is removed — raw text editing is now handled by Tiptap in edit mode. The generic code viewer `<Match when={state()?.loaded}>` below still handles all non-markdown text files unchanged.

**Step 5: Reset `mdMode` to `"view"` when the tab path changes**

Add a `createEffect` so switching to a different file always starts in view mode:

```ts
createEffect(() => {
  path() // track path changes
  setMdMode("view")
})
```

**Step 6: New files open directly in edit mode**

In `MarkdownEditor` (Task 9), add a prop `initialMode?: "view" | "edit"`. When `DialogNewMarkdown` opens a newly created file, pass `initialMode="edit"` via a query parameter or a dedicated signal in the file context. The simplest approach: after `tabs().open(tab)` in `DialogNewMarkdown`, set a one-shot flag in a `Set<string>` in the file context (`file.markAsNew(path)`). In `FileTabContent`, check `file.isNew(path())` and initialize `mdMode` to `"edit"` if true, then clear the flag.

**Step 7: Verify the existing auto-load effect still fires**

In `session.tsx` (lines 365–371), the effect that calls `file.load(path)` when a tab becomes active will still run for `.md` files — this is correct, as both `<Markdown>` (view) and `<MarkdownEditor>` (edit) read initial content from the file context.

---

### Task 13: Add "New Markdown File" option to the "+" button

**Files:**

- Modify: `packages/app/src/pages/session/session-side-panel.tsx`
- Create: `packages/app/src/pages/session/dialog-new-markdown.tsx`

**Context:** The existing `+` button opens `DialogSelectFile`. It should now offer a second option: creating a new `.md` file. The simplest UX is a `DropdownMenu` replacing the plain `+` button.

**Step 1: Create `dialog-new-markdown.tsx`**

```tsx
import { createSignal, type JSX } from "solid-js"
import { Dialog, TextField, Button } from "@opencode-ai/ui"
import { useSDK } from "~/context/sdk"
import { useLayout } from "~/context/layout"
import { useFile } from "~/context/file"

type Props = {
  open: boolean
  onClose: () => void
  sessionKey: string
  projectRoot: string
}

export function DialogNewMarkdown(props: Props): JSX.Element {
  const sdk = useSDK()
  const layout = useLayout()
  const file = useFile()
  const [name, setName] = createSignal("untitled.md")
  const [error, setError] = createSignal<string>()

  const create = async () => {
    const n = name().trim()
    if (!n) {
      setError("File name is required")
      return
    }
    const filename = n.endsWith(".md") || n.endsWith(".mdx") ? n : `${n}.md`
    const path = filename // project root: no directory prefix

    await sdk.client.file.write({ path, content: "" })
    const tab = file.tab(path)
    await layout.tabs(props.sessionKey).open(tab)
    props.onClose()
  }

  return (
    <Dialog open={props.open} onOpenChange={(v) => !v && props.onClose()}>
      <Dialog.Content>
        <Dialog.Header>New Markdown File</Dialog.Header>
        <TextField
          label="File name"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          error={error()}
          autofocus
        />
        <Dialog.Footer>
          <Button variant="ghost" onClick={props.onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={create}>
            Create
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  )
}
```

**Step 2: Replace the `+` `IconButton` in `session-side-panel.tsx` with a `DropdownMenu`**

```tsx
<DropdownMenu>
  <DropdownMenu.Trigger as={IconButton} size="sm" variant="ghost" tooltip="Add tab">
    <Icon name="plus" />
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onSelect={() => setSelectFileOpen(true)}>
      Open File…
    </DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => setNewMarkdownOpen(true)}>
      New Markdown File
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>

<DialogSelectFile open={selectFileOpen()} onClose={() => setSelectFileOpen(false)} ... />
<DialogNewMarkdown open={newMarkdownOpen()} onClose={() => setNewMarkdownOpen(false)} ... />
```

---

### Task 14: Add editor CSS to `packages/ui`

**Files:**

- Create or modify: `packages/ui/src/styles/editor.css` (imported in editor component)

**Context:** Tiptap renders plain HTML in the `[data-tiptap-root]` container. Style the output to match the existing `<Markdown>` typography using Tailwind v4 utilities directly as CSS rules (no `@tailwindcss/typography` plugin needed).

```css
[data-tiptap-root] .tiptap {
  outline: none;
  min-height: 100%;

  h1 {
    @apply text-3xl font-bold mb-4 mt-6 text-text-strong;
  }
  h2 {
    @apply text-2xl font-semibold mb-3 mt-5 text-text-strong;
  }
  h3 {
    @apply text-xl font-semibold mb-2 mt-4 text-text-strong;
  }
  p {
    @apply text-base leading-7 mb-3 text-text;
  }

  strong {
    @apply font-semibold;
  }
  em {
    @apply italic;
  }
  s {
    @apply line-through;
  }
  code {
    @apply font-mono text-sm bg-surface-code px-1 py-0.5 rounded text-text-code;
  }

  pre {
    @apply bg-surface-code rounded-lg p-4 my-4 overflow-x-auto;
    code {
      @apply bg-transparent p-0;
    }
  }

  blockquote {
    @apply border-l-2 border-border-accent pl-4 italic text-text-weak my-4;
  }

  ul {
    @apply list-disc pl-6 mb-3 space-y-1;
  }
  ol {
    @apply list-decimal pl-6 mb-3 space-y-1;
  }

  hr {
    @apply border-border-subtle my-6;
  }

  a {
    @apply text-text-link underline underline-offset-2 hover:text-text-link-hover;
  }

  img {
    @apply max-w-full rounded my-4;
  }

  /* Placeholder */
  p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    @apply text-text-placeholder pointer-events-none float-left h-0;
  }
}
```

Import this CSS file at the top of `editor.tsx`:

```ts
import "./editor.css"
```

---

### Task 15: End-to-end verification

**Step 1: Build the UI package**

```bash
cd packages/ui && bun run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

**Step 2: Build the app package**

```bash
cd packages/app && bun run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

**Step 3: Start the dev server**

```bash
bun --cwd packages/desktop tauri dev
```

**Step 4: Test — open an existing `.md` file**

1. Open a session in a project containing a `.md` file
2. Click the file in the file tree
3. Expected: tab opens in **read-only view**, header shows filename left + "Edit" button (pencil icon) right

**Step 5: Test — view/edit toggle**

1. Click "Edit" button in the header
2. Expected: Tiptap WYSIWYG editor appears, header switches to "Done" button, toolbar visible
3. Type something → `•` prefix appears in tab label
4. Click "Done" → back to read-only rendered view, content saved
5. Switch to another tab and back → resets to view mode

**Step 6: Test — edit and auto-save**

1. Enter edit mode, type in the editor
2. Wait 500ms
3. Expected: "Saving…" → "Saved" indicator, `•` prefix disappears from tab

**Step 6: Test — Undo/Redo**

1. Type some text
2. Press `Cmd+Z` → text undone
3. Press `Cmd+Shift+Z` → text redone
4. Click Undo/Redo buttons in toolbar → same behavior
5. Expected: history is scoped per file (switching tabs resets history for that file)

**Step 7: Test — Slash menu**

1. In an empty line, type `/`
2. Expected: slash menu appears with block list
3. Type `h` → list filters to Heading items
4. Press Enter → H1 block inserted, "/" removed

**Step 8: Test — image paste**

1. Copy an image to clipboard (screenshot)
2. Paste into editor
3. Expected: image saved to `./images/<timestamp>.png` relative to the `.md` file, `![](./images/...)` inserted

**Step 9: Test — create new Markdown file**

1. Click `+` button in tab bar
2. Select "New Markdown File"
3. Enter name `test-notes`
4. Click Create
5. Expected: `test-notes.md` created in project root, new tab opens with empty editor

**Step 10: Test — bubble menu**

1. Select some text with the mouse
2. Expected: floating toolbar appears above selection
3. Click Bold → text becomes bold, bubble menu updates active state
