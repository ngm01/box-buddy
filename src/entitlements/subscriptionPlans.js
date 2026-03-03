export const PLAN_LIMITS = {
  free: {
    max_boxes: 5,
    max_items_total: 50,
    ai_requests_per_month: 10,
  },
  pro: {
    max_boxes: Number.POSITIVE_INFINITY,
    max_items_total: Number.POSITIVE_INFINITY,
    ai_requests_per_month: 200,
  },
  power: {
    max_boxes: Number.POSITIVE_INFINITY,
    max_items_total: Number.POSITIVE_INFINITY,
    ai_requests_per_month: 1000,
  },
}

export const FEATURE_PLAN_MAP = {
  boxes: 'max_boxes',
  items: 'max_items_total',
  ai: 'ai_requests_per_month',
}

export const normalizePlan = (plan) => {
  if (!plan) return 'free'
  const normalized = String(plan).toLowerCase()
  return PLAN_LIMITS[normalized] ? normalized : 'free'
}

export const formatLimit = (limit) => (Number.isFinite(limit) ? limit : 'Unlimited')
