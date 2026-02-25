import { useState, useEffect } from "react";
import { API_BASE } from "../services/api";

function getAuthHeaders() {
  const token = localStorage.getItem("gmai_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminFeedbackPage() {
  const [stats, setStats] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/feedback`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats || null);
        setEntries(data.entries || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ width: "24px", height: "24px", border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spinnerRotate 0.6s linear infinite" }} />
      </div>
    );
  }

  const Stars = ({ value }) => {
    if (!value) return <span style={{ color: "var(--text-secondary)" }}>-</span>;
    return (
      <span style={{ color: "#f59e0b", letterSpacing: "1px" }}>
        {Array.from({ length: 5 }, (_, i) => i < Math.round(value) ? "\u2605" : "\u2606").join("")}
        <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginLeft: "4px" }}>
          {value}/5
        </span>
      </span>
    );
  };

  const statCards = stats ? [
    { label: "Total Surveys", value: stats.total },
    { label: "Avg Game Rating", value: <Stars value={stats.avg_game_rating} /> },
    { label: "Would Use Again", value: `${stats.would_use_again_pct}%` },
    { label: "Avg Setup", value: <Stars value={stats.avg_setup} /> },
    { label: "Avg Rules", value: <Stars value={stats.avg_rules} /> },
    { label: "Avg Strategy", value: <Stars value={stats.avg_strategy} /> },
    { label: "Avg Scoring", value: <Stars value={stats.avg_scoring} /> },
  ] : [];

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px", paddingTop: "80px" }}>
      <h1 style={{ fontSize: "1.5rem", color: "var(--text-primary)", marginBottom: "24px" }}>
        Post-Game Feedback
      </h1>

      {/* Stats cards */}
      {stats && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "12px", marginBottom: "32px",
        }}>
          {statCards.map((card, i) => (
            <div key={i} style={{
              background: "var(--bg-card)", borderRadius: "12px", padding: "16px",
              border: "1px solid var(--border)", textAlign: "center",
            }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                {card.label}
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Entries table */}
      <h2 style={{ fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: "12px" }}>
        Individual Feedback ({entries.length})
      </h2>

      {entries.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No survey feedback yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%", borderCollapse: "separate", borderSpacing: 0,
            background: "var(--bg-card)", borderRadius: "12px",
            border: "1px solid var(--border)",
          }}>
            <thead>
              <tr>
                {["Date", "Game", "Player", "Rating", "Setup", "Rules", "Strategy", "Score", "Use Again", "Comment"].map((h) => (
                  <th key={h} style={{
                    padding: "10px 12px", textAlign: "left", fontSize: "0.75rem",
                    color: "var(--text-secondary)", borderBottom: "1px solid var(--border)",
                    background: "var(--bg-secondary)", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={tdStyle}>{e.created_at ? new Date(e.created_at).toLocaleDateString() : "-"}</td>
                  <td style={tdStyle}>{(e.game_id || "").replace(/-/g, " ")}</td>
                  <td style={tdStyle}>{e.player_name || "-"}</td>
                  <td style={tdStyle}>{e.rating ? `${"⭐".repeat(e.rating)}` : "-"}</td>
                  <td style={tdStyle}>{e.helpful_setup || "-"}</td>
                  <td style={tdStyle}>{e.helpful_rules || "-"}</td>
                  <td style={tdStyle}>{e.helpful_strategy || "-"}</td>
                  <td style={tdStyle}>{e.helpful_scoring || "-"}</td>
                  <td style={tdStyle}>{e.would_use_again === 1 ? "Yes" : e.would_use_again === 0 ? "No" : "-"}</td>
                  <td style={{ ...tdStyle, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.feedback_text || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const tdStyle = {
  padding: "8px 12px", fontSize: "0.85rem",
  color: "var(--text-primary)", borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
};
