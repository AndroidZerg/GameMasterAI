import { useState, useEffect } from "react";

import { API_BASE } from "../services/api";

const MOCK_STATS = {
  today_sessions: 47,
  week_sessions: 312,
  total_questions: 1289,
  feedback_positive_pct: 94,
  avg_session_minutes: 38,
  total_players: 864,
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
  hourly_heatmap: [
    0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 8, 12,
    15, 11, 9, 7, 10, 18, 24, 22, 16, 8, 3, 1,
  ],
  recent_sessions: [
    { game_title: "Catan", players: 4, winner: "Sarah", score: 14, time: "12 min ago" },
    { game_title: "Wingspan", players: 3, winner: "Leo", score: 91, time: "28 min ago" },
    { game_title: "Codenames", players: 6, winner: "Team Blue", score: null, time: "45 min ago" },
    { game_title: "Azul", players: 2, winner: "Mike", score: 78, time: "1 hr ago" },
    { game_title: "Ticket to Ride", players: 4, winner: "Chris", score: 142, time: "1.5 hrs ago" },
  ],
  top_scores: [
    { game_title: "Ticket to Ride", player: "Chris", score: 142 },
    { game_title: "Wingspan", player: "Emma", score: 98 },
    { game_title: "Azul", player: "Mike", score: 78 },
    { game_title: "Catan", player: "Sarah", score: 14 },
    { game_title: "Terraforming Mars", player: "Jordan", score: 112 },
  ],
};

const HOURS = ["12a", "", "", "", "", "", "6a", "", "", "", "", "", "12p", "", "", "", "", "", "6p", "", "", "", "", ""];

function HourlyHeatmap({ data }) {
  if (!data || data.length !== 24) return null;
  const max = Math.max(...data, 1);

  return (
    <div style={{
      background: "var(--bg-card)", borderRadius: "16px", padding: "20px",
      border: "1px solid var(--border)", marginBottom: "24px",
    }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "12px", color: "var(--text-primary)" }}>Activity Heatmap (Today)</h2>
      <div style={{ display: "flex", gap: "3px", alignItems: "flex-end", height: "100px" }}>
        {data.map((val, i) => {
          const pct = val / max;
          const r = Math.round(233 * pct + 30 * (1 - pct));
          const g = Math.round(69 * pct + 42 * (1 - pct));
          const b = Math.round(96 * pct + 92 * (1 - pct));
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
              <div
                title={`${i === 0 ? "12" : i > 12 ? i - 12 : i}${i < 12 ? "am" : "pm"}: ${val} sessions`}
                style={{
                  width: "100%", minHeight: "4px",
                  height: `${Math.max(4, pct * 80)}px`,
                  borderRadius: "3px 3px 0 0",
                  background: val > 0 ? `rgb(${r},${g},${b})` : "var(--bg-primary)",
                  transition: "height 0.3s",
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "3px", marginTop: "2px" }}>
        {HOURS.map((label, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontSize: "0.55rem", color: "var(--text-secondary)" }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentSessions({ sessions }) {
  if (!sessions || sessions.length === 0) return null;
  return (
    <div style={{
      background: "var(--bg-card)", borderRadius: "16px", padding: "20px",
      border: "1px solid var(--border)", marginBottom: "24px",
    }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "12px", color: "var(--text-primary)" }}>Recent Sessions</h2>
      {sessions.map((s, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: "10px", padding: "8px 0",
          borderBottom: i < sessions.length - 1 ? "1px solid var(--border)" : "none",
        }}>
          <span style={{ fontSize: "1.1rem" }}>🎲</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>{s.game_title}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {s.players} players {s.winner && `· Winner: ${s.winner}`} {s.score != null && `(${s.score} pts)`}
            </div>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{s.time}</span>
        </div>
      ))}
    </div>
  );
}

function TopScores({ scores }) {
  if (!scores || scores.length === 0) return null;
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{
      background: "var(--bg-card)", borderRadius: "16px", padding: "20px",
      border: "1px solid var(--border)", marginBottom: "24px",
    }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "12px", color: "var(--text-primary)" }}>Venue High Scores</h2>
      {scores.map((s, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: "10px", padding: "8px 0",
          borderBottom: i < scores.length - 1 ? "1px solid var(--border)" : "none",
        }}>
          <span style={{ fontSize: "1.1rem", width: "28px", textAlign: "center" }}>
            {i < 3 ? medals[i] : `#${i + 1}`}
          </span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>{s.player}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}> — {s.game_title}</span>
          </div>
          <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: "1rem" }}>{s.score}</span>
        </div>
      ))}
    </div>
  );
}

export default function VenueStatsPage() {
  const [stats, setStats] = useState(MOCK_STATS);
  const [activeTab, setActiveTab] = useState("overview");

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

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "activity", label: "Activity" },
    { key: "leaderboard", label: "Leaderboard" },
  ];

  return (
    <div style={{ padding: "70px 20px 40px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "var(--text-primary)" }}>Venue Dashboard</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "8px 20px", borderRadius: "999px",
              border: activeTab === t.key ? "2px solid var(--accent)" : "2px solid var(--border)",
              background: activeTab === t.key ? "var(--accent)" : "var(--bg-primary)",
              color: "#fff", fontWeight: activeTab === t.key ? 700 : 400,
              fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            <div style={bigStatStyle}>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--accent)" }}>{stats.today_sessions}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Sessions Today</div>
            </div>
            <div style={bigStatStyle}>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--accent-light)" }}>{stats.week_sessions}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>This Week</div>
            </div>
            <div style={bigStatStyle}>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#a5b4fc" }}>{stats.total_questions}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Questions</div>
            </div>
            <div style={bigStatStyle}>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#22c55e" }}>{stats.feedback_positive_pct}%</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Positive</div>
            </div>
            <div style={bigStatStyle}>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#f59e0b" }}>{stats.avg_session_minutes || 38}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Avg Min/Session</div>
            </div>
            <div style={bigStatStyle}>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#06b6d4" }}>{stats.total_players || 864}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Total Players</div>
            </div>
          </div>

          {/* Popular games with bar chart */}
          <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "20px", border: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: "1.1rem", marginBottom: "16px", color: "var(--text-primary)" }}>Most Popular Games</h2>
            {stats.popular_games.map((game, i) => {
              const maxSessions = stats.popular_games[0]?.sessions || 1;
              const pct = (game.sessions / maxSessions) * 100;
              return (
                <div key={game.game_id} style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      <span style={{ color: "var(--text-secondary)", marginRight: "8px" }}>#{i + 1}</span>
                      {game.title}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600 }}>{game.sessions}</span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "3px", background: "var(--bg-primary)", overflow: "hidden" }}>
                    <div style={{
                      width: `${pct}%`, height: "100%", borderRadius: "3px",
                      background: `linear-gradient(90deg, var(--accent), var(--accent-light))`,
                      transition: "width 0.5s",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Activity Tab */}
      {activeTab === "activity" && (
        <>
          <HourlyHeatmap data={stats.hourly_heatmap} />
          <RecentSessions sessions={stats.recent_sessions} />
        </>
      )}

      {/* Leaderboard Tab */}
      {activeTab === "leaderboard" && (
        <TopScores scores={stats.top_scores} />
      )}

      <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "16px" }}>
        Auto-refreshes every 60 seconds
      </p>
    </div>
  );
}
