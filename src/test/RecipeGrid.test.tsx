import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, it, expect } from "vitest"
import { RecipeGrid } from "@/components/RecipeGrid"
import type { RecipeSummary } from "@/types/recipe"

const mockRecipes: RecipeSummary[] = [
  {
    slug: "pasta-carbonara",
    title: "Pasta alla Carbonara",
    description: "La vera carbonara romana.",
    image: "images/recipes/pasta-carbonara/cover.svg",
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    difficulty: "Medio",
    category: "Antipasti",
    tags: ["pasta"],
  },
  {
    slug: "tiramisu",
    title: "Tiramisù Classico",
    description: "Il dolce più amato.",
    image: "images/recipes/tiramisu/cover.svg",
    prepTime: 30,
    cookTime: 0,
    servings: 8,
    difficulty: "Facile",
    category: "Dolci",
    tags: ["dolce"],
  },
]

function renderGrid(props: Parameters<typeof RecipeGrid>[0]) {
  return render(
    <MemoryRouter>
      <RecipeGrid {...props} />
    </MemoryRouter>
  )
}

describe("RecipeGrid", () => {
  it("shows skeletons while loading", () => {
    const { container } = renderGrid({ recipes: [], loading: true })
    // Three skeleton placeholders rendered
    const skeletons = container.querySelectorAll(".animate-pulse")
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
  })

  it("shows empty state when no recipes", () => {
    renderGrid({ recipes: [] })
    expect(screen.getByText("No recipe found")).toBeInTheDocument()
  })

  it("renders a card per recipe", () => {
    renderGrid({ recipes: mockRecipes })
    expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
    expect(screen.getByText("Tiramisù Classico")).toBeInTheDocument()
  })

  it("links each card to its recipe detail page", () => {
    renderGrid({ recipes: mockRecipes })
    const carbonaraLink = screen.getByText("Pasta alla Carbonara").closest("a")
    expect(carbonaraLink).toHaveAttribute("href", "/recipe/pasta-carbonara")
    const tiramisuLink = screen.getByText("Tiramisù Classico").closest("a")
    expect(tiramisuLink).toHaveAttribute("href", "/recipe/tiramisu")
  })
})
