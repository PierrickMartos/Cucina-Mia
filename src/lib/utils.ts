import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Runs `callback` once the browser is idle (or after `timeout` ms at the latest). Returns a cancel function. */
export function runWhenIdle(callback: () => void, timeout = 2000): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(callback, { timeout })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(callback, Math.min(timeout, 1000))
  return () => clearTimeout(id)
}
