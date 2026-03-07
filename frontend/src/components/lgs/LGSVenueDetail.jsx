import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchLGSVenueInventory, updateLGSInventory, updateLGSThreshold } from "../../services/api";

const card = {
  background: "#1e293b", borderRadius: 12, padding: 20,
  border: "1px solid #334155",
};

function InlineNumberEditor({ value, onSave, min = 0 }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  if (!editing) {
    return (
      <span
        onClick={() => { setVal(value); setEditing(true); }}
        style={{ cursor: "pointer", padding: "2px 8px", borderRadius: 4, background: "#0f172a", minWidth: 40, display: "inline-block", textAlign: "center" }}
        title="Click to edit"
      >
        {value}
      </span>
    );
  }

  const save = () => {
    const n = Math.max(min, parseInt(val, 10) || 0);
    onSave(n);
    setEditing(false);
  };

  return (
    <input
      type="number"
      min={min}
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
      style={{
        width: 60, padding: "2px 6px", borderRadius: 4,
        border: "1px solid #3b82f6", background: "#0f172a", color: "#e2e8f0",
        fontSize: 13, textAlign: "center",
      }}
    />
  );
}

export default function LGSVenueDetail({ venueId, venueName, onBack }) {
  const { lgsId } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!lgsId || !venueId) return;
    setLoading(true);
    fetchLGSVenueInventory(lgsId, venueId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [lgsId, venueId]);

  useEffect(() => { load(); }, [load]);

  const handleStockUpdate = async (gameId, newCount) => {
    try {
      await updateLGSInventory(lgsId, venueId, gameId, newCount);
      setData((prev) => prev ? {
        ...prev,
        inventory: prev.inventory.map((i) =>
          i.game_id === gameId ? { ...i, stock_count: newCount, needs_restock: newCount <= i.restock_threshold } : i
        ),
      } : prev);
    } catch {}
  };

  const handleThresholdUpdate = async (gameId, newThreshold) => {
    try {
      await updateLGSThreshold(lgsId, venueId, gameId, newThreshold);
      setData((prev) => prev ? {
        ...prev,
        inventory: prev.inventory.map((i) =>
          i.game_id === gameId ? { ...i, restock_threshold: newThreshold, needs_restock: i.stock_count <= newThreshold } : i
        ),
      } : prev);
    } catch {}
  };

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          padding: "6px 14px", borderRadius: 6, border: "1px solid #334155",
          background: "#0f172a", color: "#94a3b8", fontSize: 13,
          cursor: "pointer", marginBottom: 16,
        }}
      >
        &larr; Back to Overview
      </button>

      <h2 style={{ margin: "0 0 16px", fontSize: "1.2rem", fontWeight: 700 }}>
        {venueName || venueId} — Inventory
      </h2>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading inventory...</p>
      ) : !data ? (
        <p style={{ color: "#ef4444" }}>Failed to load inventory.</p>
      ) : (
        <div style={{ ...card, overflow: "auto" }}>
          {data.inventory.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>No inventory data yet. Activate games and set stock levels.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", color: "#94a3b8" }}>Game</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8" }}>Stock</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8" }}>Threshold</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8" }}>Price</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8" }}>Sold</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8" }}>Restock?</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8" }}>Active</th>
                </tr>
              </thead>
              <tbody>
                {data.inventory.map((item) => (
                  <tr key={item.game_id} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "10px 12px", color: "#e2e8f0", fontWeight: 600 }}>{item.title}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <InlineNumberEditor value={item.stock_count} onSave={(v) => handleStockUpdate(item.game_id, v)} />
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <InlineNumberEditor value={item.restock_threshold} onSave={(v) => handleThresholdUpdate(item.game_id, v)} />
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#94a3b8" }}>
                      {item.retail_price_cents != null ? `$${(item.retail_price_cents / 100).toFixed(2)}` : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#94a3b8" }}>{item.total_sold}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {item.needs_restock ? (
                        <span style={{ color: "#ef4444", fontWeight: 700, background: "#ef444418", padding: "2px 8px", borderRadius: 8, fontSize: 11 }}>Restock</span>
                      ) : (
                        <span style={{ color: "#22c55e", fontSize: 11 }}>OK</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {item.is_active_at_venue ? (
                        <span style={{ color: "#22c55e", fontWeight: 600, fontSize: 11 }}>Active</span>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: 11 }}>Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
