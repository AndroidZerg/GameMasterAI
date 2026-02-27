import { useState, useEffect, useCallback, useMemo } from "react";
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

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
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

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleExport = useCallback(() => {
    const params = new URLSearchParams();
    if (venueId) params.set("venue_id", venueId);
    if (dates.start) params.set("start_date", dates.start);
    if (dates.end) params.set("end_date", dates.end);
    window.open(`${API_BASE}/api/v1/analytics/export?${params}`, "_blank");
  }, [venueId, dates]);

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
          <button onClick={handleExport} style={{
            padding: "6px 14px", borderRadius: 6, border: "none",
            background: "#1e40af", color: "#fff", cursor: "pointer", fontSize: "0.85rem",
          }}>
            Export CSV
          </button>
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
