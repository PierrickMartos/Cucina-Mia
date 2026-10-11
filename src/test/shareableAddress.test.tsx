import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HashRouter, Link } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import i18n from "i18next"
import { useShareableAddress } from "@/lib/shareableAddress"

const BASE = import.meta.env.BASE_URL

function Harness() {
  useShareableAddress()
  return <Link to="/recipes">Recipes</Link>
}

function openAt(hash: string) {
  window.history.replaceState(null, "", `${BASE}${hash}`)
  render(<HashRouter><Harness /></HashRouter>)
}

describe("address bar on recipe pages", () => {
  afterEach(() => i18n.changeLanguage("fr"))

  it("shows the recipe's share page path, so a copied URL unfurls with the recipe", async () => {
    await i18n.changeLanguage("fr")
    openAt("#/recipe/aubergines-teriyaki")
    expect(window.location.pathname).toBe(`${BASE}r/aubergines-teriyaki/`)
    expect(window.location.hash).toBe("#/recipe/aubergines-teriyaki")
  })

  it("uses the share page of the current language", async () => {
    await i18n.changeLanguage("en")
    openAt("#/recipe/aubergines-teriyaki")
    expect(window.location.pathname).toBe(`${BASE}r/aubergines-teriyaki/en/`)
  })

  it("goes back to the site root when leaving the recipe", async () => {
    openAt("#/recipe/aubergines-teriyaki")
    await userEvent.click(screen.getByText("Recipes"))
    expect(window.location.pathname).toBe(BASE)
    expect(window.location.hash).toBe("#/recipes")
  })
})
