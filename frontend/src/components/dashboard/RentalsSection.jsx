import { useState, useEffect } from "react";
import { API_BASE } from "../../services/api";
import { MetricCard, HorizontalBars, sectionCard } from "./OverviewSection";

function useFetch(path, { venueId, token, refreshKey }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (venueId) params.set("venue_id", venueId);
    fetch(`${API_BASE}${path}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null));
  }, [path, venueId, token, refreshKey]);
  return data;
}

export default function RentalsSection({ venueId, startDate, endDate, token, refreshKey }) {
  const fp = { venueId, token, refreshKey };
  const mrr = useFetch("/api/v1/crm/mrr", fp);

  const activeCount = mrr?.active_count || 0;
  const totalMrr = mrr?.total_mrr_dollars || 0;
  const gamesOut = mrr?.games_out || 0;
  const subscribers = mrr?.subscribers || [];
  const mostRented = mrr?.most_rented || [];

  return (
    <div>
      {/* Revenue metrics */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <MetricCard label="Active Subscribers" value={activeCount} />
        <MetricCard label="Monthly Recurring Revenue" value={`$${totalMrr.toFixed(0)}`} />
        <MetricCard label="Games Currently Out" value={gamesOut} />
        <MetricCard label="Total Subscribers" value={subscribers.length} />
      </div>

      {/* Subscriber table + Most rented */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        {/* Subscriber table */}
        <div style={{ ...sectionCard, flex: "2 1 500px", minWidth: 350, overflowX: "auto" }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Subscribers</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                {["Customer", "Contact", "Venue", "Current Game", "Since", "Status", "MRR"].map((h) => (
                  <th key={h} style={{ padding: "8px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscribers.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: "#475569" }}>No subscribers yet</td></tr>
              )}
              {subscribers.map((s, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "8px", color: "#e2e8f0", fontWeight: 600 }}>{s.customer_name}</td>
                  <td style={{ padding: "8px", color: "#94a3b8", fontSize: "0.75rem" }}>{s.customer_contact}</td>
                  <td style={{ padding: "8px", color: "#94a3b8" }}>{s.venue_id}</td>
                  <td style={{ padding: "8px", color: s.current_game_id ? "#22c55e" : "#475569" }}>
                    {s.current_game_id || "\u2014"}
                  </td>
                  <td style={{ padding: "8px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                    {s.created_at ? new Date(s.created_at + "Z").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "\u2014"}
                  </td>
                  <td style={{ padding: "8px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600,
                      background: s.status === "active" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                      color: s.status === "active" ? "#22c55e" : "#ef4444",
                    }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: "8px", color: "#22c55e", fontWeight: 700 }}>
                    {s.status === "active" ? `$${(s.mrr_cents / 100).toFixed(0)}` : "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeCount > 0 && (
            <div style={{
              display: "flex", justifyContent: "flex-end", padding: "12px 8px 0",
              borderTop: "1px solid #334155", marginTop: 8,
            }}>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#22c55e" }}>
                Total MRR: ${totalMrr.toFixed(0)}
              </span>
            </div>
          )}
        </div>

        {/* Most rented games */}
        <div style={{ ...sectionCard, flex: "1 1 280px", minWidth: 250 }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Most Rented Games</h3>
          <HorizontalBars
            items={mostRented.map((g) => ({ label: g.game_title, count: g.rental_count }))}
            color="#22c55e"
          />
          {mostRented.length === 0 && (
            <div style={{ fontSize: "0.85rem", color: "#475569", textAlign: "center", padding: 16 }}>
              No rental history yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
