import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
// eslint-disable-next-line no-unused-vars
import { supabase } from 'src/utils/supabase'
import { useAuthStore } from 'src/stores/auth.store'
import { FEATURE_PLAN_MAP, PLAN_LIMITS, normalizePlan } from 'src/entitlements/subscriptionPlans'

export const useSubscriptionStore = defineStore('subscription', () => {
  // eslint-disable-next-line no-unused-vars
  const authStore = useAuthStore()

  const plan = ref('free')
  const aiRequestsUsedThisMonth = ref(0)
  const aiRequestsLimitOverride = ref(null)
  const currentPeriodEnd = ref(null)
  const boxCount = ref(0)
  const itemCountTotal = ref(0)
  const loading = ref(false)
  const error = ref(null)

  const limits = computed(() => {
    const baseLimits = PLAN_LIMITS[plan.value] || PLAN_LIMITS.free
    return {
      max_boxes: baseLimits.max_boxes,
      max_items_total: baseLimits.max_items_total,
      ai_requests_per_month: aiRequestsLimitOverride.value || baseLimits.ai_requests_per_month,
    }
  })

  const usage = computed(() => ({
    box_count: boxCount.value,
    item_count_total: itemCountTotal.value,
    ai_requests_used_this_month: aiRequestsUsedThisMonth.value,
  }))

  const remaining = computed(() => ({
    boxes: Number.isFinite(limits.value.max_boxes)
      ? Math.max(limits.value.max_boxes - boxCount.value, 0)
      : Number.POSITIVE_INFINITY,
    items: Number.isFinite(limits.value.max_items_total)
      ? Math.max(limits.value.max_items_total - itemCountTotal.value, 0)
      : Number.POSITIVE_INFINITY,
    ai: Number.isFinite(limits.value.ai_requests_per_month)
      ? Math.max(limits.value.ai_requests_per_month - aiRequestsUsedThisMonth.value, 0)
      : Number.POSITIVE_INFINITY,
  }))

  const isPaid = computed(() => plan.value !== 'free')
  const canCreateBox = computed(
    () => !Number.isFinite(limits.value.max_boxes) || boxCount.value < limits.value.max_boxes,
  )
  const canCreateItem = computed(
    () =>
      !Number.isFinite(limits.value.max_items_total) ||
      itemCountTotal.value < limits.value.max_items_total,
  )
  const canUseAI = computed(
    () =>
      !Number.isFinite(limits.value.ai_requests_per_month) ||
      aiRequestsUsedThisMonth.value < limits.value.ai_requests_per_month,
  )

  const canUseFeature = (feature) => {
    if (feature === 'boxes') return canCreateBox.value
    if (feature === 'items') return canCreateItem.value
    if (feature === 'ai') return canUseAI.value
    return true
  }

  const hydrateFromProfile = (profile = {}) => {
    plan.value = normalizePlan(profile.plan)
    aiRequestsUsedThisMonth.value = Number(profile.ai_requests_used_this_month || 0)
    aiRequestsLimitOverride.value = profile.ai_requests_limit || null
    currentPeriodEnd.value = profile.current_period_end || null
    boxCount.value = Number(profile.box_count || 0)
    itemCountTotal.value = Number(profile.item_count_total || 0)
  }

  // TEMPORARY: subscriptions not yet set up in Supabase — no-op until profiles table exists.
  const fetchSubscription = async () => {}

  const setUsageCounts = ({ boxCount: nextBoxCount, itemCountTotal: nextItemCount } = {}) => {
    if (typeof nextBoxCount === 'number') {
      boxCount.value = nextBoxCount
    }

    if (typeof nextItemCount === 'number') {
      itemCountTotal.value = nextItemCount
    }
  }

  const getLimitForFeature = (feature) => limits.value[FEATURE_PLAN_MAP[feature]]

  return {
    plan,
    limits,
    usage,
    remaining,
    isPaid,
    canCreateBox,
    canCreateItem,
    canUseAI,
    currentPeriodEnd,
    loading,
    error,
    canUseFeature,
    fetchSubscription,
    hydrateFromProfile,
    setUsageCounts,
    getLimitForFeature,
  }
})
