<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { StatusBar } from '@capacitor/status-bar'

onMounted(() => {
  StatusBar.setBackgroundColor({ color: '#1976D2' })
  StatusBar.setStyle({ style: 'LIGHT' })

  StatusBar.show()
})
</script>
