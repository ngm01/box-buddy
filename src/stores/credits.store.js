import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from './auth.store'
import { supabase } from 'src/utils/supabase'

const API_BASE = (process.env.API_BASE || 'https://api.boxbuddy.io').replace(/\/$/, '')

export const useCreditsStore = defineStore('credits', () => {
  const authStore = useAuthStore()

  const balance = ref(null)
  const transactions = ref([])
  const loading = ref(false)

  const authHeader = () => ({
    Authorization: `Bearer ${authStore.token || ''}`,
  })

  // Getters
  const hasCredits = computed(() => (n) => balance.value !== null && balance.value >= n)
  const isLow = computed(() => balance.value !== null && balance.value > 0 && balance.value <= 10)
  const isEmpty = computed(() => balance.value !== null && balance.value <= 0)
  const isLoaded = computed(() => balance.value !== null)

  // Actions
  const fetchBalance = async () => {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('balance')
        .single()
      if (error) throw error
      balance.value = data.balance
    } catch (error) {
      console.error('Error fetching credit balance:', error)
    } finally {
      loading.value = false
    }
  }

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      transactions.value = data
    } catch (error) {
      console.error('Error fetching credit history:', error)
    }
  }

  const updateBalance = (newBalance) => {
    balance.value = newBalance
  }

  const purchasePack = async (packId) => {
    const res = await fetch(`${API_BASE}/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ packId }),
    })
    if (!res.ok) throw new Error(`Failed to purchase pack: ${res.status}`)
    const data = await res.json()

    if (data.stubbed) {
      updateBalance(data.balance)
    } else if (data.url) {
      window.location.href = data.url
    }

    return data
  }

  const reset = () => {
    balance.value = null
    transactions.value = []
    loading.value = false
  }

  return {
    balance,
    transactions,
    loading,
    hasCredits,
    isLow,
    isEmpty,
    isLoaded,
    fetchBalance,
    fetchHistory,
    updateBalance,
    purchasePack,
    reset,
  }
})
