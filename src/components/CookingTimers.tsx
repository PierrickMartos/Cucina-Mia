import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { AlarmClock, BellRing, Pause, Play, Plus, X } from "lucide-react"
import {
  addMinute,
  dismissTimer,
  formatCountdown,
  formatDuration,
  pauseTimer,
  remainingMs,
  resumeTimer,
  startTimer,
  timerId,
  useTimers,
} from "@/lib/timers"

interface StepTimerButtonsProps {
  slug: string
  recipeTitle: string
  step: number
  timers: number[]
  /** Bigger buttons for the hands-free cooking mode. */
  size?: "default" | "large"
}

/** One button per timer of a step: start it, then pause/resume it, then stop the alarm. */
export function StepTimerButtons({ slug, recipeTitle, step, timers, size = "default" }: StepTimerButtonsProps) {
  const { t } = useTranslation()
  const { timers: active, now } = useTimers()

  return (
    <>
      {timers.map((minutes, index) => {
        const id = timerId(slug, step, index)
        const timer = active.find((a) => a.id === id)
        const duration = formatDuration(minutes)
        const base = `inline-flex items-center rounded-full font-semibold transition-colors cursor-pointer print:hidden tabular-nums ${
          size === "large" ? "gap-2.5 px-6 py-3.5 text-xl [&_svg]:h-6 [&_svg]:w-6" : "mt-2 gap-1.5 px-3 py-1 text-xs"
        }`

        if (!timer) {
          return (
            <button
              key={id}
              type="button"
              onClick={() => startTimer({ id, slug, recipeTitle, step, minutes })}
              aria-label={t("timer.start", { duration })}
              className={`${base} bg-primary/10 text-primary hover:bg-primary/20`}
            >
              <AlarmClock className="h-3.5 w-3.5" />
              {duration}
            </button>
          )
        }

        if (timer.status === "done") {
          return (
            <button
              key={id}
              type="button"
              onClick={() => dismissTimer(id)}
              aria-label={t("timer.stopAlarm")}
              className={`${base} gradient-primary text-primary-foreground animate-pulse`}
            >
              <BellRing className="h-3.5 w-3.5" />
              {t("timer.done")}
            </button>
          )
        }

        const running = timer.status === "running"
        return (
          <button
            key={id}
            type="button"
            onClick={() => (running ? pauseTimer(id) : resumeTimer(id))}
            aria-label={running ? t("timer.pause") : t("timer.resume")}
            className={`${base} ${running ? "bg-primary text-primary-foreground" : "bg-surface-high text-foreground"}`}
          >
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span role="timer">{formatCountdown(remainingMs(timer, now))}</span>
          </button>
        )
      })}
    </>
  )
}

/** Floating list of every active timer, shown on all pages. */
export function TimerTray() {
  const { t } = useTranslation()
  const { timers, now } = useTimers()
  if (timers.length === 0) return null

  return (
    <section
      aria-label={t("timer.tray")}
      className="fixed right-3 bottom-[5.5rem] lg:bottom-20 z-[60] flex flex-col items-end gap-2 max-w-[calc(100vw-1.5rem)] print:hidden"
    >
      {timers.map((timer) => {
        const done = timer.status === "done"
        const running = timer.status === "running"
        return (
          <div
            key={timer.id}
            className={`flex items-center gap-2 rounded-full pl-2 pr-1.5 py-1.5 shadow-lg backdrop-blur-md ${
              done ? "gradient-primary text-primary-foreground animate-pulse" : "bg-background/95 text-foreground border border-border"
            }`}
          >
            <Link
              to={`/recipe/${timer.slug}`}
              className="flex items-center gap-2 min-w-0 pl-1"
              title={timer.recipeTitle}
            >
              {done ? <BellRing className="h-4 w-4 shrink-0" /> : <AlarmClock className="h-4 w-4 shrink-0 text-primary" />}
              <span className="flex flex-col leading-tight min-w-0">
                <span className="text-[11px] font-semibold truncate max-w-[9rem]">{timer.recipeTitle}</span>
                <span className={`text-[10px] ${done ? "" : "text-muted-foreground"}`}>
                  {t("recipe.step", { number: timer.step + 1 })} · {formatDuration(timer.durationMs / 60_000)}
                </span>
              </span>
              <span role="timer" className="text-sm font-bold tabular-nums ml-1">
                {done ? t("timer.done") : formatCountdown(remainingMs(timer, now))}
              </span>
            </Link>
            {!done && (
              <button
                type="button"
                onClick={() => (running ? pauseTimer(timer.id) : resumeTimer(timer.id))}
                aria-label={running ? t("timer.pause") : t("timer.resume")}
                className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-surface-high cursor-pointer"
              >
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => addMinute(timer.id)}
              aria-label={t("timer.addMinute")}
              className={`h-8 px-2 inline-flex items-center justify-center rounded-full text-[11px] font-semibold cursor-pointer ${done ? "hover:bg-white/20" : "hover:bg-surface-high"}`}
            >
              <Plus className="h-3 w-3" />1
            </button>
            <button
              type="button"
              onClick={() => dismissTimer(timer.id)}
              aria-label={done ? t("timer.stopAlarm") : t("timer.cancel")}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-full cursor-pointer ${done ? "hover:bg-white/20" : "hover:bg-surface-high"}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </section>
  )
}
