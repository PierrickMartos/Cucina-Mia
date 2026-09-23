import { Routes, Route, useLocation } from "react-router-dom"
import { lazy, Suspense, useEffect, type ReactNode } from "react"
import { Layout } from "./components/Layout"
import { HomePage } from "./pages/HomePage"
// Kept in the main bundle: shared recipe links land here, a separate chunk would add a round trip
import { RecipePage } from "./pages/RecipePage"
import { runWhenIdle } from "./lib/utils"

// Secondary pages are split out of the main bundle so the first page renders sooner.
const loadRecipesPage = () => import("./pages/RecipesPage")
const loadAboutPage = () => import("./pages/AboutPage")
const loadPantryPage = () => import("./pages/PantryPage")
const RecipesPage = lazy(() => loadRecipesPage().then((m) => ({ default: m.RecipesPage })))
const AboutPage = lazy(() => loadAboutPage().then((m) => ({ default: m.AboutPage })))
const PantryPage = lazy(() => loadPantryPage().then((m) => ({ default: m.PantryPage })))

// Once the first page is up, fetch the other pages in the background so navigating stays instant.
function usePrefetchPages() {
  useEffect(() => {
    return runWhenIdle(() => {
      for (const load of [loadRecipesPage, loadAboutPage, loadPantryPage]) load().catch(() => {})
    }, 3000)
  }, [])
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.querySelector("main")?.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}

export default function App() {
  usePrefetchPages()
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipes" element={<Page><RecipesPage /></Page>} />
        <Route path="/recipe/:slug" element={<RecipePage />} />
        <Route path="/about" element={<Page><AboutPage /></Page>} />
        <Route path="/pantry" element={<Page><PantryPage /></Page>} />
      </Route>
    </Routes>
    </>
  )
}
