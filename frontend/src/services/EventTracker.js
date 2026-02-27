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
let _sessionStartTime = null;

// Session-level aggregate counters (sent with session_ended)
let _sessionStats = {
  games_viewed: 0,
  games_played: 0,
  questions_asked: 0,
  orders_placed: 0,
};

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

// ── Device metadata collection ──

function _detectPlatform() {
  const ua = navigator.userAgent;
  if (/iPad|Macintosh.*Mobile/.test(ua)) return 'Tablet';
  if (/iPhone|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) {
    // Android tablets typically don't have "Mobile" in UA
    return /Mobile/.test(ua) ? 'Android' : 'Tablet';
  }
  return 'Desktop';
}

function _deriveDeviceName() {
  const ua = navigator.userAgent;

  // iOS
  if (/iPhone/.test(ua)) {
    const m = ua.match(/iPhone OS (\d+[_\.]\d+)/);
    const v = m ? m[1].replace('_', '.') : '';
    return `iPhone / iOS ${v}`.trim();
  }
  if (/iPad/.test(ua)) {
    const m = ua.match(/OS (\d+[_\.]\d+)/);
    const v = m ? m[1].replace('_', '.') : '';
    return `iPad / iPadOS ${v}`.trim();
  }

  // Android
  if (/Android/.test(ua)) {
    const modelMatch = ua.match(/;\s*([^;)]+?)\s*(?:Build|[)])/);
    const model = modelMatch ? modelMatch[1].trim() : 'Android Device';
    const vMatch = ua.match(/Android (\d+[\.\d]*)/);
    const v = vMatch ? vMatch[1] : '';
    return `${model} / Android ${v}`.trim();
  }

  // Desktop
  let os = 'Unknown';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/CrOS/.test(ua)) os = 'ChromeOS';

  let browser = 'Unknown';
  if (/Edg\//.test(ua)) {
    const m = ua.match(/Edg\/(\d+)/);
    browser = m ? `Edge ${m[1]}` : 'Edge';
  } else if (/Chrome\//.test(ua)) {
    const m = ua.match(/Chrome\/(\d+)/);
    browser = m ? `Chrome ${m[1]}` : 'Chrome';
  } else if (/Firefox\//.test(ua)) {
    const m = ua.match(/Firefox\/(\d+)/);
    browser = m ? `Firefox ${m[1]}` : 'Firefox';
  } else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) {
    const m = ua.match(/Version\/(\d+[\.\d]*)/);
    browser = m ? `Safari ${m[1]}` : 'Safari';
  }

  return `${os} — ${browser}`;
}

function getDeviceMetadata() {
  return {
    device_name: _deriveDeviceName(),
    platform: _detectPlatform(),
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
    user_agent: navigator.userAgent,
  };
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

  // Update session-level counters
  if (eventType === 'game_selected') _sessionStats.games_viewed++;
  if (eventType === 'session_start') _sessionStats.games_played++;
  if (eventType === 'question_asked') _sessionStats.questions_asked++;
  if (eventType === 'order_placed') _sessionStats.orders_placed++;

  if (queue.length >= MAX_QUEUE_SIZE) {
    flush();
  }
}

// Flush queue to backend
async function flush() {
  if (queue.length === 0) return;

  const batch = [...queue];
  queue = [];

  // Include device metadata on first flush if not yet sent
  let deviceMeta = null;
  const metaSentKey = 'gmai-device-metadata-sent';
  if (!localStorage.getItem(metaSentKey)) {
    deviceMeta = getDeviceMetadata();
  }

  const body = {
    venue_id: venueId,
    events: batch,
  };
  if (deviceMeta) {
    body.device_metadata = deviceMeta;
  }

  try {
    const res = await fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok && res.status !== 404) {
      // Temporary server error — re-queue for next flush
      queue = [...batch, ...queue].slice(-MAX_QUEUE_SIZE);
    } else if (deviceMeta) {
      // Mark metadata as sent on successful flush
      localStorage.setItem(metaSentKey, '1');
    }
    // 404 means endpoint not deployed yet — drop silently, don't re-queue
  } catch {
    // Network error — re-queue for next flush, fail silently
    queue = [...batch, ...queue].slice(-MAX_QUEUE_SIZE);
  }
}

// Build sendBeacon payload (used for unload)
function _buildBeaconPayload(extraEvents = []) {
  const allEvents = [...queue, ...extraEvents];
  if (allEvents.length === 0) return null;

  const body = { venue_id: venueId, events: allEvents };

  // Include device metadata if not yet sent
  if (!localStorage.getItem('gmai-device-metadata-sent')) {
    body.device_metadata = getDeviceMetadata();
  }

  return JSON.stringify(body);
}

// Start auto-flush timer
function start() {
  if (flushTimer) return;
  _sessionStartTime = Date.now();
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);

  // Flush on page unload + send session_ended
  window.addEventListener('beforeunload', () => {
    const sessionEndEvent = {
      event_type: 'session_ended',
      device_id: getDeviceId(),
      session_id: getSessionId(),
      game_id: null,
      timestamp: new Date().toISOString(),
      payload: {
        total_duration_seconds: Math.round((Date.now() - _sessionStartTime) / 1000),
        games_viewed: _sessionStats.games_viewed,
        games_played: _sessionStats.games_played,
        questions_asked: _sessionStats.questions_asked,
        orders_placed: _sessionStats.orders_placed,
      }
    };

    const payload = _buildBeaconPayload([sessionEndEvent]);
    if (payload) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(`${API_BASE}/api/events`, blob);
    }
    queue = [];
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

// Get session stats (for external access, e.g. RouteTracker)
function getSessionStats() {
  return { ..._sessionStats };
}

function getSessionStartTime() {
  return _sessionStartTime;
}

export default { start, stop, track, flush, setVenue, getDeviceId, getSessionId, getDeviceMetadata, getSessionStats, getSessionStartTime };
