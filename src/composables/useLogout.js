import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth.store'
import { useCreditsStore } from 'src/stores/credits.store'

export function useLogout() {
  const authStore = useAuthStore()
  const creditsStore = useCreditsStore()
  const router = useRouter()

  const isLoggingOut = ref(false)

  async function logout() {
    if (isLoggingOut.value) return

    isLoggingOut.value = true
    try {
      await authStore.logout()
      creditsStore.reset()
    } catch (error) {
      console.warn('Logout request failed; continuing sign-out flow.', error)
    } finally {
      isLoggingOut.value = false
      await router.push('/login')
    }
  }

  return { isLoggingOut, logout }
}
