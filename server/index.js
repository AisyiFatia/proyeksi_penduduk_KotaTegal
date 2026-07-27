import express from "express";
import cors from "cors";
import { initDb, getPool } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

await initDb();
const pool = getPool();

app.get("/", (req, res) => res.json({
  name: "SIPENDUK API", version: "2.0", database: "MySQL",
  endpoints: ["/api/penduduk/primer", "/api/penduduk/sekunder", "/api/penduduk", "/api/periode", "/api/admin"],
}));

// ── Primer fields ──
const PRIMER_COLS = ["id_penduduk", "id_priode", "tahun", "jumlah_pindah", "jumlah_datang", "jumlah_kelahiran", "jumlah_kematian", "jumlah_penduduk"];

// ── Sekunder fields ──
const SEKUNDER_COLS = ["id_penduduk", "id_priode", "tahun",
  "jml_pria", "jml_perempuan",
  "umur_0_4", "umur_5_18", "umur_15_64", "umur_65_plus",
  "penduduk_tegal_selatan", "penduduk_tegal_timur", "penduduk_tegal_barat", "penduduk_margadana",
  "jml_miskin", "pendapatan_per_kapita", "jml_sekolah", "jml_faskes",
  "jml_pekerja_formal", "jml_pekerja_informal", "jml_penganggur",
  "jml_pendidikan_sd", "jml_pendidikan_smp", "jml_pendidikan_sma", "jml_pendidikan_pt",
];

function crudRoutes(prefix, cols, table) {
  const nonIdCols = cols.filter(c => c !== "id_penduduk");

  // GET list
  app.get(`${prefix}`, async (req, res) => {
    try { const [rows] = await pool.query(`SELECT ${cols.join(", ")} FROM ${table} ORDER BY tahun`); res.json(rows); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST create
  app.post(`${prefix}`, async (req, res) => {
    try {
      const placeholders = nonIdCols.map(() => "?").join(", ");
      const vals = nonIdCols.map(c => req.body[c] ?? 0);
      vals[1] = vals[1] || (req.body.tahun - 1995) || 1;
      const [result] = await pool.execute(`INSERT INTO ${table} (${nonIdCols.join(", ")}) VALUES (${placeholders})`, vals);
      res.status(201).json({ id_penduduk: result.insertId, ...req.body });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PUT update
  app.put(`${prefix}/:id`, async (req, res) => {
    try {
      const id = +req.params.id;
      const sets = []; const vals = [];
      for (const c of nonIdCols) {
        if (req.body[c] !== undefined) { sets.push(`${c} = ?`); vals.push(req.body[c]); }
      }
      if (sets.length === 0) return res.status(400).json({ error: "No fields" });
      vals.push(id);
      await pool.execute(`UPDATE ${table} SET ${sets.join(", ")} WHERE id_penduduk = ?`, vals);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE single
  app.delete(`${prefix}/:id`, async (req, res) => {
    try { await pool.execute(`DELETE FROM ${table} WHERE id_penduduk = ?`, [+req.params.id]); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST bulk
  app.post(`${prefix}/bulk`, async (req, res) => {
    try {
      const records = req.body;
      if (!Array.isArray(records) || records.length === 0) return res.status(400).json({ error: "Invalid data" });
      const ph = nonIdCols.map(() => "?").join(", ");
      let count = 0;
      for (const r of records) {
        const vals = nonIdCols.map(c => r[c] ?? 0);
        vals[1] = vals[1] || (r.tahun - 1995) || 1;
        await pool.execute(`INSERT INTO ${table} (${nonIdCols.join(", ")}) VALUES (${ph})`, vals);
        count++;
      }
      res.status(201).json({ success: true, count });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE all
  app.delete(`${prefix}`, async (req, res) => {
    try { await pool.execute(`DELETE FROM ${table}`); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });
}

// Register CRUD routes for both tables
crudRoutes("/api/penduduk/primer", PRIMER_COLS, "penduduk_primer");
crudRoutes("/api/penduduk/sekunder", SEKUNDER_COLS, "penduduk_sekunder");

// Merged endpoint: gabung primer + sekunder
app.get("/api/penduduk", async (req, res) => {
  try {
    const [primer] = await pool.query(`SELECT ${PRIMER_COLS.join(", ")} FROM penduduk_primer ORDER BY tahun`);
    const [sekunder] = await pool.query(`SELECT ${SEKUNDER_COLS.join(", ")} FROM penduduk_sekunder ORDER BY tahun`);
    const byId = {};
    primer.forEach(r => { byId[`p_${r.id_penduduk}`] = r; });
    sekunder.forEach(r => { byId[`s_${r.id_penduduk}`] = r; });
    res.json(Object.values(byId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Periode ──
app.get("/api/periode", async (req, res) => {
  try { const [rows] = await pool.query("SELECT * FROM periode ORDER BY id_priode"); res.json(rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/periode", async (req, res) => {
  try {
    const { nama_priode, keterangan, status } = req.body;
    const [maxRow] = await pool.query("SELECT COALESCE(MAX(id_priode), 0) + 1 AS next_id FROM periode");
    const id = maxRow[0].next_id;
    await pool.execute("INSERT INTO periode (id_priode, nama_priode, keterangan, status) VALUES (?, ?, ?, ?)", [id, nama_priode || `Periode ${id}`, keterangan || "", status || "aktif"]);
    res.status(201).json({ id_priode: id, nama_priode: nama_priode || `Periode ${id}`, keterangan: keterangan || "", status: status || "aktif" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/periode/:id", async (req, res) => {
  try { await pool.execute("DELETE FROM periode WHERE id_priode = ?", [+req.params.id]); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin Users ──
app.get("/api/admin", async (req, res) => {
  try { const [rows] = await pool.query("SELECT username, role, name FROM admin_users ORDER BY username"); res.json(rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query("SELECT username, role, name FROM admin_users WHERE username = ? AND password = ?", [username, password]);
    if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin", async (req, res) => {
  try {
    const { username, password, role, name, nama, level, nip, tempat_lahir, tanggal_lahir, pangkat, status_kepegawaian } = req.body;
    // Terima 'nama'/'level' (dari frontend) atau 'name'/'role' (legacy)
    const resolvedName = nama || name || username;
    const resolvedRole = level || role || "viewer";
    if (!username || !password) return res.status(400).json({ error: "Username dan password wajib diisi" });
    const [existing] = await pool.query("SELECT 1 FROM admin_users WHERE username = ?", [username]);
    if (existing.length > 0) return res.status(409).json({ error: "Username exists" });
    await pool.execute(
      "INSERT INTO admin_users (username, password, role, name) VALUES (?, ?, ?, ?)",
      [username, password, resolvedRole, resolvedName]
    );
    res.status(201).json({ username, role: resolvedRole, name: resolvedName });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/admin/:username", async (req, res) => {
  try {
    if (req.params.username === "admin") return res.status(403).json({ error: "Cannot delete admin" });
    await pool.execute("DELETE FROM admin_users WHERE username = ?", [req.params.username]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`SIPENDUK API v2 running on http://localhost:${PORT} (MySQL)`));
