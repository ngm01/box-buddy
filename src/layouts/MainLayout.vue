<template>
  <q-layout view="lHh lpr lFf">
    <q-header elevated class="q-safe-area-top" :class="isMobile ? 'mobile-header' : 'q-pa-md'">
      <q-toolbar>
        <q-btn
          v-if="!isMobile"
          flat
          dense
          round
          icon="menu"
          title="Menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />
        <q-btn
          v-else-if="mobileBackTarget"
          flat
          round
          icon="arrow_back"
          aria-label="Back"
          @click="goBackOr(router, mobileBackTarget)"
        />
        <q-toolbar-title class="ellipsis">{{ headerTitle }}</q-toolbar-title>
        <CreditPill
          v-if="authStore.isAuthenticated"
          :class="{ 'q-mr-sm': !isMobile }"
          @open-credits-sheet="creditsSheetOpen = true"
        />
        <q-btn
          v-if="!isMobile"
          flat
          dense
          round
          icon="logout"
          title="Logout"
          aria-label="Logout"
          :disable="isLoggingOut"
          :loading="isLoggingOut"
          @click="logout"
        />
      </q-toolbar>
    </q-header>

    <q-drawer v-if="!isMobile" v-model="leftDrawerOpen" show-if-above bordered>
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

        <q-item clickable tag="router-link" to="/scan">
          <q-item-section avatar>
            <q-icon name="qr_code_scanner" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Scan</q-item-label>
            <q-item-label caption>open a box from its label</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable tag="router-link" to="/account">
          <q-item-section avatar>
            <q-icon name="person" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Account</q-item-label>
            <q-item-label caption>your account</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <MobileBottomNav v-if="isMobile" />

    <q-page-container>
      <router-view />
      <!-- Keeps the last card clear of the raised Scan button, which overhangs the footer. -->
      <div v-if="isMobile" class="bottom-nav-overhang" />
    </q-page-container>

    <PaywallModal />
    <CreditsSheet v-model:is-open="creditsSheetOpen" />
  </q-layout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth.store'
import { useRoute, useRouter } from 'vue-router'
import { useSubscriptionStore } from 'src/stores/subscription.store'
import { useMobileLayout } from 'src/composables/useMobileLayout'
import { useLogout } from 'src/composables/useLogout'
import { goBackOr } from 'src/utils/navigation'
import PaywallModal from 'src/components/paywall/PaywallModal.vue'
import CreditPill from 'src/components/CreditPill.vue'
import CreditsSheet from 'src/components/CreditsSheet.vue'
import MobileBottomNav from 'src/components/MobileBottomNav.vue'

const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()
const route = useRoute()
const router = useRouter()
const isMobile = useMobileLayout()
const { isLoggingOut, logout } = useLogout()

const leftDrawerOpen = ref(false)
const creditsSheetOpen = ref(false)

const DEFAULT_TITLE = 'Box Buddy 📦'

// On mobile the header names the current screen; box pages get a back arrow.
const headerTitle = computed(() => {
  if (!isMobile.value) return DEFAULT_TITLE
  if (route.params.box_name) return route.params.box_name
  return route.meta.title ?? DEFAULT_TITLE
})

const mobileBackTarget = computed(() => (route.params.box_name ? '/boxes' : null))

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

onMounted(async () => {
  await subscriptionStore.fetchSubscription()
})
</script>

<style scoped>
.mobile-header .q-toolbar {
  min-height: 72px;
  padding: 0 20px 0 12px;
  gap: 8px;
}
.mobile-header .q-toolbar__title {
  font-size: 22px;
}
.bottom-nav-overhang {
  height: 24px;
}
</style>
