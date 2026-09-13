const CANONICAL_WEB_BASE_URL = 'https://boxbuddy.io'

// Origins a production build may encode into QR codes. QR codes get printed and
// stuck on physical boxes, so a misconfigured build must never be able to bake
// in a localhost or preview URL — but the dev environment is a deliberate, known
// destination. Drop the dev origin from this list once it is retired.
const ALLOWED_PROD_BASE_URLS = [CANONICAL_WEB_BASE_URL, 'https://dev.boxbuddy.io']

const normalizeBaseUrl = (value) => {
  if (!value) return ''
  const trimmed = String(value).trim()
  if (!trimmed) return ''

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(withProtocol)
    return parsed.origin
  } catch {
    return ''
  }
}

const logConfigIssue = ({ level = 'warn', code, message, details = {} }) => {
  const payload = {
    scope: 'app-config',
    code,
    message,
    details,
  }

  if (level === 'error') {
    console.error(payload)
    return
  }

  console.warn(payload)
}

const isProduction = process.env.NODE_ENV === 'production'
const rawWebBaseUrl = process.env.WEB_BASE_URL
const rawDomain = process.env.DOMAIN

const resolvedFromWebBase = normalizeBaseUrl(rawWebBaseUrl)
const resolvedFromDomain = normalizeBaseUrl(rawDomain)

const hasExplicitBaseConfig = Boolean(rawWebBaseUrl || rawDomain)

const getCanonicalWebBaseUrl = () => {
  if (isProduction) {
    const requested = resolvedFromWebBase || resolvedFromDomain

    if (!requested) return CANONICAL_WEB_BASE_URL
    if (ALLOWED_PROD_BASE_URLS.includes(requested)) return requested

    logConfigIssue({
      code: 'PROD_BASE_URL_REJECTED',
      message:
        'WEB_BASE_URL/DOMAIN is not an approved production origin. Using canonical base URL instead.',
      details: {
        nodeEnv: process.env.NODE_ENV,
        rawWebBaseUrl,
        rawDomain,
        requested,
        allowed: ALLOWED_PROD_BASE_URLS,
        canonical: CANONICAL_WEB_BASE_URL,
      },
    })

    return CANONICAL_WEB_BASE_URL
  }

  if (resolvedFromWebBase) return resolvedFromWebBase
  if (resolvedFromDomain) return resolvedFromDomain

  logConfigIssue({
    code: 'BASE_URL_CONFIG_MISSING',
    message: 'Missing WEB_BASE_URL/DOMAIN. Falling back to canonical base URL.',
    details: {
      nodeEnv: process.env.NODE_ENV,
      rawWebBaseUrl,
      rawDomain,
      fallback: CANONICAL_WEB_BASE_URL,
    },
  })

  return CANONICAL_WEB_BASE_URL
}

const safeWebBaseUrl = getCanonicalWebBaseUrl()

const getQrBaseUrlOrThrow = () => {
  if (!isProduction && !hasExplicitBaseConfig) {
    logConfigIssue({
      level: 'error',
      code: 'BASE_URL_REQUIRED_FOR_QR',
      message: 'WEB_BASE_URL or DOMAIN is required to create QR URLs outside production.',
      details: {
        nodeEnv: process.env.NODE_ENV,
        rawWebBaseUrl,
        rawDomain,
      },
    })

    throw new Error('Application configuration error: WEB_BASE_URL (or DOMAIN) must be set before creating box QR URLs.')
  }

  return safeWebBaseUrl
}

export { CANONICAL_WEB_BASE_URL, safeWebBaseUrl, getQrBaseUrlOrThrow }
