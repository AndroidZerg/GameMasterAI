import { useState, useEffect } from "react";

import { API_BASE, fetchMeetupToggle, setMeetupToggle, clearRecentlyPlayed } from "../services/api";

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
          setStats(prev => ({ ...prev, ...data }));
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

  const [meetupOn, setMeetupOn] = useState(false);
  const [meetupLoading, setMeetupLoading] = useState(true);

  useEffect(() => {
    fetchMeetupToggle()
      .then((data) => setMeetupOn(!!data.meetup_enabled))
      .catch(() => {})
      .finally(() => setMeetupLoading(false));
  }, []);

  const handleMeetupToggle = async () => {
    const next = !meetupOn;
    setMeetupOn(next);
    try {
      await setMeetupToggle(next);
    } catch {
      setMeetupOn(!next);
    }
  };

  const [clearRecentLoading, setClearRecentLoading] = useState(false);
  const [clearRecentDone, setClearRecentDone] = useState(false);

  const handleClearRecent = async () => {
    if (!confirm("Clear recently played games for ALL users across ALL venues?")) return;
    setClearRecentLoading(true);
    try {
      await clearRecentlyPlayed();
      setClearRecentDone(true);
      // Also clear own localStorage
      localStorage.removeItem("gmai_recent");
    } catch {
      alert("Failed to clear recently played.");
    } finally {
      setClearRecentLoading(false);
    }
  };

  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);

  const loadInquiries = async () => {
    setInquiriesLoading(true);
    try {
      const token = localStorage.getItem("gmai_token");
      const res = await fetch(`${API_BASE}/api/admin/inquiries`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setInquiries(data.inquiries || []);
      }
    } catch { /* ignore */ }
    setInquiriesLoading(false);
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "activity", label: "Activity" },
    { key: "leaderboard", label: "Leaderboard" },
    { key: "inquiries", label: "Inquiries" },
  ];

  return (
    <div style={{ padding: "70px 20px 40px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "var(--text-primary)" }}>Venue Dashboard</h1>

      {/* Meetup Toggle */}
      {!meetupLoading && (
        <div style={{
          background: "var(--bg-card)", borderRadius: "16px", padding: "16px 20px",
          border: `2px solid ${meetupOn ? "var(--accent)" : "var(--border)"}`,
          marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px",
        }}>
          <span style={{ fontSize: "1.3rem" }}>{"\uD83C\uDFB2"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>Meetup Access</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              {meetupOn
                ? "ON \u2014 Members can join now"
                : "OFF \u2014 Access disabled"}
            </div>
          </div>
          <button
            onClick={handleMeetupToggle}
            style={{
              width: "64px", height: "34px", borderRadius: "17px", border: "none",
              background: meetupOn ? "var(--accent)" : "#4a4a5a",
              cursor: "pointer", position: "relative", transition: "background 0.2s",
              flexShrink: 0,
            }}
          >
            <div style={{
              width: "26px", height: "26px", borderRadius: "50%",
              background: "#fff", position: "absolute", top: "4px",
              left: meetupOn ? "34px" : "4px",
              transition: "left 0.2s",
            }} />
          </button>
        </div>
      )}

      {/* Clear Recently Played */}
      <div style={{
        background: "var(--bg-card)", borderRadius: "16px", padding: "16px 20px",
        border: "1px solid var(--border)", marginBottom: "20px",
        display: "flex", alignItems: "center", gap: "16px",
      }}>
        <span style={{ fontSize: "1.3rem" }}>{"\uD83D\uDD04"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>Recently Played</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            {clearRecentDone ? "Cleared! Clients will reset on next visit." : "Clear recently played list for all users"}
          </div>
        </div>
        <button
          onClick={handleClearRecent}
          disabled={clearRecentLoading || clearRecentDone}
          style={{
            padding: "8px 16px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600,
            background: clearRecentDone ? "#22c55e" : "#ef4444", color: "#fff", border: "none",
            cursor: (clearRecentLoading || clearRecentDone) ? "not-allowed" : "pointer",
            opacity: clearRecentLoading ? 0.6 : 1, whiteSpace: "nowrap",
          }}
        >
          {clearRecentLoading ? "Clearing..." : clearRecentDone ? "Done" : "Clear All"}
        </button>
      </div>

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
            {(stats.popular_games || []).map((game, i) => {
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

      {/* Inquiries Tab */}
      {activeTab === "inquiries" && (
        <div style={{
          background: "var(--bg-card)", borderRadius: "16px", padding: "20px",
          border: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1.1rem", color: "var(--text-primary)", margin: 0 }}>Demo Requests</h2>
            <button
              onClick={loadInquiries}
              disabled={inquiriesLoading}
              style={{
                padding: "6px 16px", borderRadius: "8px", fontSize: "0.85rem",
                background: "var(--bg-primary)", color: "var(--text-secondary)",
                border: "1px solid var(--border)", cursor: "pointer",
              }}
            >
              {inquiriesLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
          {inquiries.length === 0 && !inquiriesLoading && (
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "20px 0" }}>
              No inquiries yet. Click Refresh to load.
            </p>
          )}
          {inquiries.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr>
                    {["Date", "Name", "Email", "Venue", "Message"].map((h) => (
                      <th key={h} style={{
                        textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--border)",
                        color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((inq, i) => (
                    <tr key={i}>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                        {inq.submitted_at ? new Date(inq.submitted_at).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-primary)", fontWeight: 500 }}>
                        {inq.name}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--accent)" }}>
                        <a href={`mailto:${inq.email}`} style={{ color: "var(--accent)", textDecoration: "none" }}>{inq.email}</a>
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        {inq.venue || "—"}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inq.message || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "16px" }}>
        Auto-refreshes every 60 seconds
      </p>
    </div>
  );
}
