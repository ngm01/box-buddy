<template>
  <div class="q-pa-md">
    <q-form @submit="signUp" class="q-gutter-y-md">
      <q-input
        v-model="displayName"
        label="Display Name"
        autocomplete="username"
        hint="Shown in your box links"
        :error="!!displayNameError"
        :error-message="displayNameError"
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
        autocomplete="email"
        autocapitalize="off"
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
        autocomplete="new-password"
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
        autocomplete="new-password"
        :rules="[
          (val) => !!val || 'Please confirm your password',
          (val) => val === password || 'Passwords do not match',
        ]"
        filled
      />

      <q-banner v-if="error" class="bg-red-1 text-negative" rounded>
        <template #avatar><q-icon name="error_outline" color="negative" /></template>
        {{ error }}
        <template v-if="emailTaken" #action>
          <q-btn flat color="primary" label="Log in" to="/login" />
          <q-btn flat color="primary" label="Reset password" to="/forgot-password" />
        </template>
      </q-banner>

      <q-btn
        type="submit"
        color="primary"
        label="Sign Up"
        class="full-width"
        :loading="isSubmitting"
        :disable="isSubmitting"
      />
    </q-form>
    <div class="q-mt-md text-center">Already have an account? <router-link to="/login">Log in</router-link></div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth.store'
import { supabase } from 'src/utils/supabase'
import { getAuthRedirectUrl } from 'src/config/app.config'
import { friendlyAuthError } from 'src/utils/authErrors'

const authStore = useAuthStore()
const router = useRouter()

const displayName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const displayNameError = ref('')
const emailTaken = ref(false)
const isSubmitting = ref(false)

// Clear a server-side complaint as soon as the user edits that field.
watch(displayName, () => (displayNameError.value = ''))
watch(email, () => (emailTaken.value = false))

const signUp = async () => {
  if (isSubmitting.value) return
  error.value = ''
  displayNameError.value = ''
  emailTaken.value = false
  isSubmitting.value = true

  try {
    const name = displayName.value.trim()
    const address = email.value.trim()

    // Validate through a trusted database function so the client only handles UI state.
    const { data: validation, error: validationError } = await supabase.rpc(
      'validate_signup_display_name',
      { p_display_name: name },
    )
    if (validationError) {
      console.error('[signup] display name check failed', validationError)
      error.value = 'We couldn’t check that display name right now. Please try again in a moment.'
      return
    }
    if (!validation?.ok) {
      displayNameError.value = validation?.message || 'Please choose a different display name.'
      return
    }

    const authData = await authStore.signup({
      displayName: name,
      email: address,
      password: password.value,
      redirectTo: getAuthRedirectUrl('/signup-success'),
    })

    if (!authData.ok) {
      const friendly = friendlyAuthError(authData.error, 'signup')
      if (/display name/i.test(friendly)) displayNameError.value = friendly
      else error.value = friendly
      emailTaken.value = ['user_already_exists', 'email_exists'].includes(authData.error?.code)
      return
    }

    // With email confirmation on, Supabase doesn't reveal that an address is
    // already registered: it returns a placeholder user with no identities.
    if (authData.user && authData.user.identities?.length === 0) {
      emailTaken.value = true
      error.value = 'An account with this email already exists. Log in instead.'
      return
    }

    if (!authData.user) {
      error.value = 'We couldn’t create your account. Please try again.'
      return
    }

    // SignUpSuccessPage reads the address from the query to offer a resend.
    await router.push({ path: '/signup-success', query: { email: address } })
  } catch (err) {
    error.value = friendlyAuthError(err, 'signup')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.q-form {
  max-width: 400px;
  margin: 0 auto;
}
</style>
