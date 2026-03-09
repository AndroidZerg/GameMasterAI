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

export async function queryGame(gameId, question, extra = {}) {
  const body = { game_id: gameId, question };
  if (extra.device_id) body.device_id = extra.device_id;
  if (extra.station_id) body.station_id = extra.station_id;
  const res = await fetch(`${API_BASE}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

export async function guestAuth(venueSlug, table) {
  const params = new URLSearchParams({ venue: venueSlug });
  if (table != null) params.set("table", table);
  const res = await fetch(`${API_BASE}/api/auth/guest?${params}`);
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

// ── Clear recently played (super_admin trigger, public read) ──

export async function fetchClearRecentTs() {
  const res = await fetch(`${API_BASE}/api/admin/clear-recent-ts`);
  return handleResponse(res);
}

export async function clearRecentlyPlayed() {
  const res = await fetch(`${API_BASE}/api/admin/clear-recent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
  const res = await fetch(`${API_BASE}/api/venue/menu`, {
    headers: getAuthHeaders(),
  });
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

// ── Rentals ──

export async function submitRentalRequest(data) {
  const res = await fetch(`${API_BASE}/api/v1/rentals/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function fetchMyRental() {
  const res = await fetch(`${API_BASE}/api/v1/rentals/me`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function fetchMrrDashboard(venueId) {
  const params = venueId ? `?venue_id=${encodeURIComponent(venueId)}` : "";
  const res = await fetch(`${API_BASE}/api/v1/crm/mrr${params}`, {
    headers: getAuthHeaders(),
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

// ── Print Queue (admin) ──

export async function fetchPrintStatus() {
  const res = await fetch(`${API_BASE}/api/admin/print-status`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function reprintOrder(orderId) {
  const res = await fetch(`${API_BASE}/api/print-queue/${orderId}/reprint`, {
    method: "POST",
    headers: getAuthHeaders(),
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

// ── Marketplace: Subscriptions & Game Selection ──

export async function fetchSubscriptionStatus(venueId) {
  const res = await fetch(`${API_BASE}/api/v1/venues/${encodeURIComponent(venueId)}/subscription-status`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function subscribeVenue(venueId, tier) {
  const res = await fetch(`${API_BASE}/api/v1/venues/${encodeURIComponent(venueId)}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ tier }),
  });
  return handleResponse(res);
}

export async function fetchGameSelection(venueId) {
  const res = await fetch(`${API_BASE}/api/v1/venues/${encodeURIComponent(venueId)}/game-selection`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function activateGame(venueId, gameId) {
  const res = await fetch(`${API_BASE}/api/v1/venues/${encodeURIComponent(venueId)}/games/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ game_id: gameId }),
  });
  return handleResponse(res);
}

export async function deactivateGame(venueId, gameId) {
  const res = await fetch(`${API_BASE}/api/v1/venues/${encodeURIComponent(venueId)}/games/deactivate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ game_id: gameId }),
  });
  return handleResponse(res);
}

// ── LGS Dashboard ──

export async function fetchLGSDashboard(lgsId) {
  const res = await fetch(`${API_BASE}/api/v1/lgs/${encodeURIComponent(lgsId)}/dashboard`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function fetchLGSVenueInventory(lgsId, venueId) {
  const res = await fetch(`${API_BASE}/api/v1/lgs/${encodeURIComponent(lgsId)}/venues/${encodeURIComponent(venueId)}/inventory`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function updateLGSInventory(lgsId, venueId, gameId, stockCount) {
  const res = await fetch(`${API_BASE}/api/v1/lgs/${encodeURIComponent(lgsId)}/inventory/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ venue_id: venueId, game_id: gameId, stock_count: stockCount }),
  });
  return handleResponse(res);
}

export async function updateLGSThreshold(lgsId, venueId, gameId, restockThreshold) {
  const res = await fetch(`${API_BASE}/api/v1/lgs/${encodeURIComponent(lgsId)}/inventory/set-threshold`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ venue_id: venueId, game_id: gameId, restock_threshold: restockThreshold }),
  });
  return handleResponse(res);
}

export async function updateLGSPricing(lgsId, gameId, retailPriceCents, isAvailable) {
  const res = await fetch(`${API_BASE}/api/v1/lgs/${encodeURIComponent(lgsId)}/pricing/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ game_id: gameId, retail_price_cents: retailPriceCents, is_available: isAvailable }),
  });
  return handleResponse(res);
}

export async function fetchLGSPricing(lgsId) {
  const res = await fetch(`${API_BASE}/api/v1/lgs/${encodeURIComponent(lgsId)}/pricing`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function fetchLGSAlerts(lgsId) {
  const res = await fetch(`${API_BASE}/api/v1/lgs/${encodeURIComponent(lgsId)}/alerts`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function fetchLGSTransactions(lgsId, period, type) {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (type && type !== "all") params.set("type", type);
  const qs = params.toString() ? `?${params}` : "";
  const res = await fetch(`${API_BASE}/api/v1/lgs/${encodeURIComponent(lgsId)}/transactions${qs}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Shop / Game Purchase
// ---------------------------------------------------------------------------

export async function fetchVenueShop(venueId) {
  const res = await fetch(`${API_BASE}/api/v1/venues/${encodeURIComponent(venueId)}/shop`);
  return handleResponse(res);
}

export async function createPurchase(venueId, gameId, email, name) {
  const res = await fetch(`${API_BASE}/api/v1/venues/${encodeURIComponent(venueId)}/shop/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, customer_email: email, customer_name: name }),
  });
  return handleResponse(res);
}

export async function confirmFulfillment(venueId, purchaseId) {
  const res = await fetch(`${API_BASE}/api/v1/venues/${encodeURIComponent(venueId)}/shop/fulfill`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ purchase_id: purchaseId }),
  });
  return handleResponse(res);
}

export async function reportFulfillmentFailed(venueId, purchaseId) {
  const res = await fetch(`${API_BASE}/api/v1/venues/${encodeURIComponent(venueId)}/shop/fulfillment-failed`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ purchase_id: purchaseId }),
  });
  return handleResponse(res);
}

export async function fetchPendingFulfillments(venueId) {
  const res = await fetch(`${API_BASE}/api/v1/venues/${encodeURIComponent(venueId)}/shop/pending-fulfillments`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// ── Thai House Public ──

export const fetchPublicMenu = (slug) =>
  fetch(`${API_BASE}/api/public/menu/${slug}`).then(r => r.json());

export const placePublicOrder = (slug, order) =>
  fetch(`${API_BASE}/api/public/order/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Order failed'); });
    return r.json();
  });

export const lookupDrinkMember = (emailOrPhone) => {
  const isPhone = /^\d/.test(emailOrPhone.replace(/[\s\-()]/g, ''));
  const param = isPhone
    ? `phone=${encodeURIComponent(emailOrPhone)}`
    : `email=${encodeURIComponent(emailOrPhone)}`;
  return fetch(`${API_BASE}/api/thaihouse/member?${param}`).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Not found'); });
    return r.json();
  });
};

export const staffSearch = (query, pin) =>
  fetch(`${API_BASE}/api/thaihouse/staff/search?q=${encodeURIComponent(query)}`, {
    headers: { 'X-Staff-Pin': pin }
  }).then(r => r.json());

export const getChaClubMembers = (pin) =>
  fetch(`${API_BASE}/api/thaihouse/staff/members?pin=${encodeURIComponent(pin)}`)
    .then(r => {
      if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Failed'); });
      return r.json();
    });

export const staffRedeem = (subscriberId, pin, drinkName) =>
  fetch(`${API_BASE}/api/thaihouse/staff/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriber_id: subscriberId, staff_pin: pin, drink_name: drinkName })
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Redeem failed'); });
    return r.json();
  });

export const addChaClubMember = (pin, { name, phone, email }) =>
  fetch(`${API_BASE}/api/thaihouse/staff/add-member`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, email: email || '', staff_pin: pin })
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Failed to add member'); });
    return r.json();
  });

export const verifyDrinkClub = (phone) =>
  fetch(`${API_BASE}/api/thaihouse/drink-club/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  }).then(r => r.json());

export const saveDrinkClubPhone = ({ subscriberId, sessionId, phone }) =>
  fetch(`${API_BASE}/api/thaihouse/drink-club/save-phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(subscriberId ? { subscriber_id: subscriberId } : {}),
      ...(sessionId ? { session_id: sessionId } : {}),
      phone,
    })
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(_errMsg(e, 'Failed to save phone')); });
    return r.json();
  });

// ── Menu Admin ──

function _errMsg(e, fallback) {
  if (typeof e.detail === 'string') return e.detail;
  if (Array.isArray(e.detail)) return e.detail.map(d => d.msg || JSON.stringify(d)).join('; ');
  return fallback;
}

export const getMenuItems = (pin) =>
  fetch(`${API_BASE}/api/admin/menu-items`, {
    headers: { 'X-Staff-Pin': pin }
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Forbidden'); });
    return r.json();
  });

export const createMenuItem = (data, pin) =>
  fetch(`${API_BASE}/api/admin/menu-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Staff-Pin': pin },
    body: JSON.stringify(data),
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(_errMsg(e, 'Create failed')); });
    return r.json();
  });

export const updateMenuItem = (slug, data, pin) =>
  fetch(`${API_BASE}/api/admin/menu-items/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Staff-Pin': pin },
    body: JSON.stringify(data),
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(_errMsg(e, 'Update failed')); });
    return r.json();
  });

export const deleteMenuItem = (slug, pin) =>
  fetch(`${API_BASE}/api/admin/menu-items/${slug}`, {
    method: 'DELETE',
    headers: { 'X-Staff-Pin': pin },
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Delete failed'); });
    return r.json();
  });

export const uploadMenuPhoto = (slug, file, pin) => {
  const form = new FormData();
  form.append('file', file);
  return fetch(`${API_BASE}/api/admin/menu-photos/${slug}`, {
    method: 'POST',
    headers: { 'X-Staff-Pin': pin },
    body: form,
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Upload failed'); });
    return r.json();
  });
};

export const deleteMenuPhoto = (slug, pin) =>
  fetch(`${API_BASE}/api/admin/menu-photos/${slug}`, {
    method: 'DELETE',
    headers: { 'X-Staff-Pin': pin },
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Delete failed'); });
    return r.json();
  });

export const getToggles = (pin) =>
  fetch(`${API_BASE}/api/admin/toggles`, {
    headers: { 'X-Staff-Pin': pin }
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Forbidden'); });
    return r.json();
  });

export const createToggle = (data, pin) =>
  fetch(`${API_BASE}/api/admin/toggles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Staff-Pin': pin },
    body: JSON.stringify(data),
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Create failed'); });
    return r.json();
  });

export const updateToggle = (toggleId, data, pin) =>
  fetch(`${API_BASE}/api/admin/toggles/${toggleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Staff-Pin': pin },
    body: JSON.stringify(data),
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Update failed'); });
    return r.json();
  });

export const deleteToggle = (toggleId, pin) =>
  fetch(`${API_BASE}/api/admin/toggles/${toggleId}`, {
    method: 'DELETE',
    headers: { 'X-Staff-Pin': pin },
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Delete failed'); });
    return r.json();
  });

// ── Category Management ──

export const getCategories = (pin) =>
  fetch(`${API_BASE}/api/admin/categories`, {
    headers: { 'X-Staff-Pin': pin },
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const createCategory = (data, pin) =>
  fetch(`${API_BASE}/api/admin/categories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Staff-Pin': pin },
    body: JSON.stringify(data),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Create failed'); }));

export const updateCategory = (categoryId, data, pin) =>
  fetch(`${API_BASE}/api/admin/categories/${categoryId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Staff-Pin': pin },
    body: JSON.stringify(data),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Update failed'); }));

export const deleteCategory = (categoryId, pin) =>
  fetch(`${API_BASE}/api/admin/categories/${categoryId}`, {
    method: 'DELETE', headers: { 'X-Staff-Pin': pin },
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Delete failed'); }));

// ── Menu Image Gallery ──

export const getItemGalleryImages = (slug, pin) =>
  fetch(`${API_BASE}/api/admin/menu-images/${slug}`, {
    headers: { 'X-Staff-Pin': pin },
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Failed'); });
    return r.json();
  });

export const uploadGalleryImage = (slug, file, pin) => {
  const form = new FormData();
  form.append('file', file);
  return fetch(`${API_BASE}/api/admin/menu-images/${slug}/upload`, {
    method: 'POST',
    headers: { 'X-Staff-Pin': pin },
    body: form,
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Upload failed'); });
    return r.json();
  });
};

export const importGalleryImageUrl = (slug, url, alt, pin) =>
  fetch(`${API_BASE}/api/admin/menu-images/${slug}/import-url?url=${encodeURIComponent(url)}&alt=${encodeURIComponent(alt || '')}`, {
    method: 'POST',
    headers: { 'X-Staff-Pin': pin },
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Import failed'); });
    return r.json();
  });

export const updateGalleryImage = (imageId, data, pin) =>
  fetch(`${API_BASE}/api/admin/menu-images/${imageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Staff-Pin': pin },
    body: JSON.stringify(data),
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Update failed'); });
    return r.json();
  });

export const deleteGalleryImage = (imageId, pin) =>
  fetch(`${API_BASE}/api/admin/menu-images/${imageId}`, {
    method: 'DELETE',
    headers: { 'X-Staff-Pin': pin },
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Delete failed'); });
    return r.json();
  });

export const bulkImportGalleryImages = (pin) =>
  fetch(`${API_BASE}/api/admin/menu-images/bulk-import`, {
    method: 'POST',
    headers: { 'X-Staff-Pin': pin },
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'Import failed'); });
    return r.json();
  });

// ── Device session endpoints (no auth required) ──

export async function fetchNotes(gameId, deviceId) {
  const res = await fetch(
    `${API_BASE}/api/v1/sessions/notes/${encodeURIComponent(gameId)}?device_id=${encodeURIComponent(deviceId)}`
  );
  return handleResponse(res);
}

export async function saveNotes(gameId, deviceId, content) {
  const res = await fetch(`${API_BASE}/api/v1/sessions/notes/${encodeURIComponent(gameId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: deviceId, content }),
  });
  return handleResponse(res);
}

export async function fetchQAHistory(gameId, deviceId) {
  const res = await fetch(
    `${API_BASE}/api/v1/sessions/qa/history/${encodeURIComponent(gameId)}?device_id=${encodeURIComponent(deviceId)}`
  );
  return handleResponse(res);
}

// ── Dashboard: Orders ──

const _pinH = (pin) => ({ 'X-Staff-Pin': pin });
const _pinJsonH = (pin) => ({ 'Content-Type': 'application/json', 'X-Staff-Pin': pin });

export const getAdminOrders = (pin, statuses) =>
  fetch(`${API_BASE}/api/admin/venue-orders${statuses ? '?status=' + statuses : ''}`, {
    headers: _pinH(pin),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const confirmOrder = (pin, id) =>
  fetch(`${API_BASE}/api/admin/venue-orders/${id}/confirm`, {
    method: 'POST', headers: _pinH(pin),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const completeOrder = (pin, id) =>
  fetch(`${API_BASE}/api/admin/venue-orders/${id}/complete`, {
    method: 'POST', headers: _pinH(pin),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const rejectOrder = (pin, id, reason) =>
  fetch(`${API_BASE}/api/admin/venue-orders/${id}/reject`, {
    method: 'POST', headers: _pinJsonH(pin), body: JSON.stringify({ reason }),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const reprintVenueOrder = (pin, id) =>
  fetch(`${API_BASE}/api/admin/venue-orders/${id}/reprint`, {
    method: 'POST', headers: _pinH(pin),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const getOrderStats = (pin) =>
  fetch(`${API_BASE}/api/admin/venue-orders/stats`, {
    headers: _pinH(pin),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

// ── Dashboard: Floor ──

export const getFloorPlan = (pin) =>
  fetch(`${API_BASE}/api/admin/floor`, {
    headers: _pinH(pin),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const updateFloorTables = (pin, tables) =>
  fetch(`${API_BASE}/api/admin/floor/tables`, {
    method: 'PUT', headers: _pinJsonH(pin), body: JSON.stringify(tables),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const updateFloorZones = (pin, zones) =>
  fetch(`${API_BASE}/api/admin/floor/zones`, {
    method: 'PUT', headers: _pinJsonH(pin), body: JSON.stringify(zones),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const addFloorTable = (pin, table) =>
  fetch(`${API_BASE}/api/admin/floor/tables`, {
    method: 'POST', headers: _pinJsonH(pin), body: JSON.stringify(table),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const deleteFloorTable = (pin, id) =>
  fetch(`${API_BASE}/api/admin/floor/tables/${id}`, {
    method: 'DELETE', headers: _pinH(pin),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const updateTableParty = (pin, tableId, partySize) =>
  fetch(`${API_BASE}/api/admin/floor/tables/${tableId}/party`, {
    method: 'POST', headers: _pinJsonH(pin), body: JSON.stringify({ party_size: partySize }),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

// ── Dashboard: Loyalty ──

export const getLoyaltyMembers = (pin) =>
  fetch(`${API_BASE}/api/admin/loyalty/members`, {
    headers: _pinH(pin),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const getLoyaltyMember = (pin, phone) =>
  fetch(`${API_BASE}/api/admin/loyalty/members/${encodeURIComponent(phone)}`, {
    headers: _pinH(pin),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const redeemReward = (pin, phone, rewardType) =>
  fetch(`${API_BASE}/api/admin/loyalty/redeem/${encodeURIComponent(phone)}`, {
    method: 'POST', headers: _pinJsonH(pin), body: JSON.stringify({ reward_type: rewardType }),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

// ── Dashboard: Loyalty Rewards (admin) ──

export const getLoyaltyRewards = (pin) =>
  fetch(`${API_BASE}/api/admin/loyalty/rewards`, {
    headers: _pinH(pin),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const createLoyaltyReward = (pin, data) =>
  fetch(`${API_BASE}/api/admin/loyalty/rewards`, {
    method: 'POST', headers: _pinJsonH(pin), body: JSON.stringify(data),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const updateLoyaltyReward = (pin, id, data) =>
  fetch(`${API_BASE}/api/admin/loyalty/rewards/${id}`, {
    method: 'PUT', headers: _pinJsonH(pin), body: JSON.stringify(data),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

export const deleteLoyaltyReward = (pin, id) =>
  fetch(`${API_BASE}/api/admin/loyalty/rewards/${id}`, {
    method: 'DELETE', headers: _pinH(pin),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

// ── Public Loyalty (no auth) ──

export const lookupLoyalty = (phone) =>
  fetch(`${API_BASE}/api/public/loyalty/lookup?phone=${encodeURIComponent(phone)}`)
    .then(r => r.json());

export const redeemLoyaltyPublic = (phone, rewardId) =>
  fetch(`${API_BASE}/api/public/loyalty/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, reward_id: rewardId }),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));

// ── Dashboard: CRM ──

export const getCRMStats = (pin) =>
  fetch(`${API_BASE}/api/admin/crm/dashboard`, {
    headers: _pinH(pin),
  }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Failed'); }));
