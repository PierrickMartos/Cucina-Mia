import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { describe, it, expect, beforeEach, vi } from "vitest"
import i18n from "i18next"
import { RecipesPage } from "@/pages/RecipesPage"

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}{location.search}</div>
}

const mockRecipes = [
  {
    slug: "pasta-carbonara",
    title: "Pasta alla Carbonara",
    description: "La vera carbonara romana con guanciale.",
    images: { cover: "images/recipes/pasta-carbonara/cover.svg", web: "images/recipes/pasta-carbonara/cover.svg" },
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
    images: { cover: "images/recipes/tiramisu/cover.svg", web: "images/recipes/tiramisu/cover.svg" },
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
    images: { cover: "images/recipes/pizza-margherita/cover.svg", web: "images/recipes/pizza-margherita/cover.svg" },
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
    <main id="main-content">
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/recipes" element={<RecipesPage />} />
        </Routes>
      </MemoryRouter>
    </main>
  )
}

function renderRecipesPageWithCategory(category: string) {
  return render(
    <main id="main-content">
      <MemoryRouter initialEntries={[`/recipes?category=${encodeURIComponent(category)}`]}>
        <Routes>
          <Route path="/recipes" element={<RecipesPage />} />
        </Routes>
      </MemoryRouter>
    </main>
  )
}

function renderRecipesPageWithTag(tag: string) {
  return render(
    <main id="main-content">
      <MemoryRouter initialEntries={[`/recipes?tag=${encodeURIComponent(tag)}`]}>
        <LocationDisplay />
        <Routes>
          <Route path="/recipes" element={<RecipesPage />} />
        </Routes>
      </MemoryRouter>
    </main>
  )
}

function renderRecipesPageWithEssentials() {
  return render(
    <main id="main-content">
      <MemoryRouter initialEntries={["/recipes?incontournables=1"]}>
        <LocationDisplay />
        <Routes>
          <Route path="/recipes" element={<RecipesPage />} />
        </Routes>
      </MemoryRouter>
    </main>
  )
}

describe("RecipesPage", () => {
  beforeEach(() => {
    localStorage.clear()
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

  it("pre-filters by tag from URL param", async () => {
    renderRecipesPageWithTag("pasta")
    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
      expect(screen.queryByText("Tiramisù Classico")).not.toBeInTheDocument()
      expect(screen.queryByText("Pizza Margherita")).not.toBeInTheDocument()
    })
  })

  it("shows active tag chip when tag param is present", async () => {
    renderRecipesPageWithTag("dolce")
    await waitFor(() => {
      expect(screen.getByText("dolce")).toBeInTheDocument()
    })
  })

  it("clears tag filter and removes tag from URL when chip X is clicked", async () => {
    const user = userEvent.setup()
    renderRecipesPageWithTag("pasta")
    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
    })
    expect(screen.getByTestId("location").textContent).toContain("tag=pasta")

    // Click the X on the tag chip
    const chip = screen.getByText("pasta").closest("button")!
    await user.click(chip)

    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
      expect(screen.getByText("Tiramisù Classico")).toBeInTheDocument()
      expect(screen.getByText("Pizza Margherita")).toBeInTheDocument()
    })
    expect(screen.queryByText("Tag:")).not.toBeInTheDocument()
    expect(screen.getByTestId("location").textContent).not.toContain("tag=")
  })

  it("pre-filters incontournables from URL param", async () => {
    const user = userEvent.setup()
    renderRecipesPageWithEssentials()

    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
      expect(screen.queryByText("Tiramisù Classico")).not.toBeInTheDocument()
      expect(screen.queryByText("Pizza Margherita")).not.toBeInTheDocument()
    })
    expect(screen.getByTestId("location").textContent).toContain("incontournables=1")

    await user.click(screen.getByText("⭐ Must-haves").closest("button")!)

    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
      expect(screen.getByText("Tiramisù Classico")).toBeInTheDocument()
      expect(screen.getByText("Pizza Margherita")).toBeInTheDocument()
    })
    expect(screen.getByTestId("location").textContent).not.toContain("incontournables=")
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
      expect(screen.getByText("Mamma mia, the pot is empty!")).toBeInTheDocument()
    })
  })

  it("shows a back to top button after scrolling and scrolls the recipe list to the top", async () => {
    const user = userEvent.setup()
    renderRecipesPage()

    await waitFor(() => {
      expect(screen.getByText("Pasta alla Carbonara")).toBeInTheDocument()
    })
    expect(screen.queryByLabelText("Back to top")).not.toBeInTheDocument()

    const main = document.getElementById("main-content")!
    const scrollTo = vi.fn()
    main.scrollTo = scrollTo
    main.scrollTop = 520
    fireEvent.scroll(main)

    const button = await screen.findByLabelText("Back to top")
    await user.click(button)

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" })
  })
})
