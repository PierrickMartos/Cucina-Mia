import { act, render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { TimerTray } from "@/components/CookingTimers"
import { pauseTimer, resetTimers, startTimer } from "@/lib/timers"

const input = { id: "pasta:0:0", slug: "pasta", recipeTitle: "Pasta", step: 0, minutes: 5 }

describe("timer tray", () => {
  const release = vi.fn().mockResolvedValue(undefined)
  const request = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    resetTimers()
    release.mockClear()
    request.mockReset().mockImplementation(async () => ({ released: false, release }))
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } })
  })
  afterEach(() => {
    resetTimers()
    delete (navigator as { wakeLock?: unknown }).wakeLock
  })

  it("keeps the screen awake while a timer runs, so the alarm can ring", async () => {
    render(<MemoryRouter><TimerTray /></MemoryRouter>)
    expect(request).not.toHaveBeenCalled()

    await act(async () => startTimer(input))
    expect(request).toHaveBeenCalledWith("screen")

    await act(async () => pauseTimer(input.id))
    expect(release).toHaveBeenCalled()
  })
})
