// "Add to home screen" hint for iPhone visitors browsing in Safari (or Chrome/Firefox/Edge on iOS).
// iOS has no install prompt API: the banner can only explain the Share > "Add to Home Screen" gesture.

export const INSTALL_DISMISSED_KEY = "cucina-mia-install-dismissed"
/** After a dismissal, the banner stays hidden this long */
export const INSTALL_SNOOZE_MS = 60 * 24 * 60 * 60 * 1000

/** In-app browsers (Instagram, Facebook, LINE…) cannot add to the home screen */
const IN_APP_BROWSER = /FBAN|FBAV|Instagram|Line\/|GSA\//

export function isIPhone(userAgent: string): boolean {
  return /iPhone|iPod/.test(userAgent) && !IN_APP_BROWSER.test(userAgent)
}

export function isStandalone(win: Window = window): boolean {
  const nav = win.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || win.matchMedia?.("(display-mode: standalone)").matches === true
}

export function shouldShowInstallBanner(win: Window = window, now = Date.now()): boolean {
  if (!isIPhone(win.navigator.userAgent) || isStandalone(win)) return false
  try {
    const dismissedAt = Number(win.localStorage.getItem(INSTALL_DISMISSED_KEY))
    return !dismissedAt || now - dismissedAt > INSTALL_SNOOZE_MS
  } catch {
    return true
  }
}

export function dismissInstallBanner(win: Window = window, now = Date.now()): void {
  try {
    win.localStorage.setItem(INSTALL_DISMISSED_KEY, String(now))
  } catch {
    // Private browsing: the banner simply comes back next visit
  }
}
