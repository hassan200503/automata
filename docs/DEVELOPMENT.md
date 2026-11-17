# Automata — Developer Documentation

Automata is a Windows-first, voice-first personal AI companion by HassanTech. The repository is a single npm-workspaces monorepo; this guide covers building, running and releasing it. For installation, features and screenshots see the [repository root README](../README.md).

## Project Structure

```
automata/
├── apps/desktop/          # Electron desktop application
│   ├── src/main/          # Main process (Node.js)
│   ├── src/renderer/      # Renderer process (React)
│   ├── src/preload/       # Preload script (IPC bridge)
│   ├── resources/         # Icons, assets, the voice helper
│   └── package.json       # Desktop app config + electron-builder config
├── packages/core/         # Framework-neutral TypeScript core
│   ├── conversation/      # Conversation engine
│   ├── cognition/         # Layered prompt compilation + decision orchestrator
│   ├── tools/             # Tool registry and executor
│   ├── os-control/        # Windows OS-control tools
│   ├── learning/          # Learning engine
│   ├── security/          # Security infrastructure
│   ├── storage/           # SQLCipher storage + credential store
│   ├── voice/             # Voice integration
│   └── ...                # More modules
├── docs/                  # Spec, state, security and verification docs
└── .github/               # CI and release workflows, issue/PR templates
```

## Quick Start

```bash
# From the repository root
npm install          # install workspaces

npm start            # run in development
npm run build        # build main, preload, supervisor and renderer bundles

npm run package      # produce a Windows NSIS installer
```

## Testing

```bash
npm test             # vitest (all workspaces)

npm run typecheck    # tsc --noEmit
npm run lint         # eslint .

npm run verify       # lint + typecheck + test + build
```

## Documentation

- [Main README](../README.md) — complete project documentation
- [Recipes](RECIPES.md) — 10 concrete things to try
- [Agent Brief](AGENT_BRIEF.md) — system specification
- [Project State](PROJECT_STATE.md) — implementation status
- [Secure Setup](SECURE_SETUP.md) — credential configuration
- [Enterprise Ready](ENTERPRISE_READY.md) — production checklist

## Development

Automata is built as a monorepo with workspaces:

- **@automata/desktop** — Electron desktop app
- **@automata/core** — framework-neutral core TypeScript packages

All packages are linked together via npm workspaces; `npm run verify` runs from the repository root.

## Release

To create a new release:

1. Update the version in the root `package.json`, `apps/desktop/package.json`, `packages/core/package.json`, and the `@automata/core` dependency range in `apps/desktop/package.json`.
2. Run `npm run verify` to confirm lint, typecheck, tests and the build are green.
3. Run `npm run package` to build the installer — it is written to `apps/desktop/release/`.
4. Upload `apps/desktop/release/Automata-<version>-x64.exe` to GitHub Releases with its SHA-256.
5. Update the version badge and download link in the root README, and add a `CHANGELOG.md` entry.

The current version is **0.5.0**, producing `Automata-0.5.0-x64.exe`.

Releases are also automated: pushing a `v*` tag (or running the **Release** workflow manually from the Actions tab) builds the installer on `windows-latest` and attaches it to a GitHub Release. See [`.github/workflows/release.yml`](../.github/workflows/release.yml).

---

For the complete user guide, installation instructions, and feature documentation, see the [main repository README](../README.md).

## License

Released under the [MIT License](../LICENSE).

Copyright (c) 2026 HassanTech.
