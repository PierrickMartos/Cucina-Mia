import { act, render, screen } from "@testing-library/react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import i18n from "i18next"
import { LoadError } from "@/components/LoadError"

function setOnline(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value)
  window.dispatchEvent(new Event(value ? "online" : "offline"))
}

describe("LoadError", () => {
  beforeEach(() => { i18n.changeLanguage("en") })
  afterEach(() => { vi.restoreAllMocks() })

  it("explains an offline failure and retries once the connection is back", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    const retry = vi.fn()
    render(<LoadError onRetry={retry} />)
    expect(screen.getByRole("alert")).toHaveTextContent("You are offline")

    act(() => setOnline(true))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load")
  })
})
