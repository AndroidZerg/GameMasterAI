import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import HomeTab from "../components/venue/HomeTab";
import AnalyticsDashboard from "./AnalyticsDashboard";
import LibraryTab from "../components/venue/LibraryTab";
import MenuTab from "../components/venue/MenuTab";

const TABS = [
  { key: "home", label: "Home" },
  { key: "analytics", label: "Analytics" },
  { key: "library", label: "Library" },
  { key: "menu", label: "Menu" },
];

const tabBar = {
  display: "flex",
  gap: 0,
  background: "var(--bg-secondary, #16213e)",
  borderRadius: "12px",
  padding: 3,
  marginBottom: 20,
};

export default function VenueDashboard() {
  const [activeTab, setActiveTab] = useState("home");
  const { venueId } = useAuth();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary, #e0e0e0)", marginBottom: 16 }}>
        Venue Dashboard
      </h1>

      {/* Tab bar */}
      <div style={tabBar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1,
              padding: "8px 4px",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              transition: "all 0.15s",
              background: activeTab === t.key ? "var(--accent, #e94560)" : "transparent",
              color: activeTab === t.key ? "#fff" : "var(--text-secondary, #a0a0a0)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "home" && <HomeTab />}
      {activeTab === "analytics" && <AnalyticsDashboard venueScope={venueId} />}
      {activeTab === "library" && <LibraryTab />}
      {activeTab === "menu" && <MenuTab />}
    </div>
  );
}
