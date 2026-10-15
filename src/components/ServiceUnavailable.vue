<template>
  <div class="fullscreen bg-white text-dark column flex-center text-center q-pa-lg" role="alert">
    <q-icon name="cloud_off" size="64px" color="grey-6" />
    <div class="text-h5 q-mt-md">We're having technical difficulties</div>
    <div class="text-body1 text-grey-8 q-mt-sm service-unavailable__message">
      Box Buddy can't reach its servers right now. Please try again in a moment. If the problem
      continues, contact support at
      <a :href="`mailto:${SUPPORT_EMAIL}`" class="text-primary">{{ SUPPORT_EMAIL }}</a
      >.
    </div>
    <q-btn
      class="q-mt-lg"
      color="primary"
      icon="refresh"
      label="Try again"
      :loading="retrying"
      @click="retry"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const SUPPORT_EMAIL = 'support@boxbuddy.io'

const retrying = ref(false)

// A reload is the reliable recovery: it re-runs the session check and
// refetches whatever page data failed while the backend was down.
const retry = () => {
  retrying.value = true
  window.location.reload()
}
</script>

<style scoped>
.service-unavailable__message {
  max-width: 420px;
}
</style>
