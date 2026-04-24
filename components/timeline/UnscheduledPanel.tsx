'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Assignment, TaskGroup } from '@/types'

interface UnscheduledPanelProps {
  assignments: Assignment[]
  groups: TaskGroup[]
  onComplete: (id: string) => void
}

function daysUntil(dueDate: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function UnscheduledPanel({ assignments, groups, onComplete }: UnscheduledPanelProps) {
  const [open, setOpen] = useState(true)

  if (assignments.length === 0) return null

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/30 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-red-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium text-red-700">
            {assignments.length} unscheduled {assignments.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-red-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-red-400" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {assignments.map((a) => {
            const days = daysUntil(a.dueDate)
            const group = groups.find((g) => g.name === a.subject)
            const color = group?.colorHex ?? '#6366F1'
            const isAtRisk = days < 3

            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-md bg-background border border-border px-3 py-2"
              >
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm truncate block">{a.title}</span>
                  <span className="text-xs text-muted-foreground mono-nums">
                    Due {days === 0 ? 'today' : days < 0 ? `${Math.abs(days)}d overdue` : `in ${days}d`}
                  </span>
                </div>
                {isAtRisk && (
                  <Badge variant="destructive" className="text-[10px] shrink-0">
                    At Risk
                  </Badge>
                )}
                <button
                  onClick={() => onComplete(a.id)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  Done
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
