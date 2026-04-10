import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePublisherAuth } from '../contexts/PublisherAuthContext'

const API_BASE = import.meta.env.VITE_API_URL || 'https://gmai-backend.onrender.com'

const TABS = [
  { key: 'home', label: 'Home' },
  { key: 'games', label: 'My Games' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'payments', label: 'Payments' },
  { key: 'settings', label: 'Settings' },
]

// ── Shared UI primitives ──────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--bg-card, #1e2a45)', borderRadius: 10,
      padding: '16px 20px', border: '1px solid var(--border, #2a3a5c)',
      flex: '1 1 160px', minWidth: 160,
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary, #a0a0a0)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent || 'var(--text-primary, #e0e0e0)' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary, #a0a0a0)', marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function ChecklistItem({ done, text, subtext }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0',
      borderBottom: '1px solid var(--border, #2a3a5c)',
    }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
        {done ? '\u2705' : '\u2B1C'}
      </span>
      <div>
        <div style={{
          fontSize: 14, color: done ? 'var(--text-secondary, #a0a0a0)' : 'var(--text-primary, #e0e0e0)',
          textDecoration: done ? 'line-through' : 'none',
        }}>
          {text}
        </div>
        {subtext && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary, #a0a0a0)', marginTop: 2 }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  )
}

function SectionCard({ title, action, children }) {
  return (
    <div style={{
      background: 'var(--bg-secondary, #16213e)', borderRadius: 12, padding: 24,
      border: '1px solid var(--border, #2a3a5c)', marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function EmptyHint({ icon, title, body }) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: 14, color: 'var(--text-primary, #e0e0e0)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary, #a0a0a0)' }}>{body}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    onboarding: { bg: 'rgba(120,120,120,0.18)', color: '#bbb', label: 'In Progress' },
    in_review: { bg: 'rgba(255,193,7,0.15)', color: '#ffd54f', label: 'In Review' },
    live: { bg: 'rgba(76,175,80,0.18)', color: '#81c784', label: 'Live' },
    inactive: { bg: 'rgba(233,69,96,0.15)', color: '#e94560', label: 'Inactive' },
  }
  const c = map[status] || map.onboarding
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color, textTransform: 'uppercase', letterSpacing: '0.4px',
    }}>
      {c.label}
    </span>
  )
}

function GuideStatusBadge({ status }) {
  if (!status || status === 'not_started') {
    return <span style={{ fontSize: 11, color: 'var(--text-secondary, #a0a0a0)' }}>{'\u2014'}</span>
  }
  const map = {
    in_progress: { bg: 'rgba(33,150,243,0.15)', color: '#64b5f6', label: 'Building' },
    ready_for_review: { bg: 'rgba(33,150,243,0.25)', color: '#64b5f6', label: 'Ready to Review', pulse: true },
    approved: { bg: 'rgba(76,175,80,0.18)', color: '#81c784', label: 'Approved' },
    revision_requested: { bg: 'rgba(255,152,0,0.15)', color: '#ffb74d', label: 'Revision Requested' },
  }
  const c = map[status] || { bg: 'transparent', color: '#999', label: status }
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color, textTransform: 'uppercase', letterSpacing: '0.4px',
      animation: c.pulse ? 'gmgPulse 1.6s ease-in-out infinite' : undefined,
    }}>
      {c.label}
    </span>
  )
}

// ── Custom SVG charts (no recharts dep) ───────────────────────

function LineChart({ data, xKey, yKey, height = 200, color = '#64b5f6', label }) {
  if (!data || data.length === 0) {
    return <EmptyHint icon={'\uD83D\uDCCA'} title="No data yet" body="Charts populate once your games go live at venues." />
  }
  const W = 600, H = height, P = { l: 40, r: 16, t: 12, b: 30 }
  const innerW = W - P.l - P.r
  const innerH = H - P.t - P.b
  const maxY = Math.max(...data.map(d => Number(d[yKey] || 0)), 1)
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0
  const points = data.map((d, i) => {
    const x = P.l + i * stepX
    const y = P.t + innerH - (Number(d[yKey] || 0) / maxY) * innerH
    return [x, y]
  })
  const path = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ')
  const areaPath = `${path} L${P.l + innerW},${P.t + innerH} L${P.l},${P.t + innerH} Z`

  // Y-axis ticks (0, mid, max)
  const yTicks = [0, Math.round(maxY / 2), maxY]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Grid */}
      {yTicks.map((t, i) => {
        const y = P.t + innerH - (t / maxY) * innerH
        return (
          <g key={i}>
            <line x1={P.l} y1={y} x2={W - P.r} y2={y}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={P.l - 6} y={y + 4} fontSize="10" fill="#888" textAnchor="end">{t}</text>
          </g>
        )
      })}
      {/* Area fill */}
      <path d={areaPath} fill={color} opacity="0.12" />
      {/* Line */}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Points */}
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={color} />
      ))}
      {/* X labels (show first, mid, last) */}
      {data.length > 0 && [0, Math.floor(data.length / 2), data.length - 1].map(idx => {
        if (idx >= data.length) return null
        const x = P.l + idx * stepX
        const lbl = String(data[idx][xKey] || '').slice(5) // MM-DD
        return (
          <text key={idx} x={x} y={H - 8} fontSize="10" fill="#888" textAnchor="middle">{lbl}</text>
        )
      })}
      {label && (
        <text x={P.l} y={P.t} fontSize="11" fill="#888">{label}</text>
      )}
    </svg>
  )
}

function BarChart({ data, labelKey, valueKey, height = 200, color = '#81c784' }) {
  if (!data || data.length === 0) {
    return <EmptyHint icon={'\uD83D\uDCCA'} title="No data" body="No items to display yet." />
  }
  const W = 600, H = height, P = { l: 130, r: 16, t: 8, b: 8 }
  const rowH = (H - P.t - P.b) / Math.max(data.length, 1)
  const barH = Math.max(8, rowH * 0.6)
  const maxV = Math.max(...data.map(d => Number(d[valueKey] || 0)), 1)
  const innerW = W - P.l - P.r

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {data.map((d, i) => {
        const v = Number(d[valueKey] || 0)
        const w = (v / maxV) * innerW
        const y = P.t + i * rowH + (rowH - barH) / 2
        const labelText = String(d[labelKey] || '')
        const truncated = labelText.length > 18 ? labelText.slice(0, 17) + '\u2026' : labelText
        return (
          <g key={i}>
            <text x={P.l - 8} y={y + barH / 2 + 4} fontSize="11" fill="#ccc" textAnchor="end">
              {truncated}
            </text>
            <rect x={P.l} y={y} width={w} height={barH} fill={color} opacity="0.85" rx="3" />
            <text x={P.l + w + 6} y={y + barH / 2 + 4} fontSize="11" fill="#aaa">{v}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── HOME TAB ──────────────────────────────────────────────────

function activityLabel(item) {
  if (item.type === 'game_submitted') return `Submitted "${item.title}" for review`
  if (item.type === 'game_live') return `"${item.title}" is now live at venues`
  return `Updated "${item.title}"`
}

function activityIcon(item) {
  if (item.type === 'game_submitted') return '\uD83D\uDE80'
  if (item.type === 'game_live') return '\u2705'
  return '\u270F\uFE0F'
}

function HomeTab({ publisher, summary, loading, onAddGame }) {
  const gamesCount = summary?.games_on_platform ?? 0
  const hasAnyGame = gamesCount > 0
  const hasGameLive = (summary?.games_live ?? 0) > 0
  const hasInReview = (summary?.games_in_review ?? 0) > 0

  return (
    <div>
      <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
        Welcome, {publisher.company_name}!
      </h2>

      {/* Quick Stats */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <StatCard
          label="Games on Platform"
          value={loading ? '\u2026' : String(gamesCount)}
          sub={summary ? `${summary.games_live} live \u00B7 ${summary.games_in_review} in review` : ''}
        />
        <StatCard
          label="Plays (Last 30d)"
          value={loading ? '\u2026' : String(summary?.total_play_sessions_30d ?? 0)}
        />
        <StatCard
          label="Units Sold (30d)"
          value={loading ? '\u2026' : String(summary?.total_units_sold_30d ?? 0)}
        />
        <StatCard
          label="Next Payment"
          value={summary?.next_payment ? `$${summary.next_payment.amount.toFixed(2)}` : '\u2014'}
          sub={summary?.next_payment?.scheduled_at
            ? new Date(summary.next_payment.scheduled_at).toLocaleDateString()
            : 'No payment scheduled'}
        />
      </div>

      {/* Getting Started */}
      <SectionCard title="Getting Started">
        <ChecklistItem done text="Account created" />
        <ChecklistItem
          done={hasAnyGame}
          text="Add your first game"
          subtext={hasAnyGame ? undefined : 'Click below to start the onboarding wizard'}
        />
        <ChecklistItem
          done={hasInReview || hasGameLive}
          text="Submit for review"
          subtext={hasInReview || hasGameLive ? undefined : 'Upload rulebook + cover art and submit'}
        />
        <ChecklistItem
          done={hasGameLive}
          text="Game goes live at venues"
        />
      </SectionCard>

      {!hasAnyGame && (
        <button
          onClick={onAddGame}
          style={{
            padding: '14px 28px', fontSize: 15, fontWeight: 600,
            background: '#4caf50', color: '#fff', border: 'none', borderRadius: 8,
            cursor: 'pointer', width: '100%', marginBottom: 24,
          }}
        >
          {'\uD83C\uDFAE Add Your First Game'}
        </button>
      )}

      {/* Recent Activity */}
      <SectionCard title="Recent Activity">
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
        ) : (summary?.recent_activity?.length ?? 0) === 0 ? (
          <EmptyHint
            icon={'\uD83D\uDD52'}
            title="No activity yet"
            body="Add a game to start building your timeline."
          />
        ) : (
          <div>
            {summary.recent_activity.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                borderBottom: i < summary.recent_activity.length - 1 ? '1px solid var(--border, #2a3a5c)' : 'none',
              }}>
                <span style={{ fontSize: 18 }}>{activityIcon(a)}</span>
                <div style={{ flex: 1, fontSize: 14 }}>{activityLabel(a)}</div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {a.at ? new Date(a.at).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ── ANALYTICS TAB ─────────────────────────────────────────────

function AnalyticsTab({ getToken }) {
  const [period, setPeriod] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const t = getToken()
    if (!t) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/publishers/dashboard/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [getToken, period])

  useEffect(() => { fetchData() }, [fetchData])

  const periodOptions = [
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: '90d', label: '90 days' },
    { key: 'ytd', label: 'YTD' },
    { key: 'all', label: 'All time' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Analytics</h2>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card, #1e2a45)', padding: 4, borderRadius: 8, border: '1px solid var(--border, #2a3a5c)' }}>
          {periodOptions.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600,
                background: period === p.key ? 'var(--accent, #e94560)' : 'transparent',
                color: period === p.key ? '#fff' : 'var(--text-secondary)',
                border: 'none', borderRadius: 4, cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top stats */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="Total Plays" value={loading ? '\u2026' : String(data?.totals?.plays ?? 0)} />
        <StatCard label="QR Scans" value={loading ? '\u2026' : String(data?.totals?.qr_scans ?? 0)} />
        <StatCard label="Units Sold" value={loading ? '\u2026' : String(data?.totals?.sales ?? 0)} />
        <StatCard
          label="Conversion Rate"
          value={loading ? '\u2026' : `${(data?.conversion_rate ?? 0).toFixed(1)}%`}
          sub="Sales / Plays"
        />
        <StatCard
          label="Sell-Through Rate"
          value={loading ? '\u2026' : `${(data?.sell_through_rate ?? 0).toFixed(1)}%`}
          sub="Sold / Received"
        />
      </div>

      <SectionCard title="Plays Over Time">
        <LineChart data={data?.plays_over_time || []} xKey="date" yKey="plays" color="#64b5f6" />
      </SectionCard>

      <SectionCard title="Top Games (by plays)">
        <BarChart data={data?.top_games || []} labelKey="title" valueKey="plays" color="#81c784" />
      </SectionCard>

      <SectionCard title="Top Venues (by plays)">
        {data?.top_venues?.length > 0 ? (
          <BarChart
            data={data.top_venues.map(v => ({ ...v, venue_label: v.venue_id }))}
            labelKey="venue_label"
            valueKey="plays"
            color="#ffb74d"
          />
        ) : (
          <EmptyHint icon={'\uD83C\uDFE0'} title="No venue data yet" body="Venue plays appear once your games are deployed." />
        )}
      </SectionCard>
    </div>
  )
}

// ── INVENTORY TAB ─────────────────────────────────────────────

function InventoryTab({ getToken }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  const fetchData = useCallback(async () => {
    const t = getToken()
    if (!t) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/publishers/dashboard/inventory`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [getToken])

  useEffect(() => { fetchData() }, [fetchData])

  const toggle = (gid) => setExpanded(prev => ({ ...prev, [gid]: !prev[gid] }))

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading inventory...</div>
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 600 }}>Inventory</h2>

      {/* Top stats */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="In Stock" value={String(data?.totals?.total_in_stock ?? 0)} sub="Across all venues" />
        <StatCard label="Sold (lifetime)" value={String(data?.totals?.total_sold ?? 0)} />
        <StatCard label="Demo Units" value={String(data?.totals?.total_demo ?? 0)} />
        <StatCard label="Venues Stocking" value={String(data?.totals?.venues_count ?? 0)} />
      </div>

      {/* Restock alerts */}
      <SectionCard title={`Restock Alerts${data?.restock_alerts?.length ? ` (${data.restock_alerts.length})` : ''}`}>
        {data?.restock_alerts?.length > 0 ? (
          <div>
            {data.restock_alerts.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', marginBottom: 8, borderRadius: 8,
                background: a.severity === 'critical' ? 'rgba(233,69,96,0.10)' : 'rgba(255,152,0,0.08)',
                border: `1px solid ${a.severity === 'critical' ? 'rgba(233,69,96,0.3)' : 'rgba(255,152,0,0.3)'}`,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {`@ ${a.venue_name} \u00B7 ${a.in_stock} unit(s) remaining`}
                  </div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: a.severity === 'critical' ? '#e94560' : '#ff9800',
                  color: '#fff', textTransform: 'uppercase', letterSpacing: '0.4px',
                }}>
                  {a.severity}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyHint icon={'\u2705'} title="All stocked up" body="No restock alerts at this time." />
        )}
      </SectionCard>

      {/* Per-game inventory */}
      <SectionCard title="Inventory by Game">
        {data?.inventory_by_game?.length > 0 ? (
          <div>
            {data.inventory_by_game.map(g => (
              <div key={g.game_id} style={{
                marginBottom: 8, borderRadius: 8,
                background: 'var(--bg-card, #1e2a45)', border: '1px solid var(--border, #2a3a5c)',
              }}>
                <div
                  onClick={() => toggle(g.game_id)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 16px', cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{g.title}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span>{g.in_stock} in stock</span>
                    <span>{g.sold} sold</span>
                    <span>{g.demo} demo</span>
                    <span>{expanded[g.game_id] ? '\u25B2' : '\u25BC'}</span>
                  </div>
                </div>
                {expanded[g.game_id] && (
                  <div style={{ padding: '0 16px 14px' }}>
                    <table style={{ width: '100%', fontSize: 12 }}>
                      <thead>
                        <tr style={{ color: 'var(--text-secondary)' }}>
                          <th style={{ textAlign: 'left', padding: '6px 0' }}>Venue</th>
                          <th style={{ textAlign: 'right', padding: '6px 0' }}>In Stock</th>
                          <th style={{ textAlign: 'right', padding: '6px 0' }}>Sold</th>
                          <th style={{ textAlign: 'right', padding: '6px 0' }}>Demo</th>
                          <th style={{ textAlign: 'right', padding: '6px 0' }}>Last Restocked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.venues.map((v, i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--border, #2a3a5c)' }}>
                            <td style={{ padding: '6px 0' }}>{v.venue_name}</td>
                            <td style={{ textAlign: 'right' }}>{v.in_stock}</td>
                            <td style={{ textAlign: 'right' }}>{v.sold}</td>
                            <td style={{ textAlign: 'right' }}>{v.demo}</td>
                            <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                              {v.last_restocked_at ? new Date(v.last_restocked_at).toLocaleDateString() : '\u2014'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyHint
            icon={'\uD83D\uDCE6'}
            title="No live inventory yet"
            body="Inventory shows up here once your games are stocked at venues."
          />
        )}
      </SectionCard>

      {/* Donor unit log */}
      <SectionCard title="Donor Units (consigned)">
        {data?.donor_unit_log?.length > 0 ? (
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)' }}>
                <th style={{ textAlign: 'left', padding: '8px 0' }}>Game</th>
                <th style={{ textAlign: 'right', padding: '8px 0' }}>Demo</th>
                <th style={{ textAlign: 'right', padding: '8px 0' }}>Sale</th>
                <th style={{ textAlign: 'right', padding: '8px 0' }}>Total Donated</th>
              </tr>
            </thead>
            <tbody>
              {data.donor_unit_log.map((d, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border, #2a3a5c)' }}>
                  <td style={{ padding: '10px 0' }}>{d.title}</td>
                  <td style={{ textAlign: 'right' }}>{d.demo_units}</td>
                  <td style={{ textAlign: 'right' }}>{d.sale_units}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{d.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyHint icon={'\uD83C\uDFAB'} title="No donor units yet" body="Submit a game to begin tracking units." />
        )}
      </SectionCard>
    </div>
  )
}

// ── PAYMENTS TAB ──────────────────────────────────────────────

function InvoiceModal({ payment, getToken, onClose }) {
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInvoice = async () => {
      const t = getToken()
      if (!t) return
      try {
        const res = await fetch(`${API_BASE}/api/v1/publishers/dashboard/payments/${payment.id}/invoice`, {
          headers: { Authorization: `Bearer ${t}` },
        })
        if (res.ok) setInvoice(await res.json())
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    fetchInvoice()
  }, [payment.id, getToken])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 40, overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 720, background: 'var(--bg-secondary, #16213e)',
          borderRadius: 12, padding: 28, border: '1px solid var(--border, #2a3a5c)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 600 }}>
              Invoice {invoice?.payment?.invoice_number || payment.id?.slice(0, 8)}
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {invoice?.payment?.period_start && invoice?.payment?.period_end
                ? `Period: ${new Date(invoice.payment.period_start).toLocaleDateString()} \u2013 ${new Date(invoice.payment.period_end).toLocaleDateString()}`
                : ''}
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', fontSize: 22, cursor: 'pointer' }}>
            {'\u00d7'}
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading invoice...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, fontSize: 13 }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Bill To</div>
                <div>{invoice?.publisher?.company_name}</div>
                <div>{invoice?.publisher?.contact_name}</div>
                <div>{invoice?.publisher?.email}</div>
                <div>{invoice?.publisher?.mailing_address}</div>
                <div>
                  {invoice?.publisher?.city}{invoice?.publisher?.city ? ', ' : ''}
                  {invoice?.publisher?.state} {invoice?.publisher?.zip_code}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Total</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#81c784' }}>
                  ${(invoice?.payment?.amount ?? payment.amount ?? 0).toFixed(2)}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                  Status: {invoice?.payment?.status || payment.status}
                </div>
                {invoice?.payment?.paid_at && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Paid: {new Date(invoice.payment.paid_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            {invoice?.line_items?.length > 0 ? (
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card, #1e2a45)', color: 'var(--text-secondary)' }}>
                    <th style={{ textAlign: 'left', padding: 10 }}>Description</th>
                    <th style={{ textAlign: 'right', padding: 10 }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: 10 }}>Unit</th>
                    <th style={{ textAlign: 'right', padding: 10 }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((li, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border, #2a3a5c)' }}>
                      <td style={{ padding: 10 }}>{li.description}</td>
                      <td style={{ padding: 10, textAlign: 'right' }}>{li.quantity}</td>
                      <td style={{ padding: 10, textAlign: 'right' }}>${li.unit_amount.toFixed(2)}</td>
                      <td style={{ padding: 10, textAlign: 'right', fontWeight: 600 }}>${li.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 16, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
                No itemized line items for this payment.
              </div>
            )}

            {invoice?.payment?.notes && (
              <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-card, #1e2a45)', borderRadius: 8, fontSize: 13 }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Notes</div>
                {invoice.payment.notes}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BankInfoForm({ initial, getToken, onSaved }) {
  const [form, setForm] = useState({
    bank_name: initial?.bank_name || '',
    account_holder: initial?.account_holder || '',
    account_number_last4: initial?.account_number_last4 || '',
    routing_number_last4: initial?.routing_number_last4 || '',
    payment_method: initial?.payment_method || 'ach',
    paypal_email: initial?.paypal_email || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch(`${API_BASE}/api/v1/publishers/me/bank-info`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to save' }))
        throw new Error(err.detail || 'Failed to save')
      }
      setSaved(true)
      onSaved && onSaved(form)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', fontSize: 14,
    background: 'var(--bg-card, #1e2a45)', color: 'var(--text-primary, #e0e0e0)',
    border: '1px solid var(--border, #2a3a5c)', borderRadius: 8,
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block', marginBottom: 4, fontSize: 13,
    color: 'var(--text-secondary, #a0a0a0)', fontWeight: 500,
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Payment Method</label>
        <select style={inputStyle} value={form.payment_method} onChange={update('payment_method')}>
          <option value="ach">ACH Bank Transfer</option>
          <option value="check">Paper Check</option>
          <option value="paypal">PayPal</option>
          <option value="wire">Wire Transfer</option>
        </select>
      </div>

      {form.payment_method === 'paypal' ? (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>PayPal Email</label>
          <input type="email" style={inputStyle} value={form.paypal_email} onChange={update('paypal_email')} />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Bank Name</label>
              <input style={inputStyle} value={form.bank_name} onChange={update('bank_name')} />
            </div>
            <div>
              <label style={labelStyle}>Account Holder</label>
              <input style={inputStyle} value={form.account_holder} onChange={update('account_holder')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Account # (last 4)</label>
              <input style={inputStyle} maxLength={4} value={form.account_number_last4} onChange={update('account_number_last4')} placeholder="1234" />
            </div>
            <div>
              <label style={labelStyle}>Routing # (last 4)</label>
              <input style={inputStyle} maxLength={4} value={form.routing_number_last4} onChange={update('routing_number_last4')} placeholder="5678" />
            </div>
          </div>
        </>
      )}

      {error && (
        <div style={{ marginBottom: 12, padding: 10, background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.3)', borderRadius: 6, color: '#e94560', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px', fontSize: 14, fontWeight: 600,
            background: '#4caf50', color: '#fff', border: 'none', borderRadius: 8,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Bank Info'}
        </button>
        {saved && <span style={{ color: '#81c784', fontSize: 13 }}>Saved!</span>}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
        For your security, we only store the last 4 digits of bank account numbers.
        Full details are collected via secure handoff before your first payment.
      </div>
    </div>
  )
}

function PaymentsTab({ getToken }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState(null)

  const fetchData = useCallback(async () => {
    const t = getToken()
    if (!t) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/publishers/dashboard/payments`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [getToken])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading payments...</div>
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 600 }}>Payments</h2>

      {/* Earnings Summary */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard
          label="Balance Owed"
          value={`$${(data?.summary?.balance_owed ?? 0).toFixed(2)}`}
          accent="#ffd54f"
          sub="Pending payouts"
        />
        <StatCard
          label="Last 30 Days Paid"
          value={`$${(data?.summary?.last_30_days_paid ?? 0).toFixed(2)}`}
        />
        <StatCard
          label="YTD Earnings"
          value={`$${(data?.summary?.ytd_paid ?? 0).toFixed(2)}`}
        />
        <StatCard
          label="Lifetime Earnings"
          value={`$${(data?.summary?.paid_total ?? 0).toFixed(2)}`}
          accent="#81c784"
        />
      </div>

      {/* Next Payment */}
      {data?.next_payment && (
        <SectionCard title="Next Scheduled Payment">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#81c784' }}>
                ${data.next_payment.amount.toFixed(2)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Scheduled for {new Date(data.next_payment.scheduled_at).toLocaleDateString()}
              </div>
            </div>
            <span style={{
              padding: '6px 14px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              background: 'rgba(255,193,7,0.15)', color: '#ffd54f',
              textTransform: 'uppercase', letterSpacing: '0.4px',
            }}>
              {data.next_payment.status}
            </span>
          </div>
        </SectionCard>
      )}

      {/* Payment History */}
      <SectionCard title="Payment History">
        {data?.history?.length > 0 ? (
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card, #1e2a45)', color: 'var(--text-secondary)' }}>
                <th style={{ textAlign: 'left', padding: 10 }}>Invoice</th>
                <th style={{ textAlign: 'left', padding: 10 }}>Date</th>
                <th style={{ textAlign: 'left', padding: 10 }}>Method</th>
                <th style={{ textAlign: 'right', padding: 10 }}>Amount</th>
                <th style={{ textAlign: 'left', padding: 10 }}>Status</th>
                <th style={{ padding: 10 }} />
              </tr>
            </thead>
            <tbody>
              {data.history.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border, #2a3a5c)' }}>
                  <td style={{ padding: 10 }}>{p.invoice_number || p.id?.slice(0, 8)}</td>
                  <td style={{ padding: 10 }}>
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString()
                      : p.scheduled_at ? new Date(p.scheduled_at).toLocaleDateString()
                      : '\u2014'}
                  </td>
                  <td style={{ padding: 10, textTransform: 'uppercase', fontSize: 11 }}>{p.method}</td>
                  <td style={{ padding: 10, textAlign: 'right', fontWeight: 600 }}>
                    ${p.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: 10 }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: p.status === 'paid' ? 'rgba(76,175,80,0.18)'
                        : p.status === 'scheduled' ? 'rgba(33,150,243,0.15)'
                        : 'rgba(255,193,7,0.15)',
                      color: p.status === 'paid' ? '#81c784'
                        : p.status === 'scheduled' ? '#64b5f6' : '#ffd54f',
                      textTransform: 'uppercase',
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: 10, textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedPayment(p)}
                      style={{
                        padding: '4px 10px', fontSize: 11, background: 'transparent',
                        color: 'var(--text-primary)', border: '1px solid var(--border, #2a3a5c)',
                        borderRadius: 4, cursor: 'pointer',
                      }}
                    >
                      Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyHint
            icon={'\uD83D\uDCB3'}
            title="No payments yet"
            body="Your first net-60 remittance will show up here once games are sold."
          />
        )}
      </SectionCard>

      {/* Bank Info */}
      <SectionCard title="Payout Method">
        <BankInfoForm initial={data?.bank_info} getToken={getToken} onSaved={fetchData} />
      </SectionCard>

      {selectedPayment && (
        <InvoiceModal
          payment={selectedPayment}
          getToken={getToken}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </div>
  )
}

// ── MY GAMES TAB (unchanged from R2) ──────────────────────────

function GameDetailModal({ game, getToken, onClose, onRefresh }) {
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [error, setError] = useState('')

  const assets = game.assets || []
  const coverArt = assets.find(a => a.asset_type === 'cover_art')
  const rulebook = assets.find(a => a.asset_type === 'rulebook_pdf')
  const otherAssets = assets.filter(a => a.asset_type !== 'cover_art' && a.asset_type !== 'rulebook_pdf')

  const getPublicUrl = (storage_path) =>
    `https://uvfidazctqeazywlebkh.supabase.co/storage/v1/object/public/publisher-assets/${storage_path}`

  const submitReview = async (action) => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/publishers/games/${game.id}/guide-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ action, feedback: feedback || null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Review failed' }))
        throw new Error(err.detail || 'Review failed')
      }
      await onRefresh()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const isReadyForReview = game.guide_status === 'ready_for_review'

  const [hoursRemaining, setHoursRemaining] = useState(null)
  useEffect(() => {
    if (!game.guide_auto_approve_at) return
    const tick = () => {
      const target = new Date(game.guide_auto_approve_at).getTime()
      const now = Date.now()
      const diffH = Math.max(0, (target - now) / (1000 * 60 * 60))
      setHoursRemaining(diffH)
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [game.guide_auto_approve_at])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 40, overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 720, background: 'var(--bg-secondary, #16213e)',
          borderRadius: 12, padding: 28, border: '1px solid var(--border, #2a3a5c)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 600 }}>{game.title}</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <StatusBadge status={game.status} />
              <GuideStatusBadge status={game.guide_status} />
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', fontSize: 22, cursor: 'pointer' }}>
            {'\u00d7'}
          </button>
        </div>

        {coverArt && (
          <img src={getPublicUrl(coverArt.storage_path)} alt="cover"
            style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 8, marginBottom: 16, border: '1px solid var(--border, #2a3a5c)' }} />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: 13 }}>
          <div><span style={{ color: 'var(--text-secondary)' }}>Players: </span>{game.player_count_min}-{game.player_count_max}</div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Time: </span>{game.play_time_min}-{game.play_time_max} min</div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Complexity: </span>{game.complexity || '\u2014'}</div>
          <div><span style={{ color: 'var(--text-secondary)' }}>MSRP: </span>${((game.msrp_cents || 0) / 100).toFixed(2)}</div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Demo Units: </span>{game.demo_units || 0}</div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Sale Units: </span>{game.sale_units || 0}</div>
        </div>

        {game.description && (
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-card, #1e2a45)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary, #a0a0a0)' }}>
            {game.description}
          </div>
        )}

        {rulebook && (
          <div style={{ marginBottom: 16, fontSize: 13 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Rulebook: </span>
            {`\uD83D\uDCC4 ${rulebook.filename} (${(rulebook.file_size_bytes / 1024 / 1024).toFixed(2)} MB)`}
          </div>
        )}

        {otherAssets.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Assets ({otherAssets.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
              {otherAssets.map(a => (
                <img key={a.id} src={getPublicUrl(a.storage_path)} alt={a.filename}
                  style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border, #2a3a5c)' }} />
              ))}
            </div>
          </div>
        )}

        {isReadyForReview && (
          <div style={{
            marginTop: 24, padding: 20, borderRadius: 12,
            background: 'rgba(33,150,243,0.08)', border: '1px solid rgba(33,150,243,0.25)',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>
              Your Teaching Guide is Ready for Review
            </h3>
            {hoursRemaining !== null && (
              <div style={{ fontSize: 13, marginBottom: 12, color: 'var(--text-secondary)' }}>
                {`\u23f1 Auto-approves in ${Math.floor(hoursRemaining)}h ${Math.floor((hoursRemaining % 1) * 60)}m`}
              </div>
            )}
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Our content team has created an interactive teaching guide for your game.
              Please review and approve it, or request revisions.
            </div>

            {showRevisionForm && (
              <div style={{ marginBottom: 12 }}>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe the changes you'd like..."
                  style={{
                    width: '100%', minHeight: 80, padding: 12, fontSize: 13,
                    background: 'var(--bg-card, #1e2a45)', color: 'var(--text-primary)',
                    border: '1px solid var(--border, #2a3a5c)', borderRadius: 8,
                    fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {error && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.3)', borderRadius: 6, color: '#e94560', fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => submitReview('approved')}
                disabled={submitting}
                style={{
                  padding: '10px 20px', fontSize: 13, fontWeight: 600,
                  background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6,
                  cursor: submitting ? 'not-allowed' : 'pointer', flex: 1,
                }}
              >
                {'\u2705 Approve Guide'}
              </button>
              {!showRevisionForm ? (
                <button
                  onClick={() => setShowRevisionForm(true)}
                  style={{
                    padding: '10px 20px', fontSize: 13, fontWeight: 600,
                    background: '#ff9800', color: '#fff', border: 'none', borderRadius: 6,
                    cursor: 'pointer', flex: 1,
                  }}
                >
                  Request Changes
                </button>
              ) : (
                <button
                  onClick={() => submitReview('revision_requested')}
                  disabled={submitting || !feedback.trim()}
                  style={{
                    padding: '10px 20px', fontSize: 13, fontWeight: 600,
                    background: '#ff9800', color: '#fff', border: 'none', borderRadius: 6,
                    cursor: (submitting || !feedback.trim()) ? 'not-allowed' : 'pointer',
                    opacity: !feedback.trim() ? 0.5 : 1, flex: 1,
                  }}
                >
                  Submit Revision Request
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MyGamesTab({ getToken }) {
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState(null)

  const fetchGames = useCallback(async () => {
    if (!getToken()) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/publishers/games`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) setGames(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [getToken])

  useEffect(() => { fetchGames() }, [fetchGames])

  const openGame = async (game) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/publishers/games/${game.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) setSelectedGame(await res.json())
    } catch { /* ignore */ }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading games...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>My Games</h2>
        <button
          onClick={() => navigate('/publishers/games/new')}
          style={{
            padding: '10px 20px', fontSize: 14, fontWeight: 600,
            background: '#4caf50', color: '#fff', border: 'none', borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          + Add New Game
        </button>
      </div>

      {games.length === 0 ? (
        <div style={{
          padding: 60, textAlign: 'center',
          background: 'var(--bg-secondary, #16213e)', borderRadius: 12,
          border: '1px solid var(--border, #2a3a5c)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>{'\uD83C\uDFB2'}</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>No games yet</h3>
          <p style={{ color: 'var(--text-secondary, #a0a0a0)', fontSize: 14, marginBottom: 20 }}>
            Click "Add New Game" to start the onboarding wizard.
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-secondary, #16213e)', borderRadius: 12,
          border: '1px solid var(--border, #2a3a5c)', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-card, #1e2a45)' }}>
                {['Title', 'Status', 'Guide', 'Units', 'Submitted', 'Actions'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '12px 16px',
                    color: 'var(--text-secondary, #a0a0a0)', fontWeight: 500, fontSize: 12,
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {games.map(g => (
                <tr key={g.id} style={{ borderTop: '1px solid var(--border, #2a3a5c)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 500 }}>{g.title}</td>
                  <td style={{ padding: '14px 16px' }}><StatusBadge status={g.status} /></td>
                  <td style={{ padding: '14px 16px' }}><GuideStatusBadge status={g.guide_status} /></td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {g.demo_units || 0} demo + {g.sale_units || 0} sale
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {g.guide_submitted_at
                      ? new Date(g.guide_submitted_at).toLocaleDateString()
                      : 'In progress'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {g.status === 'onboarding' && (
                      <button
                        onClick={() => navigate(`/publishers/games/${g.id}/onboard`)}
                        style={{
                          padding: '6px 12px', fontSize: 12, fontWeight: 600,
                          background: '#4caf50', color: '#fff', border: 'none', borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        Continue Onboarding
                      </button>
                    )}
                    {g.guide_status === 'ready_for_review' && (
                      <button
                        onClick={() => openGame(g)}
                        style={{
                          padding: '6px 12px', fontSize: 12, fontWeight: 600,
                          background: '#2196f3', color: '#fff', border: 'none', borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        Review Guide
                      </button>
                    )}
                    {(g.status === 'in_review' || g.status === 'live') && g.guide_status !== 'ready_for_review' && (
                      <button
                        onClick={() => openGame(g)}
                        style={{
                          padding: '6px 12px', fontSize: 12,
                          background: 'transparent', color: 'var(--text-primary)',
                          border: '1px solid var(--border, #2a3a5c)', borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          getToken={getToken}
          onClose={() => setSelectedGame(null)}
          onRefresh={fetchGames}
        />
      )}
    </div>
  )
}

// ── SETTINGS TAB ──────────────────────────────────────────────

function SettingsTab({ publisher, getToken, logout: doLogout }) {
  const [form, setForm] = useState({
    phone: publisher.phone || '',
    website: publisher.website || '',
    mailing_address: publisher.mailing_address || '',
    city: publisher.city || '',
    state: publisher.state || '',
    zip_code: publisher.zip_code || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [weeklyReport, setWeeklyReport] = useState(true)
  const [realtimeNotifs, setRealtimeNotifs] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoMessage, setLogoMessage] = useState('')

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const token = getToken()
      await fetch(`${API_BASE}/api/v1/publishers/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoMessage('Logo must be an image file (PNG, JPG, SVG)')
      return
    }
    setLogoUploading(true)
    setLogoMessage('')
    try {
      // Logo upload reuses the publisher-assets bucket via a generic asset endpoint
      // (publishers can upload here once we wire up /me/logo on the backend)
      // For now, defer with a friendly message.
      setLogoMessage('Logo upload coming soon \u2014 contact support to upload your company logo for now.')
    } catch (err) {
      setLogoMessage('Upload failed: ' + err.message)
    } finally {
      setLogoUploading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', fontSize: 14,
    background: 'var(--bg-card, #1e2a45)', color: 'var(--text-primary, #e0e0e0)',
    border: '1px solid var(--border, #2a3a5c)', borderRadius: 8,
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block', marginBottom: 4, fontSize: 13,
    color: 'var(--text-secondary, #a0a0a0)', fontWeight: 500,
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
        Company Settings
      </h2>

      {/* Account Info */}
      <SectionCard title="Account Info">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
          <div>
            <span style={{ color: 'var(--text-secondary, #a0a0a0)' }}>Company: </span>
            <span style={{ color: 'var(--text-primary, #e0e0e0)' }}>{publisher.company_name}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary, #a0a0a0)' }}>Contact: </span>
            <span style={{ color: 'var(--text-primary, #e0e0e0)' }}>{publisher.contact_name}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary, #a0a0a0)' }}>Email: </span>
            <span style={{ color: 'var(--text-primary, #e0e0e0)' }}>{publisher.email}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary, #a0a0a0)' }}>Agreement: </span>
            <span style={{ color: '#81c784' }}>Accepted</span>
          </div>
          {publisher.created_at && (
            <div>
              <span style={{ color: 'var(--text-secondary, #a0a0a0)' }}>Member since: </span>
              <span style={{ color: 'var(--text-primary, #e0e0e0)' }}>
                {new Date(publisher.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Company Logo */}
      <SectionCard title="Company Logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 8, border: '1px dashed var(--border, #2a3a5c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-card, #1e2a45)', color: 'var(--text-secondary)',
            fontSize: 11, textAlign: 'center', overflow: 'hidden',
          }}>
            {publisher.logo_url ? (
              <img src={publisher.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : 'No logo'}
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={logoUploading}
              style={{ fontSize: 13, color: 'var(--text-secondary)' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
              PNG, JPG, or SVG. Recommended: 500x500px square.
            </div>
            {logoMessage && (
              <div style={{ fontSize: 12, color: '#ffb74d', marginTop: 8 }}>{logoMessage}</div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Editable contact details */}
      <SectionCard title="Contact Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.phone} onChange={update('phone')} />
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <input style={inputStyle} value={form.website} onChange={update('website')} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Mailing Address</label>
          <input style={inputStyle} value={form.mailing_address} onChange={update('mailing_address')} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginTop: 16 }}>
          <div>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={form.city} onChange={update('city')} />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <input style={inputStyle} value={form.state} onChange={update('state')} />
          </div>
          <div>
            <label style={labelStyle}>ZIP</label>
            <input style={inputStyle} value={form.zip_code} onChange={update('zip_code')} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px', fontSize: 14, fontWeight: 600,
              background: '#4caf50', color: '#fff', border: 'none', borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span style={{ color: '#81c784', fontSize: 13 }}>Saved!</span>}
        </div>
      </SectionCard>

      {/* Notification preferences */}
      <SectionCard title="Notification Preferences">
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0', borderBottom: '1px solid var(--border, #2a3a5c)',
          cursor: 'pointer',
        }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--text-primary, #e0e0e0)' }}>
              Weekly inventory & sales report
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #a0a0a0)' }}>
              Sent every Monday morning
            </div>
          </div>
          <div
            onClick={() => setWeeklyReport(!weeklyReport)}
            style={{
              width: 44, height: 24, borderRadius: 12, padding: 2, cursor: 'pointer',
              background: weeklyReport ? '#4caf50' : 'var(--border, #2a3a5c)',
              transition: 'background 0.2s', display: 'flex', alignItems: 'center',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 10, background: '#fff',
              transform: weeklyReport ? 'translateX(20px)' : 'translateX(0)',
              transition: 'transform 0.2s',
            }} />
          </div>
        </label>
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0', cursor: 'pointer',
        }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--text-primary, #e0e0e0)' }}>
              Real-time sale notifications
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #a0a0a0)' }}>
              Email when a unit sells at any venue
            </div>
          </div>
          <div
            onClick={() => setRealtimeNotifs(!realtimeNotifs)}
            style={{
              width: 44, height: 24, borderRadius: 12, padding: 2, cursor: 'pointer',
              background: realtimeNotifs ? '#4caf50' : 'var(--border, #2a3a5c)',
              transition: 'background 0.2s', display: 'flex', alignItems: 'center',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 10, background: '#fff',
              transform: realtimeNotifs ? 'translateX(20px)' : 'translateX(0)',
              transition: 'transform 0.2s',
            }} />
          </div>
        </label>
      </SectionCard>

      {/* Logout */}
      <button
        onClick={doLogout}
        style={{
          padding: '12px 24px', fontSize: 14, fontWeight: 600,
          background: 'transparent', color: 'var(--accent, #e94560)',
          border: '1px solid var(--accent, #e94560)', borderRadius: 8,
          cursor: 'pointer', width: '100%',
        }}
      >
        Log Out
      </button>
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────

export default function PublisherDashboard() {
  const { publisher, logout, getToken } = usePublisherAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('home')
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const handleLogout = useCallback(() => {
    logout()
    window.location.href = '/publishers/login'
  }, [logout])

  // Fetch summary for Home tab (and Home stat card on first load)
  const fetchSummary = useCallback(async () => {
    const t = getToken && getToken()
    if (!t) return
    setSummaryLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/publishers/dashboard/summary`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) setSummary(await res.json())
    } catch { /* ignore */ }
    finally { setSummaryLoading(false) }
  }, [getToken])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  if (!publisher) return null

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary, #1a1a2e)',
      color: 'var(--text-primary, #e0e0e0)',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', background: 'var(--bg-secondary, #16213e)',
        borderBottom: '1px solid var(--border, #2a3a5c)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>GameMaster Guide</span>
          <span style={{
            padding: '2px 8px', background: 'rgba(233,69,96,0.15)',
            color: 'var(--accent, #e94560)', borderRadius: 4,
            fontSize: 10, fontWeight: 600, letterSpacing: '0.5px',
          }}>
            PUBLISHER PORTAL
          </span>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary, #a0a0a0)' }}>
          {publisher.company_name}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', overflowX: 'auto', gap: 0,
        background: 'var(--bg-secondary, #16213e)',
        borderBottom: '1px solid var(--border, #2a3a5c)',
        padding: '0 24px',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 20px', fontSize: 14, fontWeight: 500,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? 'var(--text-primary, #e0e0e0)' : 'var(--text-secondary, #a0a0a0)',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent, #e94560)' : '2px solid transparent',
              whiteSpace: 'nowrap', transition: 'color 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        {activeTab === 'home' && (
          <HomeTab
            publisher={publisher}
            summary={summary}
            loading={summaryLoading}
            onAddGame={() => navigate('/publishers/games/new')}
          />
        )}
        {activeTab === 'games' && <MyGamesTab getToken={getToken} />}
        {activeTab === 'analytics' && <AnalyticsTab getToken={getToken} />}
        {activeTab === 'inventory' && <InventoryTab getToken={getToken} />}
        {activeTab === 'payments' && <PaymentsTab getToken={getToken} />}
        {activeTab === 'settings' && (
          <SettingsTab publisher={publisher} getToken={getToken} logout={handleLogout} />
        )}
      </div>
    </div>
  )
}
