import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { describe, it, expect, beforeEach } from "vitest"
import i18n from "i18next"
import { PantryPage } from "@/pages/PantryPage"

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.search}</div>
}

const summary = (slug: string, title: string) => ({
  slug,
  title,
  description: `${title} description`,
  images: { cover: `images/recipes/${slug}/cover.svg`, web: `images/recipes/${slug}/cover.svg` },
  prepTime: 10,
  cookTime: 10,
  servings: 2,
  difficulty: "Facile",
  category: "Dolci",
  tags: ["facile"],
})

const recipes = [summary("omelette", "Omelette"), summary("cake", "Yogurt cake"), summary("salad", "Tomato salad")]

const documents = [
  { slug: "omelette", ingredients: { en: "3 eggs · 1 knob of butter · Salt and pepper" } },
  { slug: "cake", ingredients: { en: "3 eggs · 200 g flour · 150 g sugar · 1 plain yogurt" } },
  { slug: "salad", ingredients: { en: "1 lettuce · 2 tomatoes · Olive oil" } },
]

function renderPage(entry = "/pantry") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/pantry" element={<><PantryPage /><LocationDisplay /></>} />
      </Routes>
    </MemoryRouter>
  )
}

describe("PantryPage", () => {
  beforeEach(() => {
    localStorage.clear()
    i18n.changeLanguage("en")
    globalThis.fetch = async (input: RequestInfo | URL) =>
      ({ ok: true, json: async () => (String(input).includes("documents.json") ? documents : recipes) }) as Response
  })

  it("offers the ingredients used by the recipes, grouped, without staples", async () => {
    renderPage()
    expect(await screen.findByRole("button", { name: "Eggs" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: "Tomatoes" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Salt" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Milk" })).not.toBeInTheDocument()
    expect(screen.getByText("Tick at least one ingredient to see what you can cook.")).toBeInTheDocument()
  })

  it("ranks recipes by ticked ingredients and shows what is missing", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole("button", { name: "Eggs" }))
    await user.click(screen.getByRole("button", { name: "Flour" }))

    const results = screen.getByRole("region", { name: "2 recipes" })
    const titles = within(results).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(["Yogurt cake", "Omelette"])
    expect(within(results).getByText("Missing: Sugar, Yogurt")).toBeInTheDocument()
    expect(within(results).getByText("Missing: Butter")).toBeInTheDocument()
    expect(screen.getByTestId("location")).toHaveTextContent("?have=eggs%2Cflour")

    await user.click(screen.getByRole("button", { name: "Fewest to buy" }))
    expect(within(results).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Omelette", "Yogurt cake"])
  })

  it("restores the selection from the URL and says when everything is there", async () => {
    renderPage("/pantry?have=eggs,butter")
    expect(await screen.findByText("You have everything, get cooking!")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Eggs" })).toHaveAttribute("aria-pressed", "true")
    expect(JSON.parse(localStorage.getItem("cucina-mia-pantry")!)).toEqual(["eggs", "butter"])
  })

  it("filters the ingredient list", async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole("button", { name: "Eggs" })
    await user.type(screen.getByRole("searchbox", { name: "Find an ingredient" }), "tom")
    expect(screen.getByRole("button", { name: "Tomatoes" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Eggs" })).not.toBeInTheDocument()
  })

  it("shows an error with a retry when the ingredient data fails to load", async () => {
    globalThis.fetch = async (input: RequestInfo | URL) =>
      (String(input).includes("documents.json") ? { ok: false, status: 404 } : { ok: true, json: async () => recipes }) as unknown as Response
    renderPage()
    expect(await screen.findByRole("alert")).toBeInTheDocument()
  })
})
