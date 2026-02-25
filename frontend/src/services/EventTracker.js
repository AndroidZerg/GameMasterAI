/**
 * GMAI Event Tracker — batched event collection
 * Queues events in memory, flushes to backend every 10 seconds
 * or on page unload via sendBeacon.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://gmai-backend.onrender.com';
const FLUSH_INTERVAL_MS = 10000;
const MAX_QUEUE_SIZE = 20;

let queue = [];
let flushTimer = null;
let deviceId = null;
let sessionId = null;
let venueId = 'demo';

// Device ID — persistent across sessions (localStorage)
function getDeviceId() {
  if (deviceId) return deviceId;
  deviceId = localStorage.getItem('gmai-device-id');
  if (!deviceId) {
    deviceId = 'd_' + crypto.randomUUID();
    localStorage.setItem('gmai-device-id', deviceId);
  }
  return deviceId;
}

// Session ID — per browser tab (sessionStorage)
function getSessionId() {
  if (sessionId) return sessionId;
  sessionId = sessionStorage.getItem('gmai-session-id');
  if (!sessionId) {
    sessionId = 's_' + crypto.randomUUID();
    sessionStorage.setItem('gmai-session-id', sessionId);
  }
  return sessionId;
}

// Set venue from auth
function setVenue(id) {
  venueId = id || 'demo';
}

// Track an event
function track(eventType, gameId = null, payload = {}) {
  queue.push({
    event_type: eventType,
    device_id: getDeviceId(),
    session_id: getSessionId(),
    game_id: gameId,
    timestamp: new Date().toISOString(),
    payload: payload
  });

  if (queue.length >= MAX_QUEUE_SIZE) {
    flush();
  }
}

// Flush queue to backend
async function flush() {
  if (queue.length === 0) return;

  const batch = [...queue];
  queue = [];

  try {
    await fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venue_id: venueId,
        events: batch
      })
    });
  } catch (e) {
    // Put events back in queue on failure
    queue = [...batch, ...queue];
    console.warn('EventTracker flush failed:', e);
  }
}

// Start auto-flush timer
function start() {
  if (flushTimer) return;
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);

  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    if (queue.length > 0) {
      const body = JSON.stringify({ venue_id: venueId, events: queue });
      navigator.sendBeacon(`${API_BASE}/api/events`, body);
      queue = [];
    }
  });

  // Track app loaded
  track('app_loaded', null, { load_time_ms: Math.round(performance.now()) });
}

// Stop auto-flush
function stop() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flush();
}

export default { start, stop, track, flush, setVenue, getDeviceId, getSessionId };
