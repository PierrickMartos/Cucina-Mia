import { Routes, Route, useLocation } from "react-router-dom"
import { useEffect } from "react"
import { Layout } from "./components/Layout"
import { HomePage } from "./pages/HomePage"
import { RecipesPage } from "./pages/RecipesPage"
import { RecipePage } from "./pages/RecipePage"
import { AboutPage } from "./pages/AboutPage"

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.querySelector("main")?.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/recipe/:slug" element={<RecipePage />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>
    </Routes>
    </>
  )
}
