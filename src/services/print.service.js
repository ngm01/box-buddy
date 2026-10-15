import { Capacitor, registerPlugin } from '@capacitor/core'

// Local Swift plugin (ios/App/App/PrintPlugin.swift). It prints the app's own
// WebView through UIPrintInteractionController, because window.print() is a
// no-op inside WKWebView.
const NativePrint = registerPlugin('Print')

const PRINTING_CLASS = 'bb-printing'

// Prints whatever is inside `.bb-print-root` (see src/css/app.scss): the class
// on <html> hides the rest of the page under @media print. The class only
// matters for print media, so it is harmless if afterprint never fires.
export async function printDocument({ jobName = 'BoxBuddy' } = {}) {
  const root = document.documentElement

  if (Capacitor.isNativePlatform()) {
    if (!Capacitor.isPluginAvailable('Print')) {
      throw new Error('Printing is not available in this version of the app.')
    }
    root.classList.add(PRINTING_CLASS)
    try {
      return await NativePrint.print({ jobName })
    } finally {
      root.classList.remove(PRINTING_CLASS)
    }
  }

  root.classList.add(PRINTING_CLASS)
  window.addEventListener('afterprint', () => root.classList.remove(PRINTING_CLASS), {
    once: true,
  })
  window.print()
  return { completed: true }
}
