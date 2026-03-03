// auth.store.js — captures/stores JWT via your API proxy
import { defineStore } from 'pinia'
import { ref, computed, unref } from 'vue'
import axios from 'axios'

const API_BASE = 'https://api.boxbuddy.io/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const accessToken = ref(null)
  const refreshToken = ref(null)

  const token = computed(() => accessToken.value)

  const getErrorMessage = (err, fallback) => {
    return (
      err?.response?.data?.message ||
      err?.response?.data?.error_description ||
      err?.response?.data?.error ||
      err?.message ||
      fallback
    )
  }

  const normalizeAuthResult = ({ ok, message = '', data = null, error = null }) => ({
    ok,
    message,
    user: data?.user || null,
    accessToken: data?.access_token || null,
    refreshToken: data?.refresh_token || null,
    requiresEmailVerification: Boolean(data?.requires_email_verification || data?.email_confirmation_sent),
    error,
    raw: data,
  })

  const persist = () => {
    try {
      localStorage.setItem('bb_user', JSON.stringify(user.value))
      localStorage.setItem('bb_access', accessToken.value || '')
      localStorage.setItem('bb_refresh', refreshToken.value || '')
    } catch (e) {
      console.error('Persist error', e)
    }
  }

  const loadFromStorage = () => {
    try {
      const u = localStorage.getItem('bb_user')
      user.value = u ? JSON.parse(u) : null
      accessToken.value = localStorage.getItem('bb_access') || null
      refreshToken.value = localStorage.getItem('bb_refresh') || null
    } catch (e) {
      console.error('Load error', e)
    }
  }

  const signup = async ({ email, password, displayName, redirectTo }) => {
    email = typeof email === 'string' ? email : unref(email)
    password = typeof password === 'string' ? password : unref(password)
    displayName = typeof displayName === 'string' ? displayName : unref(displayName)
    redirectTo = typeof redirectTo === 'string' ? redirectTo : unref(redirectTo)

    try {
      const { data } = await axios.post(
        `${API_BASE}/signup`,
        {
          email,
          password,
          display_name: displayName,
          redirect_to: redirectTo,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )

      if (data?.access_token) {
        accessToken.value = data.access_token
        refreshToken.value = data.refresh_token || null
      }

      if (data?.user) {
        user.value = data.user
      }

      if (data?.access_token || data?.user) {
        persist()
      }

      return normalizeAuthResult({
        ok: true,
        message: data?.message || 'Sign up successful',
        data,
      })
    } catch (err) {
      const message = getErrorMessage(err, 'Sign up failed')
      console.error('Signup failed:', message, err)
      return normalizeAuthResult({ ok: false, message, error: err })
    }
  }

  const login = async (email, password) => {
    console.log('Login called with:', email)
    email = typeof email === 'string' ? email : unref(email)
    password = typeof password === 'string' ? password : unref(password)
    try {
      // Supabase expects grant_type=password on /auth/v1/token
      const { data } = await axios.post(
        `${API_BASE}/token?grant_type=password`,
        { email, password },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
      accessToken.value = data.access_token
      refreshToken.value = data.refresh_token
      // Optionally call /auth/user to fetch profile
      const me = await axios.get(`${API_BASE}/user`, {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      user.value = me.data
      persist()
      return normalizeAuthResult({
        ok: true,
        message: 'Login successful',
        data: {
          ...data,
          user: me.data,
        },
      })
    } catch (err) {
      const message = getErrorMessage(err, 'Login failed')
      console.error('Login failed:', message, err)
      await logout() // ensure we clear any partial state
      return normalizeAuthResult({ ok: false, message, error: err })
    }
  }

  const logout = async () => {
    let message = 'Logged out'
    try {
      if (accessToken.value) {
        await axios.post(
          `${API_BASE}/logout`,
          {},
          { headers: { Authorization: `Bearer ${accessToken.value}` } },
        )
      }
    } catch (err) {
      console.warn('Logout call failed (continuing):', err)
      message = getErrorMessage(err, 'Logged out locally')
    } finally {
      accessToken.value = null
      refreshToken.value = null
      user.value = null
      persist()
    }

    return normalizeAuthResult({ ok: true, message })
  }

  return { user, token, accessToken, refreshToken, loadFromStorage, signup, login, logout }
})
