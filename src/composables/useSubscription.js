// TEMPORARY STUB — subscription/paywall not yet connected to Supabase.
// Replace this file with the real implementation once subscriptions are set up.
import { computed, ref } from 'vue'

export const useSubscription = () => {
  const plan = ref('free')
  const limits = ref({})
  const usage = ref({ box_count: 0, item_count_total: 0, ai_requests_used_this_month: 0 })
  const remaining = ref({})
  const currentPeriodEnd = ref(null)
  const isPaid = ref(false)
  const canCreateBox = ref(true)
  const canCreateItem = ref(true)
  const canUseAI = ref(true)

  const canUseFeature = computed(() => () => true)
  const requireEntitlement = () => true
  const openPaywallModal = () => {}
  const closePaywallModal = () => {}
  const fetchSubscription = async () => {}
  const setUsageCounts = () => {}

  return {
    plan,
    limits,
    usage,
    remaining,
    currentPeriodEnd,
    isPaid,
    canCreateBox,
    canCreateItem,
    canUseAI,
    canUseFeature,
    fetchSubscription,
    setUsageCounts,
    requireEntitlement,
    openPaywallModal,
    closePaywallModal,
  }
}
