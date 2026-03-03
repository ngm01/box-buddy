import axios from 'axios'
import { unref } from 'vue'
import { useAuthStore } from 'src/stores/auth.store'

const apiClient = axios.create()

let isHandlingUnauthorized = false

apiClient.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  const token = unref(authStore.token)

  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status

    if (status === 401 && !isHandlingUnauthorized) {
      isHandlingUnauthorized = true

      try {
        const authStore = useAuthStore()
        await authStore.logout()
      } finally {
        if (window.location.pathname !== '/login') {
          window.location.assign('/login?message=session-expired')
        }
        isHandlingUnauthorized = false
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient
