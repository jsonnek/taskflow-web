'use client'

import { useState, useMemo } from 'react'
import { CalendarDays, List } from 'lucide-react'
import { useStore } from '@/hooks/use-store'
import { useScheduler } from '@/hooks/use-scheduler'
import { useTimer } from '@/hooks/use-timer'
import { DayCard } from '@/components/timeline/DayCard'
import { UnscheduledPanel } from '@/components/timeline/UnscheduledPanel'
import { isAtRisk } from '@/lib/scheduler'

type ViewMode = 'work-blocks' | 'due-dates'

function formatDueDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TimelinePage() {
  const { assignments, groups, workBlocks, completeAssignment } = useStore()
  const schedule = useScheduler()
  const timer = useTimer()
  const [viewMode, setViewMode] = useState<ViewMode>('work-blocks')

  const unscheduledSet = useMemo(
    () => new Set(schedule.unscheduled.map((a) => a.id)),
    [schedule.unscheduled]
  )

  const incomplete = assignments.filter((a) => !a.isCompleted)

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
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Timeline</h1>
          <p className="text-sm text-muted-foreground">
            {schedule.days.length} scheduled days · {schedule.unscheduled.length} unscheduled
          </p>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setViewMode('work-blocks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
              viewMode === 'work-blocks'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Work Blocks
          </button>
          <button
            onClick={() => setViewMode('due-dates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors border-l border-border ${
              viewMode === 'due-dates'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Due Dates
          </button>
        </div>
      </div>

      {/* Empty states */}
      {workBlocks.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center mb-6">
          <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">No work blocks configured</p>
          <p className="text-xs text-muted-foreground">
            Add work blocks in Settings → Work Blocks to enable scheduling.
          </p>
        </div>
      )}

      {/* Unscheduled panel */}
      {schedule.unscheduled.length > 0 && (
        <div className="mb-6">
          <UnscheduledPanel
            assignments={schedule.unscheduled}
            groups={groups}
            onComplete={completeAssignment}
          />
        </div>
      )}

      {/* Work blocks view */}
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
              onComplete={completeAssignment}
              onTimerStart={timer.start}
              onTimerStop={timer.stop}
              activeSessionId={timer.activeSessionId}
              elapsedSeconds={timer.elapsedSeconds}
              unscheduledIds={unscheduledSet}
            />
          ))}
        </div>
      )}

      {/* Due dates view */}
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
                    <div
                      key={a.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <div
                        className="w-1 self-stretch rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{a.title}</span>
                          {atRisk && (
                            <span className="text-[10px] font-medium text-red-600 shrink-0 bg-red-50 px-1.5 py-0.5 rounded">
                              At Risk
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{a.subject || 'General'}</span>
                      </div>
                      <div className="text-xs mono-nums text-muted-foreground shrink-0">
                        {a.estimatedMinutes}m
                      </div>
                      <button
                        onClick={() => completeAssignment(a.id)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        Done
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
