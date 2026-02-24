import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8100";

const MOCK_STATS = {
  today_sessions: 47,
  week_sessions: 312,
  total_questions: 1289,
  feedback_positive_pct: 94,
  popular_games: [
    { game_id: "catan", title: "Catan", sessions: 52 },
    { game_id: "wingspan", title: "Wingspan", sessions: 41 },
    { game_id: "ticket-to-ride", title: "Ticket to Ride", sessions: 38 },
    { game_id: "azul", title: "Azul", sessions: 33 },
    { game_id: "codenames", title: "Codenames", sessions: 29 },
    { game_id: "pandemic", title: "Pandemic", sessions: 27 },
    { game_id: "splendor", title: "Splendor", sessions: 24 },
    { game_id: "7-wonders", title: "7 Wonders", sessions: 21 },
    { game_id: "dominion", title: "Dominion", sessions: 18 },
    { game_id: "terraforming-mars", title: "Terraforming Mars", sessions: 15 },
  ],
};

export default function VenueStatsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(MOCK_STATS);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Use mock data
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const bigStatStyle = {
    background: "var(--bg-card)",
    borderRadius: "16px",
    padding: "24px",
    textAlign: "center",
    border: "1px solid var(--border)",
  };

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={() => navigate("/app")}
          style={{ padding: "8px 16px", fontSize: "0.9rem" }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: "1.5rem", margin: 0, color: "var(--text-primary)" }}>Venue Stats</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div style={bigStatStyle}>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--accent)" }}>{stats.today_sessions}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Sessions Today</div>
        </div>
        <div style={bigStatStyle}>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--accent-light)" }}>{stats.week_sessions}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>This Week</div>
        </div>
        <div style={bigStatStyle}>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#a5b4fc" }}>{stats.total_questions}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Questions Asked</div>
        </div>
        <div style={bigStatStyle}>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#22c55e" }}>{stats.feedback_positive_pct}%</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Positive Feedback</div>
        </div>
      </div>

      <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "24px", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "16px", color: "var(--text-primary)" }}>Most Popular Games</h2>
        {stats.popular_games.map((game, i) => (
          <div
            key={game.game_id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 0",
              borderBottom: i < stats.popular_games.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <span style={{ width: "28px", textAlign: "right", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              #{i + 1}
            </span>
            <span style={{ flex: 1, color: "var(--text-primary)" }}>{game.title}</span>
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>{game.sessions} sessions</span>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "16px" }}>
        Auto-refreshes every 60 seconds
      </p>
    </div>
  );
}
