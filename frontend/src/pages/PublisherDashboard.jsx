import { useState, useCallback, useEffect } from 'react'
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

function StatCard({ label, value }) {
  return (
    <div style={{
      background: 'var(--bg-card, #1e2a45)', borderRadius: 10,
      padding: '16px 20px', border: '1px solid var(--border, #2a3a5c)',
      flex: '1 1 140px', minWidth: 140,
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary, #a0a0a0)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary, #e0e0e0)' }}>
        {value}
      </div>
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

function HomeTab({ publisher, gamesCount, hasAnyGame, onAddGame }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
        Welcome, {publisher.company_name}!
      </h2>

      {/* Quick Stats */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <StatCard label="Games on Platform" value={String(gamesCount)} />
        <StatCard label="Total Play Sessions" value="0" />
        <StatCard label="Units Sold This Month" value="0" />
        <StatCard label="Next Payment" value="--" />
      </div>

      {/* Getting Started */}
      <div style={{
        background: 'var(--bg-secondary, #16213e)', borderRadius: 12, padding: 24,
        border: '1px solid var(--border, #2a3a5c)', marginBottom: 24,
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
          Getting Started
        </h3>
        <ChecklistItem done text="Account created" />
        <ChecklistItem done={hasAnyGame} text="Add your first game" subtext={hasAnyGame ? undefined : 'Click below to start the onboarding wizard'} />
        <ChecklistItem text="Upload rulebook and assets" />
        <ChecklistItem text="Review and approve your teaching guide" />
        <ChecklistItem text="Game goes live at venues" />
      </div>

      {!hasAnyGame && (
        <button
          onClick={onAddGame}
          style={{
            padding: '14px 28px', fontSize: 15, fontWeight: 600,
            background: '#4caf50', color: '#fff', border: 'none', borderRadius: 8,
            cursor: 'pointer', width: '100%',
          }}
        >
          {'\uD83C\uDFAE Add Your First Game'}
        </button>
      )}
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
    return <span style={{ fontSize: 11, color: 'var(--text-secondary, #a0a0a0)' }}>\u2014</span>
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

  // 48-hour countdown
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

        {/* Guide Review Section */}
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

function PlaceholderTab({ title, description }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>
        {title === 'My Games' ? '\uD83C\uDFB2' :
         title === 'Analytics' ? '\uD83D\uDCCA' :
         title === 'Inventory' ? '\uD83D\uDCE6' : '\uD83D\uDCB3'}
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--text-primary, #e0e0e0)' }}>
        {title}
      </h2>
      <p style={{ color: 'var(--text-secondary, #a0a0a0)', fontSize: 14, maxWidth: 400, margin: '0 auto' }}>
        {description}
      </p>
    </div>
  )
}

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

      {/* Read-only fields */}
      <div style={{
        background: 'var(--bg-secondary, #16213e)', borderRadius: 12, padding: 24,
        border: '1px solid var(--border, #2a3a5c)', marginBottom: 24,
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
          Account Info
        </h3>
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
        </div>
      </div>

      {/* Editable fields */}
      <div style={{
        background: 'var(--bg-secondary, #16213e)', borderRadius: 12, padding: 24,
        border: '1px solid var(--border, #2a3a5c)', marginBottom: 24,
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
          Contact Details
        </h3>
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
      </div>

      {/* Notification preferences */}
      <div style={{
        background: 'var(--bg-secondary, #16213e)', borderRadius: 12, padding: 24,
        border: '1px solid var(--border, #2a3a5c)', marginBottom: 24,
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
          Notification Preferences
        </h3>
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
      </div>

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

export default function PublisherDashboard() {
  const { publisher, logout, getToken } = usePublisherAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('home')
  const [gamesCount, setGamesCount] = useState(0)

  const handleLogout = useCallback(() => {
    logout()
    window.location.href = '/publishers/login'
  }, [logout])

  // Lightweight games count for Home tab stats and "Add Your First Game" button
  useEffect(() => {
    let cancelled = false
    const t = getToken && getToken()
    if (!t) return
    fetch(`${API_BASE}/api/v1/publishers/games`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (!cancelled) setGamesCount(Array.isArray(data) ? data.length : 0) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [getToken])

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
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {activeTab === 'home' && (
          <HomeTab
            publisher={publisher}
            gamesCount={gamesCount}
            hasAnyGame={gamesCount > 0}
            onAddGame={() => navigate('/publishers/games/new')}
          />
        )}
        {activeTab === 'games' && <MyGamesTab getToken={getToken} />}
        {activeTab === 'analytics' && (
          <PlaceholderTab
            title="Analytics"
            description="Coming soon \u2014 play session data, sell-through rates, and venue performance metrics."
          />
        )}
        {activeTab === 'inventory' && (
          <PlaceholderTab
            title="Inventory"
            description="Coming soon \u2014 stock levels, restock alerts, and movement history across all venues."
          />
        )}
        {activeTab === 'payments' && (
          <PlaceholderTab
            title="Payments"
            description="Coming soon \u2014 payment history, invoices, and bank details for net-60 remittances."
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab publisher={publisher} getToken={getToken} logout={handleLogout} />
        )}
      </div>
    </div>
  )
}
