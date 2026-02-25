import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  token: "gmai_token",
  venueId: "gmai_venue_id",
  venueName: "gmai_venue_name",
  role: "gmai_role",
  status: "gmai_status",
  sessionExpired: "gmai_session_expired",
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.token));
  const [venueId, setVenueId] = useState(() => localStorage.getItem(STORAGE_KEYS.venueId));
  const [venueName, setVenueName] = useState(() => localStorage.getItem(STORAGE_KEYS.venueName));
  const [role, setRole] = useState(() => localStorage.getItem(STORAGE_KEYS.role));
  const [status, setStatus] = useState(() => localStorage.getItem(STORAGE_KEYS.status));

  const isLoggedIn = !!token;

  const login = useCallback((tokenValue, venueIdValue, venueNameValue, roleValue, statusValue) => {
    localStorage.setItem(STORAGE_KEYS.token, tokenValue);
    localStorage.setItem(STORAGE_KEYS.venueId, venueIdValue);
    localStorage.setItem(STORAGE_KEYS.venueName, venueNameValue);
    if (roleValue) localStorage.setItem(STORAGE_KEYS.role, roleValue);
    if (statusValue) localStorage.setItem(STORAGE_KEYS.status, statusValue);
    localStorage.removeItem(STORAGE_KEYS.sessionExpired);
    setToken(tokenValue);
    setVenueId(venueIdValue);
    setVenueName(venueNameValue);
    setRole(roleValue || "venue_admin");
    setStatus(statusValue || "prospect");
  }, []);

  const logout = useCallback((expired = false) => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.venueId);
    localStorage.removeItem(STORAGE_KEYS.venueName);
    localStorage.removeItem(STORAGE_KEYS.role);
    localStorage.removeItem(STORAGE_KEYS.status);
    if (expired) {
      localStorage.setItem(STORAGE_KEYS.sessionExpired, "true");
    }
    setToken(null);
    setVenueId(null);
    setVenueName(null);
    setRole(null);
    setStatus(null);
  }, []);

  const getSessionExpired = useCallback(() => {
    const val = localStorage.getItem(STORAGE_KEYS.sessionExpired);
    localStorage.removeItem(STORAGE_KEYS.sessionExpired);
    return val === "true";
  }, []);

  const value = {
    token,
    venueId,
    venueName,
    role,
    status,
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
