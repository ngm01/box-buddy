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
    <div class="q-mt-md text-center">Already have an account? <router-link to="/login">Log in</router-link></div>
    <div v-if="message" class="text-positive q-mt-md">
      {{ message }}
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
import { useQuasar } from 'quasar'

const router = useRouter()
const authStore = useAuthStore()
const $q = useQuasar()

const displayName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const message = ref('')

const getSignupSuccessRedirectUrl = () => {
  const baseUrl = process.env.APP_URL || window.location.origin
  return new URL('/signup-success', baseUrl).toString()
}

const signUp = async () => {
  $q.loading.show()

  try {
    error.value = ''
    message.value = ''

    if (password.value !== confirmPassword.value) {
      error.value = 'Passwords do not match'
      return
    }

    const result = await authStore.signup({
      displayName: displayName.value,
      email: email.value,
      password: password.value,
      redirectTo: `${window.location.origin}/signup-success`,
    })

    if (!result.ok) {
      error.value = result.message
      return
    }

    if (result.requiresEmailVerification) {
      message.value = result.message || 'Please check your email to confirm your account.'
      router.push('/signup-success')
      return
    }

    message.value = result.message || 'Sign up successful.'
    router.push('/')
  } catch (err) {
    error.value = err.message
  } finally {
    $q.loading.hide()
  }
}
</script>

<style lang="scss" scoped>
.q-form {
  max-width: 400px;
  margin: 0 auto;
}
</style>
