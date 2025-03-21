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

import { useRouter } from 'vue-router'
const router = useRouter()

import { useAuthStore } from 'src/stores/auth.store'
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')

const login = async () => {
  try {
    await authStore.signIn(email.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err.message
  }
}
</script>

<style lang="scss" scoped>
.q-pa-md {
  max-width: 400px;
  margin: 0 auto;
}
</style>
