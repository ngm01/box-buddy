<template>
  <q-page class="account-page column">
    <h1 class="account-page__title">Account</h1>
    <q-item class="q-mt-md q-px-none">
      <q-item-section avatar>
        <UserAvatar size="48px" />
      </q-item-section>
      <q-item-section>
        <q-item-label class="text-weight-medium">
          Logged in as {{ authStore.displayName || authStore.user?.email }}
        </q-item-label>
        <q-item-label v-if="authStore.displayName" caption>
          {{ authStore.user?.email }}
        </q-item-label>
      </q-item-section>
    </q-item>

    <q-card flat bordered class="q-mt-lg">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium">Change email</div>
        <q-banner v-if="pendingEmail" dense rounded class="bg-blue-1 q-mt-sm">
          Changing to <strong>{{ pendingEmail }}</strong>. Click the confirmation link sent to
          {{ pendingEmail }}<template v-if="authStore.user?.email">
            and the one sent to {{ authStore.user.email }}</template
          >. The change applies once both are confirmed.
        </q-banner>
        <q-form ref="emailForm" class="q-mt-sm" @submit="handleChangeEmail">
          <q-input
            v-model="newEmail"
            label="New email"
            type="email"
            autocomplete="email"
            filled
            :disable="isSavingEmail"
            :rules="[
              (val) => !!val || 'Email is required',
              (val) => /.+@.+\..+/.test(val) || 'Enter a valid email',
              (val) => val.trim() !== authStore.user?.email || 'That is your current email',
            ]"
          />
          <q-btn
            type="submit"
            color="primary"
            label="Send confirmation link"
            :loading="isSavingEmail"
            :disable="isSavingEmail"
          />
        </q-form>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="q-mt-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium">Change password</div>
        <q-form ref="passwordForm" class="q-mt-sm" @submit="handleChangePassword">
          <q-input
            v-model="currentPassword"
            label="Current password"
            type="password"
            autocomplete="current-password"
            filled
            :disable="isSavingPassword"
            :rules="[(val) => !!val || 'Current password is required']"
          />
          <q-input
            v-model="newPassword"
            label="New password"
            type="password"
            autocomplete="new-password"
            filled
            :disable="isSavingPassword"
            :rules="[
              (val) => !!val || 'Password is required',
              (val) => val.length >= 6 || 'Password must be at least 6 characters',
            ]"
          />
          <q-input
            v-model="confirmPassword"
            label="Confirm new password"
            type="password"
            autocomplete="new-password"
            filled
            :disable="isSavingPassword"
            :rules="[
              (val) => !!val || 'Please confirm your password',
              (val) => val === newPassword || 'Passwords do not match',
            ]"
          />
          <q-btn
            type="submit"
            color="primary"
            label="Update password"
            :loading="isSavingPassword"
            :disable="isSavingPassword"
          />
        </q-form>
      </q-card-section>
    </q-card>

    <button
      type="button"
      class="account-page__logout"
      :disabled="isLoggingOut"
      @click="confirmOpen = true"
    >
      <q-spinner v-if="isLoggingOut" size="20px" />
      <q-icon v-else name="logout" size="22px" />
      Log out
    </button>

    <q-btn
      flat
      color="negative"
      icon="delete_forever"
      label="Delete account"
      class="q-mt-xl"
      :disable="isDeleting"
      @click="openDeleteDialog"
    />

    <MessageDialog
      v-model="confirmOpen"
      title="Log out of Box Buddy?"
      message="You'll need to sign in again to see your boxes."
    >
      <template #actions>
        <q-btn flat color="primary" label="Cancel" v-close-popup />
        <q-btn flat color="negative" label="Log out" @click="handleLogout" />
      </template>
    </MessageDialog>

    <q-dialog v-model="deleteOpen" :persistent="isDeleting">
      <q-card class="account-page__delete-card">
        <q-card-section>
          <div class="text-h6">Delete your account?</div>
          <p class="q-mt-sm q-mb-none">
            This permanently deletes all your boxes, items and remaining credits. It can't be
            undone.
          </p>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="deleteConfirmText"
            label="Type DELETE to confirm"
            filled
            autofocus
            :disable="isDeleting"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" :disable="isDeleting" v-close-popup />
          <q-btn
            flat
            color="negative"
            label="Delete account"
            :loading="isDeleting"
            :disable="deleteConfirmText !== 'DELETE' || isDeleting"
            @click="handleDeleteAccount"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth.store'
import { useLogout } from 'src/composables/useLogout'
import MessageDialog from 'src/components/MessageDialog.vue'
import UserAvatar from 'src/components/UserAvatar.vue'
import { friendlyAuthError } from 'src/utils/authErrors'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const { isLoggingOut, logout } = useLogout()
const confirmOpen = ref(false)

const errorText = (error) => friendlyAuthError(error, 'account')

// Supabase sets new_email on the user until the confirmation link is clicked.
const pendingEmail = computed(() => authStore.user?.new_email || '')

// Email-change links land here. With "Secure email change" on, the first of
// the two links comes back with #message=...; a bad link with
// #error_description=.... (A completed change carries tokens instead, which
// supabase-js consumes.)
onMounted(async () => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const linkMessage = params.get('message')
  const linkError = params.get('error_description')
  if (linkMessage || linkError) {
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  const emailBefore = authStore.user?.email
  try {
    await authStore.refreshUser()
  } catch (error) {
    console.warn('Could not refresh account details', error)
  }

  if (linkError) {
    $q.notify({ type: 'negative', message: `Email change failed: ${linkError}`, timeout: 8000 })
  } else if (linkMessage) {
    $q.notify({ type: 'info', message: linkMessage, timeout: 8000 })
  } else if (emailBefore && authStore.user?.email !== emailBefore) {
    $q.notify({ type: 'positive', message: `Email changed to ${authStore.user.email}` })
  }
})

const emailForm = ref(null)
const newEmail = ref('')
const isSavingEmail = ref(false)

async function handleChangeEmail() {
  if (isSavingEmail.value) return
  isSavingEmail.value = true
  try {
    const email = newEmail.value.trim()
    await authStore.updateEmail(email)
    newEmail.value = ''
    await nextTick()
    emailForm.value?.resetValidation()
    $q.notify({
      type: 'positive',
      message: `Check ${email} for a confirmation link`,
      caption: 'Your old address may get one too. The change applies once confirmed.',
      timeout: 8000,
    })
  } catch (error) {
    $q.notify({ type: 'negative', message: `Could not change email: ${errorText(error)}` })
  } finally {
    isSavingEmail.value = false
  }
}

const passwordForm = ref(null)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isSavingPassword = ref(false)

async function handleChangePassword() {
  if (isSavingPassword.value) return
  isSavingPassword.value = true
  try {
    await authStore.updatePassword(currentPassword.value, newPassword.value)
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    await nextTick()
    passwordForm.value?.resetValidation()
    $q.notify({ type: 'positive', message: 'Password updated' })
  } catch (error) {
    $q.notify({ type: 'negative', message: `Could not update password: ${errorText(error)}` })
  } finally {
    isSavingPassword.value = false
  }
}

const deleteOpen = ref(false)
const deleteConfirmText = ref('')
const isDeleting = ref(false)

function openDeleteDialog() {
  deleteConfirmText.value = ''
  deleteOpen.value = true
}

async function handleDeleteAccount() {
  if (isDeleting.value || deleteConfirmText.value !== 'DELETE') return
  isDeleting.value = true
  try {
    await authStore.deleteAccount()
    deleteOpen.value = false
    $q.notify({ type: 'positive', message: 'Your account has been deleted' })
    await router.push('/login')
  } catch (error) {
    $q.notify({ type: 'negative', message: `Could not delete account: ${errorText(error)}` })
  } finally {
    isDeleting.value = false
  }
}

async function handleLogout() {
  confirmOpen.value = false
  await logout()
}
</script>

<style scoped>
.account-page {
  padding: 24px 16px;
  max-width: 600px;
}
.account-page__title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}
.account-page__logout {
  margin-top: 20px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid #f1c4c4;
  border-radius: 6px;
  background: #fff;
  color: #d32f2f;
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}
.account-page__logout:hover {
  background: #fdecea;
}
.account-page__logout:disabled {
  cursor: default;
  opacity: 0.7;
}
.account-page__delete-card {
  width: 100%;
  max-width: 380px;
}
.account-page .q-form .q-btn {
  margin-top: 4px;
}
</style>
