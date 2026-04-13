import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePaywallStore = defineStore('paywall', () => {
  const isOpen = ref(false)
  const feature = ref('ai')
  const reason = ref('')
  const details = ref(null)

  const openPaywallModal = (targetFeature, payload = {}) => {
    feature.value = targetFeature
    reason.value = payload.reason || ''
    details.value = payload.details || null
    isOpen.value = true
  }

  const closePaywallModal = () => {
    isOpen.value = false
    reason.value = ''
    details.value = null
  }

  return { isOpen, feature, reason, details, openPaywallModal, closePaywallModal }
})
