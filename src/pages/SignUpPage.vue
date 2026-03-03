<template>
  <div class="q-pa-md">
    <q-form @submit="signUp" class="q-gutter-y-md">
      <q-input
        v-model="displayName"
        label="Display Name"
        :rules="[
          (val) => !!val || 'Display name is required',
          (val) => val.length >= 3 || 'Display name must be at least 3 characters',
        ]"
        filled
      />

      <q-input
        v-model="email"
        label="Email"
        type="email"
        :rules="[
          (val) => !!val || 'Email is required',
          (val) => /.+@.+\..+/.test(val) || 'Please enter a valid email',
        ]"
        filled
      />

      <q-input
        v-model="password"
        label="Password"
        type="password"
        :rules="[
          (val) => !!val || 'Password is required',
          (val) => val.length >= 6 || 'Password must be at least 6 characters',
        ]"
        filled
      />

      <q-input
        v-model="confirmPassword"
        label="Confirm Password"
        type="password"
        :rules="[
          (val) => !!val || 'Please confirm your password',
          (val) => val === password || 'Passwords do not match',
        ]"
        filled
      />

      <q-btn type="submit" color="primary" label="Sign Up" class="full-width" />
    </q-form>
    <div class="q-mt-md text-center">
      Already have an account? <router-link to="/login">Log in</router-link>
    </div>
    <div v-if="error" class="text-negative q-mt-md">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

const displayName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')

const signUp = async () => {
  try {
    error.value = ''

    await authStore.signup({
      email: email.value,
      password: password.value,
      display_name: displayName.value,
      redirect_to: `${window.location.origin}/signup-success`,
    })

    router.push('/signup-success')
  } catch (err) {
    error.value = err.response?.data?.message || err.message
  }
}
</script>

<style lang="scss" scoped>
.q-form {
  max-width: 400px;
  margin: 0 auto;
}
</style>
