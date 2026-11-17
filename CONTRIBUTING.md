# Contributing to Automata

Thanks for wanting to help. Automata is an Electron + TypeScript desktop app that turns voice and text into real Windows OS actions.

## Ways to contribute

- **Report a bug** — use the [bug report](https://github.com/hassan200503/automata/issues/new?template=bug_report.yml) template. Include your Windows version, the exact command, and what you expected vs. what happened.
- **Request a feature** — use the [feature request](https://github.com/hassan200503/automata/issues/new?template=feature_request.yml) template.
- **Pick up a [`good first issue`](https://github.com/hassan200503/automata/labels/good%20first%20issue)** — small, self-contained tasks ideal for a first contribution.
- **Share a recipe** — post what you automated in [Discussions → Show and tell](https://github.com/hassan200503/automata/discussions).

## Development setup

**Prerequisites:** Windows 10/11 (64-bit), Node.js ≥ 22.5, npm ≥ 10.

```bash
git clone https://github.com/hassan200503/automata.git
cd automata
npm install
npm start          # run the app in development
npm run verify     # lint + typecheck + test + build — must be green
```

The repository is a single npm-workspaces monorepo:

- `apps/desktop` — the Electron shell (main · preload · renderer) and packaging.
- `packages/core` — the framework-neutral TypeScript core.

## Before you open a pull request

1. Branch off `main`: `git checkout -b feature/your-feature`.
2. Make your change; keep it focused.
3. Run `npm run verify` — lint, typecheck, all tests and both builds must pass.
4. Add or update tests for behaviour you changed.
5. Write a [conventional commit](https://www.conventionalcommits.org/) message (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
6. Open the PR and fill in the template. Never push to `main` directly.

## Code style

- TypeScript strict; no `any` unless unavoidable and justified in a comment.
- Prefer the existing modules and tokens over new abstractions.
- Every new OS tool must declare a **risk class** (1–4) and a policy entry; the executor and tests enforce this.
- Anything that claims an OS action succeeded must **observe** the result first — Automata never reports unverified success.

## Reporting security issues

Do **not** open a public issue for a vulnerability. See [SECURITY.md](SECURITY.md).

## Licence

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
