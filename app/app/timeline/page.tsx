'use client'

import { useState, useMemo, useCallback } from 'react'
import { CalendarDays, List } from 'lucide-react'
import { useStore } from '@/hooks/use-store'
import { useScheduler } from '@/hooks/use-scheduler'
import { useTimer } from '@/hooks/use-timer'
import { DayCard } from '@/components/timeline/DayCard'
import { UnscheduledPanel } from '@/components/timeline/UnscheduledPanel'
import { TimePromptDialog } from '@/components/tasks/TimePromptDialog'
import { PgHeader } from '@/components/layout/PgHeader'
import { isAtRisk } from '@/lib/scheduler'
import type { Assignment } from '@/types'

type ViewMode = 'work-blocks' | 'due-dates'

function formatDueDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TimelinePage() {
  const { assignments, groups, workBlocks, completeAssignment, addTimeEntry } = useStore()
  const schedule = useScheduler()
  const timer = useTimer()
  const [viewMode, setViewMode] = useState<ViewMode>('work-blocks')

  // Time prompt state
  const [pendingComplete, setPendingComplete] = useState<Assignment | null>(null)

  const unscheduledSet = useMemo(
    () => new Set(schedule.unscheduled.map((a) => a.id)),
    [schedule.unscheduled]
  )

  const incomplete = assignments.filter((a) => !a.isCompleted)

  // Intercept completion — show time prompt first
  const handleComplete = useCallback((id: string) => {
    const a = assignments.find((x) => x.id === id)
    if (!a) return
    setPendingComplete(a)
  }, [assignments])

  function finishComplete(actualMinutes: number, completedAt: string) {
    if (!pendingComplete) return
    if (actualMinutes > 0) {
      const endedAt = new Date(completedAt)
      const startedAt = new Date(endedAt.getTime() - actualMinutes * 60000)
      addTimeEntry({
        assignmentId: pendingComplete.id,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      })
    }
    completeAssignment(pendingComplete.id, completedAt)
    setPendingComplete(null)
  }

  // Due-dates view: group by due date
  const byDueDate = useMemo(() => {
    if (viewMode !== 'due-dates') return []
    const map = new Map<string, typeof incomplete>()
    for (const a of [...incomplete].sort(
      (x, y) => new Date(x.dueDate).getTime() - new Date(y.dueDate).getTime()
    )) {
      const key = a.dueDate.split('T')[0]
      const arr = map.get(key) ?? []
      arr.push(a)
      map.set(key, arr)
    }
    return Array.from(map.entries())
  }, [incomplete, viewMode])

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 page-enter">
      <PgHeader
        title="timeline"
        sub={`${schedule.days.length} days · ${schedule.unscheduled.length} unscheduled`}
        stats={[
          { v: schedule.days.length, l: 'days' },
          { v: schedule.unscheduled.length, l: 'unscheduled' },
        ]}
        action={
          <div className="flex rounded border border-white/15 overflow-hidden">
            <button
              onClick={() => setViewMode('work-blocks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono transition-all ${
                viewMode === 'work-blocks'
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              work-blocks
            </button>
            <button
              onClick={() => setViewMode('due-dates')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono transition-all border-l border-white/10 ${
                viewMode === 'due-dates'
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              due-dates
            </button>
          </div>
        }
      />

      {workBlocks.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center mb-6">
          <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">No work blocks configured</p>
          <p className="text-xs text-muted-foreground">
            Add work blocks in Settings → Work Blocks to enable scheduling.
          </p>
        </div>
      )}

      {schedule.unscheduled.length > 0 && (
        <div className="mb-6">
          <UnscheduledPanel
            assignments={schedule.unscheduled}
            groups={groups}
            onComplete={handleComplete}
          />
        </div>
      )}

      {viewMode === 'work-blocks' && (
        <div className="space-y-8">
          {schedule.days.length === 0 && workBlocks.length > 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">No tasks to schedule. Add tasks to get started.</p>
            </div>
          )}
          {schedule.days.map((dayPlan) => (
            <DayCard
              key={dayPlan.date}
              dayPlan={dayPlan}
              groups={groups}
              onComplete={handleComplete}
              onTimerStart={timer.start}
              onTimerStop={timer.stop}
              activeSessionId={timer.activeSessionId}
              elapsedSeconds={timer.elapsedSeconds}
              unscheduledIds={unscheduledSet}
            />
          ))}
        </div>
      )}

      {viewMode === 'due-dates' && (
        <div className="space-y-6">
          {byDueDate.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">No incomplete tasks.</p>
            </div>
          )}
          {byDueDate.map(([dateStr, tasks]) => (
            <div key={dateStr} className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {formatDueDate(dateStr + 'T00:00:00')}
              </div>
              <div className="space-y-1.5">
                {tasks.map((a) => {
                  const group = groups.find((g) => g.name === a.subject)
                  const color = group?.colorHex ?? '#6366F1'
                  const atRisk = isAtRisk(a, schedule.unscheduled)
                  return (
                    <div key={a.id} className="flex items-center gap-3 rounded border border-border bg-card p-3 hover:border-white/20 transition-all group">
                      <div className="w-0.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{a.title}</span>
                          {atRisk && (
                            <span className="text-[10px] font-mono font-medium text-red-400 shrink-0 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded">
                              at-risk
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{a.subject || 'general'}</span>
                      </div>
                      <div className="text-[10px] mono-nums text-muted-foreground shrink-0">{a.estimatedMinutes}m</div>
                      <button
                        onClick={() => handleComplete(a.id)}
                        className="text-[10px] font-mono text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 hover:bg-primary/10 px-2 py-1 rounded transition-all shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        done
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Time prompt dialog */}
      {pendingComplete && (
        <TimePromptDialog
          open={!!pendingComplete}
          taskTitle={pendingComplete.title}
          estimatedMinutes={pendingComplete.estimatedMinutes}
          onSave={(mins, completedAt) => finishComplete(mins, completedAt)}
          onSkip={() => { completeAssignment(pendingComplete!.id); setPendingComplete(null) }}
        />
      )}
    </div>
  )
}
