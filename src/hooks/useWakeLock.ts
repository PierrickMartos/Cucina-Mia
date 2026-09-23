import { useEffect } from "react"

/**
 * Keeps the screen awake while `active`. The browser drops the lock whenever the page is
 * hidden (tab switch, phone locked), so it is requested again when the page comes back.
 */
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      if (document.visibilityState !== "visible" || (lock && !lock.released)) return
      try {
        const sentinel = await navigator.wakeLock.request("screen")
        if (cancelled) void sentinel.release()
        else lock = sentinel
      } catch { /* Wake Lock refused (low battery, not supported) */ }
    }
    void acquire()
    document.addEventListener("visibilitychange", acquire)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", acquire)
      void lock?.release()
    }
  }, [active])
}
