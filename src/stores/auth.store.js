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

  const signup = async ({ email, password }) => {
    email = typeof email === 'string' ? email : unref(email)
    password = typeof password === 'string' ? password : unref(password)
    try {
      await axios.post(`${API_BASE}/signup`, { email, password })
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
      return true
    } catch (err) {
      console.error('Login failed:', err)
      logout() // ensure we clear any partial state
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

  return { user, token, accessToken, refreshToken, loadFromStorage, signup, login, logout }
})
