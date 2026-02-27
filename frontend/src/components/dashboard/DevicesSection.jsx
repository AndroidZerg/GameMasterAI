import { useState, useEffect, useMemo, useCallback } from "react";
import { API_BASE } from "../../services/api";
import { MetricCard, sectionCard } from "./OverviewSection";

export default function DevicesSection({ venueId, startDate, endDate, token, refreshKey }) {
  const [devices, setDevices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("last_seen_at");
  const [sortDir, setSortDir] = useState("desc");
  const [expanded, setExpanded] = useState({});
  const [expandAll, setExpandAll] = useState(false);
  const [details, setDetails] = useState({});
  const [summary, setSummary] = useState(null);

  // Fetch summary
  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (venueId) params.set("venue_id", venueId);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    fetch(`${API_BASE}/api/v1/analytics/summary?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [venueId, startDate, endDate, token, refreshKey]);

  // Fetch devices
  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (venueId) params.set("venue_id", venueId);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    params.set("page", page);
    params.set("per_page", 50);
    params.set("sort_by", sortBy);
    params.set("sort_dir", sortDir);
    fetch(`${API_BASE}/api/v1/analytics/devices?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : { devices: [], total: 0 })
      .then((data) => { setDevices(data.devices || []); setTotal(data.total || 0); })
      .catch(() => { setDevices([]); setTotal(0); });
  }, [venueId, startDate, endDate, token, refreshKey, page, sortBy, sortDir]);

  const toggleExpand = useCallback((deviceId) => {
    setExpanded((prev) => {
      const next = { ...prev, [deviceId]: !prev[deviceId] };
      // Fetch detail if expanding
      if (next[deviceId] && !details[deviceId]) {
        fetch(`${API_BASE}/api/v1/analytics/devices/${deviceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.ok ? r.json() : null)
          .then((data) => setDetails((d) => ({ ...d, [deviceId]: data })))
          .catch(() => {});
      }
      return next;
    });
  }, [token, details]);

  const handleExpandAll = useCallback(() => {
    const next = !expandAll;
    setExpandAll(next);
    const newExpanded = {};
    devices.forEach((d) => { newExpanded[d.device_id] = next; });
    setExpanded(newExpanded);
    if (next) {
      devices.forEach((d) => {
        if (!details[d.device_id]) {
          fetch(`${API_BASE}/api/v1/analytics/devices/${d.device_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.ok ? r.json() : null)
            .then((data) => setDetails((prev) => ({ ...prev, [d.device_id]: data })))
            .catch(() => {});
        }
      });
    }
  }, [expandAll, devices, details, token]);

  const handleSort = useCallback((col) => {
    if (sortBy === col) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(1);
  }, [sortBy]);

  const fmtTime = (s) => {
    if (!s) return "0s";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const fmtDollars = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

  const platformColors = { iOS: "#3b82f6", Android: "#22c55e", Desktop: "#64748b", Tablet: "#8b5cf6" };

  const columns = [
    { key: "expand", label: "", width: 36 },
    { key: "device_name", label: "Device Name", sortable: true },
    { key: "platform", label: "Platform", sortable: true },
    { key: "visit_count", label: "Visits", sortable: true },
    { key: "stage_names", label: "Player Names" },
    { key: "games_played", label: "Games" },
    { key: "questions_asked", label: "Questions" },
    { key: "tts_uses", label: "TTS" },
    { key: "orders", label: "Orders" },
    { key: "spent_cents", label: "Spent" },
    { key: "avg_session_seconds", label: "Avg Session" },
    { key: "total_events", label: "Events", sortable: true },
    { key: "last_active", label: "Last Active", sortable: true },
  ];

  const sortableMap = { device_name: "device_name", platform: "platform", visit_count: "visit_count", total_events: "total_events", last_active: "last_seen_at" };

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <MetricCard label="Total Devices" value={summary?.total_devices ?? "—"} />
        <MetricCard label="Returning %" value={summary ? `${summary.returning_pct}%` : "—"} />
        <MetricCard label="Avg Visits" value={summary?.avg_visits ?? "—"} />
        <MetricCard label="Avg Session" value={summary ? fmtTime(summary.avg_session_seconds) : "—"} />
        <MetricCard label="Avg Names/Device" value={summary?.avg_names_per_device ?? "—"} />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>{total} devices total</div>
        <button onClick={handleExpandAll} style={{
          padding: "6px 14px", borderRadius: 6, border: "1px solid #334155",
          background: "#0f172a", color: "#e2e8f0", cursor: "pointer", fontSize: "0.8rem",
        }}>
          {expandAll ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Device table */}
      <div style={{ ...sectionCard, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(sortableMap[col.key] || col.key) : undefined}
                  style={{
                    padding: "10px 8px", textAlign: "left", color: "#64748b", fontWeight: 600,
                    cursor: col.sortable ? "pointer" : "default", whiteSpace: "nowrap",
                    width: col.width || "auto", userSelect: "none",
                  }}
                >
                  {col.label}
                  {col.sortable && sortBy === (sortableMap[col.key] || col.key) && (
                    <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 && (
              <tr><td colSpan={columns.length} style={{ padding: 20, textAlign: "center", color: "#475569" }}>No devices recorded yet</td></tr>
            )}
            {devices.map((d) => (
              <DeviceRow
                key={d.device_id}
                device={d}
                isExpanded={!!expanded[d.device_id]}
                detail={details[d.device_id]}
                onToggle={() => toggleExpand(d.device_id)}
                platformColors={platformColors}
                fmtTime={fmtTime}
                fmtDollars={fmtDollars}
                colCount={columns.length}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0", cursor: page > 1 ? "pointer" : "default", opacity: page <= 1 ? 0.5 : 1 }}
          >Prev</button>
          <span style={{ padding: "6px 12px", color: "#94a3b8", fontSize: "0.85rem" }}>Page {page} of {Math.ceil(total / 50)}</span>
          <button
            disabled={page >= Math.ceil(total / 50)}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0", cursor: page < Math.ceil(total / 50) ? "pointer" : "default", opacity: page >= Math.ceil(total / 50) ? 0.5 : 1 }}
          >Next</button>
        </div>
      )}
    </div>
  );
}

function DeviceRow({ device: d, isExpanded, detail, onToggle, platformColors, fmtTime, fmtDollars, colCount }) {
  return (
    <>
      <tr style={{ borderBottom: "1px solid #1e293b", cursor: "pointer" }} onClick={onToggle}>
        <td style={{ padding: "8px", textAlign: "center", color: "#64748b" }}>{isExpanded ? "\u25BC" : "\u25B6"}</td>
        <td style={{ padding: "8px", color: "#e2e8f0" }}>
          {d.device_name}
          {d.is_returning && (
            <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 8, fontSize: "0.65rem", background: "#22c55e", color: "#fff", fontWeight: 600 }}>RETURN</span>
          )}
        </td>
        <td style={{ padding: "8px" }}>
          <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: "0.7rem", fontWeight: 600, background: platformColors[d.platform] || "#64748b", color: "#fff" }}>
            {d.platform}
          </span>
        </td>
        <td style={{ padding: "8px", color: "#94a3b8" }}>{d.visit_count > 1 ? `${d.visit_count}x` : d.visit_count}</td>
        <td style={{ padding: "8px", color: "#94a3b8", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {(d.stage_names || []).join(", ") || "—"}
        </td>
        <td style={{ padding: "8px", color: "#94a3b8" }}>{d.games_played}</td>
        <td style={{ padding: "8px", color: "#94a3b8" }}>{d.questions_asked}</td>
        <td style={{ padding: "8px", color: "#94a3b8" }}>{d.tts_uses}</td>
        <td style={{ padding: "8px", color: "#94a3b8" }}>{d.orders}</td>
        <td style={{ padding: "8px", color: "#94a3b8" }}>{fmtDollars(d.spent_cents)}</td>
        <td style={{ padding: "8px", color: "#94a3b8" }}>{fmtTime(d.avg_session_seconds)}</td>
        <td style={{ padding: "8px", color: "#94a3b8" }}>{d.total_events}</td>
        <td style={{ padding: "8px", color: "#94a3b8", whiteSpace: "nowrap" }}>{d.last_active ? new Date(d.last_active).toLocaleString() : "—"}</td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={colCount} style={{ padding: 0, background: "#111827" }}>
            <DeviceDetail detail={detail} fmtTime={fmtTime} fmtDollars={fmtDollars} />
          </td>
        </tr>
      )}
    </>
  );
}

function DeviceDetail({ detail, fmtTime, fmtDollars }) {
  if (!detail) return <div style={{ padding: 16, color: "#475569" }}>Loading...</div>;

  const panelStyle = { flex: "1 1 280px", minWidth: 240, background: "#1e293b", borderRadius: 8, padding: 12, border: "1px solid #334155" };
  const headStyle = { fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", marginBottom: 8 };

  return (
    <div style={{ padding: 16, display: "flex", flexWrap: "wrap", gap: 12 }}>
      {/* Sessions timeline */}
      <div style={panelStyle}>
        <div style={headStyle}>Session Timeline</div>
        {(detail.sessions || []).length === 0 ? <div style={{ color: "#475569", fontSize: "0.8rem" }}>No sessions</div> :
          (detail.sessions || []).slice(0, 10).map((s, i) => (
            <div key={i} style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4, display: "flex", gap: 8 }}>
              <span>{s.started_at ? new Date(s.started_at).toLocaleString() : "—"}</span>
              <span style={{ color: "#64748b" }}>{fmtTime(s.duration_seconds)}</span>
              <span style={{ color: "#64748b" }}>Q:{s.questions_asked} O:{s.orders_placed}</span>
            </div>
          ))}
      </div>

      {/* Games browsed */}
      <div style={panelStyle}>
        <div style={headStyle}>Games Browsed</div>
        {(detail.games_browsed || []).length === 0 ? <div style={{ color: "#475569", fontSize: "0.8rem" }}>No games</div> :
          (detail.games_browsed || []).slice(0, 10).map((g, i) => (
            <div key={i} style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
              <span>{g.title}</span>
              <span style={{ color: "#64748b" }}>{fmtTime(g.dwell_seconds)} | Q:{g.questions}</span>
            </div>
          ))}
      </div>

      {/* Questions asked */}
      <div style={panelStyle}>
        <div style={headStyle}>Questions Asked</div>
        {(detail.questions || []).length === 0 ? <div style={{ color: "#475569", fontSize: "0.8rem" }}>No questions</div> :
          (detail.questions || []).slice(0, 10).map((q, i) => (
            <div key={i} style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4 }}>
              <span style={{ color: "#64748b" }}>[{q.game_id}]</span> {q.question}
            </div>
          ))}
      </div>

      {/* Orders */}
      <div style={panelStyle}>
        <div style={headStyle}>Orders Placed</div>
        {(detail.orders || []).length === 0 ? <div style={{ color: "#475569", fontSize: "0.8rem" }}>No orders</div> :
          (detail.orders || []).map((o, i) => (
            <div key={i} style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4 }}>
              {fmtDollars(o.subtotal_cents)} — {(o.items || []).map((it) => typeof it === "string" ? it : it.name || "item").join(", ")} [{o.game_id}]
            </div>
          ))}
      </div>

      {/* TTS usage */}
      <div style={panelStyle}>
        <div style={headStyle}>TTS Usage</div>
        {(detail.tts_usage || []).length === 0 ? <div style={{ color: "#475569", fontSize: "0.8rem" }}>No TTS usage</div> :
          (detail.tts_usage || []).slice(0, 10).map((t, i) => (
            <div key={i} style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4 }}>
              Tab: {t.tab || "—"} | Game: {t.game_id || "—"} | {t.seconds}s
            </div>
          ))}
      </div>

      {/* Voice vs Text */}
      <div style={panelStyle}>
        <div style={headStyle}>Voice vs Text</div>
        {detail.voice_vs_text ? (
          <div style={{ fontSize: "0.85rem" }}>
            <div style={{ color: "#22c55e", marginBottom: 4 }}>Voice: {detail.voice_vs_text.voice}</div>
            <div style={{ color: "#3b82f6" }}>Text: {detail.voice_vs_text.text}</div>
          </div>
        ) : <div style={{ color: "#475569", fontSize: "0.8rem" }}>No data</div>}
      </div>
    </div>
  );
}
