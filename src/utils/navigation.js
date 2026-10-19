/**
 * Goes back one entry if the user navigated here from inside the app,
 * otherwise (deep link, fresh tab, app launch) replaces with `fallback`.
 */
export function goBackOr(router, fallback) {
  if (window.history.state?.back) {
    router.back()
  } else {
    router.replace(fallback)
  }
}
