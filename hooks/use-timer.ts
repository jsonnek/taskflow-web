'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from './use-store'

interface TimerState {
  activeSessionId: string | null
  activeEntryId: string | null
  elapsedSeconds: number
  isRunning: boolean
}

interface TimerActions {
  start: (sessionId: string, assignmentId: string) => void
  stop: () => void
}

export function useTimer(): TimerState & TimerActions {
  const { addTimeEntry, updateTimeEntry, timeEntries } = useStore()
  const [state, setState] = useState<TimerState>({
    activeSessionId: null,
    activeEntryId: null,
    elapsedSeconds: 0,
    isRunning: false,
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        setState((s) => ({ ...s, elapsedSeconds: s.elapsedSeconds + 1 }))
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [state.isRunning])

  const start = useCallback(
    (sessionId: string, assignmentId: string) => {
      // Close any active entry first
      if (state.activeEntryId) {
        const existing = timeEntries.find((e) => e.id === state.activeEntryId)
        if (existing && !existing.endedAt) {
          updateTimeEntry({ ...existing, endedAt: new Date().toISOString() })
        }
      }

      const entry = addTimeEntry({
        assignmentId,
        startedAt: new Date().toISOString(),
      })

      setState({
        activeSessionId: sessionId,
        activeEntryId: entry.id,
        elapsedSeconds: 0,
        isRunning: true,
      })
    },
    [addTimeEntry, updateTimeEntry, state.activeEntryId, timeEntries]
  )

  const stop = useCallback(() => {
    if (state.activeEntryId) {
      const existing = timeEntries.find((e) => e.id === state.activeEntryId)
      if (existing && !existing.endedAt) {
        updateTimeEntry({ ...existing, endedAt: new Date().toISOString() })
      }
    }
    setState({
      activeSessionId: null,
      activeEntryId: null,
      elapsedSeconds: 0,
      isRunning: false,
    })
  }, [state.activeEntryId, timeEntries, updateTimeEntry])

  return { ...state, start, stop }
}
