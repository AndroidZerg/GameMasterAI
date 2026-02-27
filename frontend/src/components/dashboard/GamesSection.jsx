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

export default function GamesSection({ venueId, startDate, endDate, token, refreshKey }) {
  const fp = { venueId, startDate, endDate, token, refreshKey };

  const gameStats = useFetch("/api/v1/analytics/game-stats", fp);
  const discovery = useFetch("/api/v1/analytics/game-discovery", fp);
  const searchQueries = useFetch("/api/v1/analytics/search-queries", fp);
  const filterUsage = useFetch("/api/v1/analytics/filter-usage", fp);
  const unusedGames = useFetch("/api/v1/analytics/unused-games", fp);

  const games = gameStats?.games || [];
  const uniqueGames = games.length;
  const totalSelections = games.reduce((s, g) => s + (g.times_selected || 0), 0);

  const fmtPlayTime = (s) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m` : `${Math.round(s)}s`;
  };

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <MetricCard label="Total Selections" value={totalSelections} />
        <MetricCard label="Unique Games" value={uniqueGames} />
        <MetricCard label="Avg Games/Session" value={games.length > 0 ? (totalSelections / Math.max(uniqueGames, 1)).toFixed(1) : "—"} />
        <MetricCard label="Most Popular" value={games[0]?.title || "—"} />
      </div>

      {/* Top Games table */}
      <div style={{ ...sectionCard, overflowX: "auto" }}>
        <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Top Games</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155" }}>
              {["#", "Game", "Selected", "Questions", "Avg Play Time", "Orders"].map((h) => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#475569" }}>No game data yet</td></tr>
            )}
            {games.map((g, i) => (
              <tr key={g.game_id} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "8px 10px", color: "#64748b" }}>{i + 1}</td>
                <td style={{ padding: "8px 10px", color: "#e2e8f0" }}>{g.title}</td>
                <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{g.times_selected}</td>
                <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{g.questions_asked}</td>
                <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{fmtPlayTime(g.avg_play_time_seconds)}</td>
                <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{g.orders_during_play}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row: Discovery donut + Search queries + Filter usage */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        {/* Game Discovery */}
        <div style={{ ...sectionCard, flex: "1 1 280px", minWidth: 250 }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>How Games Are Found</h3>
          <DonutChart
            segments={(discovery?.sources || []).map((s) => ({ label: s.source, count: s.count }))}
          />
        </div>

        {/* Search Queries */}
        <div style={{ ...sectionCard, flex: "1 1 280px", minWidth: 250 }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Search Queries</h3>
          {(!searchQueries?.queries || searchQueries.queries.length === 0) ? (
            <div style={{ color: "#475569", fontSize: "0.85rem" }}>No searches recorded</div>
          ) : (
            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {searchQueries.queries.map((q, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #1e293b", fontSize: "0.8rem" }}>
                  <span style={{ color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{q.query}</span>
                  <span style={{ color: "#64748b", marginLeft: 8 }}>{q.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Usage */}
        <div style={{ ...sectionCard, flex: "1 1 280px", minWidth: 250 }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Filter Usage</h3>
          <HorizontalBars
            items={(filterUsage?.filters || []).map((f) => ({
              label: `${f.filter_type}: ${f.filter_value}`,
              count: f.count,
            }))}
            color="#8b5cf6"
          />
        </div>
      </div>

      {/* Games Never Played */}
      <div style={sectionCard}>
        <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Games Never Played</h3>
        {(!unusedGames?.games || unusedGames.games.length === 0) ? (
          <div style={{ color: "#22c55e", fontSize: "0.85rem" }}>All games have been played!</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {unusedGames.games.slice(0, 30).map((g) => (
              <span key={g.game_id} style={{
                padding: "4px 10px", borderRadius: 16, fontSize: "0.75rem",
                background: "#0f172a", border: "1px solid #334155", color: "#94a3b8",
              }}>
                {g.title}
              </span>
            ))}
            {unusedGames.games.length > 30 && (
              <span style={{ padding: "4px 10px", fontSize: "0.75rem", color: "#64748b" }}>
                +{unusedGames.games.length - 30} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
