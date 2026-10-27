<template>
  <div class="q-pa-md text-center">
    <div class="text-h4 q-mb-xl">Box Buddy 📦</div>
    <div class="q-pa-md text-center">
      <q-banner v-if="sessionMessage" class="bg-orange-2 text-orange-10 q-mb-md" rounded>
        {{ sessionMessage }}
      </q-banner>
      <q-form @submit="login" class="q-gutter-y-md">
        <q-input
          autocomplete="email"
          v-model="email"
          label="Email"
          type="email"
          filled
          autocorrect="off"
          spellcheck="false"
          inputmode="email"
          autocapitalize="off"
        />
        <q-input
          autocomplete="current-password"
          v-model="password"
          label="Password"
          type="password"
          filled
          autocorrect="off"
          spellcheck="false"
          inputmode="password"
          autocapitalize="off"
        />
        <q-banner v-if="error" class="bg-red-1 text-negative text-left" rounded>
          <template #avatar><q-icon name="error_outline" color="negative" /></template>
          {{ error }}
          <template v-if="needsConfirmation" #action>
            <q-btn
              flat
              color="primary"
              label="Resend confirmation"
              :to="{ path: '/signup-success', query: { email: email.trim() } }"
            />
          </template>
        </q-banner>
        <q-btn
          type="submit"
          color="primary"
          label="Login"
          class="full-width"
          :loading="isSubmitting"
          :disable="isSubmitting"
        />
      </q-form>
      <div class="q-mt-sm text-right">
        <router-link to="/forgot-password">Forgot password?</router-link>
      </div>
      <div class="q-mt-md text-center">
        Don't have an account? <router-link to="/signup">Sign up</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()

import { useAuthStore } from 'src/stores/auth.store'
const authStore = useAuthStore()

import { friendlyAuthError } from 'src/utils/authErrors'

const email = ref('')
const password = ref('')
const error = ref('')
const needsConfirmation = ref(false)
const isSubmitting = ref(false)

const sessionMessage = computed(() => {
  if (route.query.message === 'session-expired') {
    return 'Your session expired. Please log in again.'
  }

  return ''
})

const login = async () => {
  if (isSubmitting.value) return
  error.value = ''
  needsConfirmation.value = false

  if (!email.value.trim() || !password.value) {
    error.value = 'Enter your email and password.'
    return
  }

  isSubmitting.value = true
  try {
    await authStore.login(email.value.trim(), password.value)
    const redirectTo = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirectTo)
  } catch (err) {
    error.value = friendlyAuthError(err, 'login')
    needsConfirmation.value = err?.code === 'email_not_confirmed'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.q-pa-md {
  max-width: 400px;
  margin: 0 auto;
}
</style>
