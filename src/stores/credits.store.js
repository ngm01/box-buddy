import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from 'src/utils/supabase'
import { purchasePack as launchPurchase } from 'src/services/payments.service'

export const useCreditsStore = defineStore('credits', () => {
  const balance = ref(null)
  const transactions = ref([])
  const loading = ref(false)

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

  // Credits are granted server-side by payment webhooks, never by the client.
  // After a native purchase (or on return from Stripe Checkout) the grant
  // lands ~1-2s later, so we poll the balance until it increases.
  const pollForCreditGrant = async ({ attempts = 8, intervalMs = 1500 } = {}) => {
    const before = balance.value ?? 0
    for (let i = 0; i < attempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
      await fetchBalance()
      if ((balance.value ?? 0) > before) {
        return { confirmed: true, balance: balance.value }
      }
    }
    return { confirmed: false, balance: balance.value }
  }

  const purchasePack = async (packId) => {
    const result = await launchPurchase(packId)

    if (result.status === 'purchased') {
      const { balance: newBalance } = await pollForCreditGrant()
      return { status: 'purchased', balance: newBalance }
    }

    // 'redirect' (page is navigating to Stripe Checkout) or 'cancelled'
    return result
  }

  // Called by the /purchase/success page. The session_id query param is
  // informational only — the Stripe webhook is the source of truth.
  const confirmStripeReturn = async () => pollForCreditGrant()

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
    pollForCreditGrant,
    confirmStripeReturn,
    reset,
  }
})
