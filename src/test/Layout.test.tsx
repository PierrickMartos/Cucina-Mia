import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import i18n from "i18next"
import { Layout } from "@/components/Layout"

describe("Layout logo", () => {
  const speak = vi.fn()
  const cancel = vi.fn()

  beforeEach(() => {
    i18n.changeLanguage("en")
    speak.mockClear()
    Object.defineProperty(window, "speechSynthesis", {
      value: { speak, cancel, getVoices: () => [{ lang: "it-IT", name: "Alice" }] },
      configurable: true,
    })
    globalThis.SpeechSynthesisUtterance = class {
      text: string
      lang = ""
      voice: unknown = null
      rate = 1
      pitch = 1
      constructor(text: string) { this.text = text }
    } as unknown as typeof SpeechSynthesisUtterance
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(window, "speechSynthesis")
  })

  function renderLayout() {
    return render(
      <MemoryRouter initialEntries={["/recipes"]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<div data-testid="home-page" />} />
            <Route path="/recipes" element={<div data-testid="recipes-page" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
  }

  it("plays the 'Mamma mia!' sound and goes back to the home page", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole("link", { name: "CUCINA MIA" }))

    expect(screen.getByTestId("home-page")).toBeInTheDocument()
    expect(play).toHaveBeenCalledTimes(1)
    expect((play.mock.contexts[0] as HTMLAudioElement).src).toContain("sounds/mamma-mia.mp3")
    expect(speak).not.toHaveBeenCalled()
  })

  it("falls back to an Italian voice when the sound can't be played", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("NotSupportedError"))
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole("link", { name: "CUCINA MIA" }))

    expect(screen.getByTestId("home-page")).toBeInTheDocument()
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1))
    const utterance = speak.mock.calls[0][0]
    expect(utterance.text).toBe("Mamma mia!")
    expect(utterance.lang).toBe("it-IT")
    expect(utterance.voice).toEqual({ lang: "it-IT", name: "Alice" })
  })
})
