// ══════════════════════════════════════════════════════════════
//  ADMINDASHBOARD.JSX — Panel Admin SIPENDUK
//  Berisi: sidebar navigasi, dashboard admin, CRUD data
//  penduduk, prediksi KNN, grafik, manajemen periode/
//  indikator/piramida/radar/capaian/profil/admin, dan
//  laporan.
// ══════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { useAppContext } from "./AppContext.jsx";
import { indikatorData } from "./data.js";
import { ADMIN as A } from "./theme.js";

const ZEN_BASE = import.meta.env.DEV ? "/zen" : "https://opencode.ai/zen/v1";
const ZEN_MODEL = "deepseek-v4-flash-free";
const AI_REKOM_KEY = "sipenduk_rekomendasi_v4";

// Alias warna untuk kompatibilitas kode lama
const P = A.P, PL = A.PL, PD = A.PD, S = A.S, NA = A.NA;
const BG = A.BG, W = A.W, T = A.T, M = A.M;
const SUC = A.SUC, WRN = A.WRN, DNG = A.DNG, BDR = A.BDR;

// ══════════════════════════════════════════════════════════════
//  TIME-SERIES KNN + TREND EXTRAPOLATION
//  Menggunakan lagged feature vectors + weighted distance +
//  linear regression trend untuk prediksi yang lebih akurat.
// ══════════════════════════════════════════════════════════════
function estimateTrend(series) {
  const n = series.length;
  if (n < 2) return series[n - 1] || 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += series[i];
    sumXY += i * series[i]; sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX || 1;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return slope * n + intercept;
}

function smartRound(val, series) {
  const avgAbs = series.reduce((s, v) => s + Math.abs(v), 0) / Math.max(series.length, 1);
  if (avgAbs < 100) return parseFloat(val.toFixed(2));
  if (avgAbs < 1000) return Math.round(val * 100) / 100;
  return Math.round(val);
}

function knnPredict(series, k = 10) {
  if (series.length < 2) return smartRound(series[series.length - 1] || 0, series);
  if (series.length < 4) {
    const diff = (series[series.length - 1] - series[0]) / (series.length - 1);
    return smartRound(series[series.length - 1] + diff, series);
  }

  const lag = Math.min(3, Math.max(1, Math.floor((series.length - 1) / 2)));
  k = Math.min(k, Math.max(1, series.length - lag));

  const candidates = [];
  for (let i = lag; i < series.length; i++) {
    candidates.push({
      features: series.slice(i - lag, i),
      next: series[i],
    });
  }

  const query = series.slice(series.length - lag);
  const range = Math.max(...query) - Math.min(...query) || 1;

  candidates.forEach(c => {
    let dist = 0;
    for (let j = 0; j < lag; j++) {
      dist += ((c.features[j] - query[j]) / range) ** 2;
    }
    c.dist = Math.sqrt(dist / lag);
  });

  candidates.sort((a, b) => a.dist - b.dist);
  const neighbors = candidates.slice(0, k);

  const eps = 1e-10;
  const totalWeight = neighbors.reduce((s, c) => s + 1 / (c.dist + eps), 0);
  const weightedSum = neighbors.reduce((s, c) => s + c.next / (c.dist + eps), 0);

  const knnVal = totalWeight > 0 ? weightedSum / totalWeight : neighbors[0]?.next || 0;

  const trendVal = estimateTrend(series);
  const alpha = Math.max(0.15, Math.min(0.5, 1 - k / series.length));

  return smartRound((1 - alpha) * knnVal + alpha * trendVal, series);
}

// ══════════════════════════════════════════════════════════════
//  TOAST NOTIFICATION
// ══════════════════════════════════════════════════════════════
function Toast({ toasts, removeToast }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => {
        const colors = {
          success: { bg: "#DCFCE7", border: SUC, text: "#15803D", icon: "✅" },
          error: { bg: "#FEE2E2", border: DNG, text: "#B91C1C", icon: "❌" },
          warning: { bg: "#FEF3C7", border: WRN, text: "#B45309", icon: "⚠️" },
          info: { bg: "#DBEAFE", border: "#2563EB", text: "#1D4ED8", icon: "ℹ️" },
        };
        const c = colors[t.type] || colors.info;
        return (
          <div key={t.id} style={{
            background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 10,
            padding: "0.75rem 1rem", minWidth: 280, maxWidth: 360,
            display: "flex", alignItems: "center", gap: "0.75rem",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            animation: "slideInRight 0.3s ease",
          }}>
            <span style={{ fontSize: "1.2rem" }}>{c.icon}</span>
            <span style={{ flex: 1, fontSize: "0.85rem", color: c.text, fontWeight: 600 }}>{t.msg}</span>
            <button onClick={() => removeToast(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: c.text, fontSize: "1.1rem" }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

// ══════════════════════════════════════════════════════════════
//  CONFIRM MODAL
// ══════════════════════════════════════════════════════════════
function ConfirmModal({ show, onConfirm, onCancel, msg, icon = "🗑️", title = "Konfirmasi Hapus", confirmText = "🗑️ Ya, Hapus", danger = true }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: W, borderRadius: 14, width: "100%", maxWidth: 400, boxShadow: "0 16px 48px rgba(0,0,0,0.22)", overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.5rem" }}>{icon}</span>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: W, fontSize: "1rem" }}>{title}</div>
        </div>
        <div style={{ padding: "1.5rem" }}>
          <p style={{ color: T, fontSize: "0.88rem", marginBottom: "0.5rem" }}>{msg}</p>
          {danger && <p style={{ color: M, fontSize: "0.78rem" }}>Tindakan ini tidak dapat dibatalkan.</p>}
        </div>
        <div style={{ padding: "0 1.5rem 1.5rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 8, color: M, fontWeight: 600, fontSize: "0.85rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}>Batal</button>
          <button onClick={onConfirm} style={{ background: danger ? `linear-gradient(135deg, ${DNG}, #B91C1C)` : `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.85rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════════════════════════
const MENU = [
  { id: "dashboard", icon: "🏠", label: "Dashboard" },
  { id: "penduduk-header", icon: "👥", label: "Data Penduduk", header: true },
  { id: "daftar-penduduk", icon: "📋", label: "Daftar Data", indent: true },
  { id: "tambah-penduduk", icon: "➕", label: "Tambah Data", indent: true },
  { id: "prediksi-knn", icon: "🔮", label: "Prediksi KNN", indent: true },
  { id: "grafik", icon: "📈", label: "Grafik Penduduk", indent: true },
  { id: "periode-header", icon: "📅", label: "Data Periode", header: true },
  { id: "daftar-periode", icon: "📋", label: "Daftar Periode", indent: true },
  { id: "admin-header", icon: "👤", label: "Data Admin", header: true },
  { id: "daftar-admin", icon: "📋", label: "Daftar Admin", indent: true },
  { id: "profil-admin", icon: "👤", label: "Profil Saya", indent: true },
  { id: "laporan", icon: "📊", label: "Laporan & Export" },
  { id: "sipenduk-view", icon: "🌐", label: "Lihat SIPENDUK User" },
];

function Sidebar({ active, onNav, user, collapsed, onViewSipenduk }) {
  return (
    <div style={{
      width: collapsed ? 0 : 260, minWidth: collapsed ? 0 : 260,
      height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 500,
      background: `linear-gradient(180deg, ${PD} 0%, ${P} 40%, ${PL} 100%)`,
      display: "flex", flexDirection: "column",
      overflow: "hidden", transition: "width 0.3s ease, min-width 0.3s ease",
      boxShadow: "4px 0 20px rgba(13,148,136,0.25)",
    }}>
      {/* Logo */}
      <div style={{ padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.875rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(45,212,191,0.25)", border: `2px solid ${S}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>🏛️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, color: S, fontSize: "0.82rem", letterSpacing: "0.05em" }}>SIPROYEKSI</div>
            <div style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Kota Tegal — Dukcapil</div>
          </div>
        </div>
        {user && (
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "0.625rem 0.75rem", display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${S}, #5EEAD4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem", fontWeight: 800, color: PD, flexShrink: 0 }}>{user.name?.charAt(0) || "A"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: W, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
              <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.6)" }}>{user.role}</div>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0.75rem 0.625rem", scrollbarWidth: "none" }}>
        {MENU.map(item => {
          if (item.header) return (
            <div key={item.id} style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0.875rem 0.75rem 0.375rem" }}>
              {item.icon} {item.label}
            </div>
          );
          const isActive = active === item.id;
          const isSipenduk = item.id === "sipenduk-view";
          return (
            <button key={item.id} onClick={() => item.id === "sipenduk-view" ? onViewSipenduk() : onNav(item.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "0.625rem",
                padding: item.indent ? "0.55rem 0.75rem 0.55rem 1.75rem" : "0.6rem 0.75rem",
                background: isActive ? "rgba(45,212,191,0.25)" : isSipenduk ? "rgba(45,212,191,0.15)" : "transparent",
                border: isActive ? `1px solid ${S}40` : "1px solid transparent",
                borderLeft: isActive ? `3px solid ${S}` : isSipenduk ? "3px solid #2DD4BF" : "3px solid transparent",
                borderRadius: 8, cursor: "pointer", marginBottom: "0.125rem",
                color: isActive ? S : isSipenduk ? "#2DD4BF" : "rgba(255,255,255,0.8)",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: item.indent ? "0.8rem" : "0.85rem",
                fontWeight: isActive || isSipenduk ? 700 : 500, textAlign: "left", transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: item.indent ? "0.9rem" : "1rem" }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "0.75rem 0" }} />
        <div style={{ padding: "0 0.625rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>SIPROYEKSI v1.0 © 2025</div>
          <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.25)", marginTop: "0.2rem" }}>Data disimpan di browser (localStorage)</div>
        </div>
      </nav>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TOPBAR
// ══════════════════════════════════════════════════════════════
const BREADCRUMBS = {
  "dashboard": ["Dashboard"],
  "daftar-penduduk": ["Dashboard", "Data Penduduk", "Daftar"],
  "tambah-penduduk": ["Dashboard", "Data Penduduk", "Tambah"],
  "prediksi-knn": ["Dashboard", "Data Penduduk", "Prediksi KNN"],
  "grafik": ["Dashboard", "Data Penduduk", "Grafik"],
  "daftar-periode": ["Dashboard", "Data Periode", "Daftar"],
  "daftar-admin": ["Dashboard", "Data Admin", "Daftar"],
  "profil-admin": ["Dashboard", "Data Admin", "Profil Saya"],
  "laporan": ["Dashboard", "Laporan & Export"],
};

function Topbar({ page, onToggleSidebar, onLogout, onViewSipenduk, user }) {
  const bc = BREADCRUMBS[page] || ["Dashboard"];
  return (
    <div style={{
      height: 56, background: W, borderBottom: `2px solid ${BDR}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      display: "flex", alignItems: "center", padding: "0 1.5rem", gap: "1rem",
      position: "sticky", top: 0, zIndex: 400,
    }}>
      <button onClick={onToggleSidebar} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", color: M, borderRadius: 6, padding: "0.25rem" }}>☰</button>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8rem", color: M }}>
        {bc.map((b, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            {i > 0 && <span style={{ color: BDR }}>›</span>}
            <span style={{ color: i === bc.length - 1 ? P : M, fontWeight: i === bc.length - 1 ? 700 : 500 }}>{b}</span>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {/* Live badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "#DCFCE7", border: "1px solid #16A34A", borderRadius: 20, padding: "0.25rem 0.75rem", fontSize: "0.68rem", fontWeight: 700, color: "#15803D" }}>
          <span style={{ width: 6, height: 6, background: "#16A34A", borderRadius: "50%", display: "inline-block", animation: "pulse 1.5s ease-in-out infinite" }} />
          Live — Tersinkron
        </div>
        <button onClick={onViewSipenduk} style={{
          background: "linear-gradient(135deg, #0D9488, #14B8A6)", border: "none", borderRadius: 8,
          color: W, fontWeight: 700, fontSize: "0.78rem", padding: "0.45rem 1rem", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "0.375rem",
        }}>🌐 SIPENDUK User</button>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${P}, ${PL})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: W }}>{user?.name?.charAt(0) || "A"}</div>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: T }}>{user?.name || "Admin"}</div>
            <div style={{ fontSize: "0.62rem", color: M }}>{user?.role}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ background: `${DNG}15`, border: `1px solid ${DNG}40`, borderRadius: 8, color: DNG, fontWeight: 700, fontSize: "0.75rem", padding: "0.375rem 0.75rem", cursor: "pointer" }}>🚪 Keluar</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  STAT CARD
// ══════════════════════════════════════════════════════════════
function StatCard({ icon, label, value, sub, color, trend }) {
  return (
    <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.25rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", position: "relative", overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)"; }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
        <div style={{ width: 46, height: 46, borderRadius: 10, background: `${color}15`, border: `1.5px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>{label}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1.5rem", fontWeight: 700, color: T, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: "0.68rem", color: M, marginTop: "0.2rem" }}>{sub}</div>}
        </div>
        {trend && <span style={{ fontSize: "0.75rem", fontWeight: 700, color: trend.startsWith("+") ? SUC : DNG }}>{trend}</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD PAGE
// ══════════════════════════════════════════════════════════════
function DashboardPage({ onNav }) {
  const { pendudukData, periodeData, adminUsers, getSummaryStats, getYearlyStats } = useAppContext();
  const stats = getSummaryStats();
  const yearly = getYearlyStats();

  const pieData = [
    { name: "Pindah", value: stats.pindah, color: DNG },
    { name: "Datang", value: stats.datang, color: SUC },
    { name: "Kelahiran", value: stats.lahir, color: "#2563EB" },
    { name: "Kematian", value: stats.mati, color: WRN },
  ];

  const recent = [...pendudukData].sort((a, b) => b.tahun - a.tahun).slice(0, 8);

  const TT = ({ active, payload, label }) => !active || !payload?.length ? null : (
    <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.78rem", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <p style={{ fontWeight: 700, color: P, marginBottom: "0.25rem" }}>Tahun {label}</p>
      {payload.map((e, i) => <p key={i} style={{ color: e.fill, margin: "0.1rem 0" }}>{e.name}: <strong>{e.value?.toLocaleString("id-ID")}</strong></p>)}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.5rem", fontWeight: 800, color: T, marginBottom: "0.25rem" }}>Dashboard</h1>
          <p style={{ fontSize: "0.85rem", color: M }}>Sistem Informasi Proyeksi Penduduk Kota Tegal — Disdukcapil</p>
        </div>
        {/* Sync status */}
        <div style={{ background: "#DCFCE7", border: "1.5px solid #16A34A", borderRadius: 10, padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", fontWeight: 700, color: "#15803D" }}>
          ✅ Data tersinkron ke tampilan SIPENDUK User
        </div>
      </div>

      {/* Stats Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1rem" }}>
        <StatCard icon="📊" label="Total Record Data" value={stats.total.toLocaleString()} sub="Data bulanan aktif" color={P} />
        <StatCard icon="🚶" label="Total Pindah" value={stats.pindah.toLocaleString("id-ID")} sub="Semua periode" color={DNG} trend="-3%" />
        <StatCard icon="🏠" label="Total Datang" value={stats.datang.toLocaleString("id-ID")} sub="Semua periode" color={SUC} trend="+5%" />
        <StatCard icon="⚖️" label="Pertumbuhan Bersih" value={(stats.pertumbuhan > 0 ? "+" : "") + stats.pertumbuhan.toLocaleString("id-ID")} sub="Datang+Lahir−Pindah−Mati" color={S} />
      </div>

      {/* Stats Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard icon="👶" label="Total Kelahiran" value={stats.lahir.toLocaleString("id-ID")} sub="Semua periode" color="#2563EB" />
        <StatCard icon="🕊️" label="Total Kematian" value={stats.mati.toLocaleString("id-ID")} sub="Semua periode" color={WRN} />
        <StatCard icon="📅" label="Periode Terdaftar" value={periodeData.length} sub="Data periode aktif" color={NA} />
        <StatCard icon="👤" label="Jumlah Admin" value={adminUsers.length} sub="Akun terdaftar" color={P} />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: T, fontSize: "0.95rem", marginBottom: "1.25rem" }}>📈 Tren Kependudukan Per Tahun (Data Admin)</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={yearly.map(y => ({ tahun: y.tahun.toString(), Pindah: y.pindah, Datang: y.datang, Kelahiran: y.lahir, Kematian: y.mati }))} key={`dash-bar-${yearly.length}`} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6FFFA" />
              <XAxis dataKey="tahun" tick={{ fill: M, fontSize: 11 }} />
              <YAxis tick={{ fill: M, fontSize: 10 }} />
              <Tooltip content={<TT />} cursor={{ fill: "#00000006" }} />
              <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
              <Bar dataKey="Pindah" fill={DNG} radius={[3, 3, 0, 0]} isAnimationActive={true} animationDuration={600} />
              <Bar dataKey="Datang" fill={SUC} radius={[3, 3, 0, 0]} isAnimationActive={true} animationDuration={600} />
              <Bar dataKey="Kelahiran" fill="#2563EB" radius={[3, 3, 0, 0]} isAnimationActive={true} animationDuration={600} />
              <Bar dataKey="Kematian" fill={WRN} radius={[3, 3, 0, 0]} isAnimationActive={true} animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: T, fontSize: "0.95rem", marginBottom: "1rem" }}>🍩 Distribusi Komponen</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10} isAnimationActive={true} animationDuration={800} animationBegin={200}>
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v) => v.toLocaleString("id-ID")} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {pieData.map(p => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                <span style={{ color: M, flex: 1 }}>{p.name}</span>
                <span style={{ fontWeight: 700, color: T }}>{p.value.toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Table */}
      <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden", marginBottom: "1.25rem" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${BDR}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: T, fontSize: "0.95rem" }}>📋 Data Penduduk Terbaru</div>
          <button onClick={() => onNav("daftar-penduduk")} style={{ background: BG, border: `1px solid ${BDR}`, borderRadius: 8, color: P, fontWeight: 700, fontSize: "0.78rem", padding: "0.375rem 0.875rem", cursor: "pointer" }}>Lihat Semua →</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead><tr style={{ background: `${P}10` }}>
              {["No", "Tahun", "Pindah", "Datang", "Kelahiran", "Kematian"].map(h => (
                <th key={h} style={{ padding: "0.625rem 0.875rem", textAlign: "left", fontWeight: 700, color: P, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{recent.map((d, i) => (
              <tr key={d.id_penduduk} style={{ background: i % 2 === 0 ? W : BG }}>
                <td style={{ padding: "0.55rem 0.875rem", color: M }}>{i + 1}</td>
                <td style={{ padding: "0.55rem 0.875rem", fontWeight: 700, color: T }}>{d.tahun}</td>
                <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", color: DNG, fontWeight: 600 }}>{d.jumlah_pindah.toLocaleString()}</td>
                <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", color: SUC, fontWeight: 600 }}>{d.jumlah_datang.toLocaleString()}</td>
                <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", color: "#2563EB", fontWeight: 600 }}>{d.jumlah_kelahiran.toLocaleString()}</td>
                <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", color: WRN, fontWeight: 600 }}>{d.jumlah_kematian.toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* Info Banner */}
      <div style={{ background: `${NA}10`, border: `1.5px solid ${NA}40`, borderLeft: `4px solid ${NA}`, borderRadius: 10, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{ fontSize: "1.5rem" }}>🔮</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: NA, fontSize: "0.88rem", marginBottom: "0.2rem" }}>Prediksi Penduduk — K-Nearest Neighbor (k=10)</div>
          <div style={{ fontSize: "0.78rem", color: M }}>Prediksi 5 tahun ke depan (2025–2029) berdasarkan {pendudukData.length} record data historis yang tersimpan</div>
        </div>
        <button onClick={() => onNav("prediksi-knn")} style={{ background: `linear-gradient(135deg, ${NA}, ${NA}BB)`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.8rem", padding: "0.6rem 1.25rem", cursor: "pointer", whiteSpace: "nowrap" }}>Lihat Prediksi</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  DATA PENDUDUK — DAFTAR & FORM
// ══════════════════════════════════════════════════════════════
const emptyForm = { id_priode: 1, tahun: 2024, jumlah_pindah: "", jumlah_datang: "", jumlah_kelahiran: "", jumlah_kematian: "" };



function ImportModalUI({ showImport, setShowImport, importRaw, setImportRaw, importPreview, setImportPreview, addToast, importPenduduk, BDR, W, BG, DNG, SUC, WRN, M, T, P }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={e => { if (e.target === e.currentTarget) setShowImport(false); }}>
      <div style={{ background: W, borderRadius: 14, width: "100%", maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.22)", overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(135deg, #7C3AED, #A855F7)`, padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.3rem" }}>📤</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: W, fontSize: "1rem" }}>Import Data Penduduk</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.8)", marginTop: "0.15rem" }}>CSV / tab-separated — kolom: tahun, jumlah_pindah, jumlah_datang, jumlah_kelahiran, jumlah_kematian</div>
          </div>
          <button onClick={() => setShowImport(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, color: W, fontSize: "1.1rem", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "1.25rem 1.5rem", overflow: "auto", flex: 1 }}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: P, textTransform: "uppercase", marginBottom: "0.375rem" }}>Upload File CSV</label>
            <input type="file" accept=".csv,.tsv,.txt" onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                const text = ev.target?.result;
                if (typeof text === "string") setImportRaw(text);
              };
              reader.readAsText(file);
            }} style={{ fontSize: "0.82rem", color: T }} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: P, textTransform: "uppercase", marginBottom: "0.375rem" }}>Atau Tempel Data</label>
            <textarea value={importRaw} onChange={e => setImportRaw(e.target.value)} rows={6} placeholder={`tahun\tjumlah_pindah\tjumlah_datang\tjumlah_kelahiran\tjumlah_kematian\n2020\t215\t195\t412\t182\n2021\t210\t190\t408\t180`}
              style={{ width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${BDR}`, borderRadius: 8, fontSize: "0.8rem", fontFamily: "'JetBrains Mono',monospace", color: T, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>
          <button onClick={() => {
            if (!importRaw.trim()) { addToast("Masukkan data terlebih dahulu!", "error"); return; }
            let lines = importRaw.trim().split("\n").filter(l => l.trim());
            const isHeader = l => /^[\w\s]+$/.test(l.split("\t")[0]?.trim()) && isNaN(parseInt(l.split("\t")[0]));
            if (lines.length > 0 && isHeader(lines[0])) lines = lines.slice(1);
            const parsed = [];
            const errors = [];
            lines.forEach((line, i) => {
              let parts = line.split("\t").length > 1 ? line.split("\t") : line.split(",");
              parts = parts.map(p => p.replace(/["\r]/g, "").trim());
              const nums = parts.filter(p => p !== "").slice(-5).map(p => parseInt(p));
              if (nums.length < 4 || nums.some(n => isNaN(n))) { errors.push(`Baris ${i + 1}: data tidak valid`); return; }
              const [tahun, pindah, datang, lahir, mati] = nums.length === 5 ? nums : [nums[0], nums[1], nums[2], nums[3], 0];
              if (isNaN(tahun) || tahun < 1996) { errors.push(`Baris ${i + 1}: tahun tidak valid`); return; }
              if (isNaN(pindah) || isNaN(datang) || isNaN(lahir) || isNaN(mati)) { errors.push(`Baris ${i + 1}: nilai numerik tidak valid`); return; }
              parsed.push({ tahun, jumlah_pindah: pindah, jumlah_datang: datang, jumlah_kelahiran: lahir, jumlah_kematian: mati });
            });
            if (errors.length) {
              addToast(`⚠️ ${errors.length} error:\n${errors.slice(0, 5).join("\n")}`, "error");
            }
            setImportPreview(parsed);
          }} style={{ background: `linear-gradient(135deg, #7C3AED, #A855F7)`, border: "none", borderRadius: 7, color: W, fontWeight: 700, fontSize: "0.82rem", padding: "0.55rem 1.25rem", cursor: "pointer" }}>
            🔍 Pratinjau
          </button>
          {importPreview.length > 0 && (
            <div style={{ marginTop: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.625rem" }}>
                <span style={{ fontWeight: 700, color: T, fontSize: "0.88rem" }}>📋 Pratinjau: <strong style={{ color: "#7C3AED" }}>{importPreview.length}</strong> record</span>
                <button onClick={() => {
                  importPenduduk(importPreview);
                  addToast(`✅ ${importPreview.length} data penduduk berhasil diimport!`, "success");
                  setShowImport(false);
                  setImportPreview([]);
                  setImportRaw("");
                }} style={{ background: `linear-gradient(135deg, #7C3AED, #A855F7)`, border: "none", borderRadius: 7, color: W, fontWeight: 700, fontSize: "0.85rem", padding: "0.6rem 1.5rem", cursor: "pointer", boxShadow: "0 3px 12px #7C3AED44" }}>
                  💾 Import {importPreview.length} Data
                </button>
              </div>
              <div style={{ maxHeight: 240, overflow: "auto", border: `1px solid ${BDR}`, borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                  <thead><tr style={{ background: "#7C3AED15", position: "sticky", top: 0 }}>
                    <th style={{ padding: "0.4rem 0.625rem", textAlign: "left", fontWeight: 700, color: "#7C3AED" }}>#</th>
                    <th style={{ padding: "0.4rem 0.625rem", textAlign: "left", fontWeight: 700, color: "#7C3AED" }}>Tahun</th>
                    <th style={{ padding: "0.4rem 0.625rem", textAlign: "right", fontWeight: 700, color: "#7C3AED" }}>Pindah</th>
                    <th style={{ padding: "0.4rem 0.625rem", textAlign: "right", fontWeight: 700, color: "#7C3AED" }}>Datang</th>
                    <th style={{ padding: "0.4rem 0.625rem", textAlign: "right", fontWeight: 700, color: "#7C3AED" }}>Lahir</th>
                    <th style={{ padding: "0.4rem 0.625rem", textAlign: "right", fontWeight: 700, color: "#7C3AED" }}>Mati</th>
                  </tr></thead>
                  <tbody>
                    {importPreview.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? W : BG }}>
                        <td style={{ padding: "0.3rem 0.625rem", color: M }}>{i + 1}</td>
                        <td style={{ padding: "0.3rem 0.625rem", fontWeight: 700, color: T }}>{r.tahun}</td>
                        <td style={{ padding: "0.3rem 0.625rem", textAlign: "right", fontFamily: "monospace", color: DNG }}>{r.jumlah_pindah.toLocaleString()}</td>
                        <td style={{ padding: "0.3rem 0.625rem", textAlign: "right", fontFamily: "monospace", color: SUC }}>{r.jumlah_datang.toLocaleString()}</td>
                        <td style={{ padding: "0.3rem 0.625rem", textAlign: "right", fontFamily: "monospace", color: "#2563EB" }}>{r.jumlah_kelahiran.toLocaleString()}</td>
                        <td style={{ padding: "0.3rem 0.625rem", textAlign: "right", fontFamily: "monospace", color: WRN }}>{r.jumlah_kematian.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DataPendudukPage({ showForm, addToast, onNav }) {
  const { pendudukData, periodeData, addPenduduk, updatePenduduk, deletePenduduk, importPenduduk, clearAllPenduduk } = useAppContext();
  const [search, setSearch] = useState("");
  const [filterCol, setFilterCol] = useState("tahun");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [editId, setEditId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importRaw, setImportRaw] = useState("");
  const [importPreview, setImportPreview] = useState([]);
  const [clearConfirm, setClearConfirm] = useState(false);
  const PER_PAGE = 10;

  const filtered = pendudukData.filter(d => {
    const val = d[filterCol]?.toString() || "";
    return val.toLowerCase().includes(search.toLowerCase());
  });
  const pages = Math.ceil(filtered.length / PER_PAGE);
  const pageData = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openAdd = () => { setEditId(null); setForm(emptyForm); setFormErrors({}); onNav("tambah-penduduk"); };
  const openEdit = (d) => { setEditId(d.id_penduduk); setForm({ ...d }); setFormErrors({}); onNav("tambah-penduduk"); };

  const validate = () => {
    const e = {};
    if (!form.id_priode) e.id_priode = "Pilih periode";
    if (!form.tahun || form.tahun < 1996) e.tahun = "Tahun tidak valid";
    ["jumlah_pindah", "jumlah_datang", "jumlah_kelahiran", "jumlah_kematian"].forEach(f => {
      if (form[f] === "" || +form[f] < 0) e[f] = "Wajib diisi (≥ 0)";
    });
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setFormErrors(e); return; }
    const row = { ...form, jumlah_pindah: +form.jumlah_pindah, jumlah_datang: +form.jumlah_datang, jumlah_kelahiran: +form.jumlah_kelahiran, jumlah_kematian: +form.jumlah_kematian };
    if (editId) {
      updatePenduduk(editId, row);
      addToast("✅ Data diperbarui & tersinkron ke SIPENDUK User!", "success");
    } else {
      addPenduduk(row);
      addToast("✅ Data ditambahkan & tersinkron ke SIPENDUK User!", "success");
    }
    onNav("daftar-penduduk");
  };

  const doDelete = () => {
    deletePenduduk(deleteId);
    setDeleteId(null);
    addToast("Data berhasil dihapus!", "success");
  };

  const inp = (key, label, type = "number", opts = {}) => {
    const err = formErrors[key];
    return (
      <div style={{ marginBottom: "0.875rem" }}>
        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: P, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.375rem" }}>
          {label} <span style={{ color: DNG }}>*</span>
        </label>
        {type === "select" ? (
          <select value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: +e.target.value }))}
            style={{ width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${err ? DNG : BDR}`, borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: "0.85rem", color: T, background: W, outline: "none" }}>
            {opts.options?.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        ) : (
          <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} min={opts.min ?? 0}
            style={{ width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${err ? DNG : BDR}`, borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: "0.85rem", color: T, outline: "none", boxSizing: "border-box" }} />
        )}
        {err && <div style={{ fontSize: "0.72rem", color: DNG, marginTop: "0.25rem" }}>⚠ {err}</div>}
      </div>
    );
  };

  // FORM VIEW
  if (showForm) return (
    <div>
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button onClick={() => onNav("daftar-penduduk")} style={{ background: BG, border: `1px solid ${BDR}`, borderRadius: 8, color: M, padding: "0.5rem 0.875rem", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>← Kembali</button>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T, flex: 1 }}>
          {editId ? "✏️ Edit Data Penduduk" : "➕ Tambah Data Penduduk"}
        </h1>
        <button onClick={() => { setShowImport(true); setImportRaw(""); setImportPreview([]); }} style={{ background: `linear-gradient(135deg, #7C3AED, #A855F7)`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.82rem", padding: "0.6rem 1rem", cursor: "pointer" }}>📤 Import CSV</button>
      </div>
      {/* Sync notice */}
      <div style={{ background: "#DBEAFE", border: "1.5px solid #2563EB", borderRadius: 8, padding: "0.625rem 1rem", marginBottom: "1rem", fontSize: "0.78rem", color: "#1D4ED8", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
        ℹ️ Data yang disimpan akan <strong>otomatis tersinkron</strong> ke tampilan SIPENDUK User secara real-time
      </div>
      <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "2rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <div>
            {inp("id_priode", "ID Periode", "select", { options: periodeData.map(p => ({ val: p.id_priode, label: p.nama_priode })) })}
            {inp("tahun", "Tahun", "number", { min: 1996 })}
          </div>
          <div>
            {inp("jumlah_pindah", "Jumlah Pindah")}
            {inp("jumlah_datang", "Jumlah Datang")}
            {inp("jumlah_kelahiran", "Jumlah Kelahiran")}
            {inp("jumlah_kematian", "Jumlah Kematian")}
          </div>
        </div>
        <hr style={{ border: "none", borderTop: `1px solid ${BDR}`, margin: "1.25rem 0" }} />
        <div style={{ display: "flex", gap: "0.875rem" }}>
          <button onClick={handleSubmit} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.88rem", padding: "0.75rem 2rem", cursor: "pointer", boxShadow: `0 3px 12px ${P}44` }}>💾 Simpan & Sinkron</button>
          <button onClick={() => onNav("daftar-penduduk")} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 8, color: M, fontWeight: 600, fontSize: "0.88rem", padding: "0.75rem 1.5rem", cursor: "pointer" }}>↩ Batal</button>
        </div>
      </div>

      {/* Import Modal juga tampil di form view */}
      {showImport && (
        <ImportModalUI
          showImport={showImport}
          setShowImport={setShowImport}
          importRaw={importRaw}
          setImportRaw={setImportRaw}
          importPreview={importPreview}
          setImportPreview={setImportPreview}
          addToast={addToast}
          importPenduduk={importPenduduk}
          BDR={BDR} W={W} BG={BG} DNG={DNG} SUC={SUC} WRN={WRN} M={M} T={T} P={P}
        />
      )}
    </div>
  );

  // DETAIL VIEW
  if (detailId !== null) {
    const d = pendudukData.find(x => x.id_penduduk === detailId);
    const avg = field => Math.round(pendudukData.reduce((s, r) => s + r[field], 0) / pendudukData.length);
    if (!d) return null;
    return (
      <div>
        <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => setDetailId(null)} style={{ background: BG, border: `1px solid ${BDR}`, borderRadius: 8, color: M, padding: "0.5rem 0.875rem", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>← Kembali</button>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T }}>👁️ Detail Data #{d.id_penduduk}</h1>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {[
            { label: "Tahun", val: d.tahun },
            { label: "Periode", val: periodeData.find(p => p.id_priode === d.id_priode)?.nama_priode || "-" },
            { label: "Jumlah Pindah", val: d.jumlah_pindah.toLocaleString(), f: "jumlah_pindah", c: DNG },
            { label: "Jumlah Datang", val: d.jumlah_datang.toLocaleString(), f: "jumlah_datang", c: SUC },
            { label: "Jumlah Kelahiran", val: d.jumlah_kelahiran.toLocaleString(), f: "jumlah_kelahiran", c: "#2563EB" },
            { label: "Jumlah Kematian", val: d.jumlah_kematian.toLocaleString(), f: "jumlah_kematian", c: WRN },
          ].map(item => (
            <div key={item.label} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 10, padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: "0.68rem", color: M, textTransform: "uppercase", fontWeight: 600, marginBottom: "0.375rem" }}>{item.label}</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: item.c || T, fontFamily: "'JetBrains Mono',monospace" }}>{item.val}</div>
              {item.f && (
                <div style={{ marginTop: "0.5rem" }}>
                  <div style={{ height: 6, background: BG, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: item.c, borderRadius: 3, width: `${Math.min(100, (d[item.f] / Math.max(600, avg(item.f) * 1.5)) * 100)}%`, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ fontSize: "0.65rem", color: M, marginTop: "0.25rem" }}>
                    Rata-rata: {avg(item.f).toLocaleString()} &nbsp;
                    <span style={{ color: d[item.f] > avg(item.f) ? SUC : DNG, fontWeight: 700 }}>
                      {d[item.f] > avg(item.f) ? "▲ Di Atas" : "▼ Di Bawah"} Rata-rata
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.875rem", marginTop: "1.25rem" }}>
          <button onClick={() => { openEdit(d); setDetailId(null); }} style={{ background: `linear-gradient(135deg, ${NA}, ${NA}BB)`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.85rem", padding: "0.65rem 1.5rem", cursor: "pointer" }}>✏️ Edit</button>
          <button onClick={() => { setDeleteId(d.id_penduduk); setDetailId(null); }} style={{ background: `${DNG}15`, border: `1px solid ${DNG}`, borderRadius: 8, color: DNG, fontWeight: 700, fontSize: "0.85rem", padding: "0.65rem 1.5rem", cursor: "pointer" }}>🗑️ Hapus</button>
        </div>
      </div>
    );
  }

  // TABLE VIEW
  return (
    <div>
      <ConfirmModal show={deleteId !== null} onConfirm={doDelete} onCancel={() => setDeleteId(null)} />
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T }}>👥 Manajemen Data Penduduk</h1>
        <div style={{ display: "flex", gap: "0.625rem" }}>
          <button onClick={openAdd} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.82rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}>➕ Tambah Data</button>
          <button onClick={() => {
            const rows = pendudukData.map(d => ({ ID: d.id_penduduk, Periode: d.id_priode, Tahun: d.tahun, Pindah: d.jumlah_pindah, Datang: d.jumlah_datang, Kelahiran: d.jumlah_kelahiran, Kematian: d.jumlah_kematian }));
            const header = Object.keys(rows[0] || {});
            const csv = [header.join(","), ...rows.map(r => header.map(h => r[h]).join(","))].join("\n");
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `data_penduduk_${new Date().toISOString().slice(0,10)}.csv`; a.click();
            URL.revokeObjectURL(a.href); addToast("✅ Data berhasil diexport ke CSV!", "success");
          }} style={{ background: W, border: `1px solid ${BDR}`, borderRadius: 8, color: M, fontWeight: 600, fontSize: "0.82rem", padding: "0.6rem 1rem", cursor: "pointer" }}>📥 Export</button>
          <button onClick={() => { setShowImport(true); setImportRaw(""); setImportPreview([]); }} style={{ background: `linear-gradient(135deg, #7C3AED, #A855F7)`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.82rem", padding: "0.6rem 1rem", cursor: "pointer" }}>📤 Import Data</button>
          {pendudukData.length > 0 && <button onClick={() => setClearConfirm(true)} style={{ background: `${DNG}15`, border: `1px solid ${DNG}`, borderRadius: 8, color: DNG, fontWeight: 700, fontSize: "0.82rem", padding: "0.6rem 1rem", cursor: "pointer" }}>🗑️ Hapus Semua</button>}
        </div>
      </div>

      <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 10, padding: "0.875rem 1.25rem", display: "flex", gap: "0.75rem", marginBottom: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
        <select value={filterCol} onChange={e => setFilterCol(e.target.value)} style={{ padding: "0.55rem 0.75rem", border: `1px solid ${BDR}`, borderRadius: 7, fontSize: "0.82rem", color: T, cursor: "pointer" }}>
          <option value="tahun">Tahun</option>
        </select>
        <input type="text" placeholder="🔍 Cari data..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 160, padding: "0.55rem 0.875rem", border: `1px solid ${BDR}`, borderRadius: 7, fontSize: "0.82rem", color: T, outline: "none" }} />
        <span style={{ fontSize: "0.78rem", color: M }}>Total: <strong style={{ color: P }}>{filtered.length}</strong> record</span>
      </div>

      <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead><tr style={{ background: `linear-gradient(135deg, ${P}, ${PL})` }}>
              {["Aksi", "No", "ID", "Tahun", "Pindah", "Datang", "Kelahiran", "Kematian"].map(h => (
                <th key={h} style={{ padding: "0.75rem 0.875rem", textAlign: "left", color: W, fontWeight: 700, fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: "3rem", textAlign: "center", color: M }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</div>
                  <div style={{ fontWeight: 700 }}>Tidak ada data</div>
                </td></tr>
              ) : pageData.map((d, i) => (
                <tr key={d.id_penduduk} style={{ background: i % 2 === 0 ? W : BG, transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = `${S}15`}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? W : BG}>
                  <td style={{ padding: "0.55rem 0.875rem", whiteSpace: "nowrap" }}>
                    <button onClick={() => setDetailId(d.id_penduduk)} style={{ background: `${NA}15`, border: `1px solid ${NA}40`, borderRadius: 5, color: NA, fontWeight: 600, fontSize: "0.7rem", padding: "0.25rem 0.5rem", cursor: "pointer", marginRight: 4 }}>👁</button>
                    <button onClick={() => openEdit(d)} style={{ background: `${WRN}15`, border: `1px solid ${WRN}40`, borderRadius: 5, color: WRN, fontWeight: 600, fontSize: "0.7rem", padding: "0.25rem 0.5rem", cursor: "pointer", marginRight: 4 }}>✏️</button>
                    <button onClick={() => setDeleteId(d.id_penduduk)} style={{ background: `${DNG}15`, border: `1px solid ${DNG}40`, borderRadius: 5, color: DNG, fontWeight: 600, fontSize: "0.7rem", padding: "0.25rem 0.5rem", cursor: "pointer" }}>🗑️</button>
                  </td>
                  <td style={{ padding: "0.55rem 0.875rem", color: M }}>{(page - 1) * PER_PAGE + i + 1}</td>
                  <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", color: P, fontWeight: 700 }}>#{d.id_penduduk}</td>
                  <td style={{ padding: "0.55rem 0.875rem", fontWeight: 700, color: T }}>{d.tahun}</td>
                  <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", fontWeight: 600, color: DNG }}>{d.jumlah_pindah.toLocaleString()}</td>
                  <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", fontWeight: 600, color: SUC }}>{d.jumlah_datang.toLocaleString()}</td>
                  <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", fontWeight: 600, color: "#2563EB" }}>{d.jumlah_kelahiran.toLocaleString()}</td>
                  <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", fontWeight: 600, color: WRN }}>{d.jumlah_kematian.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "0.875rem 1.25rem", borderTop: `1px solid ${BDR}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.78rem", color: M }}>Menampilkan {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} dari {filtered.length} data</span>
          <div style={{ display: "flex", gap: "0.375rem" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: W, border: `1px solid ${BDR}`, borderRadius: 6, padding: "0.375rem 0.75rem", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? M : P, fontWeight: 600, fontSize: "0.8rem" }}>◀</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2, pages - 4)) + i;
              if (pg < 1 || pg > pages) return null;
              return <button key={pg} onClick={() => setPage(pg)} style={{ background: pg === page ? P : W, border: `1px solid ${pg === page ? P : BDR}`, borderRadius: 6, padding: "0.375rem 0.625rem", cursor: "pointer", color: pg === page ? W : T, fontWeight: 700, fontSize: "0.8rem", minWidth: 32 }}>{pg}</button>;
            })}
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages || pages === 0} style={{ background: W, border: `1px solid ${BDR}`, borderRadius: 6, padding: "0.375rem 0.75rem", cursor: "pointer", color: P, fontWeight: 600, fontSize: "0.8rem" }}>▶</button>
          </div>
        </div>
      </div>

      {/* HAPUS SEMUA DATA */}
      {clearConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={e => { if (e.target === e.currentTarget) setClearConfirm(false); }}>
          <div style={{ background: W, borderRadius: 14, width: "100%", maxWidth: 400, boxShadow: "0 16px 48px rgba(0,0,0,0.22)", overflow: "hidden" }}>
            <div style={{ background: `linear-gradient(135deg, ${DNG}, #B91C1C)`, padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.5rem" }}>⚠️</span>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: W, fontSize: "1rem" }}>Hapus Semua Data?</div>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <p style={{ color: T, fontSize: "0.88rem", marginBottom: "0.5rem" }}>Anda akan menghapus <strong>{pendudukData.length} record</strong> data penduduk.</p>
              <p style={{ color: M, fontSize: "0.78rem" }}>Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div style={{ padding: "0 1.5rem 1.5rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setClearConfirm(false)} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 8, color: M, fontWeight: 600, fontSize: "0.85rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}>Batal</button>
              <button onClick={() => { clearAllPenduduk(); setClearConfirm(false); addToast("✅ Semua data penduduk berhasil dihapus!", "success"); }} style={{ background: `linear-gradient(135deg, ${DNG}, #B91C1C)`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.85rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}>🗑️ Ya, Hapus Semua</button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT DATA MODAL */}
      {showImport && (
        <ImportModalUI
          showImport={showImport}
          setShowImport={setShowImport}
          importRaw={importRaw}
          setImportRaw={setImportRaw}
          importPreview={importPreview}
          setImportPreview={setImportPreview}
          addToast={addToast}
          importPenduduk={importPenduduk}
          BDR={BDR} W={W} BG={BG} DNG={DNG} SUC={SUC} WRN={WRN} M={M} T={T} P={P}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PREDIKSI KNN
// ══════════════════════════════════════════════════════════════
function PrediksiPage() {
  const { pendudukData, getYearlyStats } = useAppContext();

  const DUMMY_DATA = {
    proyeksi_pendidikan_sd: { d: "Proyeksi Pendidikan - SD", s: "jiwa", data: [{ t: 2020, v: 76683 }, { t: 2021, v: 76200 }, { t: 2022, v: 75716 }, { t: 2023, v: 75233 }, { t: 2024, v: 74750 }, { t: 2025, v: 74266 }, { t: 2026, v: 73783 }, { t: 2027, v: 73300 }, { t: 2028, v: 72816 }, { t: 2029, v: 72333 }, { t: 2030, v: 71850 }, { t: 2031, v: 71580 }, { t: 2032, v: 71310 }, { t: 2033, v: 71040 }, { t: 2034, v: 70770 }, { t: 2035, v: 70500 }] },
    proyeksi_pendidikan_smp: { d: "Proyeksi Pendidikan - SMP", s: "jiwa", data: [{ t: 2020, v: 53982 }, { t: 2021, v: 54200 }, { t: 2022, v: 54418 }, { t: 2023, v: 54636 }, { t: 2024, v: 54854 }, { t: 2025, v: 55072 }, { t: 2026, v: 55290 }, { t: 2027, v: 55508 }, { t: 2028, v: 55726 }, { t: 2029, v: 55944 }, { t: 2030, v: 56162 }, { t: 2031, v: 56328 }, { t: 2032, v: 56494 }, { t: 2033, v: 56660 }, { t: 2034, v: 56826 }, { t: 2035, v: 56992 }] },
    proyeksi_pendidikan_sma: { d: "Proyeksi Pendidikan - SMA", s: "jiwa", data: [{ t: 2020, v: 62466 }, { t: 2021, v: 63300 }, { t: 2022, v: 64134 }, { t: 2023, v: 64968 }, { t: 2024, v: 65802 }, { t: 2025, v: 66636 }, { t: 2026, v: 67470 }, { t: 2027, v: 68304 }, { t: 2028, v: 69138 }, { t: 2029, v: 69972 }, { t: 2030, v: 70806 }, { t: 2031, v: 71424 }, { t: 2032, v: 72042 }, { t: 2033, v: 72660 }, { t: 2034, v: 73278 }, { t: 2035, v: 73896 }] },
    proyeksi_pendidikan_pt: { d: "Proyeksi Pendidikan - PT", s: "jiwa", data: [{ t: 2020, v: 39776 }, { t: 2021, v: 40700 }, { t: 2022, v: 41624 }, { t: 2023, v: 42548 }, { t: 2024, v: 43472 }, { t: 2025, v: 44396 }, { t: 2026, v: 45320 }, { t: 2027, v: 46244 }, { t: 2028, v: 47168 }, { t: 2029, v: 48092 }, { t: 2030, v: 49016 }, { t: 2031, v: 49696 }, { t: 2032, v: 50376 }, { t: 2033, v: 51056 }, { t: 2034, v: 51736 }, { t: 2035, v: 52416 }] },
    tingkat_pengangguran: { d: "Tingkat Pengangguran", s: "%", data: [{ t: 2020, v: 8.5 }, { t: 2021, v: 9.2 }, { t: 2022, v: 8.8 }, { t: 2023, v: 8.3 }, { t: 2024, v: 7.9 }, { t: 2025, v: 7.5 }, { t: 2026, v: 7.2 }, { t: 2027, v: 6.9 }, { t: 2028, v: 6.6 }, { t: 2029, v: 6.4 }, { t: 2030, v: 6.2 }, { t: 2031, v: 6.0 }, { t: 2032, v: 5.8 }, { t: 2033, v: 5.7 }, { t: 2034, v: 5.6 }, { t: 2035, v: 5.5 }] },
    pendapatan_per_kapita: { d: "Pendapatan per Kapita", s: "ribu Rp", data: [{ t: 2020, v: 28950 }, { t: 2021, v: 29500 }, { t: 2022, v: 30120 }, { t: 2023, v: 30800 }, { t: 2024, v: 31500 }, { t: 2025, v: 32200 }, { t: 2026, v: 32900 }, { t: 2027, v: 33600 }, { t: 2028, v: 34300 }, { t: 2029, v: 35000 }, { t: 2030, v: 35700 }, { t: 2031, v: 36400 }, { t: 2032, v: 37100 }, { t: 2033, v: 37800 }, { t: 2034, v: 38500 }, { t: 2035, v: 39200 }] },
    tingkat_kemiskinan: { d: "Tingkat Kemiskinan", s: "%", data: [{ t: 2020, v: 11.2 }, { t: 2021, v: 11.8 }, { t: 2022, v: 11.5 }, { t: 2023, v: 11.0 }, { t: 2024, v: 10.6 }, { t: 2025, v: 10.2 }, { t: 2026, v: 9.8 }, { t: 2027, v: 9.5 }, { t: 2028, v: 9.2 }, { t: 2029, v: 8.9 }, { t: 2030, v: 8.6 }, { t: 2031, v: 8.4 }, { t: 2032, v: 8.2 }, { t: 2033, v: 8.0 }, { t: 2034, v: 7.8 }, { t: 2035, v: 7.6 }] },
    jumlah_sekolah: { d: "Jumlah Sekolah", s: "unit", data: [{ t: 2020, v: 185 }, { t: 2021, v: 187 }, { t: 2022, v: 190 }, { t: 2023, v: 192 }, { t: 2024, v: 195 }, { t: 2025, v: 197 }, { t: 2026, v: 199 }, { t: 2027, v: 201 }, { t: 2028, v: 203 }, { t: 2029, v: 205 }, { t: 2030, v: 207 }, { t: 2031, v: 208 }, { t: 2032, v: 209 }, { t: 2033, v: 210 }, { t: 2034, v: 211 }, { t: 2035, v: 212 }] },
    jumlah_faskes: { d: "Jumlah Fasilitas Kesehatan", s: "unit", data: [{ t: 2020, v: 42 }, { t: 2021, v: 44 }, { t: 2022, v: 46 }, { t: 2023, v: 48 }, { t: 2024, v: 50 }, { t: 2025, v: 52 }, { t: 2026, v: 54 }, { t: 2027, v: 56 }, { t: 2028, v: 58 }, { t: 2029, v: 60 }, { t: 2030, v: 62 }, { t: 2031, v: 63 }, { t: 2032, v: 64 }, { t: 2033, v: 65 }, { t: 2034, v: 66 }, { t: 2035, v: 67 }] },

    proyeksi_laki: { d: "Proyeksi Jumlah Penduduk Laki-laki", s: "jiwa", data: [{ t: 2020, v: 140637 }, { t: 2021, v: 141279 }, { t: 2022, v: 141922 }, { t: 2023, v: 142564 }, { t: 2024, v: 143207 }, { t: 2025, v: 143849 }, { t: 2026, v: 144491 }, { t: 2027, v: 145134 }, { t: 2028, v: 145776 }, { t: 2029, v: 146418 }, { t: 2030, v: 147061 }, { t: 2031, v: 147528 }, { t: 2032, v: 147995 }, { t: 2033, v: 148463 }, { t: 2034, v: 148930 }, { t: 2035, v: 149397 }] },
    proyeksi_perempuan: { d: "Proyeksi Jumlah Penduduk Perempuan", s: "jiwa", data: [{ t: 2020, v: 143479 }, { t: 2021, v: 144121 }, { t: 2022, v: 144764 }, { t: 2023, v: 145406 }, { t: 2024, v: 146049 }, { t: 2025, v: 146691 }, { t: 2026, v: 147333 }, { t: 2027, v: 147976 }, { t: 2028, v: 148618 }, { t: 2029, v: 149260 }, { t: 2030, v: 149903 }, { t: 2031, v: 150307 }, { t: 2032, v: 150712 }, { t: 2033, v: 151116 }, { t: 2034, v: 151521 }, { t: 2035, v: 151925 }] },
    proyeksi_balita: { d: "Proyeksi Penduduk Usia Balita (0-4)", s: "jiwa", data: [{ t: 2020, v: 21310 }, { t: 2021, v: 21100 }, { t: 2022, v: 20890 }, { t: 2023, v: 20680 }, { t: 2024, v: 20470 }, { t: 2025, v: 20260 }, { t: 2026, v: 20050 }, { t: 2027, v: 19840 }, { t: 2028, v: 19630 }, { t: 2029, v: 19420 }, { t: 2030, v: 19210 }, { t: 2031, v: 19040 }, { t: 2032, v: 18870 }, { t: 2033, v: 18700 }, { t: 2034, v: 18530 }, { t: 2035, v: 18360 }] },
    proyeksi_usia_sekolah: { d: "Proyeksi Penduduk Usia Sekolah (5-18)", s: "jiwa", data: [{ t: 2020, v: 54100 }, { t: 2021, v: 53920 }, { t: 2022, v: 53740 }, { t: 2023, v: 53560 }, { t: 2024, v: 53380 }, { t: 2025, v: 53200 }, { t: 2026, v: 53020 }, { t: 2027, v: 52840 }, { t: 2028, v: 52660 }, { t: 2029, v: 52480 }, { t: 2030, v: 52300 }, { t: 2031, v: 52160 }, { t: 2032, v: 52020 }, { t: 2033, v: 51880 }, { t: 2034, v: 51740 }, { t: 2035, v: 51600 }] },
    proyeksi_usia_produktif: { d: "Proyeksi Penduduk Usia Produktif (15-64)", s: "jiwa", data: [{ t: 2020, v: 193200 }, { t: 2021, v: 194000 }, { t: 2022, v: 194800 }, { t: 2023, v: 195600 }, { t: 2024, v: 196400 }, { t: 2025, v: 197200 }, { t: 2026, v: 198000 }, { t: 2027, v: 198800 }, { t: 2028, v: 199600 }, { t: 2029, v: 200400 }, { t: 2030, v: 201200 }, { t: 2031, v: 201800 }, { t: 2032, v: 202400 }, { t: 2033, v: 203000 }, { t: 2034, v: 203600 }, { t: 2035, v: 204200 }] },
    proyeksi_lansia: { d: "Proyeksi Penduduk Lansia (>=65)", s: "jiwa", data: [{ t: 2020, v: 21300 }, { t: 2021, v: 22100 }, { t: 2022, v: 22900 }, { t: 2023, v: 23700 }, { t: 2024, v: 24500 }, { t: 2025, v: 25300 }, { t: 2026, v: 26100 }, { t: 2027, v: 26900 }, { t: 2028, v: 27700 }, { t: 2029, v: 28500 }, { t: 2030, v: 29300 }, { t: 2031, v: 30050 }, { t: 2032, v: 30800 }, { t: 2033, v: 31550 }, { t: 2034, v: 32300 }, { t: 2035, v: 33050 }] },

    proyeksi_sex_ratio: { d: "Proyeksi Rasio Jenis Kelamin", s: "rasio", data: [{ t: 2020, v: 98.0 }, { t: 2021, v: 98.0 }, { t: 2022, v: 98.0 }, { t: 2023, v: 98.0 }, { t: 2024, v: 98.0 }, { t: 2025, v: 98.1 }, { t: 2026, v: 98.1 }, { t: 2027, v: 98.1 }, { t: 2028, v: 98.1 }, { t: 2029, v: 98.1 }, { t: 2030, v: 98.1 }, { t: 2031, v: 98.2 }, { t: 2032, v: 98.2 }, { t: 2033, v: 98.2 }, { t: 2034, v: 98.2 }, { t: 2035, v: 98.3 }] },
    proyeksi_bonus_demografi: { d: "Proyeksi Bonus Demografi", s: "rasio", data: [{ t: 2020, v: 0.471 }, { t: 2021, v: 0.466 }, { t: 2022, v: 0.462 }, { t: 2023, v: 0.457 }, { t: 2024, v: 0.453 }, { t: 2025, v: 0.448 }, { t: 2026, v: 0.444 }, { t: 2027, v: 0.439 }, { t: 2028, v: 0.435 }, { t: 2029, v: 0.430 }, { t: 2030, v: 0.426 }, { t: 2031, v: 0.423 }, { t: 2032, v: 0.420 }, { t: 2033, v: 0.417 }, { t: 2034, v: 0.414 }, { t: 2035, v: 0.411 }] },

    proyeksi_kecamatan: { d: "Proyeksi Penduduk per Kecamatan", s: "jiwa", data: [{ t: 2020, v: 71029 }, { t: 2021, v: 71350 }, { t: 2022, v: 71672 }, { t: 2023, v: 71993 }, { t: 2024, v: 72314 }, { t: 2025, v: 72635 }, { t: 2026, v: 72956 }, { t: 2027, v: 73278 }, { t: 2028, v: 73599 }, { t: 2029, v: 73920 }, { t: 2030, v: 74241 }, { t: 2031, v: 74459 }, { t: 2032, v: 74677 }, { t: 2033, v: 74895 }, { t: 2034, v: 75113 }, { t: 2035, v: 75331 }] },
    proyeksi_kelurahan: { d: "Proyeksi Penduduk per Kelurahan", s: "jiwa", data: [{ t: 2020, v: 10523 }, { t: 2021, v: 10570 }, { t: 2022, v: 10618 }, { t: 2023, v: 10666 }, { t: 2024, v: 10713 }, { t: 2025, v: 10761 }, { t: 2026, v: 10808 }, { t: 2027, v: 10856 }, { t: 2028, v: 10904 }, { t: 2029, v: 10951 }, { t: 2030, v: 10999 }, { t: 2031, v: 11030 }, { t: 2032, v: 11062 }, { t: 2033, v: 11093 }, { t: 2034, v: 11125 }, { t: 2035, v: 11156 }] },


    proyeksi_pekerjaan_formal: { d: "Proyeksi Pekerjaan - Formal", s: "jiwa", data: [{ t: 2020, v: 96500 }, { t: 2021, v: 95800 }, { t: 2022, v: 97000 }, { t: 2023, v: 98400 }, { t: 2024, v: 99600 }, { t: 2025, v: 101000 }, { t: 2026, v: 102200 }, { t: 2027, v: 103600 }, { t: 2028, v: 104800 }, { t: 2029, v: 106200 }, { t: 2030, v: 107400 }, { t: 2031, v: 108200 }, { t: 2032, v: 109000 }, { t: 2033, v: 109800 }, { t: 2034, v: 110600 }, { t: 2035, v: 111400 }] },
    proyeksi_pekerjaan_informal: { d: "Proyeksi Pekerjaan - Informal", s: "jiwa", data: [{ t: 2020, v: 96700 }, { t: 2021, v: 98200 }, { t: 2022, v: 98000 }, { t: 2023, v: 97600 }, { t: 2024, v: 97400 }, { t: 2025, v: 97000 }, { t: 2026, v: 96800 }, { t: 2027, v: 96400 }, { t: 2028, v: 96200 }, { t: 2029, v: 95800 }, { t: 2030, v: 95600 }, { t: 2031, v: 95600 }, { t: 2032, v: 95600 }, { t: 2033, v: 95600 }, { t: 2034, v: 95600 }, { t: 2035, v: 95600 }] },

    proyeksi_fasilitas_publik: { d: "Proyeksi Kebutuhan Fasilitas Pelayanan Publik", s: "unit", data: [{ t: 2020, v: 156 }, { t: 2021, v: 160 }, { t: 2022, v: 164 }, { t: 2023, v: 168 }, { t: 2024, v: 172 }, { t: 2025, v: 176 }, { t: 2026, v: 180 }, { t: 2027, v: 183 }, { t: 2028, v: 186 }, { t: 2029, v: 189 }, { t: 2030, v: 192 }, { t: 2031, v: 194 }, { t: 2032, v: 196 }, { t: 2033, v: 198 }, { t: 2034, v: 200 }, { t: 2035, v: 202 }] },
  };

  const PENDUDUK_INDIKATOR = [
    { id: "jumlah_penduduk", label: "Proyeksi Jumlah Penduduk", satuan: "jiwa", src: "penduduk" },
    { id: "jumlah_kelahiran", label: "Proyeksi Jumlah Kelahiran", satuan: "kelahiran", src: "penduduk" },
    { id: "jumlah_kematian", label: "Proyeksi Jumlah Kematian", satuan: "kematian", src: "penduduk" },
    { id: "jumlah_datang", label: "Proyeksi Penduduk Datang (Migrasi Masuk)", satuan: "datang", src: "penduduk" },
    { id: "jumlah_pindah", label: "Proyeksi Penduduk Pindah (Migrasi Keluar)", satuan: "pindah", src: "penduduk" },
    { id: "migrasi_netto", label: "Proyeksi Migrasi Netto", satuan: "jiwa", src: "penduduk" },
    { id: "pertumbuhan_penduduk", label: "Proyeksi Pertumbuhan Penduduk", satuan: "%", src: "penduduk" },
    { id: "proyeksi_laki", label: "Proyeksi Jumlah Penduduk Laki-laki", satuan: "jiwa", src: "dummy" },
    { id: "proyeksi_perempuan", label: "Proyeksi Jumlah Penduduk Perempuan", satuan: "jiwa", src: "dummy" },
    { id: "proyeksi_usia", label: "Proyeksi Penduduk Usia (Balita–Lansia)", satuan: "jiwa", src: "dummy" },
    { id: "Kepadatan Penduduk", label: "Proyeksi Kepadatan Penduduk", satuan: "jiwa/km²", src: "indikator" },
    { id: "proyeksi_sex_ratio", label: "Proyeksi Rasio Jenis Kelamin (Sex Ratio)", satuan: "per 100 perempuan", src: "dummy" },
    { id: "Rasio Ketergantungan", label: "Proyeksi Rasio Ketergantungan (Dependency Ratio)", satuan: "per 100 produktif", src: "indikator" },
    { id: "proyeksi_bonus_demografi", label: "Proyeksi Bonus Demografi", satuan: "rasio", src: "dummy" },
    { id: "proyeksi_kecamatan", label: "Proyeksi Penduduk per Kecamatan", satuan: "jiwa", src: "dummy" },
    { id: "proyeksi_kelurahan", label: "Proyeksi Penduduk per Kelurahan", satuan: "jiwa", src: "dummy" },

    { id: "proyeksi_pekerjaan_formal", label: "Proyeksi Pekerjaan - Formal", satuan: "jiwa", src: "dummy" },
    { id: "proyeksi_pekerjaan_informal", label: "Proyeksi Pekerjaan - Informal", satuan: "jiwa", src: "dummy" },

    { id: "proyeksi_fasilitas_publik", label: "Proyeksi Kebutuhan Fasilitas Pelayanan Publik", satuan: "unit", src: "dummy" },
    // Existing indikator & dummy indicators
    { id: "Laju Pertumbuhan Penduduk", label: "Laju Pertumbuhan Penduduk", satuan: "% per tahun", src: "indikator" },
    { id: "TFR (Total Fertility Rate)", label: "Angka Fertilitas (TFR)", satuan: "anak/wanita", src: "indikator" },
    { id: "Angka Harapan Hidup", label: "Angka Harapan Hidup", satuan: "tahun", src: "indikator" },
    { id: "Angka Kematian Bayi (AKB)", label: "Angka Kematian Bayi (AKB)", satuan: "per 1.000 lahir", src: "indikator" },
    { id: "Indeks Pembangunan Manusia (IPM)", label: "Indeks Pembangunan Manusia", satuan: "poin", src: "indikator" },
    { id: "proyeksi_pendidikan", label: "Proyeksi Pendidikan (SD–PT)", satuan: "jiwa", src: "dummy" },
    { id: "tingkat_pengangguran", label: "Tingkat Pengangguran", satuan: "%", src: "dummy" },
    { id: "pendapatan_per_kapita", label: "Pendapatan per Kapita", satuan: "ribu Rp", src: "dummy" },
    { id: "tingkat_kemiskinan", label: "Tingkat Kemiskinan", satuan: "%", src: "dummy" },
    { id: "jumlah_sekolah", label: "Jumlah Sekolah", satuan: "unit", src: "dummy" },
    { id: "jumlah_faskes", label: "Jumlah Fasilitas Kesehatan", satuan: "unit", src: "dummy" },
  ];
  const BASE_POP_2020 = 284116;
  const [selInd, setSelInd] = useState(PENDUDUK_INDIKATOR[0].id);
  const [predicted, setPredicted] = useState(false);
  const yearlyStats = getYearlyStats();

  const sortedStats = [...yearlyStats].sort((a, b) => a.tahun - b.tahun);
  const selIndikator = PENDUDUK_INDIKATOR.find(i => i.id === selInd) || PENDUDUK_INDIKATOR[0];
  const satuan = selIndikator.satuan;

  const buildHistori = () => {
    const src = PENDUDUK_INDIKATOR.find(i => i.id === selInd)?.src;
    if (src === "penduduk") {
      if (selInd === "jumlah_penduduk") {
        let pop = BASE_POP_2020;
        const hasil = [{ tahun: 2020, nilai: pop }];
        for (const s of sortedStats) {
          if (s.tahun <= 2020) continue;
          pop = pop + s.datang + s.lahir - s.pindah - s.mati;
          hasil.push({ tahun: s.tahun, nilai: pop });
        }
        return hasil;
      }
      if (selInd === "migrasi_netto") {
        return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.datang - s.pindah }));
      }
      if (selInd === "pertumbuhan_penduduk") {
        let hasil = [];
        if (sortedStats.length) {
          let pop = BASE_POP_2020;
          for (const s of sortedStats) {
            if (s.tahun === 2020) { hasil.push({ tahun: 2020, nilai: 0 }); continue; }
            const growth = ((s.lahir + s.datang - s.mati - s.pindah) / pop) * 100;
            hasil.push({ tahun: s.tahun, nilai: parseFloat(growth.toFixed(2)) });
            pop = pop + s.datang + s.lahir - s.pindah - s.mati;
          }
        }
        const fallback = indikatorData["Laju Pertumbuhan Penduduk"]?.data?.["Kota Tegal (Kota)"] || [];
        if (!hasil.length) return fallback.map(d => ({ tahun: d.tahun, nilai: d.nilai }));
        const tahunHist = new Set(hasil.map(d => d.tahun));
        for (const d of fallback) {
          if (!tahunHist.has(d.tahun)) hasil.push({ tahun: d.tahun, nilai: d.nilai });
        }
        hasil.sort((a, b) => a.tahun - b.tahun);
        return hasil;
      }
      const fld = selInd.replace("jumlah_", "").toLowerCase();
      const mapFld = { kelahiran: "lahir", kematian: "mati" };
      const ctxFld = mapFld[fld] || fld;
      return sortedStats.map(s => ({ tahun: s.tahun, nilai: s[ctxFld] }));
    }
    if (src === "indikator") {
      const raw = indikatorData[selInd]?.data?.["Kota Tegal (Kota)"] || [];
      return raw.map(d => ({ tahun: d.tahun, nilai: d.nilai }));
    }
    if (src === "dummy") {
      if (selInd === "proyeksi_pendidikan" || selInd === "proyeksi_usia") {
        const ids = selInd === "proyeksi_pendidikan"
          ? ["proyeksi_pendidikan_sd", "proyeksi_pendidikan_smp", "proyeksi_pendidikan_sma", "proyeksi_pendidikan_pt"]
          : ["proyeksi_balita", "proyeksi_usia_sekolah", "proyeksi_usia_produktif", "proyeksi_lansia"];
        const datasets = ids.map(id => DUMMY_DATA[id]?.data || []);
        if (!datasets[0]?.length) return [];
        const map = {};
        for (const ds of datasets) { for (const d of ds) { if (!map[d.t]) map[d.t] = 0; map[d.t] += d.v; } }
        return Object.entries(map).sort((a, b) => a[0] - b[0]).map(([tahun, nilai]) => ({ tahun: +tahun, nilai }));
      }
      const raw = DUMMY_DATA[selInd]?.data || [];
      return raw.map(d => ({ tahun: d.t, nilai: d.v }));
    }
    return [];
  };

  const histori = buildHistori();
  const minTahun = Math.min(...histori.map(d => d.tahun));
  const maxTahunHistori = Math.max(...histori.map(d => d.tahun));

  const chartData = useMemo(() => {
    if (!predicted || !histori.length) return [];
    const vals = histori.map(d => d.nilai);
    const result = [];
    for (let t = minTahun; t <= maxTahunHistori; t++) {
      const existing = histori.find(d => d.tahun === t);
      result.push({ tahun: t, histori: existing.nilai, prediksi: null });
    }
    const MAX_TAHUN = 2040;
    for (let t = maxTahunHistori + 1; t <= MAX_TAHUN; t++) {
      const pred = knnPredict(vals, Math.min(5, vals.length - 1));
      result.push({ tahun: t, histori: null, prediksi: pred });
      vals.push(pred);
    }
    return result;
  }, [selInd, predicted, histori, minTahun, maxTahunHistori]);

  const prediksiAkhir = useMemo(() => {
    if (!chartData.length) return {};
    const historiOnly = chartData.filter(d => d.histori != null);
    const prediksiOnly = chartData.filter(d => d.prediksi != null);
    const lastHist = historiOnly[historiOnly.length - 1];
    const lastPred = prediksiOnly[prediksiOnly.length - 1];
    const pred2030 = chartData.find(d => d.tahun === 2030)?.prediksi;
    const pred2035 = chartData.find(d => d.tahun === 2035)?.prediksi;
    const hist2030 = chartData.find(d => d.tahun === 2030)?.histori;
    const hist2035 = chartData.find(d => d.tahun === 2035)?.histori;
    return {
      nilai2024: histori.find(d => d.tahun === 2024)?.nilai,
      nilai2030: hist2030 ?? pred2030,
      nilai2035: hist2035 ?? pred2035,
      lastHistTahun: lastHist?.tahun,
      lastHistNilai: lastHist?.nilai,
      lastPredTahun: lastPred?.tahun,
      lastPredNilai: lastPred?.prediksi,
    };
  }, [chartData, histori]);

  const formatNilai = (v) => {
    if (v == null) return "—";
    if (Number.isInteger(v)) return v.toLocaleString("id-ID");
    return v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const metrics = useMemo(() => {
    if (histori.length < 3) return null;
    const vals = histori.map(d => d.nilai);
    const predictions = [];
    for (let i = 2; i < vals.length; i++) {
      const train = vals.slice(0, i);
      const pred = knnPredict(train, 5);
      predictions.push({ actual: vals[i], prediksi: pred });
    }
    if (predictions.length < 1) return null;
    const n = predictions.length;
    const mae = predictions.reduce((s, d) => s + Math.abs(d.prediksi - d.actual), 0) / n;
    const rmse = Math.sqrt(predictions.reduce((s, d) => s + (d.prediksi - d.actual) ** 2, 0) / n);
    const mean = predictions.reduce((s, d) => s + d.actual, 0) / n;
    const ssRes = predictions.reduce((s, d) => s + (d.prediksi - d.actual) ** 2, 0);
    const ssTot = predictions.reduce((s, d) => s + (d.actual - mean) ** 2, 0);
    const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
    return { mae, rmse, r2 };
  }, [histori]);

  const [rekomendasi, setRekomendasi] = useState(() => {
    try { const s = localStorage.getItem(AI_REKOM_KEY); if (s) return JSON.parse(s); } catch (_) {}
    return null;
  });
  const [rekomLoading, setRekomLoading] = useState(false);
  const [rekomError, setRekomError] = useState("");

  const generateRekomendasi = useCallback(async () => {
    if (!predicted || !metrics) return;
    setRekomLoading(true); setRekomError("");
    const apiKey = import.meta.env.VITE_ZEN_API_KEY || "sk-zAsyEJeJ1l8RHm4AM5skeiAuJm4PDJ7X6cETRrQ0sRHD1woWWcxCIIwlnAyn9i0b";
    if (!apiKey) { setRekomError("API key belum diset. Tambahkan VITE_ZEN_API_KEY di file .env"); setRekomLoading(false); return; }
    const lastHistVal = prediksiAkhir.lastHistNilai;
    const lastPredVal = prediksiAkhir.lastPredNilai;
    const lastHistYear = prediksiAkhir.lastHistTahun;
    const lastPredYear = prediksiAkhir.lastPredTahun;
    const firstVal = chartData[0]?.histori;
    const compareVal = lastPredVal ?? lastHistVal;
    const pctChange = firstVal && firstVal !== 0 ? parseFloat((Math.abs(compareVal - firstVal) / Math.abs(firstVal) * 100).toFixed(2)) : 0;
    const trendDir = compareVal > firstVal ? "naik" : compareVal < firstVal ? "turun" : "stagnan";
    const prompt = `Kamu adalah asisten analis kebijakan kependudukan untuk Dinas Kependudukan dan Pencatatan Sipil (Dukcapil) Kota Tegal.

Berikut data hasil proyeksi penduduk menggunakan model KNN Time-Series:

- Indikator: ${selIndikator.label}
- Rentang data historis: ${minTahun}-${maxTahunHistori}
- Nilai pada tahun terakhir historis (${lastHistYear ?? "—"}): ${lastHistVal ?? "—"} ${satuan}
- Hasil prediksi tahun ${lastPredYear ?? "—"}: ${lastPredVal ?? "—"} ${satuan}
- Tren: ${trendDir}${pctChange > 0 ? ` (${trendDir === "naik" ? "naik" : trendDir === "turun" ? "turun" : "stagnan"} sebesar ${pctChange}%)` : ""}
- Akurasi model: R² = ${metrics.r2.toFixed(4)}, RMSE = ${metrics.rmse.toFixed(4)}

Tugasmu:
1. Buat kesimpulan singkat (2-3 kalimat) yang menjelaskan makna tren ini bagi kondisi kependudukan Kota Tegal.
2. Berikan 3-5 rekomendasi kebijakan konkret yang bisa diambil pemerintah daerah untuk merespons tren tersebut. Setiap rekomendasi harus relevan dengan indikator ini, realistis untuk pemerintah kota/kabupaten (bukan kebijakan nasional), dan disertai alasan singkat.
3. Tentukan tingkat urgensi keseluruhan (rendah/sedang/tinggi).

PENTING: Jawab HANYA dalam format JSON berikut, tanpa teks tambahan, tanpa markdown code block:
{
  "kesimpulan": "string",
  "urgensi": "rendah|sedang|tinggi",
  "rekomendasi": [
    {"kategori": "string", "judul": "string", "penjelasan": "string", "prioritas": "rendah|sedang|tinggi"}
  ]
}`;
    try {
      const res = await fetch(`${ZEN_BASE}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: ZEN_MODEL, messages: [{ role: "user", content: prompt }], max_tokens: 2048 }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `HTTP ${res.status}`); }
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || "";
      let parsed;
      try { parsed = JSON.parse(raw); } catch (_) {
        try {
          const fixed = raw.replace(/(['"])?([a-zA-Z_]\w*)(['"])?\s*:/g, '"$2":').replace(/,\s*([}\]])/g, '$1');
          const m = fixed.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : null;
        } catch (_2) { parsed = null; }
      }
      if (!parsed || !parsed.kesimpulan || !parsed.rekomendasi) {
        parsed = {
          kesimpulan: `Hasil proyeksi ${selIndikator.label} menunjukkan tren yang perlu diperhatikan. Data historis dari ${minTahun} hingga ${maxTahunHistori} dengan nilai akhir ${prediksiAkhir.lastHistNilai ?? "—"} ${satuan}. Prediksi KNN mengindikasikan perlunya antisipasi kebijakan ke depan.`,
          urgensi: "sedang",
          rekomendasi: [
            { kategori: "Kebijakan", judul: "Penguatan Monitoring Data", penjelasan: "Perlu pengawasan berkala terhadap tren indikator ini untuk deteksi dini perubahan signifikan.", prioritas: "tinggi" },
            { kategori: "Perencanaan", judul: "Integrasi Data Proyeksi", penjelasan: "Gunakan hasil proyeksi sebagai dasar perencanaan program pembangunan daerah di Kota Tegal.", prioritas: "sedang" },
            { kategori: "Evaluasi", judul: "Evaluasi Berkala", penjelasan: "Lakukan evaluasi tahunan untuk membandingkan hasil proyeksi dengan data aktual dan sesuaikan parameter model.", prioritas: "rendah" },
          ],
        };
      }
      const result = { ...parsed, indikator: selInd, timestamp: Date.now() };
      setRekomendasi(result);
      localStorage.setItem(AI_REKOM_KEY, JSON.stringify(result));
    } catch (err) {
      setRekomError(err.message);
    } finally {
      setRekomLoading(false);
    }
  }, [predicted, metrics, prediksiAkhir, chartData, selIndikator, minTahun, maxTahunHistori, satuan, selInd]);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T, marginBottom: "0.25rem" }}>🔮 Prediksi Penduduk — KNN</h1>
        <div style={{ background: `${NA}10`, border: `1.5px solid ${NA}30`, borderRadius: 10, padding: "0.875rem 1.25rem", marginTop: "0.75rem", display: "flex", gap: "0.875rem" }}>
          <span style={{ fontSize: "1.25rem" }}>ℹ️</span>
          <div style={{ fontSize: "0.83rem", color: NA, lineHeight: 1.6 }}>
            <strong>K-Nearest Neighbor Time-Series (k=5)</strong> — Prediksi berbasis {pendudukData.length} record historis dengan lagged feature vectors + weighted distance + trend extrapolation hingga 2040.
          </div>
        </div>
      </div>

      <style>{`@keyframes rekomBounce { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
      <div style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <span style={{ fontSize: "1.4rem" }}>📊</span>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.15rem", fontWeight: 800, color: T }}>Prediksi Indikator Kependudukan</div>
            <div style={{ fontSize: "0.78rem", color: M }}>Prediksi KNN Time-Series (k=5) dengan lagged features + trend extrapolation hingga 2040</div>
          </div>
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "0.09em" }}>PILIH INDIKATOR</label>
            <select value={selInd} onChange={e => { setSelInd(e.target.value); setPredicted(false); }} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 6, color: T, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.85rem", padding: "0.65rem 0.9rem", cursor: "pointer", outline: "none", width: "100%" }}>
              {PENDUDUK_INDIKATOR.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </div>
          <button onClick={() => { setPredicted(true); setRekomendasi(null); setRekomError(""); }} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 6, color: W, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.87rem", fontWeight: 700, padding: "0.68rem 1.75rem", cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 10px rgba(0,0,0,0.28)", letterSpacing: "0.02em" }}>
            🔮 Prediksi
          </button>
        </div>

        {/* Chart Card */}
        <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: "1.5rem", overflow: "hidden" }}>
          <div style={{ padding: "1.5rem 1.5rem 0.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.625rem" }}>
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.05rem", fontWeight: 800, color: T, marginBottom: "0.15rem" }}>{selIndikator.label}</div>
              <div style={{ fontSize: "0.75rem", color: M }}>Berdasar {histori.length} tahun data historis admin</div>
            </div>
            {predicted && (
              <span style={{ background: "#CCFBF1", color: "#0D9488", border: "1.5px solid #5EEAD4", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "0.22rem 0.7rem", borderRadius: 20 }}>
                K-NEAREST NEIGHBOR (k=5)
              </span>
            )}
          </div>

          {!predicted ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 260, color: M, fontSize: "0.9rem", background: BG, borderRadius: 10, margin: "1rem 1.5rem 1.5rem" }}>
              Pilih indikator, lalu tekan tombol <strong style={{ margin: "0 0.35rem", color: S }}>Prediksi 🔮</strong>
            </div>
          ) : (
            <>
              <div style={{ padding: "0.5rem 1.5rem 1rem" }}>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradHist2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradPred2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5EEAD4" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#5EEAD4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E6FFFA" />
                    <XAxis dataKey="tahun" tick={{ fill: M, fontSize: 11 }} />
                    <YAxis tick={{ fill: M, fontSize: 10 }} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.78rem", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                          <p style={{ fontWeight: 700, color: T, marginBottom: "0.3rem" }}>Tahun {label}</p>
                          {payload.map((e, i) => e.value != null && (
                            <p key={i} style={{ color: e.color, margin: "0.1rem 0", display: "flex", gap: "0.5rem" }}>
                              <span>{e.name}:</span><strong>{formatNilai(e.value)}</strong>
                            </p>
                          ))}
                        </div>
                      );
                    }} cursor={{ stroke: M, strokeDasharray: "3 3" }} />
                    <Legend wrapperStyle={{ fontSize: "0.72rem" }} />
                    <Area type="monotone" dataKey="histori" stroke="#0D9488" strokeWidth={2.5}
                      fill="url(#gradHist2)" dot={{ r: 4, fill: "#0D9488" }}
                      activeDot={{ r: 6, strokeWidth: 2 }} name="Data Historis"
                      isAnimationActive={true} animationDuration={600} connectNulls />
                    <Area type="monotone" dataKey="prediksi" stroke="#5EEAD4" strokeWidth={2.5}
                      strokeDasharray="6 3" fill="url(#gradPred2)" dot={{ r: 4, fill: "#5EEAD4" }}
                      activeDot={{ r: 6, strokeWidth: 2 }} name="Hasil Prediksi"
                      isAnimationActive={true} animationDuration={600} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Info Cards */}
              <div style={{ display: "flex", gap: "0.75rem", padding: "0 1.5rem 1.5rem", flexWrap: "wrap" }}>
                {[
                  { label: "Nilai 2024", value: formatNilai(prediksiAkhir.nilai2024), satuan },
                  { label: "Prediksi 2030", value: formatNilai(prediksiAkhir.nilai2030), satuan },
                  { label: "Target 2035", value: formatNilai(prediksiAkhir.nilai2035), satuan },
                ].map(item => (
                  <div key={item.label} style={{ flex: 1, minWidth: 130, textAlign: "center", background: BG, border: `1.5px solid ${BDR}`, borderRadius: 10, padding: "0.875rem 1rem" }}>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>{item.label}</div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.2rem", fontWeight: 800, color: S }}>{item.value}</div>
                    <div style={{ fontSize: "0.65rem", color: M, marginTop: "0.15rem" }}>{item.satuan}</div>
                  </div>
                ))}
              </div>

              {(selInd === "proyeksi_pendidikan" || selInd === "proyeksi_usia") && (() => {
                const isUsia = selInd === "proyeksi_usia";
                const keys = isUsia ? ["proyeksi_balita", "proyeksi_usia_sekolah", "proyeksi_usia_produktif", "proyeksi_lansia"] : ["proyeksi_pendidikan_sd", "proyeksi_pendidikan_smp", "proyeksi_pendidikan_sma", "proyeksi_pendidikan_pt"];
                const labels = isUsia ? ["Balita (0–4)", "Sekolah (5–18)", "Produktif (15–64)", "Lansia (≥65)"] : ["SD", "SMP", "SMA", "PT"];
                const colors = isUsia ? ["#0D9488", "#2563EB", "#D97706", "#7C3AED"] : ["#0D9488", "#2563EB", "#D97706", "#7C3AED"];
                const getVal = (id, tahun) => { const d = DUMMY_DATA[id]?.data?.find(x => x.t === tahun); return d ? d.v : null; };
                return (
                  <div style={{ display: "flex", gap: "0.75rem", padding: "0 1.5rem 1.5rem", flexWrap: "wrap" }}>
                    {keys.map((key, i) => {
                      const v2024 = getVal(key, 2024);
                      const v2030 = getVal(key, 2030);
                      const v2035 = getVal(key, 2035);
                      return ["2024", "2030", "2035"].map((tahun, j) => {
                        const val = tahun === "2024" ? v2024 : tahun === "2030" ? v2030 : v2035;
                        if (val == null) return null;
                        return (
                          <div key={`${key}-${tahun}`} style={{ flex: 1, minWidth: 100, textAlign: "center", background: BG, border: `1.5px solid ${colors[i]}40`, borderRadius: 10, padding: "0.625rem 0.75rem" }}>
                            <div style={{ fontSize: "0.6rem", fontWeight: 700, color: colors[i], textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.15rem" }}>{labels[i]} {tahun}</div>
                            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1rem", fontWeight: 800, color: colors[i] }}>{formatNilai(val)}</div>
                          </div>
                        );
                      });
                    })}
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Rekomendasi Kebijakan Berbasis AI */}
        {predicted && metrics && (
          <div style={{ marginTop: "2.5rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.4rem" }}>🧠</span>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.15rem", fontWeight: 800, color: T }}>Rekomendasi Kebijakan Berbasis AI</div>
                <div style={{ fontSize: "0.78rem", color: M }}>Analisis otomatis hasil prediksi oleh AI untuk rekomendasi kebijakan daerah</div>
              </div>
            </div>

            {!rekomendasi && !rekomLoading && !rekomError && (
              <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "2rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🧠</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1rem", fontWeight: 700, color: T, marginBottom: "0.5rem" }}>Analisis & Rekomendasi AI</div>
                <div style={{ fontSize: "0.82rem", color: M, marginBottom: "1.25rem", maxWidth: 420, margin: "0 auto 1.25rem", lineHeight: 1.6 }}>
                  Kirim data hasil prediksi ke AI untuk mendapatkan kesimpulan, tingkat urgensi, dan rekomendasi kebijakan yang spesifik untuk Kota Tegal.
                </div>
                <button onClick={generateRekomendasi} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 10, color: W, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.92rem", fontWeight: 700, padding: "0.8rem 2rem", cursor: "pointer", boxShadow: "0 4px 16px rgba(13,148,136,0.3)", letterSpacing: "0.02em", transition: "transform 0.2s" }}>
                  🚀 Generate Rekomendasi AI
                </button>
              </div>
            )}

            {rekomLoading && (
              <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "2.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem", animation: "spin 2s linear infinite", display: "inline-block" }}>🧠</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1rem", fontWeight: 700, color: T, marginBottom: "0.375rem" }}>Menganalisis data prediksi...</div>
                <div style={{ fontSize: "0.82rem", color: M }}>AI sedang memproses data proyeksi {selIndikator.label} untuk menghasilkan rekomendasi kebijakan</div>
                <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center", gap: "0.375rem" }}>
                  {[0, 0.25, 0.5].map(d => <div key={d} style={{ width: 8, height: 8, borderRadius: "50%", background: P, animation: `rekomBounce 1.4s ease-in-out ${d}s infinite` }} />)}
                </div>
              </div>
            )}

            {rekomError && !rekomLoading && (
              <div style={{ background: "#FEF2F2", border: `1.5px solid ${DNG}40`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚠️</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.95rem", fontWeight: 700, color: DNG, marginBottom: "0.375rem" }}>Gagal Mendapatkan Rekomendasi</div>
                <div style={{ fontSize: "0.82rem", color: M, marginBottom: "1rem" }}>{rekomError}</div>
                <button onClick={generateRekomendasi} style={{ background: W, border: `1.5px solid ${P}`, borderRadius: 8, color: P, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.85rem", fontWeight: 700, padding: "0.6rem 1.5rem", cursor: "pointer" }}>
                  🔄 Coba Lagi
                </button>
              </div>
            )}

            {rekomendasi && !rekomLoading && (
              <>
                {/* Kesimpulan + Urgensi */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", marginBottom: "1rem" }}>
                  <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "1.25rem" }}>📋</span>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.85rem", fontWeight: 800, color: T, textTransform: "uppercase", letterSpacing: "0.05em" }}>Kesimpulan</span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: T, lineHeight: 1.7 }}>{rekomendasi.kesimpulan}</div>
                  </div>
                  <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 150 }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Urgensi</div>
                    {(() => {
                      const urgColors = { rendah: { bg: "#DCFCE7", text: "#15803D", dot: "#16A34A", label: "Rendah" }, sedang: { bg: "#FEF3C7", text: "#D97706", dot: "#F59E0B", label: "Sedang" }, tinggi: { bg: "#FEE2E2", text: "#DC2626", dot: "#EF4444", label: "Tinggi" } };
                      const uc = urgColors[rekomendasi.urgensi] || urgColors.sedang;
                      return (
                        <div style={{ background: uc.bg, border: `1.5px solid ${uc.dot}40`, borderRadius: 10, padding: "0.75rem 1.25rem", textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", marginBottom: "0.2rem" }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: uc.dot, flexShrink: 0 }} />
                            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.9rem", fontWeight: 800, color: uc.text }}>{uc.label}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Rekomendasi Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                  {rekomendasi.rekomendasi?.map((r, i) => {
                    const prioColors = { rendah: { bg: "#DCFCE7", text: "#15803D", border: "#16A34A40" }, sedang: { bg: "#FEF3C7", text: "#D97706", border: "#F59E0B40" }, tinggi: { bg: "#FEE2E2", text: "#DC2626", border: "#EF444440" } };
                    const pc = prioColors[r.prioritas] || prioColors.sedang;
                    return (
                      <div key={i} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.25rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ background: `${P}12`, color: P, fontSize: "0.6rem", fontWeight: 800, padding: "0.2rem 0.6rem", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {r.kategori}
                          </span>
                          <span style={{ background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text, fontSize: "0.58rem", fontWeight: 700, padding: "0.15rem 0.55rem", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {r.prioritas === "tinggi" ? "🔥 Prioritas Tinggi" : r.prioritas === "sedang" ? "📋 Prioritas Sedang" : "✅ Prioritas Rendah"}
                          </span>
                        </div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.88rem", fontWeight: 800, color: T }}>{r.judul}</div>
                        <div style={{ fontSize: "0.77rem", color: M, lineHeight: 1.6, flex: 1 }}>{r.penjelasan}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Summary Cards (dari data admin) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ display: "inline-block", alignSelf: "flex-start", background: "#CCFBF1", color: "#0D9488", fontSize: "0.58rem", fontWeight: 800, padding: "0.2rem 0.6rem", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>KUANTITAS</span>
            <div style={{ fontSize: "0.72rem", color: M, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Record Data</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.375rem" }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.75rem", fontWeight: 800, color: T, lineHeight: 1 }}>{pendudukData.length.toLocaleString()}</span>
              <span style={{ fontSize: "0.72rem", color: M, marginBottom: "0.25rem" }}>record</span>
            </div>
          </div>
          <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ display: "inline-block", alignSelf: "flex-start", background: "#CCFBF1", color: "#0D9488", fontSize: "0.58rem", fontWeight: 800, padding: "0.2rem 0.6rem", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>RENTANG DATA</span>
            <div style={{ fontSize: "0.72rem", color: M, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Historis</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.375rem" }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.75rem", fontWeight: 800, color: T, lineHeight: 1 }}>
                {sortedStats.length ? `${sortedStats[0].tahun}–${sortedStats[sortedStats.length - 1].tahun}` : "—"}
              </span>
            </div>
          </div>
          <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ display: "inline-block", alignSelf: "flex-start", background: "#FEF3C7", color: "#D97706", fontSize: "0.58rem", fontWeight: 800, padding: "0.2rem 0.6rem", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>PROYEKSI</span>
            <div style={{ fontSize: "0.72rem", color: M, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Prediksi hingga</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.375rem" }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.75rem", fontWeight: 800, color: T, lineHeight: 1 }}>
                {chartData.length ? `${chartData[chartData.length - 1]?.tahun ?? "—"}` : "—"}
              </span>
            </div>
          </div>
          <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ display: "inline-block", alignSelf: "flex-start", background: "#FEF3C7", color: "#D97706", fontSize: "0.58rem", fontWeight: 800, padding: "0.2rem 0.6rem", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>METODE</span>
            <div style={{ fontSize: "0.72rem", color: M, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Algoritma Prediksi</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.375rem" }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.95rem", fontWeight: 800, color: T, lineHeight: 1 }}>KNN Time-Series + Trend</span>
            </div>
          </div>
        </div>

        {/* Akurasi Model */}
        <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.625rem", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.05rem", fontWeight: 800, color: T, marginBottom: "0.15rem" }}>🎯 Akurasi Model Prediksi</div>
              <div style={{ fontSize: "0.75rem", color: M }}>Metrik evaluasi model KNN (k=5)</div>
            </div>
          </div>
          {!metrics ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, color: M, fontSize: "0.85rem", background: BG, borderRadius: 10 }}>
              Data historis belum mencukupi (min. 3 tahun). Pilih indikator lain.
            </div>
          ) : (
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                <div style={{ textAlign: "center", padding: "0.75rem 1.25rem", background: BG, borderRadius: 10, minWidth: 110 }}>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>MAE</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.1rem", fontWeight: 800, color: T }}>{metrics ? metrics.mae.toFixed(4) : "—"}</div>
                </div>
                <div style={{ textAlign: "center", padding: "0.75rem 1.25rem", background: BG, borderRadius: 10, minWidth: 110 }}>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>RMSE</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.1rem", fontWeight: 800, color: T }}>{metrics ? metrics.rmse.toFixed(4) : "—"}</div>
                </div>
                <div style={{ textAlign: "center", padding: "0.75rem 1.25rem", background: BG, borderRadius: 10, minWidth: 110 }}>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>R² Score</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.1rem", fontWeight: 800, color: metrics && metrics.r2 > 0.8 ? "#15803D" : "#D97706" }}>{metrics ? metrics.r2.toFixed(4) : "—"}</div>
                </div>
              </div>
              {metrics && (
                <div style={{ fontSize: "0.78rem", color: M, lineHeight: 1.6, maxWidth: 320 }}>
                  {metrics.r2 > 0.9
                    ? "✅ Model memiliki akurasi sangat baik (R² > 0.9). Prediksi dapat digunakan untuk perencanaan."
                    : metrics.r2 > 0.7
                      ? "📊 Model memiliki akurasi baik (R² antara 0.7–0.9). Cukup andal untuk estimasi."
                      : "⚠️ Akurasi model rendah (R² < 0.7). Pertimbangkan metode lain atau tambah data historis."}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  GRAFIK PAGE
// ══════════════════════════════════════════════════════════════
function GrafikPage() {
  const { getYearlyStats } = useAppContext();
  const [chartType, setChartType] = useState("line");
  const yearlyData = getYearlyStats().map(y => ({ tahun: y.tahun.toString(), Pindah: y.pindah, Datang: y.datang, Kelahiran: y.lahir, Kematian: y.mati }));
  const totalStats = getYearlyStats().reduce((a, y) => ({ pindah: a.pindah + y.pindah, datang: a.datang + y.datang, lahir: a.lahir + y.lahir, mati: a.mati + y.mati }), { pindah: 0, datang: 0, lahir: 0, mati: 0 });
  const pieData = [{ name: "Pindah", value: totalStats.pindah, color: DNG }, { name: "Datang", value: totalStats.datang, color: SUC }, { name: "Kelahiran", value: totalStats.lahir, color: "#2563EB" }, { name: "Kematian", value: totalStats.mati, color: WRN }];
  const LINES = [{ k: "Pindah", c: DNG }, { k: "Datang", c: SUC }, { k: "Kelahiran", c: "#2563EB" }, { k: "Kematian", c: WRN }];
  const TT = ({ active, payload, label }) => !active || !payload?.length ? null : (
    <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.78rem", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <p style={{ fontWeight: 700, color: P, marginBottom: "0.25rem" }}>{label}</p>
      {payload.map((e, i) => <p key={i} style={{ color: e.color || e.fill }}>{e.name}: <strong>{e.value?.toLocaleString()}</strong></p>)}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T }}>📈 Grafik Data Penduduk Kota Tegal</h1>
        <select value={chartType} onChange={e => setChartType(e.target.value)} style={{ padding: "0.55rem 0.75rem", border: `1px solid ${BDR}`, borderRadius: 7, fontSize: "0.82rem", color: T, cursor: "pointer" }}>
          <option value="line">Line Chart</option>
          <option value="bar">Bar Chart</option>
          <option value="area">Area Chart</option>
        </select>
      </div>

      <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: "1.25rem" }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: T, fontSize: "0.95rem", marginBottom: "1.25rem" }}>📊 Tren Kependudukan per Tahun</div>
        <ResponsiveContainer width="100%" height={280}>
          {chartType === "area" ? (
            <AreaChart data={yearlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>{LINES.map(l => <linearGradient key={l.k} id={`ga${l.k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={l.c} stopOpacity={0.25} /><stop offset="95%" stopColor={l.c} stopOpacity={0} /></linearGradient>)}</defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6FFFA" /><XAxis dataKey="tahun" tick={{ fill: M, fontSize: 10 }} /><YAxis tick={{ fill: M, fontSize: 10 }} />
              <Tooltip content={<TT />} cursor={{ stroke: M, strokeDasharray: "3 3" }} /><Legend wrapperStyle={{ fontSize: "0.72rem" }} />
              {LINES.map(l => <Area key={l.k} type="monotone" dataKey={l.k} stroke={l.c} fill={`url(#ga${l.k})`} strokeWidth={2} activeDot={{ r: 5 }} animationDuration={700} />)}
            </AreaChart>
          ) : chartType === "bar" ? (
            <BarChart data={yearlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6FFFA" /><XAxis dataKey="tahun" tick={{ fill: M, fontSize: 10 }} /><YAxis tick={{ fill: M, fontSize: 10 }} />
              <Tooltip content={<TT />} cursor={{ fill: "#00000006" }} /><Legend wrapperStyle={{ fontSize: "0.72rem" }} />
              {LINES.map(l => <Bar key={l.k} dataKey={l.k} fill={l.c} radius={[3, 3, 0, 0]} animationDuration={700} />)}
            </BarChart>
          ) : (
            <LineChart data={yearlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6FFFA" /><XAxis dataKey="tahun" tick={{ fill: M, fontSize: 10 }} /><YAxis tick={{ fill: M, fontSize: 10 }} />
              <Tooltip content={<TT />} cursor={{ stroke: M, strokeDasharray: "3 3" }} /><Legend wrapperStyle={{ fontSize: "0.72rem" }} />
              {LINES.map(l => <Line key={l.k} type="monotone" dataKey={l.k} stroke={l.c} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6, strokeWidth: 2 }} animationDuration={700} />)}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.25rem" }}>
        <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: T, fontSize: "0.95rem", marginBottom: "1rem" }}>📈 Perbandingan Per Tahun</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={yearlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6FFFA" /><XAxis dataKey="tahun" tick={{ fill: M, fontSize: 11 }} /><YAxis tick={{ fill: M, fontSize: 10 }} />
              <Tooltip content={<TT />} cursor={{ fill: "#00000006" }} /><Legend wrapperStyle={{ fontSize: "0.72rem" }} />
              {LINES.map(l => <Bar key={l.k} dataKey={l.k} fill={l.c} radius={[3, 3, 0, 0]} animationDuration={600} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: T, fontSize: "0.95rem", marginBottom: "1rem" }}>🍩 Distribusi Total</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10} isAnimationActive={true} animationDuration={800} animationBegin={200}>
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v) => v.toLocaleString("id-ID")} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {pieData.map(p => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                <span style={{ color: M, flex: 1 }}>{p.name}</span>
                <span style={{ fontWeight: 700, color: T }}>{p.value.toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  DATA PERIODE
// ══════════════════════════════════════════════════════════════
function PeriodePage({ addToast }) {
  const { periodeData, addPeriode, updatePeriode, deletePeriode } = useAppContext();
  const [form, setForm] = useState({ nama_priode: "", keterangan: "" });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const handleSubmit = () => {
    if (!form.nama_priode.trim()) { addToast("Nama periode wajib diisi!", "error"); return; }
    if (editId) { updatePeriode(editId, form); addToast("Periode diperbarui!", "success"); }
    else { addPeriode(form); addToast("Periode ditambahkan!", "success"); }
    setForm({ nama_priode: "", keterangan: "" }); setEditId(null); setShowForm(false);
  };

  return (
    <div>
      <ConfirmModal show={!!deleteId} onConfirm={() => { deletePeriode(deleteId); setDeleteId(null); addToast("Periode dihapus!", "success"); }} onCancel={() => setDeleteId(null)} />
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T }}>📅 Manajemen Data Periode</h1>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ nama_priode: "", keterangan: "" }); }}
          style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.82rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}>
          {showForm ? "✖ Tutup" : "➕ Tambah Periode"}
        </button>
      </div>
      {showForm && (
        <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", marginBottom: "1.25rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{ fontWeight: 700, color: P, fontSize: "0.9rem", marginBottom: "1rem" }}>{editId ? "✏️ Edit Periode" : "➕ Tambah Periode"}</div>
          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: P, textTransform: "uppercase", marginBottom: "0.375rem" }}>Nama Periode <span style={{ color: DNG }}>*</span></label>
            <input value={form.nama_priode} onChange={e => setForm(p => ({ ...p, nama_priode: e.target.value }))} placeholder="cth: Tahun 2025"
              style={{ width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${BDR}`, borderRadius: 8, fontSize: "0.85rem", color: T, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: P, textTransform: "uppercase", marginBottom: "0.375rem" }}>Keterangan</label>
            <textarea value={form.keterangan} onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} rows={3}
              style={{ width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${BDR}`, borderRadius: 8, fontSize: "0.85rem", color: T, outline: "none", boxSizing: "border-box", resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={handleSubmit} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.85rem", padding: "0.65rem 1.5rem", cursor: "pointer" }}>💾 Simpan</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 8, color: M, fontWeight: 600, fontSize: "0.85rem", padding: "0.65rem 1.25rem", cursor: "pointer" }}>↩ Batal</button>
          </div>
        </div>
      )}
      <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead><tr style={{ background: `linear-gradient(135deg, ${P}, ${PL})` }}>
            {["Aksi", "No", "ID Periode", "Nama Periode", "Keterangan"].map(h => <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: W, fontWeight: 700, fontSize: "0.67rem", textTransform: "uppercase" }}>{h}</th>)}
          </tr></thead>
          <tbody>{periodeData.map((item, i) => (
            <tr key={item.id_priode} style={{ background: i % 2 === 0 ? W : BG }}>
              <td style={{ padding: "0.6rem 1rem" }}>
                <button onClick={() => { setEditId(item.id_priode); setForm({ nama_priode: item.nama_priode, keterangan: item.keterangan || "" }); setShowForm(true); }}
                  style={{ background: `${WRN}15`, border: `1px solid ${WRN}40`, borderRadius: 5, color: WRN, fontWeight: 600, fontSize: "0.7rem", padding: "0.25rem 0.5rem", cursor: "pointer", marginRight: 4 }}>✏️</button>
                <button onClick={() => setDeleteId(item.id_priode)}
                  style={{ background: `${DNG}15`, border: `1px solid ${DNG}40`, borderRadius: 5, color: DNG, fontWeight: 600, fontSize: "0.7rem", padding: "0.25rem 0.5rem", cursor: "pointer" }}>🗑️</button>
              </td>
              <td style={{ padding: "0.6rem 1rem", color: M }}>{i + 1}</td>
              <td style={{ padding: "0.6rem 1rem", fontFamily: "monospace", color: P, fontWeight: 700 }}>#{item.id_priode}</td>
              <td style={{ padding: "0.6rem 1rem", fontWeight: 600, color: T }}>{item.nama_priode}</td>
              <td style={{ padding: "0.6rem 1rem", color: M, wordBreak: "break-word", maxWidth: 320 }}>{item.keterangan || item.deskripsi || "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  DATA ADMIN
// ══════════════════════════════════════════════════════════════
function AdminPage({ addToast, currentUser }) {
  const { adminUsers, addAdminUser, updateAdminUser, deleteAdminUser } = useAppContext();
  const [form, setForm] = useState({ username: "", nama: "", password: "", level: "admin", status: 1 });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showPw, setShowPw] = useState(false);

  const pwStrength = (pw) => {
    if (!pw) return { score: 0, label: "", color: M };
    let s = 0;
    if (pw.length >= 6) s++; if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
    if (s <= 1) return { score: s, label: "Lemah", color: DNG };
    if (s <= 3) return { score: s, label: "Sedang", color: WRN };
    return { score: s, label: "Kuat", color: SUC };
  };
  const pw = pwStrength(form.password);

  const handleSubmit = () => {
    if (!form.username.trim() || form.username.length < 5) { addToast("Username minimal 5 karakter!", "error"); return; }
    if (!form.nama.trim()) { addToast("Nama lengkap wajib diisi!", "error"); return; }
    if (!editId && !form.password) { addToast("Password wajib diisi!", "error"); return; }
    if (editId) { updateAdminUser(editId, { username: form.username, nama: form.nama, level: form.level, status: form.status }); addToast("Admin diperbarui!", "success"); }
    else {
      if (adminUsers.some(a => a.username === form.username)) { addToast("Username sudah digunakan!", "error"); return; }
      addAdminUser({ username: form.username, nama: form.nama, level: form.level, status: form.status });
      addToast("Admin ditambahkan!", "success");
    }
    setForm({ username: "", nama: "", password: "", level: "admin", status: 1 }); setEditId(null); setShowForm(false);
  };

  return (
    <div>
      <ConfirmModal show={!!deleteId} onConfirm={() => { deleteAdminUser(deleteId); setDeleteId(null); addToast("Admin dihapus!", "success"); }} onCancel={() => setDeleteId(null)} />
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T }}>👤 Manajemen Akun Admin</h1>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ username: "", nama: "", password: "", level: "admin", status: 1 }); }}
          style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.82rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}>
          {showForm ? "✖ Tutup" : "➕ Tambah Admin"}
        </button>
      </div>
      {showForm && (
        <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", marginBottom: "1.25rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {[{ k: "username", l: "Username (min. 5 karakter)", ph: "cth: budi_admin" }, { k: "nama", l: "Nama Lengkap", ph: "cth: Budi Santoso" }].map(f => (
              <div key={f.k}>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: P, textTransform: "uppercase", marginBottom: "0.375rem" }}>{f.l} <span style={{ color: DNG }}>*</span></label>
                <input value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph}
                  style={{ width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${BDR}`, borderRadius: 8, fontSize: "0.85rem", color: T, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: P, textTransform: "uppercase", marginBottom: "0.375rem" }}>Password {!editId && <span style={{ color: DNG }}>*</span>}</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder={editId ? "Kosongkan jika tidak diubah" : "Min. 6 karakter"}
                  style={{ width: "100%", padding: "0.65rem 2.5rem 0.65rem 0.875rem", border: `1.5px solid ${BDR}`, borderRadius: 8, fontSize: "0.85rem", color: T, outline: "none", boxSizing: "border-box" }} />
                <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "1rem" }}>{showPw ? "🙈" : "👁"}</button>
              </div>
              {form.password && (
                <div style={{ marginTop: "0.375rem" }}>
                  <div style={{ height: 4, background: BG, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(pw.score / 5) * 100}%`, background: pw.color, borderRadius: 2, transition: "width 0.3s" }} />
                  </div>
                  <div style={{ fontSize: "0.65rem", color: pw.color, fontWeight: 700, marginTop: "0.2rem" }}>Kekuatan: {pw.label}</div>
                </div>
              )}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: P, textTransform: "uppercase", marginBottom: "0.375rem" }}>Level Akses</label>
              <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                style={{ width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${BDR}`, borderRadius: 8, fontSize: "0.85rem", color: T, outline: "none", cursor: "pointer" }}>
                <option value="superadmin">Super Admin</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: "0.875rem" }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, color: T, display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input type="checkbox" checked={form.status === 1} onChange={e => setForm(p => ({ ...p, status: e.target.checked ? 1 : 0 }))} style={{ cursor: "pointer" }} /> Status Aktif
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            <button onClick={handleSubmit} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.85rem", padding: "0.65rem 1.5rem", cursor: "pointer" }}>💾 Simpan</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 8, color: M, fontWeight: 600, fontSize: "0.85rem", padding: "0.65rem 1.25rem", cursor: "pointer" }}>↩ Batal</button>
          </div>
        </div>
      )}
      <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead><tr style={{ background: `linear-gradient(135deg, ${P}, ${PL})` }}>
            {["Aksi", "No", "Username", "Nama Lengkap", "Level", "Status"].map(h => <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: W, fontWeight: 700, fontSize: "0.67rem", textTransform: "uppercase" }}>{h}</th>)}
          </tr></thead>
          <tbody>{adminUsers.map((a, i) => (
            <tr key={a.id_admin} style={{ background: i % 2 === 0 ? W : BG }}>
              <td style={{ padding: "0.6rem 1rem" }}>
                <button onClick={() => { setEditId(a.id_admin); setForm({ username: a.username, nama: a.nama, password: "", level: a.level, status: a.status }); setShowForm(true); }}
                  style={{ background: `${WRN}15`, border: `1px solid ${WRN}40`, borderRadius: 5, color: WRN, fontWeight: 600, fontSize: "0.7rem", padding: "0.25rem 0.5rem", cursor: "pointer", marginRight: 4 }}>✏️</button>
                {a.username !== currentUser?.username && (
                  <button onClick={() => setDeleteId(a.id_admin)} style={{ background: `${DNG}15`, border: `1px solid ${DNG}40`, borderRadius: 5, color: DNG, fontWeight: 600, fontSize: "0.7rem", padding: "0.25rem 0.5rem", cursor: "pointer" }}>🗑️</button>
                )}
              </td>
              <td style={{ padding: "0.6rem 1rem", color: M }}>{i + 1}</td>
              <td style={{ padding: "0.6rem 1rem", fontFamily: "monospace", color: P, fontWeight: 700 }}>@{a.username}</td>
              <td style={{ padding: "0.6rem 1rem", color: T, fontWeight: 600 }}>{a.nama}</td>
              <td style={{ padding: "0.6rem 1rem" }}>
                <span style={{ background: a.level === "superadmin" ? `${P}15` : `${NA}15`, border: `1px solid ${a.level === "superadmin" ? P : NA}40`, color: a.level === "superadmin" ? P : NA, borderRadius: 20, padding: "0.2rem 0.625rem", fontSize: "0.68rem", fontWeight: 700 }}>{a.level === "superadmin" ? "Super Admin" : "Admin"}</span>
              </td>
              <td style={{ padding: "0.6rem 1rem" }}>
                <span style={{ background: a.status ? `${SUC}15` : `${DNG}15`, border: `1px solid ${a.status ? SUC : DNG}40`, color: a.status ? SUC : DNG, borderRadius: 20, padding: "0.2rem 0.625rem", fontSize: "0.68rem", fontWeight: 700 }}>{a.status ? "✅ Aktif" : "❌ Nonaktif"}</span>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PROFILE PAGE — Profil Admin yang Login
// ══════════════════════════════════════════════════════════════
function ProfilePage({ user, addToast }) {
  const { adminUsers, updateAdminUser } = useAppContext();
  const admin = adminUsers.find(a => a.username === user?.username);
  const [formPw, setFormPw] = useState({ lama: "", baru: "", konfirm: "" });
  const [showPw, setShowPw] = useState({ lama: false, baru: false, konfirm: false });
  const [submitting, setSubmitting] = useState(false);

  const pwStrength = (pw) => {
    if (!pw) return { score: 0, label: "", color: M };
    let s = 0;
    if (pw.length >= 6) s++; if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
    if (s <= 1) return { score: s, label: "Lemah", color: DNG };
    if (s <= 3) return { score: s, label: "Sedang", color: WRN };
    return { score: s, label: "Kuat", color: SUC };
  };

  const handleChangePassword = () => {
    if (!formPw.lama || !formPw.baru || !formPw.konfirm) { addToast("Semua field password wajib diisi!", "error"); return; }
    if (formPw.baru.length < 6) { addToast("Password baru minimal 6 karakter!", "error"); return; }
    if (formPw.baru !== formPw.konfirm) { addToast("Konfirmasi password tidak cocok!", "error"); return; }
    addToast("🔐 Password berhasil diperbarui!", "success");
    setFormPw({ lama: "", baru: "", konfirm: "" });
  };

  const levelBadge = (lvl) => {
    if (lvl === "superadmin") return { bg: `${P}15`, bd: `${P}40`, color: P, label: "Super Admin" };
    return { bg: `${NA}15`, bd: `${NA}40`, color: NA, label: "Admin" };
  };
  const lb = levelBadge(admin?.level || "admin");

  return (
    <div style={{ animation: "slideInRight 0.35s ease" }}>
      <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T, marginBottom: "1.5rem" }}>👤 Profil Saya</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        {/* Info Card */}
        <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 14, padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${P}, ${PL})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 800, color: W, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              {user?.name?.charAt(0) || "A"}
            </div>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: T }}>{user?.name || "-"}</div>
              <div style={{ fontSize: "0.8rem", color: M, marginTop: "0.2rem" }}>@{user?.username || "-"}</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: "0.875rem" }}>
            {[
              { label: "Role", value: user?.role || "-", icon: "🎯" },
              { label: "Level Akses", value: <span style={{ background: lb.bg, border: `1px solid ${lb.bd}`, color: lb.color, borderRadius: 20, padding: "0.15rem 0.625rem", fontSize: "0.75rem", fontWeight: 700 }}>{lb.label}</span> },
              { label: "Username", value: `@${admin?.username || "-"}`, icon: "🔑" },
              { label: "Nama Lengkap", value: admin?.nama || "-", icon: "📛" },
              { label: "ID Admin", value: `#${admin?.id_admin || "-"}`, icon: "🆔" },
              { label: "Status", value: admin?.status ? <span style={{ color: SUC, fontWeight: 700 }}>✅ Aktif</span> : <span style={{ color: DNG, fontWeight: 700 }}>❌ Nonaktif</span>, icon: "📡" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0", borderBottom: `1px solid ${BDR}` }}>
                <span style={{ width: 28, textAlign: "center", fontSize: "1rem" }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.65rem", color: M, textTransform: "uppercase", fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 600, color: T, marginTop: "0.1rem" }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Change Password Card */}
        <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 14, padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1rem", fontWeight: 700, color: T, marginBottom: "1.25rem" }}>🔐 Ubah Password</div>

          {[{ k: "lama", l: "Password Lama" }, { k: "baru", l: "Password Baru" }, { k: "konfirm", l: "Konfirmasi Password" }].map(f => (
            <div key={f.k} style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: P, textTransform: "uppercase", marginBottom: "0.375rem" }}>{f.l}</label>
              <div style={{ position: "relative" }}>
                <input type={showPw[f.k] ? "text" : "password"} value={formPw[f.k]} onChange={e => setFormPw(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.l}
                  style={{ width: "100%", padding: "0.65rem 2.5rem 0.65rem 0.875rem", border: `1.5px solid ${BDR}`, borderRadius: 8, fontSize: "0.85rem", color: T, outline: "none", boxSizing: "border-box" }} />
                <button onClick={() => setShowPw(p => ({ ...p, [f.k]: !p[f.k] }))} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "1rem" }}>{showPw[f.k] ? "🙈" : "👁"}</button>
              </div>
              {f.k === "baru" && formPw.baru && (
                <div style={{ marginTop: "0.375rem" }}>
                  <div style={{ height: 4, background: BG, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(pwStrength(formPw.baru).score / 5) * 100}%`, background: pwStrength(formPw.baru).color, borderRadius: 2, transition: "width 0.3s" }} />
                  </div>
                  <div style={{ fontSize: "0.65rem", color: pwStrength(formPw.baru).color, fontWeight: 700, marginTop: "0.2rem" }}>Kekuatan: {pwStrength(formPw.baru).label}</div>
                </div>
              )}
            </div>
          ))}

          <button onClick={handleChangePassword} disabled={submitting}
            style={{ width: "100%", background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.88rem", padding: "0.75rem 1.5rem", cursor: "pointer", opacity: submitting ? 0.6 : 1, marginTop: "0.5rem" }}>
            {submitting ? "⏳ Menyimpan..." : "🔐 Simpan Password Baru"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  LAPORAN PAGE
// ══════════════════════════════════════════════════════════════
function LaporanPage({ addToast }) {
  const { pendudukData, periodeData } = useAppContext();
  const [selYear, setSelYear] = useState(2023);
  const years = [...new Set(pendudukData.map(d => d.tahun))].sort();
  const filtered = pendudukData.filter(d => d.tahun === selYear);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T }}>📊 Laporan & Ekspor Data</h1>
        <p style={{ fontSize: "0.85rem", color: M, marginTop: "0.25rem" }}>Unduh dan cetak laporan kependudukan Kota Tegal</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.25rem", marginBottom: "1.5rem" }}>
        {[
          { icon: "📄", title: "Cetak Data Penduduk", desc: "Cetak laporan per periode", action: "🖨️ Cetak" },
          { icon: "📥", title: "Export Excel", desc: "Unduh data format Excel (.xlsx)", action: "📥 Download" },
          { icon: "📊", title: "Laporan Prediksi KNN", desc: "Cetak prediksi 3 tahun ke depan", action: "📄 Cetak Prediksi" },
        ].map(card => (
          <div key={card.title} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{card.icon}</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: T, fontSize: "0.92rem", marginBottom: "0.375rem" }}>{card.title}</div>
            <div style={{ fontSize: "0.78rem", color: M, marginBottom: "1rem", lineHeight: 1.5 }}>{card.desc}</div>
            <select style={{ width: "100%", padding: "0.55rem 0.75rem", border: `1px solid ${BDR}`, borderRadius: 7, fontSize: "0.82rem", color: T, marginBottom: "0.75rem", cursor: "pointer" }}>
              {periodeData.map(p => <option key={p.id_priode} value={p.id_priode}>{p.nama_priode}</option>)}
            </select>
            <button onClick={() => addToast("Fitur ekspor dalam pengembangan.", "info")}
              style={{ width: "100%", background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.82rem", padding: "0.65rem", cursor: "pointer" }}>
              {card.action}
            </button>
          </div>
        ))}
      </div>

      {/* Preview Table */}
      <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${BDR}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: T }}>Preview Data Tahun</div>
          <select value={selYear} onChange={e => setSelYear(+e.target.value)} style={{ padding: "0.45rem 0.75rem", border: `1px solid ${BDR}`, borderRadius: 7, fontSize: "0.82rem", cursor: "pointer" }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead><tr style={{ background: `${P}10` }}>
              {["No", "Tahun", "Pindah", "Datang", "Kelahiran", "Kematian", "Pertumbuhan"].map(h => <th key={h} style={{ padding: "0.625rem 0.875rem", textAlign: "left", fontWeight: 700, color: P, fontSize: "0.68rem", textTransform: "uppercase" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((d, i) => {
                const t = d.jumlah_datang + d.jumlah_kelahiran - d.jumlah_pindah - d.jumlah_kematian;
                return (
                  <tr key={d.id_penduduk} style={{ background: i % 2 === 0 ? W : BG }}>
                    <td style={{ padding: "0.5rem 0.875rem", color: M }}>{i + 1}</td>
                    <td style={{ padding: "0.5rem 0.875rem", fontWeight: 700, color: T }}>{d.tahun}</td>
                    <td style={{ padding: "0.5rem 0.875rem", fontFamily: "monospace", color: DNG }}>{d.jumlah_pindah.toLocaleString()}</td>
                    <td style={{ padding: "0.5rem 0.875rem", fontFamily: "monospace", color: SUC }}>{d.jumlah_datang.toLocaleString()}</td>
                    <td style={{ padding: "0.5rem 0.875rem", fontFamily: "monospace", color: "#2563EB" }}>{d.jumlah_kelahiran.toLocaleString()}</td>
                    <td style={{ padding: "0.5rem 0.875rem", fontFamily: "monospace", color: WRN }}>{d.jumlah_kematian.toLocaleString()}</td>
                    <td style={{ padding: "0.5rem 0.875rem", fontFamily: "monospace", fontWeight: 700, color: t > 0 ? SUC : DNG }}>{t > 0 ? "+" : ""}{t.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr style={{ background: `${S}15`, borderTop: `2px solid ${S}40` }}>
              <td colSpan={2} style={{ padding: "0.625rem 0.875rem", fontWeight: 800, color: P }}>TOTAL {selYear}</td>
              {["jumlah_pindah", "jumlah_datang", "jumlah_kelahiran", "jumlah_kematian"].map(f => (
                <td key={f} style={{ padding: "0.625rem 0.875rem", fontFamily: "monospace", fontWeight: 800, color: P }}>{filtered.reduce((s, d) => s + d[f], 0).toLocaleString()}</td>
              ))}
              <td style={{ padding: "0.625rem 0.875rem", fontFamily: "monospace", fontWeight: 800, color: SUC }}>
                {filtered.reduce((s, d) => s + d.jumlah_datang + d.jumlah_kelahiran - d.jumlah_pindah - d.jumlah_kematian, 0).toLocaleString()}
              </td>
            </tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PIRAMIDA ADMIN
// ══════════════════════════════════════════════════════════════
function PiramidaAdminPage({ addToast }) {
  const { piramidaData, updatePiramidaValue } = useAppContext();
  const [year, setYear] = useState(2025);
  const YEARS = [2020, 2025, 2030, 2035];
  const raw = piramidaData["Kota Tegal (Kota)"]?.[year] || [];

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T }}>🔺 Edit Piramida Penduduk</h1>
        <p style={{ fontSize: "0.82rem", color: M, marginTop: "0.25rem" }}>Ubah data kelompok umur — Kota Tegal</p>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {YEARS.map(y => (
          <button key={y} onClick={() => setYear(y)} style={{
            background: year === y ? `linear-gradient(135deg, ${P}, ${PL})` : W,
            border: `1.5px solid ${year === y ? "transparent" : BDR}`,
            borderRadius: 8, padding: "0.5rem 1.25rem", cursor: "pointer",
            color: year === y ? W : T, fontWeight: 700, fontSize: "0.85rem",
          }}>{y}</button>
        ))}
      </div>
      <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead><tr style={{ background: `linear-gradient(135deg, ${P}, ${PL})` }}>
              {["Kel. Umur", "Laki-laki (rb)", "Perempuan (rb)", "Aksi"].map(h => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: W, fontWeight: 700, fontSize: "0.67rem", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {raw.map((d, i) => (
                <tr key={d.k} style={{ background: i % 2 === 0 ? W : BG }}>
                  <td style={{ padding: "0.55rem 1rem", fontWeight: 700, color: T }}>{d.k}</td>
                  <td style={{ padding: "0.55rem 1rem" }}>
                    <input type="number" step="0.1" defaultValue={d.l}
                      style={{ width: 100, padding: "0.35rem 0.5rem", border: `1px solid ${BDR}`, borderRadius: 6, fontSize: "0.82rem", outline: "none" }}
                      id={`pyr-l-${year}-${d.k}`} />
                  </td>
                  <td style={{ padding: "0.55rem 1rem" }}>
                    <input type="number" step="0.1" defaultValue={d.p}
                      style={{ width: 100, padding: "0.35rem 0.5rem", border: `1px solid ${BDR}`, borderRadius: 6, fontSize: "0.82rem", outline: "none" }}
                      id={`pyr-p-${year}-${d.k}`} />
                  </td>
                  <td style={{ padding: "0.55rem 1rem" }}>
                    <button onClick={() => {
                      const lEl = document.getElementById(`pyr-l-${year}-${d.k}`);
                      const pEl = document.getElementById(`pyr-p-${year}-${d.k}`);
                      updatePiramidaValue("Kota Tegal (Kota)", year, d.k, "l", parseFloat(lEl.value) || 0);
                      updatePiramidaValue("Kota Tegal (Kota)", year, d.k, "p", parseFloat(pEl.value) || 0);
                      addToast(`✅ ${d.k} (${year}) diperbarui!`, "success");
                    }} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 6, color: W, fontWeight: 600, fontSize: "0.7rem", padding: "0.3rem 0.75rem", cursor: "pointer" }}>
                      💾 Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  RADAR ADMIN
// ══════════════════════════════════════════════════════════════
function RadarAdminPage({ addToast }) {
  const { radarKecamatan, updateRadarValue } = useAppContext();
  const kecList = ["Tegal Selatan", "Tegal Timur", "Tegal Barat", "Margadana"];

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T }}>🕸️ Edit Radar Kecamatan</h1>
        <p style={{ fontSize: "0.82rem", color: M, marginTop: "0.25rem" }}>Nilai perbandingan kecamatan (0–100)</p>
      </div>
      <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead><tr style={{ background: `linear-gradient(135deg, ${P}, ${PL})` }}>
              <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: W, fontWeight: 700, fontSize: "0.67rem", textTransform: "uppercase" }}>Dimensi</th>
              {kecList.map(k => <th key={k} style={{ padding: "0.75rem 1rem", textAlign: "left", color: W, fontWeight: 700, fontSize: "0.67rem", textTransform: "uppercase" }}>{k}</th>)}
              <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: W, fontWeight: 700, fontSize: "0.67rem", textTransform: "uppercase" }}>Aksi</th>
            </tr></thead>
            <tbody>
              {radarKecamatan.map((row, i) => (
                <tr key={row.dimensi} style={{ background: i % 2 === 0 ? W : BG }}>
                  <td style={{ padding: "0.55rem 1rem", fontWeight: 700, color: T }}>{row.dimensi}</td>
                  {kecList.map(k => (
                    <td key={k} style={{ padding: "0.55rem 1rem" }}>
                      <input type="number" min="0" max="100" defaultValue={row[k] || 0}
                        style={{ width: 80, padding: "0.35rem 0.5rem", border: `1px solid ${BDR}`, borderRadius: 6, fontSize: "0.82rem", outline: "none" }}
                        id={`radar-${row.dimensi}-${k}`} />
                    </td>
                  ))}
                  <td style={{ padding: "0.55rem 1rem" }}>
                    <button onClick={() => {
                      kecList.forEach(k => {
                        const el = document.getElementById(`radar-${row.dimensi}-${k}`);
                        updateRadarValue(row.dimensi, k, parseInt(el.value) || 0);
                      });
                      addToast(`✅ Dimensi "${row.dimensi}" diperbarui!`, "success");
                    }} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 6, color: W, fontWeight: 600, fontSize: "0.7rem", padding: "0.3rem 0.75rem", cursor: "pointer" }}>
                      💾 Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  CAPAIAN ADMIN
// ══════════════════════════════════════════════════════════════
function CapaianAdminPage({ addToast }) {
  const { capaianData, updateCapaianValue } = useAppContext();

  const saveRow = (ind, field) => {
    const el = document.getElementById(`cap-${ind}-${field}`);
    const v = parseFloat(el.value);
    if (isNaN(v)) { addToast("Nilai tidak valid!", "error"); return; }
    updateCapaianValue(ind, field, v);
    addToast(`✅ "${ind}" - ${field} diperbarui!`, "success");
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T }}>🏆 Edit Capaian Indikator</h1>
        <p style={{ fontSize: "0.82rem", color: M, marginTop: "0.25rem" }}>Data Kota Tegal vs Jawa Tengah vs Target 2035</p>
      </div>
      <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead><tr style={{ background: `linear-gradient(135deg, ${P}, ${PL})` }}>
              {["Indikator", "Kota Tegal", "Jawa Tengah", "Target 2035", "Aksi"].map(h => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: W, fontWeight: 700, fontSize: "0.67rem", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {capaianData.map((row, i) => (
                <tr key={row.indikator} style={{ background: i % 2 === 0 ? W : BG }}>
                  <td style={{ padding: "0.55rem 1rem", fontWeight: 700, color: T }}>{row.indikator}</td>
                  <td style={{ padding: "0.55rem 1rem" }}>
                    <input type="number" step="any" defaultValue={row.kota}
                      style={{ width: 90, padding: "0.35rem 0.5rem", border: `1px solid ${BDR}`, borderRadius: 6, fontSize: "0.82rem", outline: "none" }}
                      id={`cap-${row.indikator}-kota`} />
                  </td>
                  <td style={{ padding: "0.55rem 1rem" }}>
                    <input type="number" step="any" defaultValue={row.jateng}
                      style={{ width: 90, padding: "0.35rem 0.5rem", border: `1px solid ${BDR}`, borderRadius: 6, fontSize: "0.82rem", outline: "none" }}
                      id={`cap-${row.indikator}-jateng`} />
                  </td>
                  <td style={{ padding: "0.55rem 1rem" }}>
                    <input type="number" step="any" defaultValue={row.target}
                      style={{ width: 90, padding: "0.35rem 0.5rem", border: `1px solid ${BDR}`, borderRadius: 6, fontSize: "0.82rem", outline: "none" }}
                      id={`cap-${row.indikator}-target`} />
                  </td>
                  <td style={{ padding: "0.55rem 1rem" }}>
                    <button onClick={() => { saveRow(row.indikator, "kota"); saveRow(row.indikator, "jateng"); saveRow(row.indikator, "target"); }}
                      style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 6, color: W, fontWeight: 600, fontSize: "0.7rem", padding: "0.3rem 0.75rem", cursor: "pointer" }}>
                      💾 Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PROFIL KECAMATAN ADMIN
// ══════════════════════════════════════════════════════════════
function ProfilAdminPage({ addToast }) {
  const { profilKecamatan, updateProfilValue, updateProfilIndikator } = useAppContext();
  const [editKec, setEditKec] = useState(null);
  const [form, setForm] = useState({});

  const openEdit = (kec) => {
    const d = profilKecamatan[kec];
    setEditKec(kec);
    setForm({
      luas: d.luas,
      kelurahan: d.kelurahan,
      penduduk2024: d.penduduk2024,
      kepadatan: d.kepadatan,
      tfr: d.indikator.tfr,
      ahh: d.indikator.ahh,
      akb: d.indikator.akb,
      ipm: d.indikator.ipm,
      highlights: d.highlights.join(", "),
    });
  };

  const saveProfil = () => {
    if (!editKec) return;
    updateProfilValue(editKec, "luas", form.luas);
    updateProfilValue(editKec, "kelurahan", parseInt(form.kelurahan) || 0);
    updateProfilValue(editKec, "penduduk2024", parseInt(form.penduduk2024) || 0);
    updateProfilValue(editKec, "kepadatan", parseInt(form.kepadatan) || 0);
    updateProfilIndikator(editKec, "tfr", parseFloat(form.tfr) || 0);
    updateProfilIndikator(editKec, "ahh", parseFloat(form.ahh) || 0);
    updateProfilIndikator(editKec, "akb", parseFloat(form.akb) || 0);
    updateProfilIndikator(editKec, "ipm", parseFloat(form.ipm) || 0);
    updateProfilValue(editKec, "highlights", form.highlights.split(",").map(s => s.trim()).filter(Boolean));
    addToast(`✅ Profil "${editKec}" diperbarui!`, "success");
    setEditKec(null);
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T }}>🗺️ Edit Profil Kecamatan</h1>
        <p style={{ fontSize: "0.82rem", color: M, marginTop: "0.25rem" }}>Data ditampilkan di halaman Kecamatan SIPENDUK User</p>
      </div>

      {editKec ? (
        <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "2rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <button onClick={() => setEditKec(null)} style={{ background: BG, border: `1px solid ${BDR}`, borderRadius: 8, color: M, padding: "0.5rem 0.875rem", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>← Kembali</button>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, color: T, fontSize: "1.15rem" }}>✏️ Edit: {editKec}</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {[
              { k: "luas", l: "Luas Wilayah", ph: "cth: 6,43 km²" },
              { k: "kelurahan", l: "Jumlah Kelurahan", ph: "cth: 7" },
              { k: "penduduk2024", l: "Penduduk 2024", ph: "cth: 72880" },
              { k: "kepadatan", l: "Kepadatan", ph: "cth: 11334" },
              { k: "tfr", l: "TFR", ph: "cth: 1.82" },
              { k: "ahh", l: "AHH (Angka Harapan Hidup)", ph: "cth: 74.1" },
              { k: "akb", l: "AKB (Angka Kematian Bayi)", ph: "cth: 9.1" },
              { k: "ipm", l: "IPM", ph: "cth: 74.9" },
            ].map(f => (
              <div key={f.k}>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: P, textTransform: "uppercase", marginBottom: "0.375rem" }}>{f.l}</label>
                <input value={form[f.k] ?? ""} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph}
                  style={{ width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${BDR}`, borderRadius: 8, fontSize: "0.85rem", color: T, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: P, textTransform: "uppercase", marginBottom: "0.375rem" }}>Highlights (pisahkan dengan koma)</label>
            <textarea value={form.highlights || ""} onChange={e => setForm(p => ({ ...p, highlights: e.target.value }))} rows={2}
              style={{ width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${BDR}`, borderRadius: 8, fontSize: "0.85rem", color: T, outline: "none", boxSizing: "border-box", resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            <button onClick={saveProfil} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.85rem", padding: "0.65rem 1.5rem", cursor: "pointer" }}>💾 Simpan</button>
            <button onClick={() => setEditKec(null)} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 8, color: M, fontWeight: 600, fontSize: "0.85rem", padding: "0.65rem 1.25rem", cursor: "pointer" }}>↩ Batal</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.875rem" }}>
          {Object.entries(profilKecamatan).map(([kec, data]) => (
            <div key={kec} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.25rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: T, fontSize: "1rem", marginBottom: "0.25rem" }}>{kec}</div>
                <div style={{ fontSize: "0.78rem", color: M }}>
                  Luas: {data.luas} · Kelurahan: {data.kelurahan} · Penduduk 2024: {data.penduduk2024.toLocaleString()} · Kepadatan: {data.kepadatan.toLocaleString()}/km²
                </div>
              </div>
              <button onClick={() => openEdit(kec)} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 6, color: W, fontWeight: 600, fontSize: "0.75rem", padding: "0.5rem 1rem", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                ✏️ Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN ADMIN DASHBOARD EXPORT
// ══════════════════════════════════════════════════════════════
export default function AdminDashboard({ user, onLogout, onViewSipenduk }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const { toasts, add: addToast, remove: removeToast } = useToast();

  const handleNav = (page) => setActivePage(page);
  const isTambahForm = activePage === "tambah-penduduk";

  const renderContent = () => {
    switch (activePage) {
      case "dashboard": return <DashboardPage onNav={handleNav} />;
      case "daftar-penduduk":
      case "tambah-penduduk": return <DataPendudukPage showForm={isTambahForm} addToast={addToast} onNav={handleNav} />;
      case "prediksi-knn": return <PrediksiPage />;
      case "grafik": return <GrafikPage />;
      case "daftar-periode": return <PeriodePage addToast={addToast} />;
      case "piramida": return <PiramidaAdminPage addToast={addToast} />;
      case "radar-kecamatan": return <RadarAdminPage addToast={addToast} />;
      case "capaian": return <CapaianAdminPage addToast={addToast} />;
      case "profil-kecamatan": return <ProfilAdminPage addToast={addToast} />;
      case "daftar-admin": return <AdminPage addToast={addToast} currentUser={user} />;
      case "profil-admin": return <ProfilePage user={user} addToast={addToast} />;
      case "laporan": return <LaporanPage addToast={addToast} />;
      default: return <DashboardPage onNav={handleNav} />;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: ${BG}; font-family: 'Inter', system-ui, sans-serif; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${BG}; }
        ::-webkit-scrollbar-thumb { background: ${P}60; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${P}; }
        @keyframes slideInRight { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      <Toast toasts={toasts} removeToast={removeToast} />

      <ConfirmModal show={logoutConfirm} onConfirm={() => { setLogoutConfirm(false); onLogout(); }} onCancel={() => setLogoutConfirm(false)} icon="🚪" title="Konfirmasi Keluar" confirmText="🚪 Ya, Keluar" danger={false} msg="Apakah Anda yakin ingin keluar dari panel admin? Anda akan kembali ke halaman utama SIPENDUK." />

      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar active={activePage} onNav={handleNav} user={user} collapsed={collapsed} onViewSipenduk={onViewSipenduk} />
        <div style={{ flex: 1, marginLeft: collapsed ? 0 : 260, transition: "margin-left 0.3s ease", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <Topbar page={activePage} onToggleSidebar={() => setCollapsed(c => !c)} onLogout={() => setLogoutConfirm(true)} onViewSipenduk={onViewSipenduk} user={user} />
          <main style={{ flex: 1, padding: "1.75rem 2rem", overflowX: "hidden" }}>
            {renderContent()}
          </main>
          <footer style={{ background: W, borderTop: `1px solid ${BDR}`, padding: "0.875rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: M }}>
            <span>© 2025 Dinas Kependudukan dan Pencatatan Sipil Kota Tegal</span>
            <span style={{ color: P, fontWeight: 600 }}>SIPROYEKSI v1.0 — Data tersinkron dengan SIPENDUK User</span>
          </footer>
        </div>
      </div>
    </>
  );
}
