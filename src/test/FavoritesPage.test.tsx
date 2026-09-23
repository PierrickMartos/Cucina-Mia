import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, it, expect, beforeEach } from "vitest"
import i18n from "i18next"
import { FavoritesPage } from "@/pages/FavoritesPage"
import { HomePage } from "@/pages/HomePage"
import { markViewed, toggleFavorite } from "@/lib/savedRecipes"

const mockRecipes = ["pasta-carbonara", "tiramisu", "pizza-margherita"].map((slug, i) => ({
  slug,
  title: ["Pasta alla Carbonara", "Tiramisù Classico", "Pizza Margherita"][i],
  description: "",
  images: { cover: `images/recipes/${slug}/cover.svg`, web: `images/recipes/${slug}/cover.svg` },
  prepTime: 10,
  cookTime: 10,
  servings: 4,
  difficulty: "Facile" as const,
  category: ["Pasta", "Dolci", "Pizze"][i],
  tags: [],
}))

function renderPage(page: React.ReactNode) {
  return render(<MemoryRouter>{page}</MemoryRouter>)
}

describe("favourites and recently viewed", () => {
  beforeEach(() => {
    localStorage.clear()
    i18n.changeLanguage("en")
    globalThis.fetch = async () => ({ ok: true, json: async () => mockRecipes }) as Response
  })

  it("shows an empty state without favourites", async () => {
    renderPage(<FavoritesPage />)
    expect(await screen.findByText("No favorites yet")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Browse recipes" })).toHaveAttribute("href", "/recipes")
  })

  it("lists favourites most recently saved first and removes them from the card heart", async () => {
    toggleFavorite("pasta-carbonara")
    toggleFavorite("pizza-margherita")
    toggleFavorite("removed-from-cookbook")
    const user = userEvent.setup()
    renderPage(<FavoritesPage />)

    await waitFor(() =>
      expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Pizza Margherita", "Pasta alla Carbonara"])
    )
    await user.click(screen.getByRole("button", { name: "Remove “Pizza Margherita” from favorites" }))
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Pasta alla Carbonara"])
    expect(JSON.parse(localStorage.getItem("cucina-mia:favorites")!)).toEqual(["removed-from-cookbook", "pasta-carbonara"])
  })

  it("shows the recently viewed recipes on the home page, latest first, and clears them", async () => {
    markViewed("tiramisu")
    markViewed("pasta-carbonara")
    markViewed("tiramisu")
    const user = userEvent.setup()
    renderPage(<HomePage />)

    const row = await screen.findByRole("region", { name: "Recently viewed" })
    expect(within(row).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/recipe/tiramisu", "/recipe/pasta-carbonara"])

    await user.click(within(row).getByRole("button", { name: "Clear" }))
    expect(screen.queryByRole("region", { name: "Recently viewed" })).not.toBeInTheDocument()
  })

  it("keeps at most 8 recently viewed recipes", () => {
    for (let i = 0; i < 10; i++) markViewed(`recipe-${i}`)
    expect(JSON.parse(localStorage.getItem("cucina-mia:recent")!)).toHaveLength(8)
    expect(JSON.parse(localStorage.getItem("cucina-mia:recent")!)[0]).toBe("recipe-9")
  })
})
