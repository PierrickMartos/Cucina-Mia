import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, it, expect, beforeEach } from "vitest"
import i18n from "i18next"
import { HomePage } from "@/pages/HomePage"

const mockRecipes = [
  {
    slug: "pasta-carbonara",
    title: "Pasta alla Carbonara",
    description: "La vera carbonara romana con guanciale.",
    image: "images/recipes/pasta-carbonara/cover.svg",
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    difficulty: "Medio" as const,
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
    difficulty: "Facile" as const,
    category: "Dolci",
    tags: ["dolce", "caffè"],
  },
]

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  )
}

describe("HomePage", () => {
  beforeEach(() => {
    i18n.changeLanguage("en")
    globalThis.fetch = async () =>
      ({
        json: async () => mockRecipes,
      }) as Response
  })

  it("renders category cards after loading", async () => {
    renderHomePage()
    await waitFor(() => {
      expect(screen.getByText("Starters")).toBeInTheDocument()
      expect(screen.getByText("Desserts")).toBeInTheDocument()
    })
  })

  it("renders the hero headline", () => {
    renderHomePage()
    expect(screen.getByText("Buon appetito")).toBeInTheDocument()
  })

  it("renders search input", () => {
    renderHomePage()
    expect(screen.getByPlaceholderText("Search a recipe...")).toBeInTheDocument()
  })

  it("links category cards to filtered recipes page", async () => {
    renderHomePage()
    await waitFor(() => {
      const antipastiLink = screen.getByText("Starters").closest("a")
      expect(antipastiLink).toHaveAttribute("href", "/recipes?category=Antipasti")
    })
  })
})
