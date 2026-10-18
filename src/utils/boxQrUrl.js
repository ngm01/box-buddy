import { ALLOWED_PROD_BASE_URLS, safeWebBaseUrl } from 'src/config/app.config'

// Every origin this build could have printed onto a label (see boxes.store createBox).
const BOX_BUDDY_ORIGINS = new Set([...ALLOWED_PROD_BASE_URLS, safeWebBaseUrl])

/**
 * Classifies the raw text of a scanned QR code.
 *
 * Box labels encode `${origin}/boxes/${display_name}/${box_name}`.
 *
 * @param {string} text  decoded QR payload
 * @returns {{ ok: true, displayName: string, boxName: string, path: string }
 *   | { ok: false, reason: 'not_box_buddy' | 'malformed' }}
 */
export function parseBoxQrUrl(text) {
  let url
  try {
    url = new URL(String(text).trim())
  } catch {
    return { ok: false, reason: 'not_box_buddy' }
  }

  if (!BOX_BUDDY_ORIGINS.has(url.origin)) {
    return { ok: false, reason: 'not_box_buddy' }
  }

  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length !== 3 || segments[0] !== 'boxes') {
    return { ok: false, reason: 'malformed' }
  }

  let displayName, boxName
  try {
    displayName = decodeURIComponent(segments[1])
    boxName = decodeURIComponent(segments[2])
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  return {
    ok: true,
    displayName,
    boxName,
    path: `/boxes/${encodeURIComponent(displayName)}/${encodeURIComponent(boxName)}`,
  }
}
