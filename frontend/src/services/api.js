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
  const res = await fetch(url, { headers: getAuthHeaders() });
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
  const res = await fetch(`${API_BASE}/api/venue`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function fetchVenueCollection() {
  const res = await fetch(`${API_BASE}/api/venue/collection`, {
    headers: getAuthHeaders(),
  });
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

export async function signupConvention(email, trial = false) {
  const url = `${API_BASE}/api/auth/signup${trial ? "?trial=true" : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
}

// ── Meetup toggle (super_admin) ──

export async function fetchMeetupToggle() {
  const res = await fetch(`${API_BASE}/api/admin/meetup-toggle`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function setMeetupToggle(enabled) {
  const res = await fetch(`${API_BASE}/api/admin/meetup-toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ enabled }),
  });
  return handleResponse(res);
}

// ── Per-venue home config (super_admin) ──

export async function fetchAllVenues() {
  const res = await fetch(`${API_BASE}/api/admin/venues`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function fetchVenueHomeConfig(venueId) {
  const res = await fetch(`${API_BASE}/api/admin/home-config/${encodeURIComponent(venueId)}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function saveVenueHomeConfig(venueId, { featured, staffPicks }) {
  const body = {};
  if (featured !== undefined) body.featured = featured;
  if (staffPicks !== undefined) body.staff_picks = staffPicks;
  const res = await fetch(`${API_BASE}/api/admin/home-config/${encodeURIComponent(venueId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function resetVenueHomeConfig(venueId) {
  const res = await fetch(`${API_BASE}/api/admin/home-config/${encodeURIComponent(venueId)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
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
  const res = await fetch(`${API_BASE}/api/games/featured`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function fetchStaffPicks() {
  const res = await fetch(`${API_BASE}/api/games/staff-picks`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function fetchHouseRules() {
  const res = await fetch(`${API_BASE}/api/venue/house-rules`);
  return handleResponse(res);
}

// ── Admin: Featured & Staff Picks ──

export async function fetchAdminFeatured() {
  const res = await fetch(`${API_BASE}/api/admin/featured`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function saveAdminFeatured(body) {
  const res = await fetch(`${API_BASE}/api/admin/featured`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function fetchAdminStaffPicks() {
  const res = await fetch(`${API_BASE}/api/admin/staff-picks`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function saveAdminStaffPicks(gameIds) {
  const res = await fetch(`${API_BASE}/api/admin/staff-picks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ game_ids: gameIds }),
  });
  return handleResponse(res);
}

// ── Orders ──

export async function placeOrder(order) {
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  return handleResponse(res);
}

// ── Lobby endpoints (no auth required) ──

export async function createLobby(gameId, hostName) {
  const res = await fetch(`${API_BASE}/api/lobby/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, host_name: hostName }),
  });
  return handleResponse(res);
}

export async function joinLobby(code, playerName) {
  const res = await fetch(`${API_BASE}/api/lobby/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, player_name: playerName }),
  });
  return handleResponse(res);
}

export async function getLobbyState(lobbyId) {
  const res = await fetch(`${API_BASE}/api/lobby/${lobbyId}`);
  return handleResponse(res);
}

export async function updateLobbyScores(lobbyId, playerId, scores) {
  const res = await fetch(`${API_BASE}/api/lobby/${lobbyId}/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId, scores }),
  });
  return handleResponse(res);
}

export async function kickPlayer(lobbyId, hostId, kickPlayerId) {
  const res = await fetch(`${API_BASE}/api/lobby/${lobbyId}/kick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host_id: hostId, kick_player_id: kickPlayerId }),
  });
  return handleResponse(res);
}

export async function leaveLobby(lobbyId, playerId) {
  const res = await fetch(`${API_BASE}/api/lobby/${lobbyId}/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId }),
  });
  return handleResponse(res);
}
