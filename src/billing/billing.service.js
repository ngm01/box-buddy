import axios from 'axios'
import { useAuthStore } from 'src/stores/auth.store'

const BILLING_BASE = 'https://api.boxbuddy.io/billing'

const authHeaders = () => {
  const authStore = useAuthStore()
  return {
    Authorization: `Bearer ${authStore.accessToken || ''}`,
  }
}

const redirectToUrl = (url) => {
  if (!url) throw new Error('Billing redirect URL missing in response.')
  window.location.assign(url)
}

export const createCheckoutSession = async (plan) => {
  const response = await axios.post(
    `${BILLING_BASE}/checkout-session`,
    { plan },
    { headers: authHeaders() },
  )
  redirectToUrl(response.data?.url)
}

export const createBillingPortalSession = async () => {
  const response = await axios.post(
    `${BILLING_BASE}/billing-portal`,
    {},
    { headers: authHeaders() },
  )
  redirectToUrl(response.data?.url)
}
