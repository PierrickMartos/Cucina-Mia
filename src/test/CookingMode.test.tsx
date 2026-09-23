import { act, fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import i18n from "i18next"
import { RecipePage } from "@/pages/RecipePage"
import { resetTimers } from "@/lib/timers"
import { parseVoiceCommand, recognitionLang } from "@/lib/voiceCommands"

const recipe = {
  slug: "pasta-carbonara",
  title: "Pasta alla Carbonara",
  description: "La vera carbonara romana.",
  images: { cover: "images/recipes/pasta-carbonara/cover.svg", web: "images/recipes/pasta-carbonara/cover.svg" },
  prepTime: 10,
  cookTime: 15,
  servings: 4,
  difficulty: "Medio",
  category: "Primi",
  tags: ["pasta"],
  ingredients: [{ items: ["400g spaghetti", "200g guanciale"] }],
  steps: [
    { text: "Boil the water." },
    { text: "Cook the pasta for 9 minutes.", timers: [9] },
    { text: "Serve." },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/recipe/pasta-carbonara"]}>
      <Routes>
        <Route path="/recipe/:slug" element={<RecipePage />} />
      </Routes>
    </MemoryRouter>
  )
}

async function openCookingMode() {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByRole("button", { name: "Cooking mode" }))
  const dialog = screen.getByRole("dialog", { name: "Pasta alla Carbonara" })
  return { user, dialog }
}

class FakeRecognition {
  static instance: FakeRecognition | null = null
  lang = ""
  continuous = false
  interimResults = false
  started = false
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  constructor() { FakeRecognition.instance = this }
  start() { this.started = true }
  abort() { this.started = false }
  say(transcript: string) {
    const result = Object.assign([{ transcript }], { isFinal: true })
    this.onresult?.({ resultIndex: 0, results: [result] })
  }
}

describe("CookingMode", () => {
  beforeEach(() => {
    // jsdom has no layout: the page scrolls to the current step when the mode closes
    Element.prototype.scrollIntoView ??= () => {}
    localStorage.clear()
    resetTimers()
    i18n.changeLanguage("en")
    globalThis.fetch = (async () => ({ ok: true, json: async () => recipe }) as Response) as typeof fetch
  })

  afterEach(() => {
    Reflect.deleteProperty(window, "SpeechRecognition")
    FakeRecognition.instance = null
  })

  it("shows one step at a time and moves with the buttons", async () => {
    const { user, dialog } = await openCookingMode()
    expect(within(dialog).getByText("Step 1 of 3")).toBeInTheDocument()
    expect(within(dialog).getByText("Boil the water.")).toBeInTheDocument()
    expect(within(dialog).queryByText("Serve.")).not.toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Previous step" })).toBeDisabled()

    await user.click(within(dialog).getByRole("button", { name: /Next step/ }))
    expect(within(dialog).getByText("Step 2 of 3")).toBeInTheDocument()
    expect(await within(dialog).findByText("Cook the pasta for 9 minutes.")).toBeInTheDocument()
  })

  it("moves with the arrow keys and closes with Escape on the current step", async () => {
    const { user, dialog } = await openCookingMode()
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}")
    expect(within(dialog).getByText("Step 3 of 3")).toBeInTheDocument()
    await user.keyboard("{ArrowLeft}")
    expect(within(dialog).getByText("Step 2 of 3")).toBeInTheDocument()

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    // The page keeps the step reached in cooking mode
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument()
  })

  it("moves with horizontal swipes but not vertical scrolls", async () => {
    const { dialog } = await openCookingMode()
    const swipe = (from: [number, number], to: [number, number]) => {
      fireEvent.touchStart(dialog, { touches: [{ clientX: from[0], clientY: from[1] }] })
      fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: to[0], clientY: to[1] }] })
    }
    swipe([300, 300], [100, 310])
    expect(within(dialog).getByText("Step 2 of 3")).toBeInTheDocument()
    swipe([300, 500], [240, 200])
    expect(within(dialog).getByText("Step 2 of 3")).toBeInTheDocument()
    swipe([100, 300], [300, 300])
    expect(within(dialog).getByText("Step 1 of 3")).toBeInTheDocument()
  })

  it("shows the step's timers inline", async () => {
    const { user, dialog } = await openCookingMode()
    expect(within(dialog).queryByRole("button", { name: /timer/ })).not.toBeInTheDocument()
    await user.keyboard("{ArrowRight}")
    await user.click(await within(dialog).findByRole("button", { name: "Start a 9 min timer" }))
    expect(within(dialog).getByRole("timer")).toHaveTextContent("9:00")
  })

  it("shows the ingredients on demand and finishes on the last step", async () => {
    const { user, dialog } = await openCookingMode()
    await user.click(within(dialog).getByRole("button", { name: "Ingredients" }))
    expect(within(dialog).getByText("400g spaghetti")).toBeInTheDocument()

    await user.keyboard("{End}")
    await user.click(within(dialog).getByRole("button", { name: /buon appetito/ }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("follows voice commands", async () => {
    Object.defineProperty(window, "SpeechRecognition", { value: FakeRecognition, configurable: true })
    const { user, dialog } = await openCookingMode()
    await user.click(within(dialog).getByRole("button", { name: "Voice commands" }))
    const recognition = FakeRecognition.instance!
    expect(recognition.started).toBe(true)
    expect(recognition.lang).toBe("en-US")

    act(() => recognition.say("next step"))
    expect(within(dialog).getByText("Step 2 of 3")).toBeInTheDocument()
    act(() => recognition.say("start the timer"))
    expect(await within(dialog).findByRole("timer")).toHaveTextContent("9:00")
    act(() => recognition.say("I think the next one is the best part of this"))
    expect(within(dialog).getByText("Step 2 of 3")).toBeInTheDocument()
    act(() => recognition.say("précédent"))
    expect(within(dialog).getByText("Step 1 of 3")).toBeInTheDocument()

    await user.click(within(dialog).getByRole("button", { name: "Voice commands" }))
    expect(recognition.started).toBe(false)
  })
})

describe("parseVoiceCommand", () => {
  it("understands short commands in every language", () => {
    expect(parseVoiceCommand("Suivant")).toBe("next")
    expect(parseVoiceCommand("étape suivante")).toBe("next")
    expect(parseVoiceCommand("avanti")).toBe("next")
    expect(parseVoiceCommand("go back")).toBe("previous")
    expect(parseVoiceCommand("Précédent")).toBe("previous")
    expect(parseVoiceCommand("indietro")).toBe("previous")
    expect(parseVoiceCommand("répète")).toBe("repeat")
    expect(parseVoiceCommand("ripeti per favore")).toBe("repeat")
    expect(parseVoiceCommand("lance le minuteur")).toBe("timer")
    expect(parseVoiceCommand("stop the timer")).toBe("stop")
    expect(parseVoiceCommand("arrête")).toBe("stop")
  })

  it("ignores conversation and unrelated words", () => {
    expect(parseVoiceCommand("")).toBeNull()
    expect(parseVoiceCommand("bonjour")).toBeNull()
    expect(parseVoiceCommand("on passe à la suivante après le café")).toBeNull()
  })

  it("maps interface languages to recognition locales", () => {
    expect(recognitionLang("fr")).toBe("fr-FR")
    expect(recognitionLang("en-GB")).toBe("en-US")
    expect(recognitionLang("it")).toBe("it-IT")
  })
})
