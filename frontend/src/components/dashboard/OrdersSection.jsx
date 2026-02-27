import { useState, useEffect } from "react";
import { API_BASE } from "../../services/api";
import { MetricCard, HorizontalBars, sectionCard } from "./OverviewSection";

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

export default function OrdersSection({ venueId, startDate, endDate, token, refreshKey }) {
  const fp = { venueId, startDate, endDate, token, refreshKey };

  const summary = useFetch("/api/v1/analytics/summary", fp);
  const timeToOrder = useFetch("/api/v1/analytics/time-to-order", fp);
  const orderDetails = useFetch("/api/v1/analytics/order-details", fp);
  const popularItems = useFetch("/api/v1/analytics/popular-items", fp);

  const totalOrders = summary?.total_orders || 0;
  const totalRevenue = summary?.total_revenue_cents || 0;
  const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders / 100).toFixed(2) : "0.00";
  const avgTimeToOrder = summary?.avg_time_to_order_minutes || 0;

  const buckets = timeToOrder?.buckets || [];
  const maxBucket = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <MetricCard label="Total Orders" value={totalOrders} />
        <MetricCard label="Total Revenue" value={`$${(totalRevenue / 100).toFixed(2)}`} />
        <MetricCard label="Avg Order Value" value={`$${avgOrderValue}`} />
        <MetricCard label="Avg Time to Order" value={`${avgTimeToOrder}m`} />
      </div>

      {/* Time to First Order — THE key metric */}
      <div style={{ ...sectionCard, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: 0 }}>Time to First Order</h3>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#f59e0b" }}>
            Average: {timeToOrder?.avg_minutes || 0}m
          </div>
        </div>
        <div>
          {buckets.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 80, fontSize: "0.8rem", color: "#94a3b8", textAlign: "right" }}>{b.label}</div>
              <div style={{ flex: 1, height: 28, background: "#0f172a", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${(b.count / maxBucket) * 100}%`,
                  background: "linear-gradient(90deg, #f59e0b, #d97706)",
                  borderRadius: 4, minWidth: b.count > 0 ? 4 : 0,
                  display: "flex", alignItems: "center", paddingLeft: 8,
                }}>
                  {b.count > 0 && <span style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 600 }}>{b.count}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row: Order Details table + Popular Items */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        {/* Order Details */}
        <div style={{ ...sectionCard, flex: "2 1 400px", minWidth: 350, overflowX: "auto" }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Order Details</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                {["Time", "Device", "Game", "Items", "Total", "Minutes In"].map((h) => (
                  <th key={h} style={{ padding: "8px 8px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!orderDetails?.orders || orderDetails.orders.length === 0) && (
                <tr><td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#475569" }}>No orders placed yet</td></tr>
              )}
              {(orderDetails?.orders || []).slice(0, 30).map((o, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "8px", color: "#94a3b8", whiteSpace: "nowrap" }}>{o.timestamp ? new Date(o.timestamp).toLocaleString() : "—"}</td>
                  <td style={{ padding: "8px", color: "#94a3b8" }}>{o.device_name}</td>
                  <td style={{ padding: "8px", color: "#94a3b8" }}>{o.game_title || "—"}</td>
                  <td style={{ padding: "8px", color: "#94a3b8", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={o.items}>{o.items || "—"}</td>
                  <td style={{ padding: "8px", color: "#e2e8f0", fontWeight: 600 }}>${((o.subtotal_cents || 0) / 100).toFixed(2)}</td>
                  <td style={{ padding: "8px", color: "#94a3b8" }}>{o.minutes_into_game ? `${Math.round(o.minutes_into_game)}m` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Popular Items */}
        <div style={{ ...sectionCard, flex: "1 1 280px", minWidth: 250 }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Most Ordered Items</h3>
          <HorizontalBars
            items={(popularItems?.items || []).map((item) => ({ label: item.name, count: item.count }))}
            color="#f59e0b"
          />
        </div>
      </div>

      {/* Menu Browse Without Order */}
      <div style={sectionCard}>
        <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 8px" }}>Menu Conversion</h3>
        <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
          Requires menu_browsed event tracking for full conversion metrics.
        </div>
      </div>
    </div>
  );
}
