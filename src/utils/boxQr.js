import { safeWebBaseUrl } from 'src/config/app.config'

// Use stored qr_code_url if available; otherwise derive it from box identifiers.
// qr_code_url may be null on boxes fetched directly from Supabase before the
// URL was ever persisted.
export const getBoxQrValue = (box) => {
  if (box?.qr_code_url) return box.qr_code_url
  if (box?.display_name && box?.name) {
    return `${safeWebBaseUrl}/boxes/${box.display_name}/${box.name}`
  }
  return ''
}

export const getBoxShortIdentifier = (box) => {
  const id = box?.id
  if (!id) return ''
  return `ID: ${String(id).slice(-8)}`
}
