import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchPendingFulfillments, confirmFulfillment, reportFulfillmentFailed } from "../../services/api";

const POLL_INTERVAL = 60000; // 60 seconds

export default function FulfillmentBanner() {
  const { venueId } = useAuth();
  const [pending, setPending] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(() => {
    if (!venueId) return;
    fetchPendingFulfillments(venueId)
      .then((d) => setPending(d.pending || []))
      .catch(() => {});
  }, [venueId]);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [load]);

  const handleFulfill = async (purchaseId) => {
    setActionLoading(purchaseId);
    try {
      await confirmFulfillment(venueId, purchaseId);
      setPending((prev) => prev.filter((p) => p.purchase_id !== purchaseId));
    } catch {}
    setActionLoading(null);
  };

  const handleFailed = async (purchaseId) => {
    setActionLoading(purchaseId);
    try {
      await reportFulfillmentFailed(venueId, purchaseId);
      setPending((prev) => prev.filter((p) => p.purchase_id !== purchaseId));
    } catch {}
    setActionLoading(null);
  };

  if (pending.length === 0) return null;

  return (
    <>
      {/* Banner */}
      <div
        onClick={() => setShowModal(true)}
        style={{
          padding: "10px 16px", borderRadius: 10, marginBottom: 16,
          background: "#854d0e", border: "1px solid #a16207",
          display: "flex", alignItems: "center", gap: 10,
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 18 }}>&#x1F4E6;</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          {pending.length} pending game purchase{pending.length !== 1 ? "s" : ""} need fulfillment
        </span>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#fbbf24" }}>View</span>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 5000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "#1e293b", borderRadius: 16, padding: 20, width: "100%",
              maxWidth: 560, maxHeight: "70vh", overflowY: "auto",
              border: "1px solid #334155", color: "#e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", fontWeight: 700 }}>
              Pending Fulfillments
            </h3>
            {pending.map((p) => (
              <div
                key={p.purchase_id}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                  background: "#0f172a", borderRadius: 8, marginBottom: 8, flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.game_title}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {p.customer_name || p.customer_email}
                    {p.minutes_waiting > 0 && (
                      <span style={{ marginLeft: 8, color: p.minutes_waiting > 30 ? "#ef4444" : "#f59e0b" }}>
                        {p.minutes_waiting}m waiting
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => handleFulfill(p.purchase_id)}
                    disabled={actionLoading === p.purchase_id}
                    style={{
                      padding: "5px 12px", borderRadius: 6, border: "none",
                      background: "#22c55e", color: "#fff", fontSize: 12,
                      fontWeight: 600, cursor: "pointer",
                      opacity: actionLoading === p.purchase_id ? 0.5 : 1,
                    }}
                  >
                    Handed Over
                  </button>
                  <button
                    onClick={() => handleFailed(p.purchase_id)}
                    disabled={actionLoading === p.purchase_id}
                    style={{
                      padding: "5px 12px", borderRadius: 6, border: "1px solid #334155",
                      background: "transparent", color: "#ef4444", fontSize: 12,
                      fontWeight: 600, cursor: "pointer",
                      opacity: actionLoading === p.purchase_id ? 0.5 : 1,
                    }}
                  >
                    Not Available
                  </button>
                </div>
              </div>
            ))}
            {pending.length === 0 && (
              <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center" }}>All clear!</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
