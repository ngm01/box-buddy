<template>
  <div class="q-pa-md text-center">
    <div class="text-h4 q-mb-lg">Check Your Email</div>

    <div class="text-body1 q-mb-xl">
      We've sent you a confirmation email. Please check your inbox and click the verification link
      to activate your account.
    </div>

    <div class="text-body2 q-mb-md">
      Don't see the email? Check your spam folder or click below to resend.
    </div>

    <q-btn
      color="primary"
      label="Resend Confirmation Email"
      @click="resendEmail"
      :loading="loading"
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
import { ref } from 'vue'
import { supabase } from '../utils/supabase'

const loading = ref(false)
const message = ref('')
const error = ref(false)

const resendEmail = async () => {
  try {
    loading.value = true
    message.value = ''
    error.value = false

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
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
