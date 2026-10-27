<template>
  <div class="q-pa-md text-center">
    <div v-if="state === 'checking'" class="q-py-xl">
      <q-spinner color="primary" size="40px" />
    </div>

    <template v-else-if="state === 'confirmed'">
      <q-icon name="check_circle" color="positive" size="64px" class="q-mb-md" />
      <div class="text-h4 q-mb-lg">Email confirmed</div>
      <div class="text-body1 q-mb-xl">Your account is ready and you're signed in.</div>
      <q-btn color="primary" label="Go to my boxes" to="/boxes" />
    </template>

    <template v-else>
      <template v-if="state === 'link-error'">
        <q-icon name="error_outline" color="negative" size="64px" class="q-mb-md" />
        <div class="text-h4 q-mb-lg">Link expired</div>
        <div class="text-body1 q-mb-xl">
          This confirmation link is invalid or has expired. Enter your email to get a new one.
        </div>
      </template>
      <template v-else>
        <div class="text-h4 q-mb-lg">Check Your Email</div>
        <div class="text-body1 q-mb-xl">
          <template v-if="signupEmail">
            We've sent a confirmation email to <strong>{{ signupEmail }}</strong
            >. Please check your inbox and click the verification link to activate your account.
          </template>
          <template v-else>
            We've sent you a confirmation email. Please check your inbox and click the
            verification link to activate your account.
          </template>
        </div>
        <div v-if="signupEmail" class="text-body2 q-mb-md">
          Don't see the email for {{ signupEmail }}? Check your spam folder or click below to
          resend.
        </div>
      </template>

      <q-input
        v-if="!signupEmail"
        v-model="typedEmail"
        label="Email"
        type="email"
        autocomplete="email"
        filled
        class="q-mb-md"
      />

      <q-btn
        color="primary"
        label="Resend Confirmation Email"
        @click="resendEmail"
        :loading="loading"
        :disable="!resendTo || loading"
      />

      <div
        v-if="message"
        class="q-mt-md"
        :class="{ 'text-positive': !error, 'text-negative': error }"
      >
        {{ message }}
      </div>

      <div class="q-mt-xl">
        <router-link to="/login" class="text-primary">Return to Login</router-link>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../utils/supabase'
import { getAuthRedirectUrl } from 'src/config/app.config'

const route = useRoute()
const loading = ref(false)
const message = ref('')
const error = ref(false)
const typedEmail = ref('')
// 'checking' | 'check-email' | 'confirmed' | 'link-error'
const state = ref('checking')

const signupEmail = computed(() => {
  const email = route.query.email
  return typeof email === 'string' ? email : ''
})
const resendTo = computed(() => signupEmail.value || typedEmail.value.trim())

// This page is both where signup sends the user ("check your email") and where
// the confirmation link lands. A valid link signs the user in (supabase-js
// reads the tokens from the URL); a bad one comes back with error params in
// the hash or query, e.g. #error_code=otp_expired.
onMounted(async () => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const linkError =
    hashParams.get('error_code') ||
    hashParams.get('error') ||
    route.query.error_code ||
    route.query.error

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) state.value = 'confirmed'
  else if (linkError) state.value = 'link-error'
  else state.value = 'check-email'
})

const resendEmail = async () => {
  if (!resendTo.value) return

  try {
    loading.value = true
    message.value = ''
    error.value = false

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: resendTo.value,
      options: {
        emailRedirectTo: getAuthRedirectUrl('/signup-success'),
      },
    })

    if (resendError) throw resendError

    message.value = 'Confirmation email has been resent!'
  } catch (err) {
    message.value = err.message
    error.value = true
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.q-pa-md {
  max-width: 600px;
  margin: 0 auto;
}
</style>
