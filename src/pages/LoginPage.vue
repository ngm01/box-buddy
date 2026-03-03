<template>
  <div class="q-pa-md text-center">
    <div class="text-h4 q-mb-xl">Box Buddy 📦</div>
    <div class="q-pa-md text-center">
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
        <q-btn type="submit" color="primary" label="Login" class="full-width" />
      </q-form>
      <div class="q-mt-sm text-right">
        <router-link to="/forgot-password">Forgot password?</router-link>
      </div>
      <div class="q-mt-md text-center">
        Don't have an account? <router-link to="/signup">Sign up</router-link>
      </div>
      <div v-if="error">
        <h1>{{ error }}</h1>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

import { useRoute, useRouter } from 'vue-router'
const router = useRouter()
const route = useRoute()

import { useAuthStore } from 'src/stores/auth.store'
const authStore = useAuthStore()

import { useQuasar } from 'quasar'
const $q = useQuasar()

const email = ref('')
const password = ref('')
const error = ref('')

const login = async () => {
  $q.loading.show()

  try {
    console.log('Attempting login with:', email.value)
    await authStore.login(email.value, password.value)
    const redirectTo = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirectTo)
  } catch (err) {
    error.value = err.message
  } finally {
    $q.loading.hide()
  }
}
</script>

<style lang="scss" scoped>
.q-pa-md {
  max-width: 400px;
  margin: 0 auto;
}
</style>
