import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'https://gmai-backend.onrender.com'
const PublisherAuthContext = createContext(null)

const STORAGE_KEY = 'publisher_session'

export function PublisherAuthProvider({ children }) {
  const [publisher, setPublisher] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    setSession(null)
    setPublisher(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const fetchProfile = useCallback(async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/publishers/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setPublisher(data)
      } else {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.refresh_token) {
            try {
              const refreshRes = await fetch(`${API_BASE}/api/v1/publishers/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: parsed.refresh_token })
              })
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json()
                setSession(refreshData.session)
                localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshData.session))
                const profileRes = await fetch(`${API_BASE}/api/v1/publishers/me`, {
                  headers: { 'Authorization': `Bearer ${refreshData.session.access_token}` }
                })
                if (profileRes.ok) {
                  setPublisher(await profileRes.json())
                  return
                }
              }
            } catch { /* fall through to logout */ }
          }
        }
        logout()
      }
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSession(parsed)
        fetchProfile(parsed.access_token)
      } catch {
        localStorage.removeItem(STORAGE_KEY)
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [fetchProfile])

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/api/v1/publishers/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }))
      throw new Error(err.detail || 'Login failed')
    }
    const data = await res.json()
    setSession(data.session)
    setPublisher(data.publisher)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.session))
    return data
  }, [])

  const signup = useCallback(async (formData) => {
    const res = await fetch(`${API_BASE}/api/v1/publishers/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Signup failed' }))
      throw new Error(err.detail || 'Signup failed')
    }
    const data = await res.json()
    setSession(data.session)
    setPublisher(data.publisher)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.session))
    return data
  }, [])

  const getToken = useCallback(() => session?.access_token, [session])

  const value = useMemo(() => ({
    publisher, session, loading, login, signup, logout, getToken
  }), [publisher, session, loading, login, signup, logout, getToken])

  return (
    <PublisherAuthContext.Provider value={value}>
      {children}
    </PublisherAuthContext.Provider>
  )
}

export function usePublisherAuth() {
  const ctx = useContext(PublisherAuthContext)
  if (!ctx) throw new Error('usePublisherAuth must be used within PublisherAuthProvider')
  return ctx
}
