<template>
  <q-page class="account-page column">
    <h1 class="account-page__title">Account</h1>

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

    <div class="account-page__future">More account settings coming later.</div>

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
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useLogout } from 'src/composables/useLogout'
import MessageDialog from 'src/components/MessageDialog.vue'

const { isLoggingOut, logout } = useLogout()
const confirmOpen = ref(false)

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
.account-page__future {
  margin-top: auto;
  padding-top: 24px;
  font-size: 13px;
  color: #aaa;
  text-align: center;
}
</style>
