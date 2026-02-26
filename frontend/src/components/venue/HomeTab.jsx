import { useState, useEffect } from "react";
import { API_BASE } from "../../services/api";

function getAuthHeaders() {
  const token = localStorage.getItem("gmai_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const card = {
  background: "var(--bg-card, #1e2a45)",
  borderRadius: "12px",
  padding: "20px",
  border: "1px solid var(--border, #2a3a5c)",
  textAlign: "center",
  minWidth: 0,
};

export default function HomeTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/venue/home`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "#a0a0a0", padding: 20 }}>Loading...</p>;
  if (!data) return <p style={{ color: "#a0a0a0", padding: 20 }}>Unable to load dashboard data.</p>;

  const stats = [
    { label: "Active Sessions", value: data.active_sessions ?? 0 },
    { label: "Questions Today", value: data.questions_today ?? 0 },
    { label: "Top Game", value: data.top_game_this_week || "—" },
    { label: "Orders Today", value: data.orders_today ?? 0 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {stats.map((s) => (
          <div key={s.label} style={card}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent, #e94560)" }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary, #a0a0a0)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* GOTD & Staff Picks */}
      <div style={{ ...card, textAlign: "left" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--text-primary, #e0e0e0)" }}>Game of the Day</h3>
        <p style={{ color: "var(--text-secondary, #a0a0a0)", margin: 0 }}>
          {data.gotd || "Not set"}
        </p>
      </div>

      {data.staff_picks && data.staff_picks.length > 0 && (
        <div style={{ ...card, textAlign: "left" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--text-primary, #e0e0e0)" }}>Staff Picks</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.staff_picks.map((gid) => (
              <span
                key={gid}
                style={{
                  background: "var(--bg-secondary, #16213e)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "var(--text-primary, #e0e0e0)",
                }}
              >
                {gid}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Games Playing Now */}
      {data.games_playing_now && data.games_playing_now.length > 0 && (
        <div style={{ ...card, textAlign: "left" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--text-primary, #e0e0e0)" }}>Games Being Played Now</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.games_playing_now.map((gid) => (
              <span
                key={gid}
                style={{
                  background: "var(--accent, #e94560)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "#fff",
                }}
              >
                {gid}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
