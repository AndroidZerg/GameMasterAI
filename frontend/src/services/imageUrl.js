import { API_BASE } from "./api";

// Bump this when cover art is refreshed to bust browser/CDN caches.
const CACHE_VERSION = "2";

export function getGameImageUrl(gameId) {
  return `${API_BASE}/api/images/${gameId}.jpg?v=${CACHE_VERSION}`;
}

export function getGameImageUrlPng(gameId) {
  return `${API_BASE}/api/images/${gameId}.png?v=${CACHE_VERSION}`;
}
