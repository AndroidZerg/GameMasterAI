import { createContext, useContext, useState, useCallback, useMemo } from "react";

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  token: "gmai_token",
  venueId: "gmai_venue_id",
  venueName: "gmai_venue_name",
  role: "gmai_role",
  status: "gmai_status",
  expiresAt: "gmai_expires_at",
  sessionExpired: "gmai_session_expired",
};

// Convention accounts expire March 22, 2026 at 11:59:59 PM Pacific
const CONVENTION_EXPIRY = "2026-03-22T23:59:59-08:00";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.token));
  const [venueId, setVenueId] = useState(() => localStorage.getItem(STORAGE_KEYS.venueId));
  const [venueName, setVenueName] = useState(() => localStorage.getItem(STORAGE_KEYS.venueName));
  const [role, setRole] = useState(() => localStorage.getItem(STORAGE_KEYS.role));
  const [status, setStatus] = useState(() => localStorage.getItem(STORAGE_KEYS.status));
  const [expiresAt, setExpiresAt] = useState(() => localStorage.getItem(STORAGE_KEYS.expiresAt));

  const isLoggedIn = !!token;

  const login = useCallback((tokenValue, venueIdValue, venueNameValue, roleValue, statusValue, expiresAtValue) => {
    localStorage.setItem(STORAGE_KEYS.token, tokenValue);
    localStorage.setItem(STORAGE_KEYS.venueId, venueIdValue);
    localStorage.setItem(STORAGE_KEYS.venueName, venueNameValue);
    if (roleValue) localStorage.setItem(STORAGE_KEYS.role, roleValue);
    if (statusValue) localStorage.setItem(STORAGE_KEYS.status, statusValue);
    if (expiresAtValue) localStorage.setItem(STORAGE_KEYS.expiresAt, expiresAtValue);
    localStorage.removeItem(STORAGE_KEYS.sessionExpired);
    setToken(tokenValue);
    setVenueId(venueIdValue);
    setVenueName(venueNameValue);
    setRole(roleValue || "venue_admin");
    setStatus(statusValue || "prospect");
    setExpiresAt(expiresAtValue || null);
  }, []);

  const logout = useCallback((expired = false) => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.venueId);
    localStorage.removeItem(STORAGE_KEYS.venueName);
    localStorage.removeItem(STORAGE_KEYS.role);
    localStorage.removeItem(STORAGE_KEYS.status);
    localStorage.removeItem(STORAGE_KEYS.expiresAt);
    if (expired) {
      localStorage.setItem(STORAGE_KEYS.sessionExpired, "true");
    }
    setToken(null);
    setVenueId(null);
    setVenueName(null);
    setRole(null);
    setStatus(null);
    setExpiresAt(null);
  }, []);

  const getSessionExpired = useCallback(() => {
    const val = localStorage.getItem(STORAGE_KEYS.sessionExpired);
    localStorage.removeItem(STORAGE_KEYS.sessionExpired);
    return val === "true";
  }, []);

  /** Check if the current convention account has expired */
  const isExpired = useCallback(() => {
    if (role !== "convention") return false;
    const exp = expiresAt || CONVENTION_EXPIRY;
    try {
      return new Date() > new Date(exp);
    } catch {
      return false;
    }
  }, [role, expiresAt]);

  const value = useMemo(() => ({
    token,
    venueId,
    venueName,
    role,
    status,
    expiresAt,
    isLoggedIn,
    login,
    logout,
    getSessionExpired,
    isExpired,
  }), [token, venueId, venueName, role, status, expiresAt, isLoggedIn, login, logout, getSessionExpired, isExpired]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
