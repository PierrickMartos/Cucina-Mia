import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  addMinute,
  dismissTimer,
  formatCountdown,
  formatDuration,
  pauseTimer,
  remainingMs,
  resetTimers,
  resumeTimer,
  startTimer,
  useTimers,
} from "@/lib/timers"
import { act, renderHook } from "@testing-library/react"

const input = { id: "pasta:0:0", slug: "pasta", recipeTitle: "Pasta", step: 0, minutes: 5 }

describe("cooking timers", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    resetTimers()
  })
  afterEach(() => {
    resetTimers()
    vi.useRealTimers()
  })

  it("counts down, pauses, resumes and rings when done", () => {
    const { result } = renderHook(() => useTimers())
    act(() => startTimer(input))
    expect(result.current.timers).toHaveLength(1)

    act(() => { vi.advanceTimersByTime(60_000) })
    const [timer] = result.current.timers
    expect(remainingMs(timer, result.current.now)).toBe(4 * 60_000)

    act(() => pauseTimer(input.id))
    act(() => { vi.advanceTimersByTime(10 * 60_000) })
    expect(result.current.timers[0].status).toBe("paused")
    expect(remainingMs(result.current.timers[0], result.current.now)).toBe(4 * 60_000)

    act(() => resumeTimer(input.id))
    act(() => addMinute(input.id))
    act(() => { vi.advanceTimersByTime(5 * 60_000 - 1000) })
    expect(result.current.timers[0].status).toBe("running")
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.timers[0].status).toBe("done")

    act(() => dismissTimer(input.id))
    expect(result.current.timers).toHaveLength(0)
  })

  it("persists timers with their end time", () => {
    act(() => startTimer(input))
    const stored = JSON.parse(localStorage.getItem("cucina-mia:timers")!)
    expect(stored[0]).toMatchObject({ id: input.id, status: "running", endsAt: Date.now() + 5 * 60_000 })
  })

  it("formats durations and countdowns", () => {
    expect(formatDuration(0.5)).toBe("30 s")
    expect(formatDuration(5)).toBe("5 min")
    expect(formatDuration(5.5)).toBe("5 min 30")
    expect(formatDuration(90)).toBe("1 h 30")
    expect(formatDuration(720)).toBe("12 h")
    expect(formatCountdown(245_000)).toBe("4:05")
    expect(formatCountdown(3_723_000)).toBe("1:02:03")
    expect(formatCountdown(400)).toBe("0:01")
  })

  it("shows a system notification through the service worker when the page is hidden", async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("Notification", Object.assign(vi.fn(), { permission: "granted" }))
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: {}, ready: Promise.resolve({ showNotification }) },
    })
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    try {
      act(() => startTimer(input))
      act(() => { vi.advanceTimersByTime(5 * 60_000) })
      await vi.waitFor(() => expect(showNotification).toHaveBeenCalledTimes(1))
      const [title, options] = showNotification.mock.calls[0]
      expect(title).toContain("Timer")
      expect(options).toMatchObject({ tag: input.id, body: expect.stringContaining("Pasta"), data: { url: expect.stringContaining("#/recipe/pasta") } })
      expect(Notification).not.toHaveBeenCalled()
    } finally {
      visibility.mockRestore()
      vi.unstubAllGlobals()
      delete (navigator as { serviceWorker?: unknown }).serviceWorker
    }
  })

  it("rings as soon as the page is visible again", () => {
    const { result } = renderHook(() => useTimers())
    act(() => startTimer(input))
    // A frozen page misses the ticks: only the clock moves
    vi.setSystemTime(Date.now() + 6 * 60_000)
    expect(result.current.timers[0].status).toBe("running")
    act(() => { document.dispatchEvent(new Event("visibilitychange")) })
    expect(result.current.timers[0].status).toBe("done")
  })
})
