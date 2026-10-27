import { isAuthRetryableFetchError } from '@supabase/supabase-js'

// Turns Supabase Auth errors into messages a non-technical user can act on.
// The raw error is always logged so the real cause isn't lost.

const MESSAGES = {
  invalid_credentials: 'That email and password don’t match. Check them and try again.',
  email_not_confirmed: 'Please confirm your email first. Check your inbox for the link.',
  user_already_exists: 'An account with this email already exists. Log in instead.',
  email_exists: 'An account with this email already exists. Log in instead.',
  email_address_invalid: 'That email address doesn’t look right. Check it and try again.',
  email_address_not_authorized: 'We can’t send email to that address right now.',
  weak_password: 'That password is too easy to guess. Try a longer one.',
  same_password: 'Your new password must be different from your current one.',
  over_email_send_rate_limit:
    'We’ve sent too many emails in a short time. Please wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a minute and try again.',
  signup_disabled: 'New signups are paused right now. Please try again later.',
  user_banned: 'This account has been suspended.',
  otp_expired: 'This link has expired. Request a new one.',
  session_expired: 'Your session expired. Please log in again.',
  session_not_found: 'Your session expired. Please log in again.',
  request_timeout: 'The request took too long. Please try again.',
}

// Raised by the signup triggers in 202610210001_signup_display_name.sql.
// Supabase usually masks them as "Database error saving new user".
const DB_MESSAGES = {
  display_name_taken: 'That display name is already taken. Try another.',
  display_name_too_short: 'Display name must be at least 3 characters.',
  display_name_required: 'Please choose a display name.',
}

const NETWORK_MESSAGE =
  'Can’t reach Box Buddy right now. Check your internet connection and try again.'
const FALLBACK_MESSAGE = 'Something went wrong. Please try again.'

const isNetworkError = (error) =>
  isAuthRetryableFetchError(error) ||
  error?.name === 'TypeError' ||
  /failed to fetch|network ?error|load failed/i.test(error?.message || '')

export function friendlyAuthError(error, context = 'auth') {
  console.error(`[${context}]`, error)

  if (!error) return FALLBACK_MESSAGE
  if (isNetworkError(error)) return NETWORK_MESSAGE
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]

  const raw = error.message || ''
  const dbKey = Object.keys(DB_MESSAGES).find((key) => raw.includes(key))
  if (dbKey) return DB_MESSAGES[dbKey]
  if (/database error saving new user/i.test(raw)) {
    return 'We couldn’t create your account. Try a different display name, or try again later.'
  }

  // Errors we raise ourselves (e.g. "Current password is incorrect") are
  // already written for users; anything with a status code is Supabase's.
  if (!error.status && !error.code && raw) return raw
  return FALLBACK_MESSAGE
}
