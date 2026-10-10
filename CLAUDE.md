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
- `ExpensesTable` + `ExpenseItem` render a grid with one column per source; rows go transfers first (amber, `td.transfer`), then `source.expenses`, then `source.instalments` (lilac) and finally incomes (green, `td.income`): transfers are what is checked most, and the income total is already in the header chip. Incomes and transfers have no category, so their description spans the category column too (a transfer's shows only an arrow, `→` when it leaves the source and `←` when it arrives, and its description, without the other account; its amount is `signed_amount`). `ExpensesTable` computes the height of each group (`rows`) and `ExpenseItem` maps a row index to a group and a position, so the lists must stay in that order and shape. `visibleSources` (`@/utils/functions`) picks the sources shown: any with incomes, transfers, expenses or instalments (`transfers` may be missing if the API is older). The source header chips (`SourceChips` in `ExpensesTable.jsx`: Income, In full, Instalments, Total and the one below) are left out when their value is 0 to the cent, and the dots go only between the visible ones. They stay on one line (`.source-chips`, so the column grows to fit them, which matters in simple mode) except on a phone (portrait, up to 600px), where each source takes the whole width and they wrap centred with a gap instead of the dots (`.chip-dot` is hidden). On a phone the action buttons (`.main-actions`) stay on one line with smaller text so switching between `simple` and `advanced` does not reflow them; the window cannot be made narrower than 500px, so check 412px in an iframe of that width. Cards also get a `Paid` chip (the payments received this month, the same amber as the transfer rows) before `Owed`. The last chip comes from the API's `source.balance`: `Owed` (pink) for a card (`kind === "card"`, cutoff set) and `Balance` for an account.
- `ExpensesModal` is the create/edit form (fields include `next` "Billed next period?" and `instalments`, which must be empty or an integer ≥ 2).
- `IncomesModal` is the create/edit form for incomes (source, date, amount ≠ 0, description), opened by the Income button or a green row's ✎; `MainView` keeps `incomeModal`/`income` in state and `openIncomeModal`. Delete is the row's ⌫. They call `POST|PUT|DELETE /incomes`. "Spent" stays expenses only. The subheader is four chips with just the amount, in this order: Spent (grey, like a source's Total), Debit (green, like the incomes; it is the API's `cash`, what the debit accounts hold), Debt (pink, like Owed) and Balance (blue). The name is in the tooltip. They come straight from `summary` in the `GET /data` response (`state.summary`; a null value, i.e. before the balance start month or with a missing exchange rate, leaves that chip out instead of showing a dash), so the client does no money math for them. On a phone the summary chips are tighter (`.summary-chips` in `MainView.css`) so the four totals and the rate fit one line at 412px (the rate wraps below that). Logout sits right of the next-month arrow in the header (an icon on a phone, text from 600px up), not in the button row; the arrows and Logout are all 30px high. The source chips are regular weight (`fontWeight: 400`), because the table head cell would make them bold.
- `TransfersModal` is the create/edit form for transfers between two sources (from, to, date, amount > 0, description), opened by the Transfer button or a blue row's ✎; `MainView` keeps `transferModal`/`transfer` in state and `openTransferModal`. Delete is the row's ⌫. They call `POST|PUT|DELETE /transfers`. A card payment is a transfer from an account to the card; it never changes the balance.
- The month is chosen from the card header: `‹ September 2026 ▾ ›`. The arrows call `changeDate` (one month back or forward) and the month button opens `MonthPicker` (`src/components/MonthPicker`): a popover with the year arrows and a 3x4 grid of months, like the Android app's, where months after the one following the current month are disabled. `selectMonth` in `MainView` saves the date in `localStorage["date"]` (day 2, as `changeDate` does) and calls `load`.
- Currencies (phase 1.9): a source's `currency` is `MXN` or `USD`. Its amounts show with `currencySymbol` (`$` or `US$`, `@/utils/functions`), and its Total and Balance chips add `≈ $x` in pesos with `state.rates` (from `/data`). The exchange rate is a chip in the subheader row (just the amount, `$17.85`, with the currency in its tooltip; a red `?` while it is missing, in which case the API sends `null` for Debit, Debt and Balance) that opens `RatesModal` (`PUT /rates/{currency}`). `TransfersModal` asks for "Received" when the two sources have different currencies, with the implied rate as help text, and sends it empty otherwise. There is no screen to set a source's currency: use `PUT /sources/{id}`.
- Per-user UI preferences and last selections live in `localStorage`: `token`, `date`, `byAmount`, `simple`, `lastSource`, `lastCategory`.
- Instalment amounts are shown as `amount / instalments` rounded to cents (`monthlyShare` in `@/utils/functions`), the same rounding the API uses for sums and balances, so a card's chips add up to what the bank bills. It rounds on whole cents with halves away from zero, not with `Math.round(amount / n * 100) / 100`: floats turn an exact 1200.465 (14405.58 / 12) into 1200.4649999, which made the web show 1200.46 while the API billed 1200.47 and the difference grew by a cent every month of the instalment.

## Environment

`VITE_API_URL` in `.env` selects the API base URL (default `http://localhost:8000`). The API must list the client origin in its `FRONTEND_ORIGIN` for CORS.

## Conventions

- 2-space indentation, double quotes, no semicolons in components (`src/env.js` uses tabs; match the file you edit).
- Conventional commits enforced by Commitlint + Husky; Commitizen config in `.cz.toml`. Versions/changelog are bumped with commitizen.
- `.env`, `dist/` and `dist-*.zip` are git-ignored; never commit them.
