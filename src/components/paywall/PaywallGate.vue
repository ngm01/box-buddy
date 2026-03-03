<template>
  <slot v-if="hasAccess" />
  <div v-else class="paywall-gate q-pa-md bg-orange-1 rounded-borders">
    <div class="text-subtitle1">Upgrade required for this feature.</div>
    <div class="text-caption q-mt-xs">
      {{ usageSummary }}
    </div>
    <q-btn
      class="q-mt-sm"
      color="primary"
      label="View plans"
      @click="openPaywallModal(feature, { reason: blockedReason })"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSubscription } from 'src/composables/useSubscription'
import { formatLimit } from 'src/entitlements/subscriptionPlans'

const props = defineProps({
  feature: {
    type: String,
    required: true,
  },
  blockedReason: {
    type: String,
    default: 'Feature limit reached for your plan.',
  },
})

const { canUseFeature, usage, limits, openPaywallModal } = useSubscription()

const hasAccess = computed(() => canUseFeature.value(props.feature))

const usageSummary = computed(() => {
  if (props.feature === 'boxes') {
    return `Boxes used: ${usage.value.box_count}/${formatLimit(limits.value.max_boxes)}`
  }

  if (props.feature === 'items') {
    return `Items used: ${usage.value.item_count_total}/${formatLimit(limits.value.max_items_total)}`
  }

  return `AI used: ${usage.value.ai_requests_used_this_month}/${formatLimit(limits.value.ai_requests_per_month)}`
})
</script>
