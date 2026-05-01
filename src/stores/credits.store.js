import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from './auth.store'

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
      const res = await fetch(`${API_BASE}/credits`, { headers: authHeader() })
      if (!res.ok) throw new Error(`Failed to fetch credits: ${res.status}`)
      const data = await res.json()
      balance.value = data.balance
    } catch (error) {
      console.error('Error fetching credit balance:', error)
    } finally {
      loading.value = false
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/credits/history`, { headers: authHeader() })
      if (!res.ok) throw new Error(`Failed to fetch credit history: ${res.status}`)
      const data = await res.json()
      transactions.value = data.transactions || []
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
