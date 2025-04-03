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
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth.store'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function handleLogout() {
  authStore.signOut()
  router.push('/login')
}
</script>
