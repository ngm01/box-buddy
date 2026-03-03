<template>
  <q-layout view="lHh lpr lFf">
    <q-header elevated class="q-pa-md q-safe-area-top">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          title="Menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />
        <q-toolbar-title> Box Buddy 📦 </q-toolbar-title>
        <q-btn
          flat
          dense
          round
          icon="logout"
          title="Logout"
          aria-label="Logout"
          :disable="isLoggingOut"
          :loading="isLoggingOut"
          @click="handleLogout"
        />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> Navigation </q-item-label>

        <q-item clickable tag="router-link" to="/boxes">
          <q-item-section avatar>
            <q-icon name="box" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Boxes</q-item-label>
            <q-item-label caption>your boxes</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable tag="router-link" to="/settings/billing">
          <q-item-section avatar>
            <q-icon name="payments" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Billing</q-item-label>
            <q-item-label caption>subscription & limits</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <PaywallModal />
  </q-layout>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth.store'
import { useRouter } from 'vue-router'
import { useSubscriptionStore } from 'src/stores/subscription.store'
import PaywallModal from 'src/components/paywall/PaywallModal.vue'

const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()
const router = useRouter()

const leftDrawerOpen = ref(false)
const isLoggingOut = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

async function handleLogout() {
  if (isLoggingOut.value) return

  isLoggingOut.value = true
  try {
    await authStore.logout()
  } catch (error) {
    console.warn('Logout request failed; continuing sign-out flow.', error)
  } finally {
    isLoggingOut.value = false
    await router.push('/login')
  }
}

onMounted(async () => {
  await subscriptionStore.fetchSubscription()
})
</script>
