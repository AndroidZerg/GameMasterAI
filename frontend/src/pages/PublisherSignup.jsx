import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AGREEMENT_HEADER, AGREEMENT_SECTIONS, KEY_TERMS, AGREEMENT_VERSION } from '../content/consignmentAgreement'

const API_BASE = import.meta.env.VITE_API_URL || 'https://gmai-backend.onrender.com'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

const inputStyle = {
  width: '100%', padding: '10px 14px', fontSize: 15,
  background: 'var(--bg-card, #1e2a45)', color: 'var(--text-primary, #e0e0e0)',
  border: '1px solid var(--border, #2a3a5c)', borderRadius: 8,
  outline: 'none', boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block', marginBottom: 4, fontSize: 13,
  color: 'var(--text-secondary, #a0a0a0)', fontWeight: 500,
}

function AgreementViewer() {
  return (
    <div style={{
      maxHeight: 400, overflowY: 'auto', padding: '20px 24px',
      background: '#0d1117', border: '1px solid var(--border, #2a3a5c)',
      borderRadius: 8, fontSize: 13, lineHeight: 1.7,
      color: 'var(--text-secondary, #a0a0a0)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #e0e0e0)' }}>
          {AGREEMENT_HEADER.entity}
        </div>
        <div style={{ fontSize: 12 }}>{AGREEMENT_HEADER.dba}</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary, #e0e0e0)', marginTop: 12 }}>
          {AGREEMENT_HEADER.title}
        </div>
        <div style={{ fontSize: 13 }}>{AGREEMENT_HEADER.subtitle}</div>
      </div>

      {AGREEMENT_SECTIONS.map((section, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <div style={{
            fontWeight: 700, fontSize: 14, marginBottom: 8,
            color: 'var(--text-primary, #e0e0e0)',
          }}>
            {section.title}
          </div>
          {section.content && (
            <p style={{ margin: '0 0 8px' }}>{section.content}</p>
          )}
          {section.clauses?.map((clause) => (
            <div key={clause.id} style={{ marginBottom: 10 }}>
              <span style={{ fontWeight: 600, color: '#c0c8d8' }}>
                {clause.id} {clause.title}.{' '}
              </span>
              {clause.text}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function PublisherSignup() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const inviteToken = params.get('invite')

  const [form, setForm] = useState({
    company_name: '', contact_name: '', email: '', password: '',
    phone: '', website: '', mailing_address: '', city: '', state: '', zip_code: '',
  })
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const canSubmit = useMemo(() => {
    return form.company_name.trim() && form.contact_name.trim() &&
      form.email.trim() && form.password.length >= 8 && agreed && !submitting
  }, [form, agreed, submitting])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch(`${API_BASE}/api/v1/publishers/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          agreement_accepted: true,
          invite_token: inviteToken || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Signup failed' }))
        throw new Error(err.detail || 'Signup failed')
      }

      const data = await res.json()
      if (data.session) {
        localStorage.setItem('publisher_session', JSON.stringify(data.session))
      }
      navigate('/publishers/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary, #1a1a2e)',
      padding: '40px 16px', display: 'flex', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 700 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 28, fontWeight: 700, color: 'var(--text-primary, #e0e0e0)',
            letterSpacing: '-0.5px',
          }}>
            GameMaster Guide
          </div>
          <div style={{
            display: 'inline-block', marginTop: 8, padding: '4px 12px',
            background: 'rgba(233,69,96,0.15)', color: 'var(--accent, #e94560)',
            borderRadius: 4, fontSize: 12, fontWeight: 600, letterSpacing: '0.5px',
          }}>
            PUBLISHER PORTAL
          </div>
          {inviteToken && (
            <div style={{
              marginTop: 12, padding: '8px 16px', background: 'rgba(76,175,80,0.1)',
              border: '1px solid rgba(76,175,80,0.3)', borderRadius: 8,
              color: '#81c784', fontSize: 13,
            }}>
              You were invited by GameMaster Guide
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Company Information */}
          <div style={{
            background: 'var(--bg-secondary, #16213e)', borderRadius: 12,
            padding: 24, marginBottom: 24, border: '1px solid var(--border, #2a3a5c)',
          }}>
            <h2 style={{
              margin: '0 0 20px', fontSize: 18, fontWeight: 600,
              color: 'var(--text-primary, #e0e0e0)',
            }}>
              Company Information
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Company Name *</label>
                <input style={inputStyle} value={form.company_name} onChange={update('company_name')} required />
              </div>
              <div>
                <label style={labelStyle}>Contact Name *</label>
                <input style={inputStyle} value={form.contact_name} onChange={update('contact_name')} required />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input style={inputStyle} type="email" value={form.email} onChange={update('email')} required />
              </div>
              <div>
                <label style={labelStyle}>Password * (min 8 characters)</label>
                <input style={inputStyle} type="password" value={form.password} onChange={update('password')}
                  minLength={8} required />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={form.phone} onChange={update('phone')} />
              </div>
              <div>
                <label style={labelStyle}>Website</label>
                <input style={inputStyle} value={form.website} onChange={update('website')} placeholder="https://" />
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
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.state} onChange={update('state')}>
                  <option value="">--</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>ZIP Code</label>
                <input style={inputStyle} value={form.zip_code} onChange={update('zip_code')} />
              </div>
            </div>
          </div>

          {/* Section 2: Consignment Agreement */}
          <div style={{
            background: 'var(--bg-secondary, #16213e)', borderRadius: 12,
            padding: 24, marginBottom: 24, border: '1px solid var(--border, #2a3a5c)',
          }}>
            <h2 style={{
              margin: '0 0 16px', fontSize: 18, fontWeight: 600,
              color: 'var(--text-primary, #e0e0e0)',
            }}>
              Publisher Consignment Agreement
            </h2>

            <AgreementViewer />

            {/* Key Terms Summary */}
            <div style={{
              marginTop: 20, padding: 16, background: 'rgba(76,175,80,0.06)',
              border: '1px solid rgba(76,175,80,0.2)', borderRadius: 8,
            }}>
              <div style={{
                fontWeight: 600, fontSize: 14, color: 'var(--text-primary, #e0e0e0)',
                marginBottom: 12,
              }}>
                Key Terms Summary
              </div>
              {KEY_TERMS.map((term, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  marginBottom: 6, fontSize: 13, color: 'var(--text-secondary, #a0a0a0)',
                }}>
                  <span style={{ flexShrink: 0 }}>{term.icon}</span>
                  <span>{term.text}</span>
                </div>
              ))}
            </div>

            {/* Agreement checkbox */}
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 20,
              cursor: 'pointer', fontSize: 13, color: 'var(--text-primary, #e0e0e0)',
              lineHeight: 1.5,
            }}>
              <input
                type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0, cursor: 'pointer' }}
              />
              <span>
                I have read and agree to the Publisher Consignment Agreement (Pilot Program v{AGREEMENT_VERSION}).
                I confirm I have the authority to bind my organization to these terms.
              </span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 16px', marginBottom: 16, background: 'rgba(233,69,96,0.1)',
              border: '1px solid rgba(233,69,96,0.3)', borderRadius: 8,
              color: '#e94560', fontSize: 14,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '14px 24px', fontSize: 16, fontWeight: 600,
              background: canSubmit ? '#4caf50' : '#2a3a5c', color: '#fff',
              border: 'none', borderRadius: 8, cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: submitting ? 0.7 : 1, transition: 'background 0.2s',
            }}
          >
            {submitting ? 'Creating Account...' : 'Create Publisher Account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary, #a0a0a0)' }}>
            Already have an account?{' '}
            <a href="/publishers/login" style={{ color: 'var(--accent, #e94560)', textDecoration: 'none' }}>
              Sign in
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
