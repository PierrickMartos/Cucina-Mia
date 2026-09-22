import "@testing-library/jest-dom/vitest"
import "../i18n"
import { clearRecipeCache } from "../lib/recipeData"

// jsdom does not implement IntersectionObserver
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver

// Recipe data is cached in memory across renders; reset it so each test's fetch mock is used
beforeEach(() => {
  clearRecipeCache()
})
