import { useSyncExternalStore } from "react"

// Cooking timers started from recipe steps. They live in a module-level store (not in a page)
// so they keep running while browsing other recipes, and are persisted with their absolute end
// time so a reload or a phone going to sleep does not lose them.

export type TimerStatus = "running" | "paused" | "done"

export interface CookingTimer {
  /** `${slug}:${step}:${index}`: one timer per timer button of a step. */
  id: string
  slug: string
  recipeTitle: string
  /** 0-based step index. */
  step: number
  durationMs: number
  status: TimerStatus
  /** Epoch ms when a running timer ends. */
  endsAt?: number
  /** Time left of a paused timer. */
  remainingMs?: number
}

interface Snapshot {
  timers: CookingTimer[]
  now: number
}

const STORAGE_KEY = "cucina-mia:timers"
const TICK_MS = 250
const RING_EVERY_MS = 2500
const MAX_RING_MS = 2 * 60_000

let snapshot: Snapshot = { timers: load(), now: Date.now() }
const listeners = new Set<() => void>()
let tickHandle: ReturnType<typeof setInterval> | null = null
let ringHandle: ReturnType<typeof setInterval> | null = null
let ringStartedAt = 0
let audioContext: AudioContext | null = null

function load(): CookingTimer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as CookingTimer[]) : []
  } catch {
    return []
  }
}

function save(timers: CookingTimer[]) {
  try {
    if (timers.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(timers))
    else localStorage.removeItem(STORAGE_KEY)
  } catch { /* Storage unavailable */ }
}

function emit() {
  for (const listener of listeners) listener()
}

function setTimers(timers: CookingTimer[]) {
  snapshot = { timers, now: Date.now() }
  save(timers)
  sync()
  emit()
}

export function remainingMs(timer: CookingTimer, now: number): number {
  if (timer.status === "running") return Math.max(0, (timer.endsAt ?? now) - now)
  if (timer.status === "paused") return timer.remainingMs ?? 0
  return 0
}

/** Marks elapsed timers as done; returns true when at least one just finished. */
function settle(): boolean {
  const now = Date.now()
  let finished: CookingTimer[] = []
  const timers = snapshot.timers.map((timer) => {
    if (timer.status !== "running" || (timer.endsAt ?? 0) > now) return timer
    const done = { ...timer, status: "done" as const, endsAt: undefined, remainingMs: 0 }
    finished = [...finished, done]
    return done
  })
  if (finished.length) {
    snapshot = { timers, now }
    save(timers)
    for (const timer of finished) notify(timer)
  } else {
    snapshot = { ...snapshot, now }
  }
  return finished.length > 0
}

function tick() {
  settle()
  sync()
  emit()
}

// Starts or stops the tick and the alarm according to the current timers.
function sync() {
  const anyRunning = snapshot.timers.some((t) => t.status === "running")
  if (anyRunning && !tickHandle) tickHandle = setInterval(tick, TICK_MS)
  if (!anyRunning && tickHandle) {
    clearInterval(tickHandle)
    tickHandle = null
  }

  const anyDone = snapshot.timers.some((t) => t.status === "done")
  if (anyDone && !ringHandle) {
    ringStartedAt = Date.now()
    ring()
    ringHandle = setInterval(() => {
      if (Date.now() - ringStartedAt > MAX_RING_MS) stopRinging()
      else ring()
    }, RING_EVERY_MS)
  }
  if (!anyDone) stopRinging()
}

function stopRinging() {
  if (ringHandle) clearInterval(ringHandle)
  ringHandle = null
}

function ring() {
  try {
    navigator.vibrate?.([300, 150, 300])
  } catch { /* Vibration not supported */ }
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    audioContext ??= new Ctor()
    const ctx = audioContext
    void ctx.resume?.()
    // Three short "ding" notes
    ;[0, 0.28, 0.56].forEach((offset, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = i === 2 ? 1175 : 880
      const start = ctx.currentTime + offset
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.26)
    })
  } catch { /* Web Audio not available */ }
}

function notify(timer: CookingTimer) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return
    if (document.visibilityState === "visible") return
    new Notification(timer.recipeTitle, { body: `⏰ ${formatDuration(timer.durationMs / 60_000)}`, tag: timer.id })
  } catch { /* Notifications not available */ }
}

function requestNotificationPermission() {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission()
    }
  } catch { /* Notifications not available */ }
}

function update(id: string, change: (timer: CookingTimer) => CookingTimer | null) {
  settle()
  setTimers(snapshot.timers.flatMap((timer) => {
    if (timer.id !== id) return [timer]
    const next = change(timer)
    return next ? [next] : []
  }))
}

export function timerId(slug: string, step: number, index: number) {
  return `${slug}:${step}:${index}`
}

export function startTimer(input: { id: string; slug: string; recipeTitle: string; step: number; minutes: number }) {
  const durationMs = Math.round(input.minutes * 60) * 1000
  const timer: CookingTimer = {
    id: input.id,
    slug: input.slug,
    recipeTitle: input.recipeTitle,
    step: input.step,
    durationMs,
    status: "running",
    endsAt: Date.now() + durationMs,
  }
  // Unlock audio on this user gesture, so the alarm can play later (iOS/Safari)
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctor) {
      audioContext ??= new Ctor()
      void audioContext.resume?.()
    }
  } catch { /* Web Audio not available */ }
  requestNotificationPermission()
  settle()
  setTimers([...snapshot.timers.filter((t) => t.id !== input.id), timer])
}

export function pauseTimer(id: string) {
  update(id, (timer) =>
    timer.status === "running"
      ? { ...timer, status: "paused", remainingMs: remainingMs(timer, Date.now()), endsAt: undefined }
      : timer
  )
}

export function resumeTimer(id: string) {
  update(id, (timer) =>
    timer.status === "paused"
      ? { ...timer, status: "running", endsAt: Date.now() + (timer.remainingMs ?? 0), remainingMs: undefined }
      : timer
  )
}

export function addMinute(id: string) {
  update(id, (timer) => {
    if (timer.status === "running") return { ...timer, endsAt: (timer.endsAt ?? Date.now()) + 60_000 }
    if (timer.status === "paused") return { ...timer, remainingMs: (timer.remainingMs ?? 0) + 60_000 }
    return { ...timer, status: "running", endsAt: Date.now() + 60_000, remainingMs: undefined }
  })
}

export function dismissTimer(id: string) {
  update(id, () => null)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return snapshot
}

export function useTimers(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// Timers that ended while the page was closed are shown as done (and ring) on load.
if (typeof window !== "undefined") {
  settle()
  sync()
}

/** Human duration for a timer button: "30 s", "5 min", "5 min 30", "1 h 30", "12 h". */
export function formatDuration(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60)
  if (totalSeconds < 60) return `${totalSeconds} s`
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  if (hours > 0) return mins > 0 ? `${hours} h ${String(mins).padStart(2, "0")}` : `${hours} h`
  return secs > 0 ? `${mins} min ${String(secs).padStart(2, "0")}` : `${mins} min`
}

/** Countdown display: "4:05", "1:02:03". */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  const ss = String(secs).padStart(2, "0")
  return hours > 0 ? `${hours}:${String(mins).padStart(2, "0")}:${ss}` : `${mins}:${ss}`
}

/** Test helper: clears every timer and stops the tick/alarm. */
export function resetTimers() {
  setTimers([])
}
