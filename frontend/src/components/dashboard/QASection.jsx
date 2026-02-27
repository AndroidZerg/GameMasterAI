import { useState, useEffect } from "react";
import { API_BASE } from "../../services/api";
import { MetricCard, HorizontalBars, DonutChart, sectionCard } from "./OverviewSection";

function useFetch(path, { venueId, startDate, endDate, token, refreshKey }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (venueId) params.set("venue_id", venueId);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    fetch(`${API_BASE}${path}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null));
  }, [path, venueId, startDate, endDate, token, refreshKey]);
  return data;
}

export default function QASection({ venueId, startDate, endDate, token, refreshKey }) {
  const fp = { venueId, startDate, endDate, token, refreshKey };

  const summary = useFetch("/api/v1/analytics/summary", fp);
  const topQuestions = useFetch("/api/v1/analytics/top-questions", fp);
  const categories = useFetch("/api/v1/analytics/question-categories", fp);
  const inputMethods = useFetch("/api/v1/analytics/input-methods", fp);
  const gameStats = useFetch("/api/v1/analytics/game-stats", fp);

  const totalQ = summary?.total_questions || 0;
  const totalSessions = summary?.total_sessions || 1;
  const avgQPerSession = totalSessions > 0 ? (totalQ / totalSessions).toFixed(1) : "0";

  const voiceCount = inputMethods?.voice || 0;
  const textCount = inputMethods?.text || 0;
  const totalInput = voiceCount + textCount || 1;
  const voicePct = Math.round((voiceCount / totalInput) * 100);

  // Most asked game
  const questions = topQuestions?.questions || [];
  const gameQuestionCounts = {};
  questions.forEach((q) => { if (q.game_id) gameQuestionCounts[q.game_id] = (gameQuestionCounts[q.game_id] || 0) + q.count; });
  const topGame = Object.entries(gameQuestionCounts).sort((a, b) => b[1] - a[1])[0];

  // Confusing games (high questions per session)
  const games = gameStats?.games || [];
  const confusingGames = games
    .filter((g) => g.questions_asked > 0 && g.times_selected > 0)
    .map((g) => ({ label: g.title, count: g.questions_asked, ratio: (g.questions_asked / g.times_selected).toFixed(1) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <MetricCard label="Total Questions" value={totalQ} />
        <MetricCard label="Avg Q/Session" value={avgQPerSession} />
        <MetricCard label="Voice vs Text" value={`${voicePct}% voice`} />
        <MetricCard label="Most Asked Game" value={topGame ? topGame[0] : "—"} />
      </div>

      {/* Top Questions table */}
      <div style={{ ...sectionCard, overflowX: "auto" }}>
        <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Top Questions</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155" }}>
              {["#", "Question", "Game", "Count", "Method"].map((h) => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#475569" }}>No questions asked yet</td></tr>
            )}
            {questions.map((q, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "8px 10px", color: "#64748b" }}>{i + 1}</td>
                <td style={{ padding: "8px 10px", color: "#e2e8f0", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={q.question}>{q.question}</td>
                <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{q.game_id || "—"}</td>
                <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{q.count}</td>
                <td style={{ padding: "8px 10px" }}>{voicePct > 50 ? "\u{1F3A4}" : "\u2328\uFE0F"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row: Categories donut + Confusing games */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div style={{ ...sectionCard, flex: "1 1 300px", minWidth: 260 }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Question Categories</h3>
          <DonutChart
            segments={(categories?.categories || []).map((c) => ({ label: `${c.category} (${c.percentage}%)`, count: c.count }))}
            size={140}
          />
        </div>

        <div style={{ ...sectionCard, flex: "1 1 300px", minWidth: 260 }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Most Confusing Games</h3>
          <HorizontalBars items={confusingGames} color="#f59e0b" />
        </div>
      </div>

      {/* Response Quality */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <MetricCard label="Avg Response Time" value="—" subtitle="(needs response_delivered events)" />
        <MetricCard label="Avg Response Length" value="—" subtitle="(needs response_delivered events)" />
      </div>
    </div>
  );
}
