<template>
  <q-page class="q-pa-md column items-center justify-center">
    <q-card flat bordered class="result-card full-width">
      <!-- Confirming (waiting for the Stripe webhook to grant credits) -->
      <q-card-section v-if="state === 'confirming'" class="column items-center q-gutter-y-md q-pa-lg">
        <q-spinner size="48px" color="primary" />
        <div class="text-h6 text-center">Confirming your purchase…</div>
        <div class="text-body2 text-grey-7 text-center">
          This usually takes a few seconds.
        </div>
      </q-card-section>

      <!-- Confirmed -->
      <q-card-section v-else-if="state === 'confirmed'" class="column items-center q-gutter-y-md q-pa-lg">
        <q-icon name="check_circle" size="56px" color="positive" />
        <div class="text-h6 text-center">Credits added!</div>
        <div class="row items-center q-gutter-x-xs">
          <q-icon name="bolt" size="28px" color="amber-8" />
          <div class="text-h5 text-weight-bold">{{ creditsStore.balance }}</div>
          <div class="text-body2 text-grey-7">credits</div>
        </div>
      </q-card-section>

      <!-- Payment received, webhook still pending -->
      <q-card-section v-else-if="state === 'pending'" class="column items-center q-gutter-y-md q-pa-lg">
        <q-icon name="schedule" size="56px" color="amber-8" />
        <div class="text-h6 text-center">Payment received</div>
        <div class="text-body2 text-grey-7 text-center">
          Your credits are on the way and may take a minute to appear.
        </div>
      </q-card-section>

      <!-- Cancelled -->
      <q-card-section v-else class="column items-center q-gutter-y-md q-pa-lg">
        <q-icon name="cancel" size="56px" color="grey-6" />
        <div class="text-h6 text-center">Purchase cancelled</div>
        <div class="text-body2 text-grey-7 text-center">
          No payment was made. You can add credits anytime.
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="center" class="q-pa-md">
        <q-btn
          color="primary"
          unelevated
          no-caps
          label="Back to boxes"
          :disable="state === 'confirming'"
          @click="router.replace('/')"
        />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCreditsStore } from 'src/stores/credits.store'

const route = useRoute()
const router = useRouter()
const creditsStore = useCreditsStore()

const isCancel = route.path.endsWith('/cancel')
const state = ref(isCancel ? 'cancelled' : 'confirming')

onMounted(async () => {
  if (isCancel) return
  // Credits come from the Stripe webhook, never from the client claiming
  // success — poll the balance until the grant lands.
  const { confirmed } = await creditsStore.confirmStripeReturn()
  state.value = confirmed ? 'confirmed' : 'pending'
})
</script>

<style scoped>
.result-card {
  max-width: 420px;
}
</style>
