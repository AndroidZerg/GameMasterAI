import { useState, useEffect, useCallback } from 'react'
import { API_BASE } from '../../services/api'

function StatusBadge({ status }) {
  const colors = {
    active: { bg: 'rgba(76,175,80,0.15)', color: '#81c784' },
    pending: { bg: 'rgba(255,193,7,0.15)', color: '#ffd54f' },
    suspended: { bg: 'rgba(233,69,96,0.15)', color: '#e94560' },
    terminated: { bg: 'rgba(120,120,120,0.15)', color: '#999' },
  }
  const c = colors[status] || colors.pending
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color, textTransform: 'uppercase',
    }}>
      {status}
    </span>
  )
}

function InviteGenerator({ token }) {
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [notes, setNotes] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/publisher-invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email, company_name: companyName, notes }),
      })
      if (res.ok) {
        const data = await res.json()
        setGeneratedUrl(data.invite_url)
      }
    } catch { /* ignore */ }
    finally { setGenerating(false) }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputStyle = {
    padding: '8px 12px', fontSize: 13, background: 'var(--bg-card, #1e2a45)',
    color: 'var(--text-primary, #e0e0e0)', border: '1px solid var(--border, #2a3a5c)',
    borderRadius: 6, outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{
      background: 'var(--bg-secondary, #16213e)', borderRadius: 10, padding: 20,
      border: '1px solid var(--border, #2a3a5c)', marginBottom: 24,
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
        Generate Publisher Invite Link
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <input style={inputStyle} placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={inputStyle} placeholder="Company name (optional)" value={companyName} onChange={e => setCompanyName(e.target.value)} />
        <input style={inputStyle} placeholder="Notes (e.g. Met at DTW)" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <button
        onClick={handleGenerate}
        disabled={generating}
        style={{
          padding: '8px 20px', fontSize: 13, fontWeight: 600,
          background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6,
          cursor: generating ? 'not-allowed' : 'pointer',
        }}
      >
        {generating ? 'Generating...' : 'Generate Invite Link'}
      </button>

      {generatedUrl && (
        <div style={{
          marginTop: 12, padding: '10px 14px', background: 'var(--bg-card, #1e2a45)',
          borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10,
          border: '1px solid var(--border, #2a3a5c)',
        }}>
          <code style={{ fontSize: 12, flex: 1, color: '#81c784', wordBreak: 'break-all' }}>
            {generatedUrl}
          </code>
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              background: copied ? '#4caf50' : 'var(--border, #2a3a5c)', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}

function InvitesList({ invites }) {
  if (!invites.length) return null
  return (
    <div style={{
      background: 'var(--bg-secondary, #16213e)', borderRadius: 10, padding: 20,
      border: '1px solid var(--border, #2a3a5c)', marginBottom: 24,
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
        Recent Invites
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border, #2a3a5c)' }}>
              {['Email', 'Company', 'Status', 'Notes', 'Created'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-secondary, #a0a0a0)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invites.map((inv, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border, #2a3a5c)' }}>
                <td style={{ padding: '8px 10px', color: 'var(--text-primary, #e0e0e0)' }}>{inv.email || '--'}</td>
                <td style={{ padding: '8px 10px', color: 'var(--text-primary, #e0e0e0)' }}>{inv.company_name || '--'}</td>
                <td style={{ padding: '8px 10px' }}>
                  <StatusBadge status={inv.used_at ? 'active' : 'pending'} />
                </td>
                <td style={{ padding: '8px 10px', color: 'var(--text-secondary, #a0a0a0)' }}>{inv.notes || '--'}</td>
                <td style={{ padding: '8px 10px', color: 'var(--text-secondary, #a0a0a0)' }}>
                  {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GameStatusBadge({ status }) {
  const map = {
    onboarding: { bg: 'rgba(120,120,120,0.18)', color: '#bbb' },
    in_review: { bg: 'rgba(255,193,7,0.15)', color: '#ffd54f' },
    live: { bg: 'rgba(76,175,80,0.18)', color: '#81c784' },
    inactive: { bg: 'rgba(233,69,96,0.15)', color: '#e94560' },
  }
  const c = map[status] || map.onboarding
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
      background: c.bg, color: c.color, textTransform: 'uppercase',
    }}>
      {(status || '').replace('_', ' ')}
    </span>
  )
}

function GuideStatusPill({ status }) {
  if (!status || status === 'not_started') {
    return <span style={{ fontSize: 11, color: 'var(--text-secondary, #a0a0a0)' }}>not started</span>
  }
  const map = {
    in_progress: { bg: 'rgba(33,150,243,0.15)', color: '#64b5f6', label: 'building' },
    ready_for_review: { bg: 'rgba(33,150,243,0.25)', color: '#64b5f6', label: 'ready for review' },
    approved: { bg: 'rgba(76,175,80,0.18)', color: '#81c784', label: 'approved' },
    revision_requested: { bg: 'rgba(255,152,0,0.15)', color: '#ffb74d', label: 'revision' },
  }
  const c = map[status] || { bg: 'transparent', color: '#999', label: status }
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
      background: c.bg, color: c.color, textTransform: 'uppercase',
    }}>
      {c.label}
    </span>
  )
}

function GameAssetsModal({ gameId, gameTitle, token, onClose }) {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/admin/publishers/games/${gameId}/assets`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setAssets(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [gameId, token])

  const rulebook = assets.find(a => a.asset_type === 'rulebook_pdf')
  const coverArt = assets.find(a => a.asset_type === 'cover_art')
  const others = assets.filter(a => a.asset_type !== 'rulebook_pdf' && a.asset_type !== 'cover_art')

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: 40, overflowY: 'auto',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 720, background: 'var(--bg-secondary, #16213e)',
        borderRadius: 12, padding: 24, border: '1px solid var(--border, #2a3a5c)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{`${gameTitle} \u2014 Assets`}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 22, cursor: 'pointer' }}>{'\u00d7'}</button>
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading...</div> : (
          <div>
            {rulebook && (
              <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-card, #1e2a45)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Rulebook</div>
                <a href={rulebook.download_url} target="_blank" rel="noopener noreferrer"
                   style={{ color: '#64b5f6', fontSize: 14, textDecoration: 'none' }}>
                  {`\uD83D\uDCC4 ${rulebook.filename} (${(rulebook.file_size_bytes / 1024 / 1024).toFixed(2)} MB)`}
                </a>
              </div>
            )}

            {coverArt && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Cover Art</div>
                <a href={coverArt.download_url} target="_blank" rel="noopener noreferrer">
                  <img src={coverArt.download_url} alt="cover"
                    style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border, #2a3a5c)' }} />
                </a>
              </div>
            )}

            {others.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  Other Assets ({others.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                  {others.map(a => (
                    <a key={a.id} href={a.download_url} target="_blank" rel="noopener noreferrer"
                       style={{ display: 'block', textDecoration: 'none' }}>
                      <img src={a.download_url} alt={a.filename}
                        style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border, #2a3a5c)' }} />
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.filename}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {assets.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                No assets uploaded yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PublisherGamesPanel({ publisherId, token, onChange }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [viewing, setViewing] = useState(null)

  const fetchGames = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/publishers/${publisherId}/games`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setGames(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [publisherId, token])

  useEffect(() => { fetchGames() }, [fetchGames])

  const updateGame = async (gameId, body) => {
    setUpdating(gameId)
    try {
      await fetch(`${API_BASE}/api/v1/admin/publishers/games/${gameId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      await fetchGames()
      if (onChange) onChange()
    } catch { /* ignore */ }
    finally { setUpdating(null) }
  }

  if (loading) return <div style={{ padding: 12, color: 'var(--text-secondary)', fontSize: 12 }}>Loading games...</div>

  if (games.length === 0) {
    return <div style={{ padding: 12, color: 'var(--text-secondary)', fontSize: 12 }}>No games submitted yet.</div>
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Submitted Games ({games.length})
      </div>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border, #2a3a5c)' }}>
            {['Title', 'Status', 'Guide', 'Assets', 'Submitted', 'Actions'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-secondary)', fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {games.map(g => (
            <tr key={g.id} style={{ borderBottom: '1px solid var(--border, #2a3a5c)' }}>
              <td style={{ padding: '8px' }}>{g.title}</td>
              <td style={{ padding: '8px' }}><GameStatusBadge status={g.status} /></td>
              <td style={{ padding: '8px' }}><GuideStatusPill status={g.guide_status} /></td>
              <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{g.asset_count || 0}</td>
              <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                {g.guide_submitted_at ? new Date(g.guide_submitted_at).toLocaleDateString() : '\u2014'}
              </td>
              <td style={{ padding: '8px' }}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setViewing({ id: g.id, title: g.title })}
                    style={{ padding: '4px 8px', fontSize: 11, background: 'var(--bg-card, #1e2a45)', color: 'var(--text-primary)', border: '1px solid var(--border, #2a3a5c)', borderRadius: 4, cursor: 'pointer' }}
                  >
                    View Assets
                  </button>
                  {g.guide_status !== 'ready_for_review' && g.guide_status !== 'approved' && g.status === 'in_review' && (
                    <button
                      disabled={updating === g.id}
                      onClick={() => updateGame(g.id, { guide_status: 'ready_for_review' })}
                      style={{ padding: '4px 8px', fontSize: 11, background: '#2196f3', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                      Mark Guide Ready
                    </button>
                  )}
                  {g.status !== 'live' && (
                    <button
                      disabled={updating === g.id}
                      onClick={() => updateGame(g.id, { status: 'live' })}
                      style={{ padding: '4px 8px', fontSize: 11, background: '#4caf50', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                      Set Live
                    </button>
                  )}
                  {g.status !== 'inactive' && (
                    <button
                      disabled={updating === g.id}
                      onClick={() => updateGame(g.id, { status: 'inactive' })}
                      style={{ padding: '4px 8px', fontSize: 11, background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {viewing && (
        <GameAssetsModal
          gameId={viewing.id}
          gameTitle={viewing.title}
          token={token}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}

function PublisherRow({ pub, token, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)

  const handleStatusChange = async (newStatus) => {
    setUpdating(true)
    try {
      await fetch(`${API_BASE}/api/v1/admin/publishers/${pub.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      })
      onRefresh()
    } catch { /* ignore */ }
    finally { setUpdating(false) }
  }

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        style={{ borderBottom: '1px solid var(--border, #2a3a5c)', cursor: 'pointer' }}
      >
        <td style={{ padding: '10px' }}>{pub.company_name}</td>
        <td style={{ padding: '10px' }}>{pub.contact_name}</td>
        <td style={{ padding: '10px' }}>{pub.email}</td>
        <td style={{ padding: '10px' }}><StatusBadge status={pub.status} /></td>
        <td style={{ padding: '10px' }}>{pub.games_count || 0} / {pub.games_live || 0}</td>
        <td style={{ padding: '10px', color: 'var(--text-secondary, #a0a0a0)' }}>
          {pub.created_at ? new Date(pub.created_at).toLocaleDateString() : '--'}
        </td>
        <td style={{ padding: '10px', color: 'var(--text-secondary, #a0a0a0)' }}>
          {pub.last_login_at ? new Date(pub.last_login_at).toLocaleDateString() : '--'}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} style={{ padding: '12px 20px', background: 'var(--bg-card, #1e2a45)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 13, marginBottom: 12 }}>
              <div><span style={{ color: 'var(--text-secondary)' }}>Phone: </span>{pub.phone || '--'}</div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Website: </span>{pub.website || '--'}</div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Address: </span>
                {[pub.mailing_address, pub.city, pub.state, pub.zip_code].filter(Boolean).join(', ') || '--'}
              </div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Agreement: </span>
                {pub.agreement_accepted_at ? new Date(pub.agreement_accepted_at).toLocaleString() : '--'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {pub.status !== 'active' && (
                <button disabled={updating} onClick={() => handleStatusChange('active')}
                  style={{ padding: '6px 14px', fontSize: 12, background: '#4caf50', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                  Activate
                </button>
              )}
              {pub.status !== 'suspended' && (
                <button disabled={updating} onClick={() => handleStatusChange('suspended')}
                  style={{ padding: '6px 14px', fontSize: 12, background: '#ff9800', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                  Suspend
                </button>
              )}
              {pub.status !== 'terminated' && (
                <button disabled={updating} onClick={() => handleStatusChange('terminated')}
                  style={{ padding: '6px 14px', fontSize: 12, background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                  Terminate
                </button>
              )}
            </div>

            <PublisherGamesPanel publisherId={pub.id} token={token} onChange={onRefresh} />
          </td>
        </tr>
      )}
    </>
  )
}

export default function PublishersSection({ token }) {
  const [publishers, setPublishers] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [pubRes, invRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/admin/publishers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/v1/admin/publisher-invites`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (pubRes.ok) setPublishers(await pubRes.json())
      if (invRes.ok) setInvites(await invRes.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading publishers...</div>
  }

  return (
    <div>
      <InviteGenerator token={token} />
      <InvitesList invites={invites} />

      <div style={{
        background: 'var(--bg-secondary, #16213e)', borderRadius: 10, padding: 20,
        border: '1px solid var(--border, #2a3a5c)',
      }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
          Publishers ({publishers.length})
        </h3>
        {publishers.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary, #a0a0a0)', fontSize: 14 }}>
            No publishers yet. Generate an invite link to get started.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: 'var(--text-primary, #e0e0e0)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border, #2a3a5c)' }}>
                  {['Company', 'Contact', 'Email', 'Status', 'Games (total/live)', 'Signed Up', 'Last Login'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-secondary, #a0a0a0)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {publishers.map(pub => (
                  <PublisherRow key={pub.id} pub={pub} token={token} onRefresh={fetchData} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
