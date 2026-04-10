import { useState, useCallback } from 'react'
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

function HomeTab({ publisher }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
        Welcome, {publisher.company_name}!
      </h2>

      {/* Quick Stats */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <StatCard label="Games on Platform" value="0" />
        <StatCard label="Total Play Sessions" value="0" />
        <StatCard label="Units Sold This Month" value="0" />
        <StatCard label="Next Payment" value="--" />
      </div>

      {/* Getting Started */}
      <div style={{
        background: 'var(--bg-secondary, #16213e)', borderRadius: 12, padding: 24,
        border: '1px solid var(--border, #2a3a5c)',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
          Getting Started
        </h3>
        <ChecklistItem done text="Account created" />
        <ChecklistItem text="Add your first game" subtext="Coming soon in the next update" />
        <ChecklistItem text="Upload rulebook and assets" subtext="Coming soon" />
        <ChecklistItem text="Review and approve your teaching guide" subtext="Coming soon" />
        <ChecklistItem text="Game goes live at venues" subtext="Coming soon" />
      </div>
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
  const [activeTab, setActiveTab] = useState('home')

  const handleLogout = useCallback(() => {
    logout()
    window.location.href = '/publishers/login'
  }, [logout])

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
        {activeTab === 'home' && <HomeTab publisher={publisher} />}
        {activeTab === 'games' && (
          <PlaceholderTab
            title="My Games"
            description="Coming soon \u2014 you'll manage all your games here, including submissions, status tracking, and guide reviews."
          />
        )}
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
