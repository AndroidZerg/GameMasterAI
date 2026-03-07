import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchLGSAlerts, updateLGSInventory } from "../../services/api";

const card = {
  background: "#1e293b", borderRadius: 12, padding: 20,
  border: "1px solid #334155",
};

function InlineStockEditor({ onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        style={{
          padding: "4px 10px", borderRadius: 6, border: "1px solid #334155",
          background: "#0f172a", color: "#94a3b8", fontSize: 12, cursor: "pointer",
        }}
      >
        Update Stock
      </button>
    );
  }

  const save = () => {
    const n = Math.max(0, parseInt(val, 10) || 0);
    if (n > 0) onSave(n);
    setEditing(false);
    setVal("");
  };

  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      <input
        type="number"
        min="0"
        autoFocus
        value={val}
        placeholder="qty"
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setVal(""); } }}
        style={{
          width: 50, padding: "2px 6px", borderRadius: 4,
          border: "1px solid #3b82f6", background: "#0f172a", color: "#e2e8f0", fontSize: 12,
        }}
      />
      <button onClick={save} style={{
        padding: "2px 8px", borderRadius: 4, border: "none",
        background: "#22c55e", color: "#fff", fontSize: 11, cursor: "pointer",
      }}>Save</button>
    </span>
  );
}

export default function LGSAlerts() {
  const { lgsId } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!lgsId) return;
    setLoading(true);
    fetchLGSAlerts(lgsId)
      .then((d) => setAlerts(d.alerts || []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, [lgsId]);

  useEffect(() => { load(); }, [load]);

  const handleStockUpdate = async (venueId, gameId, stockCount) => {
    try {
      await updateLGSInventory(lgsId, venueId, gameId, stockCount);
      // Remove the alert after updating
      setAlerts((prev) => prev.filter((a) =>
        !(a.game_id === gameId && a.venue_id === venueId && (a.type === "restock_needed" || a.type === "new_activation"))
      ));
    } catch {}
  };

  const restockAlerts = alerts.filter((a) => a.type === "restock_needed");
  const activationAlerts = alerts.filter((a) => a.type === "new_activation");
  const fulfillmentAlerts = alerts.filter((a) => a.type === "pending_fulfillment");

  if (loading) return <p style={{ color: "#94a3b8", padding: 20 }}>Loading alerts...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Alerts</h2>

      {/* Restock Needed */}
      <div style={card}>
        <h3 style={{ margin: "0 0 12px", fontSize: "0.95rem", fontWeight: 700, color: "#ef4444" }}>Restock Needed</h3>
        {restockAlerts.length === 0 ? (
          <p style={{ color: "#22c55e", fontSize: 13 }}>All clear &#10003;</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {restockAlerts.map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
                background: "#0f172a", borderRadius: 8, flexWrap: "wrap",
              }}>
                <span style={{ color: "#94a3b8", fontSize: 12, minWidth: 100 }}>{a.venue_name}</span>
                <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13, flex: 1 }}>{a.title}</span>
                <span style={{ color: "#ef4444", fontSize: 12 }}>
                  Stock: {a.stock_count} (threshold: {a.restock_threshold})
                </span>
                <InlineStockEditor onSave={(v) => handleStockUpdate(a.venue_id, a.game_id, v)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Game Activations */}
      <div style={card}>
        <h3 style={{ margin: "0 0 12px", fontSize: "0.95rem", fontWeight: 700, color: "#f59e0b" }}>New Game Activations</h3>
        {activationAlerts.length === 0 ? (
          <p style={{ color: "#22c55e", fontSize: 13 }}>All clear &#10003;</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activationAlerts.map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
                background: "#0f172a", borderRadius: 8, flexWrap: "wrap",
              }}>
                <span style={{ color: "#94a3b8", fontSize: 12, minWidth: 100 }}>{a.venue_name}</span>
                <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13, flex: 1 }}>{a.title}</span>
                <span style={{ color: "#f59e0b", fontSize: 12 }}>
                  Activated {a.activated_at ? new Date(a.activated_at).toLocaleDateString() : "recently"}
                </span>
                <InlineStockEditor onSave={(v) => handleStockUpdate(a.venue_id, a.game_id, v)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Fulfillments */}
      <div style={card}>
        <h3 style={{ margin: "0 0 12px", fontSize: "0.95rem", fontWeight: 700, color: "#3b82f6" }}>Pending Fulfillments</h3>
        {fulfillmentAlerts.length === 0 ? (
          <p style={{ color: "#22c55e", fontSize: 13 }}>All clear &#10003;</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fulfillmentAlerts.map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
                background: "#0f172a", borderRadius: 8, flexWrap: "wrap",
              }}>
                <span style={{ color: "#94a3b8", fontSize: 12, minWidth: 100 }}>{a.venue_name}</span>
                <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13, flex: 1 }}>{a.title}</span>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>
                  Customer: {a.customer_name || "N/A"}
                </span>
                <span style={{ color: "#64748b", fontSize: 11 }}>
                  {a.purchased_at ? new Date(a.purchased_at).toLocaleDateString() : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
