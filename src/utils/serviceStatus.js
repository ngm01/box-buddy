import { ref } from 'vue'

// True once the backend has failed to respond (session check timed out, or a
// Supabase request failed at the network level). App.vue shows the
// ServiceUnavailable screen while it is set; recovery is a page reload.
// Lives outside Pinia so src/utils/supabase.js can set it before stores exist.
export const serviceUnavailable = ref(false)

export const markServiceUnavailable = () => {
  serviceUnavailable.value = true
}
