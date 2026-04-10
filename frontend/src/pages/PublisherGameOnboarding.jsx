import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePublisherAuth } from '../contexts/PublisherAuthContext'

const API_BASE = import.meta.env.VITE_API_URL || 'https://gmai-backend.onrender.com'

const COMPLEXITY_OPTIONS = [
  { value: 'party', label: 'Party' },
  { value: 'gateway', label: 'Gateway' },
  { value: 'midweight', label: 'Midweight' },
  { value: 'heavy', label: 'Heavy' },
]

const CATEGORY_OPTIONS = [
  'strategy', 'card-game', 'dice', 'cooperative', 'competitive', 'family',
  'party', 'abstract', 'thematic', 'engine-building', 'area-control',
  'worker-placement', 'deck-building', 'set-collection', 'drafting',
  'social-deduction', 'puzzle', 'adventure', 'economic', 'war',
]

const ASSET_TYPE_OPTIONS = [
  { value: 'component_render', label: 'Component Render' },
  { value: 'setup_photo', label: 'Setup Photo' },
  { value: 'rule_diagram', label: 'Rule Diagram' },
  { value: 'promo_image', label: 'Promotional Image' },
  { value: 'other', label: 'Other' },
]

const STEPS = [
  { num: 1, label: 'Game Info' },
  { num: 2, label: 'Rulebook' },
  { num: 3, label: 'Assets' },
  { num: 4, label: 'Inventory' },
  { num: 5, label: 'Review' },
]

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
const cardStyle = {
  background: 'var(--bg-secondary, #16213e)', borderRadius: 12, padding: 24,
  border: '1px solid var(--border, #2a3a5c)', marginBottom: 24,
}
const primaryBtn = {
  padding: '12px 28px', fontSize: 15, fontWeight: 600,
  background: '#4caf50', color: '#fff', border: 'none', borderRadius: 8,
  cursor: 'pointer',
}
const secondaryBtn = {
  padding: '12px 24px', fontSize: 14, fontWeight: 500,
  background: 'transparent', color: 'var(--text-secondary, #a0a0a0)',
  border: '1px solid var(--border, #2a3a5c)', borderRadius: 8,
  cursor: 'pointer',
}
const infoBoxStyle = {
  background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.25)',
  borderRadius: 8, padding: 16, marginBottom: 20, fontSize: 13,
  color: 'var(--text-primary, #e0e0e0)', lineHeight: 1.6,
}

function StepIndicator({ currentStep }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
      {STEPS.map((step, i) => (
        <div key={step.num} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: step.num <= currentStep ? '#4caf50' : 'var(--border, #2a3a5c)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600,
            }}>
              {step.num < currentStep ? '\u2713' : step.num}
            </div>
            <div style={{
              fontSize: 11, marginTop: 6, color: step.num === currentStep ? 'var(--text-primary, #e0e0e0)' : 'var(--text-secondary, #a0a0a0)',
              fontWeight: step.num === currentStep ? 600 : 400,
            }}>
              {step.label}
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 2, margin: '0 4px',
              background: step.num < currentStep ? '#4caf50' : 'var(--border, #2a3a5c)',
              marginBottom: 16,
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Step 1: Game Info ───────────────────────────────────────────
function Step1GameInfo({ form, setForm, onContinue, saving }) {
  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  const updateNum = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value === '' ? '' : Number(e.target.value) }))

  const toggleCategory = (cat) => {
    setForm(prev => {
      const cats = prev.categories || []
      return { ...prev, categories: cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat] }
    })
  }

  const canContinue = form.title && form.title.trim().length > 0

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Game Information</h2>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-secondary, #a0a0a0)' }}>
        Tell us about your game. You can update this later.
      </p>

      <div style={cardStyle}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Game Title *</label>
          <input style={inputStyle} value={form.title || ''} onChange={update('title')} placeholder="e.g. Hasty Baker" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Description</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, fontFamily: 'inherit', resize: 'vertical' }}
            value={form.description || ''} onChange={update('description')}
            placeholder="A fast-paced card game about baking recipes..."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Min Players</label>
            <input style={inputStyle} type="number" min="1" value={form.player_count_min ?? ''} onChange={updateNum('player_count_min')} />
          </div>
          <div>
            <label style={labelStyle}>Max Players</label>
            <input style={inputStyle} type="number" min="1" value={form.player_count_max ?? ''} onChange={updateNum('player_count_max')} />
          </div>
          <div>
            <label style={labelStyle}>Recommended</label>
            <input style={inputStyle} type="number" min="1" value={form.player_count_recommended ?? ''} onChange={updateNum('player_count_recommended')} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Min Play Time (min)</label>
            <input style={inputStyle} type="number" min="1" value={form.play_time_min ?? ''} onChange={updateNum('play_time_min')} />
          </div>
          <div>
            <label style={labelStyle}>Max Play Time (min)</label>
            <input style={inputStyle} type="number" min="1" value={form.play_time_max ?? ''} onChange={updateNum('play_time_max')} />
          </div>
          <div>
            <label style={labelStyle}>Complexity</label>
            <select style={inputStyle} value={form.complexity || ''} onChange={update('complexity')}>
              <option value="">--</option>
              {COMPLEXITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Categories (select all that apply)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {CATEGORY_OPTIONS.map(cat => {
              const selected = (form.categories || []).includes(cat)
              return (
                <button
                  key={cat} type="button" onClick={() => toggleCategory(cat)}
                  style={{
                    padding: '6px 12px', fontSize: 12, borderRadius: 16,
                    background: selected ? '#4caf50' : 'var(--bg-card, #1e2a45)',
                    color: selected ? '#fff' : 'var(--text-secondary, #a0a0a0)',
                    border: `1px solid ${selected ? '#4caf50' : 'var(--border, #2a3a5c)'}`,
                    cursor: 'pointer', textTransform: 'capitalize',
                  }}
                >
                  {cat.replace(/-/g, ' ')}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>MSRP ($)</label>
            <input style={inputStyle} type="number" step="0.01" min="0"
              value={form.msrp_dollars ?? ''}
              onChange={(e) => setForm(prev => ({ ...prev, msrp_dollars: e.target.value === '' ? '' : Number(e.target.value) }))} />
          </div>
          <div>
            <label style={labelStyle}>Wholesale ($) <span style={{ color: 'var(--text-secondary)' }}>(defaults to 50% of MSRP)</span></label>
            <input style={inputStyle} type="number" step="0.01" min="0"
              value={form.wholesale_dollars ?? ''}
              onChange={(e) => setForm(prev => ({ ...prev, wholesale_dollars: e.target.value === '' ? '' : Number(e.target.value) }))} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>UPC / Barcode</label>
            <input style={inputStyle} value={form.upc || ''} onChange={update('upc')} />
          </div>
          <div>
            <label style={labelStyle}>BoardGameGeek URL</label>
            <input style={inputStyle} value={form.bgg_url || ''} onChange={update('bgg_url')} placeholder="https://boardgamegeek.com/boardgame/..." />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onContinue} disabled={!canContinue || saving}
          style={{ ...primaryBtn, opacity: (!canContinue || saving) ? 0.5 : 1, cursor: (!canContinue || saving) ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving...' : 'Save & Continue \u2192'}
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Rulebook ────────────────────────────────────────────
function Step2Rulebook({ gameId, getToken, assets, refreshAssets, onContinue, onBack }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const rulebook = assets.find(a => a.asset_type === 'rulebook_pdf')

  const handleFile = async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') { setError('Must be a PDF file'); return }
    if (file.size > 50 * 1024 * 1024) { setError('File exceeds 50MB limit'); return }
    setError('')
    setUploading(true)
    setProgress(10)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API_BASE}/api/v1/publishers/games/${gameId}/upload-rulebook`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      })
      setProgress(80)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
        throw new Error(err.detail || 'Upload failed')
      }
      setProgress(100)
      await refreshAssets()
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 600)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Upload Your Official Rulebook</h2>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary, #a0a0a0)' }}>
        Step 2 of 5
      </p>

      <div style={infoBoxStyle}>
        Upload the most current edition of your official rulebook as a PDF.
        Our content team uses this to create your game's interactive teaching guide.<br /><br />
        <strong>Your guide will be ready for review within 7 days.</strong><br /><br />
        {'Accepted format: PDF only \u00b7 Maximum file size: 50MB'}
      </div>

      <div style={cardStyle}>
        {rulebook ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: 16,
            background: 'rgba(76,175,80,0.1)', borderRadius: 8,
            border: '1px solid rgba(76,175,80,0.3)',
          }}>
            <div style={{ fontSize: 32 }}>{'\u2705'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
                {rulebook.filename}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #a0a0a0)', marginTop: 2 }}>
                {`${(rulebook.file_size_bytes / 1024 / 1024).toFixed(2)} MB \u00b7 Uploaded`}
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ ...secondaryBtn, padding: '8px 16px', fontSize: 13 }}
            >
              Replace
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border, #2a3a5c)', borderRadius: 12,
              padding: 48, textAlign: 'center', cursor: 'pointer',
              background: 'var(--bg-card, #1e2a45)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>{'\uD83D\uDCC4'}</div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
              Drag & drop your rulebook PDF here
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary, #a0a0a0)' }}>
              or click to browse files
            </div>
          </div>
        )}

        <input
          ref={fileInputRef} type="file" accept="application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {uploading && (
          <div style={{ marginTop: 16 }}>
            <div style={{ height: 6, background: 'var(--bg-card, #1e2a45)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${progress}%`, height: '100%', background: '#4caf50',
                transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, textAlign: 'center' }}>
              Uploading...
            </div>
          </div>
        )}

        {error && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.3)',
            borderRadius: 8, color: '#e94560', fontSize: 13,
          }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={secondaryBtn}>{'\u2190 Back'}</button>
        <button onClick={onContinue} disabled={!rulebook}
          style={{ ...primaryBtn, opacity: !rulebook ? 0.5 : 1, cursor: !rulebook ? 'not-allowed' : 'pointer' }}>
          {'Save & Continue \u2192'}
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Assets ──────────────────────────────────────────────
function Step3Assets({ gameId, getToken, assets, refreshAssets, onContinue, onBack }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [assetType, setAssetType] = useState('component_render')
  const [description, setDescription] = useState('')
  const coverInputRef = useRef(null)
  const additionalInputRef = useRef(null)

  const coverArt = assets.find(a => a.asset_type === 'cover_art')
  const additionalAssets = assets.filter(a => a.asset_type !== 'cover_art' && a.asset_type !== 'rulebook_pdf')

  const uploadFiles = async (fileList, type) => {
    if (!fileList || fileList.length === 0) return
    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(fileList).forEach(f => fd.append('files', f))
      fd.append('asset_type', type)
      if (description && type !== 'cover_art') fd.append('description', description)

      const res = await fetch(`${API_BASE}/api/v1/publishers/games/${gameId}/upload-assets`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
        throw new Error(err.detail || 'Upload failed')
      }
      await refreshAssets()
      setDescription('')
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const deleteAsset = async (assetId) => {
    try {
      await fetch(`${API_BASE}/api/v1/publishers/games/${gameId}/assets/${assetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      await refreshAssets()
    } catch { /* ignore */ }
  }

  const getPublicUrl = (storage_path) => {
    return `https://uvfidazctqeazywlebkh.supabase.co/storage/v1/object/public/publisher-assets/${storage_path}`
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Upload Game Assets</h2>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary, #a0a0a0)' }}>
        Step 3 of 5
      </p>

      <div style={infoBoxStyle}>
        High-quality assets make your game shine in the app.
        Original production renders (PNG, 300+ DPI) produce the best results.<br /><br />
        <strong>Required:</strong><br />
        {'\u2022 Box art / cover image \u2014 minimum 1000x1000px'}<br /><br />
        <strong>Recommended:</strong><br />
        {'\u2022 Component renders \u2014 board, cards, tokens, player boards'}<br />
        {'\u2022 Setup photo \u2014 top-down view of the game fully set up'}<br />
        {'\u2022 Rule diagrams \u2014 scoring examples, movement illustrations'}<br /><br />
        <strong>Tips:</strong> Digital renders from your production files look significantly
        better than phone photos. PNG preferred. Maximum 20MB per file.
      </div>

      {/* Cover Art */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Box Art / Cover Image *</h3>
        {coverArt ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src={getPublicUrl(coverArt.storage_path)} alt="cover"
              style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border, #2a3a5c)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{coverArt.filename}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #a0a0a0)', marginTop: 2 }}>
                {(coverArt.file_size_bytes / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
            <button onClick={() => coverInputRef.current?.click()}
              style={{ ...secondaryBtn, padding: '8px 16px', fontSize: 13 }}>Replace</button>
            <button onClick={() => deleteAsset(coverArt.id)}
              style={{ padding: '8px 14px', fontSize: 13, background: 'rgba(233,69,96,0.15)', color: '#e94560', border: '1px solid rgba(233,69,96,0.3)', borderRadius: 6, cursor: 'pointer' }}>
              Delete
            </button>
          </div>
        ) : (
          <div onClick={() => coverInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border, #2a3a5c)', borderRadius: 12,
              padding: 32, textAlign: 'center', cursor: 'pointer',
              background: 'var(--bg-card, #1e2a45)',
            }}>
            <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>{'\uD83C\uDFAD'}</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Upload cover art</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #a0a0a0)', marginTop: 4 }}>
              PNG or JPG, minimum 1000x1000px
            </div>
          </div>
        )}
        <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => uploadFiles(e.target.files, 'cover_art')} />
      </div>

      {/* Additional Assets */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Additional Assets (optional)</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Asset Type</label>
            <select style={inputStyle} value={assetType} onChange={(e) => setAssetType(e.target.value)}>
              {ASSET_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Description (optional)</label>
            <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <button onClick={() => additionalInputRef.current?.click()}
          style={{ ...secondaryBtn, width: '100%', padding: 14 }}>
          + Add {ASSET_TYPE_OPTIONS.find(o => o.value === assetType)?.label} files
        </button>
        <input ref={additionalInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={(e) => uploadFiles(e.target.files, assetType)} />

        {additionalAssets.length > 0 && (
          <div style={{
            marginTop: 16, display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12,
          }}>
            {additionalAssets.map(a => (
              <div key={a.id} style={{
                background: 'var(--bg-card, #1e2a45)', borderRadius: 8,
                border: '1px solid var(--border, #2a3a5c)', overflow: 'hidden',
              }}>
                <img src={getPublicUrl(a.storage_path)} alt={a.filename}
                  style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent, #e94560)', textTransform: 'uppercase' }}>
                    {a.asset_type.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary, #a0a0a0)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.filename}
                  </div>
                  <button onClick={() => deleteAsset(a.id)} style={{
                    marginTop: 6, width: '100%', padding: '4px', fontSize: 11,
                    background: 'transparent', color: '#e94560',
                    border: '1px solid rgba(233,69,96,0.3)', borderRadius: 4, cursor: 'pointer',
                  }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', marginBottom: 16,
          background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.3)',
          borderRadius: 8, color: '#e94560', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {uploading && (
        <div style={{ textAlign: 'center', padding: 12, color: 'var(--text-secondary, #a0a0a0)', fontSize: 13 }}>
          Uploading...
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={secondaryBtn}>{'\u2190 Back'}</button>
        <button onClick={onContinue} disabled={!coverArt}
          style={{ ...primaryBtn, opacity: !coverArt ? 0.5 : 1, cursor: !coverArt ? 'not-allowed' : 'pointer' }}>
          {'Save & Continue \u2192'}
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Inventory ───────────────────────────────────────────
function Step4Inventory({ form, setForm, onContinue, onBack, saving }) {
  const wholesaleDisplay = form.wholesale_dollars || (form.msrp_dollars ? form.msrp_dollars / 2 : 0)

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Consignment Inventory</h2>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary, #a0a0a0)' }}>
        Step 4 of 5
      </p>

      <div style={infoBoxStyle}>
        Tell us how many units you're consigning to the GMG program.
        Per Section 2 of the agreement, all inventory remains your property
        until point of sale.
      </div>

      <div style={cardStyle}>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Demo Units</label>
          <input style={inputStyle} type="number" min="1"
            value={form.demo_units ?? 1}
            onChange={(e) => setForm(prev => ({ ...prev, demo_units: Number(e.target.value) }))} />
          <div style={{ fontSize: 12, color: 'var(--text-secondary, #a0a0a0)', marginTop: 6 }}>
            Reserved for in-venue play. Not available for sale. Minimum 1 per title.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Sale Units</label>
          <input style={inputStyle} type="number" min="0"
            value={form.sale_units ?? 0}
            onChange={(e) => setForm(prev => ({ ...prev, sale_units: Number(e.target.value) }))} />
          <div style={{ fontSize: 12, color: 'var(--text-secondary, #a0a0a0)', marginTop: 6 }}>
            Available for retail sale at venues. You receive 100% of proceeds during the pilot.
          </div>
        </div>

        <div style={{
          padding: 14, background: 'var(--bg-card, #1e2a45)', borderRadius: 8,
          border: '1px solid var(--border, #2a3a5c)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
            Confirm wholesale price for damage claims: ${wholesaleDisplay.toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #a0a0a0)' }}>
            {'Per Section 3.1 \u2014 used only for damage reimbursement calculations.'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={secondaryBtn}>{'\u2190 Back'}</button>
        <button onClick={onContinue} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.5 : 1 }}>
          {saving ? 'Saving...' : 'Save & Continue \u2192'}
        </button>
      </div>
    </div>
  )
}

// ── Step 5: Review & Submit ─────────────────────────────────────
function Step5Review({ form, assets, onSubmit, onBack, submitting }) {
  const [confirmed, setConfirmed] = useState(false)
  const rulebook = assets.find(a => a.asset_type === 'rulebook_pdf')
  const coverArt = assets.find(a => a.asset_type === 'cover_art')
  const otherAssets = assets.filter(a => a.asset_type !== 'rulebook_pdf' && a.asset_type !== 'cover_art')

  const getPublicUrl = (storage_path) => {
    return `https://uvfidazctqeazywlebkh.supabase.co/storage/v1/object/public/publisher-assets/${storage_path}`
  }

  const sectionStyle = { marginBottom: 16 }
  const labelKey = { fontSize: 12, color: 'var(--text-secondary, #a0a0a0)', textTransform: 'uppercase', letterSpacing: '0.5px' }
  const labelVal = { fontSize: 14, color: 'var(--text-primary, #e0e0e0)', marginTop: 2 }

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Review & Submit</h2>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary, #a0a0a0)' }}>
        {'Step 5 of 5 \u2014 Final review'}
      </p>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Game Info</h3>
        <div style={sectionStyle}>
          <div style={labelKey}>Title</div>
          <div style={labelVal}>{form.title}</div>
        </div>
        {form.description && (
          <div style={sectionStyle}>
            <div style={labelKey}>Description</div>
            <div style={labelVal}>{form.description}</div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <div style={labelKey}>Players</div>
            <div style={labelVal}>{form.player_count_min}-{form.player_count_max}</div>
          </div>
          <div>
            <div style={labelKey}>Play Time</div>
            <div style={labelVal}>{form.play_time_min}-{form.play_time_max} min</div>
          </div>
          <div>
            <div style={labelKey}>Complexity</div>
            <div style={{ ...labelVal, textTransform: 'capitalize' }}>{form.complexity || '\u2014'}</div>
          </div>
          <div>
            <div style={labelKey}>MSRP</div>
            <div style={labelVal}>${(form.msrp_dollars || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Rulebook</h3>
        {rulebook ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{'\u2705'}</span>
            <div>
              <div style={{ fontSize: 14 }}>{rulebook.filename}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {(rulebook.file_size_bytes / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#e94560', fontSize: 13 }}>No rulebook uploaded</div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>
          Assets ({assets.filter(a => a.asset_type !== 'rulebook_pdf').length} files)
        </h3>
        {coverArt && (
          <div style={{ marginBottom: 12 }}>
            <div style={labelKey}>Cover Art</div>
            <img src={getPublicUrl(coverArt.storage_path)} alt="cover"
              style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, marginTop: 6, border: '1px solid var(--border, #2a3a5c)' }} />
          </div>
        )}
        {otherAssets.length > 0 && (
          <div>
            <div style={labelKey}>Additional Assets</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginTop: 6 }}>
              {otherAssets.map(a => (
                <img key={a.id} src={getPublicUrl(a.storage_path)} alt={a.filename}
                  style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border, #2a3a5c)' }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Inventory</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <div style={labelKey}>Demo Units</div>
            <div style={labelVal}>{form.demo_units || 1}</div>
          </div>
          <div>
            <div style={labelKey}>Sale Units</div>
            <div style={labelVal}>{form.sale_units || 0}</div>
          </div>
          <div>
            <div style={labelKey}>Total Units</div>
            <div style={labelVal}>{(form.demo_units || 1) + (form.sale_units || 0)}</div>
          </div>
        </div>
      </div>

      <div style={{
        ...cardStyle, background: 'rgba(255,193,7,0.05)',
        border: '1px solid rgba(255,193,7,0.25)',
      }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 12 }}>
          By submitting this game, you confirm that:<br />
          {'\u2022 This game is added to Schedule A of your Publisher Consignment Agreement'}<br />
          {'\u2022 The information above is accurate'}<br />
          {'\u2022 You have the rights to all uploaded assets'}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer' }} />
          I confirm the above
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={secondaryBtn}>{'\u2190 Back'}</button>
        <button onClick={onSubmit} disabled={!confirmed || submitting}
          style={{
            ...primaryBtn, background: '#e94560',
            opacity: (!confirmed || submitting) ? 0.5 : 1,
            cursor: (!confirmed || submitting) ? 'not-allowed' : 'pointer',
          }}>
          {submitting ? 'Submitting...' : 'Submit for Review'}
        </button>
      </div>
    </div>
  )
}

// ── Main Wizard Component ───────────────────────────────────────
export default function PublisherGameOnboarding() {
  const navigate = useNavigate()
  const { gameId: urlGameId } = useParams()
  const { getToken } = usePublisherAuth()

  const [step, setStep] = useState(1)
  const [gameId, setGameId] = useState(urlGameId || null)
  const [form, setForm] = useState({})
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(!!urlGameId)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedTitle, setSubmittedTitle] = useState('')
  const [error, setError] = useState('')

  const refreshAssets = useCallback(async () => {
    if (!gameId) return
    try {
      const res = await fetch(`${API_BASE}/api/v1/publishers/games/${gameId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const data = await res.json()
        setAssets(data.assets || [])
      }
    } catch { /* ignore */ }
  }, [gameId, getToken])

  // Load existing game on mount (resume mode)
  useEffect(() => {
    if (!urlGameId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/publishers/games/${urlGameId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        if (!res.ok) throw new Error('Failed to load game')
        const data = await res.json()
        if (cancelled) return

        setForm({
          title: data.title || '',
          description: data.description || '',
          player_count_min: data.player_count_min,
          player_count_max: data.player_count_max,
          player_count_recommended: data.player_count_recommended,
          play_time_min: data.play_time_min,
          play_time_max: data.play_time_max,
          complexity: data.complexity || '',
          categories: data.categories || [],
          msrp_dollars: data.msrp_cents ? data.msrp_cents / 100 : '',
          wholesale_dollars: data.wholesale_cents ? data.wholesale_cents / 100 : '',
          upc: data.upc || '',
          bgg_url: data.bgg_url || '',
          demo_units: data.demo_units || 1,
          sale_units: data.sale_units || 0,
        })
        setAssets(data.assets || [])
        setStep(Math.min(Math.max(data.onboarding_step || 1, 1), 5))
      } catch (e) {
        setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [urlGameId, getToken])

  const saveStep1 = async () => {
    setSaving(true)
    setError('')
    const payload = {
      title: form.title?.trim(),
      description: form.description,
      player_count_min: form.player_count_min || null,
      player_count_max: form.player_count_max || null,
      player_count_recommended: form.player_count_recommended || null,
      play_time_min: form.play_time_min || null,
      play_time_max: form.play_time_max || null,
      complexity: form.complexity || null,
      categories: form.categories || [],
      msrp_cents: form.msrp_dollars ? Math.round(form.msrp_dollars * 100) : 0,
      wholesale_cents: form.wholesale_dollars ? Math.round(form.wholesale_dollars * 100) : null,
      upc: form.upc || null,
      bgg_url: form.bgg_url || null,
    }

    try {
      const url = gameId
        ? `${API_BASE}/api/v1/publishers/games/${gameId}`
        : `${API_BASE}/api/v1/publishers/games`
      const res = await fetch(url, {
        method: gameId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ...payload, onboarding_step: 2 }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Save failed' }))
        throw new Error(err.detail || 'Save failed')
      }
      const data = await res.json()
      if (!gameId) setGameId(data.id)
      setStep(2)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const saveOnboardingStep = async (newStep) => {
    if (!gameId) return
    try {
      await fetch(`${API_BASE}/api/v1/publishers/games/${gameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ onboarding_step: newStep }),
      })
    } catch { /* ignore */ }
  }

  const advanceTo = (newStep) => {
    setStep(newStep)
    saveOnboardingStep(newStep)
  }

  const saveStep4 = async () => {
    setSaving(true)
    setError('')
    try {
      await fetch(`${API_BASE}/api/v1/publishers/games/${gameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          demo_units: form.demo_units || 1,
          sale_units: form.sale_units || 0,
          onboarding_step: 5,
        }),
      })
      setStep(5)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/publishers/games/${gameId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          demo_units: form.demo_units || 1,
          sale_units: form.sale_units || 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Submit failed' }))
        throw new Error(err.detail || 'Submit failed')
      }
      setSubmittedTitle(form.title || 'Your game')
      setSubmitted(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #1a1a2e)', color: 'var(--text-primary, #e0e0e0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary, #1a1a2e)', color: 'var(--text-primary, #e0e0e0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
      }}>
        <div style={{ maxWidth: 560, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>{'\uD83C\uDFAE'}</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 26 }}>{submittedTitle} submitted for review!</h1>
          <div style={{
            ...cardStyle, textAlign: 'left', marginTop: 24,
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>What happens next:</h3>
            <ol style={{ paddingLeft: 20, margin: 0, fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary, #a0a0a0)' }}>
              <li>Our content team creates your interactive teaching guide (within 7 days)</li>
              <li>You'll receive an email when the guide is ready for your review</li>
              <li>You have 48 hours to approve or request changes</li>
              <li>Once approved, your game goes live at venues!</li>
            </ol>
          </div>
          <button onClick={() => navigate('/publishers/dashboard')}
            style={{ ...primaryBtn, marginTop: 24 }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

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
          <button onClick={() => navigate('/publishers/dashboard')}
            style={{ ...secondaryBtn, padding: '6px 14px', fontSize: 13 }}>
            {'\u2190 Dashboard'}
          </button>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Add New Game</span>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <StepIndicator currentStep={step} />

        {error && (
          <div style={{
            padding: '12px 16px', marginBottom: 20,
            background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.3)',
            borderRadius: 8, color: '#e94560', fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <Step1GameInfo form={form} setForm={setForm} onContinue={saveStep1} saving={saving} />
        )}
        {step === 2 && gameId && (
          <Step2Rulebook
            gameId={gameId} getToken={getToken} assets={assets}
            refreshAssets={refreshAssets}
            onContinue={() => advanceTo(3)} onBack={() => setStep(1)}
          />
        )}
        {step === 3 && gameId && (
          <Step3Assets
            gameId={gameId} getToken={getToken} assets={assets}
            refreshAssets={refreshAssets}
            onContinue={() => advanceTo(4)} onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <Step4Inventory
            form={form} setForm={setForm}
            onContinue={saveStep4} onBack={() => setStep(3)}
            saving={saving}
          />
        )}
        {step === 5 && (
          <Step5Review
            form={form} assets={assets}
            onSubmit={handleSubmit} onBack={() => setStep(4)}
            submitting={saving}
          />
        )}
      </div>
    </div>
  )
}
