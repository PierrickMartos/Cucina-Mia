import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import i18n from "i18next"
import { RecipePage } from "@/pages/RecipePage"

const mockRecipe = {
  slug: "pasta-carbonara",
  title: "Pasta alla Carbonara",
  description: "La vera carbonara romana.",
  images: { cover: "images/recipes/pasta-carbonara/cover.svg", web: "images/recipes/pasta-carbonara/cover.svg" },
  prepTime: 10,
  cookTime: 15,
  servings: 4,
  difficulty: "Medio",
  category: "Primi",
  tags: ["pasta", "romano"],
  ingredients: [{ items: ["400g spaghetti", "200g guanciale"] }],
  steps: [{ text: "Portare a ebollizione l'acqua." }, { text: "Rosolare il guanciale." }],
  tips: ["Usare solo pecorino romano."],
}

function renderRecipePage(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/recipe/${slug}`]}>
      <Routes>
        <Route path="/recipe/:slug" element={<RecipePage />} />
        <Route path="/recipes" element={<div data-testid="recipes-page" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("RecipePage", () => {
  beforeEach(() => {
    localStorage.clear()
    i18n.changeLanguage("en")
    globalThis.fetch = async () =>
      ({
        ok: true,
        json: async () => mockRecipe,
      }) as Response
  })

  it("renders recipe title in hero card", async () => {
    renderRecipePage("pasta-carbonara")
    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
    })
  })

  it("renders prep and cook times", async () => {
    renderRecipePage("pasta-carbonara")
    await waitFor(() => {
      expect(screen.getByText(/Prep:/)).toBeInTheDocument()
      expect(screen.getByText("10 min")).toBeInTheDocument()
      expect(screen.getByText(/Cook:/)).toBeInTheDocument()
      expect(screen.getByText("15 min")).toBeInTheDocument()
    })
  })

  it("shows ingredients tab by default with checkable items", async () => {
    const user = userEvent.setup()
    renderRecipePage("pasta-carbonara")
    await waitFor(() => {
      expect(screen.getAllByText("400g spaghetti")[0]).toBeInTheDocument()
      expect(screen.getAllByText("200g guanciale")[0]).toBeInTheDocument()
    })

    // Click label to check an ingredient (first occurrence = mobile section)
    const label = screen.getAllByText("400g spaghetti")[0].closest("label")!
    await user.click(label)
    expect(screen.getAllByText("400g spaghetti")[0]).toHaveClass("line-through")
  })

  it("keeps the tab switcher sticky at the top on mobile/tablet", async () => {
    renderRecipePage("pasta-carbonara")
    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
    })
    const tablist = screen.getByRole("tablist")
    const stickyWrapper = tablist.parentElement!
    // The switcher is pinned to the top of the scroll container while scrolling
    expect(stickyWrapper.className).toMatch(/\bsticky\b/)
    expect(stickyWrapper.className).toMatch(/\btop-0\b/)
    // ...but only on mobile/tablet, the two-column layout takes over on large screens
    expect(stickyWrapper.className).toMatch(/\blg:hidden\b/)
  })

  it("switches to instructions tab", async () => {
    const user = userEvent.setup()
    renderRecipePage("pasta-carbonara")
    await waitFor(() => {
      expect(screen.getAllByText("400g spaghetti")[0]).toBeInTheDocument()
    })

    await user.click(screen.getByRole("tab", { name: "Instructions" }))
    expect(screen.getAllByText("Portare a ebollizione l'acqua.")[0]).toBeInTheDocument()
    expect(screen.getAllByText("Rosolare il guanciale.")[0]).toBeInTheDocument()
  })

  it("opens the ingredients sheet from the step navigator, sharing the checked state", async () => {
    const user = userEvent.setup()
    renderRecipePage("pasta-carbonara")
    await waitFor(() => expect(screen.getAllByText("400g spaghetti")[0]).toBeInTheDocument())
    await user.click(screen.getAllByText("400g spaghetti")[0].closest("label")!)

    // No handle on the ingredients tab: the list is already there
    expect(screen.queryByRole("button", { name: /^Ingredients\s*1\/2$/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "Instructions" }))
    await user.click(screen.getByRole("button", { name: /^Ingredients\s*1\/2$/ }))

    const sheet = screen.getByRole("dialog", { name: /Ingredients/ })
    expect(within(sheet).getByText("400g spaghetti")).toHaveClass("line-through")
    await user.click(within(sheet).getByText("200g guanciale").closest("label")!)
    expect(within(sheet).getByText("2/2")).toBeInTheDocument()

    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("saves the recipe as a favourite and remembers the visit", async () => {
    const user = userEvent.setup()
    renderRecipePage("pasta-carbonara")
    const button = await screen.findByRole("button", { name: "Add “Pasta alla Carbonara” to favorites" })
    expect(JSON.parse(localStorage.getItem("cucina-mia:recent")!)).toEqual(["pasta-carbonara"])

    await user.click(button)
    expect(screen.getByRole("button", { name: "Remove “Pasta alla Carbonara” from favorites" })).toHaveAttribute("aria-pressed", "true")
    expect(JSON.parse(localStorage.getItem("cucina-mia:favorites")!)).toEqual(["pasta-carbonara"])
  })

  it("shows not found for missing recipe", async () => {
    globalThis.fetch = async () =>
      ({ ok: false } as Response)

    renderRecipePage("nonexistent")
    await waitFor(() => {
      expect(screen.getByText("Recipe not found")).toBeInTheDocument()
    })
  })

  it("renders tips section", async () => {
    renderRecipePage("pasta-carbonara")
    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
    })
    expect(screen.getByText("Usare solo pecorino romano.")).toBeInTheDocument()
  })

  it("renders tags as links to /recipes?tag=<tag>", async () => {
    renderRecipePage("pasta-carbonara")
    await waitFor(() => {
      expect(screen.getByText("pasta")).toBeInTheDocument()
    })
    const pastaLink = screen.getByText("pasta").closest("a")!
    expect(pastaLink).toHaveAttribute("href", "/recipes?tag=pasta")
    const romanoLink = screen.getByText("romano").closest("a")!
    expect(romanoLink).toHaveAttribute("href", "/recipes?tag=romano")
  })

  it("navigates to recipes page filtered by tag when tag is clicked", async () => {
    const user = userEvent.setup()
    renderRecipePage("pasta-carbonara")
    await waitFor(() => {
      expect(screen.getByText("pasta")).toBeInTheDocument()
    })
    await user.click(screen.getByText("pasta").closest("a")!)
    await waitFor(() => {
      expect(screen.getByTestId("recipes-page")).toBeInTheDocument()
    })
  })

  it("renders the origin label as a link to the recipes page filtered by that origin", async () => {
    globalThis.fetch = async () =>
      ({ ok: true, json: async () => ({ ...mockRecipe, origin: "amelie" }) }) as Response
    renderRecipePage("pasta-carbonara")
    await waitFor(() => {
      expect(screen.getByText("Amélie's recipe")).toBeInTheDocument()
    })
    const originLink = screen.getByText("Amélie's recipe").closest("a")!
    expect(originLink).toHaveAttribute("href", "/recipes?origin=amelie")
  })

  it("renders no origin label when the recipe has no origin", async () => {
    renderRecipePage("pasta-carbonara")
    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
    })
    expect(screen.queryByText(/'s recipe/)).not.toBeInTheDocument()
  })

  it("scales ingredient quantities with the servings dropdown", async () => {
    const user = userEvent.setup()
    renderRecipePage("pasta-carbonara")
    const select = await screen.findByRole("combobox", { name: "Number of servings" })
    expect(screen.getAllByRole("combobox")).toHaveLength(1)
    expect(select).toHaveValue("4")
    expect(screen.queryByText(/Quantities adjusted/)).not.toBeInTheDocument()

    await user.selectOptions(select, "2")
    expect(select).toHaveValue("2")
    expect(screen.getAllByText("200g spaghetti")[0]).toBeInTheDocument()
    expect(screen.getAllByText("100g guanciale")[0]).toBeInTheDocument()
    // Mobile ingredients tab + desktop ingredients column, both with the reset link
    expect(screen.getAllByText(/Quantities adjusted \(recipe written for 4\)/)).toHaveLength(2)
    expect(screen.getAllByRole("button", { name: "Back to 4" })).toHaveLength(2)

    // Mobile instructions tab: the note only, without the reset link
    await user.click(screen.getByRole("tab", { name: "Instructions" }))
    const stepsPanel = screen.getByRole("tabpanel")
    expect(within(stepsPanel).getByText(/Quantities adjusted \(recipe written for 4\)/)).toBeInTheDocument()
    expect(within(stepsPanel).queryByRole("button", { name: "Back to 4" })).not.toBeInTheDocument()

    await user.click(screen.getAllByRole("button", { name: "Back to 4" })[0])
    expect(select).toHaveValue("4")
    expect(screen.getAllByText("400g spaghetti")[0]).toBeInTheDocument()
  })

  describe("share button", () => {
    const originalShare = navigator.share
    const originalClipboard = navigator.clipboard

    afterEach(() => {
      Object.defineProperty(navigator, "share", { value: originalShare, configurable: true })
      Object.defineProperty(navigator, "clipboard", { value: originalClipboard, configurable: true })
    })

    it("uses the native share sheet when available", async () => {
      const share = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, "share", { value: share, configurable: true })
      const user = userEvent.setup()
      renderRecipePage("pasta-carbonara")
      await user.click(await screen.findByRole("button", { name: "Share recipe" }))
      expect(share).toHaveBeenCalledWith({
        title: "Pasta alla Carbonara",
        text: "La vera carbonara romana.",
        url: `${window.location.origin}${import.meta.env.BASE_URL}r/pasta-carbonara/en/`,
      })
    })

    it("copies the link when native share is not available", async () => {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true })
      const user = userEvent.setup()
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
      renderRecipePage("pasta-carbonara")
      await user.click(await screen.findByRole("button", { name: "Share recipe" }))
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}${import.meta.env.BASE_URL}r/pasta-carbonara/en/`)
      expect(await screen.findByRole("status")).toHaveTextContent("Link copied!")
    })

    it("shares the link preview in the language the recipe is read in", async () => {
      const share = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, "share", { value: share, configurable: true })
      await i18n.changeLanguage("fr")
      const user = userEvent.setup()
      renderRecipePage("pasta-carbonara")
      await user.click(await screen.findByRole("button", { name: "Partager la recette" }))
      expect(share).toHaveBeenCalledWith(expect.objectContaining({
        url: `${window.location.origin}${import.meta.env.BASE_URL}r/pasta-carbonara/`,
      }))
    })
  })
})

describe("RecipePage timers and related recipes", () => {
  const summary = (slug: string, title: string) => ({
    slug,
    title,
    description: `${title} description`,
    images: { cover: `images/recipes/${slug}/cover.webp`, web: `images/recipes/${slug}/web.webp` },
    prepTime: 5,
    cookTime: 10,
    servings: 2,
    difficulty: "Facile",
    category: "Pasta",
    tags: ["pâtes"],
  })
  const recipe = {
    ...mockRecipe,
    steps: [{ text: "Cuire les pâtes 9 minutes.", timers: [9] }, { text: "Servir." }],
    related: ["pasta-amatriciana", "pesto-presto", "missing-recipe"],
    translations: { en: { steps: [{ text: "Cook the pasta for 9 minutes." }, { text: "Serve." }] } },
  }

  beforeEach(async () => {
    const { clearRecipeCache } = await import("@/lib/recipeData")
    const { resetTimers } = await import("@/lib/timers")
    clearRecipeCache()
    resetTimers()
    localStorage.clear()
    i18n.changeLanguage("en")
    globalThis.fetch = (async (url: string) =>
      ({
        ok: true,
        json: async () =>
          String(url).endsWith("index.json")
            ? [summary("pasta-amatriciana", "Pasta all'Amatriciana"), summary("pesto-presto", "Pesto Presto")]
            : recipe,
      }) as Response) as typeof fetch
  })

  it("keeps base timers on translated steps and starts a countdown", async () => {
    const user = userEvent.setup()
    renderRecipePage("pasta-carbonara")
    const buttons = await screen.findAllByRole("button", { name: "Start a 9 min timer" })
    expect(screen.getAllByText("Cook the pasta for 9 minutes.")[0]).toBeInTheDocument()

    await user.click(buttons[0])
    expect(screen.getAllByRole("button", { name: "Pause timer" }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("timer")[0]).toHaveTextContent("9:00")
  })

  it("uses the translation of a regional browser language (en-US)", async () => {
    await i18n.changeLanguage("en-US")
    renderRecipePage("pasta-carbonara")
    expect((await screen.findAllByText("Cook the pasta for 9 minutes."))[0]).toBeInTheDocument()
  })

  it("shows the related recipes that exist", async () => {
    renderRecipePage("pasta-carbonara")
    expect(await screen.findByRole("heading", { name: "You might also like" })).toBeInTheDocument()
    expect(screen.getByText("Pasta all'Amatriciana")).toBeInTheDocument()
    expect(screen.getByText("Pesto Presto")).toBeInTheDocument()
  })
})
