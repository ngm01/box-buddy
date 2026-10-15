import { safeWebBaseUrl } from 'src/config/app.config'

// App path for a box. Names are user-entered, so each segment is encoded:
// a raw space ends the URL for most camera scanners, and '/', '?' or '#'
// would change which route it opens.
export const getBoxPath = (displayName, boxName) =>
  `/boxes/${encodeURIComponent(displayName)}/${encodeURIComponent(boxName)}`

const originOf = (url) => {
  try {
    return new URL(url).origin
  } catch {
    return ''
  }
}

// Keep the origin of the stored qr_code_url (dev and prod share one database,
// so it records which deployment the box was created on) but always rebuild
// the path, so older unencoded URLs still produce a scannable code.
export const getBoxQrValue = (box) => {
  if (box?.display_name && box?.name) {
    const origin = originOf(box.qr_code_url) || safeWebBaseUrl
    return `${origin}${getBoxPath(box.display_name, box.name)}`
  }
  return box?.qr_code_url || ''
}

export const getBoxShortIdentifier = (box) => {
  const id = box?.id
  if (!id) return ''
  return `ID: ${String(id).slice(-8)}`
}
