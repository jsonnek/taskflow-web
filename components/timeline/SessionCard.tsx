'use client'

import { Clock, Play, Square, CheckCircle2, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScheduledSession, TaskGroup } from '@/types'

interface SessionCardProps {
  session: ScheduledSession
  groups: TaskGroup[]
  onComplete: (assignmentId: string) => void
  onLogTime: (assignmentId: string) => void
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
  onLogTime,
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
        'flex items-start gap-3 rounded border border-border bg-card p-3 hover:border-white/20 transition-all group',
        isAtRisk && 'border-red-500/40',
        isActiveTimer && 'border-primary/40 bg-primary/5'
      )}
    >
      {/* Color accent strip */}
      <div
        className="w-0.5 self-stretch rounded-full shrink-0 mt-0.5"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-medium truncate">{session.assignment.title}</span>
          {isAtRisk && (
            <span className="text-[10px] font-mono font-medium text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded shrink-0">
              at-risk
            </span>
          )}
          {session.isPartial && (
            <span className="text-[10px] font-mono text-muted-foreground bg-white/5 border border-white/10 px-1.5 py-0.5 rounded shrink-0">
              partial
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="mono-nums">
            {minutesToTime(session.blockStart)} · {formatDuration(session.duration)}
          </span>
          {session.assignment.subject && (
            <span
              className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: accentColor + '22', color: accentColor }}
            >
              {session.assignment.subject}
            </span>
          )}
        </div>

        {isActiveTimer && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs mono-nums text-primary font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {formatElapsed(elapsedSeconds)}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Log time — always visible, colored */}
        <button
          onClick={() => onLogTime(session.assignment.id)}
          className="flex items-center gap-1 text-[10px] font-mono border px-2 py-1 rounded transition-all"
          style={{
            color: accentColor,
            borderColor: accentColor + '40',
            background: accentColor + '10',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.borderColor = accentColor + '80'
            ;(e.currentTarget as HTMLElement).style.background = accentColor + '20'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.borderColor = accentColor + '40'
            ;(e.currentTarget as HTMLElement).style.background = accentColor + '10'
          }}
          title="Log time"
        >
          <Timer className="w-3 h-3" />
          log time
        </button>

        {/* Timer start/stop */}
        <button
          onClick={() =>
            isActiveTimer
              ? onTimerStop()
              : onTimerStart(session.id, session.assignment.id)
          }
          className={cn(
            'p-1.5 rounded transition-colors opacity-40 group-hover:opacity-100',
            isActiveTimer
              ? 'text-red-400 hover:bg-red-500/15 hover:text-red-300'
              : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
          )}
          title={isActiveTimer ? 'Stop timer' : 'Start timer'}
        >
          {isActiveTimer ? (
            <Square className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Complete */}
        <button
          onClick={() => onComplete(session.assignment.id)}
          className="p-1.5 rounded text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors opacity-40 group-hover:opacity-100"
          title="Mark complete"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
