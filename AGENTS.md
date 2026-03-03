# Repository Guidelines

## Project Structure & Module Organization
Core code lives in `src/` (TypeScript):
- `src/renderer/`: React UI (`pages/`, `components/`, `hooks/`, `styles/`)
- `src/process/`: process services, task orchestration, database access
- `src/webserver/`: Express auth, middleware, routes, websocket
- `src/agent/`, `src/worker/`, `src/common/`, `src/channels/`: agent integrations and shared runtime logic

Tests live in `tests/` (currently `tests/unit/` plus `tests/jest.setup.ts`).
Build config lives in `config/webpack/`. Static assets are in `public/` and `resources/`.
Automation scripts are in `scripts/`.

## Build, Test, and Development Commands
Use `npm` (CI runs on Node.js 22).

- `npm ci`: install exact dependencies from `package-lock.json`
- `npm run webui`: build web UI bundle and start local WebUI
- `npm run webui:remote`: start WebUI with remote access enabled
- `npm run build`: build only
- `npm run lint` / `npm run lint:fix`: run ESLint / auto-fix issues
- `npm run format:check` / `npm run format`: verify/apply Prettier formatting
- `npm test`, `npm run test:watch`, `npm run test:coverage`: run Jest tests

## Coding Style & Naming Conventions
- Language: TypeScript + React
- Formatting: 2 spaces, semicolons, single quotes, LF line endings
- Linting: ESLint with `@typescript-eslint` and Prettier integration
- Keep imports stable and prefer path aliases (`@/`, `@process/`, `@renderer/`, `@worker/`)
- Naming: React components in `PascalCase.tsx`; utility modules/functions in `camelCase.ts`; tests in `*.test.ts` or `test_*.ts`

## Testing Guidelines
- Framework: Jest (`ts-jest`, Node test environment)
- Add tests for every behavior change, especially auth, websocket, and process-task flows
- Place unit tests under `tests/unit/`
- Run `npm run test:coverage` for non-trivial changes; there is no hard threshold, but avoid reducing coverage in touched areas

## Commit & Pull Request Guidelines
- Pre-commit hook runs `lint-staged`; ensure staged files pass lint/format
- Commit message format is enforced by `.husky/commit-msg`:
  - `type(scope): description` or `type: description`
  - Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
  - Keep description concise (script enforces short length)
- PRs should follow `.github/pull_request_template.md`:
  - clear description, linked issue (`Closes #123`), change type, testing checklist
  - include screenshots for UI changes

## Security & Configuration Tips
- `webui.config.json` includes local admin credentials; change defaults for local use and never commit real secrets.
- Do not hardcode API keys or tokens in source; keep sensitive values out of tracked files.
