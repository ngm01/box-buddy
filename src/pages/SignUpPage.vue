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
//import { useRouter } from 'vue-router'
//import { useAuthStore } from 'src/stores/auth.store'
import { supabase } from '../utils/supabase'

//const router = useRouter()
//const authStore = useAuthStore()

const displayName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')

const signUp = async () => {
  try {
    error.value = ''

    // Validate through a trusted database function so the client only handles UI state.
    const { data: validation, error: validationError } = await supabase.rpc(
      'validate_signup_display_name',
      {
        p_display_name: displayName.value,
      },
    )

    if (validationError) {
      throw new Error('Unable to validate your display name right now. Please try again.')
    }

    if (!validation?.ok) {
      error.value = validation?.message || 'Display name validation failed'
      return
    }

    // Create the user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          display_name: displayName.value,
        },
      },
      redirectTo: 'http://localhost:9000/signup-success',
    })

    if (authError) throw authError

    if (!authData?.user) {
      throw new Error('Sign up did not return a user. Please try again.')
    }
  } catch (err) {
    const message = err?.message || ''

    if (message.includes('display_name_taken')) {
      error.value = 'Display name is already taken'
      return
    }

    error.value = message || 'Unable to sign up right now. Please try again.'
  }
}
</script>

<style lang="scss" scoped>
.q-form {
  max-width: 400px;
  margin: 0 auto;
}
</style>
