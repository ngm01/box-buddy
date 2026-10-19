<template>
  <q-footer class="bottom-nav">
    <nav class="bottom-nav__grid" aria-label="Main">
      <button
        type="button"
        class="bottom-nav__item"
        :class="{ 'is-active': activeTab === 'boxes' }"
        :aria-current="activeTab === 'boxes' ? 'page' : undefined"
        @click="goToBoxes"
      >
        <q-icon name="inventory_2" class="bottom-nav__icon" />
        Boxes
      </button>
      <!-- Caption under the raised button; the button itself is the accessible control. -->
      <button
        type="button"
        class="bottom-nav__item bottom-nav__scan-label"
        tabindex="-1"
        aria-hidden="true"
        @click="goToScan"
      >
        Scan
      </button>
      <button
        type="button"
        class="bottom-nav__item"
        :class="{ 'is-active': activeTab === 'account' }"
        :aria-current="activeTab === 'account' ? 'page' : undefined"
        @click="router.push('/account')"
      >
        <q-icon name="person" class="bottom-nav__icon" />
        Account
      </button>
      <button type="button" class="bottom-nav__scan" aria-label="Scan a QR code" @click="goToScan">
        <q-icon name="qr_code_scanner" />
      </button>
    </nav>
  </q-footer>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const activeTab = computed(() => (route.path.startsWith('/account') ? 'account' : 'boxes'))

// Each tab keeps its own place: leaving Boxes from a box detail page and tapping
// Boxes again returns to that box. Tapping Boxes while already on it goes to the list.
let lastBoxesPath = '/boxes'
watch(
  () => route.fullPath,
  (path) => {
    if (activeTab.value === 'boxes') lastBoxesPath = path
  },
  { immediate: true },
)

function goToBoxes() {
  router.push(activeTab.value === 'boxes' ? '/boxes' : lastBoxesPath)
}

function goToScan() {
  router.push('/scan')
}
</script>

<style scoped>
.bottom-nav {
  background: #fff;
  color: #777;
  border-top: 1px solid #e5e5e5;
  padding-bottom: env(safe-area-inset-bottom);
}
.bottom-nav__grid {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  height: 62px;
}
.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 100%;
  border: none;
  background: none;
  font: inherit;
  font-size: 12px;
  color: inherit;
  cursor: pointer;
}
.bottom-nav__icon {
  font-size: 24px;
  padding: 2px 16px;
  border-radius: 14px;
}
.bottom-nav__item.is-active {
  color: var(--q-primary);
  font-weight: 500;
}
.bottom-nav__item.is-active .bottom-nav__icon {
  background: #e3eefb;
}
.bottom-nav__scan-label {
  padding-top: 30px;
  color: var(--q-primary);
  font-weight: 500;
}
.bottom-nav__scan {
  position: absolute;
  left: 50%;
  top: -24px;
  transform: translateX(-50%);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 4px solid #fff;
  background: var(--q-primary);
  color: #fff;
  font-size: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4);
  cursor: pointer;
  transition: background 0.15s;
}
.bottom-nav__scan:hover {
  background: #1565c0;
}
</style>
