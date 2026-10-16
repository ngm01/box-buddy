import axios from 'axios'
import { unref } from 'vue'
import { useAuthStore } from 'src/stores/auth.store'

const apiClient = axios.create()

let isHandlingUnauthorized = false

// The iOS app runs the router in hash mode (capacitor://localhost/#/...), where
// location.pathname is always "/" and assigning "/login" leaves the hash route
// untouched. Read and set the route where the active router mode keeps it.
const isHashMode = process.env.VUE_ROUTER_MODE === 'hash'
const currentRoutePath = () =>
  isHashMode ? window.location.hash.replace(/^#/, '').split('?')[0] || '/' : window.location.pathname
const SESSION_EXPIRED_LOGIN = isHashMode
  ? '#/login?message=session-expired'
  : '/login?message=session-expired'

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
        if (currentRoutePath() !== '/login') {
          window.location.assign(SESSION_EXPIRED_LOGIN)
        }
        isHandlingUnauthorized = false
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient
