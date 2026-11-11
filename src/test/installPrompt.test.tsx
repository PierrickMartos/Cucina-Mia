import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import i18n from "i18next"
import { InstallBanner } from "@/components/InstallBanner"
import {
  INSTALL_DISMISSED_KEY,
  INSTALL_SNOOZE_MS,
  isIPhone,
  shouldShowInstallBanner,
} from "@/lib/installPrompt"

const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1"
const CHROME_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0 Mobile/15E148 Safari/604.1"
const INSTAGRAM_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0"
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15"
const ANDROID = "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36"

function mockBrowser(userAgent: string, { standalone = false, displayModeStandalone = false } = {}) {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent)
  Object.defineProperty(window.navigator, "standalone", { value: standalone, configurable: true })
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(display-mode: standalone)" && displayModeStandalone,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe("install banner", () => {
  beforeEach(() => {
    localStorage.clear()
    i18n.changeLanguage("fr")
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    Reflect.deleteProperty(window.navigator, "standalone")
  })

  it("targets iPhone browsers that can add to the home screen", () => {
    expect(isIPhone(SAFARI_IPHONE)).toBe(true)
    expect(isIPhone(CHROME_IPHONE)).toBe(true)
    expect(isIPhone(INSTAGRAM_IPHONE)).toBe(false)
    expect(isIPhone(MAC_SAFARI)).toBe(false)
    expect(isIPhone(ANDROID)).toBe(false)
  })

  it("is shown in Safari on iPhone but not once installed", () => {
    mockBrowser(SAFARI_IPHONE)
    expect(shouldShowInstallBanner()).toBe(true)
    mockBrowser(SAFARI_IPHONE, { standalone: true })
    expect(shouldShowInstallBanner()).toBe(false)
    mockBrowser(SAFARI_IPHONE, { displayModeStandalone: true })
    expect(shouldShowInstallBanner()).toBe(false)
  })

  it("stays hidden for a while after being closed", () => {
    mockBrowser(SAFARI_IPHONE)
    const now = 1_800_000_000_000
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(now))
    expect(shouldShowInstallBanner(window, now + 1000)).toBe(false)
    expect(shouldShowInstallBanner(window, now + INSTALL_SNOOZE_MS + 1)).toBe(true)
  })

  it("explains how to install and can be closed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockBrowser(SAFARI_IPHONE)
    render(<InstallBanner />)
    expect(screen.queryByText("Installer Cucina Mia sur votre iPhone")).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1500))
    expect(screen.getByText("Installer Cucina Mia sur votre iPhone")).toBeInTheDocument()
    expect(screen.getByText("Sur l'écran d'accueil")).toBeInTheDocument()

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole("button", { name: "Fermer" }))
    expect(localStorage.getItem(INSTALL_DISMISSED_KEY)).not.toBeNull()
  })

  it("is not rendered on other devices", () => {
    vi.useFakeTimers()
    mockBrowser(ANDROID)
    render(<InstallBanner />)
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.queryByText("Installer Cucina Mia sur votre iPhone")).not.toBeInTheDocument()
  })
})
