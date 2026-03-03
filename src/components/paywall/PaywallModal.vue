<template>
  <q-dialog :model-value="isOpen" @update:model-value="handleDialog">
    <q-card class="q-pa-md" style="min-width: 420px; max-width: 90vw">
      <q-card-section>
        <div class="text-h6">Upgrade BoxBuddy</div>
        <div class="text-caption q-mt-xs">{{ reasonText }}</div>
      </q-card-section>

      <q-card-section>
        <div class="q-mb-sm"><strong>Current plan:</strong> {{ plan.toUpperCase() }}</div>
        <div><strong>Boxes:</strong> {{ usage.box_count }} / {{ formatLimit(limits.max_boxes) }}</div>
        <div><strong>Items:</strong> {{ usage.item_count_total }} / {{ formatLimit(limits.max_items_total) }}</div>
        <div>
          <strong>AI requests (month):</strong>
          {{ usage.ai_requests_used_this_month }} / {{ formatLimit(limits.ai_requests_per_month) }}
        </div>
        <div v-if="remainingMessage" class="text-caption q-mt-sm">{{ remainingMessage }}</div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Not now" @click="closePaywallModal" />
        <q-btn color="primary" label="Upgrade" :loading="checkoutLoading" @click="upgrade" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'
import { createCheckoutSession } from 'src/billing/billing.service'
import { usePaywallStore } from 'src/stores/paywall.store'
import { useSubscriptionStore } from 'src/stores/subscription.store'
import { formatLimit } from 'src/entitlements/subscriptionPlans'

const $q = useQuasar()
const paywallStore = usePaywallStore()
const subscriptionStore = useSubscriptionStore()
const checkoutLoading = ref(false)

const { isOpen, reason, feature } = storeToRefs(paywallStore)
const { plan, usage, limits, remaining } = storeToRefs(subscriptionStore)

const reasonText = computed(() => reason.value || 'This feature is limited on your current subscription tier.')

const recommendedPlan = computed(() => (plan.value === 'free' ? 'pro' : 'power'))

const remainingMessage = computed(() => {
  if (feature.value === 'boxes') {
    return `You have ${formatLimit(remaining.value.boxes)} box creations remaining.`
  }

  if (feature.value === 'items') {
    return `You have ${formatLimit(remaining.value.items)} item creations remaining.`
  }

  return `You have ${formatLimit(remaining.value.ai)} AI requests remaining this month.`
})

const handleDialog = (value) => {
  if (!value) paywallStore.closePaywallModal()
}

const upgrade = async () => {
  checkoutLoading.value = true
  try {
    await createCheckoutSession(recommendedPlan.value)
  } catch (error) {
    console.error('Checkout session failed:', error)
    $q.notify({
      type: 'negative',
      message: 'Unable to start checkout right now. Please try again.',
    })
  } finally {
    checkoutLoading.value = false
  }
}

const closePaywallModal = () => paywallStore.closePaywallModal()
</script>
