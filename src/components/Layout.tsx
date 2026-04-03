import { Outlet, Link, useLocation } from "react-router-dom"
import { Home, BookOpen, PlusCircle, Info } from "lucide-react"
import { useTranslation } from "react-i18next"
import { motion, useReducedMotion } from "motion/react"
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
        className="cursor-pointer text-sm font-semibold uppercase tracking-widest text-outline hover:text-primary transition-colors px-2 py-1"
        aria-label="Switch language"
      >
        {currentCode}
      </button>
      {open && (
        <div className="absolute top-7 right-0 bg-surface/70 backdrop-blur-[20px] rounded-xl shadow-ambient overflow-hidden z-50 min-w-[110px]">
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
  const reduceMotion = useReducedMotion()

  const navItems = [
    { to: "/", icon: Home, label: t("nav.home") },
    { to: "/recipes", icon: BookOpen, label: t("nav.recipes") },
    { to: "/about", icon: Info, label: t("nav.about") },
  ]

  return (
    <div className="h-dvh flex flex-col bg-surface overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded"
      >
        Skip to content
      </a>
      {/* Top App Bar */}
      <nav className="shrink-0 relative flex items-center px-6 h-14 bg-surface/70 backdrop-blur-md z-50 print:hidden">
        <div id="header-left-slot" className="w-24 shrink-0" />
        <Link to="/" className="absolute left-1/2 -translate-x-1/2">
          <motion.h1
            key={pathname}
            className="text-3xl font-headline text-primary font-bold whitespace-nowrap"
            initial={reduceMotion ? { opacity: 1, letterSpacing: "-0.05em" } : { opacity: 0, letterSpacing: "-0.2em" }}
            animate={{ opacity: 1, letterSpacing: "-0.05em" }}
            transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
          >
            CUCINA MIA
          </motion.h1>
        </Link>
        <div className="ml-auto w-24 flex justify-end shrink-0">
          <LanguageSwitcher />
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden">
        <motion.div
          key={pathname}
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Bottom Nav Bar */}
      <nav className="shrink-0 flex justify-around items-center px-4 pb-1.5 pt-1.5 bg-surface/70 backdrop-blur-[20px] rounded-t-xl z-50 print:hidden">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = to === "/"
            ? pathname === "/"
            : pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              onClick={to === "/recipes" ? () => localStorage.removeItem("cucina-mia-filters") : undefined}
              className={
                isActive
                  ? "relative flex flex-col items-center justify-center text-primary-foreground rounded-xl px-5 py-1 scale-95 transition-transform"
                  : "relative flex flex-col items-center justify-center text-outline px-5 py-1 hover:text-primary transition-colors"
              }
            >
              {isActive && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute inset-0 gradient-primary rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="relative z-10 h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="relative z-10 text-[9px] uppercase tracking-widest font-semibold mt-0.5">
                {label}
              </span>
            </Link>
          )
        })}
        <a
          href="https://github.com/PierrickMartos/Cucina-Mia/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center text-outline px-5 py-1 hover:text-primary transition-colors"
        >
          <PlusCircle className="h-5 w-5" strokeWidth={2} />
          <span className="text-[9px] uppercase tracking-widest font-semibold mt-0.5">
            {t("nav.add")}
          </span>
        </a>
      </nav>
    </div>
  )
}
