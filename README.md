# Companion AI — Enterprise-Grade Windows Automation Assistant

<div align="center">

![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)
![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.5.0-green.svg)
![Electron](https://img.shields.io/badge/electron-45-9BE349.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue.svg)
![Tests](https://img.shields.io/badge/tests-515%20passing-brightgreen.svg)
![Files](https://img.shields.io/badge/test%20files-66-brightgreen.svg)
![Build](https://img.shields.io/badge/build-passing-success.svg)

**A voice-first, autonomous Windows desktop assistant with full OS control, AI reasoning, and enterprise-grade security.**

[![Download](https://img.shields.io/badge/download-v0.2.0-brightgreen.svg)](https://github.com/hassan200503/personal-companion-bot/releases/tag/v0.2.0)

</div>

---

## Overview

Companion AI is a production-ready Windows desktop application that gives you 95% PC automation through natural language and voice. Built on Electron 45, React 19, and TypeScript 5, it combines an AI reasoning engine with direct OS control tools — so you can tell it to play a song by name, browse and read web pages aloud, manage files, control system settings, open WhatsApp and call people by name, and carry on intelligent conversations about your ideas, stories, and plans.

The bot thinks and reasons for itself using a multi-layer cognition system (L0–L7 prompt layers, DecisionOrchestrator, style normalizer). It learns from every interaction through episode logging, behavioral consolidation, and recipe learning. Every action passes through a risk-classified policy engine with audit logging, confirmation flows, and an emergency stop.

### What's New in v0.2.0

- **29 new OS control tools** — volume, brightness, media keys, lock/sleep, app switching, window management, process control, text input, clipboard, file operations, web page reading, WhatsApp calling
- **Natural language command router** — ~30 new regex patterns so you can say "set volume to 50", "lock screen", "close notepad", "type hello world", "read https://example.com aloud", "call John on WhatsApp"
- **Cognition streaming** — DecisionOrchestrator output now streams in word-level chunks instead of blocking
- **Byte-size cache eviction** — ResponseCache enforces a 2 MB memory budget alongside count-based LRU
- **Conversation lock cleanup** — deleting a conversation no longer leaks locks
- **76 new tests** — 515 total across 66 files, up from 439 across 61

---

## Key Capabilities

### Full OS Control (95% Automation)

| Category | Tools | What You Can Say |
|----------|-------|-----------------|
| **System** | volume, mute, mediaKey, brightness, lockScreen, sleep | "set volume to 50", "mute", "play/pause", "next track", "lock screen", "sleep" |
| **Windows** | closeApp, switchApp, minimize, maximize, listProcesses, killProcess | "close notepad", "switch to chrome", "minimize window", "maximize", "list processes", "kill PID 1234" |
| **Text Input** | typeText, sendKeys, clipboardRead, clipboardWrite, clipboardClear | "type hello world", "press ctrl+c", "read clipboard", "copy to clipboard" |
| **File Ops** | listFiles, searchFiles, copyFile, moveFile, deleteFile, createFolder | "list files in Documents", "search for *.pdf", "copy file.txt to backup", "delete temp.txt", "create folder Reports" |
| **Web Reading** | readPage (HTML → speakable text) | "read https://example.com aloud", "browse and read that page" |
| **WhatsApp** | call (voice/video by name), sendMessage | "call John on WhatsApp", "video call Mom", "message Sarah hello" |
| **Media** | playSong (local index → Spotify → YouTube), speakText | "play Bohemian Rhapsody", "read that out loud" |
| **Email** | Gmail read-aloud, categorization, importance scoring | "read my emails", "check inbox" |

### AI Reasoning & Conversation

- **Multi-layer cognition** — L0 safety boundary, L1 persona, L2 context, L3 memory, L4 tools, L5 style, L6 policy, L7 output. The DecisionOrchestrator compiles all layers into a final decision with speech text
- **Streaming responses** — cognition output streams word-by-word for real-time UX
- **Conversation memory** — per-conversation mutex locking, response caching (100 entries, 5 min TTL, 2 MB budget), episode logging
- **Style normalizer** — ensures consistent voice across responses
- **Fallback chain** — Gemini → OpenRouter with circuit breakers and automatic failover

### Learning Engine

- **Episode logging** — records every conversation turn with outcome tracking
- **Consolidation job** — extracts behavioral patterns (topics, tools, time-based routines)
- **Recipe learning** — remembers successful automation sequences for reuse
- **Weekly review UI** — approve or reject learned facts with evidence display

### Enterprise Security

- **SQLCipher encrypted storage** with DPAPI-wrapped keys
- **Windows Credential Manager** via `@github/keytar` for API keys and OAuth tokens
- **Risk-classified tool execution** — Class 1 (auto-approve) through Class 4 (always blocked)
- **Policy engine** — rate limiting (Class 1: 50/min, Class 2: 20/min, Class 3: 5/min, Class 4: 0)
- **Confirmation manager** — read-back flow for Class 2+, explicit confirmation for Class 3+
- **Audit logger** — comprehensive trail for every autonomous action
- **Emergency stop** — global `Ctrl+Shift+Esc` shortcut kills all operations instantly
- **Lock/focus gating** — stops operation when screen is locked or app loses focus
- **Untrusted content boundary** — web page content is tagged `untrusted_content` and never injected into prompts without sanitization

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Electron Desktop App (45)                     │
├────────────────────────────────────────────────────────────────────┤
│  Renderer (React 19 + Vite 8)     │  Main (Node.js + esbuild)     │
│  ┌────────────────────────────┐   │  ┌──────────────────────────┐ │
│  │ Voice Dock                 │   │  │ Provider Router          │ │
│  │ Chat Stage                 │   │  │   ├─ Gemini (chat+STT)   │ │
│  │ Settings Shell             │   │  │   └─ OpenRouter (fallback)│ │
│  │ Memory Inbox               │   │  │ Conversation Engine       │ │
│  │ Weekly Review              │   │  │   ├─ Mutex locking        │ │
│  │ Alerts Rail                │   │  │   ├─ Response cache (LRU) │ │
│  │ Autonomous Dashboard       │   │  │   └─ Episode logger       │ │
│  └────────────────────────────┘   │  │ Cognition Layer           │ │
│                                  │  │   ├─ Prompt Compiler L0-L7│ │
│                                  │  │   ├─ DecisionOrchestrator  │ │
│                                  │  │   └─ Style Normalizer      │ │
│                                  │  │ Tool Executor              │ │
│                                  │  │   ├─ Policy Engine          │ │
│                                  │  │   ├─ Confirmation Manager   │ │
│                                  │  │   ├─ Audit Logger           │ │
│                                  │  │   └─ 50+ tool definitions   │ │
│                                  │  │ Storage (SQLCipher + DPAPI)│ │
│                                  │  │ Credential Manager (keytar)│ │
│                                  │  │ UI Automation Bridge        │ │
│                                  │  │ Emergency Stop              │ │
│                                  │  └──────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Core Packages (TypeScript)                     │
├────────────────────────────────────────────────────────────────────┤
│  conversation/   cognition/      tools/          os-control/       │
│  memory/         learning/       providers/      research/         │
│  autonomous/     email/          voice/          security/         │
│  payments/       schema/         plugins/                         │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      External Services                             │
├────────────────────────────────────────────────────────────────────┤
│  Gemini AI (chat + transcription)                                 │
│  OpenRouter (fallback provider with circuit breakers)             │
│  Gmail API (email intelligence)                                   │
│  PayPal API (financial operations, sandbox + live)                │
│  WhatsApp Web (via UI Automation)                                 │
│  Windows APIs (PowerShell, Win32, WinRT TTS, UI Automation)       │
└────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, TypeScript 5, Inter font, glass-morphism UI |
| **Desktop** | Electron 45, Node.js ≥22.5, esbuild, electron-builder (NSIS) |
| **Core** | TypeScript 5 strict mode, SQLCipher, Zod schemas, Vitest |
| **AI** | Gemini API (chat + STT), OpenRouter (fallback), Provider Router with circuit breakers |
| **OS Control** | PowerShell, Win32 API (SetForegroundWindow, ShowWindow), UI Automation, SendKeys |
| **Security** | SQLCipher + DPAPI, Windows Credential Manager (keytar), risk-classified policy engine |
| **Testing** | Vitest — 515 tests across 66 files, 0 type errors, 0 lint errors |

### Project Size

- **~25,800 lines** of TypeScript + TSX source
- **212 TypeScript source files** (excluding tests, dist, node_modules)
- **50+ tool definitions** across 8 tool categories
- **515 tests** across 66 test files

---

## Installation

### Option 1: Installer (Recommended)

1. Download `Companion-0.2.0-x64.exe` from [Releases v0.2.0](https://github.com/hassan200503/personal-companion-bot/releases/tag/v0.2.0)
2. Run the installer and follow the wizard
3. Launch Companion from the Start menu
4. Complete the onboarding wizard

### Option 2: Build from Source

**Prerequisites:** Windows 10/11 (64-bit), Node.js ≥22.5, npm ≥10

```bash
git clone https://github.com/hassan200503/personal-companion-bot.git
cd personal-companion-bot/companion

# Install dependencies
npm install

# Development mode
npm start

# Full verification (lint + typecheck + test + build)
npm run verify

# Package as Windows installer
npm run package
```

### Quick Start

1. **Configure AI Provider** — Settings → Providers → Add Gemini API key (get one at https://console.cloud.google.com/)
2. **Set Up Voice** — Settings → Voice → Enable cloud speech consent → Select voice → Test
3. **Configure Services** (optional) — Email (Gmail app password), WhatsApp (grant permissions), Payments (PayPal sandbox)
4. **Start Talking** — Click the microphone icon or type a command

---

## Usage Examples

### Voice & Text Commands

```
"play Bohemian Rhapsody"           → Searches local index, falls back to Spotify, then YouTube
"set volume to 50"                 → Sets system volume to 50%
"mute" / "unmute"                  → Toggles system mute
"next track" / "previous track"    → Media key control
"lock screen"                      → Locks the Windows workstation
"sleep"                            → Puts the system to sleep
"close notepad"                    → Closes the Notepad window
"switch to chrome"                 → Brings Chrome to foreground
"minimize window"                  → Minimizes active window
"list processes"                   → Shows top 30 processes by memory
"type hello world"                 → Types text into the focused window
"press ctrl+c"                     → Sends keyboard shortcut
"read clipboard"                   → Reads clipboard contents aloud
"list files in Documents"          → Lists files in the Documents folder
"search for *.pdf"                 → Searches for PDF files
"copy report.txt to backup"        → Copies a file
"delete temp.txt"                  → Deletes a file (requires confirmation)
"create folder Reports"            → Creates a new folder
"read https://example.com aloud"   → Fetches page, extracts text, reads it aloud
"call John on WhatsApp"            → Opens WhatsApp, searches for John, initiates voice call
"video call Mom on WhatsApp"       → Initiates a video call
"read my emails"                   → Fetches Gmail, categorizes, reads summaries aloud
"check inbox"                      → Checks for new emails
```

### Conversation & Reasoning

The companion doesn't just execute commands — it reasons. You can:

- **Share ideas** — "I'm thinking about building a budget tracker app, what do you think?"
- **Tell stories** — "Let me tell you about my day..."
- **Plan together** — "Help me plan a study schedule for next week"
- **Ask for analysis** — "What are the tradeoffs between React and Vue for a small project?"

The cognition layer compiles your conversation history, memory snippets, active tools, persona, and policy constraints into a single decision, then streams the response back in real time.

---

## Tool Categories

### OS Control (29 tools)

| Module | Tools | Risk Class |
|--------|-------|-----------|
| `system-control` | volume, mute, mediaKey, brightness, lockScreen, sleep | 1–2 |
| `window-control` | closeApp, switchApp, minimize, maximize, listProcesses, killProcess | 1–3 |
| `text-input` | typeText, sendKeys, clipboardRead, clipboardWrite, clipboardClear | 1–2 |
| `file-ops` | listFiles, searchFiles, copyFile, moveFile, deleteFile, createFolder | 1–3 |
| `clipboard-native` | readClipboard, writeClipboard, clearClipboard | 1 |
| `windows` | openTarget, playMedia, speakText, makeCall, runCommand, takeScreenshot, sendWhatsAppMessage | 1–3 |
| `whatsapp-tools` | whatsapp.call, whatsapp.sendMessage | 2–3 |

### Research (2 tools)

| Module | Tools | Risk Class |
|--------|-------|-----------|
| `web-read` | web.readPage (HTML → speakable text, untrusted content) | 1 |
| `web-research` | web.search (DuckDuckGo + Wikipedia) | 1 |

### Autonomous & Financial

| Module | Tools | Risk Class |
|--------|-------|-----------|
| `autonomous` | goal pursuit engine, action executor | 2–4 |
| `payments` | PayPal operations (sandbox + live) | 3–4 |

### Email

| Module | Tools | Risk Class |
|--------|-------|-----------|
| `email` | Gmail read, categorize, importance score, read-aloud | 1–2 |

### Risk Class Reference

| Class | Description | Behavior |
|-------|-------------|----------|
| 1 | Safe / read-only | Auto-approved, no confirmation |
| 2 | Low risk | Read-back confirmation (spoken before execution) |
| 3 | Medium risk | Explicit confirmation required |
| 4 | High risk | Always blocked |

---

## Testing

```bash
# Run all tests
npm test

# Run with verbose output
npx vitest run --reporter=verbose

# Full verification suite (lint + typecheck + test + build)
npm run verify
```

### Test Results

| Metric | Value |
|--------|-------|
| Test files | 66 |
| Tests passing | 515 |
| Type errors | 0 |
| Lint errors | 0 |
| Build status | Passing |

### Test Coverage Areas

- **Tool definitions** — schema validation, risk class, permission checks
- **Policy engine** — rate limiting, confirmation flows, trusted intent guard
- **Conversation engine** — mutex locking, caching, streaming, episode logging
- **Provider router** — circuit breakers (closed/open/half-open), quota ledger, failover
- **OS control modules** — input validation, abort handling, CSV parsing
- **File operations** — real temp directory tests (list, search, copy, move, delete, create)
- **Web reading** — HTML stripping, entity decoding, speakable clipping, URL validation
- **Memory & learning** — normalization, consolidation, recipe learning
- **Security** — encrypted storage, credential management, audit logging

---

## Security

### Credential Management

All credentials are stored using Windows Credential Manager (`@github/keytar`):

- **AI Providers** — Gemini, OpenRouter API keys
- **Email** — Gmail app passwords, OAuth tokens
- **Payments** — PayPal client ID and secret

Credentials are never hardcoded, never logged, and encrypted at rest via DPAPI.

### Safety System

- **Risk-classified execution** — every tool declares a risk class (1–4)
- **Policy engine** — evaluates every tool call against permissions, rate limits, and trusted intent
- **Confirmation manager** — read-back flow for Class 2, explicit approval for Class 3
- **Audit logger** — every autonomous action is logged with metadata
- **Emergency stop** — `Ctrl+Shift+Esc` kills all operations instantly
- **Lock/focus gating** — stops when screen is locked or app loses focus
- **Untrusted content boundary** — web content tagged `untrusted_content`, never raw-injected into prompts

See [SECURE_SETUP.md](docs/SECURE_SETUP.md) and [THREAT_MODEL.md](docs/THREAT_MODEL.md) for details.

---

## Documentation

### User Guides

- [Secure Setup Guide](docs/SECURE_SETUP.md) — Credential configuration
- [Enterprise Ready](docs/ENTERPRISE_READY.md) — Production readiness checklist
- [Gate Approvals](docs/DECISIONS/GATE_APPROVALS.md) — G3, G5, G6, G7 approval records

### Developer Documentation

- [Project State](docs/PROJECT_STATE.md) — Implementation status and milestones
- [Gap List](docs/GAPS.md) — Known issues and improvement tracking
- [Verification Log](docs/VERIFICATION_LOG.md) — Test results and evidence
- [Requirements](docs/REQUIREMENTS.md) — Feature requirements registry
- [Agent Brief](docs/AGENT_BRIEF.md) — Complete system specification
- [Threat Model](docs/THREAT_MODEL.md) — Security threat analysis

### Source

- [Core Packages](companion/packages/core/src/) — TypeScript source with JSDoc
- [Tool Registry](companion/packages/core/src/tools/) — Tool definitions and contracts
- [OS Control](companion/packages/core/src/os-control/) — 29 OS automation tools
- [Cognition](companion/packages/core/src/cognition/) — Prompt compiler and decision orchestrator
- [Security](companion/packages/core/src/security/) — Encryption, credentials, audit

---

## Roadmap

### Completed

- Full OS control (29 tools across 7 modules)
- AI reasoning with multi-layer cognition and streaming
- WhatsApp voice/video calling by name
- Media playback by name (local → Spotify → YouTube)
- Web page reading aloud (HTML → speakable text)
- Email intelligence with Gmail integration
- Autonomous goal pursuit (G7 approved)
- Financial operations with safeguards (G6 approved)
- Learning engine (episode logging, consolidation, recipe learning)
- Enterprise security (SQLCipher, Credential Manager, risk-classified policy)
- Response caching with byte-size eviction
- 515 tests across 66 files, 0 type errors, 0 lint errors

### Near Term

- E2E tests for 10+ Windows applications
- Full ML speaker verification (upgrade from degraded mode)
- Real Gmail OAuth flow integration
- PayPal live mode validation
- Plugin system for custom tools

### Future

- Linux and macOS support
- Mobile companion app (React Native)
- Multi-user support with profiles
- Cloud sync with end-to-end encryption
- Advanced analytics dashboard

---

## Contributing

```bash
# Create a feature branch
git checkout -b feature/your-feature

# Verify before committing
npm run verify

# Commit with conventional commits
git commit -m "feat: add your feature"

# Push and create a PR
git push origin feature/your-feature
```

---

## License

This project is **UNLICENSED**. All rights reserved.

---

## Author

**Hassan**

- **GitHub**: [@hassan200503](https://github.com/hassan200503)
- **LinkedIn**: [hassan-karungwa](https://www.linkedin.com/in/hassan-karungwa)
- **Portfolio**: [hassan200503.github.io](https://hassan200503.github.io/)

---

<div align="center">

**Built for the future of personal computing**

[⬆ Back to Top](#companion-ai--enterprise-grade-windows-automation-assistant)

</div>
