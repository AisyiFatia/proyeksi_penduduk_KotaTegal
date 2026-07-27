// ══════════════════════════════════════════════════════════════
//  ADMINDASHBOARD.JSX — Panel Admin SIPENDUK
//  Berisi: sidebar navigasi, dashboard admin, CRUD data
//  penduduk, prediksi KNN, grafik, manajemen periode/
//  indikator/piramida/radar/capaian/profil/admin, dan
//  laporan.
// ══════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { useAppContext } from "./AppContext.jsx";

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
  { id: "tambah-penduduk", icon: "📋", label: "Data Primer", indent: true },
  { id: "data-migrasi", icon: "📦", label: "Data Sekunder", indent: true },
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
  "tambah-penduduk": ["Dashboard", "Data Penduduk", "Data Primer"],
  "data-migrasi": ["Dashboard", "Data Penduduk", "Data Sekunder"],
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
              {["No", "Tahun", "Pindah", "Datang", "Kelahiran", "Kematian", "Penduduk"].map(h => (
                <th key={h} style={{ padding: "0.625rem 0.875rem", textAlign: "left", fontWeight: 700, color: P, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{recent.map((d, i) => (
              <tr key={d.id_penduduk} style={{ background: i % 2 === 0 ? W : BG }}>
                <td style={{ padding: "0.55rem 0.875rem", color: M }}>{i + 1}</td>
                <td style={{ padding: "0.55rem 0.875rem", fontWeight: 700, color: T }}>{d.tahun}</td>
                <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", color: DNG, fontWeight: 600 }}>{(d.jumlah_pindah || 0).toLocaleString()}</td>
                <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", color: SUC, fontWeight: 600 }}>{(d.jumlah_datang || 0).toLocaleString()}</td>
                <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", color: "#2563EB", fontWeight: 600 }}>{(d.jumlah_kelahiran || 0).toLocaleString()}</td>
                <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", color: WRN, fontWeight: 600 }}>{(d.jumlah_kematian || 0).toLocaleString()}</td>
                <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", color: T, fontWeight: 700 }}>{(d.jumlah_penduduk || 0).toLocaleString()}</td>
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
const NEW_FIELDS = [
  { k: "jml_pria", l: "Jumlah Penduduk Pria", g: "gender" },
  { k: "jml_perempuan", l: "Jumlah Penduduk Perempuan", g: "gender" },
  { k: "umur_0_4", l: "Penduduk Umur 0-4", g: "usia" },
  { k: "umur_5_18", l: "Penduduk Umur 5-18", g: "usia" },
  { k: "umur_15_64", l: "Penduduk Umur 15-64", g: "usia" },
  { k: "umur_65_plus", l: "Penduduk Umur 65+", g: "usia" },
  { k: "penduduk_tegal_selatan", l: "Penduduk Tegal Selatan", g: "kecamatan" },
  { k: "penduduk_tegal_timur", l: "Penduduk Tegal Timur", g: "kecamatan" },
  { k: "penduduk_tegal_barat", l: "Penduduk Tegal Barat", g: "kecamatan" },
  { k: "penduduk_margadana", l: "Penduduk Margadana", g: "kecamatan" },
  { k: "jml_miskin", l: "Jumlah Penduduk Miskin", g: "sosial" },
  { k: "pendapatan_per_kapita", l: "Pendapatan Per Kapita (ribu Rp)", g: "sosial" },
  { k: "jml_sekolah", l: "Jumlah Sekolah", g: "sosial" },
  { k: "jml_faskes", l: "Jumlah Faskes", g: "sosial" },
  { k: "jml_pekerja_formal", l: "Jumlah Pekerja Formal", g: "tenaga_kerja" },
  { k: "jml_pekerja_informal", l: "Jumlah Pekerja Informal", g: "tenaga_kerja" },
  { k: "jml_penganggur", l: "Jumlah Penganggur", g: "tenaga_kerja" },
  { k: "jml_pendidikan_sd", l: "Jumlah Pendidikan SD", g: "pendidikan" },
  { k: "jml_pendidikan_smp", l: "Jumlah Pendidikan SMP", g: "pendidikan" },
  { k: "jml_pendidikan_sma", l: "Jumlah Pendidikan SMA", g: "pendidikan" },
  { k: "jml_pendidikan_pt", l: "Jumlah Pendidikan PT", g: "pendidikan" },
];
const emptyForm = { id_priode: 1, tahun: 2024, jumlah_pindah: "", jumlah_datang: "", jumlah_kelahiran: "", jumlah_kematian: "", jumlah_penduduk: "" };



function ImportModalUI({ showImport, setShowImport, importRaw, setImportRaw, importPreview, setImportPreview, addToast, importPendudukPrimer, BDR, W, BG, DNG, SUC, WRN, M, T, P }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={e => { if (e.target === e.currentTarget) setShowImport(false); }}>
      <div style={{ background: W, borderRadius: 14, width: "100%", maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.22)", overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(135deg, #7C3AED, #A855F7)`, padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.3rem" }}>📤</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: W, fontSize: "1rem" }}>Import Data Primer</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.8)", marginTop: "0.15rem" }}>CSV / tab separated — kolom: tahun, pindah, datang, lahir, mati, penduduk (data migrasi primer)</div>
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
              <textarea value={importRaw} onChange={e => setImportRaw(e.target.value)} rows={6} placeholder={`tahun\tpindah\tdatang\tlahir\tmati\n2017\t5000\t4800\t3200\t2400`}
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
              const nums = parts.filter(p => p !== "").slice(0, 6).map(p => parseInt(p));
              if (nums.length < 6 || nums.some(n => isNaN(n))) { errors.push(`Baris ${i + 1}: format: tahun, pindah, datang, lahir, mati, penduduk`); return; }
              parsed.push({ tahun: nums[0], jumlah_pindah: nums[1], jumlah_datang: nums[2], jumlah_kelahiran: nums[3], jumlah_kematian: nums[4], jumlah_penduduk: nums[5] });
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
                  importPendudukPrimer(importPreview);
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
                    <th style={{ padding: "0.4rem 0.625rem", textAlign: "right", fontWeight: 700, color: "#7C3AED" }}>Penduduk</th>
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
                        <td style={{ padding: "0.3rem 0.625rem", textAlign: "right", fontFamily: "monospace", color: T, fontWeight: 700 }}>{r.jumlah_penduduk.toLocaleString()}</td>
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
  const { pendudukData, periodeData, addPendudukPrimer, updatePendudukPrimer, deletePendudukPrimer, importPendudukPrimer, clearAllPendudukPrimer } = useAppContext();
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
  const [showFormInline, setShowFormInline] = useState(false);
  const PER_PAGE = 10;

  const filtered = pendudukData.filter(d => {
    const val = d[filterCol]?.toString() || "";
    return val.toLowerCase().includes(search.toLowerCase());
  });
  const pages = Math.ceil(filtered.length / PER_PAGE);
  const pageData = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openAdd = () => { setEditId(null); setForm(emptyForm); setFormErrors({}); onNav("tambah-penduduk"); };
  const openEdit = (d) => { setEditId(d.id_penduduk); setForm({ ...d }); setFormErrors({}); setShowFormInline(true); };

  const validate = () => {
    const e = {};
    if (!form.id_priode) e.id_priode = "Pilih periode";
    if (!form.tahun || form.tahun < 1996) e.tahun = "Tahun tidak valid";
    ["jumlah_pindah", "jumlah_datang", "jumlah_kelahiran", "jumlah_kematian", "jumlah_penduduk"].forEach(f => {
      if (form[f] === "" || +form[f] < 0) e[f] = "Wajib diisi (≥ 0)";
    });
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setFormErrors(e); return; }
    const row = { ...form, jumlah_pindah: +form.jumlah_pindah, jumlah_datang: +form.jumlah_datang, jumlah_kelahiran: +form.jumlah_kelahiran, jumlah_kematian: +form.jumlah_kematian, jumlah_penduduk: +form.jumlah_penduduk };
    if (editId) {
      updatePendudukPrimer(editId, row);
      addToast("✅ Data diperbarui & tersinkron ke SIPENDUK User!", "success");
    } else {
      addPendudukPrimer(row);
      addToast("✅ Data ditambahkan & tersinkron ke SIPENDUK User!", "success");
    }
    setEditId(null); setForm(emptyForm); setFormErrors({}); setShowFormInline(false);
  };

  const doDelete = () => {
    deletePendudukPrimer(deleteId);
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

  // DETAIL VIEW (accessible from both views)
  if (detailId !== null) {
    const d = pendudukData.find(x => x.id_penduduk === detailId);
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
            { label: "Jumlah Pindah", val: (d.jumlah_pindah || 0).toLocaleString(), c: DNG },
            { label: "Jumlah Datang", val: (d.jumlah_datang || 0).toLocaleString(), c: SUC },
            { label: "Jumlah Kelahiran", val: (d.jumlah_kelahiran || 0).toLocaleString(), c: "#2563EB" },
            { label: "Jumlah Kematian", val: (d.jumlah_kematian || 0).toLocaleString(), c: WRN },
            { label: "Jumlah Penduduk", val: (d.jumlah_penduduk || 0).toLocaleString(), c: T },
          ].map(item => (
            <div key={item.label} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 10, padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: "0.68rem", color: M, textTransform: "uppercase", fontWeight: 600, marginBottom: "0.375rem" }}>{item.label}</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: item.c || T, fontFamily: "'JetBrains Mono',monospace" }}>{item.val}</div>
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

  // LANDING VIEW (daftar-penduduk)
  if (!showForm) {
    return (
      <div>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T, marginBottom: "1.25rem" }}>👥 Data Penduduk</h1>
        <p style={{ fontSize: "0.88rem", color: M, marginBottom: "1.5rem" }}>Kelola data kependudukan Kota Tegal — pilih menu di bawah:</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
          {[
            { icon: "📋", title: "Data Primer", desc: "Kelola data migrasi & jumlah penduduk (pindah, datang, lahir, mati, penduduk)", btn: "Buka Data Primer", nav: "tambah-penduduk" },
            { icon: "📦", title: "Data Sekunder", desc: "Kelola data detail (gender, usia, kecamatan, sosial, TK, pendidikan)", btn: "Buka Data Sekunder", nav: "data-migrasi" },
            { icon: "🔮", title: "Prediksi KNN", desc: "Proyeksi penduduk dengan algoritma KNN", btn: "Lihat Prediksi", nav: "prediksi-knn" },
          ].map(card => (
            <div key={card.nav} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{card.icon}</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: T, fontSize: "0.95rem", marginBottom: "0.375rem" }}>{card.title}</div>
              <div style={{ fontSize: "0.8rem", color: M, marginBottom: "1rem", lineHeight: 1.5, flex: 1 }}>{card.desc}</div>
              <button onClick={() => onNav(card.nav)} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.82rem", padding: "0.65rem", cursor: "pointer" }}>{card.btn}</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // FORM + TABLE (combined view — Data Primer)
  return (
    <div>
      <ConfirmModal show={deleteId !== null} onConfirm={doDelete} onCancel={() => setDeleteId(null)} />
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T }}>👥 Data Primer</h1>
        <div style={{ display: "flex", gap: "0.625rem" }}>
          {!showFormInline && !editId && <button onClick={() => { setEditId(null); setForm(emptyForm); setFormErrors({}); setShowFormInline(true); }} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.82rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}>➕ Tambah Data</button>}
          {showFormInline && !editId && <button onClick={() => { setShowFormInline(false); setForm(emptyForm); setFormErrors({}); }} style={{ background: `${M}15`, border: `1px solid ${M}`, borderRadius: 8, color: M, fontWeight: 600, fontSize: "0.82rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}>✕ Tutup Form</button>}
          <button onClick={() => {
            const rows = pendudukData.map(d => ({ ID: d.id_penduduk, Periode: d.id_priode, Tahun: d.tahun, Pindah: d.jumlah_pindah, Datang: d.jumlah_datang, Kelahiran: d.jumlah_kelahiran, Kematian: d.jumlah_kematian, Penduduk: d.jumlah_penduduk }));
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
      {/* Sync notice */}
      <div style={{ background: "#DBEAFE", border: "1.5px solid #2563EB", borderRadius: 8, padding: "0.625rem 1rem", marginBottom: "1rem", fontSize: "0.78rem", color: "#1D4ED8", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
        ℹ️ Data yang disimpan akan <strong>otomatis tersinkron</strong> ke tampilan SIPENDUK User secara real-time
      </div>
      {/* Form — hidden by default */}
      {(showFormInline || editId) && <div style={{ background: `linear-gradient(135deg, #FAFAFA, ${W})`, border: `1.5px solid ${P}40`, borderRadius: 12, padding: "2rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: "1.5rem" }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.95rem", fontWeight: 700, color: T, marginBottom: "1rem" }}>{editId ? "✏️ Edit" : "➕ Tambah"} Data Primer</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <div>
            {inp("id_priode", "ID Periode", "select", { options: periodeData.map(p => ({ val: p.id_priode, label: p.nama_priode }) ) })}
            {inp("tahun", "Tahun", "number", { min: 1996 })}
          </div>
          <div>
            {inp("jumlah_pindah", "Jumlah Pindah")}
            {inp("jumlah_datang", "Jumlah Datang")}
            {inp("jumlah_kelahiran", "Jumlah Kelahiran")}
            {inp("jumlah_kematian", "Jumlah Kematian")}
            {inp("jumlah_penduduk", "Jumlah Penduduk")}
          </div>
        </div>
        <hr style={{ border: "none", borderTop: `1px solid ${BDR}`, margin: "1.25rem 0" }} />
        <div style={{ display: "flex", gap: "0.875rem" }}>
          <button onClick={handleSubmit} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.88rem", padding: "0.75rem 2rem", cursor: "pointer", boxShadow: `0 3px 12px ${P}44` }}>💾 Simpan</button>
          {editId && <button onClick={() => { setEditId(null); setForm(emptyForm); setFormErrors({}); setShowFormInline(false); }} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 8, color: M, fontWeight: 600, fontSize: "0.88rem", padding: "0.75rem 1.5rem", cursor: "pointer" }}>↩ Batal</button>}
        </div>
      </div>}

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
              {["Aksi", "No", "ID", "Tahun", "Pindah", "Datang", "Kelahiran", "Kematian", "Penduduk"].map(h => (
                <th key={h} style={{ padding: "0.75rem 0.875rem", textAlign: "left", color: W, fontWeight: 700, fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: "3rem", textAlign: "center", color: M }}>
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
                  <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", fontWeight: 600, color: DNG }}>{(d.jumlah_pindah || 0).toLocaleString()}</td>
                  <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", fontWeight: 600, color: SUC }}>{(d.jumlah_datang || 0).toLocaleString()}</td>
                  <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", fontWeight: 600, color: "#2563EB" }}>{(d.jumlah_kelahiran || 0).toLocaleString()}</td>
                  <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", fontWeight: 600, color: WRN }}>{(d.jumlah_kematian || 0).toLocaleString()}</td>
                  <td style={{ padding: "0.55rem 0.875rem", fontFamily: "monospace", fontWeight: 700, color: T }}>{(d.jumlah_penduduk || 0).toLocaleString()}</td>
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
              <button onClick={() => { clearAllPendudukPrimer(); setClearConfirm(false); addToast("✅ Semua data primer berhasil dihapus!", "success"); }} style={{ background: `linear-gradient(135deg, ${DNG}, #B91C1C)`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.85rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}>🗑️ Ya, Hapus Semua</button>
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
          importPendudukPrimer={importPendudukPrimer}
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

  const PENDUDUK_INDIKATOR = [
    { id: "jumlah_penduduk", label: "Proyeksi Jumlah Penduduk", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_laki", label: "Proyeksi Penduduk Laki-laki", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_perempuan", label: "Proyeksi Penduduk Perempuan", satuan: "jiwa", src: "penduduk" },
    { id: "pertumbuhan_penduduk", label: "Proyeksi Pertumbuhan Penduduk", satuan: "%", src: "penduduk" },
    { id: "proyeksi_usia", label: "Proyeksi Penduduk Usia (0-4, 5-18, 15-64, 65+)", satuan: "jiwa", src: "penduduk" },
    { id: "kepadatan_penduduk", label: "Proyeksi Kepadatan Penduduk", satuan: "jiwa/km²", src: "penduduk" },
    { id: "proyeksi_sex_ratio", label: "Proyeksi Rasio Jenis Kelamin", satuan: "per 100 perempuan", src: "penduduk" },
    { id: "rasio_ketergantungan", label: "Proyeksi Rasio Ketergantungan", satuan: "per 100 produktif", src: "penduduk" },
    { id: "proyeksi_pendidikan", label: "Proyeksi Pendidikan (SD–PT)", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_miskin", label: "Proyeksi Penduduk Miskin", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_pendapatan", label: "Proyeksi Pendapatan per Kapita", satuan: "ribu Rp", src: "penduduk" },
    { id: "proyeksi_sekolah", label: "Proyeksi Jumlah Sekolah", satuan: "unit", src: "penduduk" },
    { id: "proyeksi_faskes", label: "Proyeksi Jumlah Faskes", satuan: "unit", src: "penduduk" },
    { id: "proyeksi_pekerjaan_formal", label: "Proyeksi Pekerja Formal", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_pekerjaan_informal", label: "Proyeksi Pekerja Informal", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_penganggur", label: "Proyeksi Penganggur", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_kecamatan_ts", label: "Proyeksi Tegal Selatan", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_kecamatan_tt", label: "Proyeksi Tegal Timur", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_kecamatan_tb", label: "Proyeksi Tegal Barat", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_kecamatan_m", label: "Proyeksi Margadana", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_kelahiran", label: "Proyeksi Jumlah Kelahiran", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_kematian", label: "Proyeksi Jumlah Kematian", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_datang", label: "Proyeksi Jumlah Datang", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_pindah", label: "Proyeksi Jumlah Pindah", satuan: "jiwa", src: "penduduk" },
    { id: "proyeksi_pertumbuhan_bersih", label: "Proyeksi Pertumbuhan Bersih (Datang+Lahir−Pindah−Mati)", satuan: "jiwa", src: "penduduk" },
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
      const SUM_MAP = {
        proyeksi_usia: ["umur_0_4", "umur_5_18", "umur_15_64", "umur_65_plus"],
        proyeksi_pendidikan: ["jml_pendidikan_sd", "jml_pendidikan_smp", "jml_pendidikan_sma", "jml_pendidikan_pt"],
      };
      const sumFields = SUM_MAP[selInd];
      if (sumFields) {
        const tahunMap = {};
        for (const s of sortedStats) {
          tahunMap[s.tahun] = sumFields.reduce((acc, f) => acc + (s[f] || 0), 0);
        }
        return Object.entries(tahunMap).sort((a, b) => a[0] - b[0]).map(([tahun, nilai]) => ({ tahun: +tahun, nilai }));
      }
      if (selInd === "jumlah_penduduk") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jumlah_penduduk || 0 }));
      if (selInd === "proyeksi_laki") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jml_pria || 0 }));
      if (selInd === "proyeksi_perempuan") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jml_perempuan || 0 }));
      if (selInd === "proyeksi_sex_ratio") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jml_perempuan ? parseFloat(((s.jml_pria || 0) / s.jml_perempuan * 100).toFixed(2)) : 0 }));
      if (selInd === "proyeksi_miskin") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jml_miskin || 0 }));
      if (selInd === "proyeksi_pendapatan") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.pendapatan_per_kapita || 0 }));
      if (selInd === "proyeksi_sekolah") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jml_sekolah || 0 }));
      if (selInd === "proyeksi_faskes") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jml_faskes || 0 }));
      if (selInd === "proyeksi_pekerjaan_formal") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jml_pekerja_formal || 0 }));
      if (selInd === "proyeksi_pekerjaan_informal") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jml_pekerja_informal || 0 }));
      if (selInd === "proyeksi_penganggur") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jml_penganggur || 0 }));
      if (selInd === "proyeksi_kecamatan_ts") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.penduduk_tegal_selatan || 0 }));
      if (selInd === "proyeksi_kecamatan_tt") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.penduduk_tegal_timur || 0 }));
      if (selInd === "proyeksi_kecamatan_tb") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.penduduk_tegal_barat || 0 }));
      if (selInd === "proyeksi_kecamatan_m") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.penduduk_margadana || 0 }));
      if (selInd === "proyeksi_kelahiran") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jumlah_kelahiran || 0 }));
      if (selInd === "proyeksi_kematian") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jumlah_kematian || 0 }));
      if (selInd === "proyeksi_datang") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jumlah_datang || 0 }));
      if (selInd === "proyeksi_pindah") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jumlah_pindah || 0 }));
      if (selInd === "proyeksi_pertumbuhan_bersih") return sortedStats.map(s => ({ tahun: s.tahun, nilai: (s.jumlah_datang || 0) + (s.jumlah_kelahiran || 0) - (s.jumlah_pindah || 0) - (s.jumlah_kematian || 0) }));
      if (selInd === "kepadatan_penduduk") return sortedStats.map(s => ({ tahun: s.tahun, nilai: s.jumlah_penduduk ? parseFloat((s.jumlah_penduduk / 39.68).toFixed(2)) : 0 }));
      if (selInd === "rasio_ketergantungan") return sortedStats.map(s => {
        const produktif = s.umur_15_64 || 0;
        return { tahun: s.tahun, nilai: produktif ? parseFloat((((s.umur_0_4 || 0) + (s.umur_65_plus || 0)) / produktif * 100).toFixed(2)) : 0 };
      });
      if (selInd === "pertumbuhan_penduduk") {
        const hasil = [];
        if (sortedStats.length) {
          for (let i = 0; i < sortedStats.length; i++) {
            const s = sortedStats[i];
            if (i === 0) { hasil.push({ tahun: s.tahun, nilai: 0 }); continue; }
            const prev = sortedStats[i - 1];
            const popPrev = prev.jumlah_penduduk || 0;
            const popCurr = s.jumlah_penduduk || 0;
            if (popPrev === 0) { hasil.push({ tahun: s.tahun, nilai: 0 }); continue; }
            hasil.push({ tahun: s.tahun, nilai: parseFloat((((popCurr - popPrev) / popPrev) * 100).toFixed(2)) });
          }
        }
        return hasil;
      }
      return [];
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
    const apiKey = import.meta.env.VITE_ZEN_API_KEY;
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
                const fields = isUsia ? ["umur_0_4", "umur_5_18", "umur_15_64", "umur_65_plus"] : ["jml_pendidikan_sd", "jml_pendidikan_smp", "jml_pendidikan_sma", "jml_pendidikan_pt"];
                const labels = isUsia ? ["0–4", "5–18", "15–64", "65+"] : ["SD", "SMP", "SMA", "PT"];
                const colors = isUsia ? ["#0D9488", "#2563EB", "#D97706", "#7C3AED"] : ["#0D9488", "#2563EB", "#D97706", "#7C3AED"];
                const getFieldVal = (field, tahun) => { const d = sortedStats.find(s => s.tahun === tahun); return d ? (d[field] || 0) : null; };
                const getPred = (field, year) => {
                  const years = sortedStats.map(s => s.tahun);
                  const vals = sortedStats.map(s => s[field] || 0);
                  if (vals.length < 2) return 0;
                  const lastYear = years[years.length - 1];
                  if (year <= lastYear) return getFieldVal(field, year) || 0;
                  let result = [...vals];
                  for (let y = lastYear + 1; y <= year; y++) {
                    result.push(knnPredict(result, Math.min(3, result.length - 1)));
                  }
                  return result[result.length - 1];
                };
                return (
                  <div style={{ display: "flex", gap: "0.75rem", padding: "0 1.5rem 1.5rem", flexWrap: "wrap" }}>
                    {fields.map((field, i) => {
                      const v2024 = getFieldVal(field, 2024) || getPred(field, 2024);
                      const v2030 = getPred(field, 2030);
                      const v2035 = getPred(field, 2035);
                      return ["2024", "2030", "2035"].map((tahun, j) => {
                        const val = tahun === "2024" ? v2024 : tahun === "2030" ? v2030 : v2035;
                        if (val == null || val === 0) return null;
                        return (
                          <div key={`${field}-${tahun}`} style={{ flex: 1, minWidth: 100, textAlign: "center", background: BG, border: `1.5px solid ${colors[i]}40`, borderRadius: 10, padding: "0.625rem 0.75rem" }}>
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
  const EMPTY_FORM = { username: "", nama: "", password: "", level: "admin", status: 1, nip: "", tempat_lahir: "", tanggal_lahir: "", pangkat: "", status_kepegawaian: "" };
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const dateInputRef = useRef(null);

  const BULAN_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const JABATAN_LIST = [
    "Kepala Dinas",
    "Sekretaris Dinas",
    "Bagian Perencanaan dan Keuangan",
    "Bagian Umum dan Kepegawaian",
    "Bidang Pelayanan Pendaftaran Penduduk",
    "Bidang PIAK dan Pemanfaatan Data",
    "Bidang Pelayanan Pencatatan Sipil",
    "Analisis Kebijakan Muda",
  ];

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

  const inputStyle = { width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${BDR}`, borderRadius: 8, fontSize: "0.85rem", color: T, outline: "none", boxSizing: "border-box", background: W };
  const selectStyle = { width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${BDR}`, borderRadius: 8, fontSize: "0.85rem", color: T, outline: "none", cursor: "pointer", background: W };
  const labelStyle = { display: "block", fontSize: "0.72rem", fontWeight: 700, color: P, textTransform: "uppercase", marginBottom: "0.375rem" };
  const subLabelStyle = { display: "block", fontSize: "0.65rem", fontWeight: 600, color: M, marginBottom: "0.3rem", textTransform: "uppercase" };

  // ── jQuery UI Datepicker init ─────────────────────────────────
  useEffect(() => {
    if (!showForm || !dateInputRef.current) return;
    const $ = window.$;
    if (!$ || !$.fn?.datepicker) return;
    const $el = $(dateInputRef.current);
    // destroy dulu jika sudah ada
    if ($el.hasClass("hasDatepicker")) $el.datepicker("destroy");
    $el.datepicker({
      dateFormat: "dd MM yy",
      changeMonth: true,
      changeYear: true,
      yearRange: "1950:+0",
      showOtherMonths: true,
      selectOtherMonths: true,
      showButtonPanel: true,
      currentText: "Hari Ini",
      closeText: "Tutup",
      monthNames: ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"],
      monthNamesShort: ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"],
      dayNames: ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"],
      dayNamesShort: ["Min","Sen","Sel","Rab","Kam","Jum","Sab"],
      dayNamesMin: ["Mi","Sn","Sl","Rb","Km","Jm","Sb"],
      onSelect: (dateString) => {
        setForm(p => ({ ...p, tanggal_lahir: dateString }));
      },
    });
    // Set nilai jika edit
    if (form.tanggal_lahir) $el.datepicker("setDate", form.tanggal_lahir);
    return () => {
      if ($el.hasClass("hasDatepicker")) $el.datepicker("destroy");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  const handleSubmit = () => {
    if (!form.username.trim() || form.username.length < 5) { addToast("Username minimal 5 karakter!", "error"); return; }
    if (!form.nama.trim()) { addToast("Nama lengkap wajib diisi!", "error"); return; }
    if (!editId && !form.password) { addToast("Password wajib diisi!", "error"); return; }
    if (!form.nip.trim()) { addToast("NIP wajib diisi!", "error"); return; }
    if (!form.tempat_lahir.trim()) { addToast("Tempat lahir wajib diisi!", "error"); return; }
    if (!form.tanggal_lahir?.trim()) { addToast("Tanggal lahir wajib diisi!", "error"); return; }
    if (!form.pangkat) { addToast("Pangkat/Jabatan wajib dipilih!", "error"); return; }
    if (!form.status_kepegawaian) { addToast("Status kepegawaian wajib dipilih!", "error"); return; }
    const payload = { username: form.username, nama: form.nama, level: form.level, status: form.status, nip: form.nip, tempat_lahir: form.tempat_lahir, tanggal_lahir: form.tanggal_lahir, pangkat: form.pangkat, status_kepegawaian: form.status_kepegawaian };
    // Sertakan password jika ada (saat tambah wajib, saat edit opsional)
    if (form.password) payload.password = form.password;
    if (editId) { updateAdminUser(editId, payload); addToast("Admin diperbarui!", "success"); }
    else {
      if (adminUsers.some(a => a.username === form.username)) { addToast("Username sudah digunakan!", "error"); return; }
      addAdminUser(payload);
      addToast("Admin ditambahkan!", "success");
    }
    setForm(EMPTY_FORM); setEditId(null); setShowForm(false);
  };

  // tanggal_lahir sekarang string langsung dari datepicker, misal "08 Februari 1985"
  const formatTgl = (tgl) => {
    if (!tgl || typeof tgl !== "string" || !tgl.trim()) return null;
    // handle legacy object format {tanggal, bulan, tahun}
    if (typeof tgl === "object" && tgl.tanggal) {
      return `${tgl.tanggal} ${BULAN_NAMES[parseInt(tgl.bulan, 10) - 1]} ${tgl.tahun}`;
    }
    return tgl;
  };

  return (
    <div>
      <ConfirmModal show={!!deleteId} onConfirm={() => { deleteAdminUser(deleteId); setDeleteId(null); addToast("Admin dihapus!", "success"); }} onCancel={() => setDeleteId(null)} />
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T }}>👤 Manajemen Akun Admin</h1>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM); }}
          style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.82rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}>
          {showForm ? "✖ Tutup" : "➕ Tambah Admin"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "1.5rem", marginBottom: "1.25rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Username (min. 5 karakter) <span style={{ color: DNG }}>*</span></label>
              <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="cth: budi_admin" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>NIP <span style={{ color: DNG }}>*</span></label>
              <input
                value={form.nip}
                onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 18); setForm(p => ({ ...p, nip: v })); }}
                placeholder="cth: 198501012010011001"
                maxLength={18}
                inputMode="numeric"
                style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.04em" }}
              />
              <div style={{ fontSize: "0.62rem", color: M, marginTop: "0.2rem" }}>{form.nip.length}/18 karakter</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
            <div>
              <label style={labelStyle}>Nama Lengkap <span style={{ color: DNG }}>*</span></label>
              <input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} placeholder="cth: Budi Santoso" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password {!editId && <span style={{ color: DNG }}>*</span>}</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder={editId ? "Kosongkan jika tidak diubah" : "Min. 6 karakter"}
                  style={{ ...inputStyle, paddingRight: "2.5rem" }} />
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
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
            <div>
              <label style={labelStyle}>Level Akses</label>
              <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} style={selectStyle}>
                <option value="superadmin">Super Admin</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Pangkat / Jabatan <span style={{ color: DNG }}>*</span></label>
              <select value={form.pangkat} onChange={e => setForm(p => ({ ...p, pangkat: e.target.value }))} style={{ ...selectStyle, color: form.pangkat ? T : M }}>
                <option value="" disabled>-- Pilih Jabatan --</option>
                {JABATAN_LIST.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          </div>

          <div style={{ height: "1px", background: BDR, margin: "1.25rem 0" }} />

          <div>
            <label style={labelStyle}>Tempat &amp; Tanggal Lahir <span style={{ color: DNG }}>*</span></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", alignItems: "flex-start" }}>
              {/* Tempat Lahir */}
              <div>
                <label style={subLabelStyle}>Tempat Lahir</label>
                <input
                  value={form.tempat_lahir}
                  onChange={e => setForm(p => ({ ...p, tempat_lahir: e.target.value }))}
                  placeholder="cth: Tegal"
                  style={inputStyle}
                />
              </div>
              {/* Tanggal Lahir — jQuery UI Datepicker */}
              <div>
                <label style={subLabelStyle}>Tanggal Lahir</label>
                <div style={{ position: "relative" }}>
                  <input
                    ref={dateInputRef}
                    id="sipenduk-datepicker"
                    readOnly
                    placeholder="Klik untuk pilih tanggal..."
                    defaultValue={form.tanggal_lahir || ""}
                    style={{
                      ...inputStyle,
                      cursor: "pointer",
                      paddingRight: "2.5rem",
                      color: form.tanggal_lahir ? T : M,
                    }}
                  />
                  <span style={{
                    position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)",
                    fontSize: "1rem", pointerEvents: "none",
                  }}>📅</span>
                </div>
                {form.tanggal_lahir && (
                  <div style={{ fontSize: "0.62rem", color: P, marginTop: "0.2rem", fontWeight: 600 }}>📌 {form.tanggal_lahir}</div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <label style={labelStyle}>Status Kepegawaian <span style={{ color: DNG }}>*</span></label>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center", padding: "0.875rem 1rem", background: BG, borderRadius: 8, border: `1.5px solid ${BDR}` }}>
              {[
                { val: "PNS",            icon: "🏛️", color: P },
                { val: "PPPK",           icon: "📋", color: NA },
                { val: "Honorer / Non ASN", icon: "👤", color: WRN },
              ].map(opt => (
                <label key={opt.val} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="status_kepegawaian_radio"
                    value={opt.val}
                    checked={form.status_kepegawaian === opt.val}
                    onChange={() => setForm(p => ({ ...p, status_kepegawaian: opt.val }))}
                    style={{ accentColor: opt.color, width: "1.05rem", height: "1.05rem", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.84rem", fontWeight: 700, color: opt.color }}>
                    {opt.icon} {opt.val}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            <button onClick={handleSubmit} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.85rem", padding: "0.65rem 1.5rem", cursor: "pointer" }}>💾 Simpan</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 8, color: M, fontWeight: 600, fontSize: "0.85rem", padding: "0.65rem 1.25rem", cursor: "pointer" }}>↩ Batal</button>
          </div>
        </div>
      )}
      <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: "1200px" }}>
          <thead><tr style={{ background: `linear-gradient(135deg, ${P}, ${PL})` }}>
            {["Aksi", "No", "Username", "Nama Lengkap", "NIP", "Tempat Lahir", "Tanggal Lahir", "Pangkat / Jabatan", "Level", "Status Kepegawaian"].map(h => (
              <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: W, fontWeight: 700, fontSize: "0.67rem", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{adminUsers.map((a, i) => (
            <tr key={a.id_admin} style={{ background: i % 2 === 0 ? W : BG }}>
              <td style={{ padding: "0.6rem 1rem", whiteSpace: "nowrap" }}>
                <button onClick={() => {
                  setEditId(a.id_admin);
                  setForm({
                    username: a.username, nama: a.nama, password: "", level: a.level, status: a.status,
                    nip: a.nip || "", tempat_lahir: a.tempat_lahir || "",
                    tanggal_lahir: typeof a.tanggal_lahir === "object" && a.tanggal_lahir?.tanggal
                      ? `${a.tanggal_lahir.tanggal} ${BULAN_NAMES[parseInt(a.tanggal_lahir.bulan, 10) - 1]} ${a.tanggal_lahir.tahun}`
                      : (a.tanggal_lahir || ""),
                    pangkat: a.pangkat || "", status_kepegawaian: a.status_kepegawaian || "",
                  });
                  setShowForm(true);
                }} style={{ background: `${WRN}15`, border: `1px solid ${WRN}40`, borderRadius: 5, color: WRN, fontWeight: 600, fontSize: "0.7rem", padding: "0.25rem 0.5rem", cursor: "pointer", marginRight: 4 }}>✏️</button>
                {a.username !== currentUser?.username && (
                  <button onClick={() => setDeleteId(a.id_admin)} style={{ background: `${DNG}15`, border: `1px solid ${DNG}40`, borderRadius: 5, color: DNG, fontWeight: 600, fontSize: "0.7rem", padding: "0.25rem 0.5rem", cursor: "pointer" }}>🗑️</button>
                )}
              </td>
              <td style={{ padding: "0.6rem 1rem", color: M }}>{i + 1}</td>
              <td style={{ padding: "0.6rem 1rem", fontFamily: "monospace", color: P, fontWeight: 700 }}>@{a.username}</td>
              <td style={{ padding: "0.6rem 1rem", color: T, fontWeight: 600 }}>{a.nama}</td>
              <td style={{ padding: "0.6rem 1rem", fontFamily: "monospace", color: M, fontSize: "0.78rem" }}>{a.nip || <span style={{ color: BDR }}>—</span>}</td>
              <td style={{ padding: "0.6rem 1rem", color: T }}>{a.tempat_lahir || <span style={{ color: BDR }}>—</span>}</td>
              <td style={{ padding: "0.6rem 1rem", color: T, whiteSpace: "nowrap", minWidth: "140px" }}>
                {formatTgl(a.tanggal_lahir) || <span style={{ color: BDR }}>—</span>}
              </td>
              <td style={{ padding: "0.6rem 1rem" }}>
                {a.pangkat
                  ? <span style={{ background: `${P}10`, border: `1px solid ${P}30`, color: P, borderRadius: 20, padding: "0.2rem 0.625rem", fontSize: "0.68rem", fontWeight: 700, whiteSpace: "nowrap" }}>{a.pangkat}</span>
                  : <span style={{ color: BDR }}>—</span>}
              </td>
              <td style={{ padding: "0.6rem 1rem" }}>
                <span style={{ background: a.level === "superadmin" ? `${P}15` : `${NA}15`, border: `1px solid ${a.level === "superadmin" ? P : NA}40`, color: a.level === "superadmin" ? P : NA, borderRadius: 20, padding: "0.2rem 0.625rem", fontSize: "0.68rem", fontWeight: 700 }}>
                  {a.level === "superadmin" ? "Super Admin" : "Admin"}
                </span>
              </td>
              <td style={{ padding: "0.6rem 1rem" }}>
                {a.status_kepegawaian ? (
                  <span style={{
                    background: a.status_kepegawaian === "PNS" ? `${P}15` : a.status_kepegawaian === "PPPK" ? `${NA}15` : `${WRN}15`,
                    border: `1px solid ${a.status_kepegawaian === "PNS" ? P : a.status_kepegawaian === "PPPK" ? NA : WRN}40`,
                    color: a.status_kepegawaian === "PNS" ? P : a.status_kepegawaian === "PPPK" ? NA : WRN,
                    borderRadius: 20, padding: "0.2rem 0.625rem", fontSize: "0.68rem", fontWeight: 700, whiteSpace: "nowrap"
                  }}>
                    {a.status_kepegawaian === "PNS" ? "🏛️ PNS" : a.status_kepegawaian === "PPPK" ? "📋 PPPK" : "👤 Honorer / Non ASN"}
                  </span>
                ) : <span style={{ color: BDR }}>—</span>}
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
  const { adminUsers } = useAppContext();
  const admin = adminUsers.find(a => a.username === user?.username);
  const [formPw, setFormPw] = useState({ lama: "", baru: "", konfirm: "" });
  const [showPw, setShowPw] = useState({ lama: false, baru: false, konfirm: false });

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

          <button onClick={handleChangePassword}
            style={{ width: "100%", background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.88rem", padding: "0.75rem 1.5rem", cursor: "pointer", marginTop: "0.5rem" }}>
            🔐 Simpan Password Baru
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  DATA SEKUNDER PAGE — 21 Field Detail (Gender, Usia, Kecamatan, Sosial, TK, Pendidikan)
// ══════════════════════════════════════════════════════════════
function MigrasiPage({ addToast }) {
  const { pendudukData, periodeData, addPendudukSekunder, updatePendudukSekunder, deletePendudukSekunder } = useAppContext();
  const INIT = { id_priode: "", tahun: "" };
  NEW_FIELDS.forEach(f => { INIT[f.k] = ""; });
  const [form, setForm] = useState(INIT);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [errors, setErrors] = useState({});
  const [showImport, setShowImport] = useState(false);
  const [importRaw, setImportRaw] = useState("");
  const [importPreview, setImportPreview] = useState([]);
  const [showFormInline, setShowFormInline] = useState(false);

  const SEKUNDER_KEYS = NEW_FIELDS.map(f => f.k);
  const sekunderData = pendudukData.filter(d => SEKUNDER_KEYS.some(k => (d[k] ?? 0) > 0));

  const validate = () => {
    const e = {};
    if (!form.id_priode) e.id_priode = "Pilih periode";
    if (!form.tahun || form.tahun < 1996) e.tahun = "Tahun tidak valid";
    ["jml_pria", "jml_perempuan"].forEach(f => {
      if (form[f] === "" || +form[f] < 0) e[f] = "Wajib diisi (≥ 0)";
    });
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const row = { id_priode: +form.id_priode, tahun: +form.tahun };
    NEW_FIELDS.forEach(f => { row[f.k] = form[f.k] === "" ? 0 : +form[f.k]; });
    if (editId) { updatePendudukSekunder(editId, row); addToast("✅ Data sekunder diperbarui!", "success"); }
    else { addPendudukSekunder(row); addToast("✅ Data sekunder ditambahkan!", "success"); }
    setForm(INIT); setEditId(null); setShowFormInline(false);
  };

  const inp = (key, label, type, opts = {}) => {
    const err = errors[key];
    if (type === "select") {
      return (
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: P, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.3rem" }}>{label}</label>
          <select value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
            style={{ width: "100%", padding: "0.55rem 0.75rem", border: `1.5px solid ${err ? DNG : BDR}`, borderRadius: 7, fontSize: "0.82rem", outline: "none" }}>
            <option value="">-- Pilih --</option>
            {(opts.options || []).map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
          {err && <div style={{ fontSize: "0.65rem", color: DNG, marginTop: "0.2rem" }}>⚠ {err}</div>}
        </div>
      );
    }
    return (
      <div style={{ marginBottom: "0.75rem" }}>
        <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: P, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.3rem" }}>{label}</label>
        <input type="number" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} min={0} placeholder="0"
          style={{ width: "100%", padding: "0.55rem 0.75rem", border: `1.5px solid ${err ? DNG : BDR}`, borderRadius: 7, fontSize: "0.82rem", outline: "none", boxSizing: "border-box" }} />
        {err && <div style={{ fontSize: "0.65rem", color: DNG, marginTop: "0.2rem" }}>⚠ {err}</div>}
      </div>
    );
  };

  const GROUPS = [
    { title: "👫 Jenis Kelamin", g: "gender" },
    { title: "👶 Kelompok Usia", g: "usia" },
    { title: "📍 Per Kecamatan", g: "kecamatan" },
    { title: "📊 Sosial Ekonomi", g: "sosial" },
    { title: "💼 Tenaga Kerja", g: "tenaga_kerja" },
    { title: "📚 Pendidikan", g: "pendidikan" },
  ];

  return (
    <div>
      <ConfirmModal show={deleteId !== null} onConfirm={() => { deletePendudukSekunder(deleteId); setDeleteId(null); addToast("Data sekunder dihapus!", "success"); }} onCancel={() => setDeleteId(null)} />
      <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: T, marginBottom: "1.25rem" }}>📊 Data Sekunder — Detail Penduduk</h1>
      <div style={{ background: "#F0FDF4", border: "1.5px solid #22C55E", borderRadius: 8, padding: "0.625rem 1rem", marginBottom: "1.25rem", fontSize: "0.78rem", color: "#166534", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
        ℹ️ Data sekunder (gender, usia, kecamatan, sosial, tenaga kerja, pendidikan) dipisah dari data primer migrasi.
      </div>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
        {!showFormInline && !editId && <button onClick={() => { setEditId(null); setForm(INIT); setErrors({}); setShowFormInline(true); }} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 8, color: W, fontWeight: 700, fontSize: "0.82rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}>➕ Tambah Data Sekunder</button>}
        {showFormInline && !editId && <button onClick={() => { setShowFormInline(false); setForm(INIT); setErrors({}); }} style={{ background: `${M}15`, border: `1px solid ${M}`, borderRadius: 8, color: M, fontWeight: 600, fontSize: "0.82rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}>✕ Tutup Form</button>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem" }}>
        {(showFormInline || editId) && <div style={{ background: `linear-gradient(135deg, #FAFAFA, ${W})`, border: `1.5px solid ${P}40`, borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.95rem", fontWeight: 700, color: T, marginBottom: "1rem" }}>{editId ? "✏️ Edit" : "➕ Tambah"} Data Sekunder</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.75rem" }}>
            <div>{inp("id_priode", "ID Periode", "select", { options: periodeData.map(p => ({ val: p.id_priode, label: p.nama_priode }) ) })}</div>
            <div>{inp("tahun", "Tahun", "number", { min: 1996 })}</div>
          </div>
          {GROUPS.map(group => (
            <div key={group.g}>
              <hr style={{ border: "none", borderTop: `1px solid ${BDR}`, margin: "0.5rem 0" }} />
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.78rem", fontWeight: 700, color: P, marginBottom: "0.5rem" }}>{group.title}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {NEW_FIELDS.filter(f => f.g === group.g).map(f => (
                  <div key={f.k}>{inp(f.k, f.l)}</div>
                ))}
              </div>
            </div>
          ))}
          <hr style={{ border: "none", borderTop: `1px solid ${BDR}`, margin: "0.75rem 0" }} />
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={handleSubmit} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 7, color: W, fontWeight: 700, fontSize: "0.82rem", padding: "0.6rem 1.5rem", cursor: "pointer" }}>💾 Simpan</button>
            {editId && <button onClick={() => { setForm(INIT); setEditId(null); setShowFormInline(false); }} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 7, color: M, fontWeight: 600, fontSize: "0.82rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}>↩ Batal</button>}
          </div>
        </div>}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.85rem", fontWeight: 700, color: T }}>📋 Data Sekunder Tersimpan</div>
            <div style={{ display: "flex", gap: "0.375rem" }}>
              <button onClick={() => { setShowImport(true); setImportRaw(""); setImportPreview([]); }} style={{ background: `linear-gradient(135deg, #7C3AED, #A855F7)`, border: "none", borderRadius: 6, color: W, fontSize: "0.7rem", padding: "0.35rem 0.7rem", cursor: "pointer", fontWeight: 600 }}>📤 Import CSV</button>
              <button onClick={() => {
                const csvRows = [["tahun", ...NEW_FIELDS.map(f => f.k)].join(",")];
                sekunderData.forEach(d => { csvRows.push([d.tahun, ...NEW_FIELDS.map(f => d[f.k] ?? 0)].join(",")); });
                const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `data_sekunder_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
                addToast("✅ Data sekunder CSV siap!", "success");
              }} style={{ background: "transparent", border: `1px solid ${BDR}`, borderRadius: 6, color: M, fontSize: "0.7rem", padding: "0.35rem 0.7rem", cursor: "pointer" }}>📥 Export CSV</button>
            </div>
          </div>
          {sekunderData.length === 0 ? (
            <div style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, padding: "2rem", textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📭</div>
              <div style={{ fontWeight: 700, color: T }}>Belum ada data sekunder</div>
              <div style={{ fontSize: "0.78rem", color: M, marginTop: "0.25rem" }}>Gunakan form di samping untuk menambah data</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {sekunderData.map((d, i) => (
                <div key={d.id_penduduk} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1.25rem", background: `linear-gradient(135deg, ${P}08, ${PL}08)`, borderBottom: `1px solid ${BDR}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1rem", fontWeight: 800, color: T }}>📅 {d.tahun}</span>
                      <span style={{ fontSize: "0.7rem", color: M, background: BG, padding: "0.2rem 0.5rem", borderRadius: 4 }}>#{d.id_penduduk}</span>
                    </div>
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      <button onClick={() => { setEditId(d.id_penduduk); const f = { id_priode: d.id_priode, tahun: d.tahun }; NEW_FIELDS.forEach(fi => { f[fi.k] = d[fi.k] ?? ""; }); setForm(f); setShowFormInline(true); }} style={{ background: `${WRN}15`, border: `1px solid ${WRN}40`, borderRadius: 6, color: WRN, fontWeight: 600, fontSize: "0.7rem", padding: "0.3rem 0.6rem", cursor: "pointer" }}>✏️ Edit</button>
                      <button onClick={() => setDeleteId(d.id_penduduk)} style={{ background: `${DNG}15`, border: `1px solid ${DNG}40`, borderRadius: 6, color: DNG, fontWeight: 600, fontSize: "0.7rem", padding: "0.3rem 0.6rem", cursor: "pointer" }}>🗑️ Hapus</button>
                    </div>
                  </div>
                  <div style={{ padding: "1rem 1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.625rem" }}>
                    {GROUPS.map(group => (
                      <div key={group.g} style={{ background: BG, borderRadius: 8, padding: "0.75rem" }}>
                        <div style={{ fontSize: "0.62rem", fontWeight: 700, color: P, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>{group.title}</div>
                        {NEW_FIELDS.filter(f => f.g === group.g).map(f => {
                          const val = d[f.k] ?? 0;
                          return (
                            <div key={f.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0", borderBottom: `1px solid ${BDR}40`, fontSize: "0.72rem" }}>
                              <span style={{ color: M }}>{f.l.replace("Jumlah Penduduk ", "").replace("Penduduk ", "").replace("Jumlah ", "")}</span>
                              <span style={{ fontFamily: "monospace", fontWeight: 700, color: T }}>{val.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import CSV Modal */}
      {showImport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={e => { if (e.target === e.currentTarget) setShowImport(false); }}>
          <div style={{ background: W, borderRadius: 16, width: 720, maxWidth: "96vw", maxHeight: "90vh", overflow: "auto", padding: "1.75rem", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: T, fontSize: "1rem" }}>Import Data Sekunder</div>
                <div style={{ fontSize: "0.75rem", color: M, marginTop: "0.15rem" }}>CSV / tab separated — kolom: tahun, {NEW_FIELDS.slice(0, 3).map(f => f.k).join(", ")}, ... (21 field)</div>
              </div>
              <button onClick={() => setShowImport(false)} style={{ background: BG, border: "none", borderRadius: 6, color: M, fontSize: "1.1rem", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: M, textTransform: "uppercase", marginBottom: "0.375rem" }}>Upload File CSV</label>
                <input type="file" accept=".csv,.tsv,.txt" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setImportRaw(ev.target?.result || "");
                    const text = ev.target?.result || "";
                    const lines = text.split("\n").map(l => l.trim()).filter(l => l);
                    const parsed = [];
                    const errors = [];
                    for (let i = 0; i < lines.length; i++) {
                      const line = lines[i];
                      if (i === 0 && /tahun/i.test(line)) continue;
                      let parts = line.split("\t").length > 1 ? line.split("\t") : line.split(",");
                      parts = parts.map(p => p.replace(/["\r]/g, "").trim());
                      const nums = parts.filter(p => p !== "").slice(0, 1 + NEW_FIELDS.length).map(p => parseInt(p));
                      if (nums.length < 1 + NEW_FIELDS.length || nums.some(n => isNaN(n))) { errors.push(`Baris ${i + 1}: data tidak valid`); continue; }
                      const entry = { tahun: nums[0] };
                      NEW_FIELDS.forEach((f, idx) => { entry[f.k] = nums[idx + 1] ?? 0; });
                      parsed.push(entry);
                    }
                    if (errors.length) addToast(`⚠️ ${errors.length} error:\n${errors.slice(0, 5).join("\n")}`, "error");
                    setImportPreview(parsed);
                  };
                  reader.readAsText(file);
                }} style={{ width: "100%", padding: "0.5rem", border: `1.5px dashed ${BDR}`, borderRadius: 8, fontSize: "0.8rem", background: BG }} />
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: P, textTransform: "uppercase", marginBottom: "0.375rem" }}>Atau Tempel Data</label>
              <textarea value={importRaw} onChange={e => {
                setImportRaw(e.target.value);
                const lines = e.target.value.split("\n").map(l => l.trim()).filter(l => l);
                const parsed = [];
                const errors = [];
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  if (i === 0 && /tahun/i.test(line)) continue;
                  let parts = line.split("\t").length > 1 ? line.split("\t") : line.split(",");
                  parts = parts.map(p => p.replace(/["\r]/g, "").trim());
                  const nums = parts.filter(p => p !== "").slice(0, 1 + NEW_FIELDS.length).map(p => parseInt(p));
                  if (nums.length < 1 + NEW_FIELDS.length || nums.some(n => isNaN(n))) { errors.push(`Baris ${i + 1}: data tidak valid`); continue; }
                  const entry = { tahun: nums[0] };
                  NEW_FIELDS.forEach((f, idx) => { entry[f.k] = nums[idx + 1] ?? 0; });
                  parsed.push(entry);
                }
                if (errors.length) addToast(`⚠️ ${errors.length} error:\n${errors.slice(0, 5).join("\n")}`, "error");
                setImportPreview(parsed);
              }} rows={4} placeholder={`tahun\t${NEW_FIELDS.slice(0, 3).map(f => f.k).join("\t")}\t...\n2017\t141625\t140184\t21121\t...`}
                style={{ width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${BDR}`, borderRadius: 8, fontSize: "0.8rem", fontFamily: "'JetBrains Mono',monospace", color: T, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            {importPreview.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: T }}>📋 Preview ({importPreview.length} baris)</div>
                  <button onClick={() => {
                    importPreview.forEach(r => addPendudukSekunder(r));
                    addToast(`✅ ${importPreview.length} data sekunder berhasil diimport & tersinkron!`, "success");
                    setShowImport(false); setImportRaw(""); setImportPreview([]);
                  }} style={{ background: `linear-gradient(135deg, ${P}, ${PL})`, border: "none", borderRadius: 6, color: W, fontWeight: 700, fontSize: "0.75rem", padding: "0.4rem 1rem", cursor: "pointer" }}>💾 Import {importPreview.length} Data</button>
                </div>
                <div style={{ maxHeight: 200, overflow: "auto", border: `1px solid ${BDR}`, borderRadius: 8 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
                    <thead><tr style={{ background: `${P}15`, position: "sticky", top: 0 }}>
                      <th style={{ padding: "0.3rem 0.5rem", textAlign: "left", fontWeight: 700, color: P }}>#</th>
                      <th style={{ padding: "0.3rem 0.5rem", textAlign: "left", fontWeight: 700, color: P }}>Tahun</th>
                      {NEW_FIELDS.slice(0, 4).map(f => <th key={f.k} style={{ padding: "0.3rem 0.5rem", textAlign: "right", fontWeight: 700, color: P }}>{f.k}</th>)}
                      <th style={{ padding: "0.3rem 0.5rem", textAlign: "right", fontWeight: 700, color: P }}>…</th>
                    </tr></thead>
                    <tbody>{importPreview.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? W : BG }}>
                        <td style={{ padding: "0.25rem 0.5rem", color: M }}>{i + 1}</td>
                        <td style={{ padding: "0.25rem 0.5rem", fontWeight: 700, color: T }}>{r.tahun}</td>
                        {NEW_FIELDS.slice(0, 4).map(f => <td key={f.k} style={{ padding: "0.25rem 0.5rem", textAlign: "right", fontFamily: "monospace", color: M }}>{(r[f.k] || 0).toLocaleString()}</td>)}
                        <td style={{ padding: "0.25rem 0.5rem", textAlign: "right", color: M }}>…</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.625rem", borderTop: `1px solid ${BDR}`, paddingTop: "1rem" }}>
              <button onClick={() => setShowImport(false)} style={{ background: W, border: `1.5px solid ${BDR}`, borderRadius: 8, color: M, fontWeight: 600, fontSize: "0.82rem", padding: "0.5rem 1.25rem", cursor: "pointer" }}>Tutup</button>
            </div>
          </div>
        </div>
      )}
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
                const datang = d.jumlah_datang || 0;
                const lahir = d.jumlah_kelahiran || 0;
                const pindah = d.jumlah_pindah || 0;
                const mati = d.jumlah_kematian || 0;
                const t = datang + lahir - pindah - mati;
                return (
                  <tr key={d.id_penduduk} style={{ background: i % 2 === 0 ? W : BG }}>
                    <td style={{ padding: "0.5rem 0.875rem", color: M }}>{i + 1}</td>
                    <td style={{ padding: "0.5rem 0.875rem", fontWeight: 700, color: T }}>{d.tahun}</td>
                    <td style={{ padding: "0.5rem 0.875rem", fontFamily: "monospace", color: DNG }}>{pindah.toLocaleString()}</td>
                    <td style={{ padding: "0.5rem 0.875rem", fontFamily: "monospace", color: SUC }}>{datang.toLocaleString()}</td>
                    <td style={{ padding: "0.5rem 0.875rem", fontFamily: "monospace", color: "#2563EB" }}>{lahir.toLocaleString()}</td>
                    <td style={{ padding: "0.5rem 0.875rem", fontFamily: "monospace", color: WRN }}>{mati.toLocaleString()}</td>
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
  const { profilKecamatan, updateProfilValue } = useAppContext();
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
      highlights: d.highlights.join(", "),
    });
  };

  const saveProfil = () => {
    if (!editKec) return;
    updateProfilValue(editKec, "luas", form.luas);
    updateProfilValue(editKec, "kelurahan", parseInt(form.kelurahan) || 0);
    updateProfilValue(editKec, "penduduk2024", parseInt(form.penduduk2024) || 0);
    updateProfilValue(editKec, "kepadatan", parseInt(form.kepadatan) || 0);
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
      case "data-migrasi": return <MigrasiPage addToast={addToast} />;
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
