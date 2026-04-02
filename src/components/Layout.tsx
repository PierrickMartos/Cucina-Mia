import { Outlet, Link, useLocation } from "react-router-dom"
import { Home, BookOpen } from "lucide-react"
import { useTranslation } from "react-i18next"
import { motion } from "motion/react"
import { useState, useRef, useEffect } from "react"

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
]

function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const currentCode = i18n.language?.slice(0, 2) ?? "en"

  function selectLanguage(code: string) {
    i18n.changeLanguage(code)
    localStorage.setItem("cucina-mia-lang", code)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative w-10 flex justify-end">
      <button
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer text-[10px] font-semibold uppercase tracking-widest text-outline hover:text-primary transition-colors px-1 py-0.5"
        aria-label="Switch language"
      >
        {currentCode}
      </button>
      {open && (
        <div className="absolute top-7 right-0 bg-surface border border-outline/20 rounded-xl shadow-lg overflow-hidden z-50 min-w-[110px]">
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => selectLanguage(code)}
              className={`cursor-pointer w-full text-left px-4 py-2.5 text-xs font-medium transition-colors hover:bg-primary/10 ${
                currentCode === code ? "text-primary font-semibold" : "text-outline"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Layout() {
  const { pathname } = useLocation()
  const { t } = useTranslation()

  const navItems = [
    { to: "/", icon: Home, label: t("nav.home") },
    { to: "/recipes", icon: BookOpen, label: t("nav.recipes") },
  ]

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
        <LanguageSwitcher />
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
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
