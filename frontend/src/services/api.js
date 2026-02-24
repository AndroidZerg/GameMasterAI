export const API_BASE = import.meta.env.VITE_API_URL
  || (window.location.hostname === "localhost"
    ? "http://localhost:8100"
    : "https://gmai-backend.onrender.com");

function getAuthHeaders() {
  const token = localStorage.getItem("gmai_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// Global 401 handler — triggers auto-logout
let onUnauthorized = null;
export function setOnUnauthorized(cb) {
  onUnauthorized = cb;
}

async function handleResponse(res) {
  if (res.status === 401 && onUnauthorized) {
    onUnauthorized();
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Request failed: ${res.status}` }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Public endpoints (no auth required) ──

export async function fetchGames(search = "", complexity = "") {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (complexity) params.set("complexity", complexity);
  const url = `${API_BASE}/api/games${params.toString() ? "?" + params : ""}`;
  const res = await fetch(url);
  return handleResponse(res);
}

export async function fetchGame(gameId) {
  const res = await fetch(`${API_BASE}/api/games/${gameId}`);
  return handleResponse(res);
}

export async function queryGame(gameId, question) {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, question }),
  });
  return handleResponse(res);
}

export async function fetchVenueConfig() {
  const res = await fetch(`${API_BASE}/api/venue`);
  return handleResponse(res);
}

export async function fetchVenueCollection() {
  const res = await fetch(`${API_BASE}/api/venue/collection`);
  return handleResponse(res);
}

// ── Auth endpoints ──

export async function loginVenue(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

// ── Admin endpoints (auth required) ──

export async function saveVenueSettings(settings) {
  const res = await fetch(`${API_BASE}/api/admin/venue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(settings),
  });
  return handleResponse(res);
}

export async function saveVenueCollection(gameIds) {
  const res = await fetch(`${API_BASE}/api/admin/collection`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ game_ids: gameIds }),
  });
  return handleResponse(res);
}

export async function reloadGames() {
  const res = await fetch(`${API_BASE}/api/reload`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// ── Public extras (no auth required) ──

export async function fetchExpansions(gameId) {
  const res = await fetch(`${API_BASE}/api/games/${gameId}/expansions`);
  return handleResponse(res);
}

export async function fetchVenueMenu() {
  const res = await fetch(`${API_BASE}/api/venue/menu`);
  return handleResponse(res);
}

export async function fetchFeaturedGame() {
  const res = await fetch(`${API_BASE}/api/games/featured`);
  return handleResponse(res);
}

export async function fetchStaffPicks() {
  const res = await fetch(`${API_BASE}/api/games/staff-picks`);
  return handleResponse(res);
}

export async function fetchHouseRules() {
  const res = await fetch(`${API_BASE}/api/venue/house-rules`);
  return handleResponse(res);
}
