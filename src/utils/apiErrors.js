export const normalizeApiError = (error) => {
  const status = error?.response?.status
  const payload = error?.response?.data || {}

  if (status === 402 || status === 403) {
    return {
      code: 'ENTITLEMENT_BLOCKED',
      message: payload.message || 'This feature is not available on your current plan.',
      action: 'open_paywall',
      feature: payload.feature || 'ai',
      details: payload,
    }
  }

  return {
    code: payload.code || 'UNKNOWN_ERROR',
    message: payload.message || error?.message || 'Something went wrong. Please try again.',
    action: 'none',
    feature: null,
    details: payload,
  }
}
