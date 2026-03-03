<template>
  <div class="q-pa-md text-center">
    <div class="text-h4 q-mb-lg">Check Your Email</div>

    <div class="text-body1 q-mb-xl">
      <template v-if="signupEmail">
        We've sent a confirmation email to <strong>{{ signupEmail }}</strong
        >. Please check your inbox and click the verification link to activate your account.
      </template>
      <template v-else>
        We've sent you a confirmation email. Please check your inbox and click the verification
        link to activate your account.
      </template>
    </div>

    <div class="text-body2 q-mb-md">
      <template v-if="signupEmail">
        Don't see the email for {{ signupEmail }}? Check your spam folder or click below to
        resend.
      </template>
      <template v-else>
        We couldn't determine your signup email. Return to signup and try again.
      </template>
    </div>

    <q-btn
      color="primary"
      label="Resend Confirmation Email"
      @click="resendEmail"
      :loading="loading"
      :disable="!signupEmail"
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
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../utils/supabase'

const route = useRoute()
const loading = ref(false)
const message = ref('')
const error = ref(false)
const signupEmail = computed(() => {
  const email = route.query.email
  return typeof email === 'string' ? email : ''
})

const getSignupSuccessRedirectUrl = () => {
  const baseUrl = process.env.APP_URL || window.location.origin
  return new URL('/signup-success', baseUrl).toString()
}

const resendEmail = async () => {
  if (!signupEmail.value) {
    message.value = 'Missing signup email. Please return to signup and register again.'
    error.value = true
    return
  }

  try {
    loading.value = true
    message.value = ''
    error.value = false

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: signupEmail.value,
      options: {
        emailRedirectTo: getSignupSuccessRedirectUrl(),
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
