import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchLGSDashboard } from "../../services/api";

const card = {
  background: "#1e293b", borderRadius: 12, padding: 20,
  border: "1px solid #334155",
};

const tierColors = { starter: "#3b82f6", standard: "#8b5cf6", premium: "#f59e0b" };
const statusColors = { active: "#22c55e", trialing: "#f59e0b", past_due: "#ef4444", canceled: "#64748b" };

export default function LGSOverview({ onSelectVenue, onNavigate }) {
  const { lgsId } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lgsId) return;
    setLoading(true);
    fetchLGSDashboard(lgsId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [lgsId]);

  if (loading) return <p style={{ color: "#94a3b8", padding: 20 }}>Loading dashboard...</p>;
  if (!data) return <p style={{ color: "#ef4444", padding: 20 }}>Failed to load dashboard data.</p>;

  const { revenue, venues, alerts } = data;
  const totalAlerts = alerts.restock_needed + alerts.new_game_activations + alerts.pending_fulfillments;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Alert banner */}
      {totalAlerts > 0 && (
        <div
          onClick={() => onNavigate("alerts")}
          style={{
            ...card, background: "#f59e0b15", border: "1px solid #f59e0b33",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
          }}
        >
          <span style={{ fontSize: 20 }}>&#9888;&#65039;</span>
          <span style={{ color: "#f59e0b", fontWeight: 600 }}>
            {totalAlerts} item{totalAlerts !== 1 ? "s" : ""} need attention
          </span>
          <span style={{ color: "#94a3b8", fontSize: 13, marginLeft: "auto" }}>View Alerts &rarr;</span>
        </div>
      )}

      {/* Revenue cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div style={card}>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Subscription Revenue</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#22c55e" }}>
            ${(revenue.subscription_lgs_cut_cents / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>LGS cut this month</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Game Sales Revenue</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#3b82f6" }}>
            ${(revenue.game_sale_lgs_cut_cents / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>LGS cut this month</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Combined Total</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#e2e8f0" }}>
            ${(revenue.combined_lgs_total_cents / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{revenue.period}</div>
        </div>
      </div>

      {/* Venues table */}
      <div style={card}>
        <h3 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 700 }}>Paired Venues</h3>
        {venues.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: 13 }}>No venues paired yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", color: "#94a3b8", fontWeight: 600 }}>Venue</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", color: "#94a3b8", fontWeight: 600 }}>Tier</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>Games</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>Low Stock</th>
                  <th style={{ padding: "8px 12px" }}></th>
                </tr>
              </thead>
              <tbody>
                {venues.map((v) => (
                  <tr key={v.venue_id} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "10px 12px", color: "#e2e8f0", fontWeight: 600 }}>{v.venue_name}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: tierColors[v.tier] || "#3b82f6", color: "#fff",
                      }}>
                        {v.tier}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#e2e8f0" }}>
                      {v.active_games} / {v.seat_limit === -1 ? "\u221E" : v.seat_limit}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                        color: statusColors[v.subscription_status] || "#94a3b8",
                        background: (statusColors[v.subscription_status] || "#94a3b8") + "18",
                      }}>
                        {v.subscription_status}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {v.low_stock_count > 0 ? (
                        <span style={{ color: "#ef4444", fontWeight: 700 }}>{v.low_stock_count}</span>
                      ) : (
                        <span style={{ color: "#22c55e" }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <button
                        onClick={() => onSelectVenue(v.venue_id, v.venue_name)}
                        style={{
                          padding: "4px 12px", borderRadius: 6, border: "1px solid #334155",
                          background: "#0f172a", color: "#94a3b8", fontSize: 12,
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                      >
                        Inventory &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
