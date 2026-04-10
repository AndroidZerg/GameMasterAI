export const API_BASE = import.meta.env.VITE_API_URL
  || (window.location.hostname === "localhost"
    ? "http://localhost:8100"
    : "https://gmai-backend.onrender.com");

// Cover art cache-buster version. Increment this after any bulk image
// migration to force browsers to re-fetch from the backend instead of
// serving stale cached bytes from a previous Cache-Control: max-age.
export const COVER_ART_VERSION = 2;

/**
 * Build a cover art image URL with cache-busting version param.
 * Usage: getGameImageUrl('catan') => '${API_BASE}/api/images/catan.jpg?v=2'
 */
export function getGameImageUrl(gameId) {
  return `${API_BASE}/api/images/${gameId}.jpg?v=${COVER_ART_VERSION}`;
}

/**
 * Build a cover art PNG fallback URL (tried after .jpg fails).
 */
export function getGameImageUrlPng(gameId) {
  return `${API_BASE}/api/images/${gameId}.png?v=${COVER_ART_VERSION}`;
}
