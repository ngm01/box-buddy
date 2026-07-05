<template>
  <div class="column items-center q-pa-md q-gutter-y-md">
    <q-icon name="bolt" size="48px" color="amber-8" />

    <div class="text-h6 text-weight-bold text-center">You're out of credits</div>

    <div class="text-body2 text-grey-7 text-center">
      <template v-if="savedPhotoCount > 0">
        Your {{ savedPhotoCount }} photo{{ savedPhotoCount !== 1 ? 's are' : ' is' }} saved.
        Add credits to identify them now, or come back anytime.
      </template>
      <template v-else>
        Add credits to continue identifying items with AI.
      </template>
    </div>

    <div class="full-width q-gutter-y-sm">
      <q-card
        v-for="pack in CREDIT_PACKS"
        :key="pack.id"
        bordered
        flat
        clickable
        :class="['pack-card', pack.featured ? 'pack-featured' : '']"
        :loading="purchasingId === pack.id"
        @click="handlePurchase(pack.id)"
      >
        <q-card-section class="row items-center justify-between q-py-sm">
          <div>
            <div class="row items-center q-gutter-x-sm">
              <div class="text-body1 text-weight-bold">{{ pack.label }}</div>
              <q-badge v-if="pack.featured" color="primary" label="Best value" />
            </div>
            <div class="text-caption text-grey-6">~{{ pack.photos }} photos</div>
          </div>
          <div class="text-body1 text-weight-bold">{{ displayPrice(pack) }}</div>
        </q-card-section>
        <q-inner-loading :showing="purchasingId === pack.id" />
      </q-card>
    </div>

    <a v-if="!isNative" href="mailto:hello@boxbuddy.io" class="text-caption text-grey-6">
      Need more? Contact us
    </a>

    <q-btn
      outline
      no-caps
      label="Maybe later"
      class="full-width"
      @click="$emit('dismiss')"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useCreditsStore } from 'src/stores/credits.store'
import { CREDIT_PACKS } from 'src/constants/credits'
import { isNativePayments, getNativePackPrices } from 'src/services/payments.service'

defineProps({
  savedPhotoCount: { type: Number, default: 0 },
})

const emit = defineEmits(['purchase-complete', 'dismiss'])

const $q = useQuasar()
const creditsStore = useCreditsStore()
const purchasingId = ref(null)
const isNative = isNativePayments()
const nativePrices = ref(null)

onMounted(async () => {
  nativePrices.value = await getNativePackPrices(CREDIT_PACKS.map((p) => p.id))
})

// StoreKit/Play localized price wins on native; constants are the web display.
const displayPrice = (pack) => nativePrices.value?.[pack.id] || `$${pack.price}`

const handlePurchase = async (packId) => {
  if (purchasingId.value) return
  purchasingId.value = packId
  let redirecting = false
  try {
    const result = await creditsStore.purchasePack(packId)
    if (result.status === 'purchased') {
      $q.notify({ type: 'positive', message: `Credits added! New balance: ${result.balance}` })
      emit('purchase-complete')
    } else if (result.status === 'redirect') {
      // Page is navigating to Stripe Checkout — keep the spinner until unload.
      redirecting = true
    }
    // 'cancelled': user backed out of the payment sheet — not an error.
  } catch (err) {
    console.error('Purchase failed:', err)
    $q.notify({ type: 'negative', message: 'Purchase failed. Please try again.' })
  } finally {
    if (!redirecting) purchasingId.value = null
  }
}
</script>

<style scoped>
.pack-card {
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}

.pack-card:hover {
  background: #f5f5f5;
}

.pack-featured {
  border-color: var(--q-primary) !important;
}
</style>
