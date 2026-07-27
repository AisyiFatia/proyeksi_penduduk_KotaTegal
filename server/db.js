import mysql from "mysql2/promise";

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "proyeksi_tegal",
  waitForConnections: true,
};

let pool = null;


const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS admin_users (
  username VARCHAR(50) PRIMARY KEY,
  password VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'viewer',
  name VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS periode (
  id_priode INT PRIMARY KEY,
  nama_priode VARCHAR(100),
  keterangan TEXT,
  status VARCHAR(20) DEFAULT 'aktif'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS penduduk_primer (
  id_penduduk INT AUTO_INCREMENT PRIMARY KEY,
  id_priode INT,
  tahun INT NOT NULL,
  jumlah_pindah INT DEFAULT 0,
  jumlah_datang INT DEFAULT 0,
  jumlah_kelahiran INT DEFAULT 0,
  jumlah_kematian INT DEFAULT 0,
  jumlah_penduduk INT DEFAULT 0,
  FOREIGN KEY (id_priode) REFERENCES periode(id_priode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS penduduk_sekunder (
  id_penduduk INT AUTO_INCREMENT PRIMARY KEY,
  id_priode INT,
  tahun INT NOT NULL,
  jml_pria INT DEFAULT 0,
  jml_perempuan INT DEFAULT 0,
  umur_0_4 INT DEFAULT 0,
  umur_5_18 INT DEFAULT 0,
  umur_15_64 INT DEFAULT 0,
  umur_65_plus INT DEFAULT 0,
  penduduk_tegal_selatan INT DEFAULT 0,
  penduduk_tegal_timur INT DEFAULT 0,
  penduduk_tegal_barat INT DEFAULT 0,
  penduduk_margadana INT DEFAULT 0,
  jml_miskin INT DEFAULT 0,
  pendapatan_per_kapita DECIMAL(15,2) DEFAULT 0,
  jml_sekolah INT DEFAULT 0,
  jml_faskes INT DEFAULT 0,
  jml_pekerja_formal INT DEFAULT 0,
  jml_pekerja_informal INT DEFAULT 0,
  jml_penganggur INT DEFAULT 0,
  jml_pendidikan_sd INT DEFAULT 0,
  jml_pendidikan_smp INT DEFAULT 0,
  jml_pendidikan_sma INT DEFAULT 0,
  jml_pendidikan_pt INT DEFAULT 0,
  FOREIGN KEY (id_priode) REFERENCES periode(id_priode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const SEED_ADMINS = [
  ["admin", "admin123", "admin", "Admin Utama"],
  ["analis", "analis123", "analis", "Petugas Analis"],
  ["tegal", "tegal2025", "viewer", "User Tegal"],
];

function seedPeriodeData() {
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
  return Array.from({ length: 30 }, (_, i) => {
    const t = 1996 + i;
    return [t - 1995, t.toString(), ctx[t] || "Periode reguler", "aktif"];
  });
}

export async function initDb() {
  const tmpConn = await mysql.createConnection({
    host: DB_CONFIG.host, port: DB_CONFIG.port,
    user: DB_CONFIG.user, password: DB_CONFIG.password,
  });
  await tmpConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await tmpConn.end();

  pool = mysql.createPool(DB_CONFIG);

  const stmts = SCHEMA_SQL.split(";").filter(s => s.trim());
  for (const stmt of stmts) {
    await pool.query(stmt + ";");
  }

  const [adminRows] = await pool.query("SELECT COUNT(*) AS c FROM admin_users");
  if (adminRows[0].c === 0) {
    for (const u of SEED_ADMINS) {
      await pool.execute("INSERT INTO admin_users (username, password, role, name) VALUES (?, ?, ?, ?)", u);
    }
  }

  const [periodeRows] = await pool.query("SELECT COUNT(*) AS c FROM periode");
  if (periodeRows[0].c === 0) {
    const data = seedPeriodeData();
    for (const r of data) {
      await pool.execute("INSERT INTO periode (id_priode, nama_priode, keterangan, status) VALUES (?, ?, ?, ?)", r);
    }
  }

  // Pastikan kolom baru ada (untuk upgrade tabel existing)
  try { await pool.query("ALTER TABLE penduduk_primer ADD COLUMN jumlah_penduduk INT DEFAULT 0"); } catch (_) {}

  console.log(`MySQL database "${DB_CONFIG.database}" ready`);
}

export function getPool() { return pool; }
