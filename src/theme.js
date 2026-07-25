// ══════════════════════════════════════════════════════════════
//  TEMA SIPENDUK
//  Warna, style, dan konstanta visual bersama.
//  Semua komponen public dan admin import dari sini.
// ══════════════════════════════════════════════════════════════

// ── Palet Hijau-Teal ─────────────────────────────────────────
export const C = {
  g900: "#0D3B38", g800: "#134E4A", g700: "#1B6B6B",
  g600: "#0D9488", g500: "#14B8A6", g400: "#2DD4BF",
  g300: "#5EEAD4", g200: "#99F6E4", g100: "#CCFBF1",
  border: "#B2DFDB", borderMid: "#80CBC4",
  tDark: "#0D3B38", tMid: "#1B6B6B", tMuted: "#4B9E9A",
  white: "#FFFFFF", bg: "#F8FFFE", bgSection: "#F0FDFA",
  blue: "#1D4ED8", red: "#DC2626", green: "#15803D",
};

// ── Warna Khusus Admin ───────────────────────────────────────
export const ADMIN = {
  P: "#0D9488", PL: "#14B8A6", PD: "#134E4A", S: "#2DD4BF",
  NA: "#1B6B6B", BG: "#F8FFFE", W: "#FFFFFF", T: "#0D3B38",
  M: "#4B9E9A", SUC: "#15803D", WRN: "#D97706", DNG: "#DC2626",
  BDR: "#B2DFDB",
};

// ── Tooltip & Label ──────────────────────────────────────────
export const TOOLTIP_STYLE = {
  background: "#FFFFFF", border: "1.5px solid #B2DFDB",
  borderRadius: "8px", fontSize: "0.8rem",
  boxShadow: "0 4px 16px rgba(13,59,56,0.13)", color: "#0D3B38",
};
export const LABEL_STYLE = { color: "#1B6B6B", fontWeight: 700 };

// ── Warna Pilar Indikator ────────────────────────────────────
export const PILAR_COLOR = {
  Kuantitas: C.g600, Kualitas: "#15803D",
  Keluarga: "#D97706", Persebaran: "#7C3AED",
};
export const PILAR_GREEN = {
  Kuantitas: { color: C.g700, bg: "#E6FFFA" },
  Kualitas: { color: "#15803D", bg: "#DCFCE7" },
  Keluarga: { color: "#D97706", bg: "#FEF3C7" },
  Persebaran: { color: "#7C3AED", bg: "#EDE9FE" },
};

// ── Nama Bulan ───────────────────────────────────────────────
export const BULAN = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];
