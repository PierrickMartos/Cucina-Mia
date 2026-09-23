import { useId } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown, Users } from "lucide-react"
import { servingOptions } from "@/lib/scaleIngredient"

interface ServingsSelectProps {
  base: number
  value: number
  onChange: (value: number) => void
}

export function ServingsSelect({ base, value, onChange }: ServingsSelectProps) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
      <label htmlFor={id} className="sr-only">{t("recipe.servingsLabel")}</label>
      <div className="relative print:hidden">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="appearance-none rounded-full border border-border bg-background pl-3 pr-7 py-1 text-sm font-semibold text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer transition-colors"
        >
          {servingOptions(base).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" aria-hidden="true" />
      </div>
      <span className="hidden print:inline font-semibold text-foreground">{value}</span>
      <span>{t("recipe.servings")}</span>
    </div>
  )
}
