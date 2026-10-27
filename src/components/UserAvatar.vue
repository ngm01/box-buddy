<template>
  <q-avatar :size="size" color="primary" text-color="white" class="text-weight-medium">
    {{ initial }}
  </q-avatar>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from 'src/stores/auth.store'

defineProps({ size: { type: String, default: '32px' } })

const authStore = useAuthStore()

// Initial-letter avatar until uploaded avatars are decided (see TODO "Avatars").
const initial = computed(() =>
  (authStore.displayName || authStore.user?.email || '?').charAt(0).toUpperCase(),
)
</script>
