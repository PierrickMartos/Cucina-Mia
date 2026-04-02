import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, it, expect, beforeEach } from "vitest"
import i18n from "i18next"
import { RecipesPage } from "@/pages/RecipesPage"

const mockRecipes = [
  {
    slug: "pasta-carbonara",
    title: "Pasta alla Carbonara",
    description: "La vera carbonara romana con guanciale.",
    image: "images/recipes/pasta-carbonara/cover.svg",
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    difficulty: "Medio",
    category: "Antipasti",
    tags: ["pasta", "romano"],
  },
  {
    slug: "tiramisu",
    title: "Tiramisù Classico",
    description: "Il dolce italiano più amato al mondo.",
    image: "images/recipes/tiramisu/cover.svg",
    prepTime: 30,
    cookTime: 0,
    servings: 8,
    difficulty: "Facile",
    category: "Dolci",
    tags: ["dolce", "caffè"],
  },
  {
    slug: "pizza-margherita",
    title: "Pizza Margherita",
    description: "La pizza napoletana classica.",
    image: "images/recipes/pizza-margherita/cover.svg",
    prepTime: 20,
    cookTime: 10,
    servings: 2,
    difficulty: "Medio",
    category: "Pizze",
    tags: ["pizza", "napoletana"],
  },
]

function renderRecipesPage(search = "") {
  const initialEntry = search ? `/recipes?q=${encodeURIComponent(search)}` : "/recipes"
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/recipes" element={<RecipesPage />} />
      </Routes>
    </MemoryRouter>
  )
}

function renderRecipesPageWithCategory(category: string) {
  return render(
    <MemoryRouter initialEntries={[`/recipes?category=${encodeURIComponent(category)}`]}>
      <Routes>
        <Route path="/recipes" element={<RecipesPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("RecipesPage", () => {
  beforeEach(() => {
    i18n.changeLanguage("en")
    globalThis.fetch = async () =>
      ({ json: async () => mockRecipes }) as Response
  })

  it("renders all recipes after loading", async () => {
    renderRecipesPage()
    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
      expect(screen.getByText("Tiramisù Classico")).toBeInTheDocument()
      expect(screen.getByText("Pizza Margherita")).toBeInTheDocument()
    })
  })

  it("filters recipes by search input", async () => {
    const user = userEvent.setup()
    renderRecipesPage()
    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/search/i)
    await user.clear(input)
    await user.type(input, "carbonara")

    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
      expect(screen.queryByText("Tiramisù Classico")).not.toBeInTheDocument()
      expect(screen.queryByText("Pizza Margherita")).not.toBeInTheDocument()
    })
  })

  it("pre-filters by category from URL param", async () => {
    renderRecipesPageWithCategory("Dolci")
    await waitFor(() => {
      expect(screen.getByText("Tiramisù Classico")).toBeInTheDocument()
      expect(screen.queryByText("Pasta alla Carbonara")).not.toBeInTheDocument()
      expect(screen.queryByText("Pizza Margherita")).not.toBeInTheDocument()
    })
  })

  it("pre-fills search from URL param", async () => {
    renderRecipesPage("pizza")
    await waitFor(() => {
      expect(screen.getByText("Pizza Margherita")).toBeInTheDocument()
      expect(screen.queryByText("Pasta alla Carbonara")).not.toBeInTheDocument()
    })
    expect(screen.getByDisplayValue("pizza")).toBeInTheDocument()
  })

  it("shows empty state when search has no matches", async () => {
    const user = userEvent.setup()
    renderRecipesPage()
    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/search/i)
    await user.type(input, "xyznotarecipe")

    await waitFor(() => {
      expect(screen.getByText("No recipe found")).toBeInTheDocument()
    })
  })
})
