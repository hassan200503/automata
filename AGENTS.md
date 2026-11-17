# Agent instructions

Repository: `hassan200503/automata` — **Automata**, a Windows-first, voice-first personal AI companion by **HassanTech**. It was renamed from `personal-companion-bot` (itself renamed from `whatsapp-persona-bot` on 2026-10-26) and rebranded from the working title "Companion" to **Automata** on 2026-11-17.

The repository is a single npm-workspaces monorepo:

- `apps/desktop/` — the Electron shell (main · preload · renderer) and NSIS packaging.
- `packages/core/` — the framework-neutral TypeScript core.
- `docs/` — the spec, state, security and verification docs, specified by `docs/AGENT_BRIEF.md`. That brief supersedes `docs/MASTER_PROMPT.md` wherever they disagree.

The legacy WhatsApp persona bot (`src/`, `scripts/`, `data/`, pm2) that used to live in the repo root was **removed** on 2026-11-17 as part of the rebrand — it was a Baileys/WhatsApp-Web bot, unrelated to the app's WhatsApp **Desktop** UI-automation tool. Its code is preserved in git history and in the `archive/whatsapp-persona-bot` tag.

Before doing any work:

1. Read `docs/AGENT_BRIEF.md` completely (v3 master brief, adopted 2026-10-29).
2. Read `docs/PROJECT_STATE.md` and continue from the current milestone/task.
3. Follow the hard rules in Section 3 and stop at the decision gates in Section 13.
4. Update `docs/PROJECT_STATE.md`, `docs/REQUIREMENTS.md`, `docs/GAPS.md` and `docs/VERIFICATION_LOG.md` after every task. The earlier catalog remains in `docs/REQUIREMENTS_MATRIX.md`.
5. Commit locally after each task; never push without owner approval.

Verified commands, all run from the repository root: `git status`, `node -v` (v24.16.0), `npm -v` (11.13.0), `npm install`, `npm run verify`, `npm start`, `npm run package`. Read `docs/PROJECT_STATE.md` for the current verified status; do not invent results.

Never read secrets or personal data. The legacy bot's `.env`, `auth/`, `data/style-log.jsonl` and `data/companion.db*` are gone from the tree; if they reappear, treat them as off-limits.

Project-level permissions live in `opencode.json`: edits are allowed inside the repo; shell is limited to build/test/lint, local git inspection/add/commit/branch, and installing declared dependencies; everything else asks the owner. Commit locally after each task. Never push without explicit owner approval.
