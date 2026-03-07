import { useState, useEffect, useCallback } from "react";
import { API_BASE, fetchPrintStatus, reprintOrder } from "../../services/api";
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

const printStatusDot = (status) => {
  if (status === "printed") return { color: "#22c55e", label: "Printed" };
  if (status === "failed") return { color: "#eab308", label: "Failed" };
  return { color: "#ef4444", label: "Pending" };
};

export default function OrdersSection({ venueId, startDate, endDate, token, refreshKey }) {
  const fp = { venueId, startDate, endDate, token, refreshKey };

  const summary = useFetch("/api/v1/analytics/summary", fp);
  const timeToOrder = useFetch("/api/v1/analytics/time-to-order", fp);
  const orderDetails = useFetch("/api/v1/analytics/order-details", fp);
  const popularItems = useFetch("/api/v1/analytics/popular-items", fp);

  // Print queue state
  const [printData, setPrintData] = useState(null);
  const [printRefresh, setPrintRefresh] = useState(0);

  const loadPrintStatus = useCallback(() => {
    if (!token) return;
    fetchPrintStatus()
      .then(setPrintData)
      .catch(() => setPrintData(null));
  }, [token]);

  useEffect(() => {
    loadPrintStatus();
  }, [loadPrintStatus, printRefresh, refreshKey]);

  const handleReprint = async (orderId) => {
    try {
      await reprintOrder(orderId);
      setPrintRefresh((k) => k + 1);
    } catch (e) {
      console.error("Reprint failed:", e);
    }
  };

  const totalOrders = summary?.total_orders || 0;
  const totalRevenue = summary?.total_revenue_cents || 0;
  const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders / 100).toFixed(2) : "0.00";
  const avgTimeToOrder = summary?.avg_time_to_order_minutes || 0;

  const buckets = timeToOrder?.buckets || [];
  const maxBucket = Math.max(...buckets.map((b) => b.count), 1);

  // Print agent health
  const hb = printData?.heartbeat;
  const agentOnline = hb && hb.last_seen &&
    (Date.now() - new Date(hb.last_seen + "Z").getTime()) < 120000; // 2 min threshold
  const printQueue = printData?.print_queue || [];

  return (
    <div>
      {/* Print Agent Health */}
      <div style={{ ...sectionCard, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: agentOnline ? "#22c55e" : (hb ? "#ef4444" : "#475569"),
        }} />
        <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
          {agentOnline
            ? `Print Agent: Online (${hb.printer_status === "online" ? "printer connected" : "printer offline"})`
            : hb
              ? `Print Agent: Offline (last seen ${new Date(hb.last_seen + "Z").toLocaleString()})`
              : "Print Agent: Not configured"
          }
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <MetricCard label="Total Orders" value={totalOrders} />
        <MetricCard label="Total Revenue" value={`$${(totalRevenue / 100).toFixed(2)}`} />
        <MetricCard label="Avg Order Value" value={`$${avgOrderValue}`} />
        <MetricCard label="Avg Time to Order" value={`${avgTimeToOrder}m`} />
      </div>

      {/* Time to First Order */}
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

      {/* Print Queue Status */}
      {printQueue.length > 0 && (
        <div style={{ ...sectionCard, marginBottom: 20, overflowX: "auto" }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Print Queue</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                {["#", "Customer", "Status", "Created", "Printed", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "8px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {printQueue.slice(0, 25).map((pq) => {
                const st = printStatusDot(pq.print_status);
                const data = pq.order_data || {};
                return (
                  <tr key={pq.id} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "8px", color: "#e2e8f0", fontWeight: 600 }}>{pq.order_number || pq.order_id}</td>
                    <td style={{ padding: "8px", color: "#94a3b8" }}>{data.customer_name || "Guest"}</td>
                    <td style={{ padding: "8px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        color: st.color, fontSize: "0.8rem",
                      }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.color, display: "inline-block" }} />
                        {st.label}
                        {pq.print_status === "failed" && pq.last_error && (
                          <span title={pq.last_error} style={{ color: "#64748b", cursor: "help" }}> (hover for error)</span>
                        )}
                      </span>
                    </td>
                    <td style={{ padding: "8px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                      {pq.created_at ? new Date(pq.created_at).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "8px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                      {pq.printed_at ? new Date(pq.printed_at).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "8px" }}>
                      {pq.print_status !== "pending" && (
                        <button
                          onClick={() => handleReprint(pq.order_id)}
                          style={{
                            padding: "4px 10px", borderRadius: 4, border: "1px solid #334155",
                            background: "#1e293b", color: "#94a3b8", fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          Reprint
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
