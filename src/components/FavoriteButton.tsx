import { useTranslation } from "react-i18next"
import { Heart } from "lucide-react"
import { toggleFavorite, useFavorites } from "@/lib/savedRecipes"
import { cn } from "@/lib/utils"

interface FavoriteButtonProps {
  slug: string
  title: string
  /** "overlay": round button over a photo. "pill": outlined button with a label, like Share. */
  variant?: "overlay" | "pill"
  className?: string
}

export function FavoriteButton({ slug, title, variant = "overlay", className }: FavoriteButtonProps) {
  const { t } = useTranslation()
  const active = useFavorites().includes(slug)
  const label = active ? t("favorites.remove", { title }) : t("favorites.add", { title })

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={() => toggleFavorite(slug)}
        aria-pressed={active}
        aria-label={label}
        className={cn(
          // Round icon button on phones, labelled pill from `sm`
          "inline-flex items-center justify-center gap-2 rounded-full border h-11 w-11 sm:h-10 sm:w-auto sm:px-4 text-xs font-semibold uppercase tracking-widest transition-colors cursor-pointer",
          active
            ? "border-primary/40 text-primary"
            : "border-border text-muted-foreground hover:text-primary hover:border-primary/40",
          className
        )}
      >
        <Heart className={cn("h-4 w-4 sm:h-3.5 sm:w-3.5", active && "fill-current")} />
        <span className="sr-only sm:not-sr-only">{active ? t("favorites.saved") : t("favorites.save")}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(slug)}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "cursor-pointer inline-flex items-center justify-center h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors print:hidden",
        className
      )}
    >
      <Heart className={cn("h-4 w-4 transition-transform", active && "fill-current text-primary scale-110")} />
    </button>
  )
}
