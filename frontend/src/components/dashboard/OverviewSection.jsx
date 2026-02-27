import { useState, useEffect } from "react";
import { API_BASE } from "../../services/api";

function useDashFetch(path, { venueId, startDate, endDate, token, refreshKey }) {
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
      .catch(() => null)
      .then(setData);
  }, [path, venueId, startDate, endDate, token, refreshKey]);
  return data;
}

function MetricCard({ label, value, subtitle }) {
  return (
    <div style={{
      background: "#1e293b", borderRadius: 10, padding: "16px 20px",
      border: "1px solid #334155", minWidth: 140, flex: "1 1 140px",
    }}>
      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>{value}</div>
      {subtitle && <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

function Sparkline({ data, color = "#3b82f6", label }) {
  if (!data || data.length === 0) return (
    <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, border: "1px solid #334155", flex: "1 1 200px", minWidth: 180 }}>
      <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: 8 }}>{label}</div>
      <div style={{ color: "#475569", fontSize: "0.85rem" }}>No data</div>
    </div>
  );

  const counts = data.map((d) => d.count);
  const max = Math.max(...counts, 1);
  const w = 200;
  const h = 60;
  const points = counts.map((c, i) => {
    const x = counts.length > 1 ? (i / (counts.length - 1)) * w : w / 2;
    const y = h - (c / max) * h;
    return `${x},${y}`;
  }).join(" ");

  const latest = counts[counts.length - 1] || 0;

  return (
    <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, border: "1px solid #334155", flex: "1 1 200px", minWidth: 180 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{label}</span>
        <span style={{ fontSize: "1.1rem", fontWeight: 700, color }}>{latest}</span>
      </div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      </svg>
    </div>
  );
}

function HorizontalBars({ items, maxCount, color = "#22c55e" }) {
  if (!items || items.length === 0) return <div style={{ color: "#475569", fontSize: "0.85rem" }}>No data</div>;
  const mc = maxCount || Math.max(...items.map((i) => i.count), 1);
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 120, fontSize: "0.8rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</div>
          <div style={{ flex: 1, height: 18, background: "#0f172a", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(item.count / mc) * 100}%`, background: color, borderRadius: 4, minWidth: item.count > 0 ? 4 : 0 }} />
          </div>
          <div style={{ width: 40, textAlign: "right", fontSize: "0.8rem", color: "#cbd5e1" }}>{item.count}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, size = 120 }) {
  if (!segments || segments.length === 0) return <div style={{ color: "#475569", fontSize: "0.85rem" }}>No data</div>;
  const total = segments.reduce((s, seg) => s + seg.count, 0) || 1;
  const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  let startAngle = -90;

  const paths = segments.map((seg, i) => {
    const angle = (seg.count / total) * 360;
    const endAngle = startAngle + angle;
    const largeArc = angle > 180 ? 1 : 0;
    const rad = (a) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(endAngle));
    const y2 = cy + r * Math.sin(rad(endAngle));
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;
    return <path key={i} d={path} fill={colors[i % colors.length]} />;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <svg width={size} height={size}>
        {/* inner ring (donut hole) */}
        {paths}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="#1e293b" />
      </svg>
      <div>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontSize: "0.8rem" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors[i % colors.length] }} />
            <span style={{ color: "#94a3b8" }}>{seg.label}</span>
            <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{seg.count}</span>
            <span style={{ color: "#475569" }}>({Math.round((seg.count / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PeakHoursHeatmap({ heatmap }) {
  if (!heatmap || heatmap.length === 0) return <div style={{ color: "#475569", fontSize: "0.85rem" }}>No data</div>;
  const max = Math.max(...heatmap.map((h) => h.count), 1);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  heatmap.forEach((h) => {
    if (h.day >= 0 && h.day < 7 && h.hour >= 0 && h.hour < 24) {
      grid[h.day][h.hour] = h.count;
    }
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 1 }}>
        <div style={{ width: 32 }} />
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} style={{ width: 16, fontSize: "0.55rem", color: "#475569", textAlign: "center" }}>{i}</div>
        ))}
      </div>
      {grid.map((row, d) => (
        <div key={d} style={{ display: "flex", alignItems: "center", gap: 1, marginBottom: 1 }}>
          <div style={{ width: 32, fontSize: "0.65rem", color: "#64748b" }}>{days[d]}</div>
          {row.map((count, h) => (
            <div
              key={h}
              title={`${days[d]} ${h}:00 — ${count}`}
              style={{
                width: 16, height: 16, borderRadius: 2,
                background: count === 0 ? "#1e293b" : `rgba(34,197,94,${Math.max(0.15, count / max)})`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function SessionFunnel({ data }) {
  if (!data) return <div style={{ color: "#475569", fontSize: "0.85rem" }}>Loading...</div>;
  const steps = [
    { label: "App Loaded", count: data.app_loaded || 0 },
    { label: "Game Selected", count: data.game_selected || 0 },
    { label: "Question Asked", count: data.question_asked || 0 },
    { label: "Order Placed", count: data.order_placed || 0 },
  ];
  const maxCount = steps[0].count || 1;

  return (
    <div>
      {steps.map((step, i) => {
        const pct = maxCount > 0 ? Math.round((step.count / maxCount) * 100) : 0;
        return (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#94a3b8", marginBottom: 2 }}>
              <span>{step.label}</span>
              <span>{step.count} ({pct}%)</span>
            </div>
            <div style={{ height: 24, background: "#0f172a", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`, borderRadius: 4, minWidth: step.count > 0 ? 4 : 0,
                background: `linear-gradient(90deg, #3b82f6, #1e40af)`,
                transition: "width 0.3s",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VenueHealthTable({ venues }) {
  if (!venues || venues.length === 0) return <div style={{ color: "#475569", fontSize: "0.85rem" }}>No venue data</div>;

  const statusColors = { prospect: "#64748b", trial: "#f59e0b", active: "#22c55e", churned: "#ef4444", paused: "#f97316" };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #334155" }}>
            {["Venue", "Status", "Trial Days", "Sessions/Wk", "Top Game", "Last Active"].map((h) => (
              <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {venues.map((v) => (
            <tr key={v.venue_id} style={{ borderBottom: "1px solid #1e293b" }}>
              <td style={{ padding: "8px 12px", color: "#e2e8f0" }}>{v.venue_name}</td>
              <td style={{ padding: "8px 12px" }}>
                <span style={{
                  padding: "2px 8px", borderRadius: 12, fontSize: "0.7rem", fontWeight: 600,
                  background: statusColors[v.status] || "#64748b", color: "#fff",
                }}>{v.status}</span>
              </td>
              <td style={{ padding: "8px 12px", color: v.trial_days_remaining != null && v.trial_days_remaining <= 7 ? "#ef4444" : "#94a3b8" }}>
                {v.trial_days_remaining != null ? v.trial_days_remaining : "—"}
              </td>
              <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{v.sessions_this_week || 0}</td>
              <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{v.top_game || "—"}</td>
              <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{v.last_active ? new Date(v.last_active).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const sectionCard = {
  background: "#1e293b", borderRadius: 10, padding: 20,
  border: "1px solid #334155", marginBottom: 16,
};

export default function OverviewSection(props) {
  const { venueId, startDate, endDate, token, refreshKey, isSuperAdmin } = props;
  const fp = { venueId, startDate, endDate, token, refreshKey };

  const summary = useDashFetch("/api/v1/analytics/summary", fp);
  const trends = useDashFetch("/api/v1/analytics/trends", fp);
  const topGames = useDashFetch("/api/v1/analytics/top-games", fp);
  const peakHours = useDashFetch("/api/v1/analytics/peak-hours", fp);
  const deviceMix = useDashFetch("/api/v1/analytics/device-mix", fp);
  const funnel = useDashFetch("/api/v1/analytics/funnel", fp);

  const [crmVenues, setCrmVenues] = useState(null);
  useEffect(() => {
    if (!isSuperAdmin || !token || venueId) { setCrmVenues(null); return; }
    fetch(`${API_BASE}/api/v1/admin/crm/venues`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setCrmVenues(Array.isArray(data) ? data : []))
      .catch(() => setCrmVenues([]));
  }, [isSuperAdmin, token, venueId, refreshKey]);

  const fmtTime = (s) => {
    if (!s && s !== 0) return "0s";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div>
      {/* Row 1: Metric Cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <MetricCard label="Total Devices" value={summary?.total_devices ?? "—"} subtitle="Unique Visitors" />
        <MetricCard label="Returning" value={summary ? `${summary.returning_pct}%` : "—"} subtitle={summary ? `${summary.returning_count} devices` : ""} />
        <MetricCard label="Total Sessions" value={summary?.total_sessions ?? "—"} />
        <MetricCard label="Avg Session" value={summary ? fmtTime(summary.avg_session_seconds) : "—"} />
        <MetricCard label="Questions Asked" value={summary?.total_questions ?? "—"} />
        <MetricCard label="Orders Placed" value={summary?.total_orders ?? "—"} />
        <MetricCard label="Revenue" value={summary ? `$${(summary.total_revenue_cents / 100).toFixed(2)}` : "—"} />
        <MetricCard label="Avg Time to Order" value={summary ? `${summary.avg_time_to_order_minutes}m` : "—"} />
      </div>

      {/* Row 2: Sparklines */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <Sparkline data={trends?.sessions_per_day} color="#3b82f6" label="Sessions / Day" />
        <Sparkline data={trends?.questions_per_day} color="#22c55e" label="Questions / Day" />
        <Sparkline data={trends?.orders_per_day} color="#f59e0b" label="Orders / Day" />
      </div>

      {/* Row 3: Quick Insights */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        {/* Top 5 Games */}
        <div style={{ ...sectionCard, flex: "1 1 280px", minWidth: 250 }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Top 5 Games</h3>
          <HorizontalBars
            items={(topGames?.games || []).slice(0, 5).map((g) => ({ label: g.title, count: g.count }))}
          />
        </div>

        {/* Peak Hours */}
        <div style={{ ...sectionCard, flex: "1 1 280px", minWidth: 250 }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Peak Hours</h3>
          <PeakHoursHeatmap heatmap={peakHours?.heatmap} />
        </div>

        {/* Device Mix */}
        <div style={{ ...sectionCard, flex: "1 1 280px", minWidth: 250 }}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Device Mix</h3>
          <DonutChart
            segments={(deviceMix?.platforms || []).map((p) => ({ label: p.platform, count: p.count }))}
          />
        </div>
      </div>

      {/* Row 4: Session Funnel */}
      <div style={{ ...sectionCard, marginBottom: 20 }}>
        <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Session Flow Funnel</h3>
        <SessionFunnel data={funnel} />
      </div>

      {/* Row 5: Venue Health Table (super_admin, All Venues only) */}
      {isSuperAdmin && !venueId && (
        <div style={sectionCard}>
          <h3 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 12px" }}>Venue Health</h3>
          <VenueHealthTable venues={crmVenues} />
        </div>
      )}
    </div>
  );
}

export { useDashFetch, MetricCard, HorizontalBars, DonutChart, sectionCard };
