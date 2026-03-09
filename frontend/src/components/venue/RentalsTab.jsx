import { useState, useEffect, useCallback } from "react";
import {
  fetchRentalAdminDashboard,
  confirmRentalPickup,
  confirmRentalReturn,
} from "../../services/api";

const statCard = {
  background: "var(--bg-card, #1e2a45)",
  borderRadius: 12,
  padding: "16px 20px",
  textAlign: "center",
  border: "1px solid var(--border, #2a3a5c)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const th = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid var(--border, #2a3a5c)",
  color: "var(--text-secondary, #a0a0a0)",
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const td = {
  padding: "10px 12px",
  borderBottom: "1px solid var(--border, #2a3a5c)",
  color: "var(--text-primary, #e0e0e0)",
};

const actionBtn = {
  padding: "6px 14px",
  borderRadius: 8,
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.15s",
};

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date().toISOString().split("T")[0];
  return dateStr < today;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  return dateStr === new Date().toISOString().split("T")[0];
}

export default function RentalsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const result = await fetchRentalAdminDashboard("shallweplay");
      setData(result);
    } catch (err) {
      console.error("Failed to load rental dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleConfirmPickup = async (reservationId) => {
    setActionLoading(reservationId);
    try {
      await confirmRentalPickup(reservationId);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to confirm pickup");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReturn = async (reservationId) => {
    setActionLoading(reservationId);
    try {
      await confirmRentalReturn(reservationId);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to confirm return");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading rental data...</div>;
  }

  if (!data) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Failed to load rental data.</div>;
  }

  const stats = data.stats || {};
  const inv = data.inventory_summary || {};

  return (
    <div>
      {/* Section 1: Quick Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12,
        marginBottom: 28,
      }}>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent, #e94560)" }}>{stats.total_subscribers || 0}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>Subscribers</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent, #e94560)" }}>{stats.active_rentals || 0}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>Active Rentals</div>
        </div>
        <div style={{
          ...statCard,
          border: stats.pending_pickups > 0 ? "1px solid #eab308" : statCard.border,
        }}>
          <div style={{
            fontSize: 28, fontWeight: 800,
            color: stats.pending_pickups > 0 ? "#eab308" : "var(--accent, #e94560)",
          }}>
            {stats.pending_pickups || 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>Pending Pickups</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent, #e94560)" }}>
            {inv.available || 0} / {inv.total || 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>Games Available</div>
        </div>
      </div>

      {/* Section 2: Pending Pickups */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
          Pending Pickups {stats.pending_pickups > 0 && `(${stats.pending_pickups})`}
        </h3>
        {(data.pending_pickups || []).length === 0 ? (
          <div style={{ ...statCard, textAlign: "left", padding: 16, color: "var(--text-secondary)", fontSize: 14 }}>
            No pending pickups.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={th}>Subscriber</th>
                  <th style={th}>Game</th>
                  <th style={th}>Pickup By</th>
                  <th style={th}>Type</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.pending_pickups.map((p) => (
                  <tr key={p.reservation_id} style={{
                    background: isOverdue(p.pickup_deadline) ? "rgba(220,38,38,0.1)"
                      : isToday(p.pickup_deadline) ? "rgba(234,179,8,0.1)" : "transparent",
                  }}>
                    <td style={td}>{p.subscriber_name}</td>
                    <td style={td}>{p.game_title}</td>
                    <td style={{
                      ...td,
                      color: isOverdue(p.pickup_deadline) ? "#ef4444" : isToday(p.pickup_deadline) ? "#eab308" : td.color,
                      fontWeight: isOverdue(p.pickup_deadline) || isToday(p.pickup_deadline) ? 700 : 400,
                    }}>
                      {p.pickup_deadline}
                    </td>
                    <td style={td}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                        background: p.reservation_type === "swap" ? "rgba(139,92,246,0.2)" : "rgba(59,130,246,0.2)",
                        color: p.reservation_type === "swap" ? "#a78bfa" : "#60a5fa",
                      }}>
                        {p.reservation_type === "swap" ? "Swap" : "New"}
                      </span>
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => handleConfirmPickup(p.reservation_id)}
                        disabled={actionLoading === p.reservation_id}
                        style={{
                          ...actionBtn,
                          background: "#22c55e",
                          color: "#fff",
                          opacity: actionLoading === p.reservation_id ? 0.5 : 1,
                        }}
                      >
                        {actionLoading === p.reservation_id ? "..." : "Confirm Pickup"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Active Rentals */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
          Active Rentals {stats.active_rentals > 0 && `(${stats.active_rentals})`}
        </h3>
        {(data.active_rentals || []).length === 0 ? (
          <div style={{ ...statCard, textAlign: "left", padding: 16, color: "var(--text-secondary)", fontSize: 14 }}>
            No active rentals.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={th}>Subscriber</th>
                  <th style={th}>Game</th>
                  <th style={th}>Since</th>
                  <th style={th}>Return By</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.active_rentals.map((r) => (
                  <tr key={r.reservation_id}>
                    <td style={td}>{r.subscriber_name}</td>
                    <td style={td}>{r.game_title}</td>
                    <td style={td}>{r.checked_out_at?.split(" ")[0] || r.checked_out_at?.split("T")[0]}</td>
                    <td style={{
                      ...td,
                      color: r.return_deadline ? (isOverdue(r.return_deadline) ? "#ef4444" : td.color) : "var(--text-secondary)",
                      fontStyle: r.return_deadline ? "normal" : "italic",
                    }}>
                      {r.return_deadline || "No return date"}
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => handleConfirmReturn(r.reservation_id)}
                        disabled={actionLoading === r.reservation_id}
                        style={{
                          ...actionBtn,
                          background: "rgba(59,130,246,0.2)",
                          color: "#60a5fa",
                          opacity: actionLoading === r.reservation_id ? 0.5 : 1,
                        }}
                      >
                        {actionLoading === r.reservation_id ? "..." : "Confirm Return"}
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
