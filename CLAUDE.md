# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React 19 + Vite SPA (plain JS/JSX, no TypeScript) for the personal expense tracker. UI is MUI 7, data fetching is axios, routing is react-router-dom 7, charts are recharts. The backend is the sibling `api/` repo (see `../CLAUDE.md` for the multirepo picture).

## Commands

- **Dev server**: `npm run dev` (`npm run host` exposes it on the LAN)
- **Lint**: `npm run lint` (ESLint 9 flat config)
- **Build / preview**: `npm run build`, `npm run preview` (output in `dist/`)
- **Deploy**: `npm run deploy` runs `scripts/deploy.sh`: reads `.env` (`SSH_HOST`, `SSH_USER`, `SSH_BUILD`, `SSH_DIR`), prompts for confirmation, builds, zips `dist/`, then wipes the remote dir over SSH and uploads the new build. It is destructive on the remote; don't run it unasked.
- There is no test runner configured.

`app.yaml` is a leftover App Engine static-hosting config (nodejs20, SPA fallback to `dist/index.html`).

## Architecture

Routes are defined in `src/App.jsx`: `""` → `MainView`, `login` → `LoginView`, `*` → `NotFoundView`. `@/` aliases `src/` (via `jsconfig.json` + `vite-tsconfig-paths`); folders expose their members through an `index.js` barrel (`@/views`, `@/components`, `@/utils/functions`).

- **No global state or shared API client.** `MainView` owns one big `state` object and passes it down; each component that mutates data calls axios itself with `${api_url}` and `Authorization: Bearer ${localStorage.getItem("token")}`, and on failure removes the token. Preserve that pattern or refactor deliberately.
- `MainView` fetches `GET /data?date=...` and fills `state.sources` / `state.categories`. After create/update/delete, components re-fetch rather than patch local state.
- `ExpensesTable` + `ExpenseItem` render a grid with one column per source; rows are indexed across `source.expenses` first and then `source.instalments` (using an `offset`), so the two lists must stay in that order and shape.
- `ExpensesModal` is the create/edit form (fields include `next` "Billed next period?" and `instalments`, which must be empty or an integer ≥ 2).
- Per-user UI preferences and last selections live in `localStorage`: `token`, `date`, `byAmount`, `simple`, `lastSource`, `lastCategory`.
- Instalment amounts are shown as `amount / instalments`; this mirrors the API's category sums.

## Environment

`VITE_API_URL` in `.env` selects the API base URL (default `http://localhost:8000`). The API must list the client origin in its `FRONTEND_ORIGIN` for CORS.

## Conventions

- 2-space indentation, double quotes, no semicolons in components (`src/env.js` uses tabs; match the file you edit).
- Conventional commits enforced by Commitlint + Husky; Commitizen config in `.cz.toml`. Versions/changelog are bumped with commitizen.
- `.env`, `dist/` and `dist-*.zip` are git-ignored; never commit them.
