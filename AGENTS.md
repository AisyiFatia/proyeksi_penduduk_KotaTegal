# SIPENDUK TEGAL — Agent Instructions

## Project

React 18 + Vite SPA (Indonesian-language). Population projection dashboard for Kota Tegal, Central Java (2020–2035). No TypeScript, no routing library, no test framework.

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Production build |
| `npm run preview` | Preview build |
| `npm run lint` | ESLint (`--max-warnings 0`) |

Only `lint` is available for verification. No test, typecheck, or formatter commands exist.

## Architecture

- **Entry**: `index.html` → `src/main.jsx` → `<AppProvider>` wrapping `<App />`
- **Tabs**: 7-tab state-based nav (no router) — Beranda, Dashboard, Piramida, Analisis, Kecamatan, Tabel Data, AI Konsultasi
- **State**: React Context (`src/AppContext.jsx`), no Redux. Wraps entire app.
- **Data**: Static/hardcoded in `src/data.jsx` (BPS projection data 2020–2035)
- **Charts**: Recharts v3.8.1, inline `CustomTooltip` components
- **Styling**: Inline JS objects, `src/index.css` for classes. No CSS modules, Tailwind, or CSS-in-JS lib.
- **Admin panel**: `src/AdminDashboard.jsx` — separate CRUD interface with sidebar, KNN predictions
- **localStorage**: All admin state persisted under keys `sipenduk_*_v4`. Admin edits auto-sync to public view.

## Conventions

- **UI language**: Indonesian (id) — UI text, labels, error messages in Indonesian
- **Code comments**: Mix of English (code structure) and Indonesian (data/domain)
- **Demo credentials** (hardcoded in `src/App.jsx:39-43`): `admin/admin123`, `analis/analis123`, `tegal/tegal2025`
- **No prop-types** or TypeScript — plain JSX
- **No testing** — do not expect or add test files
- **ESLint**: `react-refresh/only-export-components` set to `warn`. Disable around full-page components if needed.
- **No SWC** — uses `@vitejs/plugin-react` (Babel)

## Key files

| File | Role |
|------|------|
| `src/main.jsx` | App bootstrap |
| `src/App.jsx` | All public tabs, landing page, login modal, navbar, footer |
| `src/AppContext.jsx` | Context provider + all CRUD + localStorage persistence |
| `src/AdminDashboard.jsx` | Admin panel (sidebar, data tables, KNN predictions, charts) |
| `src/data.jsx` | All projection data, AI prompt, quick questions, constants |

## Gotchas

- Do **not** install `react-router` — navigation uses state + tab mapping.
- Do **not** add TypeScript — the project is untyped JSX.
- localStorage keys `sipenduk_*_v4` must be cleared to reset demo data.
- AI consultation tab uses a hardcoded `AI_SYSTEM_PROMPT` in `data.jsx` (no actual LLM call — simulate response locally).
