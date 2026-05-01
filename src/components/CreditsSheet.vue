<template>
  <q-dialog v-model="isOpen" position="bottom" full-width @show="onOpen">
    <q-card class="credits-sheet column no-wrap">
      <!-- Drag handle -->
      <div class="drag-handle-row">
        <div class="drag-handle" />
      </div>

      <!-- Header -->
      <div class="row items-center justify-between q-px-md q-pb-sm">
        <div class="text-h6">Credits</div>
        <q-btn flat round dense icon="close" aria-label="Close" v-close-popup />
      </div>

      <q-separator />

      <!-- Scrollable body -->
      <div class="col overflow-auto q-pa-md">
        <!-- Balance -->
        <div class="column items-center q-py-md q-mb-sm">
          <div class="row items-center q-gutter-x-xs">
            <q-icon name="bolt" size="40px" color="amber-8" />
            <div class="text-h3 text-weight-bold">{{ creditsStore.balance ?? '–' }}</div>
          </div>
          <div class="text-caption text-grey-6 q-mt-xs">credits remaining</div>
        </div>

        <q-separator class="q-mb-md" />

        <!-- Transaction history -->
        <div class="text-overline text-grey-6 q-mb-sm">History</div>

        <div v-if="loading" class="q-gutter-y-sm">
          <q-skeleton v-for="i in 3" :key="i" type="rect" height="48px" />
        </div>

        <div
          v-else-if="creditsStore.transactions.length === 0"
          class="text-caption text-grey-5 text-center q-py-lg"
        >
          No transactions yet
        </div>

        <q-list v-else separator>
          <q-item v-for="tx in creditsStore.transactions" :key="tx.id" dense>
            <q-item-section>
              <q-item-label>{{ reasonLabel(tx.reason) }}</q-item-label>
              <q-item-label caption>{{ formatDate(tx.created_at) }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label :class="tx.amount > 0 ? 'text-positive' : 'text-grey-7'">
                {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <q-separator class="q-my-md" />

        <!-- Pack purchase -->
        <div class="text-overline text-grey-6 q-mb-sm">Add credits</div>

        <div class="q-gutter-y-sm q-mb-md">
          <q-card
            v-for="pack in CREDIT_PACKS"
            :key="pack.id"
            clickable
            bordered
            flat
            :class="['pack-card', pack.featured ? 'pack-featured' : '']"
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
          </q-card>
        </div>

        <div class="text-center">
          <a href="mailto:hello@boxbuddy.io" class="text-caption text-grey-6">
            Need a custom plan? Contact us
          </a>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useCreditsStore } from 'src/stores/credits.store'
import { CREDIT_PACKS, REASON_LABELS } from 'src/constants/credits'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
})
const emit = defineEmits(['update:isOpen'])

const $q = useQuasar()
const creditsStore = useCreditsStore()
const loading = ref(false)

// Two-way binding for v-model:is-open
import { computed } from 'vue'
const isOpen = computed({
  get: () => props.isOpen,
  set: (val) => emit('update:isOpen', val),
})

const onOpen = async () => {
  loading.value = true
  try {
    await creditsStore.fetchHistory()
  } finally {
    loading.value = false
  }
}

const reasonLabel = (reason) => REASON_LABELS[reason] || reason

const formatDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const handlePurchase = async (packId) => {
  try {
    const result = await creditsStore.purchasePack(packId)
    if (result.stubbed) {
      $q.notify({ type: 'positive', message: `Credits added! New balance: ${result.balance}` })
    }
  } catch (err) {
    console.error('Purchase failed:', err)
    $q.notify({ type: 'negative', message: 'Purchase failed. Please try again.' })
  }
}
</script>

<style scoped>
.credits-sheet {
  max-height: 85vh;
  max-height: 85dvh;
  border-radius: 16px 16px 0 0;
}

.drag-handle-row {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
}

.drag-handle {
  width: 36px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
}

.pack-card {
  cursor: pointer;
  transition: background 0.15s;
}

.pack-card:hover {
  background: #f5f5f5;
}

.pack-featured {
  border-color: var(--q-primary) !important;
}
</style>
