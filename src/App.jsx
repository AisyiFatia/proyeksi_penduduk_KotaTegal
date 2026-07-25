// ══════════════════════════════════════════════════════════════
//  APP.JSX — Aplikasi Utama SIPENDUK TEGAL
//  Berisi: landing page, semua tab publik, login modal,
//  navigasi, footer, dan session management.
//  Routing dilakukan via state (tanpa react-router).
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

import {
  APP_TAGLINE, BASE_PENDUDUK, LAHIR_PER_TAHUN, MATI_PER_TAHUN,
  MS_PER_TAHUN, NETO_PER_MS, EPOCH_2024,
  STATS_KUNCI, PILAR_COLOR, KECAMATAN_LIST,
  QUICK_QUESTIONS, AI_SYSTEM_PROMPT,
} from "./data.js";
import { C, TOOLTIP_STYLE, LABEL_STYLE, PILAR_GREEN } from "./theme.js";
import AdminDashboard from "./AdminDashboard.jsx";
import { useAppContext } from "./AppContext.jsx";
import { api } from "./api.js";

// ── Demo credentials (fallback jika backend mati) ────────────
const DEMO_USERS = [
  { username: "admin", password: "admin123", role: "Administrator", name: "Admin SIPENDUK" },
  { username: "analis", password: "analis123", role: "Analis Data", name: "Analis Dukcapil" },
  { username: "tegal", password: "tegal2025", role: "Operator", name: "Operator Kota Tegal" },
];

// ═══════════════════════════════════════════════════════════════
// LANDING PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════
function LandingPage({ onLogin, onEnterDashboard }) {
  const [penduduk, setPenduduk] = useState(BASE_PENDUDUK);
  const [lahir, setLahir] = useState(0);
  const [mati, setMati] = useState(0);
  const [visitors] = useState(190233 + Math.floor(Math.random() * 500));
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activePage, setActivePage] = useState("beranda");

  // Real-time population clock
  useEffect(() => {
    const tick = () => {
      const ms = Date.now() - EPOCH_2024;
      const frac = (ms % MS_PER_TAHUN) / MS_PER_TAHUN;
      setPenduduk(Math.round(BASE_PENDUDUK + NETO_PER_MS * ms));
      setLahir(Math.round(LAHIR_PER_TAHUN * frac));
      setMati(Math.round(MATI_PER_TAHUN * frac));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      setLoginError("Username dan password wajib diisi.");
      return;
    }
    setLoginLoading(true);
    setLoginError("");
    // Coba login via API dulu
    const apiUser = await api.login(username, password);
    if (apiUser && apiUser.username) {
      setLoginLoading(false);
      setShowLogin(false);
      onLogin(apiUser);
      return;
    }
    // Fallback ke local DEMO_USERS
    await new Promise(r => setTimeout(r, 600));
    const user = DEMO_USERS.find(u => u.username === username && u.password === password);
    if (user) {
      setLoginLoading(false);
      setShowLogin(false);
      onLogin(user);
    } else {
      setLoginLoading(false);
      setLoginError("Username atau password salah. Coba: admin / admin123");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 50%, #E6FFFA 100%)",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    }}>
      {/* ── Decorative circles (background) ── */}
      <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: "rgba(13,148,136,0.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -100, left: -80, width: 350, height: 350, borderRadius: "50%", background: "rgba(13,148,136,0.05)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "40%", left: "42%", width: 200, height: 200, borderRadius: "50%", background: "rgba(45,212,191,0.04)", pointerEvents: "none" }} />

      {/* Dot grid pattern */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(13,148,136,0.12) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        opacity: 0.5,
      }} />

      {/* ── TOP BAR ── */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.875rem 2.5rem",
        background: "rgba(255,255,255,0.90)",
        backdropFilter: "blur(12px)",
        borderBottom: "1.5px solid #B2DFDB",
        boxShadow: "0 2px 12px rgba(13,59,56,0.08)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <div style={{
            width: 46, height: 46, borderRadius: 10,
            background: "linear-gradient(135deg, #134E4A, #0D9488)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem", boxShadow: "0 3px 12px rgba(13,148,136,0.3)",
          }}>🏙️</div>
          <div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: "1rem", color: "#134E4A", letterSpacing: "0.05em" }}>
              SIPENDUK TEGAL
            </div>
            <div style={{ fontSize: "0.58rem", color: "#4B9E9A", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Kota Tegal · Jawa Tengah
            </div>
          </div>
        </div>

        {/* Right: icons + LOGIN */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <a href="https://bps.go.id" target="_blank" rel="noreferrer"
            style={{ width: 36, height: 36, borderRadius: 8, background: "#F0FDFA", border: "1.5px solid #B2DFDB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", textDecoration: "none", cursor: "pointer", transition: "all 0.2s" }}
            title="BPS Referensi">📊</a>
          <a href="#info"
            style={{ width: 36, height: 36, borderRadius: 8, background: "#F0FDFA", border: "1.5px solid #B2DFDB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", textDecoration: "none", cursor: "pointer" }}
            title="Info">ℹ️</a>
          <button
            onClick={() => { setShowLogin(true); setLoginError(""); setUsername(""); setPassword(""); }}
            style={{
              background: "linear-gradient(135deg, #134E4A, #0D9488)",
              border: "none", borderRadius: 8, color: "#fff",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontWeight: 700, fontSize: "0.85rem",
              padding: "0.5rem 1.5rem", cursor: "pointer",
              boxShadow: "0 2px 10px rgba(13,148,136,0.3)",
              letterSpacing: "0.05em", transition: "all 0.22s",
            }}
            id="btn-login-top"
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >🔐 LOGIN</button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{
        position: "relative", zIndex: 5,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "3.5rem 3rem 2rem",
        minHeight: "calc(100vh - 140px)",
        gap: "2.5rem",
        flexWrap: "wrap",
      }}>
        {/* LEFT: Branding + Nav */}
        <div style={{ flex: "1 1 400px", maxWidth: 520 }}>
          {/* Main logo block */}
          <div style={{ marginBottom: "2.5rem" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "1.25rem",
              marginBottom: "1.5rem",
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: 16,
                background: "linear-gradient(135deg, #134E4A, #0D9488)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "2.8rem", boxShadow: "0 6px 24px rgba(13,148,136,0.35)",
              }}>🏙️</div>
              <div>
                <div style={{
                  fontFamily: "'Sora',sans-serif", fontWeight: 700,
                  fontSize: "clamp(2rem, 5vw, 3rem)", color: "#134E4A",
                  lineHeight: 1.1, letterSpacing: "-0.01em",
                }}>
                  <span style={{ color: "#0D9488" }}>Si</span>PENDUK
                </div>
                <div style={{
                  fontFamily: "'Sora',sans-serif", fontWeight: 700,
                  fontSize: "clamp(2rem, 5vw, 3rem)", color: "#134E4A",
                  lineHeight: 1.1, letterSpacing: "-0.01em",
                }}>TEGAL</div>
              </div>
            </div>

            <p style={{ fontSize: "1rem", color: "#1B6B6B", fontWeight: 600, lineHeight: 1.6, maxWidth: 440 }}>
              Sistem Informasi Proyeksi Penduduk<br />
              <span style={{ color: "#4B9E9A", fontWeight: 500, fontSize: "0.9rem" }}>
                Kota Tegal, Jawa Tengah — Data 2020–2035
              </span>
            </p>
          </div>

          {/* Navigation Buttons */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
            {[
              { id: "beranda", label: "BERANDA", icon: "🏠" },
              { id: "dashboard", label: "DASHBOARD", icon: "📊" },
              { id: "fasilitasi", label: "FASILITASI", icon: "🤝", badge: 4 },
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => { setActivePage(btn.id); if (btn.id === "dashboard") onEnterDashboard(); }}
                style={{
                  position: "relative",
                  background: activePage === btn.id
                    ? "linear-gradient(135deg, #134E4A, #0D9488)"
                    : "rgba(255,255,255,0.95)",
                  border: `2px solid ${activePage === btn.id ? "transparent" : "#80CBC4"}`,
                  borderRadius: 10, color: activePage === btn.id ? "#fff" : "#1B6B6B",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontWeight: 700, fontSize: "0.88rem",
                  padding: "0.7rem 1.5rem", cursor: "pointer",
                  letterSpacing: "0.06em", transition: "all 0.22s",
                  boxShadow: activePage === btn.id
                    ? "0 4px 16px rgba(13,148,136,0.35)"
                    : "0 2px 8px rgba(13,59,56,0.08)",
                }}
                id={`nav-${btn.id}`}
              >
                {btn.icon} {btn.label}
                {btn.badge && (
                  <span style={{
                    position: "absolute", top: -8, right: -8,
                    background: "#DC2626", color: "#fff",
                    fontSize: "0.62rem", fontWeight: 700,
                    borderRadius: "50%", width: 20, height: 20,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(220,38,38,0.4)",
                  }}>{btn.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Stat badges */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {[
              { icon: "🗺️", label: "4 Kecamatan", desc: "27 Kelurahan" },
              { icon: "📅", label: "2020–2035", desc: "Periode Data" },
              { icon: "📊", label: "13 Indikator", desc: "Kependudukan" },
            ].map(b => (
              <div key={b.label} style={{
                background: "rgba(255,255,255,0.85)", border: "1.5px solid #B2DFDB",
                borderRadius: 10, padding: "0.625rem 1rem",
                display: "flex", alignItems: "center", gap: "0.625rem",
                boxShadow: "0 2px 8px rgba(13,59,56,0.07)",
              }}>
                <span style={{ fontSize: "1.3rem" }}>{b.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#134E4A" }}>{b.label}</div>
                  <div style={{ fontSize: "0.65rem", color: "#4B9E9A" }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Population Clock Card */}
        <div style={{
          flex: "0 0 360px",
          background: "rgba(255,255,255,0.97)",
          border: "2px solid #B2DFDB",
          borderRadius: 20,
          padding: "2rem 1.75rem 1.5rem",
          boxShadow: "0 8px 40px rgba(13,59,56,0.14), 0 2px 12px rgba(13,59,56,0.08)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Card top accent */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 5,
            background: "linear-gradient(90deg, #134E4A, #0D9488, #2DD4BF)",
          }} />

          {/* Icon top */}
          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 72, height: 72, borderRadius: "50%",
              background: "linear-gradient(135deg, #E6FFFA, #CCFBF1)",
              border: "3px solid #B2DFDB",
              fontSize: "2.25rem",
              boxShadow: "0 4px 16px rgba(13,148,136,0.2)",
              marginBottom: "0.875rem",
            }}>🌏</div>

            <div style={{
              fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: "0.95rem",
              color: "#134E4A", letterSpacing: "0.12em", textTransform: "uppercase",
            }}>
              POPULATION CLOCK
            </div>
            <div style={{ fontSize: "0.72rem", color: "#4B9E9A", fontWeight: 600, letterSpacing: "0.08em" }}>
              KOTA TEGAL
            </div>
          </div>

          {/* Clock Numbers */}
          {[
            {
              icon: "👥", num: penduduk,
              label: "JUMLAH PENDUDUK SAAT INI",
              color: "#134E4A", bg: "linear-gradient(135deg, #F0FDFA, #E6FFFA)",
              border: "#0D9488",
            },
            {
              icon: "👶", num: lahir,
              label: "JUMLAH KELAHIRAN TAHUN INI",
              color: "#15803D", bg: "linear-gradient(135deg, #F0FFF4, #DCFCE7)",
              border: "#22C55E",
            },
            {
              icon: "🕊️", num: mati,
              label: "JUMLAH KEMATIAN TAHUN INI",
              color: "#DC2626", bg: "linear-gradient(135deg, #FFF5F5, #FEE2E2)",
              border: "#EF4444",
            },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: "1rem" }}>
              <div style={{
                background: item.bg,
                border: `1.5px solid ${item.border}40`,
                borderRadius: 12, padding: "0.875rem 1rem",
                display: "flex", alignItems: "center", gap: "0.875rem",
                boxShadow: "0 2px 8px rgba(13,59,56,0.06)",
              }}>
                <div style={{
                  width: 42, height: 42,
                  background: `${item.border}18`,
                  border: `2px solid ${item.border}40`,
                  borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.4rem", flexShrink: 0,
                }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Sora',sans-serif", fontWeight: 700,
                    fontSize: "clamp(1.4rem, 3vw, 1.75rem)", color: item.color,
                    lineHeight: 1, letterSpacing: "-0.01em",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {item.num.toLocaleString("id-ID")}
                  </div>
                  <div style={{ fontSize: "0.62rem", color: "#4B9E9A", fontWeight: 700, marginTop: "0.2rem", letterSpacing: "0.07em" }}>
                    {item.label}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Source */}
          <div style={{ textAlign: "center", paddingTop: "0.625rem", borderTop: "1px solid #B2DFDB" }}>
            <div style={{ fontSize: "0.7rem", color: "#4B9E9A", fontWeight: 600 }}>Sumber :</div>
            <div style={{ fontSize: "0.7rem", color: "#1B6B6B", fontWeight: 600 }}>Proyeksi BPS Kota Tegal 2020–2035</div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM VISITOR COUNTER ── */}
      <div style={{
        position: "relative", zIndex: 10,
        background: C.g800,
        padding: "0.875rem 2.5rem",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "1rem", flexWrap: "wrap",
      }}>
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.82rem" }}>
          Jumlah Pengunjung (sejak 1 Januari 2025) :
        </span>
        <span style={{
          background: "#FFFFFF", color: "#134E4A",
          fontFamily: "'Sora',sans-serif", fontWeight: 700,
          fontSize: "0.95rem", padding: "0.25rem 1rem",
          borderRadius: 6, letterSpacing: "0.05em",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}>
          {visitors.toLocaleString("id-ID")}
        </span>
        <button
          onClick={onEnterDashboard}
          style={{
            background: "transparent", border: "1.5px solid rgba(255,255,255,0.4)",
            borderRadius: 8, color: "rgba(255,255,255,0.9)",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 600, fontSize: "0.78rem",
            padding: "0.375rem 1rem", cursor: "pointer",
            transition: "all 0.2s", marginLeft: "auto",
          }}
        >
          Masuk Dashboard →
        </button>
      </div>

      {/* ── LOGIN MODAL ── */}
      {showLogin && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(13,59,56,0.45)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
          animation: "fadeIn 0.2s ease",
        }} onClick={e => { if (e.target === e.currentTarget) setShowLogin(false); }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: 20,
            width: "100%", maxWidth: 400,
            boxShadow: "0 24px 60px rgba(13,59,56,0.25)",
            overflow: "hidden",
            animation: "slideUp 0.3s ease",
          }}>
            {/* Modal Header */}
            <div style={{
              background: "linear-gradient(135deg, #134E4A, #0D9488)",
              padding: "1.75rem 2rem 1.5rem",
              position: "relative",
            }}>
              <button
                onClick={() => setShowLogin(false)}
                style={{
                  position: "absolute", top: "0.875rem", right: "0.875rem",
                  background: "rgba(255,255,255,0.15)", border: "none",
                  borderRadius: "50%", width: 32, height: 32,
                  color: "#fff", cursor: "pointer", fontSize: "1.1rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >×</button>
              <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  background: "rgba(255,255,255,0.15)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.75rem",
                }}>🔐</div>
                <div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, color: "#fff", fontSize: "1.1rem" }}>
                    Masuk ke SIPENDUK
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.75)", marginTop: "0.2rem" }}>
                    Sistem Informasi Proyeksi Penduduk Kota Tegal
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.75rem 2rem 2rem" }}>
              {/* Demo hint */}
              <div style={{
                background: "#F0FDFA", border: "1.5px solid #B2DFDB",
                borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1.25rem",
              }}>
                <div style={{ fontSize: "0.72rem", color: "#1B6B6B", fontWeight: 700, marginBottom: "0.25rem" }}>
                  💡 Demo Login:
                </div>
                <div style={{ fontSize: "0.7rem", color: "#4B9E9A" }}>
                  Username: <strong style={{ color: "#134E4A" }}>admin</strong> &nbsp;|&nbsp; Password: <strong style={{ color: "#134E4A" }}>admin123</strong>
                </div>
              </div>

              {/* Username */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#1B6B6B", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Username
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", fontSize: "1rem" }}>👤</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    placeholder="Masukkan username..."
                    style={{
                      width: "100%", padding: "0.75rem 0.875rem 0.75rem 2.5rem",
                      border: "1.5px solid #80CBC4", borderRadius: 10,
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.88rem",
                      color: "#0D3B38", outline: "none",
                      background: "#F8FFFE",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={e => e.target.style.borderColor = "#0D9488"}
                    onBlur={e => e.target.style.borderColor = "#80CBC4"}
                    id="login-username"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#1B6B6B", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", fontSize: "1rem" }}>🔒</span>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    placeholder="Masukkan password..."
                    style={{
                      width: "100%", padding: "0.75rem 0.875rem 0.75rem 2.5rem",
                      border: "1.5px solid #80CBC4", borderRadius: 10,
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.88rem",
                      color: "#0D3B38", outline: "none",
                      background: "#F8FFFE",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={e => e.target.style.borderColor = "#0D9488"}
                    onBlur={e => e.target.style.borderColor = "#80CBC4"}
                    id="login-password"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Error */}
              {loginError && (
                <div style={{
                  background: "#FEF2F2", border: "1.5px solid #FECACA",
                  borderRadius: 8, padding: "0.625rem 0.875rem",
                  fontSize: "0.78rem", color: "#DC2626", fontWeight: 600,
                  marginBottom: "1rem",
                }}>
                  ⚠️ {loginError}
                </div>
              )}

              {/* Login Button */}
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                style={{
                  width: "100%",
                  background: loginLoading
                    ? "linear-gradient(135deg, #4B9E9A, #0D9488)"
                    : "linear-gradient(135deg, #134E4A, #0D9488)",
                  border: "none", borderRadius: 10,
                  color: "#fff", fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontWeight: 700, fontSize: "0.95rem",
                  padding: "0.85rem", cursor: loginLoading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 16px rgba(13,148,136,0.35)",
                  transition: "all 0.22s", letterSpacing: "0.04em",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                }}
                id="btn-do-login"
              >
                {loginLoading ? (
                  <>
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⚙️</span>
                    Memverifikasi...
                  </>
                ) : "🚀 MASUK"}
              </button>

              <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.72rem", color: "#4B9E9A" }}>
                Atau{" "}
                <button
                  onClick={() => { setShowLogin(false); onEnterDashboard(); }}
                  style={{ background: "none", border: "none", color: "#0D9488", fontWeight: 700, cursor: "pointer", fontSize: "0.72rem", textDecoration: "underline" }}
                >
                  lihat dashboard tanpa login
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD NAVBAR
// ═══════════════════════════════════════════════════════════════
const TABS = [
  { id: "beranda", label: "Beranda", icon: "🏠" },
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "piramida", label: "Piramida", icon: "🔺" },
  { id: "analisis", label: "Analisis", icon: "📈" },
  { id: "kecamatan", label: "Kecamatan", icon: "🗺️" },
  { id: "tabel", label: "Tabel Data", icon: "📋" },
  { id: "ai", label: "AI Konsultasi", icon: "🤖" },
];

function Navbar({ activeTab, onTabChange, user, onLogout, onGoAdmin }) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 999,
      background: C.g800, borderBottom: `2px solid ${C.g700}`,
      boxShadow: "0 2px 16px rgba(13,59,56,0.25)",
      padding: "0 1.75rem",
      display: "flex", alignItems: "center", gap: "1rem", height: 60,
      fontFamily: "'Plus Jakarta Sans',sans-serif",
    }}>
      <button
        onClick={onLogout}
        title="Kembali ke halaman utama"
        style={{
          background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)",
          borderRadius: 8, padding: "0.35rem 0.75rem",
          display: "flex", flexDirection: "column", alignItems: "center",
          cursor: "pointer", lineHeight: 1.1, flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", color: C.g300 }}>SIPENDUK</span>
        <span style={{ fontSize: "0.45rem", fontWeight: 500, color: "rgba(255,255,255,0.65)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Kota Tegal</span>
      </button>

      <div style={{ width: 1, height: 30, background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />

      <div style={{ display: "flex", gap: "0.125rem", overflowX: "auto", flex: 1, scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`navbar-tab${activeTab === t.id ? " active" : ""}`}
            onClick={() => onTabChange(t.id)}
            id={`nav-tab-${t.id}`}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: C.g300 }}>{user.name}</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.6)" }}>{user.role}</div>
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "2px solid rgba(255,255,255,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.1rem",
          }}>👤</div>
          {onGoAdmin && (
            <button
              onClick={onGoAdmin}
              title="Buka Panel Admin"
              style={{
                background: "linear-gradient(135deg, #2DD4BF, #14B8A6)", border: "none",
                borderRadius: 6, color: "#0D3B38", cursor: "pointer",
                fontSize: "0.7rem", fontWeight: 800, padding: "0.375rem 0.75rem",
                boxShadow: "0 2px 8px rgba(45,212,191,0.35)",
              }}
            >🔧 Admin</button>
          )}
          <button
            onClick={onLogout}
            title="Keluar"
            style={{
              background: "rgba(220,38,38,0.2)", border: "1.5px solid rgba(220,38,38,0.4)",
              borderRadius: 6, color: "#FCA5A5", cursor: "pointer",
              fontSize: "0.7rem", fontWeight: 700, padding: "0.375rem 0.625rem",
            }}
          >🚪</button>
        </div>
      )}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <span>SIPENDUK TEGAL © 2025</span>
      <span className="footer-dot">·</span>
      <span>Sumber: BPS Kota Tegal &amp; Dinas Dukcapil</span>
      <span className="footer-dot">·</span>
      <span>Data Proyeksi 2020–2035</span>
    </footer>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label, satuan }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ ...LABEL_STYLE, marginBottom: "0.375rem" }}>Tahun {label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color || C.tDark, marginBottom: "0.2rem" }}>
          {e.name}: <strong>{typeof e.value === "number" ? e.value.toLocaleString("id-ID") : e.value}</strong>
          {satuan ? ` ${satuan}` : ""}
        </p>
      ))}
    </div>
  );
}

// ── Pilar Badge ────────────────────────────────────────────────
function PilarBadge({ pilar }) {
  const p = PILAR_GREEN[pilar] || { color: C.tMuted, bg: "#F1F5F9" };
  return <span className="pilar-badge" style={{ color: p.color, borderColor: p.color, background: p.bg }}>{pilar}</span>;
}

// ═══════════════════════════════════════════════════════════════
// TAB 1 — BERANDA
// ═══════════════════════════════════════════════════════════════
function TabBeranda({ onGoAdmin }) {
  const [penduduk, setPenduduk] = useState(BASE_PENDUDUK);
  const [lahir, setLahir] = useState(0);
  const [mati, setMati] = useState(0);

  useEffect(() => {
    const tick = () => {
      const ms = Date.now() - EPOCH_2024;
      const frac = (ms % MS_PER_TAHUN) / MS_PER_TAHUN;
      setPenduduk(Math.round(BASE_PENDUDUK + NETO_PER_MS * ms));
      setLahir(Math.round(LAHIR_PER_TAHUN * frac));
      setMati(Math.round(MATI_PER_TAHUN * frac));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, []);

  const statIcons = [
    { bg: "#E6FFFA", c: C.g700 },
    { bg: "#DCFCE7", c: "#15803D" },
    { bg: "#FEF3C7", c: "#D97706" },
    { bg: "#EDE9FE", c: "#7C3AED" },
    { bg: "#F0FDFA", c: "#1B6B6B" },
    { bg: "#FEF9C3", c: "#CA8A04" },
  ];

  return (
    <div className="beranda-page">
      {/* Live Admin Data Banner — shows synced data from admin panel */}
      <AdminDataBanner onGoAdmin={onGoAdmin} />

      <section className="hero-section">
        <div className="hero-badge">
          <span className="hero-badge-title">SIPENDUK TEGAL</span>
          <span className="hero-badge-sub">Kota Tegal · Jawa Tengah · Est. 2025</span>
        </div>
        <h1 className="hero-tagline">{APP_TAGLINE}</h1>
        <p className="hero-subtext">Data resmi berdasarkan Sensus Penduduk BPS &amp; Proyeksi Dinas Dukcapil Kota Tegal</p>
      </section>

      <section className="clock-section">
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "1.1rem", fontWeight: 700, color: C.g700 }}>🕐 Penghitung Penduduk Real-Time</h2>
          <p style={{ fontSize: "0.8rem", color: C.tMuted, marginTop: "0.25rem" }}>Estimasi berdasarkan laju pertumbuhan BPS 2024</p>
        </div>
        <div className="clock-grid">
          <div className="clock-card population">
            <div className="clock-icon">🌍</div>
            <div className="clock-label">Jumlah Penduduk Saat Ini</div>
            <div className="clock-number">{penduduk.toLocaleString("id-ID")}</div>
            <div className="clock-desc">jiwa · Kota Tegal 2025</div>
          </div>
          <div className="clock-card births">
            <div className="clock-icon">👶</div>
            <div className="clock-label">Kelahiran Tahun Ini</div>
            <div className="clock-number">{lahir.toLocaleString("id-ID")}</div>
            <div className="clock-desc">±{LAHIR_PER_TAHUN.toLocaleString("id-ID")} kelahiran/tahun</div>
          </div>
          <div className="clock-card deaths">
            <div className="clock-icon">💀</div>
            <div className="clock-label">Kematian Tahun Ini</div>
            <div className="clock-number">{mati.toLocaleString("id-ID")}</div>
            <div className="clock-desc">±{MATI_PER_TAHUN.toLocaleString("id-ID")} kematian/tahun</div>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "1.1rem", fontWeight: 700, color: C.g700 }}>📊 Indikator Kunci Kota Tegal 2024</h2>
        </div>
        <div className="stats-grid">
          {STATS_KUNCI.map((s, i) => {
            const sc = statIcons[i] || statIcons[0];
            return (
              <div className="stat-card" key={i}>
                <div className="stat-icon-wrap" style={{ background: sc.bg }}><span>{s.icon}</span></div>
                <div className="stat-info">
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ color: sc.c }}>{s.nilai}</div>
                  <div className="stat-unit">{s.satuan}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="highlights-section">
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "1.1rem", fontWeight: 700, color: C.g700 }}>🏙️ Fakta Menarik Kota Tegal</h2>
        </div>
        <div className="highlights-grid">
          {[
            { icon: "🏆", title: "Bonus Demografi", text: "Kota Tegal masuk zona Bonus Demografi sejak 2020 — window emas produktivitas 2020–2030" },
            { icon: "🎯", title: "Target 2035", text: "Proyeksi penduduk 2035 mencapai ~292.700 jiwa dengan laju pertumbuhan 0,77%/tahun" },
            { icon: "📍", title: "Wilayah Kota Tegal", text: "Luas 39,68 km² — 4 Kecamatan, 27 Kelurahan, Kota Bahari Pesisir Utara Jawa Tengah" },
          ].map(h => (
            <div key={h.title} className="highlight-card">
              <span className="highlight-icon">{h.icon}</span>
              <div>
                <div className="highlight-title">{h.title}</div>
                <div className="highlight-text">{h.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2 — DASHBOARD
// ═══════════════════════════════════════════════════════════════
function TabDashboard() {
  const { indikatorData } = useAppContext();
  const INDIKATOR_NAMES = Object.keys(indikatorData);
  const [selInd, setSelInd] = useState(INDIKATOR_NAMES[0]);
  const [selKec, setSelKec] = useState("Kota Tegal (Kota)");
  const [activeInd, setActiveInd] = useState(INDIKATOR_NAMES[0]);
  const [activeKec, setActiveKec] = useState("Kota Tegal (Kota)");
  const info = indikatorData[activeInd];
  const chartData = info?.data?.[activeKec] || info?.data?.["Kota Tegal (Kota)"] || [];
  const gradId = `grad-${activeInd.replace(/\s+/g, "")}`;

  return (
    <div className="tab-page">
      <div className="page-header">
        <h2 className="section-title">📊 Dashboard Indikator Kependudukan</h2>
        <p className="section-desc">Visualisasi tren 13 indikator kependudukan Kota Tegal 2020–2035</p>
      </div>
      <div className="filter-row">
        <div className="filter-group">
          <label className="filter-label">Pilih Indikator</label>
          <select className="select-input" value={selInd} onChange={e => setSelInd(e.target.value)} id="dash-ind">
            {INDIKATOR_NAMES.map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Pilih Wilayah</label>
          <select className="select-input" value={selKec} onChange={e => setSelKec(e.target.value)} id="dash-kec">
            {KECAMATAN_LIST.map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={() => { setActiveInd(selInd); setActiveKec(selKec); }} id="btn-tampilkan">Tampilkan</button>
      </div>
      {info && (
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">{activeInd}</div>
              <div className="chart-subtitle">{info.deskripsi} · Wilayah: {activeKec}</div>
            </div>
            <PilarBadge pilar={info.pilar} />
          </div>
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={310}>
                <AreaChart data={chartData} key={`dash-${activeInd}-${selKec}-${chartData.length}`} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.g600} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={C.g600} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="tahun" stroke={C.borderMid} tick={{ fill: C.tMuted, fontSize: 11 }} />
                  <YAxis stroke={C.borderMid} tick={{ fill: C.tMuted, fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip satuan={info.satuan} />} cursor={{ stroke: C.borderMid, strokeDasharray: "3 3" }} />
                  <Area type="monotone" dataKey="nilai" name={activeInd} stroke={C.g600} strokeWidth={2.5} fill={`url(#${gradId})`} dot={{ fill: C.g600, r: 4 }} activeDot={{ r: 7, fill: C.g700, strokeWidth: 2 }} animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", paddingTop: "0.875rem", borderTop: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                <div style={{ fontSize: "0.75rem", color: C.tMuted }}>Nilai 2020: <strong style={{ color: C.tDark }}>{chartData[0]?.nilai?.toLocaleString("id-ID")} {info.satuan}</strong></div>
                <div style={{ fontSize: "0.75rem", color: C.tMuted }}>Nilai 2024: <strong style={{ color: C.g700 }}>{chartData.find(d => d.tahun === 2024)?.nilai?.toLocaleString("id-ID") || "—"} {info.satuan}</strong></div>
                <div style={{ fontSize: "0.75rem", color: C.tMuted }}>Target 2035: <strong style={{ color: "#15803D" }}>{chartData.at(-1)?.nilai?.toLocaleString("id-ID")} {info.satuan}</strong></div>
              </div>
            </>
          ) : <div className="empty-msg">Data tidak tersedia untuk wilayah ini.</div>}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: "0.875rem" }}>
        {INDIKATOR_NAMES.slice(0, 6).map(name => {
          const ind = indikatorData[name];
          const d = ind.data["Kota Tegal (Kota)"] || [];
          const up = d.at(-1)?.nilai > d[0]?.nilai;
          return (
            <div key={name} className="chart-card" style={{ cursor: "pointer", padding: "1.125rem" }}
              onClick={() => { setSelInd(name); setActiveInd(name); setSelKec("Kota Tegal (Kota)"); setActiveKec("Kota Tegal (Kota)"); }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <PilarBadge pilar={ind.pilar} />
                <span style={{ color: up ? "#15803D" : C.red, fontWeight: 700, fontSize: "1.1rem" }}>{up ? "↑" : "↓"}</span>
              </div>
              <div style={{ fontSize: "0.68rem", color: C.tMuted, marginBottom: "0.25rem", fontWeight: 700, textTransform: "uppercase" }}>{name}</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "1.25rem", fontWeight: 700, color: C.g800 }}>
                {d.find(dd => dd.tahun === 2024)?.nilai?.toLocaleString("id-ID") || "—"}
              </div>
              <div style={{ fontSize: "0.64rem", color: C.tMuted }}>{ind.satuan} · 2024</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3 — PIRAMIDA
// ═══════════════════════════════════════════════════════════════
function TabPiramida() {
  const { piramidaData } = useAppContext();
  const [year, setYear] = useState(2025);
  const YEARS = [2020, 2025, 2030, 2035];
  const raw = piramidaData["Kota Tegal (Kota)"]?.[year] || [];
  const data = [...raw].reverse().map(d => ({ k: d.k, Laki: -d.l, Perempuan: d.p }));
  const totalL = raw.reduce((s, d) => s + d.l, 0);
  const totalP = raw.reduce((s, d) => s + d.p, 0);
  const medians = { 2020: 28.4, 2025: 29.8, 2030: 31.2, 2035: 32.7 };
  const PyrTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const lv = payload.find(p => p.dataKey === "Laki"), pv = payload.find(p => p.dataKey === "Perempuan");
    return <div style={TOOLTIP_STYLE}>
      <p style={{ ...LABEL_STYLE, marginBottom: "0.375rem" }}>Kel. Umur {label}</p>
      {lv && <p style={{ color: C.blue }}>Laki-laki: <strong>{Math.abs(lv.value).toFixed(1)} rb jiwa</strong></p>}
      {pv && <p style={{ color: "#BE185D" }}>Perempuan: <strong>{pv.value.toFixed(1)} rb jiwa</strong></p>}
    </div>;
  };
  return (
    <div className="tab-page">
      <div className="page-header">
        <h2 className="section-title">🔺 Piramida Penduduk Kota Tegal</h2>
        <p className="section-desc">Struktur usia dan jenis kelamin berdasarkan proyeksi BPS</p>
      </div>
      <div className="year-toggle-group">
        {YEARS.map(y => <button key={y} className={`year-btn${year === y ? " active" : ""}`} onClick={() => setYear(y)} id={`yr-${y}`}>{y}</button>)}
      </div>
      <div className="chart-card">
        <div className="chart-header">
          <div><div className="chart-title">Piramida Penduduk — Tahun {year}</div><div className="chart-subtitle">Proyeksi per kelompok umur 5 tahun (ribuan jiwa)</div></div>
        </div>
        <div className="pyramid-legend">
          <div className="pyramid-legend-item"><div className="legend-dot" style={{ background: C.blue }} />Laki-laki</div>
          <div className="pyramid-legend-item"><div className="legend-dot" style={{ background: "#BE185D" }} />Perempuan</div>
        </div>
        <ResponsiveContainer width="100%" height={460}>
          <BarChart layout="vertical" key={`pyr-${year}`} data={data} margin={{ top: 0, right: 30, left: 10, bottom: 0 }} barCategoryGap="8%" barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
            <XAxis type="number" domain={[-15, 15]} stroke={C.borderMid} tick={{ fill: C.tMuted, fontSize: 10 }} tickFormatter={v => `${Math.abs(v)}`} />
            <YAxis type="category" dataKey="k" width={48} stroke={C.borderMid} tick={{ fill: C.tMid, fontSize: 10 }} />
            <Tooltip content={<PyrTip />} cursor={{ fill: "#00000008" }} />
            <Bar dataKey="Laki" name="Laki-laki" fill={C.blue} radius={[0, 3, 3, 0]} animationDuration={700} />
            <Bar dataKey="Perempuan" name="Perempuan" fill="#BE185D" radius={[0, 3, 3, 0]} animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
        <div className="pyramid-summary">
          {[
            { label: "Total Laki-laki", val: `${totalL.toFixed(1)} rb` },
            { label: "Total Perempuan", val: `${totalP.toFixed(1)} rb` },
            { label: "Rasio L/P", val: ((totalL / totalP) * 100).toFixed(1) },
            { label: "Median Umur", val: `${medians[year]} thn` },
          ].map(item => (
            <div key={item.label} className="pyramid-summary-card">
              <div className="pyramid-summary-label">{item.label}</div>
              <div className="pyramid-summary-value">{item.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 4 — ANALISIS
// ═══════════════════════════════════════════════════════════════
function TabAnalisis() {
  const { indikatorData, radarKecamatan, capaianData } = useAppContext();
  const INDIKATOR_NAMES = Object.keys(indikatorData);
  const [sub, setSub] = useState("trend");
  const [ind1, setInd1] = useState(INDIKATOR_NAMES[0]);
  const [ind2, setInd2] = useState(INDIKATOR_NAMES[1]);
  const d1 = indikatorData[ind1]?.data?.["Kota Tegal (Kota)"] || [];
  const d2 = indikatorData[ind2]?.data?.["Kota Tegal (Kota)"] || [];
  const merged = d1.map(d => ({ tahun: d.tahun, nilai1: d.nilai, nilai2: d2.find(x => x.tahun === d.tahun)?.nilai }));
  const kecColors = { "Tegal Selatan": C.g600, "Tegal Timur": "#2563EB", "Tegal Barat": "#D97706", "Margadana": "#7C3AED" };
  return (
    <div className="tab-page">
      <div className="page-header">
        <h2 className="section-title">📈 Analisis Indikator</h2>
        <p className="section-desc">Analisis tren, radar perbandingan kecamatan, dan capaian indikator</p>
      </div>
      <div className="sub-tab-row">
        {[{ id: "trend", label: "📉 Trend" }, { id: "radar", label: "🕸️ Radar" }, { id: "capaian", label: "📊 Capaian" }].map(t => (
          <button key={t.id} className={`sub-tab-btn${sub === t.id ? " active" : ""}`} onClick={() => setSub(t.id)} id={`sub-${t.id}`}>{t.label}</button>
        ))}
      </div>
      {sub === "trend" && (
        <>
          <div className="filter-row" style={{ marginBottom: "1.25rem" }}>
            <div className="filter-group"><label className="filter-label">Indikator Utama</label><select className="select-input" value={ind1} onChange={e => setInd1(e.target.value)} id="ind1">{INDIKATOR_NAMES.map(n => <option key={n}>{n}</option>)}</select></div>
            <div className="filter-group"><label className="filter-label">Indikator Pembanding</label><select className="select-input" value={ind2} onChange={e => setInd2(e.target.value)} id="ind2">{INDIKATOR_NAMES.map(n => <option key={n}>{n}</option>)}</select></div>
          </div>
          <div className="chart-card">
            <div className="chart-header"><div><div className="chart-title">Perbandingan Dual Indikator 2020–2035</div><div className="chart-subtitle"><span style={{ color: C.g600 }}>●</span> {ind1} (kiri) &nbsp; <span style={{ color: C.blue }}>●</span> {ind2} (kanan)</div></div></div>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={merged} key={`trend-${ind1}-${ind2}`} margin={{ top: 10, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="tahun" stroke={C.borderMid} tick={{ fill: C.tMuted, fontSize: 11 }} />
                <YAxis yAxisId="left" stroke={C.g600} tick={{ fill: C.g600, fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke={C.blue} tick={{ fill: C.blue, fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={LABEL_STYLE} itemStyle={{ color: C.tDark }} cursor={{ stroke: C.borderMid, strokeDasharray: "3 3" }} />
                <Legend wrapperStyle={{ fontSize: "0.75rem", color: C.tMuted }} />
                <Line yAxisId="left" type="monotone" dataKey="nilai1" name={ind1} stroke={C.g600} strokeWidth={2.5} dot={{ r: 4, fill: C.g600 }} activeDot={{ r: 6, fill: C.g600, stroke: "#fff", strokeWidth: 2 }} animationDuration={800} />
                <Line yAxisId="right" type="monotone" dataKey="nilai2" name={ind2} stroke={C.blue} strokeWidth={2.5} dot={{ r: 4, fill: C.blue }} activeDot={{ r: 6, fill: C.blue, stroke: "#fff", strokeWidth: 2 }} strokeDasharray="5 3" animationDuration={800} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
      {sub === "radar" && (
        <div className="chart-card">
          <div className="chart-header"><div><div className="chart-title">Radar Perbandingan Kecamatan</div><div className="chart-subtitle">Nilai dinormalisasi 0–100 berdasarkan 5 dimensi</div></div></div>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarKecamatan} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke={C.border} />
              <PolarAngleAxis dataKey="dimensi" tick={{ fill: C.tMid, fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: C.tMuted, fontSize: 9 }} />
              {Object.entries(kecColors).map(([kec, color]) => <Radar key={kec} name={kec} dataKey={kec} stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} animationDuration={600} />)}
              <Legend wrapperStyle={{ fontSize: "0.75rem", color: C.tMid }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={LABEL_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
      {sub === "capaian" && (
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">Grafik Capaian Indikator 2024</div><div className="chart-subtitle">Kota Tegal vs Rata-rata Jawa Tengah vs Target 2035</div></div>
            <div style={{ display: "flex", gap: "0.875rem", fontSize: "0.72rem" }}>
              <span style={{ color: C.g600, fontWeight: 700 }}>■ Kota Tegal</span>
              <span style={{ color: C.blue, fontWeight: 700 }}>■ Jawa Tengah</span>
              <span style={{ color: C.green, fontWeight: 700 }}>■ Target 2035</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={capaianData} layout="vertical" margin={{ top: 5, right: 40, left: 60, bottom: 5 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" stroke={C.borderMid} tick={{ fill: C.tMuted, fontSize: 10 }} />
              <YAxis type="category" dataKey="indikator" width={80} stroke={C.borderMid} tick={{ fill: C.tMid, fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={LABEL_STYLE} cursor={{ fill: "#00000006" }} />
              <Legend wrapperStyle={{ fontSize: "0.75rem", color: C.tMid }} />
              <Bar dataKey="kota" name="Kota Tegal" fill={C.g600} radius={[0, 3, 3, 0]} animationDuration={700} />
              <Bar dataKey="jateng" name="Jawa Tengah" fill={C.blue} radius={[0, 3, 3, 0]} animationDuration={700} />
              <Bar dataKey="target" name="Target 2035" fill={C.green} radius={[0, 3, 3, 0]} animationDuration={700} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 5 — KECAMATAN
// ═══════════════════════════════════════════════════════════════
function KecamatanCard({ name, data }) {
  return (
    <div className="kecamatan-card">
      <div className="kecamatan-header">
        <div className="kecamatan-color-dot" style={{ background: data.color, color: data.color }} />
        <div className="kecamatan-name">{name}</div>
        <span style={{ fontSize: "0.67rem", background: `${data.color}22`, color: data.color, border: `1.5px solid ${data.color}55`, borderRadius: "20px", padding: "0.2rem 0.65rem", fontWeight: 700 }}>{data.kelurahan} Kelurahan</span>
      </div>
      <div className="kecamatan-body">
        <div className="kecamatan-stats-row">
          {[{ label: "Luas Wilayah", val: data.luas }, { label: "Penduduk 2024", val: data.penduduk2024.toLocaleString("id-ID") }, { label: "Kepadatan", val: `${data.kepadatan.toLocaleString("id-ID")} /km²` }, { label: "Kelurahan", val: `${data.kelurahan} kel.` }].map(s => (
            <div key={s.label} className="kecamatan-stat"><div className="kecamatan-stat-label">{s.label}</div><div className="kecamatan-stat-value">{s.val}</div></div>
          ))}
        </div>
        <div className="kecamatan-mini-stats">
          {[{ k: "TFR", v: data.indikator?.tfr }, { k: "AHH", v: data.indikator?.ahh != null ? `${data.indikator.ahh}` : null }, { k: "AKB", v: data.indikator?.akb }, { k: "IPM", v: data.indikator?.ipm }].filter(s => s.v != null).map(s => (
            <div key={s.k} className="kecamatan-mini-stat"><span className="mini-stat-label">{s.k}</span><span className="mini-stat-value" style={{ color: data.color }}>{s.v}</span></div>
          ))}
        </div>
        <div style={{ marginBottom: "0.875rem" }}>
          <div style={{ fontSize: "0.63rem", color: C.tMuted, marginBottom: "0.375rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Tren Penduduk</div>
          <ResponsiveContainer width="100%" height={65}>
            <AreaChart data={data.histori} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <defs><linearGradient id={`gkec-${name.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={data.color} stopOpacity={0.35} /><stop offset="95%" stopColor={data.color} stopOpacity={0.02} /></linearGradient></defs>
              <Area type="monotone" dataKey="nilai" stroke={data.color} strokeWidth={2} fill={`url(#gkec-${name.replace(/\s/g, "")})`} dot={false} animationDuration={500} />
              <XAxis dataKey="tahun" hide /><YAxis hide domain={["auto", "auto"]} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="kecamatan-highlights">
          {data.highlights.map((h, i) => <div key={i} className="kecamatan-highlight-item"><div className="highlight-bullet" style={{ background: data.color }} />{h}</div>)}
        </div>
      </div>
    </div>
  );
}

function TabKecamatan() {
  const { profilKecamatan } = useAppContext();
  return (
    <div className="tab-page">
      <div className="page-header"><h2 className="section-title">🗺️ Profil Kecamatan Kota Tegal</h2><p className="section-desc">Data kependudukan 4 kecamatan: Tegal Selatan, Tegal Timur, Tegal Barat, Margadana</p></div>
      <div className="kecamatan-grid">
        {Object.entries(profilKecamatan).map(([name, data]) => <KecamatanCard key={name} name={name} data={data} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 6 — TABEL DATA
// ═══════════════════════════════════════════════════════════════
function TabTabel() {
  const { indikatorData } = useAppContext();
  const INDIKATOR_NAMES = Object.keys(indikatorData);
  const [selInd, setSelInd] = useState(INDIKATOR_NAMES[0]);
  const [search, setSearch] = useState("");
  const info = indikatorData[selInd];
  const TAHUNS = (info.data["Kota Tegal (Kota)"] || []).map(d => d.tahun);
  const rows = KECAMATAN_LIST.filter(w => w.toLowerCase().includes(search.toLowerCase())).map(wilayah => {
    const raw = info.data[wilayah] || info.data["Kota Tegal (Kota)"] || [];
    const byT = {}; raw.forEach(d => { byT[d.tahun] = d.nilai; });
    const allT = raw.map(d => d.tahun).sort((a, b) => a - b);
    const interp = {};
    TAHUNS.forEach(yr => {
      if (byT[yr] !== undefined) { interp[yr] = byT[yr]; return; }
      const before = allT.filter(t => t < yr).at(-1), after = allT.find(t => t > yr);
      if (before && after) { const t = (yr - before) / (after - before); interp[yr] = +(byT[before] + (byT[after] - byT[before]) * t).toFixed(2); }
      else interp[yr] = byT[before] || byT[after] || null;
    });
    const v20 = interp[2020], v24 = interp[2024];
    const trend = v24 != null && v20 != null ? (v24 > v20 ? "↑" : v24 < v20 ? "↓" : "→") : "—";
    return { wilayah, interp, trend, tc: trend === "↑" ? "#15803D" : trend === "↓" ? C.red : C.tMuted };
  });
  const bw = {};
  TAHUNS.forEach(yr => { const vals = rows.map(r => r.interp[yr]).filter(v => v != null); bw[yr] = { best: Math.max(...vals), worst: Math.min(...vals) }; });
  return (
    <div className="tab-page">
      <div className="page-header"><h2 className="section-title">📋 Tabel Data Kependudukan</h2><p className="section-desc">Data per wilayah dan tahun — nilai terbaik (hijau) dan terburuk (merah) disorot</p></div>
      <div className="table-toolbar">
        <select className="select-input" style={{ flex: 1, maxWidth: 300 }} value={selInd} onChange={e => setSelInd(e.target.value)} id="tbl-ind">{INDIKATOR_NAMES.map(n => <option key={n}>{n}</option>)}</select>
        <input className="search-input" type="text" placeholder="🔍 Cari wilayah..." value={search} onChange={e => setSearch(e.target.value)} id="tbl-search" />
        <button className="btn-export" onClick={() => alert("Fitur export dalam pengembangan.")} id="btn-export">📥 Export CSV</button>
      </div>
      {info && <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}><PilarBadge pilar={info.pilar} /><span style={{ fontSize: "0.79rem", color: C.tMuted }}>{info.deskripsi}</span><span style={{ fontSize: "0.79rem", color: C.g700, fontWeight: 700 }}>Satuan: {info.satuan}</span></div>}
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Wilayah</th>{TAHUNS.map(y => <th key={y}>{y}</th>)}<th>Trend</th></tr></thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.wilayah}>
                <td className="wilayah-cell">{row.wilayah}</td>
                {TAHUNS.map(yr => { const val = row.interp[yr]; const isBest = rows.length > 1 && val === bw[yr]?.best; const isWorst = rows.length > 1 && val === bw[yr]?.worst; return <td key={yr} className={isBest ? "cell-best" : isWorst ? "cell-worst" : ""}>{val != null ? val.toLocaleString("id-ID") : "—"}</td>; })}
                <td><span style={{ color: row.tc, fontWeight: 700, fontSize: "1.05rem" }}>{row.trend}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 7 — AI (OpenCode Zen + DeepSeek V4 Flash Free)
// ═══════════════════════════════════════════════════════════════
const ZEN_BASE = import.meta.env.DEV ? "/zen" : "https://opencode.ai/zen/v1";
const ZEN_MODEL = "deepseek-v4-flash-free";
const ZEN_API_KEY = "sk-zAsyEJeJ1l8RHm4AM5skeiAuJm4PDJ7X6cETRrQ0sRHD1woWWcxCIIwlnAyn9i0b";

function TabAI() {
  const [messages, setMessages] = useState([{ role: "ai", content: "Halo! Saya **SIPENDUK-AI** 🤖\n\nSiap membantu analisis data kependudukan Kota Tegal 2020–2035. Silakan ajukan pertanyaan!" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text) => {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { role: "user", content: text }]); setInput(""); setLoading(true);
    const chatMessages = [
      { role: "system", content: AI_SYSTEM_PROMPT },
      ...messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
      { role: "user", content: text },
    ];
    try {
      const res = await fetch(`${ZEN_BASE}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${ZEN_API_KEY}` },
        body: JSON.stringify({ model: ZEN_MODEL, messages: chatMessages, max_tokens: 1024 }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `HTTP ${res.status}`); }
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", content: data.choices?.[0]?.message?.content || "Tidak ada respons." }]);
    } catch (err) { setMessages(prev => [...prev, { role: "ai", content: `⚠️ Error: ${err.message}` }]); } finally { setLoading(false); }
  };

  const fmt = t => t.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
  const DATA_KUNCI = [{ label: "Penduduk 2024", value: "286.950 jiwa" }, { label: "TFR", value: "1,87" }, { label: "AHH", value: "74,2 thn" }, { label: "IPM", value: "74,85" }, { label: "Stunting", value: "17,8%" }, { label: "Kemiskinan", value: "7,52%" }];

  return (
    <div className="tab-page" style={{ maxWidth: "none" }}>
      <div className="page-header">
        <div><h2 className="section-title">🤖 SIPENDUK-AI Konsultasi</h2><p className="section-desc">DeepSeek V4 Flash Free via OpenCode Zen</p></div>
      </div>
      <div className="ai-layout">
        <div className="chat-container">
          <div className="chat-header">
            <div className="chat-ai-avatar">🤖</div>
            <div>
              <div className="chat-ai-name">SIPENDUK-AI</div>
              <div className="chat-ai-status">
                <div className="status-dot" style={{ background: loading ? "#D97706" : "#16A34A" }} />
                {loading ? "Mengetik..." : "Online · Siap membantu"}
              </div>
            </div>
          </div>
          <div className="chat-messages" id="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <div className="msg-avatar">{m.role === "ai" ? "🤖" : "👤"}</div>
                <div className="msg-content" dangerouslySetInnerHTML={{ __html: fmt(m.content) }} />
              </div>
            ))}
            {loading && <div className="chat-msg ai"><div className="msg-avatar">🤖</div><div className="msg-content" style={{ background: C.bgSection, border: `1.5px solid ${C.border}`, borderRadius: "4px 10px 10px 10px" }}><div className="msg-typing"><div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" /></div></div></div>}
            <div ref={endRef} />
          </div>
          <div className="chat-input-area">
            <textarea className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} placeholder="Tanya tentang kependudukan Kota Tegal..." rows={1} disabled={loading} id="chat-input" />
            <button className="chat-send-btn" onClick={() => send(input)} disabled={loading || !input.trim()} id="btn-send">➤</button>
          </div>
        </div>
        <div className="ai-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-card-title">💬 Pertanyaan Cepat</div>
            <div className="quick-questions">{QUICK_QUESTIONS.map((q, i) => <button key={i} className="quick-q-btn" onClick={() => send(q)} disabled={loading} id={`qq-${i}`}>{q}</button>)}</div>
          </div>
          <div className="sidebar-card">
            <div className="sidebar-card-title">📊 Data Kunci 2024</div>
            {DATA_KUNCI.map(item => <div key={item.label} className="sidebar-data-item"><span className="sidebar-data-label">{item.label}</span><span className="sidebar-data-value">{item.value}</span></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════
// ── Live admin data banner (shown in user view) ─────────────────────────────
function AdminDataBanner({ onGoAdmin }) {
  const { getSummaryStats, getLatestData, pendudukData } = useAppContext();
  const stats = getSummaryStats();
  const latest = getLatestData(1)[0];
  return (
    <div style={{
      background: "linear-gradient(135deg, #1B6B6B, #134E4A)",
      border: "2px solid #0D9488",
      borderRadius: 14,
      padding: "1.25rem 1.5rem",
      marginBottom: "1.5rem",
      display: "flex",
      alignItems: "center",
      gap: "1.5rem",
      flexWrap: "wrap",
      boxShadow: "0 4px 20px rgba(13,148,136,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(45,212,191,0.2)", border: "1.5px solid #2DD4BF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>📡</div>
        <div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, color: "#2DD4BF", fontSize: "0.82rem", letterSpacing: "0.05em" }}>DATA AKTUAL ADMIN</div>
          <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.55)", marginTop: "0.1rem" }}>Real-time dari panel Admin Dukcapil</div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
        {[
          { label: "Total Record", val: stats.total.toLocaleString(), color: "#2DD4BF" },
          { label: "Kelahiran Total", val: stats.lahir.toLocaleString("id-ID"), color: "#86EFAC" },
          { label: "Kematian Total", val: stats.mati.toLocaleString("id-ID"), color: "#FCA5A5" },
          { label: "Pertumbuhan", val: (stats.pertumbuhan > 0 ? "+" : "") + stats.pertumbuhan.toLocaleString("id-ID"), color: "#FDE68A" },
        ].map(item => (
          <div key={item.label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1.05rem", fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.val}</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.5)", marginTop: "0.15rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
          </div>
        ))}
        {latest && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1.05rem", fontWeight: 800, color: "#C4B5FD", lineHeight: 1 }}>{latest.tahun}</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.5)", marginTop: "0.15rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Data Terakhir</div>
          </div>
        )}
      </div>
      {onGoAdmin && (
        <button onClick={onGoAdmin} style={{
          background: "linear-gradient(135deg, #2DD4BF, #14B8A6)",
          border: "none", borderRadius: 8, color: "#0D3B38",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontWeight: 800, fontSize: "0.75rem",
          padding: "0.6rem 1.25rem", cursor: "pointer",
          whiteSpace: "nowrap", flexShrink: 0,
          boxShadow: "0 3px 10px rgba(45,212,191,0.4)",
        }}>🔧 Panel Admin</button>
      )}
    </div>
  );
}

function saveSession(user, page, activeTab) {
  localStorage.setItem("sipenduk_session_v4", JSON.stringify({ user, page, activeTab }));
}

function loadSession() {
  try {
    const s = localStorage.getItem("sipenduk_session_v4");
    if (s) return JSON.parse(s);
  } catch (_) { }
  return null;
}

export default function App() {
  const saved = loadSession();
  // "landing" | "dashboard" | "admin"
  const [page, setPage] = useState(saved?.page || "landing");
  const [activeTab, setActiveTab] = useState(saved?.activeTab || "beranda");
  const [user, setUser] = useState(saved?.user || null);

  const handleLogin = (userData) => {
    setUser(userData);
    setPage("admin");
    setActiveTab("beranda");
    saveSession(userData, "admin", "beranda");
  };

  const handleLogout = () => {
    setUser(null);
    setPage("landing");
    setActiveTab("beranda");
    localStorage.removeItem("sipenduk_session_v4");
  };

  // Auto-save session on every state change
  useEffect(() => {
    if (user) saveSession(user, page, activeTab);
  }, [user, page, activeTab]);

  const enterDashboard = () => {
    setPage("dashboard");
    setActiveTab("beranda");
  };

  // ── LANDING ──
  if (page === "landing") {
    return <LandingPage onLogin={handleLogin} onEnterDashboard={enterDashboard} />;
  }

  // ── ADMIN DASHBOARD ──
  if (page === "admin") {
    return (
      <AdminDashboard
        user={user}
        onLogout={handleLogout}
        onViewSipenduk={() => { setPage("dashboard"); setActiveTab("beranda"); }}
      />
    );
  }

  // ── SIPENDUK USER VIEW ──
  const renderTab = () => {
    switch (activeTab) {
      case "beranda": return <TabBeranda onGoAdmin={user ? () => setPage("admin") : null} />;
      case "dashboard": return <TabDashboard />;
      case "piramida": return <TabPiramida />;
      case "analisis": return <TabAnalisis />;
      case "kecamatan": return <TabKecamatan />;
      case "tabel": return <TabTabel />;
      case "ai": return <TabAI />;
      default: return <TabBeranda onGoAdmin={user ? () => setPage("admin") : null} />;
    }
  };

  return (
    <>
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} user={user} onLogout={handleLogout} onGoAdmin={user ? () => setPage("admin") : null} />
      <main className="main-content" style={{ position: "relative", zIndex: 1 }}>
        {renderTab()}
      </main>
      <Footer />
    </>
  );
}
