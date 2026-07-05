export const CREDITS_PER_PHOTO = 1

// Pack ids ARE the store product ids — they must match exactly across
// App Store Connect, RevenueCat, Stripe metadata, and the backend
// product→credits maps in backend/lambdas/.
export const CREDIT_PACKS = [
  { id: 'credits_50', price: 4.99, credits: 50, photos: 50, label: 'Starter' },
  { id: 'credits_200', price: 14.99, credits: 200, photos: 200, label: 'Mover', featured: true },
  { id: 'credits_600', price: 34.99, credits: 600, photos: 600, label: 'Warehouse' },
]

export const REASON_LABELS = {
  signup_bonus: 'Welcome credits',
  purchase: 'Credit purchase',
  identify: 'AI identification',
  retry_refund: 'Retry refund',
}
