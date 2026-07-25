// ============================================================
// DATA KONSTANTA — SIPENDUK TEGAL
// Sistem Informasi Proyeksi Penduduk Kota Tegal 2020–2035
// ============================================================

export const APP_NAME = "SIPENDUK TEGAL";
export const APP_TAGLINE = "Sistem Informasi Proyeksi Penduduk Kota Tegal 2020–2035";

// Population Clock Base Data (estimasi BPS 2024)
export const BASE_PENDUDUK = 285_420;
export const LAHIR_PER_TAHUN = 4_850;
export const MATI_PER_TAHUN = 2_130;
export const NETO_PER_TAHUN = LAHIR_PER_TAHUN - MATI_PER_TAHUN + 120; // migrasi neto

export const MS_PER_TAHUN = 365 * 24 * 60 * 60 * 1000;
export const LAHIR_PER_MS = LAHIR_PER_TAHUN / MS_PER_TAHUN;
export const MATI_PER_MS = MATI_PER_TAHUN / MS_PER_TAHUN;
export const NETO_PER_MS = NETO_PER_TAHUN / MS_PER_TAHUN;

// Reference start epoch: Jan 1, 2024
export const EPOCH_2024 = new Date("2024-01-01T00:00:00Z").getTime();

// Statistik Kunci
export const STATS_KUNCI = [
  { icon: "👶", label: "TFR", nilai: "1,87", satuan: "anak/wanita", color: "#0D9488" },
  { icon: "❤️", label: "Angka Harapan Hidup", nilai: "74,2", satuan: "tahun", color: "#15803D" },
  { icon: "📈", label: "Laju Pertumbuhan", nilai: "0,92", satuan: "% per tahun", color: "#D97706" },
  { icon: "⚖️", label: "Rasio Ketergantungan", nilai: "44,3", satuan: "per 100 produktif", color: "#7C3AED" },
  { icon: "🏠", label: "Kepadatan Penduduk", nilai: "6.782", satuan: "jiwa/km²", color: "#1B6B6B" },
  { icon: "🎓", label: "IPM Kota Tegal", nilai: "74,85", satuan: "poin", color: "#CA8A04" },
];

// Chart Colors
export const COLORS = ["#0D9488", "#1D4ED8", "#15803D", "#D97706", "#7C3AED", "#BE185D", "#134E4A"];

// Pilar Colors
export const PILAR_COLOR = {
  Kuantitas:  "#0D9488",
  Kualitas:   "#15803D",
  Keluarga:   "#D97706",
  Persebaran: "#7C3AED",
};

// Kecamatan list
export const KECAMATAN_LIST = [
  "Kota Tegal (Kota)",
  "Tegal Selatan",
  "Tegal Timur",
  "Tegal Barat",
  "Margadana",
];

// ============================
// INDIKATOR DATA
// ============================
export const indikatorData = {
  "Jumlah Penduduk": {
    satuan: "jiwa",
    pilar: "Kuantitas",
    deskripsi: "Total jumlah penduduk Kota Tegal",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 284116 }, { tahun: 2021, nilai: 284890 }, { tahun: 2022, nilai: 285420 },
        { tahun: 2023, nilai: 286180 }, { tahun: 2024, nilai: 286950 }, { tahun: 2025, nilai: 287640 },
        { tahun: 2026, nilai: 288310 }, { tahun: 2027, nilai: 288970 }, { tahun: 2028, nilai: 289600 },
        { tahun: 2029, nilai: 290190 }, { tahun: 2030, nilai: 290750 }, { tahun: 2031, nilai: 291250 },
        { tahun: 2032, nilai: 291700 }, { tahun: 2033, nilai: 292100 }, { tahun: 2034, nilai: 292430 },
        { tahun: 2035, nilai: 292700 },
      ],
      "Tegal Selatan": [
        { tahun: 2020, nilai: 72540 }, { tahun: 2022, nilai: 72880 }, { tahun: 2025, nilai: 73410 },
        { tahun: 2030, nilai: 74230 }, { tahun: 2035, nilai: 74820 },
      ],
      "Tegal Timur": [
        { tahun: 2020, nilai: 78320 }, { tahun: 2022, nilai: 78760 }, { tahun: 2025, nilai: 79300 },
        { tahun: 2030, nilai: 80120 }, { tahun: 2035, nilai: 80740 },
      ],
      "Tegal Barat": [
        { tahun: 2020, nilai: 82340 }, { tahun: 2022, nilai: 82880 }, { tahun: 2025, nilai: 83510 },
        { tahun: 2030, nilai: 84350 }, { tahun: 2035, nilai: 84990 },
      ],
      "Margadana": [
        { tahun: 2020, nilai: 50916 }, { tahun: 2022, nilai: 50900 }, { tahun: 2025, nilai: 51420 },
        { tahun: 2030, nilai: 52050 }, { tahun: 2035, nilai: 52150 },
      ],
    },
  },

  "TFR (Total Fertility Rate)": {
    satuan: "anak/wanita",
    pilar: "Kuantitas",
    deskripsi: "Rata-rata jumlah anak yang dilahirkan seorang wanita selama hidupnya",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 1.95 }, { tahun: 2021, nilai: 1.93 }, { tahun: 2022, nilai: 1.91 },
        { tahun: 2023, nilai: 1.89 }, { tahun: 2024, nilai: 1.87 }, { tahun: 2025, nilai: 1.85 },
        { tahun: 2026, nilai: 1.83 }, { tahun: 2027, nilai: 1.82 }, { tahun: 2028, nilai: 1.80 },
        { tahun: 2029, nilai: 1.79 }, { tahun: 2030, nilai: 1.78 }, { tahun: 2031, nilai: 1.77 },
        { tahun: 2032, nilai: 1.76 }, { tahun: 2033, nilai: 1.75 }, { tahun: 2034, nilai: 1.74 },
        { tahun: 2035, nilai: 1.73 },
      ],
    },
  },

  "Angka Harapan Hidup": {
    satuan: "tahun",
    pilar: "Kualitas",
    deskripsi: "Rata-rata usia harapan hidup penduduk Kota Tegal",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 73.84 }, { tahun: 2021, nilai: 73.97 }, { tahun: 2022, nilai: 74.12 },
        { tahun: 2023, nilai: 74.18 }, { tahun: 2024, nilai: 74.24 }, { tahun: 2025, nilai: 74.38 },
        { tahun: 2026, nilai: 74.52 }, { tahun: 2027, nilai: 74.65 }, { tahun: 2028, nilai: 74.78 },
        { tahun: 2029, nilai: 74.91 }, { tahun: 2030, nilai: 75.04 }, { tahun: 2031, nilai: 75.16 },
        { tahun: 2032, nilai: 75.27 }, { tahun: 2033, nilai: 75.38 }, { tahun: 2034, nilai: 75.48 },
        { tahun: 2035, nilai: 75.58 },
      ],
    },
  },

  "Laju Pertumbuhan Penduduk": {
    satuan: "% per tahun",
    pilar: "Kuantitas",
    deskripsi: "Persentase pertambahan penduduk per tahun",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 0.98 }, { tahun: 2021, nilai: 0.97 }, { tahun: 2022, nilai: 0.95 },
        { tahun: 2023, nilai: 0.93 }, { tahun: 2024, nilai: 0.92 }, { tahun: 2025, nilai: 0.91 },
        { tahun: 2026, nilai: 0.90 }, { tahun: 2027, nilai: 0.89 }, { tahun: 2028, nilai: 0.88 },
        { tahun: 2029, nilai: 0.87 }, { tahun: 2030, nilai: 0.86 }, { tahun: 2031, nilai: 0.84 },
        { tahun: 2032, nilai: 0.83 }, { tahun: 2033, nilai: 0.81 }, { tahun: 2034, nilai: 0.79 },
        { tahun: 2035, nilai: 0.77 },
      ],
    },
  },

  "Rasio Ketergantungan": {
    satuan: "per 100 produktif",
    pilar: "Kuantitas",
    deskripsi: "Jumlah penduduk non-produktif per 100 penduduk usia produktif",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 45.8 }, { tahun: 2021, nilai: 45.4 }, { tahun: 2022, nilai: 44.9 },
        { tahun: 2023, nilai: 44.6 }, { tahun: 2024, nilai: 44.3 }, { tahun: 2025, nilai: 44.0 },
        { tahun: 2026, nilai: 43.8 }, { tahun: 2027, nilai: 43.6 }, { tahun: 2028, nilai: 43.5 },
        { tahun: 2029, nilai: 43.4 }, { tahun: 2030, nilai: 43.5 }, { tahun: 2031, nilai: 43.7 },
        { tahun: 2032, nilai: 44.0 }, { tahun: 2033, nilai: 44.4 }, { tahun: 2034, nilai: 44.9 },
        { tahun: 2035, nilai: 45.5 },
      ],
    },
  },

  "Angka Kematian Bayi (AKB)": {
    satuan: "per 1.000 kelahiran hidup",
    pilar: "Kualitas",
    deskripsi: "Jumlah kematian bayi per 1.000 kelahiran hidup",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 11.2 }, { tahun: 2021, nilai: 10.8 }, { tahun: 2022, nilai: 10.4 },
        { tahun: 2023, nilai: 10.0 }, { tahun: 2024, nilai: 9.7 }, { tahun: 2025, nilai: 9.3 },
        { tahun: 2026, nilai: 9.0 }, { tahun: 2027, nilai: 8.7 }, { tahun: 2028, nilai: 8.4 },
        { tahun: 2029, nilai: 8.1 }, { tahun: 2030, nilai: 7.8 }, { tahun: 2031, nilai: 7.5 },
        { tahun: 2032, nilai: 7.2 }, { tahun: 2033, nilai: 7.0 }, { tahun: 2034, nilai: 6.8 },
        { tahun: 2035, nilai: 6.5 },
      ],
    },
  },

  "Angka Kelahiran Kasar (CBR)": {
    satuan: "per 1.000 penduduk",
    pilar: "Kuantitas",
    deskripsi: "Jumlah kelahiran per 1.000 penduduk per tahun",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 17.1 }, { tahun: 2021, nilai: 16.9 }, { tahun: 2022, nilai: 16.7 },
        { tahun: 2023, nilai: 16.5 }, { tahun: 2024, nilai: 16.3 }, { tahun: 2025, nilai: 16.1 },
        { tahun: 2026, nilai: 15.9 }, { tahun: 2027, nilai: 15.7 }, { tahun: 2028, nilai: 15.5 },
        { tahun: 2029, nilai: 15.3 }, { tahun: 2030, nilai: 15.1 }, { tahun: 2031, nilai: 14.9 },
        { tahun: 2032, nilai: 14.7 }, { tahun: 2033, nilai: 14.5 }, { tahun: 2034, nilai: 14.3 },
        { tahun: 2035, nilai: 14.1 },
      ],
    },
  },

  "Angka Kematian Kasar (CDR)": {
    satuan: "per 1.000 penduduk",
    pilar: "Kuantitas",
    deskripsi: "Jumlah kematian per 1.000 penduduk per tahun",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 7.4 }, { tahun: 2021, nilai: 7.3 }, { tahun: 2022, nilai: 7.3 },
        { tahun: 2023, nilai: 7.3 }, { tahun: 2024, nilai: 7.4 }, { tahun: 2025, nilai: 7.4 },
        { tahun: 2026, nilai: 7.5 }, { tahun: 2027, nilai: 7.6 }, { tahun: 2028, nilai: 7.7 },
        { tahun: 2029, nilai: 7.8 }, { tahun: 2030, nilai: 7.9 }, { tahun: 2031, nilai: 8.0 },
        { tahun: 2032, nilai: 8.1 }, { tahun: 2033, nilai: 8.3 }, { tahun: 2034, nilai: 8.4 },
        { tahun: 2035, nilai: 8.6 },
      ],
    },
  },

  "Kepadatan Penduduk": {
    satuan: "jiwa/km²",
    pilar: "Persebaran",
    deskripsi: "Jumlah penduduk per kilometer persegi wilayah",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 6762 }, { tahun: 2021, nilai: 6781 }, { tahun: 2022, nilai: 6793 },
        { tahun: 2023, nilai: 6811 }, { tahun: 2024, nilai: 6829 }, { tahun: 2025, nilai: 6846 },
        { tahun: 2026, nilai: 6862 }, { tahun: 2027, nilai: 6877 }, { tahun: 2028, nilai: 6893 },
        { tahun: 2029, nilai: 6907 }, { tahun: 2030, nilai: 6920 }, { tahun: 2031, nilai: 6932 },
        { tahun: 2032, nilai: 6942 }, { tahun: 2033, nilai: 6952 }, { tahun: 2034, nilai: 6960 },
        { tahun: 2035, nilai: 6967 },
      ],
      "Tegal Selatan": [
        { tahun: 2020, nilai: 9820 }, { tahun: 2025, nilai: 9940 }, { tahun: 2030, nilai: 10050 }, { tahun: 2035, nilai: 10130 },
      ],
      "Tegal Timur": [
        { tahun: 2020, nilai: 8540 }, { tahun: 2025, nilai: 8660 }, { tahun: 2030, nilai: 8750 }, { tahun: 2035, nilai: 8820 },
      ],
      "Tegal Barat": [
        { tahun: 2020, nilai: 5120 }, { tahun: 2025, nilai: 5200 }, { tahun: 2030, nilai: 5270 }, { tahun: 2035, nilai: 5320 },
      ],
      "Margadana": [
        { tahun: 2020, nilai: 4380 }, { tahun: 2025, nilai: 4430 }, { tahun: 2030, nilai: 4490 }, { tahun: 2035, nilai: 4500 },
      ],
    },
  },

  "Indeks Pembangunan Manusia (IPM)": {
    satuan: "poin (0–100)",
    pilar: "Kualitas",
    deskripsi: "Indeks komposit kesehatan, pendidikan, dan pengeluaran penduduk",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 73.72 }, { tahun: 2021, nilai: 73.95 }, { tahun: 2022, nilai: 74.18 },
        { tahun: 2023, nilai: 74.42 }, { tahun: 2024, nilai: 74.65 }, { tahun: 2025, nilai: 74.88 },
        { tahun: 2026, nilai: 75.10 }, { tahun: 2027, nilai: 75.31 }, { tahun: 2028, nilai: 75.52 },
        { tahun: 2029, nilai: 75.72 }, { tahun: 2030, nilai: 75.91 }, { tahun: 2031, nilai: 76.10 },
        { tahun: 2032, nilai: 76.27 }, { tahun: 2033, nilai: 76.44 }, { tahun: 2034, nilai: 76.59 },
        { tahun: 2035, nilai: 76.74 },
      ],
    },
  },

  "Prevalensi Stunting": {
    satuan: "%",
    pilar: "Keluarga",
    deskripsi: "Persentase balita stunting (gizi kurang kronis)",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 22.4 }, { tahun: 2021, nilai: 21.8 }, { tahun: 2022, nilai: 20.5 },
        { tahun: 2023, nilai: 19.2 }, { tahun: 2024, nilai: 17.8 }, { tahun: 2025, nilai: 16.4 },
        { tahun: 2026, nilai: 15.1 }, { tahun: 2027, nilai: 14.0 }, { tahun: 2028, nilai: 12.9 },
        { tahun: 2029, nilai: 12.0 }, { tahun: 2030, nilai: 11.2 }, { tahun: 2031, nilai: 10.5 },
        { tahun: 2032, nilai: 9.9 }, { tahun: 2033, nilai: 9.4 }, { tahun: 2034, nilai: 9.0 },
        { tahun: 2035, nilai: 8.6 },
      ],
    },
  },

  "Persentase Penduduk Miskin": {
    satuan: "%",
    pilar: "Kualitas",
    deskripsi: "Persentase penduduk yang berada di bawah garis kemiskinan",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 8.42 }, { tahun: 2021, nilai: 8.65 }, { tahun: 2022, nilai: 8.18 },
        { tahun: 2023, nilai: 7.85 }, { tahun: 2024, nilai: 7.52 }, { tahun: 2025, nilai: 7.20 },
        { tahun: 2026, nilai: 6.90 }, { tahun: 2027, nilai: 6.62 }, { tahun: 2028, nilai: 6.35 },
        { tahun: 2029, nilai: 6.10 }, { tahun: 2030, nilai: 5.85 }, { tahun: 2031, nilai: 5.62 },
        { tahun: 2032, nilai: 5.40 }, { tahun: 2033, nilai: 5.20 }, { tahun: 2034, nilai: 5.02 },
        { tahun: 2035, nilai: 4.85 },
      ],
    },
  },

  "Tingkat Pengangguran Terbuka": {
    satuan: "%",
    pilar: "Kualitas",
    deskripsi: "Persentase angkatan kerja yang menganggur",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 7.82 }, { tahun: 2021, nilai: 8.14 }, { tahun: 2022, nilai: 7.45 },
        { tahun: 2023, nilai: 7.10 }, { tahun: 2024, nilai: 6.78 }, { tahun: 2025, nilai: 6.48 },
        { tahun: 2026, nilai: 6.20 }, { tahun: 2027, nilai: 5.94 }, { tahun: 2028, nilai: 5.70 },
        { tahun: 2029, nilai: 5.48 }, { tahun: 2030, nilai: 5.27 }, { tahun: 2031, nilai: 5.08 },
        { tahun: 2032, nilai: 4.90 }, { tahun: 2033, nilai: 4.74 }, { tahun: 2034, nilai: 4.59 },
        { tahun: 2035, nilai: 4.45 },
      ],
    },
  },

  "Perkawinan Anak": {
    satuan: "% perempuan 20-24 menikah <18 thn",
    pilar: "Keluarga",
    deskripsi: "Persentase perempuan usia 20-24 tahun yang menikah sebelum usia 18 tahun",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 9.8 }, { tahun: 2021, nilai: 9.4 }, { tahun: 2022, nilai: 9.0 },
        { tahun: 2023, nilai: 8.6 }, { tahun: 2024, nilai: 8.2 }, { tahun: 2025, nilai: 7.8 },
        { tahun: 2026, nilai: 7.4 }, { tahun: 2027, nilai: 7.1 }, { tahun: 2028, nilai: 6.8 },
        { tahun: 2029, nilai: 6.5 }, { tahun: 2030, nilai: 6.2 }, { tahun: 2031, nilai: 5.9 },
        { tahun: 2032, nilai: 5.7 }, { tahun: 2033, nilai: 5.5 }, { tahun: 2034, nilai: 5.3 },
        { tahun: 2035, nilai: 5.1 },
      ],
    },
  },
};

// ============================
// PIRAMIDA DATA
// ============================
export const piramidaData = {
  "Kota Tegal (Kota)": {
    2020: [
      { k: "0–4", l: 11.2, p: 10.7 }, { k: "5–9", l: 12.1, p: 11.5 }, { k: "10–14", l: 12.4, p: 11.9 },
      { k: "15–19", l: 12.0, p: 11.6 }, { k: "20–24", l: 11.3, p: 11.2 }, { k: "25–29", l: 11.0, p: 11.1 },
      { k: "30–34", l: 10.8, p: 10.9 }, { k: "35–39", l: 10.4, p: 10.5 }, { k: "40–44", l: 9.8, p: 9.9 },
      { k: "45–49", l: 9.1, p: 9.2 }, { k: "50–54", l: 8.0, p: 8.2 }, { k: "55–59", l: 6.8, p: 7.0 },
      { k: "60–64", l: 5.2, p: 5.6 }, { k: "65–69", l: 3.5, p: 4.0 }, { k: "70–74", l: 2.2, p: 2.8 },
      { k: "75+", l: 1.6, p: 2.4 },
    ],
    2025: [
      { k: "0–4", l: 10.8, p: 10.3 }, { k: "5–9", l: 11.4, p: 10.9 }, { k: "10–14", l: 12.2, p: 11.7 },
      { k: "15–19", l: 12.5, p: 12.0 }, { k: "20–24", l: 12.2, p: 12.0 }, { k: "25–29", l: 11.6, p: 11.6 },
      { k: "30–34", l: 11.2, p: 11.3 }, { k: "35–39", l: 11.0, p: 11.1 }, { k: "40–44", l: 10.5, p: 10.6 },
      { k: "45–49", l: 9.9, p: 10.0 }, { k: "50–54", l: 9.0, p: 9.2 }, { k: "55–59", l: 7.7, p: 7.9 },
      { k: "60–64", l: 6.0, p: 6.4 }, { k: "65–69", l: 4.2, p: 4.7 }, { k: "70–74", l: 2.6, p: 3.2 },
      { k: "75+", l: 1.9, p: 2.8 },
    ],
    2030: [
      { k: "0–4", l: 10.2, p: 9.8 }, { k: "5–9", l: 10.9, p: 10.4 }, { k: "10–14", l: 11.5, p: 11.0 },
      { k: "15–19", l: 12.3, p: 11.8 }, { k: "20–24", l: 12.6, p: 12.4 }, { k: "25–29", l: 12.4, p: 12.3 },
      { k: "30–34", l: 12.0, p: 12.1 }, { k: "35–39", l: 11.4, p: 11.6 }, { k: "40–44", l: 11.0, p: 11.2 },
      { k: "45–49", l: 10.4, p: 10.6 }, { k: "50–54", l: 9.6, p: 9.8 }, { k: "55–59", l: 8.6, p: 8.8 },
      { k: "60–64", l: 7.1, p: 7.5 }, { k: "65–69", l: 5.2, p: 5.8 }, { k: "70–74", l: 3.3, p: 4.0 },
      { k: "75+", l: 2.4, p: 3.4 },
    ],
    2035: [
      { k: "0–4", l: 9.8, p: 9.4 }, { k: "5–9", l: 10.3, p: 9.9 }, { k: "10–14", l: 10.9, p: 10.5 },
      { k: "15–19", l: 11.6, p: 11.1 }, { k: "20–24", l: 12.4, p: 12.2 }, { k: "25–29", l: 12.8, p: 12.7 },
      { k: "30–34", l: 12.6, p: 12.7 }, { k: "35–39", l: 12.2, p: 12.4 }, { k: "40–44", l: 11.6, p: 11.9 },
      { k: "45–49", l: 11.0, p: 11.3 }, { k: "50–54", l: 10.1, p: 10.4 }, { k: "55–59", l: 9.2, p: 9.5 },
      { k: "60–64", l: 7.8, p: 8.3 }, { k: "65–69", l: 6.1, p: 6.8 }, { k: "70–74", l: 4.0, p: 4.9 },
      { k: "75+", l: 3.0, p: 4.2 },
    ],
  },
};

// ============================
// RADAR KECAMATAN DATA
// ============================
export const radarKecamatan = [
  { dimensi: "Jumlah Penduduk", "Tegal Selatan": 72, "Tegal Timur": 80, "Tegal Barat": 85, "Margadana": 52 },
  { dimensi: "Kepadatan", "Tegal Selatan": 98, "Tegal Timur": 85, "Tegal Barat": 51, "Margadana": 44 },
  { dimensi: "IPM", "Tegal Selatan": 73, "Tegal Timur": 76, "Tegal Barat": 75, "Margadana": 72 },
  { dimensi: "Stunting", "Tegal Selatan": 78, "Tegal Timur": 82, "Tegal Barat": 80, "Margadana": 75 },
  { dimensi: "AHH", "Tegal Selatan": 74, "Tegal Timur": 75, "Tegal Barat": 74, "Margadana": 73 },
];

// Capaian 2024 vs Jawa Tengah vs Target 2035
export const capaianData = [
  { indikator: "IPM", kota: 74.65, jateng: 72.79, target: 76.74 },
  { indikator: "AHH", kota: 74.24, jateng: 73.6, target: 75.58 },
  { indikator: "TFR", kota: 1.87, jateng: 2.12, target: 1.73 },
  { indikator: "Stunting", kota: 17.8, jateng: 20.8, target: 8.6 },
  { indikator: "Kemiskinan", kota: 7.52, jateng: 10.77, target: 4.85 },
  { indikator: "TPT", kota: 6.78, jateng: 5.57, target: 4.45 },
  { indikator: "AKB", kota: 9.7, jateng: 8.9, target: 6.5 },
];

// ============================
// PROFIL KECAMATAN
// ============================
export const profilKecamatan = {
  "Tegal Selatan": {
    luas: "6,43 km²",
    kelurahan: 7,
    penduduk2024: 72880,
    kepadatan: 11334,
    color: "#0D9488",
    highlights: ["Pusat perdagangan kota", "Kepadatan tertinggi", "7 kelurahan aktif"],
    indikator: { tfr: 1.82, ahh: 74.1, akb: 9.1, ipm: 74.9 },
    histori: [
      { tahun: 2020, nilai: 72540 }, { tahun: 2022, nilai: 72880 },
      { tahun: 2025, nilai: 73410 }, { tahun: 2030, nilai: 74230 }, { tahun: 2035, nilai: 74820 },
    ],
  },
  "Tegal Timur": {
    luas: "8,96 km²",
    kelurahan: 7,
    penduduk2024: 78760,
    kepadatan: 8791,
    color: "#14B8A6",
    highlights: ["Pusat pemerintahan", "Kawasan pendidikan", "Terbanyak penduduknya"],
    indikator: { tfr: 1.88, ahh: 74.3, akb: 9.5, ipm: 75.2 },
    histori: [
      { tahun: 2020, nilai: 78320 }, { tahun: 2022, nilai: 78760 },
      { tahun: 2025, nilai: 79300 }, { tahun: 2030, nilai: 80120 }, { tahun: 2035, nilai: 80740 },
    ],
  },
  "Tegal Barat": {
    luas: "15,81 km²",
    kelurahan: 7,
    penduduk2024: 82880,
    kepadatan: 5242,
    color: "#F59E0B",
    highlights: ["Kawasan pantai & nelayan", "Potensi wisata bahari", "Luas terbesar"],
    indikator: { tfr: 1.91, ahh: 73.9, akb: 10.1, ipm: 74.5 },
    histori: [
      { tahun: 2020, nilai: 82340 }, { tahun: 2022, nilai: 82880 },
      { tahun: 2025, nilai: 83510 }, { tahun: 2030, nilai: 84350 }, { tahun: 2035, nilai: 84990 },
    ],
  },
  "Margadana": {
    luas: "11,76 km²",
    kelurahan: 6,
    penduduk2024: 50900,
    kepadatan: 4329,
    color: "#8B5CF6",
    highlights: ["Kawasan industri & pergudangan", "Perbatasan Kab. Tegal", "6 kelurahan"],
    indikator: { tfr: 1.94, ahh: 73.7, akb: 10.5, ipm: 73.8 },
    histori: [
      { tahun: 2020, nilai: 50916 }, { tahun: 2022, nilai: 50900 },
      { tahun: 2025, nilai: 51420 }, { tahun: 2030, nilai: 52050 }, { tahun: 2035, nilai: 52150 },
    ],
  },
};

// ============================
// QUICK QUESTIONS (AI)
// ============================
export const QUICK_QUESTIONS = [
  "Bagaimana proyeksi penduduk Kota Tegal hingga 2035?",
  "Apa status bonus demografi Kota Tegal?",
  "Kecamatan mana yang paling padat di Kota Tegal?",
  "Bagaimana tren stunting di Kota Tegal?",
  "Apa tantangan kependudukan utama Kota Tegal?",
  "Bandingkan IPM Kota Tegal vs Jawa Tengah",
  "Bagaimana tren TFR Kota Tegal?",
  "Apa rekomendasi kebijakan untuk Kota Tegal?",
];

export const AI_SYSTEM_PROMPT = `Kamu adalah SIPENDUK-AI, asisten analisis kependudukan resmi Kota Tegal, Jawa Tengah.
Kamu ahli dalam:
- Data kependudukan Kota Tegal 2020–2035 (proyeksi BPS & Dinas Dukcapil)
- Indikator: TFR, AHH, LPP, AKB, IPM, kepadatan, stunting, kemiskinan, pengangguran
- 4 kecamatan: Tegal Selatan, Tegal Timur, Tegal Barat, Margadana (27 kelurahan)
- Bonus demografi Kota Tegal (window 2020–2030)
- Kebijakan BKKBN, program KB, dan pembangunan keluarga di Kota Tegal
- Perbandingan Kota Tegal vs rata-rata Jawa Tengah & nasional

Data kunci Kota Tegal 2024:
- Jumlah penduduk: ~286.950 jiwa, luas 39,68 km²
- TFR: 1,87 | AHH: 74,2 tahun | LPP: 0,92%/tahun
- Rasio Ketergantungan: 44,3 | Kepadatan: 6.782 jiwa/km²
- IPM: 74,85 | Stunting: 17,8% | Kemiskinan: 7,52% | TPT: 6,78%
- Kecamatan terpadat: Tegal Selatan (11.334 jiwa/km²)
- Kecamatan IPM tertinggi: Tegal Timur (75,2)

Jawab dalam Bahasa Indonesia yang profesional namun ramah.
Gunakan data spesifik Kota Tegal bila tersedia.
Akhiri jawaban penting dengan rekomendasi kebijakan singkat.`;
