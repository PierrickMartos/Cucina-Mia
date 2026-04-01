import { Outlet, Link, useLocation } from "react-router-dom"
import { Home, BookOpen } from "lucide-react"

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/recipes", icon: BookOpen, label: "Ricette" },
]

export function Layout() {
  const { pathname } = useLocation()

  return (
    <div className="h-dvh flex flex-col bg-surface overflow-hidden">
      {/* Top App Bar */}
      <nav className="shrink-0 flex justify-between items-center px-6 h-14 bg-surface/70 backdrop-blur-md z-50">
        <div className="w-10" />
        <Link to="/">
          <h1 className="text-xl font-headline tracking-tighter text-primary font-bold">
            CUCINA MIA
          </h1>
        </Link>
        <div className="w-10" />
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>

      {/* Bottom Nav Bar */}
      <nav className="shrink-0 flex justify-around items-center px-4 pb-1.5 pt-1.5 bg-surface/90 backdrop-blur-md rounded-t-xl shadow-[0_-2px_8px_rgba(0,0,0,0.03)] z-50">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = to === "/"
            ? pathname === "/"
            : pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={
                isActive
                  ? "flex flex-col items-center justify-center bg-primary text-primary-foreground rounded-xl px-5 py-1 scale-95 transition-all"
                  : "flex flex-col items-center justify-center text-outline px-5 py-1 hover:text-primary transition-colors"
              }
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] uppercase tracking-widest font-semibold mt-0.5">
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
