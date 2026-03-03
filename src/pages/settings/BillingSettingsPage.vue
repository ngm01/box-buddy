<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Billing & Subscription</div>

    <q-card flat bordered class="q-pa-md">
      <div class="text-subtitle1">Current plan: {{ plan.toUpperCase() }}</div>
      <div class="q-mt-sm">Boxes: {{ usage.box_count }} / {{ formatLimit(limits.max_boxes) }}</div>
      <div>Items: {{ usage.item_count_total }} / {{ formatLimit(limits.max_items_total) }}</div>
      <div>
        AI Requests (month): {{ usage.ai_requests_used_this_month }} /
        {{ formatLimit(limits.ai_requests_per_month) }}
      </div>
      <div v-if="currentPeriodEnd" class="q-mt-sm text-caption">
        Next renewal: {{ new Date(currentPeriodEnd).toLocaleDateString() }}
      </div>

      <div class="q-mt-md row q-gutter-sm">
        <q-btn color="primary" label="Upgrade" :loading="checkoutLoading" @click="startCheckout" />
        <q-btn
          outline
          color="primary"
          label="Manage subscription"
          :loading="portalLoading"
          @click="openPortal"
        />
      </div>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { storeToRefs } from 'pinia'
import { createBillingPortalSession, createCheckoutSession } from 'src/billing/billing.service'
import { useSubscriptionStore } from 'src/stores/subscription.store'
import { formatLimit } from 'src/entitlements/subscriptionPlans'

const $q = useQuasar()
const subscriptionStore = useSubscriptionStore()
const { plan, usage, limits, currentPeriodEnd } = storeToRefs(subscriptionStore)

const checkoutLoading = ref(false)
const portalLoading = ref(false)

const startCheckout = async () => {
  checkoutLoading.value = true
  try {
    await createCheckoutSession(plan.value === 'free' ? 'pro' : 'power')
  } catch (error) {
    console.error('Unable to create checkout session:', error)
    $q.notify({
      type: 'negative',
      message: 'Could not open checkout. Please try again in a moment.',
    })
  } finally {
    checkoutLoading.value = false
  }
}

const openPortal = async () => {
  portalLoading.value = true
  try {
    await createBillingPortalSession()
  } catch (error) {
    console.error('Unable to open billing portal:', error)
    $q.notify({
      type: 'negative',
      message: 'Could not open billing portal. Please try again in a moment.',
    })
  } finally {
    portalLoading.value = false
  }
}
</script>
