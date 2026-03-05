import { useState, useEffect } from "react";
import { API_BASE } from "../../services/api";

const cardStyle = {
  background: "#1e293b",
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
  border: "1px solid #334155",
};

const thStyle = {
  padding: "8px 12px",
  textAlign: "left",
  borderBottom: "2px solid #334155",
  fontSize: "0.8rem",
  color: "#94a3b8",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "8px 12px",
  borderBottom: "1px solid #1e293b",
  fontSize: "0.85rem",
};

export default function QAIntelSection({ token, refreshKey }) {
  const [qaAnalytics, setQaAnalytics] = useState([]);
  const [stationActivity, setStationActivity] = useState([]);
  const [questionTrends, setQuestionTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameFilter, setGameFilter] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    const headers = { Authorization: `Bearer ${token}` };
    const qaUrl = gameFilter
      ? `${API_BASE}/api/v1/sessions/crm/qa-analytics?game_id=${encodeURIComponent(gameFilter)}`
      : `${API_BASE}/api/v1/sessions/crm/qa-analytics`;

    Promise.all([
      fetch(qaUrl, { headers }).then((r) => (r.ok ? r.json() : { analytics: [] })),
      fetch(`${API_BASE}/api/v1/sessions/crm/station-activity`, { headers }).then((r) =>
        r.ok ? r.json() : { stations: [] }
      ),
      fetch(`${API_BASE}/api/v1/sessions/crm/question-trends`, { headers }).then((r) =>
        r.ok ? r.json() : { trends: [] }
      ),
    ])
      .then(([qa, stations, trends]) => {
        setQaAnalytics(qa.analytics || []);
        setStationActivity(stations.stations || []);
        setQuestionTrends(trends.trends || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, refreshKey, gameFilter]);

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>Loading Q&A Intelligence...</div>;

  const poorAnswers = qaAnalytics.filter((q) => !q.has_good_answer);

  return (
    <div>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 16 }}>Q&A Intelligence</h2>

      {/* Game filter */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={gameFilter}
          onChange={(e) => setGameFilter(e.target.value)}
          placeholder="Filter by game ID..."
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#e2e8f0",
            fontSize: "0.85rem",
            width: 250,
          }}
        />
      </div>

      {/* Station Activity */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12 }}>Station Activity</h3>
        {stationActivity.length === 0 ? (
          <div style={{ color: "#64748b" }}>No station data yet</div>
        ) : (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {stationActivity.map((s) => (
              <div
                key={s.station_id}
                style={{
                  background: "#0f172a",
                  borderRadius: 8,
                  padding: "12px 20px",
                  textAlign: "center",
                  minWidth: 120,
                  border: "1px solid #334155",
                }}
              >
                <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>Table {s.station_id}</div>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>
                  {s.total_sessions} sessions
                </div>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  {s.unique_devices} unique devices
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Question Trends — which games generate most questions */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12 }}>
          Question Trends (by game)
        </h3>
        {questionTrends.length === 0 ? (
          <div style={{ color: "#64748b" }}>No questions logged yet</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Game</th>
                  <th style={thStyle}>Total Questions</th>
                  <th style={thStyle}>Unique Askers</th>
                  <th style={thStyle}>First Asked</th>
                  <th style={thStyle}>Last Asked</th>
                </tr>
              </thead>
              <tbody>
                {questionTrends.map((t) => (
                  <tr key={t.game_id}>
                    <td style={tdStyle}>{t.game_id}</td>
                    <td style={tdStyle}>{t.total_questions}</td>
                    <td style={tdStyle}>{t.unique_askers}</td>
                    <td style={tdStyle}>{t.first_asked?.slice(0, 16) || "\u2014"}</td>
                    <td style={tdStyle}>{t.last_asked?.slice(0, 16) || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Most Asked Questions */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12 }}>Most Asked Questions</h3>
        {qaAnalytics.length === 0 ? (
          <div style={{ color: "#64748b" }}>No Q&A data yet</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Game</th>
                  <th style={thStyle}>Question</th>
                  <th style={thStyle}>Times Asked</th>
                  <th style={thStyle}>Last Asked</th>
                </tr>
              </thead>
              <tbody>
                {qaAnalytics.slice(0, 25).map((q, i) => (
                  <tr key={q.id || i}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{q.game_id}</td>
                    <td style={{ ...tdStyle, maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {q.question_text}
                    </td>
                    <td style={tdStyle}>{q.times_asked}</td>
                    <td style={tdStyle}>{q.last_asked_at?.slice(0, 16) || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Poor/Unanswered Questions */}
      {poorAnswers.length > 0 && (
        <div style={{ ...cardStyle, borderColor: "#92400e" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12, color: "#fbbf24" }}>
            Weak Answers (needs review)
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Game</th>
                  <th style={thStyle}>Question</th>
                  <th style={thStyle}>Times Asked</th>
                </tr>
              </thead>
              <tbody>
                {poorAnswers.map((q, i) => (
                  <tr key={q.id || i}>
                    <td style={tdStyle}>{q.game_id}</td>
                    <td style={{ ...tdStyle, maxWidth: 400 }}>{q.question_text}</td>
                    <td style={tdStyle}>{q.times_asked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
