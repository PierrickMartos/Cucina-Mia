import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, it, expect, beforeEach } from "vitest"
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

  it("switches to instructions tab", async () => {
    const user = userEvent.setup()
    renderRecipePage("pasta-carbonara")
    await waitFor(() => {
      expect(screen.getAllByText("400g spaghetti")[0]).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Instructions" }))
    expect(screen.getAllByText("Portare a ebollizione l'acqua.")[0]).toBeInTheDocument()
    expect(screen.getAllByText("Rosolare il guanciale.")[0]).toBeInTheDocument()
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
})
