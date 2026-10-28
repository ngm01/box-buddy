import axios from 'axios'
import { useAuthStore } from 'src/stores/auth.store'
import { supabase } from 'src/utils/supabase'

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

// getSession() refreshes an expired access token before returning it. The
// copy cached in the auth store can expire while the app is asleep (iOS pauses
// timers), and sending it would turn a still-valid session into a 401 and a
// sign-out.
apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

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
