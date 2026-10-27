<template>
  <q-btn flat no-caps class="account-menu" aria-label="Account menu">
    <UserAvatar size="30px" />
    <span class="account-menu__greeting q-ml-sm">Hello, {{ name }}</span>
    <q-icon name="arrow_drop_down" />

    <q-menu anchor="bottom right" self="top right" :offset="[0, 6]">
      <q-list style="min-width: 220px">
        <q-item>
          <q-item-section avatar>
            <UserAvatar size="40px" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ name }}</q-item-label>
            <q-item-label caption class="ellipsis">{{ authStore.user?.email }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-separator />
        <q-item v-close-popup clickable to="/account">
          <q-item-section avatar><q-icon name="person" /></q-item-section>
          <q-item-section>Account</q-item-section>
        </q-item>
        <q-item v-close-popup clickable @click="$emit('open-credits-sheet')">
          <q-item-section avatar><q-icon name="bolt" /></q-item-section>
          <q-item-section>Buy credits</q-item-section>
        </q-item>
        <q-separator />
        <q-item v-close-popup clickable :disable="isLoggingOut" @click="logout">
          <q-item-section avatar>
            <q-spinner v-if="isLoggingOut" size="20px" />
            <q-icon v-else name="logout" />
          </q-item-section>
          <q-item-section>Log out</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from 'src/stores/auth.store'
import { useLogout } from 'src/composables/useLogout'
import UserAvatar from 'src/components/UserAvatar.vue'

defineEmits(['open-credits-sheet'])

const authStore = useAuthStore()
const { isLoggingOut, logout } = useLogout()

const name = computed(() => authStore.displayName || authStore.user?.email || '')
</script>

<style scoped>
.account-menu__greeting {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
