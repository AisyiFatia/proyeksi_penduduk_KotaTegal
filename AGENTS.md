# SIPENDUK TEGAL — Agent Instructions

## Project

React 18 + Vite SPA (Indonesian). Population projection dashboard for Kota Tegal, Central Java (2020–2035). No TypeScript, no routing library, no test framework. No SWC — Babel via `@vitejs/plugin-react`.

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Production build |
| `npm run preview` | Preview build |
| `npm run lint` | ESLint (`--max-warnings 0`) |

Only `lint` for verification. No test/typecheck/formatter.

## Architecture

- **Entry**: `index.html` → `src/main.jsx` → `<AppProvider>` (from `AppContext.jsx`) wrapping `<App />`
- **Tabs (public)**: State-based nav (no router) — Beranda, Dashboard, Piramida, Analisis, Kecamatan, Tabel Data, AI Konsultasi
- **Admin**: `src/AdminDashboard.jsx` (~2600 lines) — sidebar CRUD with sub-pages: dashboard, Data Sekunder, Data Primer, Prediksi KNN, Grafik, Laporan, Periode, Piramida Admin, Radar, Capaian, Profil Kecamatan, Admin users
- **State**: React Context (`src/AppContext.jsx`). All CRUD + localStorage persistence in one provider.
- **Data entry**: **Data Primer** (4 migration fields: pindah, datang, lahir, mati). **Data Sekunder** (21 fields: gender, age groups, kecamatan, socio-economic, education, employment). Both stored in shared `pendudukData`.
- **Prediction**: KNN (`knnPredict` + `estimateTrend` in AdminDashboard.jsx). Uses user-entered data only — no hardcoded BPS fallback.
- **Charts**: Recharts v3.8.1, inline `CustomTooltip` components.
- **Styling**: Inline JS objects + `src/index.css`. No CSS modules/Tailwind/CSS-in-JS.
- **Backend**: `server/index.js` (Express) — login, CRUD sync via `/api/*`. `npm run dev:all` starts both.
- **localStorage**: Keys `sipenduk_*_v4`. Admin edits auto-sync to public view.

## Conventions

- **UI language**: Indonesian — all labels, messages, errors.
- **No prop-types** or TypeScript — plain JSX.
- **ESLint**: `react-refresh/only-export-components` set to `warn`. Disable around full-page components if needed.

## Key files

| File | Role |
|------|------|
| `src/main.jsx` | App bootstrap |
| `src/App.jsx` | Public tabs (7), landing page, login modal, navbar, footer, AI chat |
| `src/AppContext.jsx` | Context provider — state, CRUD, localStorage, getSummaryStats/getYearlyStats |
| `src/AdminDashboard.jsx` | Admin panel — Data Sekunder form+table, Data Primer form+table, KNN prediction, charts, editors |
| `src/data.js` | BPS reference data for public pages, AI system prompt, quick questions |
| `src/theme.js` | Color palette + constants |
| `src/api.js` | REST API client |

## Gotchas

- Do **not** install `react-router` — navigation uses state + tab mapping.
- Do **not** add TypeScript or test files/frameworks.
- `ALL_PENDUDUK_FIELDS` (25 fields) must be defined **above** any `useCallback` that references it in deps (TDZ).
- `getYearlyStats()` returns 25 fields (4 migrasi + 21 detail) + shorthand aliases (pindah, datang, lahir, mati).
- Kepadatan Penduduk computed as `(jml_pria + jml_perempuan) / 39.68`. Rasio Ketergantungan as `(umur_0_4 + umur_65_plus) / umur_15_64 * 100`.
- Data records from Data Sekunder have undefined migration fields — always use `|| 0` when accessing `jumlah_pindah` etc.
- Demo credentials (`src/AppContext.jsx:54-57`): `admin/admin123`, `analis/analis123`, `tegal/tegal2025`.
- AI consultation tab uses hardcoded `AI_SYSTEM_PROMPT` + simulated response (no LLM call).
- Halaman "Daftar Data" (main data page) is a landing page with 3 nav cards — actual tables live in Data Primer and Data Sekunder sub-pages.
