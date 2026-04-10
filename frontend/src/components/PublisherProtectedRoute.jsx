import { Navigate } from 'react-router-dom'
import { usePublisherAuth } from '../contexts/PublisherAuthContext'

export default function PublisherProtectedRoute({ children }) {
  const { publisher, loading } = usePublisherAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-primary, #1a1a2e)',
        color: 'var(--text-primary, #e0e0e0)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid var(--border, #2a3a5c)',
            borderTopColor: 'var(--accent, #e94560)', borderRadius: '50%',
            animation: 'spinnerRotate 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!publisher) {
    return <Navigate to="/publishers/login" replace />
  }

  return children
}
