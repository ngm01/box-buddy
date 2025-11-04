import { boot } from 'quasar/wrappers'
import { createPinia } from 'pinia'
import { useAuthStore } from 'src/stores/auth.store'

export default boot(({ app }) => {
  const pinia = createPinia()
  app.use(pinia)

  // Initialize auth store
  const authStore = useAuthStore()
  authStore.loadFromStorage()
})
