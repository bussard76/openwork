<p align="center">
  <picture>
    <source srcset="packages/identity/mark-512x512.png" media="(prefers-color-scheme: dark)">
    <source srcset="packages/identity/mark-512x512-light.png" media="(prefers-color-scheme: light)">
    <img src="packages/identity/mark-512x512.png" alt="OpenWork logo" width="80">
  </picture>
</p>
<h1 align="center">OpenWork</h1>
<p align="center">Your AI work client for the everyday office worker.</p>
<p align="center">
  Work with <strong>MS Office files</strong> · chat against <strong>live internet knowledge</strong> · use <strong>MCPs</strong> and <strong>Skills</strong> without any setup friction.
</p>
<p align="center">Think of it as Claude for Work — but open source, provider-agnostic, and fully customizable.</p>

[![OpenWork Screenshot](packages/web/src/assets/lander/screenshot.png)](https://opencode.ai)

---

### Running the Desktop App (macOS)

OpenWork is currently in early development — there are no pre-built binaries yet. To run it locally:

**Prerequisites:** Rust toolchain required. Install via [rustup](https://rustup.rs/):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Start the app:**

```bash
git clone https://gitlabci.exxeta.info/sage/openwork.git
cd openwork
bun install
TAURI_ENV_TARGET_TRIPLE=aarch64-apple-darwin bun run --cwd packages/desktop tauri dev
```

Use `x86_64-apple-darwin` instead if you're on Intel Mac.

On first run, this builds the `opencode` binary from source — expect a few minutes. After that the Tauri window opens automatically.

---

### What is OpenWork?

OpenWork is built on the open-source [OpenCode](https://opencode.ai) engine. Where OpenCode targets developers in the terminal, OpenWork targets anyone who works with documents, spreadsheets, and presentations:

- **MS Office integration** — open, preview, and work with Word (`.docx`), Excel (`.xlsx`), and PowerPoint (`.pptx`) directly in the client
- **Internet-grounded chat** — built-in web search keeps answers current
- **MCPs** — connect any Model Context Protocol server without configuration friction
- **Skills** — reusable AI workflows that automate repetitive office tasks
- **Provider-agnostic** — works with Claude, OpenAI, Google, or local models

---

### Contributing

If you're interested in contributing, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

---

**Join our community** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
