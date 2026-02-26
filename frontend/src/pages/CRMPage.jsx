import { useState, useEffect, useMemo } from "react";
import { API_BASE } from "../services/api";
import StatusBadge from "../components/crm/StatusBadge";
import TrialAlertBanner from "../components/crm/TrialAlertBanner";
import VenueDetailPanel from "../components/crm/VenueDetailPanel";

function formatDate(iso) {
  if (!iso) return "\u2014";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

function onboardingLabel(step) {
  if (step == null) return "Step 0/5";
  if (step >= 6) return "Complete \u2713";
  return `Step ${step}/5`;
}

export default function CRMPage() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortCol, setSortCol] = useState("venue_name");
  const [sortAsc, setSortAsc] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedVenueId, setSelectedVenueId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("gmai_token");
    fetch(`${API_BASE}/api/v1/admin/crm/venues`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => { setVenues(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const handleExportCSV = () => {
    const token = localStorage.getItem("gmai_token");
    fetch(`${API_BASE}/api/v1/admin/crm/export`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gmai-venues-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const filtered = useMemo(() => {
    let list = venues;
    if (statusFilter !== "all") {
      list = list.filter(v => v.status === statusFilter);
    }
    return [...list].sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (va == null) va = "";
      if (vb == null) vb = "";
      if (typeof va === "number" && typeof vb === "number") {
        return sortAsc ? va - vb : vb - va;
      }
      return sortAsc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [venues, statusFilter, sortCol, sortAsc]);

  const thStyle = {
    padding: "8px 12px", textAlign: "left", cursor: "pointer",
    borderBottom: "2px solid var(--border, #333)", fontSize: "0.8rem",
    color: "var(--text-secondary)", whiteSpace: "nowrap", userSelect: "none",
  };
  const tdStyle = {
    padding: "8px 12px", borderBottom: "1px solid var(--border, #222)",
    fontSize: "0.85rem",
  };

  const SortHeader = ({ col, label }) => (
    <th style={thStyle} onClick={() => handleSort(col)}>
      {label} {sortCol === col ? (sortAsc ? "\u25B2" : "\u25BC") : ""}
    </th>
  );

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Loading CRM data...</div>;
  if (error) return <div style={{ padding: "40px", color: "#ef4444" }}>Error: {error}</div>;

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Venue CRM</h1>
        <button
          onClick={handleExportCSV}
          style={{
            padding: "8px 20px", borderRadius: "8px", border: "none",
            background: "var(--accent, #e94560)", color: "#fff",
            cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
          }}
        >
          Export CSV
        </button>
      </div>

      <TrialAlertBanner venues={venues} />

      <div style={{ marginBottom: "12px" }}>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem",
            background: "var(--bg-secondary, #16213e)", color: "var(--text-primary, #eee)",
            border: "1px solid var(--border, #333)",
          }}
        >
          <option value="all">All Statuses</option>
          <option value="prospect">Prospect</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="churned">Churned</option>
          <option value="paused">Paused</option>
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <SortHeader col="venue_name" label="Venue Name" />
              <SortHeader col="status" label="Status" />
              <SortHeader col="role" label="Plan" />
              <SortHeader col="trial_days_remaining" label="Trial Remaining" />
              <SortHeader col="last_active" label="Last Active" />
              <SortHeader col="sessions_this_week" label="Sessions This Week" />
              <SortHeader col="top_game" label="Top Game" />
              <SortHeader col="games_count" label="Games" />
              <SortHeader col="onboarding_step" label="Onboarding" />
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.venue_id} style={{ transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={tdStyle}>{v.venue_name}</td>
                <td style={tdStyle}><StatusBadge status={v.status} /></td>
                <td style={tdStyle}>{v.role}</td>
                <td style={tdStyle}>
                  {v.trial_days_remaining != null ? `${v.trial_days_remaining} days` : "\u2014"}
                </td>
                <td style={tdStyle}>{formatDate(v.last_active)}</td>
                <td style={tdStyle}>{v.sessions_this_week}</td>
                <td style={tdStyle}>{v.top_game || "\u2014"}</td>
                <td style={tdStyle}>{v.games_count}</td>
                <td style={tdStyle}>{onboardingLabel(v.onboarding_step)}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => setSelectedVenueId(v.venue_id)}
                    style={{
                      padding: "4px 12px", borderRadius: "6px", border: "1px solid var(--border, #333)",
                      background: "var(--bg-secondary, #16213e)", color: "var(--text-primary, #eee)",
                      cursor: "pointer", fontSize: "0.8rem",
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
          No venues match the current filter.
        </div>
      )}

      {selectedVenueId && (
        <VenueDetailPanel venueId={selectedVenueId} onClose={() => setSelectedVenueId(null)} />
      )}
    </div>
  );
}
