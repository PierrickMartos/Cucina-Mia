import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, it, expect, beforeEach } from "vitest"
import { RecipePage } from "@/pages/RecipePage"

const mockRecipe = {
  slug: "pasta-carbonara",
  title: "Pasta alla Carbonara",
  description: "La vera carbonara romana.",
  image: "images/recipes/pasta-carbonara/cover.svg",
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
      </Routes>
    </MemoryRouter>
  )
}

describe("RecipePage", () => {
  beforeEach(() => {
    globalThis.fetch = async () =>
      ({
        ok: true,
        json: async () => mockRecipe,
      }) as Response
  })

  it("renders recipe details", async () => {
    renderRecipePage("pasta-carbonara")
    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
    })
    expect(screen.getByText("La vera carbonara romana.")).toBeInTheDocument()
    expect(screen.getByText("400g spaghetti")).toBeInTheDocument()
    expect(screen.getByText("200g guanciale")).toBeInTheDocument()
    expect(screen.getByText("Portare a ebollizione l'acqua.")).toBeInTheDocument()
    expect(screen.getByText("Usare solo pecorino romano.")).toBeInTheDocument()
  })

  it("shows not found for missing recipe", async () => {
    globalThis.fetch = async () =>
      ({ ok: false } as Response)

    renderRecipePage("nonexistent")
    await waitFor(() => {
      expect(screen.getByText("Ricetta non trovata")).toBeInTheDocument()
    })
  })

  it("displays time, servings, and difficulty", async () => {
    renderRecipePage("pasta-carbonara")
    await waitFor(() => {
      expect(screen.getByText("25 min")).toBeInTheDocument()
      expect(screen.getByText("4")).toBeInTheDocument()
      expect(screen.getAllByText("Medio")).toHaveLength(2) // badge + info card
    })
  })
})
