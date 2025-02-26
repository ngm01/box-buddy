<template>
  <div class="q-pa-md">
    <q-form @submit="login">
      <q-input autocomplete="email" v-model="email" label="Email" type="email" filled />
      <q-input
        autocomplete="current-password"
        v-model="password"
        label="Password"
        type="password"
        filled
      />
      <q-btn type="submit" color="primary" label="Login" />
    </q-form>
    <div v-if="error">
      <h1>{{ error }}</h1>
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

<style lang="scss" scoped></style>
