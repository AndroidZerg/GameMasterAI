import React, { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { formatDuration, formatPrice } from "../utils/format";

function getAuthHeaders() {
  const token = localStorage.getItem("gmai_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const BASE = `${API_BASE}/api/v1/analytics`;

// ─── Styles ──────────────────────────────────────────────────

const s = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#e2e8f0",
    padding: "20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  card: {
    background: "#1e293b",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #334155",
  },
  metricCard: {
    background: "#1e293b",
    borderRadius: "12px",
    padding: "16px 20px",
    border: "1px solid #334155",
    textAlign: "center",
    flex: "1 1 140px",
    minWidth: 130,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 700,
    color: "#22c55e",
    lineHeight: 1.2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 4,
  },
  metricSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 20,
    padding: "8px 16px",
    fontSize: 13,
  },
  btn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
  input: {
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#e2e8f0",
    fontSize: 13,
  },
  th: {
    padding: "10px 12px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #334155",
  },
  td: {
    padding: "10px 12px",
    fontSize: 13,
    borderBottom: "1px solid #1e293b",
    whiteSpace: "nowrap",
  },
};

// ─── Sub-components ──────────────────────────────────────────

function PlatformBadge({ platform }) {
  const colors = { iOS: "#3b82f6", Android: "#22c55e", Desktop: "#64748b", Tablet: "#a855f7" };
  const bg = colors[platform] || "#64748b";
  return (
    <span style={{ background: bg, color: "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
      {platform}
    </span>
  );
}

function ReturnBadge() {
  return (
    <span style={{ background: "#166534", color: "#22c55e", padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 700, marginLeft: 6 }}>
      RETURN
    </span>
  );
}

function HeatmapCell({ count, max }) {
  const intensity = max > 0 ? Math.min(count / max, 1) : 0;
  const r = Math.round(15 + (34 - 15) * intensity);
  const g = Math.round(23 + (197 - 23) * intensity);
  const b = Math.round(42 + (94 - 42) * intensity);
  return (
    <div
      title={`${count} sessions`}
      style={{
        width: 20, height: 20, borderRadius: 3,
        backgroundColor: count > 0 ? `rgb(${r},${g},${b})` : "#1e293b",
        border: "1px solid #334155",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 8, color: intensity > 0.5 ? "#fff" : "#475569",
      }}
    >
      {count > 0 ? count : ""}
    </div>
  );
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Expanded Device Row ─────────────────────────────────────

function DeviceExpanded({ deviceId }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("timeline");

  useEffect(() => {
    fetch(`${BASE}/devices/${deviceId}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deviceId]);

  if (loading) return <tr><td colSpan={13} style={{ ...s.td, color: "#64748b", padding: 20 }}>Loading device details...</td></tr>;
  if (!detail || !detail.device) return <tr><td colSpan={13} style={s.td}>No data</td></tr>;

  const sections = ["timeline", "games", "questions", "orders", "tts", "voice"];
  const sectionLabels = { timeline: "Timeline", games: "Games Browsed", questions: "Questions", orders: "Orders", tts: "TTS Usage", voice: "Voice vs Text" };

  return (
    <tr>
      <td colSpan={13} style={{ padding: "0 12px 16px 40px", background: "#0f172a" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, marginTop: 8 }}>
          {sections.map((sec) => (
            <button key={sec} onClick={() => setActiveSection(sec)} style={{
              ...s.btn,
              background: activeSection === sec ? "#22c55e" : "#1e293b",
              color: activeSection === sec ? "#000" : "#94a3b8",
              fontSize: 12, padding: "5px 12px",
            }}>
              {sectionLabels[sec]}
            </button>
          ))}
        </div>

        {activeSection === "timeline" && (
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {(detail.sessions || []).map((sess) => (
              <div key={sess.session_id} style={{ ...s.card, marginBottom: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Session: {sess.session_id?.slice(0, 12)}...</span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{sess.started_at?.replace("T", " ").slice(0, 19)}</span>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  Duration: {sess.duration_seconds ? formatDuration(sess.duration_seconds) : "—"} ·
                  Games: {sess.games_viewed?.join(", ") || "—"} ·
                  Questions: {sess.questions_asked} · Orders: {sess.orders_placed}
                </div>
              </div>
            ))}
            {(!detail.sessions || detail.sessions.length === 0) && <div style={{ color: "#64748b", fontSize: 13 }}>No sessions recorded</div>}
          </div>
        )}

        {activeSection === "games" && (
          <div>
            {(detail.games_browsed || []).map((g) => (
              <div key={g.game_id} style={{ display: "flex", gap: 16, padding: "6px 0", fontSize: 13, borderBottom: "1px solid #1e293b" }}>
                <span style={{ flex: 1, fontWeight: 600 }}>{g.title}</span>
                <span style={{ color: "#64748b" }}>Dwell: {g.dwell_seconds ? formatDuration(g.dwell_seconds) : "—"}</span>
                <span style={{ color: "#3b82f6" }}>{g.questions} questions</span>
              </div>
            ))}
            {(!detail.games_browsed || detail.games_browsed.length === 0) && <div style={{ color: "#64748b", fontSize: 13 }}>No games browsed</div>}
          </div>
        )}

        {activeSection === "questions" && (
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {(detail.questions || []).map((q, i) => (
              <div key={i} style={{ padding: "6px 0", fontSize: 13, borderBottom: "1px solid #1e293b" }}>
                <div style={{ fontWeight: 600 }}>{q.question || "—"}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{q.game_id} · {q.timestamp?.replace("T", " ").slice(0, 19)}</div>
              </div>
            ))}
            {(!detail.questions || detail.questions.length === 0) && <div style={{ color: "#64748b", fontSize: 13 }}>No questions asked</div>}
          </div>
        )}

        {activeSection === "orders" && (
          <div>
            {(detail.orders || []).map((o, i) => (
              <div key={i} style={{ ...s.card, marginBottom: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    {(o.items || []).map((it) => `${it.name || it.item_name || "Item"} x${it.qty || 1}`).join(", ") || "Order"}
                  </span>
                  <span style={{ color: "#22c55e", fontWeight: 700 }}>{formatPrice(o.subtotal_cents || 0)}</span>
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Game: {o.game_id || "—"} · {o.timestamp?.replace("T", " ").slice(0, 19)}</div>
              </div>
            ))}
            {(!detail.orders || detail.orders.length === 0) && <div style={{ color: "#64748b", fontSize: 13 }}>No orders placed</div>}
          </div>
        )}

        {activeSection === "tts" && (
          <div>
            {(detail.tts_usage || []).map((t, i) => (
              <div key={i} style={{ padding: "6px 0", fontSize: 13, borderBottom: "1px solid #1e293b" }}>
                <span style={{ fontWeight: 600 }}>{t.game_id}</span> · Tab: {t.tab || "—"} · {t.seconds}s
              </div>
            ))}
            {(!detail.tts_usage || detail.tts_usage.length === 0) && <div style={{ color: "#64748b", fontSize: 13 }}>No TTS usage</div>}
          </div>
        )}

        {activeSection === "voice" && (
          <div style={{ display: "flex", gap: 24, fontSize: 16, padding: 12 }}>
            <span><strong style={{ color: "#22c55e" }}>{detail.voice_vs_text?.voice || 0}</strong> voice</span>
            <span><strong style={{ color: "#3b82f6" }}>{detail.voice_vs_text?.text || 0}</strong> text</span>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Main Dashboard Component ────────────────────────────────

export default function AnalyticsDashboard({ venueScope = null }) {
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";
  const isVenueScoped = !!venueScope;

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venueId, setVenueId] = useState(venueScope || "");
  const [activeTab, setActiveTab] = useState("customers");

  // Data
  const [summary, setSummary] = useState(null);
  const [devices, setDevices] = useState(null);
  const [dwellPages, setDwellPages] = useState(null);
  const [dwellTabs, setDwellTabs] = useState(null);
  const [topQuestions, setTopQuestions] = useState(null);
  const [topGames, setTopGames] = useState(null);
  const [timeToOrder, setTimeToOrder] = useState(null);
  const [inputMethods, setInputMethods] = useState(null);
  const [peakHours, setPeakHours] = useState(null);
  const [loading, setLoading] = useState(true);

  // Table state
  const [sortBy, setSortBy] = useState("last_active");
  const [sortDir, setSortDir] = useState("desc");
  const [expandedDevices, setExpandedDevices] = useState(new Set());
  const [page, setPage] = useState(1);

  const queryParams = useCallback(() => {
    const p = new URLSearchParams();
    if (venueId) p.set("venue_id", venueId);
    if (startDate) p.set("start_date", startDate);
    if (endDate) p.set("end_date", endDate);
    return p.toString() ? `?${p.toString()}` : "";
  }, [venueId, startDate, endDate]);

  const fetchAll = useCallback(() => {
    setLoading(true);
    const q = queryParams();
    const headers = getAuthHeaders();
    const f = (url) => fetch(`${BASE}${url}${q}`, { headers }).then((r) => r.json()).catch(() => null);

    Promise.all([
      f("/summary"),
      f(`/devices?page=${page}&per_page=50&sort_by=${sortBy === "last_active" ? "last_seen_at" : sortBy}&sort_dir=${sortDir}`),
      f("/dwell/pages"),
      f("/dwell/tabs"),
      f("/top-questions"),
      f("/top-games"),
      f("/time-to-order"),
      f("/input-methods"),
      f("/peak-hours"),
    ]).then(([sum, dev, dp, dt, tq, tg, tto, im, ph]) => {
      setSummary(sum);
      setDevices(dev);
      setDwellPages(dp);
      setDwellTabs(dt);
      setTopQuestions(tq);
      setTopGames(tg);
      setTimeToOrder(tto);
      setInputMethods(im);
      setPeakHours(ph);
    }).finally(() => setLoading(false));
  }, [queryParams, page, sortBy, sortDir]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const toggleExpand = (did) => {
    setExpandedDevices((prev) => {
      const next = new Set(prev);
      if (next.has(did)) next.delete(did);
      else next.add(did);
      return next;
    });
  };

  const expandAll = () => {
    if (!devices?.devices) return;
    if (expandedDevices.size === devices.devices.length) {
      setExpandedDevices(new Set());
    } else {
      setExpandedDevices(new Set(devices.devices.map((d) => d.device_id)));
    }
  };

  const handleExport = async () => {
    const q = queryParams();
    try {
      const res = await fetch(`${BASE}/export${q}`, { headers: getAuthHeaders() });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gmai_devices_export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { /* ignore */ }
  };

  // ── Peak hours heatmap grid ──
  const heatGrid = Array.from({ length: 7 }, () => Array(24).fill(0));
  const heatMax = { v: 1 };
  if (peakHours?.heatmap) {
    peakHours.heatmap.forEach((h) => {
      if (h.day >= 0 && h.day < 7 && h.hour >= 0 && h.hour < 24) {
        heatGrid[h.day][h.hour] = h.count;
        if (h.count > heatMax.v) heatMax.v = h.count;
      }
    });
  }

  // ── Top games bar max ──
  const topGamesMax = topGames?.games?.length ? Math.max(...topGames.games.map((g) => g.count), 1) : 1;

  // ── Time to order bar max ──
  const ttoMax = timeToOrder?.buckets?.length ? Math.max(...timeToOrder.buckets.map((b) => b.count), 1) : 1;

  // ── Voice/text totals ──
  const voiceTotal = (inputMethods?.voice || 0) + (inputMethods?.text || 0);
  const voicePct = voiceTotal > 0 ? Math.round((inputMethods?.voice || 0) / voiceTotal * 100) : 0;
  const textPct = 100 - voicePct;

  if (loading && !summary) {
    return <div style={s.page}><p style={{ color: "#64748b", fontSize: 16, textAlign: "center", marginTop: 100 }}>Loading analytics dashboard...</p></div>;
  }

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      {!isVenueScoped && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#f1f5f9" }}>GMAI Analytics</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>Patron behavior tracking & CRM</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={s.input} />
            <span style={{ color: "#64748b" }}>to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={s.input} />
            {isSuperAdmin && !isVenueScoped && (
              <input
                type="text"
                placeholder="Venue ID"
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                style={{ ...s.input, width: 120 }}
              />
            )}
            <button onClick={handleExport} style={{ ...s.btn, background: "#f97316", color: "#fff" }}>Export CSV</button>
            <button onClick={fetchAll} style={{ ...s.btn, background: "#334155", color: "#e2e8f0" }}>Refresh</button>
          </div>
        </div>
      )}

      {/* Venue-scoped header (simpler) */}
      {isVenueScoped && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={s.input} />
            <span style={{ color: "#64748b" }}>to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={s.input} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleExport} style={{ ...s.btn, background: "#f97316", color: "#fff", fontSize: 12 }}>Export</button>
            <button onClick={fetchAll} style={{ ...s.btn, background: "#334155", color: "#e2e8f0", fontSize: 12 }}>Refresh</button>
          </div>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #334155", paddingBottom: 8 }}>
        {[
          { key: "customers", label: `Customers (${summary?.total_devices || 0})` },
          { key: "events", label: `Raw Events (${summary?.total_events || 0})` },
          { key: "feedback", label: "Feedback" },
        ].map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            ...s.btn,
            background: activeTab === t.key ? "#22c55e" : "transparent",
            color: activeTab === t.key ? "#000" : "#94a3b8",
            borderBottom: activeTab === t.key ? "2px solid #22c55e" : "2px solid transparent",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "events" && (
        <div style={{ ...s.card, color: "#64748b", textAlign: "center", padding: 40 }}>
          Raw Events view — coming soon
        </div>
      )}

      {activeTab === "feedback" && (
        <div style={{ ...s.card, color: "#64748b", textAlign: "center", padding: 40 }}>
          Feedback view — coming soon
        </div>
      )}

      {activeTab === "customers" && (
        <>
          {/* ── Summary Cards ── */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={s.metricCard}>
              <div style={s.metricLabel}>Total Devices</div>
              <div style={s.metricValue}>{summary?.total_devices ?? "—"}</div>
              <div style={s.metricSub}>Unique Visitors</div>
            </div>
            <div style={s.metricCard}>
              <div style={s.metricLabel}>Returning</div>
              <div style={s.metricValue}>{summary?.returning_pct ?? 0}%</div>
              <div style={s.metricSub}>{summary?.returning_count ?? 0} devices</div>
            </div>
            <div style={s.metricCard}>
              <div style={s.metricLabel}>Avg Names/Device</div>
              <div style={s.metricValue}>{summary?.avg_names_per_device ?? "—"}</div>
            </div>
            <div style={s.metricCard}>
              <div style={s.metricLabel}>Avg Visits</div>
              <div style={s.metricValue}>{summary?.avg_visits ?? "—"}</div>
              <div style={s.metricSub}>Per device</div>
            </div>
            <div style={s.metricCard}>
              <div style={s.metricLabel}>Avg Session</div>
              <div style={s.metricValue}>{summary?.avg_session_seconds ? formatDuration(summary.avg_session_seconds) : "—"}</div>
            </div>
            <div style={s.metricCard}>
              <div style={s.metricLabel}>Avg Order</div>
              <div style={s.metricValue}>${summary?.avg_order_dollars?.toFixed(2) ?? "0.00"}</div>
            </div>
            <div style={s.metricCard}>
              <div style={s.metricLabel}>Total Events</div>
              <div style={s.metricValue}>{summary?.total_events?.toLocaleString() ?? "—"}</div>
            </div>
            <div style={s.metricCard}>
              <div style={s.metricLabel}>Top Game</div>
              <div style={{ ...s.metricValue, fontSize: 18 }}>{summary?.top_game?.title ?? "—"}</div>
              <div style={s.metricSub}>{summary?.top_game?.count ?? 0} plays</div>
            </div>
          </div>

          {/* ── Dwell Time per Page ── */}
          {dwellPages?.pages?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, color: "#94a3b8", marginBottom: 8, fontWeight: 600 }}>Avg Dwell Time per Page</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {dwellPages.pages.map((p) => (
                  <div key={p.page} style={s.pill}>
                    <span style={{ fontWeight: 700, color: "#e2e8f0" }}>{p.page}</span>
                    <span style={{ color: "#22c55e" }}>{formatDuration(Math.round(p.avg_seconds))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Dwell Time per Tab ── */}
          {dwellTabs?.tabs?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, color: "#94a3b8", marginBottom: 8, fontWeight: 600 }}>Avg Dwell Time per Tab</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {dwellTabs.tabs.map((t) => (
                  <div key={t.tab} style={s.pill}>
                    <span style={{ fontWeight: 700, color: "#e2e8f0" }}>{t.tab}</span>
                    <span style={{ color: "#3b82f6" }}>{formatDuration(Math.round(t.avg_seconds))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Customers Table ── */}
          <div style={{ ...s.card, padding: 0, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #334155" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Customers ({devices?.total ?? 0})</h3>
              <button onClick={expandAll} style={{ ...s.btn, background: "#334155", color: "#94a3b8", fontSize: 12 }}>
                {expandedDevices.size === (devices?.devices?.length || 0) ? "Collapse All" : "Expand All"}
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#0f172a" }}>
                    <th style={{ ...s.th, width: 32 }}></th>
                    {[
                      { key: "device_name", label: "Device" },
                      { key: "platform", label: "Platform" },
                      { key: "visit_count", label: "Visits" },
                      { key: null, label: "Stage Names" },
                      { key: null, label: "Games" },
                      { key: null, label: "Questions" },
                      { key: null, label: "TTS" },
                      { key: null, label: "Orders" },
                      { key: null, label: "Spent" },
                      { key: null, label: "Avg Session" },
                      { key: "total_events", label: "Events" },
                      { key: "last_active", label: "Last Active" },
                    ].map((col, i) => (
                      <th key={i} onClick={col.key ? () => handleSort(col.key) : undefined}
                        style={{ ...s.th, cursor: col.key ? "pointer" : "default" }}>
                        {col.label}
                        {col.key && sortBy === col.key && (
                          <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "▲" : "▼"}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(devices?.devices || []).map((d) => (
                    <React.Fragment key={d.device_id}>
                      <tr onClick={() => toggleExpand(d.device_id)}
                        style={{ cursor: "pointer", background: expandedDevices.has(d.device_id) ? "#0f172a" : "transparent" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#162032"}
                        onMouseLeave={(e) => e.currentTarget.style.background = expandedDevices.has(d.device_id) ? "#0f172a" : "transparent"}>
                        <td style={s.td}>{expandedDevices.has(d.device_id) ? "▼" : "▶"}</td>
                        <td style={s.td}>
                          <span style={{ fontSize: 13 }}>{d.device_name}</span>
                          {d.is_returning && <ReturnBadge />}
                        </td>
                        <td style={s.td}><PlatformBadge platform={d.platform} /></td>
                        <td style={s.td}>
                          {d.visit_count > 1 ? <span style={{ color: "#22c55e", fontWeight: 700 }}>{d.visit_count}x</span> : d.visit_count}
                        </td>
                        <td style={s.td}>
                          {d.stage_names?.length > 1
                            ? <span style={{ color: "#22c55e" }}>{d.stage_names.length} names</span>
                            : d.stage_names?.[0] || "—"}
                        </td>
                        <td style={s.td}>{d.games_played}</td>
                        <td style={s.td}>{d.questions_asked}</td>
                        <td style={s.td}>{d.tts_uses}</td>
                        <td style={s.td}>{d.orders}</td>
                        <td style={s.td}>{d.spent_cents > 0 ? formatPrice(d.spent_cents) : "—"}</td>
                        <td style={s.td}>{d.avg_session_seconds > 0 ? formatDuration(d.avg_session_seconds) : "—"}</td>
                        <td style={s.td}>{d.total_events}</td>
                        <td style={{ ...s.td, fontSize: 12, color: "#64748b" }}>
                          {d.last_active ? d.last_active.replace("T", " ").slice(0, 16) : "—"}
                        </td>
                      </tr>
                      {expandedDevices.has(d.device_id) && <DeviceExpanded deviceId={d.device_id} />}
                    </React.Fragment>
                  ))}
                  {(!devices?.devices || devices.devices.length === 0) && (
                    <tr><td colSpan={13} style={{ ...s.td, textAlign: "center", color: "#64748b", padding: 32 }}>No devices found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {devices && devices.total > devices.per_page && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: 16 }}>
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ ...s.btn, background: "#334155", color: "#e2e8f0", opacity: page <= 1 ? 0.4 : 1 }}>Prev</button>
                <span style={{ padding: "8px 12px", color: "#94a3b8", fontSize: 13 }}>Page {page} of {Math.ceil(devices.total / devices.per_page)}</span>
                <button disabled={page >= Math.ceil(devices.total / devices.per_page)} onClick={() => setPage(page + 1)} style={{ ...s.btn, background: "#334155", color: "#e2e8f0", opacity: page >= Math.ceil(devices.total / devices.per_page) ? 0.4 : 1 }}>Next</button>
              </div>
            )}
          </div>

          {/* ── Top Questions ── */}
          {topQuestions?.questions?.length > 0 && (
            <div style={{ ...s.card, marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Top Questions Asked</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...s.th, width: 40 }}>#</th>
                    <th style={s.th}>Question</th>
                    <th style={s.th}>Game</th>
                    <th style={{ ...s.th, textAlign: "right" }}>Times Asked</th>
                  </tr>
                </thead>
                <tbody>
                  {topQuestions.questions.map((q, i) => (
                    <tr key={i}>
                      <td style={{ ...s.td, color: "#64748b" }}>{i + 1}</td>
                      <td style={{ ...s.td, whiteSpace: "normal", maxWidth: 400 }}>{q.question}</td>
                      <td style={{ ...s.td, color: "#3b82f6" }}>{q.game_id || "—"}</td>
                      <td style={{ ...s.td, textAlign: "right", fontWeight: 700, color: "#22c55e" }}>{q.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Top Games bar chart ── */}
          {topGames?.games?.length > 0 && (
            <div style={{ ...s.card, marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Top Games by Usage</h3>
              {topGames.games.map((g) => (
                <div key={g.game_id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ flex: "0 0 160px", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.title}</span>
                  <div style={{ flex: 1, height: 20, background: "#0f172a", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      width: `${(g.count / topGamesMax) * 100}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #22c55e, #06b6d4)",
                      borderRadius: 4,
                      minWidth: 4,
                    }} />
                  </div>
                  <span style={{ flex: "0 0 40px", fontSize: 13, color: "#94a3b8", textAlign: "right" }}>{g.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Time to First Order ── */}
          {timeToOrder?.buckets && (
            <div style={{ ...s.card, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Time to First Order</h3>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#f97316" }}>{timeToOrder.avg_minutes || 0} min</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Average</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
                {timeToOrder.buckets.map((b) => (
                  <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{b.count}</span>
                    <div style={{
                      width: "100%",
                      height: `${ttoMax > 0 ? (b.count / ttoMax) * 100 : 0}%`,
                      minHeight: b.count > 0 ? 8 : 2,
                      background: "linear-gradient(180deg, #f97316, #ea580c)",
                      borderRadius: "4px 4px 0 0",
                    }} />
                    <span style={{ fontSize: 10, color: "#64748b", textAlign: "center" }}>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Voice vs Text ── */}
          {voiceTotal > 0 && (
            <div style={{ ...s.card, marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Voice vs Text Input</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                {/* Donut-ish visual */}
                <div style={{ position: "relative", width: 120, height: 120 }}>
                  <svg viewBox="0 0 36 36" style={{ width: 120, height: 120, transform: "rotate(-90deg)" }}>
                    <circle cx="18" cy="18" r="15.91" fill="none" stroke="#1e293b" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.91" fill="none" stroke="#22c55e" strokeWidth="3"
                      strokeDasharray={`${voicePct} ${100 - voicePct}`} strokeDashoffset="0" />
                    <circle cx="18" cy="18" r="15.91" fill="none" stroke="#3b82f6" strokeWidth="3"
                      strokeDasharray={`${textPct} ${100 - textPct}`} strokeDashoffset={`-${voicePct}`} />
                  </svg>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{voiceTotal}</div>
                    <div style={{ fontSize: 9, color: "#64748b" }}>total</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: "#22c55e" }} />
                    <span style={{ fontSize: 14 }}>Voice: <strong>{inputMethods?.voice || 0}</strong> ({voicePct}%)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: "#3b82f6" }} />
                    <span style={{ fontSize: 14 }}>Text: <strong>{inputMethods?.text || 0}</strong> ({textPct}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Peak Hours Heatmap ── */}
          <div style={{ ...s.card, marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Peak Usage Hours</h3>
            <div style={{ overflowX: "auto" }}>
              {/* Hour labels */}
              <div style={{ display: "flex", gap: 2, marginLeft: 40, marginBottom: 4 }}>
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} style={{ width: 20, textAlign: "center", fontSize: 9, color: "#475569" }}>{i}</div>
                ))}
              </div>
              {heatGrid.map((hours, dayIdx) => (
                <div key={dayIdx} style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }}>
                  <span style={{ width: 36, fontSize: 11, color: "#64748b", textAlign: "right", marginRight: 4 }}>{DAY_NAMES[dayIdx]}</span>
                  {hours.map((count, h) => (
                    <HeatmapCell key={h} count={count} max={heatMax.v} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
