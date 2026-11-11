import { useEffect, useState } from "react"
import { Share, X } from "lucide-react"
import { Trans, useTranslation } from "react-i18next"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { dismissInstallBanner, shouldShowInstallBanner } from "@/lib/installPrompt"

/** Invites iPhone visitors browsing in Safari to add Cucina Mia to their home screen */
export function InstallBanner() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)

  // Shown a moment after the page has loaded, not in the way of the first paint
  useEffect(() => {
    if (!shouldShowInstallBanner()) return
    const id = window.setTimeout(() => setVisible(true), 1500)
    return () => window.clearTimeout(id)
  }, [])

  function close() {
    dismissInstallBanner()
    setVisible(false)
  }

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.aside
          aria-label={t("install.title")}
          className="shrink-0 overflow-hidden print:hidden"
          initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="mx-3 mb-2 flex items-center gap-3 rounded-2xl bg-surface-low p-3 pr-2 ghost-border shadow-ambient">
            <img
              src={`${import.meta.env.BASE_URL}apple-touch-icon.png`}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-[0.7rem]"
            />
            <div className="min-w-0 flex-1 text-sm leading-snug">
              <p className="font-headline font-bold text-primary">{t("install.title")}</p>
              <p className="text-muted-foreground">
                <Trans
                  i18nKey="install.howTo"
                  components={{
                    share: <Share className="mx-0.5 inline h-4 w-4 -translate-y-px text-primary" aria-label={t("install.share")} />,
                    strong: <strong className="font-semibold text-foreground" />,
                  }}
                />
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={t("common.close")}
              className="cursor-pointer shrink-0 self-start rounded-full p-1.5 text-outline hover:bg-surface-high hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
