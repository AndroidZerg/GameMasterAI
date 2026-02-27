import { useState, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE } from "../services/api";
import OverviewSection from "../components/dashboard/OverviewSection";
import DevicesSection from "../components/dashboard/DevicesSection";
import GamesSection from "../components/dashboard/GamesSection";
import QASection from "../components/dashboard/QASection";
import OrdersSection from "../components/dashboard/OrdersSection";
import VoiceSection from "../components/dashboard/VoiceSection";
import VenuesSection from "../components/dashboard/VenuesSection";
import LeadsSection from "../components/dashboard/LeadsSection";
import ConfigSection from "../components/dashboard/ConfigSection";

const SIDEBAR_ITEMS = [
  { key: "overview", label: "Overview", icon: "\u{1F4CA}" },
  { key: "devices", label: "Devices", icon: "\u{1F4F1}" },
  { key: "games", label: "Games", icon: "\u{1F3AE}" },
  { key: "qa", label: "Q&A", icon: "\u{1F4AC}" },
  { key: "orders", label: "Orders", icon: "\u{1F354}" },
  { key: "voice", label: "Voice", icon: "\u{1F50A}" },
  { key: "venues", label: "Venues", icon: "\u{1F3EA}", superOnly: true },
  { key: "leads", label: "Leads", icon: "\u{1F4E8}", superOnly: true },
  { key: "config", label: "Config", icon: "\u2699\uFE0F" },
];

const EXPORTABLE_SECTIONS = ["overview", "devices", "games", "qa", "orders", "voice", "venues", "leads"];

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function downloadWorkbook(wb, filename) {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminDashboard() {
  const { role, venueId: authVenueId, token } = useAuth();
  const isSuperAdmin = role === "super_admin";

  const [activeSection, setActiveSection] = useState("overview");
  const [venueId, setVenueId] = useState(isSuperAdmin ? "" : (authVenueId || ""));
  const [venues, setVenues] = useState([]);
  const [dates, setDates] = useState(getDefaultDates);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch venues list
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/v1/analytics/venues-list`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setVenues(Array.isArray(data) ? data : []))
      .catch(() => setVenues([]));
  }, [token]);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClickOutside = () => setShowExportMenu(false);
    // Delay listener so the opening click doesn't immediately close it
    const id = setTimeout(() => document.addEventListener("click", handleClickOutside), 0);
    return () => { clearTimeout(id); document.removeEventListener("click", handleClickOutside); };
  }, [showExportMenu]);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Allow venue selection from child components (e.g., Venues CRM table)
  const selectVenue = useCallback((vid) => {
    if (isSuperAdmin) setVenueId(vid);
  }, [isSuperAdmin]);

  const filterProps = useMemo(() => ({
    venueId,
    startDate: dates.start,
    endDate: dates.end,
    refreshKey,
    token,
    isSuperAdmin,
    selectVenue,
  }), [venueId, dates.start, dates.end, refreshKey, token, isSuperAdmin, selectVenue]);

  const visibleItems = SIDEBAR_ITEMS.filter(
    (item) => !item.superOnly || isSuperAdmin
  );

  // ── Export helpers ──

  function buildQs() {
    const params = new URLSearchParams();
    if (venueId) params.set("venue_id", venueId);
    if (dates.start) params.set("start_date", dates.start);
    if (dates.end) params.set("end_date", dates.end);
    const s = params.toString();
    return s ? `?${s}` : "";
  }

  function venueSuffix() {
    if (!venueId) return "All_Venues";
    const v = venues.find((x) => x.venue_id === venueId);
    return (v?.venue_name || venueId).replace(/[^a-zA-Z0-9]/g, "_");
  }

  async function apiFetch(path) {
    const r = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  }

  async function fetchSheetData(section) {
    const qs = buildQs();
    const qsAmp = qs ? "&" + qs.slice(1) : "";

    switch (section) {
      case "overview": {
        const s = await apiFetch(`/api/v1/analytics/summary${qs}`);
        const sheet = XLSX.utils.aoa_to_sheet([
          ["GMAI Dashboard \u2014 Overview"],
          [],
          ["Metric", "Value"],
          ["Total Devices", s.total_devices ?? 0],
          ["Returning Devices", s.returning_count ?? 0],
          ["Returning %", s.returning_pct ? `${s.returning_pct}%` : "0%"],
          ["Total Sessions", s.total_sessions ?? 0],
          ["Avg Session (seconds)", s.avg_session_seconds ?? 0],
          ["Questions Asked", s.total_questions ?? 0],
          ["Orders Placed", s.total_orders ?? 0],
          ["Revenue ($)", s.total_revenue_cents ? (s.total_revenue_cents / 100).toFixed(2) : "0.00"],
          ["Avg Time to Order (min)", s.avg_time_to_order_minutes ?? 0],
          ["Top Game", s.top_game?.title ?? "N/A"],
          ["Top Game Plays", s.top_game?.count ?? 0],
          ["Total Events", s.total_events ?? 0],
        ]);
        sheet["!cols"] = [{ wch: 25 }, { wch: 20 }];
        return { name: "Overview", sheet };
      }

      case "devices": {
        // Paginate — max 200 per page
        let devices = [];
        let page = 1;
        while (true) {
          const data = await apiFetch(`/api/v1/analytics/devices?per_page=200&page=${page}${qsAmp}`);
          const batch = data.devices || [];
          devices = devices.concat(batch);
          if (batch.length < 200 || devices.length >= (data.total || 0)) break;
          page++;
        }
        const sheet = XLSX.utils.aoa_to_sheet([
          ["Device", "Platform", "Returning", "Visits", "Player Names", "Games Played", "Questions", "TTS Uses", "Orders", "Spent ($)", "Avg Session (s)", "Events", "Last Active"],
          ...devices.map((d) => [
            d.device_name || "Unknown",
            d.platform || "",
            d.is_returning ? "Yes" : "No",
            d.visit_count ?? 0,
            Array.isArray(d.stage_names) ? d.stage_names.join(", ") : "",
            d.games_played ?? 0,
            d.questions_asked ?? 0,
            d.tts_uses ?? 0,
            d.orders ?? 0,
            d.spent_cents ? (d.spent_cents / 100).toFixed(2) : "0.00",
            d.avg_session_seconds ?? 0,
            d.total_events ?? 0,
            d.last_active || "",
          ]),
        ]);
        sheet["!cols"] = [{ wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 20 }];
        return { name: "Devices", sheet };
      }

      case "games": {
        const [topGames, gameStats, discovery, searches, filterUsage, unused] = await Promise.all([
          apiFetch(`/api/v1/analytics/top-games${qs}`),
          apiFetch(`/api/v1/analytics/game-stats${qs}`),
          apiFetch(`/api/v1/analytics/game-discovery${qs}`),
          apiFetch(`/api/v1/analytics/search-queries${qs}`),
          apiFetch(`/api/v1/analytics/filter-usage${qs}`),
          apiFetch(`/api/v1/analytics/unused-games${qs}`),
        ]);
        const statsMap = {};
        for (const g of (gameStats.games || [])) statsMap[g.game_id] = g;

        const rows = [
          ["TOP GAMES"],
          ["Rank", "Game", "Times Selected", "Questions", "Orders During Play", "Avg Play Time (s)"],
          ...(topGames.games || []).map((g, i) => {
            const st = statsMap[g.game_id] || {};
            return [i + 1, g.title || g.game_id, g.count ?? 0, st.questions_asked ?? 0, st.orders_during_play ?? 0, st.avg_play_time_seconds ?? ""];
          }),
          [],
          ["GAME DISCOVERY"],
          ["Source", "Count"],
          ...(discovery.sources || []).map((s) => [s.source, s.count]),
          [],
          ["SEARCH QUERIES"],
          ["Query", "Times Searched"],
          ...(searches.queries || []).map((q) => [q.query, q.count]),
          [],
          ["FILTER USAGE"],
          ["Filter", "Value", "Count"],
          ...(filterUsage.filters || []).map((f) => [f.filter_type, f.filter_value, f.count]),
          [],
          ["GAMES NEVER PLAYED"],
          ["Game"],
          ...(unused.games || []).map((g) => [g.title || g.game_id]),
        ];
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        sheet["!cols"] = [{ wch: 8 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
        return { name: "Games", sheet };
      }

      case "qa": {
        const [topQ, categories] = await Promise.all([
          apiFetch(`/api/v1/analytics/top-questions${qs}`),
          apiFetch(`/api/v1/analytics/question-categories${qs}`),
        ]);
        const rows = [
          ["TOP QUESTIONS"],
          ["Rank", "Question", "Game", "Times Asked"],
          ...(topQ.questions || []).map((q, i) => [i + 1, q.question || q.question_text || "", q.game_id || "", q.count]),
          [],
          ["QUESTION CATEGORIES"],
          ["Category", "Count", "Percentage"],
          ...(categories.categories || []).map((c) => [c.category, c.count, c.percentage ? `${c.percentage}%` : ""]),
        ];
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        sheet["!cols"] = [{ wch: 8 }, { wch: 50 }, { wch: 20 }, { wch: 12 }];
        return { name: "QA", sheet };
      }

      case "orders": {
        const [timeToOrder, details, popular] = await Promise.all([
          apiFetch(`/api/v1/analytics/time-to-order${qs}`),
          apiFetch(`/api/v1/analytics/order-details${qs}`),
          apiFetch(`/api/v1/analytics/popular-items${qs}`),
        ]);
        const rows = [
          ["TIME TO FIRST ORDER"],
          ["Bucket", "Count"],
          ...(timeToOrder.buckets || []).map((b) => [b.label, b.count]),
          ["Average Minutes", timeToOrder.avg_minutes ?? ""],
          [],
          ["ORDER DETAILS"],
          ["Time", "Device", "Game", "Items", "Total ($)", "Minutes Into Game"],
          ...(details.orders || []).map((o) => [
            o.timestamp || "",
            o.device_name || "",
            o.game_title || "",
            o.items || "",
            o.subtotal_cents ? (o.subtotal_cents / 100).toFixed(2) : "0.00",
            o.minutes_into_game ?? "",
          ]),
          [],
          ["MOST ORDERED ITEMS"],
          ["Item", "Times Ordered", "Revenue ($)"],
          ...(popular.items || []).map((it) => [it.name, it.count, it.revenue_cents ? (it.revenue_cents / 100).toFixed(2) : ""]),
        ];
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        sheet["!cols"] = [{ wch: 22 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 18 }];
        return { name: "Orders", sheet };
      }

      case "voice": {
        const [inputMethods, ttsByTab] = await Promise.all([
          apiFetch(`/api/v1/analytics/input-methods${qs}`),
          apiFetch(`/api/v1/analytics/tts-by-tab${qs}`),
        ]);
        const total = (inputMethods.voice ?? 0) + (inputMethods.text ?? 0);
        const rows = [
          ["VOICE VS TEXT"],
          ["Method", "Count", "Percentage"],
          ["Voice", inputMethods.voice ?? 0, total > 0 ? `${((inputMethods.voice / total) * 100).toFixed(1)}%` : "0%"],
          ["Text", inputMethods.text ?? 0, total > 0 ? `${((inputMethods.text / total) * 100).toFixed(1)}%` : "0%"],
          [],
          ["TTS BY TAB"],
          ["Tab", "Play Count", "Avg Duration (s)"],
          ...(ttsByTab.tabs || []).map((t) => [t.tab, t.play_count, t.avg_duration_seconds ?? ""]),
        ];
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        sheet["!cols"] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }];
        return { name: "Voice", sheet };
      }

      case "venues": {
        const venuesList = await apiFetch(`/api/v1/analytics/venues-list`);
        const list = Array.isArray(venuesList) ? venuesList : [];
        const rows = [
          ["Venue ID", "Venue Name"],
          ...list.map((v) => [v.venue_id || "", v.venue_name || ""]),
        ];
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        sheet["!cols"] = [{ wch: 25 }, { wch: 30 }];
        return { name: "Venues", sheet };
      }

      case "leads": {
        let inquiries = [];
        try {
          const resp = await apiFetch(`/api/admin/inquiries`);
          inquiries = resp.inquiries || [];
        } catch { /* endpoint may not exist for non-super */ }

        let signups = [];
        try {
          const resp = await apiFetch(`/api/v1/analytics/convention-signups`);
          signups = resp.signups || [];
        } catch { /* may be empty */ }

        const rows = [
          ["CONTACT FORM LEADS"],
          ["Date", "Name", "Email", "Venue", "Message"],
          ...inquiries.map((l) => [l.created_at || "", l.name || "", l.email || "", l.venue_name || l.venue || "", l.message || ""]),
          [],
          ["CONVENTION SIGNUPS"],
          ["Email", "Signup Date", "Sessions", "Last Active"],
          ...signups.map((s) => [s.email || "", s.signup_date || "", s.sessions ?? 0, s.last_active || ""]),
        ];
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        sheet["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 40 }];
        return { name: "Leads", sheet };
      }

      default:
        return null;
    }
  }

  async function handleExportCurrentTab() {
    if (exporting) return;
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const sheetData = await fetchSheetData(activeSection);
      if (sheetData) {
        XLSX.utils.book_append_sheet(wb, sheetData.sheet, sheetData.name);
        downloadWorkbook(wb, `GMAI_${sheetData.name}_${venueSuffix()}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      }
    } catch (err) {
      console.error("Export current tab failed:", err);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportAllTabs() {
    if (exporting) return;
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const sections = EXPORTABLE_SECTIONS.filter(
        (s) => (s !== "venues" && s !== "leads") || isSuperAdmin
      );
      for (const section of sections) {
        try {
          const sheetData = await fetchSheetData(section);
          if (sheetData) {
            XLSX.utils.book_append_sheet(wb, sheetData.sheet, sheetData.name);
          }
        } catch (err) {
          console.warn(`Skipping ${section}:`, err.message);
        }
      }
      downloadWorkbook(wb, `GMAI_Full_Report_${venueSuffix()}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error("Export all tabs failed:", err);
    } finally {
      setExporting(false);
    }
  }

  const renderSection = () => {
    switch (activeSection) {
      case "overview": return <OverviewSection {...filterProps} />;
      case "devices": return <DevicesSection {...filterProps} />;
      case "games": return <GamesSection {...filterProps} />;
      case "qa": return <QASection {...filterProps} />;
      case "orders": return <OrdersSection {...filterProps} />;
      case "voice": return <VoiceSection {...filterProps} />;
      case "venues": return isSuperAdmin ? <VenuesSection {...filterProps} /> : null;
      case "leads": return isSuperAdmin ? <LeadsSection {...filterProps} /> : null;
      case "config": return <ConfigSection {...filterProps} />;
      default: return <OverviewSection {...filterProps} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a", color: "#e2e8f0" }}>
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: "fixed", top: 12, left: 12, zIndex: 3001,
          width: 40, height: 40, borderRadius: 8, background: "#1e293b",
          border: "1px solid #334155", color: "#e2e8f0", fontSize: "1.2rem",
          cursor: "pointer", display: "none",
        }}
        className="dash-hamburger"
      >
        {sidebarOpen ? "\u2715" : "\u2630"}
      </button>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2999 }}
          className="dash-overlay"
        />
      )}

      {/* Sidebar */}
      <nav
        style={{
          width: 220, minWidth: 220, background: "#111827",
          borderRight: "1px solid #1e293b", display: "flex",
          flexDirection: "column", padding: "16px 8px", zIndex: 3000,
          position: "relative",
        }}
        className={`dash-sidebar ${sidebarOpen ? "dash-sidebar-open" : ""}`}
      >
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", padding: "8px 12px 16px" }}>
          Navigation
        </div>
        {visibleItems.map((item) => (
          <button
            key={item.key}
            onClick={() => { setActiveSection(item.key); setSidebarOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 8, border: "none", width: "100%", textAlign: "left",
              cursor: "pointer", fontSize: "0.9rem", marginBottom: 2,
              background: activeSection === item.key ? "#1e40af" : "transparent",
              color: activeSection === item.key ? "#fff" : "#94a3b8",
              fontWeight: activeSection === item.key ? 600 : 400,
              transition: "background 0.15s",
            }}
          >
            <span style={{ fontSize: "1.1rem", width: 24, textAlign: "center" }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          display: "flex", alignItems: "center", gap: 16, padding: "12px 24px",
          background: "#1e293b", borderBottom: "1px solid #334155", flexWrap: "wrap",
        }}>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, whiteSpace: "nowrap" }}>
            GMAI Dashboard
          </h1>
          <div style={{ flex: 1 }} />

          {/* Venue dropdown (super_admin only) */}
          {isSuperAdmin && (
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              style={{
                padding: "6px 12px", borderRadius: 6, border: "1px solid #334155",
                background: "#0f172a", color: "#e2e8f0", fontSize: "0.85rem",
              }}
            >
              <option value="">All Venues</option>
              {venues.map((v) => (
                <option key={v.venue_id} value={v.venue_id}>{v.venue_name}</option>
              ))}
            </select>
          )}

          {/* Date range */}
          <input
            type="date"
            value={dates.start}
            onChange={(e) => setDates((d) => ({ ...d, start: e.target.value }))}
            style={{
              padding: "6px 8px", borderRadius: 6, border: "1px solid #334155",
              background: "#0f172a", color: "#e2e8f0", fontSize: "0.85rem",
            }}
          />
          <span style={{ color: "#64748b" }}>to</span>
          <input
            type="date"
            value={dates.end}
            onChange={(e) => setDates((d) => ({ ...d, end: e.target.value }))}
            style={{
              padding: "6px 8px", borderRadius: 6, border: "1px solid #334155",
              background: "#0f172a", color: "#e2e8f0", fontSize: "0.85rem",
            }}
          />

          <button onClick={handleRefresh} style={{
            padding: "6px 14px", borderRadius: 6, border: "1px solid #334155",
            background: "#0f172a", color: "#e2e8f0", cursor: "pointer", fontSize: "0.85rem",
          }}>
            Refresh
          </button>

          {/* Export dropdown */}
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}
              disabled={exporting}
              style={{
                padding: "6px 14px", borderRadius: 6, border: "none",
                background: exporting ? "#475569" : "#1e40af", color: "#fff",
                cursor: exporting ? "wait" : "pointer", fontSize: "0.85rem", fontWeight: 600,
              }}
            >
              {exporting ? "Exporting\u2026" : "Export \u25BE"}
            </button>
            {showExportMenu && (
              <div style={{
                position: "absolute", top: "100%", right: 0, marginTop: 4,
                background: "#1e293b", border: "1px solid #334155", borderRadius: 6,
                overflow: "hidden", zIndex: 50, minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}>
                <button
                  onClick={() => { setShowExportMenu(false); handleExportCurrentTab(); }}
                  style={{
                    display: "block", width: "100%", padding: "10px 16px",
                    background: "transparent", color: "#e2e8f0", border: "none",
                    cursor: "pointer", textAlign: "left", fontSize: "0.85rem",
                  }}
                  onMouseEnter={(e) => { e.target.style.background = "#334155"; }}
                  onMouseLeave={(e) => { e.target.style.background = "transparent"; }}
                >
                  Export This Tab
                </button>
                <button
                  onClick={() => { setShowExportMenu(false); handleExportAllTabs(); }}
                  style={{
                    display: "block", width: "100%", padding: "10px 16px",
                    background: "transparent", color: "#e2e8f0", border: "none",
                    cursor: "pointer", textAlign: "left", fontSize: "0.85rem",
                  }}
                  onMouseEnter={(e) => { e.target.style.background = "#334155"; }}
                  onMouseLeave={(e) => { e.target.style.background = "transparent"; }}
                >
                  Export All Tabs
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Section content */}
        <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {renderSection()}
        </main>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .dash-hamburger { display: flex !important; align-items: center; justify-content: center; }
          .dash-sidebar {
            position: fixed !important; top: 0; left: 0; bottom: 0;
            transform: translateX(-100%); transition: transform 0.25s;
          }
          .dash-sidebar-open { transform: translateX(0) !important; }
        }
      `}</style>
    </div>
  );
}
