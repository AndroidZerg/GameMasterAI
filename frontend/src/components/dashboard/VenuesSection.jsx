import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../../services/api";
import { sectionCard } from "./OverviewSection";

const statusColors = { prospect: "#64748b", trial: "#f59e0b", active: "#22c55e", churned: "#ef4444", paused: "#f97316" };

export default function VenuesSection({ token, refreshKey, selectVenue }) {
  const [venues, setVenues] = useState([]);
  const [expandedVenue, setExpandedVenue] = useState(null);
  const [venueDetail, setVenueDetail] = useState(null);
  const [sortBy, setSortBy] = useState("venue_name");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/v1/admin/crm/venues`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setVenues(Array.isArray(data) ? data : []))
      .catch(() => setVenues([]));
  }, [token, refreshKey]);

  const trialAlertVenues = venues.filter((v) => v.trial_days_remaining != null && v.trial_days_remaining <= 7);

  const handleExpand = useCallback((vid) => {
    if (expandedVenue === vid) { setExpandedVenue(null); setVenueDetail(null); return; }
    setExpandedVenue(vid);
    fetch(`${API_BASE}/api/v1/admin/crm/venues/${vid}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then(setVenueDetail)
      .catch(() => setVenueDetail(null));
  }, [expandedVenue, token]);

  const handleVenueClick = useCallback((vid) => {
    if (selectVenue) selectVenue(vid);
  }, [selectVenue]);

  const sorted = [...venues].sort((a, b) => {
    const av = a[sortBy] ?? "";
    const bv = b[sortBy] ?? "";
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  return (
    <div>
      {/* Trial Alert Banner */}
      {trialAlertVenues.length > 0 && (
        <div style={{
          background: trialAlertVenues.some((v) => v.trial_days_remaining <= 2) ? "#7f1d1d" : "#78350f",
          border: `1px solid ${trialAlertVenues.some((v) => v.trial_days_remaining <= 2) ? "#ef4444" : "#f59e0b"}`,
          borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: "0.85rem", color: "#fef3c7",
        }}>
          {trialAlertVenues.map((v) => (
            <div key={v.venue_id}>
              {v.venue_name}: {v.trial_days_remaining} days remaining on trial
            </div>
          ))}
        </div>
      )}

      {/* Venue Health Table */}
      <div style={{ ...sectionCard, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155" }}>
              <th style={thStyle}></th>
              {[
                { key: "venue_name", label: "Venue" },
                { key: "status", label: "Status" },
                { key: "trial_days_remaining", label: "Trial Days" },
                { key: "onboarding_step", label: "Onboarding" },
                { key: "sessions_this_week", label: "Sessions/Wk" },
                { key: "top_game", label: "Top Game" },
                { key: "last_active", label: "Last Active" },
                { key: "email", label: "Contact" },
              ].map((col) => (
                <th key={col.key} onClick={() => handleSort(col.key)} style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}>
                  {col.label}
                  {sortBy === col.key && <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 16, textAlign: "center", color: "#475569" }}>No venues found</td></tr>
            )}
            {sorted.map((v) => (
              <VenueRow
                key={v.venue_id}
                venue={v}
                isExpanded={expandedVenue === v.venue_id}
                detail={expandedVenue === v.venue_id ? venueDetail : null}
                onExpand={() => handleExpand(v.venue_id)}
                onNameClick={() => handleVenueClick(v.venue_id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = { padding: "10px 8px", textAlign: "left", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" };

function VenueRow({ venue: v, isExpanded, detail, onExpand, onNameClick }) {
  return (
    <>
      <tr style={{ borderBottom: "1px solid #1e293b" }}>
        <td style={{ padding: "8px", textAlign: "center", cursor: "pointer", color: "#64748b" }} onClick={onExpand}>
          {isExpanded ? "\u25BC" : "\u25B6"}
        </td>
        <td style={{ padding: "8px" }}>
          <span onClick={onNameClick} style={{ color: "#3b82f6", cursor: "pointer", textDecoration: "underline" }}>
            {v.venue_name}
          </span>
        </td>
        <td style={{ padding: "8px" }}>
          <span style={{
            padding: "2px 8px", borderRadius: 12, fontSize: "0.7rem", fontWeight: 600,
            background: statusColors[v.status] || "#64748b", color: "#fff",
          }}>{v.status}</span>
        </td>
        <td style={{ padding: "8px", color: v.trial_days_remaining != null && v.trial_days_remaining <= 7 ? "#ef4444" : "#94a3b8" }}>
          {v.trial_days_remaining != null ? v.trial_days_remaining : "—"}
        </td>
        <td style={{ padding: "8px", color: "#94a3b8" }}>Step {v.onboarding_step || 0}/5</td>
        <td style={{ padding: "8px", color: "#94a3b8" }}>{v.sessions_this_week || 0}</td>
        <td style={{ padding: "8px", color: "#94a3b8" }}>{v.top_game || "—"}</td>
        <td style={{ padding: "8px", color: "#94a3b8", whiteSpace: "nowrap" }}>{v.last_active ? new Date(v.last_active).toLocaleDateString() : "—"}</td>
        <td style={{ padding: "8px", color: "#94a3b8", fontSize: "0.75rem" }}>{v.email || "—"}</td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={9} style={{ padding: 0, background: "#111827" }}>
            <VenueDetail detail={detail} />
          </td>
        </tr>
      )}
    </>
  );
}

function VenueDetail({ detail }) {
  if (!detail) return <div style={{ padding: 16, color: "#475569" }}>Loading...</div>;

  const panelStyle = { flex: "1 1 250px", minWidth: 220, background: "#1e293b", borderRadius: 8, padding: 12, border: "1px solid #334155" };

  return (
    <div style={{ padding: 16, display: "flex", flexWrap: "wrap", gap: 12 }}>
      {/* Contact info */}
      <div style={panelStyle}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>Contact</div>
        <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>{detail.email || "—"}</div>
        <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>{detail.phone || "—"}</div>
        <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>{detail.address || "—"}</div>
        {detail.website && <div style={{ fontSize: "0.8rem", color: "#3b82f6" }}>{detail.website}</div>}
      </div>

      {/* 30-day sparkline */}
      <div style={panelStyle}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>30-Day Sessions</div>
        {(detail.daily_analytics || []).length === 0 ? (
          <div style={{ color: "#475569", fontSize: "0.8rem" }}>No data</div>
        ) : (
          <MiniSparkline data={detail.daily_analytics.map((d) => d.sessions_count || 0)} />
        )}
      </div>

      {/* Top 5 games */}
      <div style={panelStyle}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>Top Games</div>
        {(detail.top_games || []).length === 0 ? (
          <div style={{ color: "#475569", fontSize: "0.8rem" }}>No games played</div>
        ) : (
          detail.top_games.map((g, i) => (
            <div key={i} style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 2 }}>
              {g.game_id} ({g.sessions} sessions)
            </div>
          ))
        )}
      </div>

      {/* Quick actions (stubs) */}
      <div style={panelStyle}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>Quick Actions</div>
        <button
          onClick={() => alert("Extend Trial: Coming soon")}
          style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#f59e0b", cursor: "pointer", fontSize: "0.8rem", marginRight: 8, marginBottom: 4 }}
        >Extend Trial</button>
        <button
          onClick={() => alert("Change Status: Coming soon")}
          style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#3b82f6", cursor: "pointer", fontSize: "0.8rem" }}
        >Change Status</button>
      </div>
    </div>
  );
}

function MiniSparkline({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const w = 200;
  const h = 40;
  const points = data.map((v, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * w : w / 2;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline fill="none" stroke="#3b82f6" strokeWidth="1.5" points={points} />
    </svg>
  );
}
