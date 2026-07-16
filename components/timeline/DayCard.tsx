'use client'

import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { SessionCard } from './SessionCard'
import { cn } from '@/lib/utils'
import type { DayPlan, TaskGroup } from '@/types'

interface DayCardProps {
  dayPlan: DayPlan
  groups: TaskGroup[]
  onComplete: (assignmentId: string) => void
  onLogTime: (assignmentId: string) => void
  onTimerStart: (sessionId: string, assignmentId: string) => void
  onTimerStop: () => void
  // Matched by assignment (not session) — scheduler session ids are
  // regenerated on every plan, so they don't survive reloads.
  activeAssignmentId: string | null
  elapsedSeconds: number
  unscheduledIds: Set<string>
}

function formatDate(dateStr: string): { weekday: string; date: string; isToday: boolean } {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isToday = d.getTime() === today.getTime()
  const weekday = isToday
    ? 'Today'
    : d.toLocaleDateString('en-US', { weekday: 'short' })
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return { weekday, date, isToday }
}

export function DayCard({
  dayPlan,
  groups,
  onComplete,
  onLogTime,
  onTimerStart,
  onTimerStop,
  activeAssignmentId,
  elapsedSeconds,
  unscheduledIds,
}: DayCardProps) {
  const { weekday, date, isToday } = formatDate(dayPlan.date)
  const hasWarnings = dayPlan.warnings.length > 0

  return (
    <div className={cn('space-y-2', isToday && 'relative')}>
      {/* Day header */}
      <div className="flex items-center gap-3">
        <div className={cn('flex flex-col items-center w-10', isToday && 'text-primary')}>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {weekday}
          </span>
          <span className={cn('text-xl font-semibold mono-nums leading-none', isToday && 'text-primary')}>
            {date.split(' ')[1]}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{date}</span>
          {hasWarnings && (
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <AlertTriangle className="w-3 h-3" />
              At risk
            </span>
          )}
        </div>
      </div>

      {/* Scheduling warnings */}
      {dayPlan.warnings.map((warning) => (
        <div
          key={warning}
          className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-400"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {warning}
        </div>
      ))}

      {/* Sessions */}
      <div className="space-y-1.5 ml-13">
        {dayPlan.sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            groups={groups}
            onComplete={onComplete}
            onLogTime={onLogTime}
            onTimerStart={onTimerStart}
            onTimerStop={onTimerStop}
            isActiveTimer={activeAssignmentId === session.assignment.id}
            elapsedSeconds={elapsedSeconds}
            isAtRisk={unscheduledIds.has(session.assignment.id)}
          />
        ))}
      </div>
    </div>
  )
}
