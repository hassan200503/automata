# Security Policy

## Supported versions

Automata is pre-1.0. Security fixes are applied to the latest release only.

| Version | Supported |
| ------- | --------- |
| 0.5.x   | ✅        |
| < 0.5   | ❌        |

## Reporting a vulnerability

Please **do not** open a public issue for a security problem.

Report it privately through GitHub's [Report a vulnerability](https://github.com/hassan200503/automata/security/advisories/new) form (Security → Advisories), or email **karungwahassan03@gmail.com** with:

- a description of the issue and its impact,
- steps to reproduce, and
- the affected version.

You can expect an acknowledgement within a few days. Please give a reasonable window to ship a fix before any public disclosure.

## How Automata handles your data

- **Credentials** (API keys, email app passwords, payment secrets) are stored in **Windows Credential Manager** via `@github/keytar`. They are never hardcoded, never logged, and encrypted at rest via DPAPI.
- **Local data** (conversations, memory) is stored in a **SQLCipher-encrypted** database with a DPAPI-wrapped key.
- **Untrusted content** (web pages, email bodies) is tagged and sanitized before it can influence a prompt.
- **Every tool** declares a risk class (1–4): Class 1 auto-runs, Class 2 gets a spoken read-back, Class 3 requires explicit confirmation, Class 4 is blocked.
- A global **emergency stop** (`Ctrl+Shift+Esc`) halts all automated work.

## Known limitation: the installer is unsigned

The Windows installer is **not code-signed**. Windows SmartScreen will warn on first run. Always verify the installer's **SHA-256** against the value published in the release notes before installing, and prefer building from source if you are unsure.

See [docs/SECURE_SETUP.md](docs/SECURE_SETUP.md) and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) for the full picture.
