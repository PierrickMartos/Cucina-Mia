import { Routes, Route } from "react-router-dom"
import { Layout } from "./components/Layout"
import { HomePage } from "./pages/HomePage"
import { RecipePage } from "./pages/RecipePage"

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipe/:slug" element={<RecipePage />} />
      </Route>
    </Routes>
  )
}
