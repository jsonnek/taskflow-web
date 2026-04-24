'use client'

import { useState } from 'react'
import { Clock, Play, Square, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ScheduledSession, TaskGroup } from '@/types'

interface SessionCardProps {
  session: ScheduledSession
  groups: TaskGroup[]
  onComplete: (assignmentId: string) => void
  onTimerStart: (sessionId: string, assignmentId: string) => void
  onTimerStop: () => void
  isActiveTimer: boolean
  elapsedSeconds: number
  isAtRisk: boolean
}

function minutesToTime(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60)
  const m = minutesFromMidnight % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SessionCard({
  session,
  groups,
  onComplete,
  onTimerStart,
  onTimerStop,
  isActiveTimer,
  elapsedSeconds,
  isAtRisk,
}: SessionCardProps) {
  const group = groups.find((g) => g.name === session.assignment.subject)
  const accentColor = group?.colorHex ?? '#6366F1'

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border bg-card p-3 hover:border-foreground/20 transition-colors group',
        isAtRisk && 'border-red-500/50 bg-red-50/5'
      )}
    >
      {/* Color accent */}
      <div
        className="w-1 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium truncate">{session.assignment.title}</span>
          {isAtRisk && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
              At Risk
            </Badge>
          )}
          {session.isPartial && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              Partial
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="mono-nums">
            {minutesToTime(session.blockStart)} · {formatDuration(session.duration)}
          </span>
          {session.assignment.subject && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: accentColor + '22', color: accentColor }}
            >
              {session.assignment.subject}
            </span>
          )}
        </div>

        {isActiveTimer && (
          <div className="mt-1 text-xs mono-nums text-green-600 font-medium">
            ● {formatElapsed(elapsedSeconds)}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() =>
            isActiveTimer
              ? onTimerStop()
              : onTimerStart(session.id, session.assignment.id)
          }
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          title={isActiveTimer ? 'Stop timer' : 'Start timer'}
        >
          {isActiveTimer ? (
            <Square className="w-3.5 h-3.5 text-red-500" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={() => onComplete(session.assignment.id)}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          title="Mark complete"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
        </button>
      </div>
    </div>
  )
}
