import { Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { SemanticStatus } from "@/lib/search"
import { cn } from "@/lib/utils"

export function SemanticSearchIndicator({ status }: { status: SemanticStatus }) {
  const { t } = useTranslation()
  if (status !== "loading" && status !== "ready") return null
  const label = t(status === "ready" ? "search.semanticReady" : "search.semanticLoading")
  return (
    <span role="img" aria-label={label} title={label} className="ml-2 shrink-0">
      <Sparkles className={cn("h-4 w-4", status === "ready" ? "text-primary" : "text-outline animate-pulse")} />
    </span>
  )
}
