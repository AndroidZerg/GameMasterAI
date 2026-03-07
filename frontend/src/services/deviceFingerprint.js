/**
 * Device Fingerprint — generates a stable browser fingerprint
 * for identifying returning devices at a venue.
 * No external libraries needed.
 */

let cachedFingerprint = null;

async function getDeviceFingerprint() {
  const components = [];

  // Screen properties
  components.push(screen.width + 'x' + screen.height);
  components.push(screen.colorDepth);
  components.push(window.devicePixelRatio);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform || navigator.userAgentData?.platform || 'unknown');

  // Canvas fingerprint (subtle rendering differences between devices)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('GMG-fingerprint', 2, 2);
    components.push(canvas.toDataURL().slice(-50));
  } catch {
    components.push('no-canvas');
  }

  // WebGL renderer (different GPU = different string)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
    }
  } catch {
    components.push('no-webgl');
  }

  // Hash it
  const raw = components.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getDeviceId() {
  if (!cachedFingerprint) {
    cachedFingerprint = await getDeviceFingerprint();
  }
  return cachedFingerprint;
}
