# ShrinkIt for Windows

Free, private, client-side image resizer & compressor as a native Windows app.
**Tauri v2 + React 19 + TypeScript + Tailwind CSS v4.** ~5–15 MB installer, no
account, no uploads — every pixel is processed on your device.

This project reuses the [ShrinkIt web app](../shrinkit) engine and UI verbatim
(~70–80% shared code). The desktop shell adds: a native window with a tool
sidebar (no landing page), OS file-drop from Explorer, and a Tauri bundle
(NSIS/MSI) for distribution.

## Tools included

| Tool | Source |
|---|---|
| Image Resizer (batch up to 50, ZIP) | `src/components/react/ShrinkItApp.tsx` |
| Compress to 50KB | `src/tools/target-size/` |
| Compress to 20KB (+ B/W signature mode) | `src/tools/target-size/` |
| Passport Photo Maker | `src/tools/passport/` |
| Social Media Resizer | `src/tools/social/` |
| Quality Comparison slider | `src/tools/compare/` |

## Project structure

```
shrinkit-windows/
├── src/
│   ├── main.tsx / App.tsx        # entry + desktop shell (sidebar, no landing page)
│   ├── components/
│   │   ├── react/                # ← reused from web: Dropzone, SettingsPanel, ResultPanel…
│   │   └── shell/                # NEW: LanguageMenu, ThemeToggle
│   ├── tools/                    # ← reused from web: compare, passport, social, target-size
│   ├── lib/
│   │   ├── image/                # ← reused from web: full engine (pica worker, HEIC, EXIF…)
│   │   ├── i18n.ts               # NEW: adapter reading the same messages/*.json catalogues
│   │   ├── locales.ts            # ← reused from web
│   │   ├── theme.tsx             # NEW: light/dark/system via data-theme (same CSS contract)
│   │   └── desktop.ts            # NEW: OS file-drop bridge (tauri://drag-drop → File[])
│   ├── i18n/messages/            # ← reused from web: en/es/pt (single source of truth)
│   └── styles/global.css         # ← reused from web: Tailwind v4 + design tokens
├── public/                       # ← reused from web: icons, favicons (no og-images, no sw.js)
└── src-tauri/                    # NEW: Tauri v2 shell
    ├── tauri.conf.json           # window, CSP, bundle (NSIS/MSI)
    ├── main.rs                   # minimal: fs plugin for file-drop
    ├── capabilities/default.json # core:default + fs:allow-read-file
    └── icons/                    # generated from public/icons/icon-512.png
```

Files marked ← are copied 1:1 from the web app (relative import paths preserved,
so `../../lib/*` keeps resolving). Only `src/lib/i18n.ts` was rewritten: the web
compiles the catalogues through Paraglide, the desktop app reads the same JSON
directly (identical `{param}` syntax).

**Desktop adaptations** (small, marked with `// Desktop adaptation` comments):
`useTauriFileDrop` in `src/lib/desktop.ts`, wired into all six tools. In Tauri v2
the WebView never receives native `File` objects for OS drops, so drops are read
via the fs plugin and converted to `File`s. No-op in a plain browser.

## Development

Prerequisites: Node 20+, Rust (https://rustup.rs), WebView2 (preinstalled on
Windows 10/11).

```bash
npm install
npm run tauri dev      # Vite on :1420 + Tauri window
```

Plain web preview (no Tauri APIs — file-drop bridge stays inactive):

```bash
npm run dev
```

## Build the installer

```bash
npm run tauri build
```

Produces NSIS (`.exe`) and MSI installers under `src-tauri/target/release/bundle/`.
Code-signing: set up your certificate before public distribution (see Tauri docs).

## Verification status

- [x] `npm run build` (tsc + vite) — must be green before any commit
- [ ] `npm run tauri dev` on Windows — real window, sidebar, all 6 tools
- [ ] OS file-drop from Explorer into each tool
- [ ] `npm run tauri build` — NSIS installer installs, launches, no CSP errors in devtools
- [ ] HEIC decode path (WASM) inside the installed app

> The sandbox has no Rust toolchain and no WebView2, so the Tauri shell itself
> can only be compile-verified on a Windows machine. The frontend bundle is
> fully verified here.

## Roadmap (not in v1)

- Save-dialog instead of anchor download (`@tauri-apps/plugin-dialog`)
- Windows Explorer right-click entry “Resize with ShrinkIt” (NSIS registry keys)
- “Open with ShrinkIt” file association (`fileAssociations` in tauri.conf.json)
- Auto-updater (`@tauri-apps/plugin-updater` + signing)
