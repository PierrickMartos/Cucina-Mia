import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { WifiOff } from "lucide-react"
import { useOnline } from "@/lib/serviceWorker"
import { cn } from "@/lib/utils"

/** Failed load with a retry button. Offline, it explains why and retries once the connection is back. */
export function LoadError({ onRetry, className }: { onRetry: () => void; className?: string }) {
  const { t } = useTranslation()
  const online = useOnline()
  const retryRef = useRef(onRetry)
  useEffect(() => { retryRef.current = onRetry })

  const wasOffline = useRef(!online)
  useEffect(() => {
    if (!online) wasOffline.current = true
    else if (wasOffline.current) {
      wasOffline.current = false
      retryRef.current()
    }
  }, [online])

  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center py-16 text-center gap-4", className)}>
      {!online && <WifiOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
      <p className="text-sm text-muted-foreground max-w-sm">{t(online ? "common.loadError" : "common.offlineError")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-surface-high px-5 py-2 text-sm font-medium text-foreground hover:bg-surface-container transition-colors cursor-pointer"
      >
        {t("common.tryAgain")}
      </button>
    </div>
  )
}
