import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { supabase } from 'src/utils/supabase'
import { markServiceUnavailable } from 'src/utils/serviceStatus'
import { initPayments, teardownPayments } from 'src/services/payments.service'
import { useBoxesStore } from 'src/stores/boxes.store'
import { useCreditsStore } from 'src/stores/credits.store'

const SESSION_CHECK_TIMEOUT_MS = 8000

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const accessToken = ref(null)

  const token = computed(() => accessToken.value)
  const isAuthenticated = computed(() => !!user.value)

  // Keep store in sync whenever Supabase auth state changes
  // (login, logout, token refresh, tab focus, etc.)
  supabase.auth.onAuthStateChange((event, session) => {
    user.value = session?.user ?? null
    accessToken.value = session?.access_token ?? null

    // RevenueCat must be identified as the Supabase user id (the credit
    // webhook's join key) only once a session actually exists — never on
    // bare app load. initPayments is idempotent across repeat events.
    if (session?.user) {
      initPayments(session.user).catch((err) => console.error('Payments init failed:', err))
    } else if (event === 'SIGNED_OUT') {
      teardownPayments().catch((err) => console.error('Payments teardown failed:', err))
      // Every sign-out path (logout button, 401 handler, expired refresh)
      // lands here. In hash mode none of them reload the page, so clear the
      // previous user's data before someone else signs in.
      useBoxesStore().reset()
      useCreditsStore().reset()
    }
  })

  // Hydrates the store from the persisted Supabase session and
  // returns true if a valid session exists.
  //
  // getSession() refreshes an expired token over the network and retries for
  // ~30s when the backend is unreachable, which would hold the router guard
  // (and so the first render) that whole time. Cap it, and flag the outage so
  // App.vue shows the ServiceUnavailable screen instead of a blank page.
  const loadFromStorage = async () => {
    let timer
    const timedOut = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('Session check timed out')),
        SESSION_CHECK_TIMEOUT_MS,
      )
    })

    try {
      const {
        data: { session },
        error,
      } = await Promise.race([supabase.auth.getSession(), timedOut])
      if (error && isAuthRetryableFetchError(error)) throw error

      user.value = session?.user ?? null
      accessToken.value = session?.access_token ?? null
      return !!session
    } catch (err) {
      console.error('Session check failed:', err)
      markServiceUnavailable()
      return false
    } finally {
      clearTimeout(timer)
    }
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
