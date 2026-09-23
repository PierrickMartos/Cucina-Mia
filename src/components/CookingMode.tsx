import { useEffect, useId, useRef, useState } from "react"
import type { TouchEvent as ReactTouchEvent } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { FocusTrap } from "focus-trap-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowLeft, ArrowRight, Check, ListChecks, Mic, MicOff, Volume2, VolumeX, X } from "lucide-react"
import type { RecipeDetail } from "@/types/recipe"
import { StepTimerButtons } from "@/components/CookingTimers"
import { useWakeLock } from "@/hooks/useWakeLock"
import { isVoiceControlSupported, useVoiceCommands } from "@/hooks/useVoiceCommands"
import { dismissTimer, startTimer, timerId, useTimers } from "@/lib/timers"
import type { VoiceCommand } from "@/lib/voiceCommands"

const BASE = import.meta.env.BASE_URL
const READ_ALOUD_KEY = "cucina-mia:cooking-mode:read-aloud"
// Horizontal travel (px) for a touch move to count as a swipe
const SWIPE_MIN = 50

interface CookingModeProps {
  recipe: RecipeDetail
  step: number
  onStepChange: (step: number) => void
  onClose: () => void
  /** Ingredient line as displayed on the page (scaled to the chosen servings). */
  displayIngredient: (item: string) => string
  speakingStep: number | null
  onSpeak: (step: number) => void
  onStopSpeaking: () => void
}

function loadReadAloud() {
  try { return localStorage.getItem(READ_ALOUD_KEY) === "1" } catch { return false }
}

/**
 * Full-screen, one step at a time view for cooking with messy hands: big text, swipe or arrow
 * keys to move, the step's timers inline, optional reading aloud and voice commands.
 */
export function CookingMode({
  recipe,
  step,
  onStepChange,
  onClose,
  displayIngredient,
  speakingStep,
  onSpeak,
  onStopSpeaking,
}: CookingModeProps) {
  const { t, i18n } = useTranslation()
  const reduceMotion = useReducedMotion()
  const titleId = useId()
  const ingredientsId = useId()
  const total = recipe.steps.length
  const current = recipe.steps[step]
  const isLast = step === total - 1
  const [direction, setDirection] = useState(1)
  const [readAloud, setReadAloud] = useState(loadReadAloud)
  const [voiceOn, setVoiceOn] = useState(false)
  const [showIngredients, setShowIngredients] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const { timers: activeTimers } = useTimers()
  const voiceSupported = isVoiceControlSupported()

  useWakeLock()

  const go = (next: number) => {
    if (next < 0 || next >= total || next === step) return
    setDirection(next > step ? 1 : -1)
    onStepChange(next)
  }

  const close = () => {
    onStopSpeaking()
    onClose()
  }

  const handleVoiceCommand = (command: VoiceCommand) => {
    if (command === "next") {
      if (isLast) close()
      else go(step + 1)
    } else if (command === "previous") go(step - 1)
    else if (command === "repeat") onSpeak(step)
    else if (command === "stop") {
      onStopSpeaking()
      for (const timer of activeTimers) {
        if (timer.slug === recipe.slug && timer.step === step && timer.status === "done") dismissTimer(timer.id)
      }
    } else if (command === "timer") {
      const index = (current.timers ?? []).findIndex((_, i) => !activeTimers.some((a) => a.id === timerId(recipe.slug, step, i)))
      if (index >= 0) {
        startTimer({ id: timerId(recipe.slug, step, index), slug: recipe.slug, recipeTitle: recipe.title, step, minutes: current.timers![index] })
      }
    }
  }

  const { status: voiceStatus, heard } = useVoiceCommands(voiceOn, i18n.language, handleVoiceCommand)

  // Latest handlers for the listeners below, which are only bound once
  const handlersRef = useRef({ go, close, step })
  useEffect(() => { handlersRef.current = { go, close, step } })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const { go, close, step } = handlersRef.current
      // PageUp/PageDown are what presentation clickers send
      if (e.key === "ArrowRight" || e.key === "PageDown") go(step + 1)
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(step - 1)
      else if (e.key === "Home") go(0)
      else if (e.key === "End") go(total - 1)
      else if (e.key === "Escape") close()
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [total])

  // Read each new step aloud when the option is on
  const onSpeakRef = useRef(onSpeak)
  useEffect(() => { onSpeakRef.current = onSpeak })
  useEffect(() => {
    if (readAloud) onSpeakRef.current(step)
  }, [readAloud, step])

  // Full screen when the browser allows it (not on iPhone): the overlay covers the viewport anyway
  useEffect(() => {
    const root = document.documentElement
    let entered = false
    if (!document.fullscreenElement && root.requestFullscreen) {
      root.requestFullscreen({ navigationUI: "hide" }).then(() => { entered = true }, () => {})
    }
    return () => {
      if (entered && document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }, [])

  const toggleReadAloud = () => {
    const next = !readAloud
    setReadAloud(next)
    try { localStorage.setItem(READ_ALOUD_KEY, next ? "1" : "0") } catch { /* Storage unavailable */ }
    if (!next) onStopSpeaking()
  }

  const onTouchStart = (e: ReactTouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  const onTouchEnd = (e: ReactTouchEvent) => {
    const start = touchStart.current
    const touch = e.changedTouches[0]
    touchStart.current = null
    if (!start || !touch || showIngredients) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    // Mostly horizontal moves only, so scrolling a long step does not change it
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return
    go(dx < 0 ? step + 1 : step - 1)
  }

  const speaking = speakingStep === step
  const iconButton =
    "h-11 w-11 inline-flex items-center justify-center rounded-full transition-colors cursor-pointer shrink-0"
  const voiceMessage =
    voiceStatus === "denied" ? t("cookingMode.voiceDenied")
    : voiceStatus === "error" ? t("cookingMode.voiceError")
    : voiceStatus === "listening" ? (heard ? t("cookingMode.voiceHeard", { text: heard }) : t("cookingMode.voiceHint"))
    : ""

  return createPortal(
    <FocusTrap
      focusTrapOptions={{
        allowOutsideClick: true,
        escapeDeactivates: false,
        initialFocus: () => document.getElementById(titleId) ?? false,
        fallbackFocus: () => document.getElementById(titleId) ?? document.body,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-0 z-[55] flex flex-col bg-surface text-foreground print:hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Progress */}
        <div className="h-1.5 bg-border shrink-0">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>

        {/* Header */}
        <header className="flex items-center gap-2 px-3 sm:px-6 py-3 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} tabIndex={-1} className="font-headline text-base sm:text-lg font-bold truncate outline-none">
              {recipe.title}
            </h2>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary" aria-live="polite">
              {t("recipe.stepOf", { current: step + 1, total })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowIngredients((v) => !v)}
            aria-expanded={showIngredients}
            aria-controls={ingredientsId}
            aria-label={t("recipe.ingredients")}
            className={`${iconButton} ${showIngredients ? "bg-primary text-primary-foreground" : "bg-surface-high hover:bg-surface-container"}`}
          >
            <ListChecks className="h-5 w-5" />
          </button>
          {"speechSynthesis" in window && (
            <button
              type="button"
              onClick={toggleReadAloud}
              aria-pressed={readAloud}
              aria-label={t("cookingMode.readAloud")}
              title={t("cookingMode.readAloud")}
              className={`${iconButton} ${readAloud ? "bg-primary text-primary-foreground" : "bg-surface-high hover:bg-surface-container"}`}
            >
              {readAloud ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
          )}
          {voiceSupported && (
            <button
              type="button"
              onClick={() => setVoiceOn((v) => !v)}
              aria-pressed={voiceOn}
              aria-label={t("cookingMode.voiceControl")}
              title={t("cookingMode.voiceControl")}
              className={`${iconButton} ${voiceStatus === "listening" ? "bg-primary text-primary-foreground" : "bg-surface-high hover:bg-surface-container"}`}
            >
              {voiceOn && voiceStatus !== "denied" ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
          )}
          <button
            type="button"
            onClick={close}
            aria-label={t("cookingMode.exit")}
            className={`${iconButton} bg-surface-high hover:bg-surface-container`}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {voiceMessage && (
          <p role="status" className="px-4 sm:px-6 -mt-1 mb-1 text-xs text-muted-foreground shrink-0 flex items-center gap-1.5">
            {voiceStatus === "listening" && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />}
            {voiceMessage}
          </p>
        )}

        {/* Step */}
        <div className="relative flex-1 min-h-0">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -48 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: "easeOut" }}
              className="absolute inset-0 overflow-y-auto overscroll-contain px-6 sm:px-12 py-6"
            >
              <div className="min-h-full max-w-3xl mx-auto flex flex-col justify-center gap-8">
                <div className="flex items-start gap-4 sm:gap-6">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full gradient-primary text-primary-foreground text-xl sm:text-2xl font-bold"
                  >
                    {step + 1}
                  </span>
                  <p
                    className={`text-[clamp(1.5rem,5vw,2.5rem)] leading-snug font-medium transition-colors ${speaking ? "text-primary" : ""}`}
                  >
                    {current.text}
                  </p>
                </div>
                {current.image && (
                  <img
                    src={`${BASE}${current.image}`}
                    alt=""
                    className="rounded-2xl max-h-[35vh] w-auto self-center object-contain"
                  />
                )}
                {current.timers && current.timers.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-3">
                    <StepTimerButtons slug={recipe.slug} recipeTitle={recipe.title} step={step} timers={current.timers} size="large" />
                  </div>
                )}
                {"speechSynthesis" in window && (
                  <button
                    type="button"
                    onClick={() => (speaking ? onStopSpeaking() : onSpeak(step))}
                    className="self-center inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    {speaking ? t("recipe.stopReading") : t("recipe.readAloud")}
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Ingredients, over the step */}
          {showIngredients && (
            <section
              id={ingredientsId}
              aria-label={t("recipe.ingredients")}
              className="absolute inset-0 z-10 overflow-y-auto overscroll-contain bg-surface px-6 sm:px-12 py-6"
            >
              <div className="max-w-3xl mx-auto">
                {recipe.ingredients.map((group, gi) => (
                  <div key={gi} className="mb-6">
                    {group.group && (
                      <h3 className="font-semibold text-xs uppercase tracking-widest text-muted-foreground mb-3">{group.group}</h3>
                    )}
                    <ul className="space-y-2 text-lg sm:text-xl">
                      {group.items.map((item, ii) => (
                        <li key={ii} className="flex gap-3">
                          <span aria-hidden="true" className="text-primary">•</span>
                          {displayIngredient(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Navigation */}
        <nav
          aria-label={t("cookingMode.navigation")}
          className="flex items-center gap-3 px-4 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border shrink-0"
        >
          <button
            type="button"
            onClick={() => go(step - 1)}
            disabled={step === 0}
            aria-label={t("recipe.prevStep")}
            className="h-16 w-16 sm:w-auto sm:px-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-surface-high text-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="hidden sm:inline">{t("recipe.prev")}</span>
          </button>
          <button
            type="button"
            onClick={() => (isLast ? close() : go(step + 1))}
            className="h-16 flex-1 inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground text-lg font-semibold cursor-pointer"
          >
            {isLast ? (
              <><Check className="h-6 w-6" />{t("cookingMode.finish")}</>
            ) : (
              <>{t("recipe.nextStep")}<ArrowRight className="h-6 w-6" /></>
            )}
          </button>
        </nav>
      </div>
    </FocusTrap>,
    document.body
  )
}
