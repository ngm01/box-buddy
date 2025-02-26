// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed, watchEffect } from 'vue'
import { supabase } from '../utils/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)

  // Check if user is already signed in
  async function fetchUser() {
    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user || null
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    user.value = data.user
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    user.value = data.user
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
  }

  const isAuthenticated = computed(() => !!user.value)

  // Keep user in sync with Supabase session
  watchEffect(fetchUser)

  return { user, signUp, signIn, signOut, isAuthenticated }
})
