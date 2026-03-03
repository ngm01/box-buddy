<template>
  <router-view />
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { App as CapacitorApp } from '@capacitor/app'
import { StatusBar } from '@capacitor/status-bar'

const router = useRouter()
let appUrlOpenListener

function getTargetRouteFromDeepLink(urlString) {
  try {
    const incomingUrl = new URL(urlString)
    const incomingPath = incomingUrl.pathname

    if (incomingPath.startsWith('/boxes/')) {
      return incomingPath
    }

    if (incomingUrl.host === 'boxes' && incomingPath.split('/').filter(Boolean).length === 2) {
      return `/boxes${incomingPath}`
    }

    return null
  } catch (error) {
    console.error('Unable to parse deep-link URL', error)
    return null
  }
}

async function routeFromDeepLink(url) {
  const targetRoute = getTargetRouteFromDeepLink(url)

  if (!targetRoute) {
    return
  }

  try {
    await router.push(targetRoute)
  } catch (error) {
    console.error('Unable to navigate from deep-link URL', error)
  }
}

onMounted(() => {
  StatusBar.setBackgroundColor({ color: '#1976D2' })
  StatusBar.setStyle({ style: 'LIGHT' })

  StatusBar.show()

  appUrlOpenListener = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    routeFromDeepLink(url)
  })

  CapacitorApp.getLaunchUrl().then((launchUrl) => {
    if (launchUrl?.url) {
      routeFromDeepLink(launchUrl.url)
    }
  })
})

onBeforeUnmount(() => {
  if (appUrlOpenListener) {
    appUrlOpenListener.remove()
  }
})
</script>
