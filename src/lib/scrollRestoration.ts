import { useLayoutEffect, useRef } from "react"
import { useLocation, useNavigationType } from "react-router-dom"

// The pages scroll inside <main> (see Layout), not the window, so the browser cannot restore
// the position on back/forward by itself. Positions are kept per history entry (location.key)
// and in sessionStorage, so they survive a reload of the tab.

const STORAGE_KEY = "cucina-mia:scroll"
const MAX_ENTRIES = 100
// Long enough for a lazy page chunk and its data to arrive
const RESTORE_TIMEOUT_MS = 2000

function loadPositions(): Map<string, number> {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]")
    return new Map(Array.isArray(parsed) ? (parsed as [string, number][]) : [])
  } catch {
    return new Map()
  }
}

let positions: Map<string, number> | null = null
function getPositions() {
  positions ??= loadPositions()
  return positions
}

function savePositions() {
  const entries = [...getPositions()].slice(-MAX_ENTRIES)
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch { /* Storage unavailable */ }
}

function setPosition(key: string, top: number) {
  const map = getPositions()
  // Re-inserted last so the oldest entries are the ones dropped
  map.delete(key)
  map.set(key, top)
}

/** Test helper. */
export function resetScrollPositions() {
  positions = new Map()
  try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* Storage unavailable */ }
}

const scroller = () => document.querySelector("main")

/**
 * New pages open at the top; back/forward (and a reload) return to where the page was left.
 * The page may not be tall enough yet when it renders (lazy chunk, data, images), so the
 * position is applied once it fits, unless the user scrolls first.
 */
export function useScrollRestoration() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const current = useRef<{ key: string; pathname: string } | null>(null)
  // Position still to be reached by a restore in progress
  const pending = useRef<{ target: number; cancel: () => void } | null>(null)

  // Record the position of the entry being viewed. Scroll events don't bubble: listen in the capture phase
  useLayoutEffect(() => {
    const onScroll = (event: Event) => {
      const main = scroller()
      if (!main || event.target !== main || !current.current || pending.current) return
      setPosition(current.current.key, main.scrollTop)
    }
    const onHide = () => savePositions()
    document.addEventListener("scroll", onScroll, { capture: true, passive: true })
    window.addEventListener("pagehide", onHide)
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true })
      window.removeEventListener("pagehide", onHide)
    }
  }, [])

  useLayoutEffect(() => {
    const previous = current.current
    current.current = { key: location.key, pathname: location.pathname }
    const main = scroller()
    if (!main) return

    // Same page, new entry (search or filters written to the URL): stay put
    if (previous && previous.pathname === location.pathname && navigationType !== "POP") {
      setPosition(location.key, pending.current?.target ?? main.scrollTop)
      return
    }

    pending.current?.cancel()
    pending.current = null
    savePositions()

    const target = navigationType === "POP" ? (getPositions().get(location.key) ?? 0) : 0
    main.scrollTop = target
    if (target === 0 || main.scrollTop >= target - 1) return

    // Not tall enough yet: retry on each frame until it fits, the user takes over, or time runs out
    const started = performance.now()
    let frame = 0
    const stop = () => {
      cancelAnimationFrame(frame)
      for (const type of ["wheel", "touchstart", "keydown", "pointerdown"]) window.removeEventListener(type, stop)
      if (pending.current?.cancel === stop) pending.current = null
    }
    const attempt = () => {
      main.scrollTop = target
      if (main.scrollTop >= target - 1 || performance.now() - started > RESTORE_TIMEOUT_MS) stop()
      else frame = requestAnimationFrame(attempt)
    }
    for (const type of ["wheel", "touchstart", "keydown", "pointerdown"]) window.addEventListener(type, stop, { passive: true })
    pending.current = { target, cancel: stop }
    frame = requestAnimationFrame(attempt)
  }, [location.key, location.pathname, navigationType])

  useLayoutEffect(() => () => pending.current?.cancel(), [])
}
