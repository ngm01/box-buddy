<template>
  <div class="q-pa-md text-center">
    <div class="text-h5 q-mb-md">Reset your password</div>
    <div class="text-body1 q-mb-lg">Enter your account email and we'll send you a reset link.</div>

    <q-form @submit="requestReset" class="q-gutter-y-md">
      <q-input
        v-model="email"
        label="Email"
        type="email"
        autocomplete="email"
        :rules="[(val) => !!val || 'Email is required']"
        filled
      />
      <q-btn type="submit" color="primary" label="Send reset link" :loading="loading" class="full-width" />
    </q-form>

    <div
      v-if="message"
      class="q-mt-md"
      :class="{ 'text-positive': !hasError, 'text-negative': hasError }"
    >
      {{ message }}
    </div>

    <div class="q-mt-lg">
      <router-link to="/login">Back to login</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from 'src/utils/supabase'

const email = ref('')
const loading = ref(false)
const message = ref('')
const hasError = ref(false)

const requestReset = async () => {
  try {
    loading.value = true
    hasError.value = false
    message.value = ''

    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) throw error

    message.value = 'Password reset link sent. Check your email.'
  } catch (err) {
    hasError.value = true
    message.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.q-pa-md {
  max-width: 420px;
  margin: 0 auto;
}
</style>
