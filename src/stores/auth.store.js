import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { supabase } from 'src/utils/supabase'
import { markServiceUnavailable } from 'src/utils/serviceStatus'
import { safeWebBaseUrl } from 'src/config/app.config'
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

  // Supabase emails a confirmation link; the address only changes once it's
  // clicked (with "secure email change" on, both old and new must confirm).
  const updateEmail = async (email) => {
    // On iOS the origin is capacitor://localhost, which an email link can't open.
    const origin = window.location.protocol.startsWith('http')
      ? window.location.origin
      : safeWebBaseUrl
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${origin}/account` },
    )
    if (error) throw error
  }

  // Re-checks the current password first so an unattended signed-in device
  // can't be used to take over the account.
  const updatePassword = async (currentPassword, newPassword) => {
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.value?.email,
      password: currentPassword,
    })
    if (verifyError) throw new Error('Current password is incorrect')

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  // See backend/Supabase/migrations/202610200001_delete_own_account.sql.
  const deleteAccount = async () => {
    const { error } = await supabase.rpc('delete_own_account')
    if (error) throw error
    // The user no longer exists, so the server-side sign-out may fail;
    // clearing the local session is what matters.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
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
    updateEmail,
    updatePassword,
    deleteAccount,
  }
})
