import { useState, useEffect } from "react";
import { API_BASE } from "../../services/api";
import { formatDuration } from "../../utils/format";

function getAuthHeaders() {
  const token = localStorage.getItem("gmai_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const card = {
  background: "var(--bg-card, #1e2a45)",
  borderRadius: "12px",
  padding: "20px",
  border: "1px solid var(--border, #2a3a5c)",
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function HeatmapCell({ count, max }) {
  const intensity = max > 0 ? count / max : 0;
  const r = Math.round(233 * intensity + 255 * (1 - intensity));
  const g = Math.round(69 * intensity + 255 * (1 - intensity));
  const b = Math.round(96 * intensity + 255 * (1 - intensity));
  return (
    <div
      title={`${count} sessions`}
      style={{
        width: 18,
        height: 18,
        borderRadius: 3,
        backgroundColor: `rgb(${r},${g},${b})`,
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    />
  );
}

export default function AnalyticsTab() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedGame, setExpandedGame] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/v1/venue/analytics?days=${days}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <p style={{ color: "#a0a0a0", padding: 20 }}>Loading analytics...</p>;
  if (!data) return <p style={{ color: "#a0a0a0", padding: 20 }}>Unable to load analytics.</p>;

  const maxSessions = data.daily?.length
    ? Math.max(...data.daily.map((d) => d.sessions), 1)
    : 1;

  const topGameMax = data.top_games?.length
    ? Math.max(...data.top_games.map((g) => g.sessions_count), 1)
    : 1;

  // Heatmap max
  const heatMax = data.hourly_heatmap?.length
    ? Math.max(...data.hourly_heatmap.map((h) => h.sessions_count), 1)
    : 1;

  // Build heatmap grid [day][hour]
  const heatGrid = Array.from({ length: 7 }, () => Array(24).fill(0));
  (data.hourly_heatmap || []).forEach((h) => {
    if (h.day_of_week >= 0 && h.day_of_week < 7 && h.hour >= 0 && h.hour < 24) {
      heatGrid[h.day_of_week][h.hour] = h.sessions_count;
    }
  });

  // Group questions by game
  const questionsByGame = {};
  (data.top_questions || []).forEach((q) => {
    if (!questionsByGame[q.game_id]) questionsByGame[q.game_id] = [];
    questionsByGame[q.game_id].push(q);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Date range selector */}
      <div style={{ display: "flex", gap: 8 }}>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              background: days === d ? "var(--accent, #e94560)" : "var(--bg-card, #1e2a45)",
              color: days === d ? "#fff" : "var(--text-secondary, #a0a0a0)",
            }}
          >
            {d} days
          </button>
        ))}
      </div>

      {/* Avg session card */}
      <div style={{ ...card, textAlign: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent, #e94560)" }}>
          {data.avg_session_seconds > 0 ? formatDuration(data.avg_session_seconds) : "—"}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary, #a0a0a0)", marginTop: 4 }}>
          Avg Session Length
        </div>
      </div>

      {/* Sessions per day bar chart */}
      {data.daily && data.daily.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "var(--text-primary, #e0e0e0)" }}>
            Sessions per Day
          </h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120 }}>
            {data.daily.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.sessions} sessions`}
                style={{
                  flex: 1,
                  minWidth: 4,
                  height: `${(d.sessions / maxSessions) * 100}%`,
                  background: "var(--accent, #e94560)",
                  borderRadius: "3px 3px 0 0",
                  minHeight: d.sessions > 0 ? 4 : 0,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "#666" }}>
            <span>{data.daily[0]?.date}</span>
            <span>{data.daily[data.daily.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Top 10 Games */}
      {data.top_games && data.top_games.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "var(--text-primary, #e0e0e0)" }}>
            Top 10 Games
          </h3>
          {data.top_games.map((g) => (
            <div key={g.game_id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ flex: "0 0 140px", fontSize: 13, color: "var(--text-primary, #e0e0e0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {g.title}
              </span>
              <div style={{ flex: 1, height: 14, background: "var(--bg-secondary, #16213e)", borderRadius: 4 }}>
                <div
                  style={{
                    width: `${(g.sessions_count / topGameMax) * 100}%`,
                    height: "100%",
                    background: "var(--accent, #e94560)",
                    borderRadius: 4,
                  }}
                />
              </div>
              <span style={{ flex: "0 0 36px", fontSize: 12, color: "var(--text-secondary, #a0a0a0)", textAlign: "right" }}>
                {g.sessions_count}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Busiest Hours Heatmap */}
      {data.hourly_heatmap && data.hourly_heatmap.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "var(--text-primary, #e0e0e0)" }}>
            Busiest Hours
          </h3>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 500 }}>
              {heatGrid.map((hours, dayIdx) => (
                <div key={dayIdx} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <span style={{ width: 30, fontSize: 11, color: "#888" }}>{DAY_NAMES[dayIdx]}</span>
                  {hours.map((count, h) => (
                    <HeatmapCell key={h} count={count} max={heatMax} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Most Asked Questions */}
      {Object.keys(questionsByGame).length > 0 && (
        <div style={card}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "var(--text-primary, #e0e0e0)" }}>
            Most Asked Questions
          </h3>
          {Object.entries(questionsByGame).map(([gameId, questions]) => (
            <div key={gameId} style={{ marginBottom: 8 }}>
              <button
                onClick={() => setExpandedGame(expandedGame === gameId ? null : gameId)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "var(--bg-secondary, #16213e)",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: 6,
                  color: "var(--text-primary, #e0e0e0)",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {expandedGame === gameId ? "▾" : "▸"} {gameId}
              </button>
              {expandedGame === gameId && (
                <div style={{ padding: "8px 12px" }}>
                  {questions.map((q, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: "var(--text-secondary, #a0a0a0)" }}>
                      <span>{q.question_text}</span>
                      <span style={{ color: "var(--accent, #e94560)", fontWeight: 600 }}>{q.ask_count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
