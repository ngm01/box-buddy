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
          <div class="text-body1 text-weight-bold">${{ pack.price }}</div>
        </q-card-section>
        <q-inner-loading :showing="purchasingId === pack.id" />
      </q-card>
    </div>

    <a href="mailto:hello@boxbuddy.io" class="text-caption text-grey-6">
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
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useCreditsStore } from 'src/stores/credits.store'
import { CREDIT_PACKS } from 'src/constants/credits'

defineProps({
  savedPhotoCount: { type: Number, default: 0 },
})

const emit = defineEmits(['purchase-complete', 'dismiss'])

const $q = useQuasar()
const creditsStore = useCreditsStore()
const purchasingId = ref(null)

const handlePurchase = async (packId) => {
  if (purchasingId.value) return
  purchasingId.value = packId
  try {
    const result = await creditsStore.purchasePack(packId)
    if (result.stubbed) {
      $q.notify({ type: 'positive', message: `Credits added! New balance: ${result.balance}` })
      emit('purchase-complete')
    }
    // When Stripe is live: purchasePack redirects; component listens for
    // visibility change / URL param on return, then refetches balance.
  } catch (err) {
    console.error('Purchase failed:', err)
    $q.notify({ type: 'negative', message: 'Purchase failed. Please try again.' })
  } finally {
    purchasingId.value = null
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
