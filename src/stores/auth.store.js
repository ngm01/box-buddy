import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from 'src/utils/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const accessToken = ref(null)

  const token = computed(() => accessToken.value)
  const isAuthenticated = computed(() => !!user.value)

  // Keep store in sync whenever Supabase auth state changes
  // (login, logout, token refresh, tab focus, etc.)
  supabase.auth.onAuthStateChange((_event, session) => {
    user.value = session?.user ?? null
    accessToken.value = session?.access_token ?? null
  })

  // Hydrates the store from the persisted Supabase session and
  // returns true if a valid session exists.
  const loadFromStorage = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    user.value = session?.user ?? null
    accessToken.value = session?.access_token ?? null
    return !!session
  }

  const hasValidSession = async () => loadFromStorage()

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return { ok: true, user: data.user }
  }

  // Accepts both camelCase (displayName/redirectTo) and snake_case
  // (display_name/redirect_to) so existing call sites keep working.
  const signup = async ({ email, password, display_name, redirect_to, displayName, redirectTo }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: display_name ?? displayName },
        emailRedirectTo: redirect_to ?? redirectTo,
      },
    })
    if (error) return { ok: false, message: error.message, error }
    return { ok: true, user: data.user, raw: data }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    return { ok: true, message: 'Logged out' }
  }

  return {
    user,
    token,
    accessToken,
    isAuthenticated,
    hasValidSession,
    loadFromStorage,
    signup,
    login,
    logout,
  }
})
