import { Capacitor } from '@capacitor/core'
import { useAuthStore } from 'src/stores/auth.store'

const API_BASE = (process.env.API_BASE || 'https://api.boxbuddy.io').replace(/\/$/, '')

// Tracks which Supabase user RevenueCat is identified as, so repeated
// onAuthStateChange events (token refresh, tab focus) are no-ops.
let configuredForUserId = null

export function getPaymentPlatform() {
  return Capacitor.getPlatform() // 'ios' | 'android' | 'web'
}

export function isNativePayments() {
  return getPaymentPlatform() !== 'web'
}

const revenueCatApiKey = () => {
  const platform = getPaymentPlatform()
  const key =
    platform === 'ios'
      ? process.env.REVENUECAT_APPLE_API_KEY
      : process.env.REVENUECAT_GOOGLE_API_KEY
  if (!key) throw new Error(`Missing RevenueCat API key for platform: ${platform}`)
  return key
}

// Lazy import keeps RevenueCat out of the web bundle.
const loadPurchases = async () => {
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  return Purchases
}

// Configure/identify RevenueCat. appUserID must equal the Supabase user id —
// it is the join key the credit-granting webhook resolves accounts with.
export async function initPayments(user) {
  if (!isNativePayments() || !user?.id) return
  if (configuredForUserId === user.id) return

  const Purchases = await loadPurchases()
  if (!configuredForUserId) {
    await Purchases.configure({ apiKey: revenueCatApiKey(), appUserID: user.id })
  } else {
    await Purchases.logIn({ appUserID: user.id })
  }
  configuredForUserId = user.id
}

export async function teardownPayments() {
  if (!isNativePayments() || !configuredForUserId) return
  configuredForUserId = null
  try {
    const Purchases = await loadPurchases()
    await Purchases.logOut()
  } catch {
    // logOut throws if the SDK is already anonymous — nothing to undo.
  }
}

const purchaseWithStripe = async (packId) => {
  const authStore = useAuthStore()
  const res = await fetch(`${API_BASE}/payments/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authStore.token || ''}`,
    },
    body: JSON.stringify({ packId }),
  })
  if (!res.ok) throw new Error(`Failed to start checkout: ${res.status}`)
  const data = await res.json()
  if (!data.url) throw new Error('Checkout response missing redirect URL')
  window.location.assign(data.url)
  return { status: 'redirect' }
}

const isUserCancellation = (err) =>
  err?.userCancelled === true ||
  String(err?.code || '').toUpperCase().includes('CANCEL') ||
  /cancel/i.test(err?.message || '')

const purchaseWithRevenueCat = async (packId) => {
  const Purchases = await loadPurchases()
  const { products } = await Purchases.getProducts({ productIdentifiers: [packId] })
  const product = products?.find((p) => p.identifier === packId)
  if (!product) {
    throw new Error('Product not available — check its status in App Store Connect / Play Console')
  }

  try {
    const result = await Purchases.purchaseStoreProduct({ product })
    return { status: 'purchased', transactionId: result.transaction?.transactionIdentifier }
  } catch (err) {
    if (isUserCancellation(err)) return { status: 'cancelled' }
    throw err
  }
}

// Single purchase entry point. Resolves to { status: 'redirect' } (web — the
// page is navigating to Stripe Checkout), { status: 'purchased' } (native —
// credits arrive asynchronously via webhook; poll the balance), or
// { status: 'cancelled' } (user backed out — not an error).
export async function purchasePack(packId) {
  return isNativePayments() ? purchaseWithRevenueCat(packId) : purchaseWithStripe(packId)
}

// Localized store prices for display on native (StoreKit/Play pricing is
// authoritative there). Returns { [packId]: '$4.99', ... } or null on web/failure.
export async function getNativePackPrices(packIds) {
  if (!isNativePayments()) return null
  try {
    const Purchases = await loadPurchases()
    const { products } = await Purchases.getProducts({ productIdentifiers: packIds })
    const prices = {}
    for (const product of products || []) {
      prices[product.identifier] = product.priceString
    }
    return prices
  } catch (err) {
    console.error('Failed to load native pack prices:', err)
    return null
  }
}
