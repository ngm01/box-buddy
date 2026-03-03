import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSubscriptionStore } from 'src/stores/subscription.store'
import { usePaywallStore } from 'src/stores/paywall.store'

export const useSubscription = () => {
  const subscriptionStore = useSubscriptionStore()
  const paywallStore = usePaywallStore()

  const { plan, limits, usage, remaining, isPaid, canCreateBox, canCreateItem, canUseAI, currentPeriodEnd } =
    storeToRefs(subscriptionStore)

  const requireEntitlement = ({ feature, reason, details } = {}) => {
    const allowed = subscriptionStore.canUseFeature(feature)

    if (!allowed) {
      paywallStore.openPaywallModal(feature, {
        reason: reason || `Your current plan cannot access ${feature}.`,
        details,
      })
    }

    return allowed
  }

  const canUseFeature = computed(() => subscriptionStore.canUseFeature)

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
    fetchSubscription: subscriptionStore.fetchSubscription,
    setUsageCounts: subscriptionStore.setUsageCounts,
    requireEntitlement,
    openPaywallModal: paywallStore.openPaywallModal,
    closePaywallModal: paywallStore.closePaywallModal,
  }
}
