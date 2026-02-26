import { useState, useEffect } from "react";
import { API_BASE } from "../../services/api";
import StatusBadge from "./StatusBadge";

function Sparkline({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>No session data yet</div>;
  }
  const values = data.map(d => d.sessions_count || 0);
  const max = Math.max(...values, 1);
  const w = 280;
  const h = 60;
  const points = values.map((v, i) =>
    `${(i / Math.max(values.length - 1, 1)) * w},${h - (v / max) * h}`
  ).join(" ");

  return (
    <svg width={w} height={h + 4} style={{ display: "block" }}>
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent, #e94560)"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function VenueDetailPanel({ venueId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!venueId) return;
    setLoading(true);
    const token = localStorage.getItem("gmai_token");
    fetch(`${API_BASE}/api/v1/admin/crm/venues/${venueId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [venueId]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  if (!venueId) return null;

  const panelStyle = {
    position: "fixed", top: 0, right: 0, bottom: 0, width: "400px", maxWidth: "90vw",
    background: "var(--bg-primary, #1a1a2e)", borderLeft: "1px solid var(--border, #333)",
    zIndex: 1200, overflowY: "auto", padding: "24px",
    boxShadow: "-4px 0 24px rgba(0,0,0,0.4)",
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1199 }} onClick={onClose} />
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem" }}>{loading ? "Loading..." : detail?.venue_name}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
        </div>

        {loading ? (
          <div>Loading venue details...</div>
        ) : detail ? (
          <>
            <div style={{ marginBottom: "16px" }}>
              <StatusBadge status={detail.status} />
              <span style={{ marginLeft: "8px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>{detail.role}</span>
            </div>

            <div style={{ marginBottom: "16px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              <div>{detail.email}</div>
              {detail.phone && <div>{detail.phone}</div>}
              {detail.address && <div>{detail.address}</div>}
              {detail.website && <div>{detail.website}</div>}
            </div>

            <h3 style={{ fontSize: "0.95rem", marginBottom: "8px" }}>30-Day Sessions</h3>
            <Sparkline data={detail.daily_analytics} />

            <h3 style={{ fontSize: "0.95rem", margin: "16px 0 8px" }}>Top Games</h3>
            {detail.top_games && detail.top_games.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.9rem" }}>
                {detail.top_games.map((g, i) => (
                  <li key={i}>{g.game_id} ({g.sessions} sessions)</li>
                ))}
              </ul>
            ) : (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>No game data yet</div>
            )}

            <h3 style={{ fontSize: "0.95rem", margin: "16px 0 8px" }}>Quick Actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {["Extend Trial", "Mark Active", "Send Onboarding Link"].map(action => (
                <button
                  key={action}
                  onClick={() => showToast(`${action} — link copied!`)}
                  style={{
                    padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border, #333)",
                    background: "var(--bg-secondary, #16213e)", color: "var(--text-primary, #eee)",
                    cursor: "pointer", fontSize: "0.85rem", textAlign: "left",
                  }}
                >
                  {action}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div>Venue not found</div>
        )}

        {toast && (
          <div style={{
            position: "fixed", bottom: "20px", right: "20px", background: "#10b981",
            color: "#fff", padding: "10px 20px", borderRadius: "8px", fontSize: "0.9rem",
            zIndex: 1300,
          }}>
            {toast}
          </div>
        )}
      </div>
    </>
  );
}
