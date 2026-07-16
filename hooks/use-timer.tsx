'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import { useStore } from './use-store'
import { timeEntryStore } from '@/lib/store'

// Persisted so a running timer survives navigation and reloads. The open
// TimeEntry is the source of truth for elapsed time — we never count ticks.
const ACTIVE_TIMER_KEY = 'taskflow:active-timer'

interface ActiveTimer {
  sessionId: string | null // scheduler session ids are regenerated per plan, so this may not match after reload
  assignmentId: string
  entryId: string
  startedAt: string // ISO
}

interface TimerContextValue {
  activeSessionId: string | null
  activeAssignmentId: string | null
  activeEntryId: string | null
  elapsedSeconds: number
  isRunning: boolean
  start: (sessionId: string, assignmentId: string) => void
  stop: () => void
}

const TimerContext = createContext<TimerContextValue | null>(null)

function readPersisted(): ActiveTimer | null {
  try {
    const raw = localStorage.getItem(ACTIVE_TIMER_KEY)
    return raw ? (JSON.parse(raw) as ActiveTimer) : null
  } catch {
    return null
  }
}

function persist(timer: ActiveTimer | null) {
  if (timer) localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(timer))
  else localStorage.removeItem(ACTIVE_TIMER_KEY)
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { addTimeEntry, updateTimeEntry, timeEntries } = useStore()
  const [active, setActive] = useState<ActiveTimer | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  // Resume a persisted timer on mount — only if its entry is still open.
  // Reads localStorage directly: the store context hasn't loaded yet when
  // this effect runs.
  useEffect(() => {
    const persisted = readPersisted()
    if (!persisted) return
    const entry = timeEntryStore.getAll().find((e) => e.id === persisted.entryId)
    if (entry && !entry.endedAt) {
      setActive(persisted)
    } else {
      persist(null)
    }
  }, [])

  // Tick once a second while running. Elapsed is derived from startedAt,
  // so background-tab throttling or a reload can't lose time.
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])

  const closeOpenEntry = useCallback(
    (entryId: string) => {
      const existing = timeEntries.find((e) => e.id === entryId)
      if (existing && !existing.endedAt) {
        updateTimeEntry({ ...existing, endedAt: new Date().toISOString() })
      }
    },
    [timeEntries, updateTimeEntry]
  )

  const start = useCallback(
    (sessionId: string, assignmentId: string) => {
      if (active) closeOpenEntry(active.entryId)

      const startedAt = new Date().toISOString()
      const entry = addTimeEntry({ assignmentId, startedAt })
      const next: ActiveTimer = {
        sessionId,
        assignmentId,
        entryId: entry.id,
        startedAt,
      }
      persist(next)
      setActive(next)
    },
    [active, closeOpenEntry, addTimeEntry]
  )

  const stop = useCallback(() => {
    if (active) closeOpenEntry(active.entryId)
    persist(null)
    setActive(null)
  }, [active, closeOpenEntry])

  const elapsedSeconds = active
    ? Math.max(0, Math.floor((nowMs - new Date(active.startedAt).getTime()) / 1000))
    : 0

  return (
    <TimerContext.Provider
      value={{
        activeSessionId: active?.sessionId ?? null,
        activeAssignmentId: active?.assignmentId ?? null,
        activeEntryId: active?.entryId ?? null,
        elapsedSeconds,
        isRunning: !!active,
        start,
        stop,
      }}
    >
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer must be used within TimerProvider')
  return ctx
}
