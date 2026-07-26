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

No test/typecheck/formatter. `npm run dev:all` does `vite & cd server && npm start`.

## Architecture

- **Entry**: `index.html` → `src/main.jsx` → `<AppProvider>` (AppContext) → `<App />`
- **Public tabs**: State-based nav (no router) — Beranda, Dashboard, Piramida, Analisis, Kecamatan, Tabel Data, AI Konsultasi
- **Admin**: `src/AdminDashboard.jsx` (~2600 lines) — sidebar CRUD with sub-pages (dashboard, Data Sekunder, Data Primer, Prediksi KNN, Grafik, Laporan, Periode, Piramida Admin, Radar, Capaian, Profil Kecamatan, Admin users)
- **State**: Single React Context (`src/AppContext.jsx`). All CRUD + localStorage persistence.
- **Data entry**: **Data Primer** (4 migration fields: `jumlah_pindah`, `jumlah_datang`, `jumlah_kelahiran`, `jumlah_kematian`). **Data Sekunder** (21 fields: gender, age groups, kecamatan, socio-economic, education, employment). Both stored in shared `pendudukData`.
- **Prediction**: KNN (`knnPredict` + `estimateTrend` in AdminDashboard.jsx) — user-entered data only, no hardcoded BPS fallback.
- **Charts**: Recharts v3.8.1, inline `CustomTooltip` components.
- **Styling**: Inline JS objects + `src/index.css`. No CSS modules/Tailwind/CSS-in-JS.
- **Backend**: `server/index.js` (Express, in-memory store) — login, CRUD sync via `/api/*`. Proxy: Vite proxies `/api` → `localhost:8000` and `/zen` → opencode.ai/zen/v1 (for AI chat).
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
| `server/index.js` | Express backend (in-memory, 340 lines) |

## Gotchas

- Do **not** install `react-router` — navigation uses state + tab mapping.
- Do **not** add TypeScript or test files/frameworks.
- `ALL_PENDUDUK_FIELDS` (25 fields, defined via `useMemo` in AppContext) must be declared **above** any `useCallback` that references it in deps.
- `getYearlyStats()` returns 25 raw fields + shorthand aliases: `pindah` (`jumlah_pindah`), `datang` (`jumlah_datang`), `lahir` (`jumlah_kelahiran`), `mati` (`jumlah_kematian`).
- Kepadatan Penduduk: `(jml_pria + jml_perempuan) / 39.68`. Rasio Ketergantungan: `(umur_0_4 + umur_65_plus) / umur_15_64 * 100`.
- Data Sekunder records have undefined migration fields — always use `|| 0` when accessing `jumlah_pindah` etc.
- Demo credentials (`src/AppContext.jsx:54-57`): `admin/admin123`, `analis/analis123`, `tegal/tegal2025`.
- AI consultation tab uses hardcoded `AI_SYSTEM_PROMPT` + simulated response (no LLM call).
- Halaman "Daftar Data" is a landing page with 3 nav cards — actual tables live in Data Primer and Data Sekunder sub-pages.
- `dev:all` uses `&` (not `&&`) — on Windows cmd.exe this runs commands sequentially, not in parallel.
