import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'https://gmai-backend.onrender.com'

const inputStyle = {
  width: '100%', padding: '12px 14px', fontSize: 15,
  background: 'var(--bg-card, #1e2a45)', color: 'var(--text-primary, #e0e0e0)',
  border: '1px solid var(--border, #2a3a5c)', borderRadius: 8,
  outline: 'none', boxSizing: 'border-box',
}

export default function PublisherLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch(`${API_BASE}/api/v1/publishers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Login failed' }))
        throw new Error(err.detail || 'Login failed')
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

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email address first')
      return
    }
    try {
      await fetch(`${API_BASE}/api/v1/publishers/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setForgotSent(true)
      setError('')
    } catch {
      setError('Failed to send reset email')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary, #1a1a2e)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
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
        </div>

        <div style={{
          background: 'var(--bg-secondary, #16213e)', borderRadius: 12,
          padding: 28, border: '1px solid var(--border, #2a3a5c)',
        }}>
          <h2 style={{
            margin: '0 0 24px', fontSize: 20, fontWeight: 600, textAlign: 'center',
            color: 'var(--text-primary, #e0e0e0)',
          }}>
            Publisher Sign In
          </h2>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--text-secondary, #a0a0a0)', fontWeight: 500 }}>
                Email
              </label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--text-secondary, #a0a0a0)', fontWeight: 500 }}>
                Password
              </label>
              <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => { setShowForgot(true); handleForgotPassword() }}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  color: 'var(--text-secondary, #a0a0a0)', fontSize: 13, textDecoration: 'underline',
                }}
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', marginBottom: 16, background: 'rgba(233,69,96,0.1)',
                border: '1px solid rgba(233,69,96,0.3)', borderRadius: 8,
                color: '#e94560', fontSize: 14,
              }}>
                {error}
              </div>
            )}

            {forgotSent && (
              <div style={{
                padding: '10px 14px', marginBottom: 16, background: 'rgba(76,175,80,0.1)',
                border: '1px solid rgba(76,175,80,0.3)', borderRadius: 8,
                color: '#81c784', fontSize: 14,
              }}>
                If an account exists, a password reset link has been sent to your email.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !email || !password}
              style={{
                width: '100%', padding: '14px 24px', fontSize: 16, fontWeight: 600,
                background: '#e94560', color: '#fff', border: 'none', borderRadius: 8,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary, #a0a0a0)' }}>
          Don't have an account?{' '}
          <a href="/publishers/signup" style={{ color: 'var(--accent, #e94560)', textDecoration: 'none' }}>
            Sign up
          </a>
        </div>
      </div>
    </div>
  )
}
