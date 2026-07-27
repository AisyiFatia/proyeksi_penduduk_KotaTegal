const BASE = import.meta.env.VITE_API_URL || "/api";

async function get(endpoint) {
  try {
    const res = await fetch(`${BASE}${endpoint}`);
    if (!res.ok) throw new Error(`GET ${endpoint} failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`API ${endpoint} tidak tersedia — fallback ke data statis.`, err.message);
    return null;
  }
}

async function send(method, endpoint, body) {
  try {
    const res = await fetch(`${BASE}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body != null ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${endpoint} failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`API ${method} ${endpoint} gagal.`, err.message);
    return null;
  }
}

export const api = {
  // Indikator
  getIndikator: () => get("/indikator"),
  updateIndikatorValue: (name, wilayah, tahun, nilai) => send("PUT", `/indikator/${encodeURIComponent(name)}/${encodeURIComponent(wilayah)}/${tahun}`, { nilai }),
  updateIndikatorMeta: (name, meta) => send("PUT", `/indikator/${encodeURIComponent(name)}/meta`, meta),

  // Piramida
  getPiramida: () => get("/piramida"),
  updatePiramida: (wilayah, tahun, kelompok, data) => send("PUT", `/piramida/${encodeURIComponent(wilayah)}/${tahun}/${encodeURIComponent(kelompok)}`, data),

  // Radar
  getRadar: () => get("/radar"),
  updateRadar: (dimensi, kecamatan, nilai) => send("PUT", `/radar/${encodeURIComponent(dimensi)}/${encodeURIComponent(kecamatan)}`, { nilai }),

  // Capaian
  getCapaian: () => get("/capaian"),
  updateCapaian: (indikator, field, nilai) => send("PUT", `/capaian/${encodeURIComponent(indikator)}/${field}`, { nilai }),

  // Profil Kecamatan
  getProfilKecamatan: () => get("/profil-kecamatan"),

  // Periode
  getPeriode: () => get("/periode"),
  addPeriode: (data) => send("POST", "/periode", data),
  deletePeriode: (id) => send("DELETE", `/periode/${id}`),

  // Penduduk (merged read)
  getPenduduk: () => get("/penduduk"),

  // — Primer CRUD (migrasi: pindah, datang, lahir, mati)
  getPendudukPrimer: () => get("/penduduk/primer"),
  addPendudukPrimer: (data) => send("POST", "/penduduk/primer", data),
  updatePendudukPrimer: (id, data) => send("PUT", `/penduduk/primer/${id}`, data),
  deletePendudukPrimer: (id) => send("DELETE", `/penduduk/primer/${id}`),
  bulkAddPendudukPrimer: (records) => send("POST", "/penduduk/primer/bulk", records),
  clearAllPendudukPrimer: () => send("DELETE", "/penduduk/primer"),

  // — Sekunder CRUD (demografi: gender, usia, kecamatan, sosial, TK, pendidikan)
  getPendudukSekunder: () => get("/penduduk/sekunder"),
  addPendudukSekunder: (data) => send("POST", "/penduduk/sekunder", data),
  updatePendudukSekunder: (id, data) => send("PUT", `/penduduk/sekunder/${id}`, data),
  deletePendudukSekunder: (id) => send("DELETE", `/penduduk/sekunder/${id}`),
  bulkAddPendudukSekunder: (records) => send("POST", "/penduduk/sekunder/bulk", records),
  clearAllPendudukSekunder: () => send("DELETE", "/penduduk/sekunder"),

  // Admin
  getAdmin: () => get("/admin"),
  login: (username, password) => send("POST", "/admin/login", { username, password }),
  addAdmin: (data) => send("POST", "/admin", data),
  deleteAdmin: (username) => send("DELETE", `/admin/${username}`),
};
