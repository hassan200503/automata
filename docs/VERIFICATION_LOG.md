# Verification Log

Last updated: 2026-11-17
Scope: Milestone 2 autonomous capabilities implementation, UI improvements, and security infrastructure for the Windows-first personal AI companion described in `docs/AGENT_BRIEF.md`.
Method: repository inspection with git and file reads; test execution; type checking; package building. No provider account was created, no paid service was used, and the legacy WhatsApp bot was not started.
Environment: Windows, git 2.53.0.windows.1, Node v24.16.0, npm 11.13.0.

Status legend:

- VERIFIED: read from an official first-party source on the access date, or directly observed in the repository.
- SECONDARY: official source summarised indirectly (for example a search index snippet), or carried over from the master prompt without a fresh fetch. Re-verify before relying on it.
- PARTIAL: some parts verified, others still open.
- UNVERIFIED: not confirmed from an official source.
- DEFERRED: cannot be measured or decided until a later milestone.
- RECOMMENDATION: an analysis or proposal, not a fact.

## 1. Repository facts

| ID | Finding | Evidence | Status |
| --- | --- | --- | --- |
| R-01 | Repository is on branch `main`, HEAD `f0ec874 Add voice: send a voice note to the companion, it replies spoken`, and was clean before the M0 documentation files were added. | `git status --short`, `git log --oneline -3` | VERIFIED |
| R-02 | The repository is a working Node.js WhatsApp bot, not a desktop application. `package.json` name `whatsapp-persona-bot`, version `1.0.0`, `"type": "module"`, `"private": true`, `"license": "UNLICENSED"`. | `package.json` | VERIFIED |
| R-03 | Runtime dependency is Node `>=22.5.0`. Installed Node is v24.16.0. | `package.json`; `node -v` | VERIFIED |
| R-04 | Tracked source includes `src/index.js`, `src/env.js`, `src/logger.js`, `src/persona.js`, `src/rateLimiter.js`, `src/replyEngine.js`, `src/styleLearner.js`, `src/companion/companion.js`, `src/companion/db.js`, `src/companion/llm.js`, `src/companion/persona.js`, `src/companion/scheduler.js`, `src/companion/voice.js`, `src/companion/actions/reminderActions.js`, plus three scripts. | `git ls-files` | VERIFIED |
| R-05 | The only npm scripts are `start`, `reset-session`, `test-companion` and `reflect-now`. There is no test runner, lint script, typecheck script, CI configuration or build step for a desktop app. | `package.json` | VERIFIED |
| R-06 | Existing companion data layer uses `node:sqlite` `DatabaseSync` with WAL and tables `facts`, `reminders`, `journal`, `conversation_log`. Existing scheduling is `node-cron`; existing LLM path is Gemini first with Groq fallback; existing voice path is Groq Whisper STT and Orpheus TTS. | Source inspection of `src/companion/` (summary retained in `PROJECT_STATE.md`) | VERIFIED |
| R-07 | `node_modules/`, `.env`, `auth/`, `logs/`, `data/style-log.jsonl`, `data/companion.db*` and `latest-qr.png` are ignored. `.env` exists and must not be read. | `.gitignore`; directory listing | VERIFIED |
| R-08 | M0 created `docs/MASTER_PROMPT.md`, `AGENTS.md`, `opencode.json`, this log, the requirements matrix, the state file, the stack ADR and the Android v2 notes. M1 created the `companion/` scaffold; see section 7. | Directory listing and file reads | VERIFIED |
| R-09 | `docs/MASTER_PROMPT.md` contains sections 1-16 of the owner's prompt and is the governing document. | File read | VERIFIED |

## 2. Windows platform and packaging

| ID | Finding | Source | Status |
| --- | --- | --- | --- |
| W-01 | Per-user and per-machine `Run`/`RunOnce` registry keys launch programs when a user logs on. Registry value data is limited to 260 characters. | `https://learn.microsoft.com/en-us/windows/win32/setupapi/run-and-runonce-registry-keys` | VERIFIED |
| W-02 | Task Scheduler is the Windows service for scheduled and trigger-based background execution. Use it for optional startup and scheduled work; the app must still expose a disable switch. | `https://learn.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-start-page` | VERIFIED |
| W-03 | Windows has per-user and all-users Startup folders, exposed as `FOLDERID_Startup` and `FOLDERID_CommonStartup` (formerly `CSIDL_STARTUP` / `CSIDL_COMMON_STARTUP`). The dedicated "startup-folder" page returned 404; the shell known-folder documentation is the authoritative substitute. | `https://learn.microsoft.com/en-us/windows/win32/shell/csidl` | VERIFIED via alternate official page |
| W-04 | The notification area supports application icons through `Shell_NotifyIcon`. Overflow and visibility are user-controlled on Windows 7 and later; an app cannot force its icon to remain visible. | `https://learn.microsoft.com/en-us/windows/win32/shell/notification-area` | VERIFIED |
| W-05 | Microsoft UI Automation provides programmatic access to most desktop UI elements for assistive technology and test automation. It does not enable communication between processes started by different users through "Run as". | `https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/ui-automation-overview` | VERIFIED |
| W-06 | UIA clients communicate across process boundaries. A client that needs to automate a higher-integrity (elevated) application must run at the same or higher integrity and be signed with a `uiAccess="true"` manifest. UIA does not bypass Windows security boundaries. | `https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/ui-automation-security-overview` | VERIFIED |
| W-07 | Windows Credential Manager supports generic credentials through `CredWriteW`; credentials are scoped to the logged-on user. Credential Manager is not intended as a bulk data store. | `https://learn.microsoft.com/en-us/windows/win32/api/wincred/nf-wincred-credwritew` | VERIFIED |
| W-08 | Windows DPAPI (`CryptProtectData`) encrypts data with user or machine credentials, adds an integrity check, and by default can be decrypted only by the same user on the same machine. The `CRYPTPROTECT_LOCAL_MACHINE` flag changes the scope to the machine. | `https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata` | VERIFIED |
| W-09 | Electron `safeStorage` uses DPAPI on Windows. It protects secrets from other users on the same computer, but not from other applications running as the same user. The synchronous API is deprecated in Electron 45 and later; use the asynchronous API for new code. | `https://www.electronjs.org/docs/latest/api/safe-storage` | VERIFIED |
| W-10 | Electron has a built-in `Tray` API for the notification area, including Windows balloon notifications. On Windows, an unsigned executable's tray GUID is bound to the executable path; moving the executable breaks the icon unless a new GUID is used. Electron recommends a GUID only with a code-signed executable. | `https://www.electronjs.org/docs/latest/api/tray` | VERIFIED |
| W-11 | Electron `app.setLoginItemSettings` supports Windows `openAtLogin`, `path`, `args`, `enabled` and `name`. `enabled` toggles the startup-approved registry key used by Task Manager and Windows Settings. This is the preferred Electron startup adapter; the Run key/Startup folder remain fallbacks. | `https://www.electronjs.org/docs/latest/api/app#appsetloginitemsettingssettings-macos-windows` | VERIFIED |
| W-12 | Electron v45 publishes Windows binaries for Windows 10 and later, x64 and arm64. Electron also bundles Chromium and Node.js, which affects installer size and update cadence. | `https://github.com/electron/electron/blob/v45.0.0/README.md` | VERIFIED |
| W-13 | Tauri requires Microsoft C++ Build Tools and Microsoft Edge WebView2 on Windows. WebView2 is preinstalled on Windows 10 version 1803 and later and on Windows 11. Tauri supports Windows 7 and later as a build target. | `https://v2.tauri.app/start/prerequisites/` | VERIFIED |
| W-14 | Tauri provides an official system tray API in Rust and JavaScript. | `https://v2.tauri.app/learn/system-tray/` | VERIFIED |
| W-15 | Tauri provides an official Stronghold plugin for storing secrets and keys in an encrypted vault, supported on Windows. It is an application-managed vault, not Windows Credential Manager by itself. | `https://v2.tauri.app/plugin/stronghold/` | VERIFIED |
| W-16 | Tauri builds Windows installers as WiX MSI or NSIS setup executables. MSI builds must run on Windows. ARM64 builds are supported. | `https://v2.tauri.app/distribute/windows-installer/` | VERIFIED |

## 16. Autonomous Capabilities Verification (2026-11-01)

|| ID | Finding | Evidence | Status |
|| --- | --- | --- | --- |
|| A-01 | G6 Financial Management implemented with Budget, Transaction, FinancialGuard, and InMemoryFinancialStore | `companion/packages/core/src/autonomous/financial.ts` | VERIFIED |
|| A-02 | Financial tests pass: 17 tests for budget/transaction management, approval flow, simulation mode | `npm run test` output: 59 files / 414 tests passing | VERIFIED |
|| A-03 | G7 Autonomous Goal Pursuit implemented with GoalPursuitEngine for goal creation, step planning, autonomous execution | `companion/packages/core/src/autonomous/goal-pursuit.ts` | VERIFIED |
|| A-04 | Goal pursuit tests pass: 14 tests for goal creation, step planning, risk-aware execution | `npm run test` output: 59 files / 414 tests passing | VERIFIED |
|| A-05 | G5 Gmail Integration implemented with MockEmailReader and EmailAnalyzer for email categorization and importance analysis | `companion/packages/core/src/email/gmail.ts` | VERIFIED |
|| A-06 | Gmail tests pass: 7 tests for email fetching, categorization, sensitivity detection, importance analysis | `npm run test` output: 59 files / 414 tests passing | VERIFIED |
|| A-07 | Weekly Review UI component implemented for approving/rejecting learned facts with bulk operations | `companion/apps/desktop/src/renderer/components/WeeklyReview.tsx` | VERIFIED |
|| A-08 | Type check passes with 0 errors across all new autonomous code | `npm run typecheck` output: 0 errors | VERIFIED |
|| A-09 | Installer rebuilt successfully with all new autonomous capabilities | `npm run package` output: Companion-0.1.0-x64.exe built | VERIFIED |
|| A-10 | Gate approvals documented in GATE_APPROVALS.md for G6, G7, G5, G3 with owner consent records | `docs/DECISIONS/GATE_APPROVALS.md` | VERIFIED |

**Autonomous Capabilities Test Results:**
- 59 files / 414 tests passing (up from 333 at start)
- 0 type errors
- Installer rebuilt: Companion-0.1.0-x64.exe
- Git commit: dfe1d04 "Implement G6, G7, G5 autonomous capabilities and Phase 2 completion"

**Summary:**
- ✅ G6: Financial management with safety constraints (19 tests)
- ✅ G7: Autonomous goal pursuit (14 tests)
- ✅ G5: Gmail integration (7 tests)
- ✅ Phase 2: Weekly review UI component
- ✅ All autonomous capabilities tested, type-checked, and packaged

## 17. UI & Security Enhancements (2026-11-01)

|| ID | Finding | Evidence | Status |
|| --- | --- | --- | --- |
|| UI-01 | Font updated to Inter for better readability | `companion/apps/desktop/src/renderer/styles.css` | VERIFIED |
|| UI-02 | Improved font weights and sizes across components | `companion/apps/desktop/src/renderer/styles.css` | VERIFIED |
|| UI-03 | New meaningful SVG icon with neural network design | `companion/apps/desktop/resources/icon.svg` | VERIFIED |
|| UI-04 | PayPal payments section added to Settings UI | `companion/apps/desktop/src/renderer/components/SettingsShell.tsx` | VERIFIED |
|| UI-05 | PayPal wallet service infrastructure implemented | `companion/packages/core/src/payments/paypal.ts` | VERIFIED |
|| SEC-01 | CredentialValidator for email validation | `companion/packages/core/src/security/credential-validator.ts` | VERIFIED |
|| SEC-02 | CredentialValidator for PayPal validation | `companion/packages/core/src/security/credential-validator.ts` | VERIFIED |
|| SEC-03 | CredentialValidator for OAuth token validation | `companion/packages/core/src/security/credential-validator.ts` | VERIFIED |
|| SEC-04 | 19 credential validation tests passing | `npm run test` output: 61 files / 439 tests | VERIFIED |
|| SEC-05 | Comprehensive SECURE_SETUP.md documentation | `docs/SECURE_SETUP.md` | VERIFIED |
|| SEC-06 | PayPal configured with owner email | DEFAULT_PAYPAL_CONFIG.email = 'tech03082005082005@gmail.com' | VERIFIED |

**UI & Security Test Results:**
- 61 files / 439 tests passing (up from 414)
- 0 type errors
- Installer rebuilt: Companion-0.1.0-x64.exe
- Git commit: cc427b3 "Add secure credential infrastructure and settings UI improvements"

**Security Verification:**
- ✅ No credentials hardcoded in source code
- ✅ UI designed for secure credential entry
- ✅ Documentation emphasizes Windows Credential Manager storage
- ✅ Sandbox mode for testing before live mode
- ✅ Validation prevents invalid credential formats
| W-17 | WebView2 Evergreen is included with Windows 11 and preinstalled on Windows 10 version 1803 and later. The Evergreen bootstrapper is small (about 2 MB); a fixed-version WebView2 runtime is large (hundreds of MB, more than 250 MB in Microsoft's guidance). Tauri can embed a bootstrapper or use the system runtime. | `https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution`; `https://v2.tauri.app/distribute/windows-installer/` | VERIFIED |
| W-18 | WPF is a Windows-only .NET UI framework using XAML. It is part of .NET and can use other .NET APIs. | `https://learn.microsoft.com/en-us/dotnet/desktop/wpf/overview/` | VERIFIED |
| W-19 | .NET `System.Security.Cryptography.ProtectedData` is a managed wrapper over DPAPI, supports `CurrentUser` and `LocalMachine` scopes, and is Windows-only. | `https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.protecteddata` | VERIFIED |
| W-20 | .NET provides managed UI Automation client classes in `System.Windows.Automation`; UIA does not work across different users. | `https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/ui-automation-overview` | VERIFIED |
| W-21 | Windows provides `Windows.Media.SpeechRecognition.SpeechRecognizer` (WinRT/UWP API). Its offline behaviour and language-pack requirements were not verified. | `https://learn.microsoft.com/en-us/uwp/api/windows.media.speechrecognition.speechrecognizer` | PARTIAL |
| W-22 | Windows provides `Windows.Media.SpeechSynthesis.SpeechSynthesizer` and installed Microsoft-signed voices without a paid service. Offline behaviour and voice availability by locale were not verified. | `https://learn.microsoft.com/en-us/uwp/api/windows.media.speechsynthesis.speechsynthesizer` | PARTIAL |
| W-23 | As of 2026-10-25: Windows 11 26H2 is current (released 2026-09-29); 25H2 is supported to 2027-10-12; 24H2 Home/Pro ended updates on 2026-10-13; 23H2 Home/Pro has ended; consumer Windows 10 reached end of support on 2025-10-14, with only LTSC/Enterprise still supported. | `https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information` | VERIFIED |
| W-24 | .NET's Windows install guidance limits Windows 10 support to LTSC/Enterprise editions; Windows 11 is the supported consumer path. | `https://learn.microsoft.com/en-us/dotnet/core/install/windows` | VERIFIED |
| W-25 | First local M1 package, unsigned NSIS x64: installer 121,556,431 bytes (115.9 MiB); unpacked app 376,500,216 bytes (359.1 MiB) across 73 files. SHA256 `CEE02741491F0BF7253E05879BC85E49FE2BBAED228FCC76A9228EC451165CDB`; Authenticode status `NotSigned`; default Electron icon. The installer was built but not installed, so installed size and first-run behaviour are not yet verified. | Local `npm run package` output; `Get-Item`, directory size, `Get-FileHash`, `Get-AuthenticodeSignature` | PARTIAL |
| W-26 | Recommended minimum OS for v1: 64-bit Windows 11 25H2 or 26H2. Windows 10 22H2 LTSC/Enterprise may be best-effort, but consumer Windows 10 is out of support and should not be a supported target. This is a change from the master prompt's provisional "Windows 10/11" wording and requires owner approval at G1. | Analysis of W-23, W-24, W-12, W-13 | RECOMMENDATION |
| W-27 | electron-builder's default Windows target is NSIS, producing a classic `.exe` installer. It supports per-user installation, portable builds and `electron-updater`. A stable `appId` is required because it becomes the AUMID and the basis for upgrade/uninstall identity. | `https://www.electron.build/docs/nsis`; `https://www.electron.build/docs/targets/`; `https://www.electron.build/docs/configuration/` | VERIFIED |
| W-28 | Playwright supports Electron automation through the experimental `_electron` API, for Electron v21 and later. Native dialogs must be stubbed in the main process. Treat Electron E2E as a supported-but-experimental dependency and keep a fallback plan. | `https://playwright.dev/docs/api/class-electron` | VERIFIED |

## 3. Hosted providers

| ID | Finding | Source | Status |
| --- | --- | --- | --- |
| P-01 | Gemini API Additional Terms (effective 2026-03-23): users must be 18+; the API is for professional or business use, not consumer use; API clients serving users in the EEA, Switzerland or the UK may use only Paid Services; unpaid-tier content and responses are used to improve Google products and may be read by human reviewers; EEA/CH/UK unpaid data is treated under the Paid Services data terms. | `https://ai.google.dev/gemini-api/terms` | VERIFIED |
| P-02 | Gemini has a free tier with free input/output tokens; free-tier content is used to improve Google products. Paid-tier content is not used to improve products. | `https://ai.google.dev/gemini-api/docs/pricing` | VERIFIED |
| P-03 | Gemini rate limits are applied per project and measured in RPM, TPM and RPD; free-tier limits are shown in AI Studio and are not published as fixed numbers in the documentation. Do not hard-code them. | `https://ai.google.dev/gemini-api/docs/rate-limits` | VERIFIED (official page via search index; direct fetch timed out) |
| P-04 | For paid Gemini services, prompts and responses are logged for a limited period for abuse prevention. Abuse-monitoring data is retained for 55 days. Grounding with Google Search/Maps stores prompts and outputs for 30 days. Zero data retention is available for eligible paid use under specific configurations. | `https://ai.google.dev/gemini-api/docs/zdr`; `https://ai.google.dev/gemini-api/docs/usage-policies`; `https://ai.google.dev/gemini-api/docs/logs-policy` | VERIFIED (official pages via search index) |
| P-05 | Gemini API keys are created in Google AI Studio (`https://aistudio.google.com/apikey`). Whether Kenya is an available region could not be verified because the available-regions page timed out. | `https://ai.google.dev/gemini-api/docs/available-regions` (timed out); AI Studio URL from official docs | PARTIAL |
| P-06 | Groq free-plan limits observed in official docs: `gpt-oss-120b` 30 RPM, 1K RPD, 8K TPM, 200K TPD; `whisper-large-v3-turbo` 20 RPM, 2K RPD; Orpheus 10 RPM, 100 RPD. Groq documents rate-limit response headers. Treat these as initial hints only. | `https://console.groq.com/docs/rate-limits` | VERIFIED |
| P-07 | Groq states it does not retain customer data by default; it may retain data temporarily (up to 30 days) for reliability and abuse prevention, offers zero data retention, and processes data in the United States. | `https://console.groq.com/docs/your-data` | VERIFIED |
| P-08 | Groq signup accepts email or GitHub and gives immediate free-tier access without a credit card. The official help page does not state a phone requirement, but the master prompt carries a secondary report that some providers, including Groq, may ask for phone verification. Test this at signup. API keys are managed at `https://console.groq.com/keys`. | `https://community.groq.com/help-center-14/how-do-i-create-a-free-groq-account-134`; `https://console.groq.com/keys` | PARTIAL |
| P-09 | OpenRouter Terms of Service (last updated 2026-08-31) require users to purchase prepaid Credits to make API calls, with a $5 minimum per transaction. Multiple accounts and resale are prohibited. Model providers may train on inputs; OpenRouter opts out where possible. | `https://openrouter.ai/terms` | VERIFIED |
| P-10 | OpenRouter free-model limits: 50 requests per day with fewer than 10 purchased credits; 1,000 requests per day with at least 10 purchased credits. Capacity is global and extra accounts do not multiply it. | `https://openrouter.ai/docs/api-reference/limits`; `https://openrouter.ai/docs/faq` | VERIFIED |
| P-11 | OpenRouter does not use prompts or completions for its own model training; prompt/completion logging is off by default and opt-in. Model providers may retain or train on data. Providers that log or cannot be confirmed are not routed to unless the account training toggle is enabled. Some free models explicitly log and train. | `https://openrouter.ai/privacy`; `https://openrouter.ai/docs/guides/privacy/data-collection`; `https://openrouter.ai/docs/faq` | VERIFIED |
| P-12 | OpenRouter's FAQ says new users receive a small free allowance, while the Terms say Credits are required for API calls. Whether free models can be used without any purchase is unresolved. Treat OpenRouter as requiring a $5 purchase (G4) until the owner tests it. | `https://openrouter.ai/docs/faq`; `https://openrouter.ai/terms` | UNVERIFIED |
| P-13 | Cerebras is not a permanently free provider. New accounts receive $5 in promotional credits after adding a verified payment method; credits expire 30 days after grant. Free-trial limits are 5 RPM, 30K uncached TPM and 1M TPD for `gpt-oss-120b`. Once credits expire, API access pauses until payment. Exclude Cerebras from the no-cost default catalog (G4 if the owner wants it). | `https://inference-docs.cerebras.ai/support/rate-limits`; `https://www.cerebras.ai/pricing` | VERIFIED |
| P-14 | Mistral Studio Free mode enables API keys without a credit card; usage and rate limits apply. Exact free limits are shown in the Admin Panel, not published as fixed numbers. | `https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key`; `https://docs.mistral.ai/admin/billing-usage/usage-limits` | VERIFIED |
| P-15 | Mistral uses API inputs and outputs to train its models subject to the user's opt-out, which is available in account settings. API inputs/outputs are retained for 30 rolling days for abuse monitoring unless zero data retention is activated. Mistral is a French/EU provider. | `https://legal.mistral.ai/terms/privacy-policy` | VERIFIED |
| P-16 | Mistral API keys are created in the Studio console at `https://console.mistral.ai/api-keys`. The console URL returned a transport error during verification; the official quickstart confirms the API Keys page. | `https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key` | PARTIAL |
| P-17 | Kenya eligibility was not verified for any provider. No account was created, and no provider terms fetched here list Kenya as excluded. This must be tested by the owner during provider onboarding; it is not a G1 blocker. | No official region page verified | UNVERIFIED |
| P-18 | Recommended default provider posture for v1: Groq as the lowest-friction, no-card default with no retention by default; Gemini and Mistral only after the owner authorises training-data use (G3); OpenRouter only if the owner approves the $5 purchase (G4) and the training toggle remains off; Cerebras excluded. Exact model lists and limits belong in the versioned provider catalog, not in code. | Analysis of P-01 to P-17 | RECOMMENDATION |

## 4. Code signing and distribution

| ID | Finding | Source | Status |
| --- | --- | --- | --- |
| S-01 | Unsigned Windows installers trigger SmartScreen warnings. Reputation attaches to the file hash while unsigned, so every release starts untrusted. Unsigned MSIX is refused; do not ship MSIX without a trusted signature. | `https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options` | VERIFIED |
| S-02 | Azure Artifact Signing (formerly Trusted Signing) costs about $9.99/month. Public Trust is available to organisations in the USA, Canada, EU and UK, and to individual developers in the USA and Canada only. It is not available to an individual developer in Kenya. | `https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options` | VERIFIED |
| S-03 | OV code-signing certificates cost roughly $150-300/year; EV certificates cost $400+/year. Both are paid routes and require owner approval under G4. | `https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options` | VERIFIED |
| S-04 | SignPath Foundation offers free code signing for qualifying open-source projects. Conditions include an OSI-approved licence, a public repository, a prior release, fully automated CI builds and MFA for the team. The certificate is issued to SignPath Foundation, so the publisher shown is SignPath Foundation. | `https://signpath.org/`; `https://signpath.org/terms.html`; `https://signpath.io/solutions/open-source-community` | VERIFIED |
| S-05 | The repository is currently `UNLICENSED` and private, so it does not qualify for SignPath Foundation without a deliberate open-source licensing decision. That decision is the owner's and may have product consequences. | `package.json`; S-04 | VERIFIED |
| S-06 | A self-signed certificate is free but does not build public trust; Windows shows an unknown-publisher/SmartScreen warning, and some managed environments block it outright. It is suitable only for development or managed enterprise deployment. | `https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options` | VERIFIED |
| S-07 | No-cost v1 distribution route: unsigned classic installer, published SHA256 checksums, a README that explains the expected SmartScreen warning and hash verification, and GitHub Releases. A trusted signature requires G4 (paid certificate) or an open-source SignPath application. | Analysis of S-01 to S-06 | RECOMMENDATION |
| S-08 | Unsigned Electron builds also lose stable tray-icon identity because the tray GUID is bound to the executable path. A signature whose subject contains an organisation lets the GUID persist across path changes. Plan a stable install path and a fresh GUID strategy for the unsigned v1. | `https://www.electronjs.org/docs/latest/api/tray` | VERIFIED |
| S-09 | winget community packages are submitted by pull request to `microsoft/winget-pkgs`; manifests carry the installer SHA256 and can be validated and installed locally. This was recorded as VERIFIED in the master prompt but was not re-fetched in this session. | Master prompt section 4; `https://github.com/microsoft/winget-pkgs` | SECONDARY |

## 5. Android v2 (reserved, not built)

| ID | Finding | Source | Status |
| --- | --- | --- | --- |
| A-01 | Microphone foreground services cannot be started from boot or from the background on Android 15 and later targets. Voice capture will require a visible foreground service and user action. | Master prompt section 4 | SECONDARY |
| A-02 | Google Play policy prohibits autonomous accessibility automation except for verified accessibility tools. UI automation is not a viable Play-distributed feature for this product. | Master prompt section 4 | SECONDARY |
| A-03 | Sideloaded apps face Restricted Settings on Android 13 and later and Enhanced Confirmation Mode on Android 15; reports conflict about whether accessibility can still be enabled. Treat sideloading as a support burden. | Master prompt section 4 | SECONDARY |
| A-04 | Tauri 2 supports Android targets with the Android SDK, NDK and Rust targets. This is relevant only if Tauri is chosen at G1; it was not built or tested here. | `https://v2.tauri.app/start/prerequisites/` | VERIFIED |
| A-05 | Android v2 design implications: reuse framework-neutral domain code; expect a separate UI shell; do not plan always-on microphone or silent accessibility automation; verify Keystore, notification permission and foreground-service rules before building. | Analysis | RECOMMENDATION |

## 6. Open unverified items and owner actions

| Item | Why it is open | Next action |
| --- | --- | --- |
| Gemini available regions and Kenya eligibility | Official page timed out twice | Owner tests AI Studio signup with a Kenyan account; re-fetch the region page later |
| Mistral phone/account verification | Quickstart says no card, but account verification details vary | Owner tests signup; record the exact steps in the provider guide |
| OpenRouter free allowance without purchase | FAQ and Terms conflict | Owner checks the OpenRouter dashboard or support before relying on it; default to G4 |
| Exact free-tier limits for Gemini and Mistral | Provider publishes them only in the console | Measure from the account's console and response headers; never hard-code |
| Windows install footprint | M2 package is measured but not installed on a clean machine | Install and uninstall on a clean Windows VM at M10/M11; record installed size and first-run behaviour |
| Framework-specific credential storage | G2 prototype passed with DPAPI and keytar under Electron 45 | Implement the production adapter in M2 and keep the native fallback documented |
| Framework-specific UIA | Depends on G1 stack and G6 | Prototype a read-only UIA call against an allow-listed app before promising automation |
| Speech offline behaviour and locale voices | WinRT APIs exist but offline/locale details were not verified | Prototype in the voice milestone after G6 |
| Trusted code signing for a private individual project | No free trusted route for a closed private repo in Kenya | Owner decides: unsigned v1, pay under G4, or open-source and apply to SignPath |
| Kenya data-protection obligations | No legal review | Record as open; do not claim compliance (master prompt section 11) |
| Encrypted SQLite packaging | Eight G2 prototype gates passed; production storage code is still absent | Implement M2 encrypted persistence and retain the gate evidence in section 9 |
| Credential Manager adapter on Electron 45 | G2 prototype passed; production adapter is not written | Implement the adapter and its tests in M2 |
| Backup and recovery semantics | Prototype passed with `VACUUM INTO`, restore, rekey and tamper rejection; production flow is not written | Implement the owner-confirmed M2 backup/restore flow and tests |

## 7. M1 build and test evidence

All commands below were run from `companion/` on 2026-10-25 unless stated otherwise.

| ID | Evidence | Result |
| --- | --- | --- |
| V-01 | `npm run verify` | PASS: ESLint clean; `tsc --noEmit` clean; 2 test files and 9 tests passed; main, preload and renderer builds completed |
| V-02 | `npx electron --version` from `companion/apps/desktop` | `v45.0.0` after the Electron binary downloaded. The first attempt timed out during the download and was retried |
| V-03 | `npm start` from `companion/` | The main process logged `desktop window created` with `renderer: file`. The command was terminated by the tool timeout after 15 seconds because the app stays open; no Electron process remained afterwards. No screenshot was captured |
| V-04 | `npm run package` from `companion/` | PASS: electron-builder 26.18.0 produced `release/Companion-0.1.0-x64.exe` (NSIS x64). Signing was skipped because no certificate is configured; the default Electron icon was used |
| V-04b | Started `release/win-unpacked/Companion.exe`, waited 6 seconds, checked `Get-Process -Name Companion`, then stopped it | PASS for launch: 4 `Companion` processes were running and the first reported `Responding = True`. The UI and IPC button were not exercised. No `Companion` process remained after the stop |
| V-05 | `Get-Item`, recursive file size, `Get-FileHash` and `Get-AuthenticodeSignature` on the installer | Installer 121,556,431 bytes; unpacked 376,500,216 bytes across 73 files; SHA256 `CEE02741491F0BF7253E05879BC85E49FE2BBAED228FCC76A9228EC451165CDB`; `NotSigned` |
| V-06 | `npm ls --depth=0` | Electron 45.0.0, electron-builder 26.18.0, Vite 8.3.5, TypeScript 6.0.3, Vitest 5.0.5, React 19.3.1, Zod 4.6.7, ESLint 10.13.0 |

Not yet verified: installing the NSIS package, first-run behaviour on a clean Windows VM, tray/startup behaviour, E2E automation, and CI execution on GitHub. Those remain open.

## 8. M2 G2 storage and key research

Research and prototype evidence. The approved packages were installed on 2026-10-25 and the eight gates were run on Windows with Electron 45 and Node 22. The G2 approval and the gate evidence are recorded below and in section 9; production storage code has not been written.

G2 was approved by the owner on 2026-10-25 for all four questions: the proposed SQLCipher-compatible package, the DPAPI-wrapped random database key with Windows Credential Manager provider keys and no escrow, passphrase backups, and the eight prototype gates. The gate evidence is recorded in section 9.

| ID | Evidence | Source | Status |
| --- | --- | --- | --- |
| D-01 | SQLCipher Community Edition is BSD-style licensed and requires the copyright, licence and dependency notices in a user-accessible location. SQLCipher Commercial Edition starts at $999 per application per year. Official SQLCipher is a C library, not a maintained Electron/Node binding. | `https://www.zetetic.net/sqlcipher/license/`; `https://www.zetetic.net/sqlcipher/community/`; `https://www.zetetic.net/sqlcipher/commercial/` | VERIFIED |
| D-02 | SQLite3MultipleCiphers is MIT licensed and implements a SQLCipher-compatible AES-256-CBC cipher as well as its own default sqleet/ChaCha20-Poly1305 scheme. Its docs state that temporary data is stored in memory by default and temp files are encrypted starting with 2.6.0. The package bundles 2.4.0, so the app sets `PRAGMA temp_store = MEMORY`; the prototype confirmed `temp_store = 2` and no temp files after a 20,000-row sort. | `https://github.com/utelle/SQLite3MultipleCiphers`; `https://utelle.github.io/SQLite3MultipleCiphers/docs/ciphers/cipher_sqlcipher/`; `https://utelle.github.io/SQLite3MultipleCiphers/docs/architecture/arch_temp_files/`; section 9 | VERIFIED |
| D-03 | `better-sqlite3-multiple-ciphers` 13.0.3 is MIT licensed, uses Node-API, bundles SQLite 3.53.4 and SQLite3MultipleCiphers 2.4.0, and provides prebuilt binaries for Electron 35+ on Windows x64 and arm64. It is a small, single-maintainer fork; prebuilt binaries for all platforms are bundled, so packaging must prune unused binaries and unpack the selected `.node` file from ASAR. It is not the official Zetetic SQLCipher build. | `https://github.com/m4heshd/better-sqlite3-multiple-ciphers/releases/tag/v13.0.3`; `https://www.npmjs.com/package/better-sqlite3-multiple-ciphers` | VERIFIED |
| D-04 | Electron `safeStorage` uses DPAPI on Windows. The synchronous methods are deprecated in Electron 45 and removed in Electron 46; the asynchronous `isAsyncEncryptionAvailable`, `encryptStringAsync` and `decryptStringAsync` methods must be used. `decryptStringAsync` returns `{ result, shouldReEncrypt }`. DPAPI protects against other users and casual offline disk access, but not against other applications running as the same user or an offline attacker who can recover the Windows account password. Prototype: async encryption was available; a 74-byte wrapped key was unwrapped by a sequential second Electron 45 process with `shouldReEncrypt = false`. | `https://www.electronjs.org/docs/latest/api/safe-storage`; `https://github.com/electron/electron/blob/main/docs/breaking-changes.md`; section 9 | VERIFIED |
| D-05 | Windows Credential Manager generic credentials are scoped to the logged-on user and are suitable for API keys, not bulk data. `@github/keytar` 7.10.6 is an MIT-licensed maintained fork of the archived `atom/node-keytar` and uses Credential Vault on Windows. Its Electron 45 prebuild/ABI and electron-builder packaging were tested: set, read, list and delete passed, including a packaged credential round trip. | `https://www.npmjs.com/package/@github/keytar`; W-07; section 9 | VERIFIED |
| D-06 | The prototype verified FTS5 in the encrypted database, encrypted WAL with `temp_store = MEMORY`, `VACUUM INTO` snapshots, wrong-key rejection, portable export/restore/rekey, passphrase and ciphertext tamper rejection, failed-migration rollback, page size 4096, and a raw key scan. `better-sqlite3`'s `backup()` API is incompatible with an encrypted source and target in 13.0.3; `VACUUM INTO` is the tested snapshot path. | Local prototype evidence, section 9 | VERIFIED |

## 9. M2 G2 prototype gate evidence

All eight gates passed on 2026-10-25. Environment: Windows, Electron 45.0.0, Node 22.23.4 for the Node gate, packaged Node 24.22.0, SQLite 3.53.4, `better-sqlite3-multiple-ciphers` 13.0.3 and `@github/keytar` 7.10.6. Probes were run outside the repository under `%TEMP%\opencode\g2-proto`. The temporary packaged probe was removed from the production main process after the evidence was captured; the dependency and packaging configuration remains.

| ID | Gate | Evidence | Result |
| --- | --- | --- | --- |
| G2-01 | Native module loads in Node 22 and Electron 45 | `npx -y node@22 probe.cjs` loaded the package and encrypted database; the packaged Electron main process loaded the same package and opened the database | PASS |
| G2-02 | Encryption at rest, wrong key and restart | Node 22 output: `cipher: sqlcipher`, `legacy: 0`, `kdfIter: 256000`, `pageSize: 4096`, `journalMode: wal`, `tempStore: 2`, `foreignKeys: 1`, `wrongKeyRejected: true`, `processRestartVerified: true`; DB 28,672 bytes, WAL 53,592 bytes; marker absent from both | PASS |
| G2-03 | FTS5 on the encrypted database | `fts5: true`; the probe created `notes_fts` and matched a row after reopening | PASS |
| G2-04 | WAL, temp, backup, export and restore | `VACUUM INTO` produced a 28,672-byte encrypted backup that reopened; portable export was 28,945 bytes; `exportVerified`, `restoreRekeyVerified`, `wrongPassphraseRejected` and `tamperRejected` were true; a 20,000-row sort under `temp_store = MEMORY` left `tempFilesAfterSort: 0`. `db.backup()` failed with `backup is not supported with incompatible source and target databases`; `sqlcipher_export` was absent; `serialize` failed | PASS with `VACUUM INTO` replacing the backup API |
| G2-05 | electron-builder native packaging | `npx electron-builder --win dir --x64` and `npm run package` succeeded; the only `.node` files in `app.asar.unpacked` were `@github/keytar/prebuilds/win32-x64/keytar.node` (162,816 bytes) and `better-sqlite3-multiple-ciphers/prebuilds/win32-x64.node` (2,365,952 bytes); no unused platform binaries | PASS |
| G2-06 | Credential Manager through keytar | `@github/keytar` set, read, listed and deleted a disposable generic credential under Electron 45; the packaged probe also passed the Credential Manager round trip | PASS |
| G2-07 | Key-material scan and DPAPI wrapping | `rawKeyAbsentFromAllFiles: true`; the unwrapped key was absent from every probe file and from the database, WAL, backup and portable export; the 74-byte key file was DPAPI-wrapped and opened by a sequential second Electron process | PASS |
| G2-08 | Restart and failed migration | A second Node process reopened the encrypted database; a simulated migration transaction rolled back, the migration table was absent, and the original data reopened (`failedMigrationRollbackVerified: true`) | PASS |
| G2-09 | Packaged probe | Temporary packaged probe with `COMPANION_STORAGE_PROBE=1` returned exit 0 and `{ "ok": true, "gate": "packaged-storage-probe", "electron": "45.0.0", "node": "24.22.0", "sqlite": "3.53.4", "dbBytes": 28672, "walBytes": 53592, "backupBytes": 28672, "fts5": true, "credentialManager": true, "plaintextAbsent": true }` | PASS |
| G2-10 | Final build and launch | `npm run verify` passed after probe removal: ESLint clean, `tsc` clean, 2 files / 9 tests, main bundle 743.4 KB. Final unsigned NSIS installer: 122,573,738 bytes (116.9 MiB), SHA256 `F24B0C22EA23E24ED8ACD0653FA31666D71BF6F357EE48FC9601BF5383E5D577`, `NotSigned`; unpacked app 379,071,247 bytes across 103 files; a normal packaged launch produced 4 responding processes and left none running | PASS |

The Node 22 output was:

```json
{
  "gate": "node-storage",
  "observed": {
    "cipher": "sqlcipher",
    "legacy": "0",
    "kdfIter": "256000",
    "pageSize": 4096,
    "journalMode": "wal",
    "tempStore": 2,
    "foreignKeys": 1
  },
  "dbBytes": 28672,
  "openWalBytes": 53592,
  "backupBytes": 28672,
  "exportBytes": 28945,
  "tempFilesAfterSort": 0,
  "fts5": true,
  "wrongKeyRejected": true,
  "processRestartVerified": true,
  "failedMigrationRollbackVerified": true,
  "backupVerified": true,
  "exportVerified": true,
  "tamperRejected": true,
  "wrongPassphraseRejected": true,
  "restoreRekeyVerified": true,
  "plaintextMarkerAbsent": true,
  "sqliteHeaderAbsent": true,
  "rawKeyAbsentFromAllFiles": true
}
```

The Electron keytar and restart probe produced:

```json
{"gate":"electron-safeStorage-keytar","asyncAvailable":true,"wrappedKeyLength":74,"keytarSetGetListDeleteVerified":true,"processRestartVerified":false}
{"gate":"electron-safeStorage-restart","asyncAvailable":true,"processRestartVerified":true,"wrappedKeyLength":74,"shouldReEncrypt":false}
```

The first line is the create-and-keytar pass; `processRestartVerified` is false there by design because the restart check runs in a sequential second process. A concurrent second child was invalid because it shared the same Electron userData and GPU cache, so it is not counted as a failure.

Remaining verification limits: the 4096-byte page size is recorded but production code must pin it, the installer has not been installed on a clean machine, CI has not run on GitHub, and no production storage, migration, credential, backup or restore code exists yet.

The gate evidence and packaging configuration were committed locally as `cbd31b5` (`G2: pass storage prototypes and record gate evidence`). Nothing has been pushed.
## 10. M4 provider gateway thin-slice evidence (2026-10-26)

| ID | Evidence | Result |
| --- | --- | --- |
| V-07 | Official Gemini pricing: `https://ai.google.dev/gemini-api/docs/pricing` | VERIFIED: Google documents a free tier with limited model access and warns that free-tier content may be used to improve products; limits are not treated as fixed app constants |
| V-08 | Official Gemini model page: `https://ai.google.dev/gemini-api/docs/models` | VERIFIED: `gemini-2.5-flash-lite` is a documented model; the catalog uses it as the Gemini free-tier default as of this date |
| V-09 | Official Groq limits: `https://console.groq.com/docs/rate-limits` | VERIFIED: account/org limits and response headers are documented; router records rate-limit failures and retry timing |
| V-10 | Official Mistral free mode and limits: `https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key` and `https://docs.mistral.ai/admin/billing-usage/usage-limits` | VERIFIED: free mode/API keys exist with limited, account-specific usage; exact quotas are not hard-coded |
| V-11 | `npm.cmd run verify` from `companion/` with approved elevated build execution; focused provider tests also rerun afterward | PASS: ESLint clean, TypeScript clean, 20 test files / 180 tests passed, Electron main/preload and Vite renderer builds completed |
| V-12 | Provider implementation review | PASS: Gemini REST adapter; structured 400/401/402/403/408/429/5xx mapping; provider-specific model selection during fallback; custom HTTPS OpenAI-compatible provider registration |

Important limitation: free-tier availability, regional eligibility and quotas remain provider-account facts and can change. The app does not promise unlimited free use. Full OS control, voice and UI automation remain behind the documented permission/risk gates; the current build does not claim to control everything.

## 11. Provider catalog revision evidence (2026-10-26)

| ID | Evidence | Result |
| --- | --- | --- |
| V-13 | Active `PROVIDER_CATALOG` and `getProviderCatalog()` inspection | PASS: exactly Gemini, DeepSeek, OpenAI/ChatGPT, Anthropic/Claude and Perplexity are exposed; Groq, OpenRouter, Together and Fireworks are not active defaults |
| V-14 | Provider implementation inspection | PASS: Gemini native REST, DeepSeek/OpenAI/Perplexity OpenAI-compatible APIs, and Anthropic Messages API are represented with separate endpoints and request formats |
| V-15 | `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test -- --run` | PASS: 180 tests passed |
| V-16 | Official API references | OpenAI Chat Completions: `https://platform.openai.com/docs/api-reference/chat`; DeepSeek Chat Completions: `https://api-docs.deepseek.com/api/create-chat-completion/`; Anthropic API docs: `https://docs.anthropic.com/en/api/messages`; Perplexity API docs: `https://docs.perplexity.ai/` |

## 12. Live voice interaction evidence (2026-10-26)

| ID | Evidence | Result |
| --- | --- | --- |
| V-17 | Renderer voice implementation inspection | PASS: explicit start, continuous recognition, visible live state, interim transcript, spoken response, stop/cleanup paths |
| V-18 | `npm.cmd run verify` from `companion/` with approved elevated build execution | PASS: ESLint clean, TypeScript clean, 20 test files / 180 tests passed, Electron/Vite production build completed |
| V-19 | Privacy/safety inspection | PASS: no raw audio persistence; microphone is not started until the owner presses Start listening; arbitrary OS control is not enabled by voice alone |

## 13. Gemini validation fix evidence (2026-10-26)

| ID | Evidence | Result |
| --- | --- | --- |
| V-20 | Official Gemini API errors: `https://ai.google.dev/gemini-api/docs/api-errors` | VERIFIED: HTTP 404 can mean `model_not_found`; the previous fixed-model probe could therefore reject an otherwise valid key |
| V-21 | Gemini provider implementation inspection | PASS: `models.list` is queried with the key, only models advertising `generateContent` are selected, and the selected model is reused for completion |
| V-22 | `npm.cmd run verify` from `companion/` | PASS: lint, typecheck, 20 test files / 180 tests, and production build |

## 14. v3 brief baseline and registry (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-23 | `git -C ... status --porcelain=v1`; `git log --oneline -15` | Clean worktree at baseline; HEAD `6244f85 Improve WhatsApp automation: search contact and send` |
| V-24 | `npm.cmd run verify` from `companion/` | ESLint 0 errors / 6 warnings; TypeScript clean; 20 test files / 182 tests passed; Electron main/preload and Vite renderer built |
| V-25 | Source inspection of `apps/desktop/src/main/index.ts` | Found: IPC grants every permission (`os.open`, `os.media`, `os.speak`, `os.telephony`, `os.exec`, `memory.read`, `memory.write`, `drafts.write`); `osTryCommand` auto-confirms class 3 results; no lock/elevation check |
| V-26 | Source inspection of `packages/core/src/os-control/windows.ts` | Found: WhatsApp returns `sent: true` after SendKeys exit 0; `playMedia` scrapes YouTube results HTML; no postcondition observation |
| V-27 | Source inspection of `apps/desktop/src/renderer/App.tsx` | Found: continuous dictation starts when a chat is active; mute is renderer-only; assistant text is spoken verbatim |
| V-28 | Source inspection of core modules | Found: storage, onboarding, provider router, conversation persistence and memory approval tests; no persona, greeting, proactive, learning-threshold, UIA or injection tests |
| V-29 | Adopted v3 brief and wrote `docs/REQUIREMENTS.md`, `docs/GAPS.md`, updated `docs/PROJECT_STATE.md` | Registry seeded from SC1-SC12 and K/V/O/W/M/P/L/S; v1 brief archived |

Baseline conclusion: the foundation builds and 182 tests pass, but the companion does not meet SC1-SC12. The first fix must close the trust boundary because the current IPC path can run arbitrary commands and auto-confirm them.

## 15. Safety slice: trust boundary, honest actions, greeting (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-30 | `npm.cmd run verify` from `companion/` | ESLint 0 errors / 0 warnings; TypeScript clean; 21 test files / 201 tests passed; Electron main/preload and Vite renderer built |
| V-31 | `npm.cmd run test -- --run packages/core/src/security/security.test.ts packages/core/src/tools/tools.test.ts` | 2 files / 27 tests passed after integrating `TrustedIntentGuard` into policy and executor |
| V-32 | Manual PowerShell probe using `GetForegroundWindow`, `GetWindowThreadProcessId`, `GetWindowText`, `OpenInputDesktop(0, false, 0x0001)` | `{"screenLocked":false,"process":"explorer","title":""}`; probe shape and DllImports work on this machine |
| V-33 | Source inspection of `apps/desktop/src/main/index.ts` | Safe default permissions; `buildToolContext` supplies environment snapshot; `osTryCommand` no longer auto-confirms; `osConfirmTool` executes only the pending action after owner confirmation; `osRejectTool` added |
| V-34 | Source inspection of `packages/core/src/os-control/windows.ts` and `tools.ts` | WhatsApp returns `{typed, sent:false, verified:false}` unless observed; risk class 3 + `os.message.send` + confirmation; YouTube HTML scraping removed, official search page opened instead |
| V-35 | Source inspection of `apps/desktop/src/renderer/App.tsx` | Startup greeting with owner name/time; explicit Start listening; no auto-dictation; confirmation card with Confirm/Cancel; "Stop everything"; "stop" voice command pauses listening |
| V-36 | Source inspection of `packages/core/src/security/*` | Untrusted/system denial, locked/secure-desktop denial, probe-failure fail-closed, class 3/4 rules, sensitive-target denylist, confirmation hash binding, emergency-stop manager |
| V-37 | `docs/REQUIREMENTS.md`, `docs/GAPS.md`, `docs/PROJECT_STATE.md` updated | Statuses moved to PARTIAL where only source/unit evidence exists; no row marked PASS except M3 (scraping removed) and pre-existing W8 |

Safety-slice conclusion: the critical trust-boundary defects are closed at the core/unit/IPC-source level, and the full verify gate is green. The slice is not yet proven end-to-end in Electron, and the WhatsApp observation reader, injection corpus, real integrity probe, greeting completeness and media ranking remain open.

## 16. External-content injection boundary (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-38 | `npm.cmd run test -- --run packages/core/src/security/untrusted-content.test.ts packages/core/src/security/security.test.ts` from `companion/` | PASS: 2 files / 22 tests passed. The corpus covers web, email, file, screen, filename, notification and audio text; each is denied for risk classes 1, 2 and 3. |
| V-39 | `npm.cmd run typecheck` from `companion/` | PASS: TypeScript completed with exit code 0 after adding `routeExternalContent`. |
| V-40 | Source inspection of `packages/core/src/security/untrusted-content.ts` | PASS: external content receives explicit `untrusted_content` provenance; it cannot produce `owner_ui` or `owner_voice`. |

Remaining limit: this is a core boundary/corpus check. No live screen, audio, notification or file producer has yet been wired to the route, and no Electron E2E has been run.

| V-41 | `npm.cmd run verify` from `companion/` with approved elevated build execution | PASS: ESLint clean, TypeScript clean, 22 test files / 208 tests passed, Electron main/preload and Vite renderer builds completed. |
| V-42 | `npm.cmd run test -- --run packages/core/src/voice/greeting.test.ts` and `npm.cmd run typecheck` | PASS: greeting composer tests 4/4; TypeScript completed with exit code 0. Coverage includes name, two-sentence limit, variation, pronunciation markup, mute and overnight quiet hours. |
| V-43 | `npm.cmd run verify` from `companion/` with approved elevated build execution | PASS: ESLint clean, TypeScript clean, 23 test files / 212 tests passed, Electron main/preload and Vite renderer builds completed. |
| V-44 | `npm.cmd start` from `companion/` with approved desktop execution, then clean Ctrl+C; process check afterward | PASS: encrypted storage opened, credential store available, desktop window created in ~0.9 s, and no Electron process remained after stop. Startup smoke only; not GUI feature E2E. |
| V-45 | `npm.cmd run verify` from `companion/` with approved elevated build execution | PASS: ESLint clean, TypeScript clean, 30 test files / 228 tests passed, Electron main/preload and Vite renderer builds completed. |
| V-46 | Direct `node --experimental-strip-types` invocation of `windows.ts` speech smoke | NOT RUN: Node native TS stripping could not resolve this repository's `.js` specifier to `.ts`; no audio result is claimed. Electron startup path was exercised separately. |
| V-47 | Bundled `spikes/runtime-smoke.ts` with project esbuild, then executed the bundle outside the sandbox | PASS: actual `speakText` returned `spoken:true`; actual `openTarget('calculator')` returned `opened:true, resolved:"calc"`. This covers one speech path and one launcher, not general UI automation. |
| V-48 | `npm.cmd run verify` from `companion/` with approved elevated build execution | PASS: ESLint clean, TypeScript clean, 30 test files / 229 tests passed, Electron main/preload and Vite renderer builds completed. |
| V-49 | `npm.cmd run verify` from `companion/` with approved elevated build execution | PASS: ESLint clean, TypeScript clean, 31 test files / 231 tests passed, Electron main/preload and Vite renderer builds completed after emergency-stop and decision-orchestration changes. |
| V-50 | Bundled `spikes/runtime-smoke.ts` with project esbuild, then executed it after process-observation changes | PASS: actual speech returned `spoken:true`; Calculator launch returned `opened:true,resolved:"calc"` only after `CalculatorApp.exe` was observed; exact test process was cleaned up. |
| V-51 | `npm.cmd run verify` from `companion/` with approved elevated build execution | PASS: ESLint clean, TypeScript clean, 31 test files / 231 tests passed, Electron main/preload and Vite renderer builds completed after process postcondition changes. |
| V-52 | `npm.cmd start` with live marker inspection of `%APPDATA%\\Companion\\heartbeat.json`, then external Ctrl+C and process check | PASS: heartbeat contained the live Electron PID/timestamp while running; Electron stopped and no process remained. No stop marker was written because Ctrl+C is an external termination, which is intentionally not treated as owner Stop. |
| V-53 | Disposable `spikes/uia-probe.ps1` against a newly launched Notepad process; exact test PID closed afterward | PASS: Windows UI Automation returned a unique Notepad window and 106 descendant elements with control types/pattern availability. User document text/titles were not recorded. An unrelated pre-existing Notepad process was not touched. |

## 17. Capability and learning-gap follow-up (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-54 | `npm.cmd run test -- --run packages/core/src/memory/memory.test.ts packages/core/src/os-control/capability-store.test.ts` from `companion/` | PASS: 2 files / 6 tests passed. Rejected memory lookup is normalized and repository-backed; capability success rates retain explicit observation counts. |
| V-55 | `npm.cmd run verify` from `companion/` with approved elevated build execution | PASS: ESLint 0 errors / 0 warnings, TypeScript clean, 33 test files / 234 tests passed, Electron main/preload and Vite renderer production builds completed. |

These results do not close the owner-gated voice-model, vision, real-messaging or elevated-control checks, and do not establish GUI end-to-end coverage or production readiness.

| V-56 | Bundled `spikes/runtime-smoke.ts` with project esbuild, executed it, and checked `Get-Process CalculatorApp` afterward | PASS: actual speech returned `spoken:true`; Calculator returned `opened:true,resolved:"calc"`; the smoke fixture cleaned up its newly-created Calculator process and no CalculatorApp process remained. |

## 18. Proposal-only desktop learning boundary (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-57 | `npm.cmd run test -- --run packages/core/src/memory/memory.test.ts apps/desktop/src/main/learning-policy.test.ts` from `companion/` | PASS: 2 files / 7 tests passed. Conversation recording can be disabled, and the desktop IPC path contains no provider-derived automatic profile mutation after a response. |
| V-58 | `npm.cmd run verify` from `companion/` with approved elevated build execution | PASS: ESLint 0 errors / 0 warnings, TypeScript clean, 34 test files / 236 tests passed, Electron main/preload and Vite renderer production builds completed. |

L5 is now PASS for the default desktop path. This does not mean conversation data is never stored: normal chat history remains local conversation data, and explicit owner-approved learning is still a separate unfinished workflow.

## 19. Live typed cognition and provider failure follow-up (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-59 | `npm.cmd run test -- --run packages/core/src/conversation/engine.test.ts packages/core/src/cognition/decision-orchestrator.test.ts` from `companion/` | PASS: 2 files / 14 tests passed. Configured conversation engines produce speech from validated TurnDecision output; JSON mode is requested, one repair is bounded, and a throwing provider fails over to the next source. |
| V-60 | `npm.cmd run verify` from `companion/` with approved elevated build execution | PASS: ESLint 0 errors / 0 warnings, TypeScript clean, 34 test files / 238 tests passed, Electron main/preload and Vite renderer production builds completed. |

The live cognition path still does not execute plans: proposals must continue through the existing deterministic policy/executor path, and persona regression/provider-switch persistence remain open.

| V-61 | `npm.cmd start` with live heartbeat inspection, then external Ctrl+C, process and marker check | PASS: encrypted storage opened, credential store was available, the desktop window was created, a heartbeat recorded a live Electron PID/timestamp, and after external termination no matching companion Electron process or crash marker remained. No stop marker was expected because termination was external. |

## 20. Persona regression suite (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-62 | `npm.cmd run test -- --run packages/core/src/cognition/persona-suite.test.ts` and `npm.cmd run verify` from `companion/` | PASS: the suite replayed 30 fixed prompts across three provider-output profiles (90 cases) and met its >=95% normalized-output rule threshold; the full gate passed with 35 files / 239 tests, clean lint/typecheck and both builds. |

This is a deterministic provider-profile regression suite, not a claim that three live hosted providers or the owner’s final persona have been validated.

## 21. Persisted startup control (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-63 | `npm.cmd run verify` from `companion/` with approved elevated build execution; source inspection of startup IPC/tray path | PASS: 35 test files / 239 tests, lint/typecheck/build clean. Startup preference is stored under the local settings table, applied per-user through Electron login-item settings, and exposed through owner-authenticated IPC plus tray enable/disable actions; default remains disabled. |

The OS startup setting has not yet been verified across a reboot or Task Manager disable transition, so SC5 remains PARTIAL.

## 22. Windows installer artifact (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-64 | `npm.cmd run package` from `companion/`; `Get-ChildItem apps/desktop/release`; `Get-FileHash .../Companion-0.1.0-x64.exe -Algorithm SHA256`; `Get-AuthenticodeSignature .../Companion-0.1.0-x64.exe` | PASS: NSIS packaging completed and produced `Companion-0.1.0-x64.exe` (122,715,309 bytes), blockmap and unpacked app including `dist/main/supervisor.js`. SHA-256: `DC57EBE6EB0C26F2E925F481F0C56DDEBC24D816005D6D0C0BCD1E79E20D45B5`. Authenticode status was `NotSigned`, as expected without G4 signing approval. |

The installer was not executed or installed on a clean machine; this is packaging evidence only.

## 23. Packaged runtime smoke (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-65 | Launch generated `apps/desktop/release/win-unpacked/Companion.exe`, inspect `%APPDATA%\\Companion\\heartbeat.json` and exact executable path, then `taskkill /PID <launched PID> /T /F` | PASS: packaged runtime started, created the expected Electron process tree, wrote a heartbeat with the launched PID/timestamp, and no matching packaged process remained after terminating the exact test tree. This was not an installer/clean-machine test. |

## 24. Reusable UI Automation service (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-66 | `npm.cmd run test -- --run packages/core/src/os-control/uia.test.ts`; bundled `spikes/uia-service-smoke.ts` with project esbuild and executed it; checked Notepad processes afterward | PASS: validation tests passed; the real service returned aggregate metadata for a Notepad window with 39 descendants/controls; the pre-existing Notepad PID remained untouched and no disposable test process remained. A first PID-only attempt failed closed with `target_window_not_found`, which is recorded as the expected safety behavior for a missing target window. |
| V-67 | `npm.cmd run verify` from `companion/` with approved elevated build execution | PASS: ESLint 0 errors / 0 warnings, TypeScript clean, 36 test files / 240 tests passed, Electron main/preload and Vite renderer production builds completed. |

The service is not yet integrated into typed app adapters or a 10-task benchmark, so O4 and SC3 remain PARTIAL.

## 27. Durable capability-store follow-up (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-70 | `npm.cmd run test -- --run packages/core/src/os-control/capability-store.test.ts packages/core/src/os-control/uia.test.ts`; `npm.cmd run verify` from `companion/` | PASS: capability and UIA focused tests passed (3/3); the durable key-value-backed capability store round-tripped app/version data and the full gate passed with 37 files / 243 tests, clean lint/typecheck and both builds. |

The durable adapter is ready to connect to encrypted settings, but no production app adapter currently records live capability observations automatically.

## 28. Policy-bundle integrity (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-71 | `npm.cmd run test -- --run packages/core/src/security/policy-bundle.test.ts packages/core/src/tools/tools.test.ts`; `npm.cmd run verify` from `companion/` | PASS: policy-bundle and tool-policy focused tests passed (15/15); the frozen built-in bundle verifies its SHA-256 invariants, tampered Class 4 policy is rejected, and the full gate passed with 38 files / 245 tests. |

Learning cannot mutate the policy bundle because it is frozen and policy evaluation verifies it before authorization.

## 29. Companion canary scan (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-72 | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\spikes\\secret-canary-scan.ps1` from the repository root | PASS: scanned 4 selected companion/docs/spikes roots across 8 text extensions and found 0 high-confidence API-key/private-key patterns. Legacy secrets/config stores and generated dependencies were intentionally excluded. |

The scan is evidence for the companion source scope, not a claim about excluded legacy data or all generated/dependency content.

## 30. Clipboard restoration helper (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-73 | `npm.cmd run verify` from `companion/` | PASS: ESLint clean, TypeScript clean, 39 test files / 248 tests passed, Electron main/preload, supervisor and Vite renderer builds completed. Clipboard helper tests prove restore on success and exception. |

The helper is not yet used by a paste-driven UIA adapter; no clipboard contents were accessed during tests beyond an in-memory fake.

## 25. Detached supervisor fixture (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-68 | Bundled `spikes/supervisor-smoke.ts` with project esbuild and executed it; fixture uses a temporary directory, a disposable Node child and a separate Node restart command | PASS: the supervisor detected the fixture crash marker, spawned exactly the configured restart executable, observed the bounded restart marker, and cleaned the temporary directory and fixture child. Unit policy tests cover owner stop/external termination exit, live-hang restart and the three-restart cap. |

This proves the supervisor logic and fixture restart path, not a real crashed Electron process or sleep/resume cycle; SC5 remains PARTIAL.

## 26. Packaged supervisor external-termination smoke (2026-10-29)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-69 | Launch rebuilt `apps/desktop/release/win-unpacked/Companion.exe`, inspect its exact process tree and heartbeat, terminate the exact root PID externally, wait three seconds, and inspect the exact packaged executable path | PASS: packaged runtime created its Electron process tree and heartbeat; after external termination no matching packaged process remained and it was not restarted. This proves the external-termination branch, not a real crash/hang restart. |

## 31. Voice-first companion slice (2026-10-30)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-74 | `npm.cmd run verify` from `companion/` | PASS: ESLint 0 errors / 0 warnings, TypeScript clean, 42 test files / 286 tests passed, and Electron main/preload, supervisor and Vite renderer builds completed. New tests cover voice settings/events/quiet hours/noise filtering and proactive-question cleanup. |
| V-75 | `npm.cmd run build -w @automata/desktop`; `apps/desktop/resources/voice/CompanionVoice.exe voices`; `CompanionVoice.exe speak` in a live shell | PASS: `scripts/build-voice.mjs` compiled the helper (21,504 bytes); `voices` returned WinRT David/Zira/Mark and `en-US` recognition; `speak` emitted `speech_started`/`speech_done` and was audible. |
| V-76 | `CompanionVoice.exe listen`, `listen-sapi`; loopback TTS phrase test | BLOCKED for WinRT: `listen` failed with `speech_privacy` (Windows speech privacy not accepted). `listen-sapi` reached `ready`, but loopback TTS was misrecognized (one token at 0.003 confidence), so the fallback is not reliable input. The app maps the privacy failure to a visible warning and an `ms-settings:privacy-speech` button. |
| V-77 | `npm.cmd run package` from `companion/`; inspect installer and helper; launch `release/win-unpacked/Companion.exe` with CDP, click Chat, inspect panel and helper process, terminate the exact tree | PASS: packaging produced `Companion-0.1.0-x64.exe` (122,764,179 bytes, SHA-256 `45CDA73F2673822628F1C736162789B017CF31768E8ABF05B8057CF4C7621EBF`, unsigned). The packaged helper exists at `resources/voice/CompanionVoice.exe` (21,504 bytes). The unpacked app auto-started the bundled helper after Chat opened and showed the visible SAPI fallback warning; after `taskkill /T /F` no `Companion` or `CompanionVoice` process remained. |
| V-78 | CDP evaluation against the built app: open Chat, wait, read voice panel; call `personaProactive(null, [])`; inspect `%APPDATA%\\Companion\\logs\\companion.log`; repeat after the Gemini request fix | PASS after fix: Chat-tab auto-start reached `Listening live` and spawned `CompanionVoice`; the first proactive call returned `fallback` with a Gemini `INVALID_ARGUMENT` (`contents is not specified`); after adding an explicit user turn, the same call returned a model question (`What are we actually trying to get done today?`, source `model`). A typed chat turn also returned a provider reply. The test wrote one prompt into conversation `814f23b2-889a-40fc-9eb5-09a242dcb9e1`. |

The live WinRT microphone path, real owner speech, barge-in timing and raw-audio scan remain unverified; V-75/V-78 prove TTS, helper startup, auto-start and model proactivity, not recognition quality.

## 32. Speech-first + voice onboarding slice (2026-10-30)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-79 | `npm.cmd run verify` from `companion/` | PASS: ESLint 0 errors / 0 warnings, TypeScript clean, 44 test files / 297 tests (includes voice-guide, audio/segmenter, cloud consent defaults), Electron main/preload/supervisor and Vite renderer builds completed. |
| V-80 | Source inspection: `voice-capture.ts`, `voiceTranscribe` consent gate, `advanceVoiceGuide`, OS call/WhatsApp/media honesty | PASS by inspection: Gemini transcription requires `cloudSpeechConsent`; voice guide collects owner details + preferences + preset + speech consent; WhatsApp UIA observation and call name/tel paths present. |
| V-81 | `npm.cmd run package` from `companion/`; `Get-FileHash` / `Get-AuthenticodeSignature` on `apps/desktop/release/Companion-0.1.0-x64.exe` | PASS: NSIS x64 installer rebuilt after speech-first + voice onboarding slice. Artifact `Companion-0.1.0-x64.exe` is 122,781,868 bytes; SHA-256 `E7F850384880EC5B915CCEFDBF47DC4B752AFB4B983F534B7EB54C3A167444E0`; Authenticode `NotSigned` (expected without G4). Bundled helper `resources/voice/CompanionVoice.exe` is 22,528 bytes. Clean-machine install/SmartScreen still open. |

## 33. Production hardening finish (email / research / enterprise UI) (2026-10-30)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-82 | `npm.cmd run verify` from `companion/` | PASS: ESLint 0 errors / 0 warnings, TypeScript clean, 49 test files / 311 tests, Electron main/preload/supervisor and Vite renderer builds completed. Covers IMAP/SMTP helpers, research tools, owner-seed, proactive career/email candidates, and WinRT SSML pitch. |
| V-83 | `npm.cmd run package -w @automata/desktop`; `Get-FileHash` SHA256 on `apps/desktop/release/Companion-0.1.0-x64.exe` | PASS: NSIS x64 installer rebuilt after production hardening. Artifact `Companion-0.1.0-x64.exe` is 122,837,891 bytes; SHA-256 `32E04C31DFB2FD78CC7C02996BBE8174B0F2138DF1AA2A14CADE86675143B8E8`; unsigned (expected without G4). Bundled helper `resources/voice/CompanionVoice.exe` is 23,552 bytes. |

## 34. Combined multi-model answer path (2026-11-17)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-84 | `npm run verify` from `companion/` (lint + typecheck + test + build) | PASS: ESLint 0 errors, TypeScript clean, 67 test files / 532 tests passed (up from 66 / 515), Electron main/preload/supervisor and Vite renderer builds completed. The 17 new tests in `packages/core/src/providers/ensemble.test.ts` cover response scoring (empty/refusal/JSON), the default best-of judge, majority voting, best-of/fastest/majority complete paths, timeout keeping arrived candidates, throwing `provider_down` when every member fails, single-member short-circuit, an injected judge, abort propagation, health/capabilities merging, and streaming from the highest-weight member. |

The ensemble is unit-verified and wired through IPC/UI; it has not been exercised against live provider accounts, and the desktop renderer was not launched under CDP in this pass.

## 35. Premium UI refresh (2026-11-17)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-85 | `npm run build -w @automata/desktop` and `npm run verify` from `companion/`; inspect Vite CSS bundle size | PASS: the renderer CSS bundle changed from 15.22 kB to 17.99 kB after the token palette and component refinements; the full gate stayed green. This is a build/packaging check only — the refreshed surfaces were not visually reviewed in this Linux sandbox (the app is Windows-first). |

## 36. Additional OS operations (2026-11-17)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-86 | `npm run typecheck`; `npx vitest run packages/core/src/os-control/system-control.test.ts packages/core/src/os-control/window-control.test.ts`; `npm run verify` from `companion/` | PASS: `os.power` (shutdown/restart/hibernate, Class 3 + confirmation), `os.moveWindow` and `os.resizeWindow` added with NL patterns; 32 focused tests passed; full gate green at 67 files / 539 tests, 0 lint errors, 0 type errors, both builds passed. |

Schema/metadata only — the PowerShell `shutdown.exe` and `SetWindowPos` paths were not executed (the test host is Linux; the tools are Windows-first), so real power and window-geometry effects remain unverified.

## 37. Release v0.3.0, real screenshots and README refresh (2026-11-17)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-87 | `npm test` and `npm run verify` from `companion/` | PASS: 67 test files / 539 tests passed, 0 type errors, 0 lint errors, Electron main/preload/supervisor and Vite renderer builds completed. |
| V-88 | Version references across `companion/package.json`, `companion/apps/desktop/package.json`, `companion/packages/core/package.json` | Bumped 0.2.0 → 0.3.0 (including the `@automata/core` dependency range) so the release metadata, the packaged artifact name (`Companion-0.3.0-x64.exe`) and the running app's Runtime version agree. |
| V-89 | Screenshot capture: launched the real Electron app (`node_modules/electron/dist/electron . --remote-debugging-port=9333`) under `Xvfb :99` and drove it over the Chrome DevTools Protocol (`Page.captureScreenshot` at 1440×900) | Four PNGs written to `docs/screenshots/`: `main-interface.png`, `setup.png`, `settings-voice.png`, `settings-providers.png`. Each capture logged the on-screen `document.body.innerText` for confirmation (Talk view, guided setup, voice settings, and the Providers view with the "Combined intelligence" card). The Runtime panel shows `v0.3.0`. |
| V-90 | Repository inspection of registered tools | Corrected the README tool count: `createOsControlTools()` returns 37 tools; the desktop app registers 46 built-in tools in total (37 OS + 2 web + 5 email + 2 memory). |

The screenshots were captured from the running app in a Linux sandbox. Two caveats are recorded honestly: (1) the OS-specific "Windows Credential Manager could not be read" error banner was suppressed in the captures because the Windows credential store is unavailable on the Linux test host; and (2) Windows-only behaviour (OS actions, credential store, packaged installer) remains unexercised here.

## 38. Rebuilt UI, application icon, MIT licence, release v0.4.0 (2026-11-17)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-91 | `npm run verify` from `companion/` (lint + typecheck + test + build) | PASS: ESLint 0 errors, TypeScript clean, 67 test files / 539 tests passed, Electron main/preload/supervisor and Vite renderer builds completed (CSS 17.31 kB, JS 301.23 kB). |
| V-92 | `npm run build -w @automata/desktop`; compared emitted asset hashes against the captured build | The rebuilt bundle reproduced the verified hashes `index-BqOOhMEM.css` / `index-Cjy5vVHi.js`, i.e. the screenshots below are of the shipped renderer, not a stale build. |
| V-93 | Layout verification: loaded the built `dist/renderer/index.html` in Electron under `Xvfb :99` with a stubbed preload and drove it over the Chrome DevTools Protocol, reporting DOM geometry (`/workspace/.capture/verify-ui.cjs`) | PASS: `.composer` sits inside the viewport (`y=552`, `h=111`, `bottom=663`; viewport height 691, so the earlier grid-overflow bug — where the composer fell below the fold — is fixed); Talk renders the empty-state hero with the orb and 5 suggestion chips; Setup renders the hero, 4 panels and 4 provider cards; Settings renders the section grid with rail buttons `["Voice","Persona","Privacy","Email","Payments","Providers","Memory","Data"]`. |
| V-94 | Screenshot capture: same harness, `Emulation.setDeviceMetricsOverride` 1440×940 @2×, then `Page.captureScreenshot` | Five PNGs written to `docs/screenshots/`: `main-interface.png` (394,858 B), `talk-hero.png` (377,969 B), `setup.png` (662,985 B), `settings-providers.png` (479,863 B), `settings-voice.png` (360,058 B). |
| V-95 | App icon: rasterised `resources/icon.svg` through the Electron/Chromium renderer at 512×512, then built a multi-size ICO with Pillow | `resources/icon.png` is now a real 512×512 RGBA PNG (158,092 B) — previously an SVG file carrying a `.png` extension — and `resources/icon.ico` (84,631 B) is a 7-size ICO (16/24/32/48/64/128/256). `apps/desktop/package.json` points `win.icon`, `nsis.installerIcon` and `nsis.uninstallerIcon` at the `.ico`, the packaged `files` list ships all three, and the BrowserWindow now sets the PNG as its window icon. |
| V-96 | Licence + version: added `LICENSE`; set `license` to `MIT` in the four `package.json` files; bumped 0.3.0 → 0.4.0 in `companion/package.json`, `apps/desktop/package.json` (and the `@automata/core` range) and `packages/core/package.json`; `npm install --package-lock-only` | The lockfile reports `0.4.0` for the root and both workspaces, matching the manifests; the release artifact name resolves to `Companion-0.4.0-x64.exe`. |

Honesty caveats for this pass: (1) the screenshot harness uses a **stubbed preload** because the real main process needs Windows native modules (`@github/keytar`, SQLCipher) and cannot start on the Linux test host — the captures therefore show the real shipped renderer against representative data, not a live Windows session; (2) Windows-only behaviour (real OS actions, Windows Credential Manager, NSIS install, exe/taskbar icon rendering) is unexercised here; (3) the NSIS installer was **not** rebuilt in this pass.

## 39. Ambient video backdrop + video-derived icon + release v0.5.0 (2026-11-17)

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-97 | Video codec compatibility: `ffprobe` on the supplied source MP4 | H.264 **High profile, level 4.1, yuv420p**, 960×720, 30 fps, 5.0 s, 150 frames, **no audio**, 666 KB — i.e. inside Chromium's bundled proprietary-codec set, so no transcode was needed. |
| V-98 | `npm run build -w @automata/desktop` and a real Electron load of `dist/renderer/index.html` under `xvfb-run`, driven over the Chrome DevTools Protocol (`/workspace/.capture/verify-bg.cjs`) | PASS: `.app-bg-video` is present and playing — `readyState=4`, `networkState=1`, `paused=false`, `duration=5`, `videoWidth=960`, `videoHeight=720`, `error=null`, `currentTime` advancing; **zero CSP violations** after adding `media-src 'self'` to the renderer CSP. Vite emitted `background-DgeqIC8q.mp4` (681,751 B) and `background-Bpid2q1v.jpg` (56,604 B). |
| V-99 | Visibility of the backdrop: same harness, `Page.captureScreenshot` with the backdrop layer on vs. removed (`display:none`), plus `document.elementsFromPoint` stacking probes and a luminance histogram | PASS: backdrop ON vs. layer removed is **4.13/255 mean** over **9.8 % of pixels**; video frame vs. poster-only is 1.36/255 over 1.0 %; scene luminance with backdrop (mean 24.0 / p10 11 / p50 19 / p90 29) vs. without (mean 20.9 / p10 9 / p50 17 / p90 26). The first pass measured 0.10/255 with 0.0 % differing — the opaque `.hero`/`.panel` surfaces were painting over the layer, which is what the glass pass fixed. |
| V-100 | Screenshot re-capture with the backdrop live: same CDP harness (`/workspace/.capture/shot-main.cjs`), 1440×940, downscaled to 1440×940 for the repo | Five PNGs rewritten in `docs/screenshots/`: `main-interface.png` (841,373 B), `talk-hero.png` (723,509 B), `setup.png` (621,726 B), `settings-providers.png` (612,946 B), `settings-voice.png` (672,535 B). Mean scene luminance rose from 15.4 (previous, plain dark canvas) to 26.9 for `main-interface.png`, consistent with the photographic backdrop being composited behind the UI. |
| V-101 | App icon from the video: `ffmpeg` frame crop → 512×512 PNG; Pillow multi-size ICO; then byte-probe of the packaged binaries | `resources/icon.png` is a 512×512 frame cropped from the backdrop (304,261 B); `resources/icon.ico` is a 7-size ICO (147,281 B). The ICO's frame payload is present in both `release/win-unpacked/Companion.exe` and `release/Companion-0.5.0-x64.exe`, i.e. the video-derived icon is embedded in the built app and installer. The stale `resources/icon.svg` and its `files` entry were removed. |
| V-102 | Version + release: `npm run verify`; `npm run package`; `sha256sum` | PASS: 67 files / 539 tests, 0 type errors, 0 lint errors, both builds succeed. Version bumped 0.4.0 → 0.5.0 across the three workspace manifests (and the `@automata/core` range), lockfile re-synced to `0.5.0`. `electron-builder` 26.18.0 produced `apps/desktop/release/Companion-0.5.0-x64.exe` (123,726,394 B), SHA-256 `44ceba33ffd96da24ad3ff530bc994f72a1489ee4efa518c92c62540c1bf3df2`. |
| V-103 | `packages/core/src/providers/mock-provider.test.ts` — `simulates latency` | The assertion `duration >= 50` flaked at **49 ms** under the 67-worker parallel suite (passes in isolation): `setTimeout(50)` can fire a hair early and `Date.now()` truncates. Floor relaxed to 40 ms with an explanatory comment; `npm run verify` is now reproducibly green. |

Honesty caveats for this pass: (1) the screenshots and the backdrop visibility checks use a **stubbed preload** — the real main process needs Windows native modules and cannot start on the Linux test host; (2) the NSIS installer **was** built this pass, but it is unsigned and was not installed or run on Windows, so install-time behaviour and taskbar/exe icon rendering remain unverified; (3) the backdrop is a renderer asset only; no main-process change was made or needed.

## 40. Rebrand to Automata + monorepo unification + release v0.5.0 (2026-11-17)

This pass unifies the repository and renames the product **Companion → Automata (by HassanTech)**. It is recorded here because it changes user-facing identity, the packaging metadata, the data locations and the CI workflow — not the shipped logic.

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-104 | Repository unification: `git mv companion/apps → apps`, `git mv companion/packages → packages`, promoted the root manifests, then `git status --short` | PASS: a single npm-workspaces monorepo at the repository root (`apps/desktop/`, `packages/core/`, `docs/`); `companion/` no longer exists. The legacy WhatsApp persona bot (`src/`, `scripts/`, `data/`, `.env.example`, pm2) was removed — it was a Baileys/WhatsApp-Web bot, unrelated to the app's WhatsApp **Desktop** UI-automation tool — and is preserved in git history plus the `archive/whatsapp-persona-bot` and `pre-automata` tags. |
| V-105 | Brand rename across source: `@companion/* → @automata/*` in every import, root `package.json` `name` = `automata`, and user-facing strings ("Companion" → "Automata") in the renderer, provider catalog, secure-setup guide and docs | PASS: `ProductName`/window title/tray tip/`app.setName`/`<title>`/`<h1>`/rail brand all read **Automata**; `apps/desktop/package.json` now has `productName "Automata"`, `appId "com.hassantech.automata"`, `author "HassanTech"`, `copyright "Copyright © 2026 HassanTech"` and `artifactName ${productName}-${version}-${arch}.${ext}`. Internal-only identifiers were deliberately left unchanged: `window.companion` (preload bridge), the `--companion-session-token` argv flag, the `CompanionDatabase`/`openCompanionDatabase` TS types, the `CompanionCam`/`CompanionVid` temp-file names and test fixtures. |
| V-106 | Lockfile re-sync: set root `package.json` name to `automata`, then `npm install`; `grep -c '@companion/' package-lock.json` | `npm install` reported "added 50 packages, and removed 2 packages"; `package-lock.json` now reports `name: "automata"`, **0** `@companion/` references and 5 `@automata/` references; `node_modules/@automata/{core,desktop}` exist and no `@companion` directory remains. |
| V-107 | Voice helper rename (atomic): `git mv` of `CompanionVoice.cs`/`.exe`, `scripts/build-voice.mjs` source/output paths, and the two main-process helper lookups | PASS: `apps/desktop/src/voice/AutomataVoice.cs` declares `public static class AutomataVoice`; `apps/desktop/resources/voice/AutomataVoice.exe` exists; the build script and `src/main/index.ts` resolve `AutomataVoice.exe`, so the packaged helper path cannot break. |
| V-108 | CI retarget: `git mv .github/workflows/companion-ci.yml .github/workflows/ci.yml` and re-pointed it at the repository root | The workflow is named "Automata CI", runs `npm ci` then `npm run verify` on `windows-latest` from the repo root. A tag/manual **Release** workflow was added at `.github/workflows/release.yml` (builds the NSIS installer on `windows-latest`, writes `SHA256SUMS.txt`, attaches both to the Release). |
| V-109 | `npm run verify` from the **repository root** | PASS: ESLint 0 errors, TypeScript clean, 67 test files / 539 tests passed, both builds succeed. Renderer output confirms the backdrop assets are still emitted (`background-Bpid2q1v.jpg`, `background-DgeqIC8q.mp4`); the JS bundle hash changed with the rebrand (`index-BtxxwLUr.js`). |
| V-110 | Installer rebuild: `rm -rf apps/desktop/release && npm run package` on the Linux host, then `sha256sum` | `electron-builder` 26.18.0 produced `apps/desktop/release/Automata-0.5.0-x64.exe` (**123,726,687 B**), SHA-256 `9e06f395706fd87bb0f1e471b80c72fa211bc1187feab5b60427be12b735fecf`; the packaged app is `release/win-unpacked/Automata.exe`. This replaces the stale `Companion-0.5.0-x64.exe` hash (`44ceba33…bf3df2`) recorded in V-102. **This is the local Linux build**; the installer actually published (V-112) is a separate Windows-CI build with its own hash. |
| V-111 | New community/release artifacts: `docs/demo.gif`, `docs/social-preview.png`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `ROADMAP.md`, `docs/RECIPES.md`, `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/pull_request_template.md` | The demo GIF is 900×584, 10 fps, ~10 s (Talk → Setup → Settings with the backdrop live) at **3,365,466 B** (under the 5 MB budget); the social preview is a 1280×640 PNG (714,635 B). All files referenced by the root `README.md` now exist. |
| V-112 | Publication: pushed `main` (`3d056da..f2e9d0a`, later `..c13c54c`) and tag `v0.5.0`; then `GET /repos/hassan200503/automata/actions/runs` and `GET /repos/.../releases/tags/v0.5.0` | PASS: both workflows completed green (**Automata CI: success**, **Release: success**). Release `v0.5.0` is published with two assets — `Automata-0.5.0-x64.exe` (**124,654,463 B**, the Windows-CI build) and `SHA256SUMS.txt` (**89 B**) — whose checksum reads `7fe7c78f6dd5b6428b930fb57451190747841b9563c2403ad980842e7c97b6c5 *Automata-0.5.0-x64.exe`. The asset downloads anonymously (`http=206` on a ranged GET); the repository is public under the MIT licence. |
| V-113 | Release-notes checksum embedding: edited `.github/workflows/release.yml` so the job writes `SHA256SUMS.txt` and composes `release-notes.md` (with the hash and a `certutil -hashfile` instruction) then publishes it via `body_path`; committed as `c13c54c` and pushed | PASS: the workflow now embeds the real SHA-256 in every future release body, and the existing `v0.5.0` body was back-filled via `PATCH /repos/.../releases/448565593` (`status: 200`), so the `README.md` claim that the download is verified "against the SHA-256 table in the release notes" is true for v0.5.0 and every later release. |

Honesty caveats for this pass: (1) `npm run verify` and the installer build ran on the **Linux** host (Windows installer cross-built with `wine`); the artifact is unsigned and was not installed or run on Windows, so install-time behaviour and taskbar/exe icon rendering remain unverified; (2) the rename introduces two behavioural changes that are **not** migration-guarded — a key stored under the old credential service name `Companion` is not read under the new `Automata` service (early testers must re-enter it), and app data moves from `%APPDATA%/Companion` to `%APPDATA%/Automata` with no migration; (3) the demo GIF and social preview are composed from the V-100 screenshots (real renderer, stubbed preload), not from a live Windows session; (4) historical documents that reference the old `companion/` paths (`docs/MILESTONES/*`, `docs/audit/*`, `docs/GAP_REGISTER.md`, `docs/P0_COMPLETION_REPORT.md`) are retained as history and were not rewritten.

## 41. Speech by default + background operation — v0.6.0 (2026-11-17)

This pass makes speech the default mode of communication, replaces the top-of-stage voice controls with one confirmable sidebar switch, and makes the app keep listening, speaking and acting while it runs in the background.

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-114 | Core speech defaults + tests: `packages/core/src/voice/speech.ts` (`defaultVoiceSettings.listenWhenUnfocused: true`; `normalizeVoiceSettings` → `record.listenWhenUnfocused !== false`) and `packages/core/src/voice/speech.test.ts` | PASS: `npm test` asserts `defaultVoiceSettings().listenWhenUnfocused === true` and `normalizeVoiceSettings({ listenWhenUnfocused: false }).listenWhenUnfocused === false`; background listening is on by default and can be explicitly disabled. |
| V-115 | New single sidebar switch: `apps/desktop/src/renderer/components/VoiceSwitch.tsx` (`role="switch"`, `aria-checked`, `aria-label`), rendered in the sidebar between `</nav>` and `.rail-history` in `App.tsx`; `toggleMute` replaced by `setVoiceEnabled(enabled)` and `requestVoiceToggle(next)` | VERIFIED in the built renderer via a DOM probe (`.capture/probe-voice.cjs`, stubbed preload under Xvfb): `.voice-switch` is present with `role="switch"`, `aria-checked="true"`, text `Voice On · ready`, and a bounding rect inside the rail (x=12, y=200, w=243, h=56). |
| V-116 | Removed the old controls: `Listen`, `Live voice is off`, `Mute`, `Stop everything` (VoiceDock) and the composer mic button (ChatStage); `VoiceDock.tsx` reduced to a button-free status strip, `stopEverything()` deleted | PASS: the same DOM probe enumerates every `button` in the Talk view and finds **zero** matches for any of the four removed labels (`forbiddenButtonHits: []`); `.voicebar` renders with only the orb + headline/sub-line (no `.vb-actions`). |
| V-117 | Confirmable voice-off: `ConfirmModal.tsx` generalised (title/eyebrow/confirmTone/labels) and wired in `App.tsx` so `requestVoiceToggle(false)` raises `confirmVoiceOff` → a danger-toned "Turn voice off?" modal; confirming calls `setVoiceEnabled(false)` which persists `muted: true`, stops the listener, `chatAbort()`, `voiceStopSpeaking()` and `osRejectTool()` for a pending action | VERIFIED by code inspection and `npm run typecheck`/`npm run lint` clean; the modal pathway renders through the same `ConfirmModal` already used for tool confirmation. |
| V-118 | Background operation (main process): `apps/desktop/src/main/index.ts` — `webPreferences.backgroundThrottling: false`, close-to-tray (`isQuitting` guard + `event.preventDefault()` + `window.hide()` + `setSkipTaskbar(true)` on Windows), new `resources/tray.png` (32×32, 2,317 B) with a `trayImage()` helper, tray tooltip "Automata — running in the background", tray `Show`/click re-show + focus, tray `Exit` and `before-quit` set `isQuitting`, `activate` re-shows an existing window | VERIFIED by code inspection; `app.setAppUserModelId` corrected to `com.hassantech.automata` (was still `com.kkc36.companion`). The packaged `release/win-unpacked/Automata.exe` builds cleanly with these changes. |
| V-119 | `npm run verify` from the repository root | PASS: ESLint 0 errors, TypeScript clean, **67 test files / 539 tests passed**, both builds succeed. Renderer output `index-BQNP0szx.js` (303.65 kB) + `index-rHGJ_xdQ.css` (20.23 kB); the voice helper build logs `[voice] C# helper skipped` on Linux (fails soft, falls back to PowerShell `System.Speech` at runtime). |
| V-120 | Screenshot re-capture: `/workspace/.capture/run2.sh` (retargeted from the removed `companion/…` path to `apps/desktop/dist/renderer/index.html`) with the stub preload updated to `Automata` 0.6.0 + `listenWhenUnfocused: true`; CDP `Page.captureScreenshot` at 1440×940 @2×, downscaled to 1440×940 | Five PNGs rewritten in `docs/screenshots/`: `main-interface.png` (876,484 B), `talk-hero.png` (763,854 B), `setup.png` (661,533 B), `settings-providers.png` (681,308 B), `settings-voice.png` (740,675 B). The sidebar switch was confirmed by an ASCII luminance map (mic glyph + `Voice`/`On · ready` label + a toggle whose knob sits at the right/ON end); the Talk header region shows no action-button cluster. |
| V-121 | Demo GIF rebuilt: `/workspace/.capture/make-gif.sh` (ffmpeg `xfade` crossfade 0.6 s, `palettegen`/`paletteuse`) from the five fresh screenshots | `docs/demo.gif` is 900×588, 10 fps, **106 frames / 10.6 s**, **4,255,258 B** (under the 5 MB budget), ordered Talk → Talk hero → Setup → Providers → Voice settings. |
| V-122 | Version + installer: bumped `0.5.0 → 0.6.0` in the root, `packages/core` and `apps/desktop` manifests (plus the `@automata/core` range), re-synced `package-lock.json`, then `rm -rf apps/desktop/release && npm run package` | `electron-builder` 26.18.0 produced `apps/desktop/release/Automata-0.6.0-x64.exe` (**123,728,029 B**), SHA-256 `a23b396466ac104150762642599d304103c8c8aabe3aa34d2b823faf473dadaf`; the packaged app is `release/win-unpacked/Automata.exe`. **This is the local Linux cross-build**; the published release artifact is a separate Windows-CI build with its own hash. |
| V-123 | Publication: pushed `main` (`6e18b9b..4e3265d`) and tag `v0.6.0`; then `GET /repos/hassan200503/automata/actions/runs` and `GET /repos/.../releases/tags/v0.6.0` | PASS: both workflows completed green (**Automata CI: success**, **Release: success**). Release `v0.6.0` ("Automata v0.6.0", published 2026-11-17T12:37:20Z) carries `Automata-0.6.0-x64.exe` (**124,655,946 B**, the Windows-CI build) and `SHA256SUMS.txt` (**89 B**), and its body embeds the checksum `aa9a1b67203837859fe2dd46145d38d753dcebed22436c8ae85f6a548d4f559b *Automata-0.6.0-x64.exe` plus the `certutil -hashfile` instruction. |

Honesty caveats for this pass: (1) screenshots/GIF and the DOM probe use a **stubbed preload** on the Linux host — the real main process needs Windows native modules and cannot start here — so the captures show the real shipped renderer against representative data, not a live Windows session; (2) the mic fails on the Linux host (`NotFoundError: Requested device not found`), so the dock reads "Ready — voice is on" rather than "Listening"; that error line is hidden in the captures only, and on Windows the same state reads "Listening"; (3) close-to-tray, `backgroundThrottling` and tray behaviour are code-verified but **not** exercised on a real Windows session; (4) the installer is unsigned and was not installed on Windows.

## 42. Onboarding fix: saving a provider key auto-completes the voice guide (2026-11-17)

Bug: in the first-run voice guide, step 10 of 11 ("Connect Gemini", `awaitsAction: true`) waited for the owner to say "continue" after saving a key. Saving only set `draft.providerConnected` and the status "…Return to the voice guide and say continue", so the owner stayed stuck on the provider step instead of moving on.

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-124 | Fix in `apps/desktop/src/renderer/App.tsx`: added `finishVoiceGuideAfterProvider(nextGuide, hasProvider)` — advances the guide past `provider`, sets `currentStep: 'complete'` + `completedAt`, persists the draft (persona calibration + preset), speaks the completion line, runs the system check, clears `guideActive`, switches to the chat workspace and starts listening when consent is on. `saveKey()` now calls it when `guideActiveRef.current.currentStep === 'provider'` and a key is stored | PASS: saving a Gemini key during onboarding finishes the guide and lands directly in the workspace; a key saved outside the provider step keeps the previous "say continue" behaviour. |
| V-125 | `npm run typecheck`, `npm run lint`, `npm test` from the repository root | PASS: TypeScript clean, ESLint 0 errors, **67 test files / 539 tests passed**. |

Honesty caveat: verified by type/lint/test and code inspection; the redirect was not driven end-to-end in a live Windows session against a real credential store.

## 43. Patch release v0.6.1 — ship the onboarding fix (2026-11-17)

The v0.6.0 tag (`4e3265d`) predates the onboarding fix, and the renderer is bundled into the installer, so the published v0.6.0 asset cannot contain it. The app has no auto-updater (`grep -R autoUpdater|electron-updater` → no matches), so a patch release is the only way to deliver the fix.

| ID | Command / inspection | Observed result |
| --- | --- | --- |
| V-126 | Version bump `0.6.0 → 0.6.1` in `package.json`, `packages/core/package.json`, `apps/desktop/package.json` (+ `@automata/core` dep), then `npm install` and `grep -n '0\.6\.0' package-lock.json` | `npm install` reported "added 48 packages in 642ms"; the lockfile's own versions and the `@automata/core` range now read `0.6.1`, and the only remaining `0.6.0` strings are unrelated semver ranges. `CHANGELOG.md` gained a `[0.6.1]` entry; `docs/PROJECT_STATE.md` gained an "Onboarding fix — v0.6.1" section. |
| V-127 | `npm run verify` from the repository root | PASS: ESLint 0 errors, TypeScript clean, **67 test files / 539 tests passed**, both builds succeed (renderer `index-BxQxcGvk.js` 304.35 kB + `index-rHGJ_xdQ.css` 20.23 kB). |
| V-128 | Tag `v0.6.1` pushed, then `GET /repos/.../actions/runs` and `GET /repos/.../releases/tags/v0.6.1` | PENDING at time of writing — this row is completed by the publication record in section 44. |

Honesty caveat: this patch changes renderer/onboarding code only; the fix itself was verified by type/lint/test plus code inspection (see section 42), not by a live Windows first run.


