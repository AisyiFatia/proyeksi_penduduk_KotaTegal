# SIPENDUK TEGAL — Agent Instructions

## Project

React 18 + Vite SPA (Indonesian). Population projection dashboard for Kota Tegal, Central Java (2020–2035). No TypeScript, no routing library, no test framework. Babel via `@vitejs/plugin-react` (no SWC).

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Dev server (Vite) |
| `npm run dev:all` | Dev server + Express backend (uses `&`, runs sequentially on Windows cmd) |
| `npm run build` | Production build |
| `npm run preview` | Preview build |
| `npm run lint` | ESLint (`--max-warnings 0`) — only verification available |

No test/typecheck/formatter.

## Architecture

- **Entry**: `index.html` → `src/main.jsx` → `<AppProvider>` (AppContext) → `<App />`
- **Public tabs**: State-based nav (no router) — Beranda, Dashboard, Piramida, Proyeksi, Analisis, Kecamatan, Tabel Data, AI Konsultasi
- **Admin**: `src/AdminDashboard.jsx` (~2700 lines) — sidebar CRUD with sub-pages: dashboard, Data Sekunder, Data Primer, Prediksi KNN, Grafik, Laporan, Periode, Piramida Admin, Radar, Capaian, Profil Kecamatan, Admin users
- **State**: Single React Context (`src/AppContext.jsx`). CRUD + localStorage persistence. Backend (MySQL) syncs penduduk, periode, admin. Reference data (indikator, piramida, etc.) from `src/data.js`.
- **Data entry**: **Data Primer** (5 fields: `jumlah_pindah`, `jumlah_datang`, `jumlah_kelahiran`, `jumlah_kematian`, `jumlah_penduduk`). **Data Sekunder** (21 fields: gender, age groups, kecamatan, socio-economic, education, employment). Both stored in shared `pendudukData` state.
- **Prediction**: KNN (`knnPredict` + `estimateTrend` in AdminDashboard.jsx) — user-entered data only, no hardcoded BPS fallback.
- **Charts**: Recharts v3.8.1, inline `CustomTooltip` components.
- **Styling**: Inline JS objects + `src/index.css`. No CSS modules/Tailwind/CSS-in-JS.
- **Backend**: `server/index.js` (Express + MySQL via `mysql2`, ~173 lines) — login, CRUD sync via `/api/*`. Vite proxies `/api` → `localhost:8000` and `/zen` → opencode.ai/zen/v1 (AI chat).
- **Database**: MySQL. Schema auto-created on server start (tables: `admin_users`, `periode`, `penduduk_primer`, `penduduk_sekunder`). Auto-seeds reference data if tables are empty.
- **API URL**: Override with `VITE_API_URL` env var (defaults to `/api`).
- **localStorage keys**: `sipenduk_penduduk_v4`, `sipenduk_periode_v4`, `sipenduk_admins_v4`, `sipenduk_indikator_v4`, `sipenduk_piramida_v4`, `sipenduk_radar_v4`, `sipenduk_capaian_v4`, `sipenduk_profil_v4`, `sipenduk_session_v4`, `sipenduk_rekomendasi_v4`. Admin edits auto-sync to public view.
- **Empty dirs**: `src/admin/`, `src/pages/`, `src/components/` exist but are unused.

## Conventions

- **UI language**: Indonesian — all labels, messages, errors.
- **No prop-types** or TypeScript — plain JSX.
- **ESLint**: `react-refresh/only-export-components` set to `warn`. Disable around full-page components if needed.

## Key files

| File | Role |
|------|------|
| `src/main.jsx` | App bootstrap |
| `src/App.jsx` | Public tabs (7), landing page, login modal, navbar, footer, AI chat |
| `src/AppContext.jsx` | Context provider — state, CRUD, localStorage, `getSummaryStats`/`getYearlyStats` |
| `src/AdminDashboard.jsx` | Admin panel — Data Sekunder form+table, Data Primer form+table, KNN prediction, charts, editors |
| `src/data.js` | BPS reference data, AI system prompt, quick questions |
| `src/theme.js` | Color palette + constants |
| `src/api.js` | REST API client (fetcher) |
| `server/index.js` | Express backend (MySQL, ~173 lines) |
| `server/db.js` | Database pool, schema init, seed data |

## Gotchas

- Do **not** install `react-router` — navigation uses state + tab mapping.
- Do **not** add TypeScript or test files/frameworks.
- `ALL_PENDUDUK_FIELDS` (25 fields, defined via `useMemo` in AppContext) must be declared **above** any `useCallback` that references it in deps.
- `getYearlyStats()` returns 25 raw fields + shorthand aliases: `pindah` (`jumlah_pindah`), `datang` (`jumlah_datang`), `lahir` (`jumlah_kelahiran`), `mati` (`jumlah_kematian`).
- Kepadatan Penduduk: `(jml_pria + jml_perempuan) / 39.68`. Rasio Ketergantungan: `(umur_0_4 + umur_65_plus) / umur_15_64 * 100`.
- Data Sekunder records have undefined migration fields — always use `|| 0` when accessing `jumlah_pindah` etc.
- Demo credentials (`src/AppContext.jsx:49-57`, also hardcoded in `src/App.jsx:29-31`): `admin/admin123`, `analis/analis123`, `tegal/tegal2025`.
- AI consultation tab uses OpenCode Zen API (configure `VITE_ZEN_API_KEY` in `.env`).
- `.env` file is gitignored — copy `.env.example` for reference if available.
- Halaman "Daftar Data" is a landing page with 3 nav cards — actual tables live in Data Primer and Data Sekunder sub-pages.
- `dev:all` uses `&` (not `&&`) — on Windows cmd.exe this runs commands sequentially, not in parallel.