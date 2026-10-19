import { computed } from 'vue'
import { useQuasar } from 'quasar'

/**
 * True for the native app shell and for viewports below Quasar's `md` breakpoint.
 * Mirrors the inverse of AddItemDialog's desktop check.
 */
export function useMobileLayout() {
  const $q = useQuasar()
  return computed(() => $q.platform.is.nativeMobile || !$q.screen.gt.sm)
}
