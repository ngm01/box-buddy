// auth.store.js — captures/stores JWT via your API proxy
import { defineStore } from 'pinia'
import { ref, computed, unref } from 'vue'
import axios from 'axios'

const API_BASE = 'https://api.boxbuddy.io/auth'

const getJwtPayload = (token) => {
  try {
    if (!token || typeof token !== 'string') return null
    const [, payload] = token.split('.')
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    )
    return JSON.parse(decoded)
  } catch (e) {
    console.warn('Failed to parse JWT payload', e)
    return null
  }
}

const isTokenExpired = (token, graceSeconds = 30) => {
  const payload = getJwtPayload(token)
  if (!payload?.exp) return true
  return payload.exp <= Math.floor(Date.now() / 1000) + graceSeconds
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const accessToken = ref(null)
  const refreshToken = ref(null)

  const token = computed(() => accessToken.value)
  const isAuthenticated = computed(() => !!accessToken.value && !isTokenExpired(accessToken.value))

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

      if (accessToken.value && isTokenExpired(accessToken.value)) {
        accessToken.value = null
        refreshToken.value = null
        user.value = null
        persist()
      }
    } catch (e) {
      console.error('Load error', e)
    }
  }

  const hasValidSession = () => {
    if (!accessToken.value) {
      try {
        accessToken.value = localStorage.getItem('bb_access') || null
        refreshToken.value = localStorage.getItem('bb_refresh') || null
        const u = localStorage.getItem('bb_user')
        user.value = u ? JSON.parse(u) : user.value
      } catch (e) {
        console.error('Session restore error', e)
      }
    }

    if (!accessToken.value) return false

    if (isTokenExpired(accessToken.value)) {
      accessToken.value = null
      refreshToken.value = null
      user.value = null
      persist()
      return false
    }

    return true
  }

  const signup = async ({ email, password }) => {
    email = typeof email === 'string' ? email : unref(email)
    password = typeof password === 'string' ? password : unref(password)
    display_name = typeof display_name === 'string' ? display_name : unref(display_name)
    redirect_to = typeof redirect_to === 'string' ? redirect_to : unref(redirect_to)

    try {
      await axios.post(`${API_BASE}/signup`, {
        email,
        password,
        display_name,
        redirect_to,
      })
      return true
    } catch (err) {
      console.error('Signup failed:', err)
      throw err
    }
  }

  const login = async (email, password) => {
    console.log('Login called with:', email)
    email = typeof email === 'string' ? email : unref(email)
    password = typeof password === 'string' ? password : unref(password)
    try {
      const { data } = await axios.post(
        `${API_BASE}/token?grant_type=password`,
        { email, password },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
      accessToken.value = data.access_token
      refreshToken.value = data.refresh_token
      const me = await axios.get(`${API_BASE}/user`, {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      user.value = me.data
      persist()
      return true
    } catch (err) {
      console.error('Login failed:', err)
      logout()
      throw err
    }
  }

  const logout = async () => {
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
    } finally {
      accessToken.value = null
      refreshToken.value = null
      user.value = null
      persist()
    }
  }

  return {
    user,
    token,
    accessToken,
    refreshToken,
    isAuthenticated,
    hasValidSession,
    loadFromStorage,
    signup,
    login,
    logout,
  }
})
