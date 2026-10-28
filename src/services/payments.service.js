import { Capacitor } from '@capacitor/core'
import apiClient from 'src/utils/apiClient'

const API_BASE = (process.env.API_BASE || 'https://api.boxbuddy.io').replace(/\/$/, '')

// RevenueCat's configure() must run once per app session; later user
// switches go through logIn()/logOut(). identifiedUserId tracks which
// Supabase user RevenueCat is identified as, so repeated onAuthStateChange
// events (token refresh, tab focus) are no-ops.
let isConfigured = false
let identifiedUserId = null

// onAuthStateChange can fire several events back to back (e.g. at startup),
// so run SDK calls one at a time; otherwise two could both see an
// unconfigured SDK and call configure() twice.
let sdkQueue = Promise.resolve()
const enqueue = (task) => {
  const run = sdkQueue.then(task)
  sdkQueue = run.catch(() => {})
  return run
}

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

// Lazy import keeps RevenueCat out of the web bundle. Returned wrapped in an
// object: resolving a promise with the bare plugin proxy makes the runtime
// probe it for `.then`, which Capacitor rejects as an unimplemented method.
const loadPurchases = async () => {
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  return { Purchases }
}

// Configure/identify RevenueCat. appUserID must equal the Supabase user id —
// it is the join key the credit-granting webhook resolves accounts with.
export async function initPayments(user) {
  if (!isNativePayments() || !user?.id) return
  return enqueue(async () => {
    if (identifiedUserId === user.id) return

    const { Purchases } = await loadPurchases()
    if (!isConfigured) {
      await Purchases.configure({ apiKey: revenueCatApiKey(), appUserID: user.id })
      isConfigured = true
    } else {
      await Purchases.logIn({ appUserID: user.id })
    }
    identifiedUserId = user.id
  })
}

export async function teardownPayments() {
  if (!isNativePayments()) return
  return enqueue(async () => {
    if (!identifiedUserId) return
    identifiedUserId = null
    try {
      const { Purchases } = await loadPurchases()
      await Purchases.logOut()
    } catch {
      // logOut throws if the SDK is already anonymous — nothing to undo.
    }
  })
}

// apiClient sends a fresh token and treats a 401 as an expired session
// (sign out, back to login).
const purchaseWithStripe = async (packId) => {
  let data
  try {
    ;({ data } = await apiClient.post(`${API_BASE}/payments/checkout`, { packId }))
  } catch (error) {
    throw new Error(`Failed to start checkout: ${error.response?.status ?? error.message}`)
  }
  if (!data?.url) throw new Error('Checkout response missing redirect URL')
  window.location.assign(data.url)
  return { status: 'redirect' }
}

const isUserCancellation = (err) =>
  err?.userCancelled === true ||
  String(err?.code || '').toUpperCase().includes('CANCEL') ||
  /cancel/i.test(err?.message || '')

const purchaseWithRevenueCat = async (packId) => {
  const { Purchases } = await loadPurchases()
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
    const { Purchases } = await loadPurchases()
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
