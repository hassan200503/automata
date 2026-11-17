# Changelog

All notable changes to **Automata** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2026-11-17

### Fixed

- **First-run setup no longer gets stuck on "Connect Gemini" (step 10 of 11).** Saving a provider API key at that step now finishes the voice guide automatically and drops you straight into the workspace, instead of parking you on the step until you say "continue". A key saved at any other moment keeps the previous behaviour.

### Notes

- Patch release: the renderer fix above is bundled into the installer, so an existing v0.6.0 install needs to download v0.6.1 to pick it up (the app has no auto-updater).
- The Windows installer is unsigned. Windows SmartScreen will warn on first run; verify the SHA-256 in the release notes.

## [0.6.0] - 2026-11-17

### Added

- **A single, modern Voice switch in the sidebar.** Speech is now the default mode of communication and the switch is **on out of the box**. Turning it off is confirmable — voice being the default — and does a full stop: it stops listening, aborts the in-flight reply, stops any speech, rejects a pending action, and keeps answering as text until you switch voice back on.
- **Background operation.** Automata keeps listening, speaking and executing OS commands while the window is hidden or minimised. Closing the window now **minimises to the system tray** instead of quitting; the tray menu offers **Show · Pause/Resume background · Start with Windows · Exit**, and the window is created with `backgroundThrottling: false` so audio, timers and the speech bridge stay alive.
- **Settings → Voice → "Keep working in the background"** checkbox, backed by a new speech setting `listenWhenUnfocused` (default `true`).

### Changed

- **Removed the top-of-stage voice controls** — `Listen`, `Live voice is off`, `Mute` and `Stop everything` no longer exist. The top of **Talk** is now an informational voice-status strip only, and the sidebar switch is the single voice control. The composer's mic button was removed too; its hint now reflects the switch state.
- Default speech settings now start voice-on: `listenWhenUnfocused` defaults to `true` (previously `false`).
- Version bumped to **0.6.0**.

### Fixed

- The Windows application user-model id is now `com.hassantech.automata` (it was still `com.kkc36.companion` from before the rebrand).

### Notes

- Refreshed every screenshot and the demo GIF for the voice-on-by-default shell.
- The Windows installer is unsigned. Windows SmartScreen will warn on first run; verify the SHA-256 in the release notes.

## [0.5.0] - 2026-11-17

### Added

- **Ambient video backdrop.** The whole shell renders over a looping, muted ambient video, with a still-frame poster as the first-paint placeholder and a `prefers-reduced-motion` fallback.
- Repository now ships `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `ROADMAP.md`, `docs/RECIPES.md`, issue/PR templates and a tag-driven release workflow.

### Changed

- **Renamed the product to Automata (by HassanTech)**, formerly "Companion". The installer, window title, tray tooltip, renderer title, app icon, credential store and every user-facing string now carry the Automata brand. The installer is built as `Automata-<version>-x64.exe`.
- **Unified the repository.** The legacy WhatsApp persona bot that lived in the repository root (`src/`, `scripts/`, `data/`, pm2) was removed and the app workspace was promoted to the root. The repository is now a single npm-workspaces monorepo. The removed bot's code is preserved in git history.
- The npm scope changed from `@companion/*` to `@automata/*`.
- Packaging identifiers changed: `productName` `Companion` → `Automata`, `appId` `com.kkc36.companion` → `com.hassantech.automata`.
- The voice helper was renamed from `CompanionVoice` to `AutomataVoice`.
- The CI workflow (`.github/workflows/ci.yml`) now runs from the repository root.

### Fixed

- Relaxed a flaky latency assertion (`simulates latency`) that could fail at 49 ms under the parallel test suite.

### Notes

- Because the app name changed, the credential-store service is now `Automata` (a key saved as `Companion` must be re-entered) and app data lives under `%APPDATA%/Automata` (no migration from `%APPDATA%/Companion`).
- The Windows installer is unsigned. Windows SmartScreen will warn on first run; verify the SHA-256 in the release notes.

## [0.4.0] - 2026-11-17

### Added

- Rebuilt the renderer into a voice-first shell: a persistent left rail (Talk · Setup · Settings), a contextual top bar with status pills, an empty-state hero with one-tap suggestion chips, and a sticky composer.
- A multi-size Windows `.ico` (16–256 px) and a 512 px PNG application icon.

### Changed

- Replaced the design system with a near-black token palette, hairline borders and a single white/silver accent.
- Licence changed from `UNLICENSED` to MIT.

## [0.3.0] - 2026-11-17

### Added

- Combined intelligence: an `EnsembleProvider` that queries every connected model in parallel and returns the strongest answer (`best-of` / `majority` / `fastest`), with an auditable per-run log.
- OS control expanded with `os.power` (shutdown / restart / hibernate) and window geometry (`os.moveWindow`, `os.resizeWindow`).

## [0.2.0] - 2026-10-27

### Added

- Full OS control surface: volume, brightness, media keys, lock/sleep, app switching, window management, process control, text input, clipboard, file operations, web reading and WhatsApp calling.
- Natural-language command router (~30 regex patterns).
- Streaming cognition output, response-cache eviction and conversation-lock cleanup.

[0.6.0]: https://github.com/hassan200503/automata/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/hassan200503/automata/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/hassan200503/automata/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/hassan200503/automata/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/hassan200503/automata/releases/tag/v0.2.0
