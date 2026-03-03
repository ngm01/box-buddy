<template>
  <div class="q-pa-md text-center">
    <div class="text-h5 q-mb-md">Choose a new password</div>

    <div v-if="initError" class="text-negative q-mb-md">{{ initError }}</div>

    <q-form v-else @submit="updatePassword" class="q-gutter-y-md">
      <q-input
        v-model="password"
        label="New Password"
        type="password"
        :rules="[
          (val) => !!val || 'Password is required',
          (val) => val.length >= 6 || 'Password must be at least 6 characters',
        ]"
        filled
      />
      <q-input
        v-model="confirmPassword"
        label="Confirm New Password"
        type="password"
        :rules="[
          (val) => !!val || 'Please confirm your password',
          (val) => val === password || 'Passwords do not match',
        ]"
        filled
      />
      <q-btn
        type="submit"
        color="primary"
        label="Update password"
        :loading="loading"
        class="full-width"
      />
    </q-form>

    <div
      v-if="message"
      class="q-mt-md"
      :class="{ 'text-positive': !hasError, 'text-negative': hasError }"
    >
      {{ message }}
    </div>

    <div class="q-mt-lg">
      <router-link to="/login">Back to login</router-link>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from 'src/utils/supabase'

const router = useRouter()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const message = ref('')
const hasError = ref(false)
const initError = ref('')

const initializeRecoverySession = async () => {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  const type = params.get('type')

  if (accessToken && refreshToken && type === 'recovery') {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error) {
      initError.value = 'This password reset link is invalid or expired. Request a new one.'
      return
    }

    window.history.replaceState({}, document.title, router.currentRoute.value.path)
    return
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    initError.value = 'Missing or expired reset session. Request a new password reset email.'
  }
}

const updatePassword = async () => {
  try {
    loading.value = true
    hasError.value = false
    message.value = ''

    const { error } = await supabase.auth.updateUser({ password: password.value })
    if (error) throw error

    message.value = 'Password updated successfully. You can now log in.'
    password.value = ''
    confirmPassword.value = ''
  } catch (err) {
    hasError.value = true
    message.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  initializeRecoverySession()
})
</script>

<style lang="scss" scoped>
.q-pa-md {
  max-width: 420px;
  margin: 0 auto;
}
</style>
