<template>
  <q-chip
    v-if="creditsStore.isLoaded"
    clickable
    :class="chipClass"
    class="credit-pill"
    aria-label="View credits"
    @click="$emit('open-credits-sheet')"
  >
    <q-icon name="bolt" size="16px" class="q-mr-xs" />
    <span>{{ creditsStore.balance }}</span>
  </q-chip>

  <q-skeleton v-else type="QChip" width="56px" />
</template>

<script setup>
import { computed } from 'vue'
import { useCreditsStore } from 'src/stores/credits.store'

defineEmits(['open-credits-sheet'])

const creditsStore = useCreditsStore()

const chipClass = computed(() => {
  if (creditsStore.isEmpty) return 'pill-empty'
  if (creditsStore.isLow) return 'pill-low'
  return 'pill-normal'
})
</script>

<style scoped>
.credit-pill {
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  user-select: none;
}

.pill-normal {
  background-color: #fff8e1;
  color: #ff6f00;
}

.pill-low {
  background-color: #ffccbc;
  color: #bf360c;
  animation: pulse 2s infinite;
}

.pill-empty {
  background-color: #ffcdd2;
  color: #b71c1c;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
