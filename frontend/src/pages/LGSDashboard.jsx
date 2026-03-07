import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { fetchLGSDashboard } from "../services/api";
import LGSOverview from "../components/lgs/LGSOverview";
import LGSVenueDetail from "../components/lgs/LGSVenueDetail";
import LGSPricing from "../components/lgs/LGSPricing";
import LGSAlerts from "../components/lgs/LGSAlerts";
import LGSTransactions from "../components/lgs/LGSTransactions";

const SIDEBAR_ITEMS = [
  { key: "overview", label: "Overview", icon: "\uD83C\uDFE0" },
  { key: "venues", label: "Venues & Inventory", icon: "\uD83D\uDCE6" },
  { key: "pricing", label: "Pricing", icon: "\uD83D\uDCB0" },
  { key: "alerts", label: "Alerts", icon: "\uD83D\uDD14" },
  { key: "transactions", label: "Transactions", icon: "\uD83D\uDCB3" },
];

export default function LGSDashboard() {
  const { lgsId, venueName, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  // Selected venue for detail view
  const [selectedVenue, setSelectedVenue] = useState(null);

  // Load alert count on mount
  useEffect(() => {
    if (!lgsId) return;
    fetchLGSDashboard(lgsId)
      .then((d) => {
        const a = d.alerts || {};
        setAlertCount(a.restock_needed + a.new_game_activations + a.pending_fulfillments);
      })
      .catch(() => {});
  }, [lgsId]);

  const handleSelectVenue = useCallback((venueId, venueName) => {
    setSelectedVenue({ venueId, venueName });
    setActiveSection("venues");
  }, []);

  const handleNavigate = useCallback((section) => {
    setActiveSection(section);
    setSidebarOpen(false);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <LGSOverview onSelectVenue={handleSelectVenue} onNavigate={handleNavigate} />;
      case "venues":
        if (selectedVenue) {
          return (
            <LGSVenueDetail
              venueId={selectedVenue.venueId}
              venueName={selectedVenue.venueName}
              onBack={() => setSelectedVenue(null)}
            />
          );
        }
        return <LGSOverview onSelectVenue={handleSelectVenue} onNavigate={handleNavigate} />;
      case "pricing":
        return <LGSPricing />;
      case "alerts":
        return <LGSAlerts />;
      case "transactions":
        return <LGSTransactions />;
      default:
        return <LGSOverview onSelectVenue={handleSelectVenue} onNavigate={handleNavigate} />;
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
        className="lgs-hamburger"
      >
        {sidebarOpen ? "\u2715" : "\u2630"}
      </button>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2999 }}
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
        className={`lgs-sidebar ${sidebarOpen ? "lgs-sidebar-open" : ""}`}
      >
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", padding: "8px 12px 16px" }}>
          LGS Partner
        </div>
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setActiveSection(item.key);
              setSidebarOpen(false);
              if (item.key !== "venues") setSelectedVenue(null);
            }}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 8, border: "none", width: "100%", textAlign: "left",
              cursor: "pointer", fontSize: "0.9rem", marginBottom: 2,
              background: activeSection === item.key ? "#1e40af" : "transparent",
              color: activeSection === item.key ? "#fff" : "#94a3b8",
              fontWeight: activeSection === item.key ? 600 : 400,
              transition: "background 0.15s",
              position: "relative",
            }}
          >
            <span style={{ fontSize: "1.1rem", width: 24, textAlign: "center" }}>{item.icon}</span>
            <span>{item.label}</span>
            {item.key === "alerts" && alertCount > 0 && (
              <span style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700,
                padding: "1px 6px", borderRadius: 10, minWidth: 18, textAlign: "center",
              }}>
                {alertCount}
              </span>
            )}
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
            Welcome, {venueName || "LGS Partner"}
          </h1>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 14px", borderRadius: 6, border: "1px solid #334155",
              background: "#0f172a", color: "#94a3b8", cursor: "pointer", fontSize: "0.85rem",
            }}
          >
            Logout
          </button>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {renderSection()}
        </main>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .lgs-hamburger { display: flex !important; align-items: center; justify-content: center; }
          .lgs-sidebar {
            position: fixed !important; top: 0; left: 0; bottom: 0;
            transform: translateX(-100%); transition: transform 0.25s;
          }
          .lgs-sidebar-open { transform: translateX(0) !important; }
        }
      `}</style>
    </div>
  );
}
