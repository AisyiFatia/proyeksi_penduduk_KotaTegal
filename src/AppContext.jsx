// ══════════════════════════════════════════════════════════════
//  APPCONTEXT.JSX — State Management Terpusat
//  Semua data CRUD, persistensi localStorage, dan sinkronisasi
//  API backend dikelola di sini via React Context.
// ══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  indikatorData as DATA_INDIKATOR,
  piramidaData as DATA_PIRAMIDA,
  radarKecamatan as DATA_RADAR,
  capaianData as DATA_CAPAIAN,
  profilKecamatan as DATA_PROFIL,
} from "./data.js";

import { api } from "./api.js";

// ══════════════════════════════════════════════════════════════
//  DATA GENERATOR — berdasarkan data riil SIPENDUK Tegal
// ══════════════════════════════════════════════════════════════
function generatePeriode() {
  const p = [];
  let id = 1;
  const ctx = {
    1996: "Periode awal reformasi", 1997: "Krisis ekonomi Asia", 1998: "Akhir Orde Baru",
    1999: "Periode transisi demokrasi", 2000: "Awal milenium baru",
    2001: "Periode otonomi daerah", 2002: "Periode otonomi daerah", 2003: "Periode otonomi daerah",
    2004: "Tahun pemilu langsung pertama", 2005: "Periode pembangunan infrastruktur",
    2006: "Periode pembangunan infrastruktur", 2007: "Periode pembangunan infrastruktur",
    2008: "Periode pembangunan infrastruktur", 2009: "Periode pembangunan infrastruktur",
    2010: "Periode RPJMN 2010–2014", 2011: "Periode RPJMN 2010–2014",
    2012: "Periode RPJMN 2010–2014", 2013: "Periode RPJMN 2010–2014",
    2014: "Periode RPJMN 2010–2014", 2015: "Periode RPJMN 2015–2019",
    2016: "Periode RPJMN 2015–2019", 2017: "Periode RPJMN 2015–2019",
    2018: "Periode RPJMN 2015–2019", 2019: "Periode RPJMN 2015–2019",
    2020: "Awal pandemi COVID-19", 2021: "Masa pandemi COVID-19",
    2022: "Pemulihan pasca pandemi", 2023: "Periode reguler 2023",
    2024: "Periode berjalan 2024", 2025: "Periode berjalan 2025",
  };
  for (let y = 1996; y <= 2025; y++) {
    p.push({ id_priode: id++, nama_priode: `Tahun ${y}`, keterangan: ctx[y] || `Periode tahun ${y}` });
  }
  return p;
}

export const INITIAL_PERIODE = generatePeriode();

export const INITIAL_ADMINS = [
  { id_admin: 1, username: "admin",  nama: "Admin SIPENDUK",      level: "superadmin", status: 1 },
  { id_admin: 2, username: "analis", nama: "Analis Dukcapil",     level: "admin",      status: 1 },
  { id_admin: 3, username: "tegal",  nama: "Operator Kota Tegal", level: "admin",      status: 1 },
];

export const DEMO_CREDENTIALS = [
  { username: "admin",  password: "admin123",   role: "Administrator",  name: "Admin SIPENDUK" },
  { username: "analis", password: "analis123",  role: "Analis Data",    name: "Analis Dukcapil" },
  { username: "tegal",  password: "tegal2025",  role: "Operator",       name: "Operator Kota Tegal" },
];

// ══════════════════════════════════════════════════════════════
//  CONTEXT
// ══════════════════════════════════════════════════════════════
const AppContext = createContext(null);

export function AppProvider({ children }) {

  // ── Penduduk ─────────────────────────────────────────────
  const [pendudukData, setPendudukData] = useState(() => {
    try {
      const saved = localStorage.getItem("sipenduk_penduduk_v4");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.length > 0 && p[0].bulan != null) {
          localStorage.removeItem("sipenduk_penduduk_v4");
          return [];
        }
        if (p.length > 0) return p;
      }
    } catch (_) {}
    return [];
  });

  // ── Periode ──────────────────────────────────────────────
  const [periodeData, setPeriodeData] = useState(() => {
    try {
      const saved = localStorage.getItem("sipenduk_periode_v4");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.length >= INITIAL_PERIODE.length) return p; // keep saved if sufficient
      }
    } catch (_) {}
    return JSON.parse(JSON.stringify(INITIAL_PERIODE));
  });

  // ── Admin Users ───────────────────────────────────────────
  const [adminUsers, setAdminUsers] = useState(() => {
    try {
      const saved = localStorage.getItem("sipenduk_admins_v4");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_ADMINS;
  });

  // ── Persist to localStorage ───────────────────────────────
  useEffect(() => {
    localStorage.setItem("sipenduk_penduduk_v4", JSON.stringify(pendudukData));
  }, [pendudukData]);

  useEffect(() => {
    localStorage.setItem("sipenduk_periode_v4", JSON.stringify(periodeData));
  }, [periodeData]);

  useEffect(() => {
    localStorage.setItem("sipenduk_admins_v4", JSON.stringify(adminUsers));
  }, [adminUsers]);

  // ── Indikator Data ──────────────────────────────────────────
  const [indikatorData, setIndikatorData] = useState(() => {
    try {
      const saved = localStorage.getItem("sipenduk_indikator_v4");
      if (saved) {
        const p = JSON.parse(saved);
        const newKeys = Object.keys(DATA_INDIKATOR);
        const savedKeys = Object.keys(p);
        if (newKeys.every(k => savedKeys.includes(k))) return p; // keep if all keys exist
      }
    } catch (_) {}
    return JSON.parse(JSON.stringify(DATA_INDIKATOR));
  });

  const [piramidaData, setPiramidaData] = useState(() => {
    try {
      const saved = localStorage.getItem("sipenduk_piramida_v4");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return JSON.parse(JSON.stringify(DATA_PIRAMIDA));
  });

  const [radarKecamatan, setRadarKecamatan] = useState(() => {
    try {
      const saved = localStorage.getItem("sipenduk_radar_v4");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return JSON.parse(JSON.stringify(DATA_RADAR));
  });

  const [capaianData, setCapaianData] = useState(() => {
    try {
      const saved = localStorage.getItem("sipenduk_capaian_v4");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return JSON.parse(JSON.stringify(DATA_CAPAIAN));
  });

  const [profilKecamatan, setProfilKecamatan] = useState(() => {
    try {
      const saved = localStorage.getItem("sipenduk_profil_v4");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return JSON.parse(JSON.stringify(DATA_PROFIL));
  });

  // ── Persist new data ─────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("sipenduk_indikator_v4", JSON.stringify(indikatorData));
  }, [indikatorData]);

  useEffect(() => {
    localStorage.setItem("sipenduk_piramida_v4", JSON.stringify(piramidaData));
  }, [piramidaData]);

  useEffect(() => {
    localStorage.setItem("sipenduk_radar_v4", JSON.stringify(radarKecamatan));
  }, [radarKecamatan]);

  useEffect(() => {
    localStorage.setItem("sipenduk_capaian_v4", JSON.stringify(capaianData));
  }, [capaianData]);

  useEffect(() => {
    localStorage.setItem("sipenduk_profil_v4", JSON.stringify(profilKecamatan));
  }, [profilKecamatan]);

  // ══════════════════════════════════════════════════════════
  //  API SYNC — ambil data dari backend jika tersedia
  // ══════════════════════════════════════════════════════════
  const [apiReady, setApiReady] = useState(false);
  useEffect(() => {
    (async () => {
      const [ind, pir, rad, cap, prof, pen, per, adm] = await Promise.all([
        api.getIndikator(),
        api.getPiramida(),
        api.getRadar(),
        api.getCapaian(),
        api.getProfilKecamatan(),
        api.getPenduduk(),
        api.getPeriode(),
        api.getAdmin(),
      ]);
      if (ind) setIndikatorData(ind);
      if (pir) setPiramidaData(pir);
      if (rad) setRadarKecamatan(rad);
      if (cap) setCapaianData(cap);
      if (prof) setProfilKecamatan(prev => {
        const merged = { ...prev };
        Object.keys(prof).forEach(k => {
          if (prev[k]) merged[k] = { ...prev[k], ...prof[k] };
          else merged[k] = prof[k];
        });
        return merged;
      });
      if (pen && pen.length > 0) setPendudukData(pen);
      if (per && per.length > 0) setPeriodeData(per);
      if (adm && adm.length > 0) {
        setAdminUsers(adm.map((u, i) => ({ id_admin: i + 1, username: u.username, nama: u.name, level: u.role, status: 1 })));
        setApiReady(true);
      }
    })();
  }, []);

  // ══════════════════════════════════════════════════════════
  //  PENDUDUK CRUD
  // ══════════════════════════════════════════════════════════
  const addPenduduk = useCallback((record) => {
    setPendudukData(prev => {
      const newId = (prev.length > 0 ? Math.max(...prev.map(d => d.id_penduduk)) : 0) + 1;
      const entry = { ...record, id_penduduk: newId };
      api.addPenduduk(record); // sync ke backend, ignore error
      return [...prev, entry];
    });
  }, []);

  const updatePenduduk = useCallback((id, updates) => {
    setPendudukData(prev =>
      prev.map(d => d.id_penduduk === id ? { ...d, ...updates, id_penduduk: id } : d)
    );
    api.updatePenduduk(id, updates);
  }, []);

  const deletePenduduk = useCallback((id) => {
    setPendudukData(prev => prev.filter(d => d.id_penduduk !== id));
    api.deletePenduduk(id);
  }, []);

  const importPenduduk = useCallback((records) => {
    setPendudukData(prev => {
      const maxId = prev.length > 0 ? Math.max(...prev.map(d => d.id_penduduk)) : 0;
      const NEW_FIELDS = ["jml_pria","jml_perempuan","umur_0_4","umur_5_18","umur_15_64","umur_65_plus","penduduk_tegal_selatan","penduduk_tegal_timur","penduduk_tegal_barat","penduduk_margadana","jml_miskin","pendapatan_per_kapita","jml_sekolah","jml_faskes","jml_pekerja_formal","jml_pekerja_informal","jml_penganggur","jml_pendidikan_sd","jml_pendidikan_smp","jml_pendidikan_sma","jml_pendidikan_pt"];
      const entries = records.map((r, i) => {
        const entry = {
          id_penduduk: maxId + i + 1,
          id_priode: r.tahun - 1995,
          tahun: r.tahun,
        };
        NEW_FIELDS.forEach(k => { entry[k] = r[k] || 0; });
        return entry;
      });
      api.bulkAddPenduduk(entries);
      return [...prev, ...entries];
    });
  }, []);

  const clearAllPenduduk = useCallback(() => {
    setPendudukData([]);
    api.clearAllPenduduk();
  }, []);

  // ══════════════════════════════════════════════════════════
  //  PERIODE CRUD
  // ══════════════════════════════════════════════════════════
  const addPeriode = useCallback((record) => {
    setPeriodeData(prev => {
      const newId = (prev.length > 0 ? Math.max(...prev.map(d => d.id_priode)) : 0) + 1;
      api.addPeriode(record);
      return [...prev, { ...record, id_priode: newId }];
    });
  }, []);

  const updatePeriode = useCallback((id, updates) => {
    setPeriodeData(prev =>
      prev.map(d => d.id_priode === id ? { ...d, ...updates } : d)
    );
  }, []);

  const deletePeriode = useCallback((id) => {
    setPeriodeData(prev => prev.filter(d => d.id_priode !== id));
    api.deletePeriode(id);
  }, []);

  // ══════════════════════════════════════════════════════════
  //  ADMIN CRUD
  // ══════════════════════════════════════════════════════════
  const addAdminUser = useCallback((record) => {
    setAdminUsers(prev => {
      const newId = (prev.length > 0 ? Math.max(...prev.map(d => d.id_admin)) : 0) + 1;
      api.addAdmin(record);
      return [...prev, { ...record, id_admin: newId }];
    });
  }, []);

  const updateAdminUser = useCallback((id, updates) => {
    setAdminUsers(prev =>
      prev.map(d => d.id_admin === id ? { ...d, ...updates } : d)
    );
  }, []);

  const deleteAdminUser = useCallback((id) => {
    setAdminUsers(prev => {
      const user = prev.find(d => d.id_admin === id);
      if (user) api.deleteAdmin(user.username);
      return prev.filter(d => d.id_admin !== id);
    });
  }, []);

  // ══════════════════════════════════════════════════════════
  //  INDIKATOR CRUD
  // ══════════════════════════════════════════════════════════
  const updateIndikatorValue = useCallback((indikatorName, wilayah, tahun, nilai) => {
    setIndikatorData(prev => {
      const next = { ...prev };
      const ind = next[indikatorName];
      if (!ind) return prev;
      const wilayahData = ind.data[wilayah] || [];
      const idx = wilayahData.findIndex(d => d.tahun === tahun);
      if (idx >= 0) {
        const newWilayah = [...wilayahData];
        newWilayah[idx] = { ...newWilayah[idx], nilai };
        next[indikatorName] = { ...ind, data: { ...ind.data, [wilayah]: newWilayah } };
      } else {
        const newWilayah = [...wilayahData, { tahun, nilai }].sort((a, b) => a.tahun - b.tahun);
        next[indikatorName] = { ...ind, data: { ...ind.data, [wilayah]: newWilayah } };
      }
      return next;
    });
  }, []);

  const updateIndikatorMeta = useCallback((indikatorName, updates) => {
    setIndikatorData(prev => {
      if (!prev[indikatorName]) return prev;
      return { ...prev, [indikatorName]: { ...prev[indikatorName], ...updates } };
    });
  }, []);

  // ══════════════════════════════════════════════════════════
  //  PIRAMIDA CRUD
  // ══════════════════════════════════════════════════════════
  const updatePiramidaValue = useCallback((wilayah, tahun, kelompok, field, nilai) => {
    setPiramidaData(prev => {
      const next = { ...prev };
      const wData = next[wilayah];
      if (!wData) return prev;
      const yData = wData[tahun];
      if (!yData) return prev;
      const idx = yData.findIndex(d => d.k === kelompok);
      if (idx >= 0) {
        const newY = [...yData];
        newY[idx] = { ...newY[idx], [field]: nilai };
        next[wilayah] = { ...wData, [tahun]: newY };
      }
      return next;
    });
  }, []);

  // ══════════════════════════════════════════════════════════
  //  RADAR CRUD
  // ══════════════════════════════════════════════════════════
  const updateRadarValue = useCallback((dimensi, kecamatan, nilai) => {
    setRadarKecamatan(prev => {
      const next = [...prev];
      const idx = next.findIndex(d => d.dimensi === dimensi);
      if (idx >= 0) {
        next[idx] = { ...next[idx], [kecamatan]: nilai };
      }
      return next;
    });
  }, []);

  // ══════════════════════════════════════════════════════════
  //  CAPAIAN CRUD
  // ══════════════════════════════════════════════════════════
  const updateCapaianValue = useCallback((indikator, field, nilai) => {
    setCapaianData(prev => {
      const next = [...prev];
      const idx = next.findIndex(d => d.indikator === indikator);
      if (idx >= 0) {
        next[idx] = { ...next[idx], [field]: nilai };
      }
      return next;
    });
  }, []);

  // ══════════════════════════════════════════════════════════
  //  PROFIL CRUD
  // ══════════════════════════════════════════════════════════
  const updateProfilValue = useCallback((kecamatan, field, nilai) => {
    setProfilKecamatan(prev => {
      if (!prev[kecamatan]) return prev;
      return { ...prev, [kecamatan]: { ...prev[kecamatan], [field]: nilai } };
    });
  }, []);

  const updateProfilIndikator = useCallback((kecamatan, subField, nilai) => {
    setProfilKecamatan(prev => {
      if (!prev[kecamatan]) return prev;
      return { ...prev, [kecamatan]: { ...prev[kecamatan], indikator: { ...prev[kecamatan].indikator, [subField]: nilai } } };
    });
  }, []);

  const updateProfilHistori = useCallback((kecamatan, histori) => {
    setProfilKecamatan(prev => {
      if (!prev[kecamatan]) return prev;
      return { ...prev, [kecamatan]: { ...prev[kecamatan], histori } };
    });
  }, []);

  // ══════════════════════════════════════════════════════════
  //  COMPUTED / DERIVED DATA
  // ══════════════════════════════════════════════════════════
  const getSummaryStats = useCallback(() => {
    const init = { jumlah_pindah: 0, jumlah_datang: 0, jumlah_kelahiran: 0, jumlah_kematian: 0 };
    ALL_PENDUDUK_FIELDS.forEach(f => { init[f] = 0; });
    const t = pendudukData.reduce((a, d) => {
      ALL_PENDUDUK_FIELDS.forEach(f => { a[f] += d[f] || 0; });
      return a;
    }, { ...init });
    const pindah = t.jumlah_pindah;
    const datang = t.jumlah_datang;
    const lahir = t.jumlah_kelahiran;
    const mati = t.jumlah_kematian;
    return { ...t, pindah, datang, lahir, mati, pertumbuhan: datang + lahir - pindah - mati, total: pendudukData.length || 0 };
  }, [pendudukData, ALL_PENDUDUK_FIELDS]);

  const getLatestData = useCallback((n = 6) => {
    return [...pendudukData]
      .sort((a, b) => b.tahun - a.tahun)
      .slice(0, n);
  }, [pendudukData]);

  const ALL_PENDUDUK_FIELDS = [
    "jumlah_pindah", "jumlah_datang", "jumlah_kelahiran", "jumlah_kematian",
    "jml_pria", "jml_perempuan",
    "umur_0_4", "umur_5_18", "umur_15_64", "umur_65_plus",
    "penduduk_tegal_selatan", "penduduk_tegal_timur", "penduduk_tegal_barat", "penduduk_margadana",
    "jml_miskin", "pendapatan_per_kapita", "jml_sekolah", "jml_faskes",
    "jml_pekerja_formal", "jml_pekerja_informal", "jml_penganggur",
    "jml_pendidikan_sd", "jml_pendidikan_smp", "jml_pendidikan_sma", "jml_pendidikan_pt",
  ];

  const getYearlyStats = useCallback(() => {
    const years = [...new Set(pendudukData.map(d => d.tahun))].sort();
    return years.map(y => {
      const rows = pendudukData.filter(d => d.tahun === y);
      const entry = { tahun: y, records: rows.length };
      ALL_PENDUDUK_FIELDS.forEach(f => { entry[f] = rows.reduce((s, d) => s + (d[f] || 0), 0); });
      entry.pindah = entry.jumlah_pindah;
      entry.datang = entry.jumlah_datang;
      entry.lahir = entry.jumlah_kelahiran;
      entry.mati = entry.jumlah_kematian;
      return entry;
    });
  }, [pendudukData, ALL_PENDUDUK_FIELDS]);

  const value = {
    // State
    pendudukData,
    periodeData,
    adminUsers,
    indikatorData,
    piramidaData,
    radarKecamatan,
    capaianData,
    profilKecamatan,
    // Penduduk CRUD
    addPenduduk,
    updatePenduduk,
    deletePenduduk,
    importPenduduk,
    clearAllPenduduk,
    // Periode CRUD
    addPeriode,
    updatePeriode,
    deletePeriode,
    // Admin CRUD
    addAdminUser,
    updateAdminUser,
    deleteAdminUser,
    // Indikator CRUD
    updateIndikatorValue,
    updateIndikatorMeta,
    // Piramida CRUD
    updatePiramidaValue,
    // Radar CRUD
    updateRadarValue,
    // Capaian CRUD
    updateCapaianValue,
    // Profil CRUD
    updateProfilValue,
    updateProfilIndikator,
    updateProfilHistori,
    // Computed
    getSummaryStats,
    getLatestData,
    getYearlyStats,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside <AppProvider>");
  return ctx;
}
