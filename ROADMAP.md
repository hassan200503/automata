# Roadmap

Automata is a Windows-first, voice-first AI companion that does real work on your PC — and is honest about it. This is the public, high-level roadmap. It is tracked here and mirrored in a pinned issue; ideas and votes are welcome in [Discussions](https://github.com/hassan200503/automata/discussions).

_Current release: **v0.5.0**._

---

## Shipped

**v0.5.0 — Rebrand and unification**
- Renamed the product to **Automata by HassanTech** and made the repository a single, clean workspace (the legacy WhatsApp bot was removed; history is preserved).
- Ambient looping video backdrop with a still-frame poster and a `prefers-reduced-motion` fallback.
- Translucent glass surfaces (rail, top bar, panels, hero, composer) with the `media-src 'self'` CSP directive.
- App icon derived from a frame of the backdrop, wired into the installer, uninstaller and window.

**v0.4.0 — Voice-first shell**
- Rebuilt renderer: persistent rail, contextual top bar, centred stage, sticky composer.
- Disciplined near-black design system with a single accent; rail collapses at ≤960 px.
- Multi-size Windows `.ico` + 512 px PNG; MIT licence.

**v0.3.0 — Combined intelligence**
- Multi-model ensemble (best-of / majority / fastest) with an auditable per-run log.
- Power actions (`os.power`) and window geometry (`os.moveWindow`, `os.resizeWindow`).

**v0.2.0 — Full OS control**
- 37 OS-control tools, ~30 natural-language patterns, streaming cognition, response cache.

---

## Now (in progress)

- **Kill first-run friction** — a 60-second quickstart with a free Gemini key link and inline key validation. _(quickstart shipped; validation being tightened)_
- **Releases on autopilot** — a `v*`-tag workflow that builds the NSIS installer on `windows-latest`, attaches it with a SHA-256 checksum, and creates the Release.
- **Contributor on-ramp** — issue/PR templates, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and seeded `good first issue`s.

---

## Next

- **End-to-end tests across 10+ Windows applications** — extend the observed-postcondition tests beyond the current Notepad/Calculator spikes.
- **Full on-device speaker verification** — finish the voice-print path so only the owner can drive it.
- **Real Gmail OAuth flow** and **PayPal live-mode validation**.
- **One memorable "whoa" feature** from the ideas below, built end to end.

## Later

- **Plugin system** for community tools.
- **Linux and macOS support.**
- **Mobile companion** (React Native).
- **Multi-user profiles** and end-to-end encrypted sync.

---

## How to influence the roadmap

- 👍 React on the pinned roadmap issue.
- Open a [feature request](https://github.com/hassan200503/automata/issues/new?template=feature_request.yml).
- Start a [Discussion](https://github.com/hassan200503/automata/discussions).

---

[← Back to the README](README.md)
