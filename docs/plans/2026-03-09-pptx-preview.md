# PPTX Preview Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add read-only PPTX file preview in the Tauri desktop app by converting PPTX→PDF via LibreOffice and rendering through the existing `PdfPreview` component.

**Architecture:** A new Rust Tauri command `convert_pptx_to_pdf_command` in `pptx.rs` calls LibreOffice headless `--convert-to pdf`, reads the resulting PDF bytes, and returns them as a base64 string. The frontend `PptxPreview` SolidJS component decodes the bytes into a blob URL and renders it using the exact same `<iframe>` approach as `PdfPreview`. The file-click handler and tab router are extended with `.pptx` support.

**Tech Stack:** Rust (Tauri command), LibreOffice headless, SolidJS (Solid.js component), Tauri Specta (bindings generation), `@tauri-apps/plugin-fs` (not needed — PDF bytes returned directly from Rust)

---

### Task 1: Create `pptx.rs` — Rust conversion module

**Files:**

- Create: `packages/desktop/src-tauri/src/pptx.rs`

**Context:** Copy the structure from `xlsx.rs`. Key differences:

- Convert `--convert-to pdf` instead of html
- Return `Vec<u8>` (raw bytes), not a `String` — the TS side will decode as base64
- The generated PDF filename has `.pdf` extension

**Step 1: Create the file**

```rust
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::AppHandle;

#[derive(Debug, thiserror::Error)]
pub enum PptxError {
    #[error("LibreOffice not found")]
    LibreOfficeNotFound,
    #[error("Conversion failed: {0}")]
    ConversionFailed(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Output file not found")]
    OutputNotFound,
}

fn find_libreoffice() -> Option<PathBuf> {
    let candidates = if cfg!(target_os = "windows") {
        vec![
            PathBuf::from(r"C:\Program Files\LibreOffice\program\soffice.exe"),
            PathBuf::from(r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"),
        ]
    } else if cfg!(target_os = "macos") {
        vec![
            PathBuf::from("/Applications/LibreOffice.app/Contents/MacOS/soffice"),
            PathBuf::from("/usr/local/bin/soffice"),
            PathBuf::from("/opt/homebrew/bin/soffice"),
        ]
    } else {
        vec![
            PathBuf::from("/usr/bin/soffice"),
            PathBuf::from("/usr/local/bin/soffice"),
        ]
    };

    for path in candidates {
        if path.exists() {
            return Some(path);
        }
    }

    which::which("soffice").ok()
}

pub async fn convert_pptx_to_pdf(_app: &AppHandle, input_path: &str) -> Result<Vec<u8>, PptxError> {
    let soffice = find_libreoffice().ok_or(PptxError::LibreOfficeNotFound)?;

    let input = Path::new(input_path);
    if !input.exists() {
        return Err(PptxError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Input file not found",
        )));
    }

    let tmp = std::env::temp_dir().join(format!("opencode-pptx-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&tmp)?;

    tracing::info!(?input_path, ?tmp, ?soffice, "Converting PPTX to PDF");

    let out = Command::new(&soffice)
        .arg("--headless")
        .arg("--convert-to")
        .arg("pdf")
        .arg("--outdir")
        .arg(&tmp)
        .arg(input)
        .output()?;

    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr);
        tracing::error!(?stderr, "LibreOffice PPTX conversion failed");
        return Err(PptxError::ConversionFailed(stderr.to_string()));
    }

    let stem = input
        .file_stem()
        .ok_or_else(|| PptxError::ConversionFailed("Invalid input filename".to_string()))?;
    let pdf_path = tmp.join(format!("{}.pdf", stem.to_string_lossy()));

    if !pdf_path.exists() {
        tracing::error!(?pdf_path, "Output PDF file not found");
        return Err(PptxError::OutputNotFound);
    }

    let bytes = std::fs::read(&pdf_path)?;
    let _ = std::fs::remove_dir_all(&tmp);

    tracing::info!(pdf_bytes = bytes.len(), "PPTX converted to PDF successfully");
    Ok(bytes)
}

#[tauri::command]
#[specta::specta]
pub async fn convert_pptx_to_pdf_command(app: AppHandle, path: String) -> Result<Vec<u8>, String> {
    convert_pptx_to_pdf(&app, &path)
        .await
        .map_err(|e| e.to_string())
}
```

**Step 2: Verify the file compiles (partial check)**

```bash
cd packages/desktop/src-tauri && cargo check 2>&1 | head -30
```

Expected: errors only about `pptx` module not being declared yet (that's fine — we add it next).

---

### Task 2: Register the module and command in `lib.rs`

**Files:**

- Modify: `packages/desktop/src-tauri/src/lib.rs`

**Step 1: Add `mod pptx;` near the top with the other `mod` declarations**

In `lib.rs` line 13 area (after `mod xlsx;`), add:

```rust
mod pptx;
```

**Step 2: Register the command in the `collect_commands!` macro**

In `lib.rs` around line 409, the list ends with:

```rust
            xlsx::convert_xlsx_to_html_command
```

Add a comma and the new command:

```rust
            xlsx::convert_xlsx_to_html_command,
            pptx::convert_pptx_to_pdf_command
```

**Step 3: Verify it compiles**

```bash
cd packages/desktop/src-tauri && cargo check 2>&1 | head -40
```

Expected: no errors.

**Step 4: Commit**

```bash
git add packages/desktop/src-tauri/src/pptx.rs packages/desktop/src-tauri/src/lib.rs
git commit -m "feat: add convert_pptx_to_pdf_command Rust Tauri command"
```

---

### Task 3: Regenerate TypeScript bindings

**Files:**

- Modify (auto-generated): `packages/desktop/src/bindings.ts`

**Context:** The bindings file is auto-generated by running the Tauri type export test. Look at `lib.rs:418-425` — it exports via `specta_typescript`. The test at `lib.rs:427` (`test_export_types`) runs the export.

**Step 1: Run the export test to regenerate bindings**

```bash
cd packages/desktop/src-tauri && cargo test test_export_types 2>&1
```

Expected: test passes and `packages/desktop/src/bindings.ts` is updated.

**Step 2: Verify the new binding was added**

Open `packages/desktop/src/bindings.ts` and confirm it now contains a line like:

```ts
convertPptxToPdfCommand: (path: string) => __TAURI_INVOKE<number[]>("convert_pptx_to_pdf_command", { path }),
```

(Tauri returns `Vec<u8>` as `number[]` in TypeScript.)

**Step 3: Commit**

```bash
git add packages/desktop/src/bindings.ts
git commit -m "chore: regenerate bindings with convertPptxToPdfCommand"
```

---

### Task 4: Add `PptxPreview` component to `file-tabs.tsx`

**Files:**

- Modify: `packages/app/src/pages/session/file-tabs.tsx`

**Context:** The pattern to follow is `PdfPreview` (lines 195–279). Key differences for PPTX:

- Call `commands.convertPptxToPdfCommand(path)` from the generated bindings (NOT `window.__TAURI__.core.invoke` — this is the AGENTS.md rule)
- The command returns `number[]` (raw bytes); convert to `Uint8Array` then to `Blob`
- Render as PDF in `<iframe>` exactly like `PdfPreview`
- Import `commands` from the bindings file

**Step 1: Add the import for `commands` at the top of the file**

Check if `commands` is already imported. If not, add near the other imports:

```ts
import { commands } from "@/../../desktop/src/bindings"
```

Wait — check how the desktop bindings are imported in the app package. Look for any existing import of the bindings in `file-tabs.tsx` or other files:

```bash
grep -r "bindings" packages/app/src --include="*.ts" --include="*.tsx" -l
```

If not imported anywhere, check `packages/app/tsconfig.json` for path aliases or how `platform.ts` works, since `DocxPreview` uses `platform.openPath` rather than direct Tauri.

**Important:** The existing `XlsxPreview` uses `window.__TAURI__.core.invoke` (which AGENTS.md says to avoid). The correct approach is to use the generated bindings. Check how to import them:

```bash
grep -r "from.*bindings" packages/desktop/src --include="*.ts" --include="*.tsx"
```

The bindings are at `packages/desktop/src/bindings.ts`. Look at how the platform context bridges desktop vs. non-desktop — `usePlatform()` is used in the other components. You may need to add `convertPptxToPdf` to the platform interface rather than import bindings directly. Investigate `packages/app/src/context/platform.ts` before writing the component.

**Step 2: Investigate platform context**

```bash
cat packages/app/src/context/platform.ts
```

Or read it with the Read tool. See if `openPath` is the pattern for how desktop commands are surfaced to app-layer components. If so, add `convertPptxToPdf` to the platform interface and implement it in the desktop platform provider.

**Step 3: Add `PptxPreview` component**

Insert after `PdfPreview` (after line 279), before `export function FileTabContent`:

```tsx
function PptxPreview(props: { path: string }) {
  const platform = usePlatform()
  const language = useLanguage()
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<string>()
  const [pdfUrl, setPdfUrl] = createSignal<string>()

  createEffect(() => {
    const path = props.path

    const load = async () => {
      if (platform.platform !== "desktop") return

      try {
        setLoading(true)
        setError(undefined)

        // Use generated bindings (not window.__TAURI__.core.invoke)
        const { commands } = await import("../../../../../../desktop/src/bindings")
        const bytes = await commands.convertPptxToPdfCommand(path)
        const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" })
        setPdfUrl(URL.createObjectURL(blob))
        setLoading(false)
      } catch (err) {
        console.error("Failed to load PPTX:", err)
        setError(err instanceof Error ? err.message : "Failed to load presentation")
        setLoading(false)
      }
    }

    load()
  })

  onCleanup(() => {
    const url = pdfUrl()
    if (url) URL.revokeObjectURL(url)
  })

  const handleOpen = async () => {
    if (platform.platform !== "desktop") return
    try {
      await platform.openPath?.(props.path)
    } catch (err) {
      console.error("Failed to open PPTX:", err)
      showToast({ variant: "error", title: language.t("toast.file.loadFailed.title") })
    }
  }

  return (
    <div class="h-full flex flex-col">
      <div class="flex items-center justify-between px-6 py-3 border-b border-border-subtle">
        <div class="text-14-semibold text-text-strong">{props.path.split("/").pop()}</div>
        <Button onClick={handleOpen} size="small" variant="primary">
          Open in PowerPoint
        </Button>
      </div>
      <div class="flex-1 overflow-hidden">
        <Show when={loading()}>
          <div class="flex items-center justify-center h-full">
            <div class="text-14-regular text-text-weak">{language.t("common.loading")}...</div>
          </div>
        </Show>
        <Show when={error()}>
          <div class="flex items-center justify-center h-full">
            <div class="text-14-regular text-text-weak">{error()}</div>
          </div>
        </Show>
        <Show when={pdfUrl()}>
          <iframe src={pdfUrl()} class="w-full h-full border-0 pdf-preview" />
        </Show>
      </div>
    </div>
  )
}
```

**Note on the import path:** The dynamic import path for bindings needs to resolve correctly from the app package. Investigate whether the app package can import from desktop's bindings directly, or whether the platform context pattern is the right approach. See Task 4 Step 2 above. Adjust the import path accordingly.

**Step 4: Commit**

```bash
git add packages/app/src/pages/session/file-tabs.tsx
git commit -m "feat: add PptxPreview SolidJS component"
```

---

### Task 5: Wire up `FileTabContent` — add memos and `<Match>` branch

**Files:**

- Modify: `packages/app/src/pages/session/file-tabs.tsx`

**Step 1: Add `isPptx` and `pptxPath` memos**

In `FileTabContent`, after the `isPdf`/`pdfPath` memos (around lines 311–315), add:

```ts
const isPptx = createMemo(() => props.tab.startsWith("pptx://"))
const pptxPath = createMemo(() => {
  if (!isPptx()) return
  return props.tab.slice("pptx://".length)
})
```

**Step 2: Update the `path` memo to include pptx**

Around line 317–322, update:

```ts
const path = createMemo(() => {
  if (isDocx()) return docxPath()
  if (isXlsx()) return xlsxPath()
  if (isPdf()) return pdfPath()
  if (isPptx()) return pptxPath()
  return file.pathFromTab(props.tab)
})
```

**Step 3: Update the `state` memo guard**

Around line 326, update the condition:

```ts
if (isDocx() || isXlsx() || isPdf() || isPptx()) {
```

**Step 4: Add `<Match>` branch in the `<Switch>`**

In the `<Switch>` block (around lines 816–819), add after the PDF match:

```tsx
<Match when={isPptx() && pptxPath()}>{(p) => <PptxPreview path={p()} />}</Match>
```

**Step 5: Commit**

```bash
git add packages/app/src/pages/session/file-tabs.tsx
git commit -m "feat: wire PptxPreview into FileTabContent Switch/Match"
```

---

### Task 6: Update file-click handler in `session-side-panel.tsx`

**Files:**

- Modify: `packages/app/src/pages/session/session-side-panel.tsx`

**Context:** The `handleFileClick` function (lines 109–128) checks for `.docx`, `.xlsx`, `.pdf` and assigns the appropriate protocol. We need to add `.pptx`.

**Step 1: Update the extension check and protocol selection**

Change line 112 from:

```ts
if (lowerPath.endsWith(".docx") || lowerPath.endsWith(".xlsx") || lowerPath.endsWith(".pdf")) {
```

to:

```ts
if (lowerPath.endsWith(".docx") || lowerPath.endsWith(".xlsx") || lowerPath.endsWith(".pdf") || lowerPath.endsWith(".pptx")) {
```

Change line 118 (the protocol assignment) from:

```ts
const protocol = lowerPath.endsWith(".docx") ? "docx://" : lowerPath.endsWith(".xlsx") ? "xlsx://" : "pdf://"
```

to:

```ts
const protocol = lowerPath.endsWith(".docx")
  ? "docx://"
  : lowerPath.endsWith(".xlsx")
    ? "xlsx://"
    : lowerPath.endsWith(".pptx")
      ? "pptx://"
      : "pdf://"
```

**Step 2: Commit**

```bash
git add packages/app/src/pages/session/session-side-panel.tsx
git commit -m "feat: add .pptx extension detection in file-click handler"
```

---

### Task 7: Update `helpers.ts` — skip `file.load()` for `pptx://`

**Files:**

- Modify: `packages/app/src/pages/session/helpers.ts`

**Context:** Line 53 in `helpers.ts` skips calling `file.load()` for special protocol tabs. Add `pptx://` to that guard.

**Step 1: Update the protocol check**

Change line 53 from:

```ts
if (next.startsWith("pdf://") || next.startsWith("docx://") || next.startsWith("xlsx://")) {
```

to:

```ts
if (next.startsWith("pdf://") || next.startsWith("docx://") || next.startsWith("xlsx://") || next.startsWith("pptx://")) {
```

**Step 2: Commit**

```bash
git add packages/app/src/pages/session/helpers.ts
git commit -m "feat: skip file.load() for pptx:// protocol tabs"
```

---

### Task 8: Manual end-to-end verification

**Context:** The Tauri dev server should already be running (PID 86585 from earlier). If not, start it with:

```bash
bun --cwd packages/desktop tauri dev
```

**Step 1: Find or create a test PPTX file**

```bash
# Check if there's one in the repo
find /Users/saschagering/Development/openwork -name "*.pptx" 2>/dev/null | head -5
# Or create a minimal one via LibreOffice
/opt/homebrew/bin/soffice --headless --convert-to pptx /System/Library/CoreServices/SystemVersion.plist --outdir /tmp
```

Or use a known PPTX file on the system.

**Step 2: Open the Tauri app and navigate to a session**

In the Tauri desktop window, start or open a session in a directory containing a `.pptx` file.

**Step 3: Click the `.pptx` file in the file tree**

Expected behavior:

- A new tab opens with `pptx://` prefix
- The tab content shows a loading spinner briefly
- Then renders the presentation as a PDF in an `<iframe>`
- "Open in PowerPoint" button is visible in the header

**Step 4: Check the browser/Tauri console for errors**

In the Tauri webview devtools (right-click → Inspect), check the Console tab for any errors.

**Step 5: If LibreOffice conversion fails**, check:

```bash
/opt/homebrew/bin/soffice --headless --convert-to pdf /path/to/test.pptx --outdir /tmp && ls /tmp/*.pdf
```

---

### Task 9: Investigate and fix the bindings import approach (if needed)

**Context:** Task 4 notes that importing bindings directly from the desktop package into the app package may not work due to package boundaries. This task is a contingency.

**If direct import fails**, use the platform context pattern instead:

**Step 1: Read `packages/app/src/context/platform.ts`**

Look at how `openPath` is typed and implemented. The pattern is typically:

- Interface defined in `packages/app/src/context/platform.ts`
- Desktop implementation in `packages/desktop/src/platform.ts` (or similar)

**Step 2: Add `convertPptxToPdf` to the platform interface**

In `packages/app/src/context/platform.ts`, add to the interface:

```ts
convertPptxToPdf?: (path: string) => Promise<number[]>
```

**Step 3: Implement it in the desktop platform provider**

In the desktop platform implementation file, add:

```ts
convertPptxToPdf: async (path: string) => {
  return commands.convertPptxToPdfCommand(path)
}
```

(importing `commands` from `../bindings`)

**Step 4: Update `PptxPreview` to use `platform.convertPptxToPdf`**

Replace the dynamic import with:

```ts
const bytes = await platform.convertPptxToPdf!(path)
```

**Step 5: Commit all changes**

```bash
git add packages/app/src/context/platform.ts packages/desktop/src/platform.ts packages/app/src/pages/session/file-tabs.tsx
git commit -m "feat: surface convertPptxToPdf via platform context"
```
