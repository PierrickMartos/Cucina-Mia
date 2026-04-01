import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, it, expect, beforeEach } from "vitest"
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
    category: "Primi",
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
    globalThis.fetch = async () =>
      ({
        json: async () => mockRecipes,
      }) as Response
  })

  it("renders recipe cards after loading", async () => {
    renderHomePage()
    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
      expect(screen.getByText("Tiramisù Classico")).toBeInTheDocument()
    })
  })

  it("filters recipes by search query", async () => {
    const user = userEvent.setup()
    renderHomePage()
    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText("Cerca ricette...")
    await user.type(searchInput, "carbonara")

    expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
    expect(screen.queryByText("Tiramisù Classico")).not.toBeInTheDocument()
  })

  it("shows empty state when no recipes match", async () => {
    const user = userEvent.setup()
    renderHomePage()
    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText("Cerca ricette...")
    await user.type(searchInput, "xyznonexistent")

    expect(screen.getByText("Nessuna ricetta trovata")).toBeInTheDocument()
  })

  it("renders the search bar and filter button", async () => {
    renderHomePage()
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Cerca ricette...")).toBeInTheDocument()
      expect(screen.getByText("Filtri")).toBeInTheDocument()
    })
  })
})
