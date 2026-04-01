import { Outlet, Link } from "react-router-dom"
import { UtensilsCrossed } from "lucide-react"

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            <span>Cucina Mia</span>
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          Cucina Mia &mdash; Ricette italiane con amore
        </div>
      </footer>
    </div>
  )
}
