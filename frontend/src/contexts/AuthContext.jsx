import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_BASE } from "../services/api";

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  token: "gmai_token",
  venueId: "gmai_venue_id",
  venueName: "gmai_venue_name",
  sessionExpired: "gmai_session_expired",
};

const DEMO_EMAIL = "demo@playgmai.com";
const DEMO_PASSWORD = "gmai2026";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.token));
  const [venueId, setVenueId] = useState(() => localStorage.getItem(STORAGE_KEYS.venueId));
  const [venueName, setVenueName] = useState(() => localStorage.getItem(STORAGE_KEYS.venueName));

  const isLoggedIn = !!token;

  const login = useCallback((tokenValue, venueIdValue, venueNameValue) => {
    localStorage.setItem(STORAGE_KEYS.token, tokenValue);
    localStorage.setItem(STORAGE_KEYS.venueId, venueIdValue);
    localStorage.setItem(STORAGE_KEYS.venueName, venueNameValue);
    localStorage.removeItem(STORAGE_KEYS.sessionExpired);
    setToken(tokenValue);
    setVenueId(venueIdValue);
    setVenueName(venueNameValue);
  }, []);

  const logout = useCallback((expired = false) => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.venueId);
    localStorage.removeItem(STORAGE_KEYS.venueName);
    if (expired) {
      localStorage.setItem(STORAGE_KEYS.sessionExpired, "true");
    }
    setToken(null);
    setVenueId(null);
    setVenueName(null);
  }, []);

  const getSessionExpired = useCallback(() => {
    const val = localStorage.getItem(STORAGE_KEYS.sessionExpired);
    localStorage.removeItem(STORAGE_KEYS.sessionExpired);
    return val === "true";
  }, []);

  // Auto-login as demo venue if no token exists
  useEffect(() => {
    if (token) return;
    const autoLogin = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
        });
        if (res.ok) {
          const data = await res.json();
          login(data.token, data.venue_id, data.venue_name);
        }
      } catch {
        // API unavailable — continue without auth
      }
    };
    autoLogin();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    token,
    venueId,
    venueName,
    isLoggedIn,
    login,
    logout,
    getSessionExpired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
