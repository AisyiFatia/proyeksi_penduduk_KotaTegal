import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ─── In-Memory Data Store ────────────────────────────────────
let indikatorData = {
  "Jumlah Penduduk": {
    satuan: "jiwa", pilar: "Kuantitas",
    deskripsi: "Total jumlah penduduk Kota Tegal",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 284116 }, { tahun: 2021, nilai: 284890 },
        { tahun: 2022, nilai: 285420 }, { tahun: 2023, nilai: 286180 },
        { tahun: 2024, nilai: 286950 }, { tahun: 2025, nilai: 287640 },
        { tahun: 2026, nilai: 288310 }, { tahun: 2027, nilai: 288970 },
        { tahun: 2028, nilai: 289600 }, { tahun: 2029, nilai: 290190 },
        { tahun: 2030, nilai: 290750 }, { tahun: 2031, nilai: 291250 },
        { tahun: 2032, nilai: 291700 }, { tahun: 2033, nilai: 292100 },
        { tahun: 2034, nilai: 292430 }, { tahun: 2035, nilai: 292700 },
      ],
      "Tegal Selatan": [
        { tahun: 2020, nilai: 72540 }, { tahun: 2022, nilai: 72880 },
        { tahun: 2025, nilai: 73410 }, { tahun: 2030, nilai: 74230 }, { tahun: 2035, nilai: 74820 },
      ],
      "Tegal Timur": [
        { tahun: 2020, nilai: 78320 }, { tahun: 2022, nilai: 78760 },
        { tahun: 2025, nilai: 79300 }, { tahun: 2030, nilai: 80120 }, { tahun: 2035, nilai: 80740 },
      ],
      "Tegal Barat": [
        { tahun: 2020, nilai: 82340 }, { tahun: 2022, nilai: 82880 },
        { tahun: 2025, nilai: 83510 }, { tahun: 2030, nilai: 84350 }, { tahun: 2035, nilai: 84990 },
      ],
      "Margadana": [
        { tahun: 2020, nilai: 50916 }, { tahun: 2022, nilai: 50900 },
        { tahun: 2025, nilai: 51420 }, { tahun: 2030, nilai: 52050 }, { tahun: 2035, nilai: 52150 },
      ],
    },
  },
  "TFR (Total Fertility Rate)": {
    satuan: "anak/wanita", pilar: "Kuantitas",
    deskripsi: "Rata-rata jumlah anak yang dilahirkan seorang wanita selama hidupnya",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 1.95 }, { tahun: 2021, nilai: 1.93 },
        { tahun: 2022, nilai: 1.91 }, { tahun: 2023, nilai: 1.89 },
        { tahun: 2024, nilai: 1.87 }, { tahun: 2025, nilai: 1.85 },
        { tahun: 2026, nilai: 1.83 }, { tahun: 2027, nilai: 1.82 },
        { tahun: 2028, nilai: 1.80 }, { tahun: 2029, nilai: 1.79 },
        { tahun: 2030, nilai: 1.78 }, { tahun: 2031, nilai: 1.77 },
        { tahun: 2032, nilai: 1.76 }, { tahun: 2033, nilai: 1.75 },
        { tahun: 2034, nilai: 1.74 }, { tahun: 2035, nilai: 1.73 },
      ],
    },
  },
  "Angka Harapan Hidup": {
    satuan: "tahun", pilar: "Kualitas",
    deskripsi: "Rata-rata usia harapan hidup penduduk Kota Tegal",
    data: {
      "Kota Tegal (Kota)": [
        { tahun: 2020, nilai: 73.84 }, { tahun: 2021, nilai: 73.97 },
        { tahun: 2022, nilai: 74.12 }, { tahun: 2023, nilai: 74.18 },
        { tahun: 2024, nilai: 74.24 }, { tahun: 2025, nilai: 74.38 },
        { tahun: 2026, nilai: 74.52 }, { tahun: 2027, nilai: 74.65 },
        { tahun: 2028, nilai: 74.78 }, { tahun: 2029, nilai: 74.91 },
        { tahun: 2030, nilai: 75.04 }, { tahun: 2031, nilai: 75.16 },
        { tahun: 2032, nilai: 75.27 }, { tahun: 2033, nilai: 75.38 },
        { tahun: 2034, nilai: 75.48 }, { tahun: 2035, nilai: 75.58 },
      ],
    },
  },
};

let piramidaData = {
  "Kota Tegal (Kota)": {
    "2020": [
      { k: "0\u20134", l: 11.2, p: 10.7 }, { k: "5\u20139", l: 12.1, p: 11.5 },
      { k: "10\u201314", l: 12.4, p: 11.9 }, { k: "15\u201319", l: 12.0, p: 11.6 },
      { k: "20\u201324", l: 11.3, p: 11.2 }, { k: "25\u201329", l: 11.0, p: 11.1 },
      { k: "30\u201334", l: 10.8, p: 10.9 }, { k: "35\u201339", l: 10.4, p: 10.5 },
      { k: "40\u201344", l: 9.8, p: 9.9 }, { k: "45\u201349", l: 9.1, p: 9.2 },
      { k: "50\u201354", l: 8.0, p: 8.2 }, { k: "55\u201359", l: 6.8, p: 7.0 },
      { k: "60\u201364", l: 5.2, p: 5.6 }, { k: "65\u201369", l: 3.5, p: 4.0 },
      { k: "70\u201374", l: 2.2, p: 2.8 }, { k: "75+", l: 1.6, p: 2.4 },
    ],
    "2025": [
      { k: "0\u20134", l: 10.8, p: 10.3 }, { k: "5\u20139", l: 11.4, p: 10.9 },
      { k: "10\u201314", l: 12.2, p: 11.7 }, { k: "15\u201319", l: 12.5, p: 12.0 },
      { k: "20\u201324", l: 12.2, p: 12.0 }, { k: "25\u201329", l: 11.6, p: 11.6 },
      { k: "30\u201334", l: 11.2, p: 11.3 }, { k: "35\u201339", l: 11.0, p: 11.1 },
      { k: "40\u201344", l: 10.5, p: 10.6 }, { k: "45\u201349", l: 9.9, p: 10.0 },
      { k: "50\u201354", l: 9.0, p: 9.2 }, { k: "55\u201359", l: 7.7, p: 7.9 },
      { k: "60\u201364", l: 6.0, p: 6.4 }, { k: "65\u201369", l: 4.2, p: 4.7 },
      { k: "70\u201374", l: 2.6, p: 3.2 }, { k: "75+", l: 1.9, p: 2.8 },
    ],
    "2030": [
      { k: "0\u20134", l: 10.2, p: 9.8 }, { k: "5\u20139", l: 10.9, p: 10.4 },
      { k: "10\u201314", l: 11.5, p: 11.0 }, { k: "15\u201319", l: 12.3, p: 11.8 },
      { k: "20\u201324", l: 12.6, p: 12.4 }, { k: "25\u201329", l: 12.4, p: 12.3 },
      { k: "30\u201334", l: 12.0, p: 12.1 }, { k: "35\u201339", l: 11.4, p: 11.6 },
      { k: "40\u201344", l: 11.0, p: 11.2 }, { k: "45\u201349", l: 10.4, p: 10.6 },
      { k: "50\u201354", l: 9.6, p: 9.8 }, { k: "55\u201359", l: 8.6, p: 8.8 },
      { k: "60\u201364", l: 7.1, p: 7.5 }, { k: "65\u201369", l: 5.2, p: 5.8 },
      { k: "70\u201374", l: 3.3, p: 4.0 }, { k: "75+", l: 2.4, p: 3.4 },
    ],
    "2035": [
      { k: "0\u20134", l: 9.8, p: 9.4 }, { k: "5\u20139", l: 10.3, p: 9.9 },
      { k: "10\u201314", l: 10.9, p: 10.5 }, { k: "15\u201319", l: 11.6, p: 11.1 },
      { k: "20\u201324", l: 12.4, p: 12.2 }, { k: "25\u201329", l: 12.8, p: 12.7 },
      { k: "30\u201334", l: 12.6, p: 12.7 }, { k: "35\u201339", l: 12.2, p: 12.4 },
      { k: "40\u201344", l: 11.6, p: 11.9 }, { k: "45\u201349", l: 11.0, p: 11.3 },
      { k: "50\u201354", l: 10.1, p: 10.4 }, { k: "55\u201359", l: 9.2, p: 9.5 },
      { k: "60\u201364", l: 7.8, p: 8.3 }, { k: "65\u201369", l: 6.1, p: 6.8 },
      { k: "70\u201374", l: 4.0, p: 4.9 }, { k: "75+", l: 3.0, p: 4.2 },
    ],
  },
};

let radarKecamatan = [
  { dimensi: "Jumlah Penduduk", "Tegal Selatan": 72, "Tegal Timur": 80, "Tegal Barat": 85, "Margadana": 52 },
  { dimensi: "Kepadatan", "Tegal Selatan": 98, "Tegal Timur": 85, "Tegal Barat": 51, "Margadana": 44 },
  { dimensi: "IPM", "Tegal Selatan": 73, "Tegal Timur": 76, "Tegal Barat": 75, "Margadana": 72 },
  { dimensi: "Stunting", "Tegal Selatan": 78, "Tegal Timur": 82, "Tegal Barat": 80, "Margadana": 75 },
  { dimensi: "AHH", "Tegal Selatan": 74, "Tegal Timur": 75, "Tegal Barat": 74, "Margadana": 73 },
];

let capaianData = [
  { indikator: "IPM", kota: 74.65, jateng: 72.79, target: 76.74 },
  { indikator: "AHH", kota: 74.24, jateng: 73.6, target: 75.58 },
  { indikator: "TFR", kota: 1.87, jateng: 2.12, target: 1.73 },
  { indikator: "Stunting", kota: 17.8, jateng: 20.8, target: 8.6 },
  { indikator: "Kemiskinan", kota: 7.52, jateng: 10.77, target: 4.85 },
  { indikator: "TPT", kota: 6.78, jateng: 5.57, target: 4.45 },
  { indikator: "AKB", kota: 9.7, jateng: 8.9, target: 6.5 },
];

let profilKecamatan = {
  "Tegal Selatan": { color: "#0D9488", kelurahan: 5, luas: "7.39 km\u00B2", penduduk2024: 73410, kepadatan: 9940, indikator: { tfr: 1.82, ahh: 74.1, akb: 9.1, ipm: 74.9 }, histori: [{ tahun: 2020, nilai: 72540 }, { tahun: 2022, nilai: 72880 }, { tahun: 2025, nilai: 73410 }, { tahun: 2030, nilai: 74230 }, { tahun: 2035, nilai: 74820 }], highlights: ["Kawasan perdagangan dan jasa", "IPM tertinggi kedua (2024: 74.65)", "Kepadatan tertinggi"] },
  "Tegal Timur": { color: "#2563EB", kelurahan: 5, luas: "9.16 km\u00B2", penduduk2024: 79300, kepadatan: 8660, indikator: { tfr: 1.88, ahh: 74.3, akb: 9.5, ipm: 75.2 }, histori: [{ tahun: 2020, nilai: 78320 }, { tahun: 2022, nilai: 78760 }, { tahun: 2025, nilai: 79300 }, { tahun: 2030, nilai: 80120 }, { tahun: 2035, nilai: 80740 }], highlights: ["Pusat pendidikan dan kesehatan", "IPM tertinggi (2024: 76.02)", "AKB terendah"] },
  "Tegal Barat": { color: "#D97706", kelurahan: 6, luas: "16.27 km\u00B2", penduduk2024: 83510, kepadatan: 5200, indikator: { tfr: 1.91, ahh: 73.9, akb: 10.1, ipm: 74.5 }, histori: [{ tahun: 2020, nilai: 82340 }, { tahun: 2022, nilai: 82880 }, { tahun: 2025, nilai: 83510 }, { tahun: 2030, nilai: 84350 }, { tahun: 2035, nilai: 84990 }], highlights: ["Kawasan industri dan pelabuhan", "Wilayah terluas", "Penduduk terbanyak"] },
  "Margadana": { color: "#7C3AED", kelurahan: 4, luas: "11.63 km\u00B2", penduduk2024: 51420, kepadatan: 4430, indikator: { tfr: 1.94, ahh: 73.7, akb: 10.5, ipm: 73.8 }, histori: [{ tahun: 2020, nilai: 50916 }, { tahun: 2022, nilai: 50900 }, { tahun: 2025, nilai: 51420 }, { tahun: 2030, nilai: 52050 }, { tahun: 2035, nilai: 52150 }], highlights: ["Kawasan permukiman baru", "Pertumbuhan penduduk tercepat", "Angka kemiskinan terendah"] },
};

let pendudukData = [];
let currentPendudukId = 1;

// Seed penduduk data — kosong, user akan input sendiri

let periodeData = [];
for (let t = 1996; t <= 2025; t++) {
  const ctx = {
    1996: "Periode awal reformasi", 1997: "Krisis ekonomi Asia", 1998: "Akhir Orde Baru",
    1999: "Periode transisi demokrasi", 2000: "Awal milenium baru",
    2001: "Periode otonomi daerah", 2002: "Periode otonomi daerah", 2003: "Periode otonomi daerah",
    2004: "Tahun pemilu langsung pertama", 2005: "Periode pembangunan infrastruktur",
    2006: "Periode pembangunan infrastruktur", 2007: "Periode pembangunan infrastruktur",
    2008: "Periode pembangunan infrastruktur", 2009: "Periode pembangunan infrastruktur",
    2010: "Periode RPJMN 2010\u20132014", 2011: "Periode RPJMN 2010\u20132014",
    2012: "Periode RPJMN 2010\u20132014", 2013: "Periode RPJMN 2010\u20132014",
    2014: "Periode RPJMN 2010\u20132014", 2015: "Periode RPJMN 2015\u20132019",
    2016: "Periode RPJMN 2015\u20132019", 2017: "Periode RPJMN 2015\u20132019",
    2018: "Periode RPJMN 2015\u20132019", 2019: "Periode RPJMN 2015\u20132019",
    2020: "Awal pandemi COVID-19", 2021: "Masa pandemi COVID-19",
    2022: "Pemulihan pasca pandemi", 2023: "Periode reguler 2023",
    2024: "Periode reguler 2024", 2025: "Periode reguler 2025",
  };
  periodeData.push({
    id_priode: t - 1995,
    nama_priode: t.toString(),
    keterangan: ctx[t] || "Periode reguler",
    status: "aktif",
  });
}

let adminUsers = [
  { username: "admin", password: "admin123", role: "admin", name: "Admin Utama" },
  { username: "analis", password: "analis123", role: "analis", name: "Petugas Analis" },
  { username: "tegal", password: "tegal2025", role: "viewer", name: "User Tegal" },
];

// ─── Routes ──────────────────────────────────────────────────

app.get("/", (req, res) => res.json({ name: "SIPENDUK API", version: "1.0", endpoints: ["/api/indikator", "/api/piramida", "/api/radar", "/api/capaian", "/api/profil-kecamatan", "/api/penduduk", "/api/periode", "/api/admin"] }));

// Indikator
app.get("/api/indikator", (req, res) => res.json(indikatorData));
app.put("/api/indikator/:name/:wilayah/:tahun", (req, res) => {
  const { name, wilayah, tahun } = req.params;
  const { nilai } = req.body;
  if (indikatorData[name]?.data?.[wilayah]) {
    const entry = indikatorData[name].data[wilayah].find(d => d.tahun === +tahun);
    if (entry) entry.nilai = nilai;
    else indikatorData[name].data[wilayah].push({ tahun: +tahun, nilai });
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Not found" });
});
app.put("/api/indikator/:name/meta", (req, res) => {
  const { name } = req.params;
  const { satuan, pilar, deskripsi } = req.body;
  if (indikatorData[name]) {
    if (satuan !== undefined) indikatorData[name].satuan = satuan;
    if (pilar !== undefined) indikatorData[name].pilar = pilar;
    if (deskripsi !== undefined) indikatorData[name].deskripsi = deskripsi;
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Not found" });
});

// Piramida
app.get("/api/piramida", (req, res) => res.json(piramidaData));
app.put("/api/piramida/:wilayah/:tahun/:kelompok", (req, res) => {
  const { wilayah, tahun, kelompok } = req.params;
  const { l, p } = req.body;
  const entry = piramidaData[wilayah]?.[tahun]?.find(d => d.k === kelompok);
  if (entry) {
    if (l !== undefined) entry.l = l;
    if (p !== undefined) entry.p = p;
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Not found" });
});

// Radar
app.get("/api/radar", (req, res) => res.json(radarKecamatan));
app.put("/api/radar/:dimensi/:kecamatan", (req, res) => {
  const { dimensi, kecamatan } = req.params;
  const { nilai } = req.body;
  const row = radarKecamatan.find(r => r.dimensi === dimensi);
  if (row && row[kecamatan] !== undefined) {
    row[kecamatan] = nilai;
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Not found" });
});

// Capaian
app.get("/api/capaian", (req, res) => res.json(capaianData));
app.put("/api/capaian/:indikator/:field", (req, res) => {
  const { indikator, field } = req.params;
  const { nilai } = req.body;
  const row = capaianData.find(r => r.indikator === indikator);
  if (row && ["kota", "jateng", "target"].includes(field)) {
    row[field] = nilai;
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Not found" });
});

// Profil Kecamatan
app.get("/api/profil-kecamatan", (req, res) => res.json(profilKecamatan));

// Periode
app.get("/api/periode", (req, res) => res.json(periodeData));
app.post("/api/periode", (req, res) => {
  const { nama_priode, keterangan, status } = req.body;
  const id = periodeData.length + 1;
  const newPeriode = { id_priode: id, nama_priode: nama_priode || `Periode ${id}`, keterangan: keterangan || "", status: status || "aktif" };
  periodeData.push(newPeriode);
  res.status(201).json(newPeriode);
});
app.delete("/api/periode/:id", (req, res) => {
  const id = +req.params.id;
  const idx = periodeData.findIndex(p => p.id_priode === id);
  if (idx !== -1) { periodeData.splice(idx, 1); return res.json({ success: true }); }
  res.status(404).json({ error: "Not found" });
});

// Admin Users
app.get("/api/admin", (req, res) => res.json(adminUsers.map(u => ({ username: u.username, role: u.role, name: u.name }))));
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  const user = adminUsers.find(u => u.username === username && u.password === password);
  if (user) return res.json({ username: user.username, role: user.role, name: user.name });
  res.status(401).json({ error: "Invalid credentials" });
});
app.post("/api/admin", (req, res) => {
  const { username, password, role, name } = req.body;
  if (adminUsers.find(u => u.username === username)) return res.status(409).json({ error: "Username exists" });
  const newUser = { username, password, role: role || "viewer", name: name || username };
  adminUsers.push(newUser);
  res.status(201).json({ username: newUser.username, role: newUser.role, name: newUser.name });
});
app.delete("/api/admin/:username", (req, res) => {
  const idx = adminUsers.findIndex(u => u.username === req.params.username);
  if (idx !== -1 && adminUsers[idx].username !== "admin") { adminUsers.splice(idx, 1); return res.json({ success: true }); }
  res.status(404).json({ error: "Not found or cannot delete admin" });
});

// Penduduk
app.get("/api/penduduk", (req, res) => res.json(pendudukData));
app.post("/api/penduduk", (req, res) => {
  const { id_priode, tahun, jumlah_pindah, jumlah_datang, jumlah_kelahiran, jumlah_kematian } = req.body;
  const entry = {
    id_penduduk: currentPendudukId++, id_priode: id_priode || 1,
    tahun: tahun || new Date().getFullYear(),
    jumlah_pindah: jumlah_pindah || 0, jumlah_datang: jumlah_datang || 0,
    jumlah_kelahiran: jumlah_kelahiran || 0, jumlah_kematian: jumlah_kematian || 0,
  };
  pendudukData.push(entry);
  res.status(201).json(entry);
});
app.put("/api/penduduk/:id", (req, res) => {
  const entry = pendudukData.find(d => d.id_penduduk === +req.params.id);
  if (entry) {
    Object.assign(entry, req.body);
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Not found" });
});
app.delete("/api/penduduk/:id", (req, res) => {
  const idx = pendudukData.findIndex(d => d.id_penduduk === +req.params.id);
  if (idx !== -1) { pendudukData.splice(idx, 1); return res.json({ success: true }); }
  res.status(404).json({ error: "Not found" });
});
app.post("/api/penduduk/bulk", (req, res) => {
  const records = req.body;
  if (!Array.isArray(records) || records.length === 0) return res.status(400).json({ error: "Invalid data" });
  const entries = records.map(r => ({
    id_penduduk: currentPendudukId++,
    id_priode: r.id_priode || (r.tahun - 1995) || 1,
    tahun: r.tahun || new Date().getFullYear(),
    jumlah_pindah: r.jumlah_pindah || 0,
    jumlah_datang: r.jumlah_datang || 0,
    jumlah_kelahiran: r.jumlah_kelahiran || 0,
    jumlah_kematian: r.jumlah_kematian || 0,
  }));
  pendudukData.push(...entries);
  res.status(201).json({ success: true, count: entries.length });
});
app.delete("/api/penduduk", (req, res) => {
  pendudukData = [];
  currentPendudukId = 1;
  res.json({ success: true });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`SIPENDUK API running on http://localhost:${PORT}`));
