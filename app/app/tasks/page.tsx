'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Search, CheckCircle2, Circle, Star } from 'lucide-react'
import { useStore } from '@/hooks/use-store'
import { useScheduler } from '@/hooks/use-scheduler'
import { isAtRisk } from '@/lib/scheduler'
import { AddTaskSheet } from '@/components/tasks/AddTaskSheet'
import { TimePromptDialog } from '@/components/tasks/TimePromptDialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Assignment } from '@/types'

function daysUntil(iso: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(iso)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDueDate(iso: string): string {
  const days = daysUntil(iso)
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `${days}d`
}

export default function TasksPage() {
  const { assignments, groups, projects, completeAssignment, addTimeEntry } = useStore()
  const schedule = useScheduler()

  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterProject, setFilterProject] = useState('all')
  const [showCompleted, setShowCompleted] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editTask, setEditTask] = useState<Assignment | undefined>()
  const [pendingComplete, setPendingComplete] = useState<Assignment | null>(null)

  const handleComplete = useCallback((id: string) => {
    const a = assignments.find((x) => x.id === id)
    if (a && !a.isCompleted) setPendingComplete(a)
  }, [assignments])

  function finishComplete(actualMinutes?: number) {
    if (!pendingComplete) return
    if (actualMinutes && actualMinutes > 0) {
      const endedAt = new Date()
      const startedAt = new Date(endedAt.getTime() - actualMinutes * 60000)
      addTimeEntry({
        assignmentId: pendingComplete.id,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      })
    }
    completeAssignment(pendingComplete.id)
    setPendingComplete(null)
  }

  const filtered = useMemo(() => {
    return assignments
      .filter((a) => {
        if (!showCompleted && a.isCompleted) return false
        if (showCompleted && !a.isCompleted) return false
        if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
        if (filterSubject !== 'all' && a.subject !== filterSubject) return false
        if (filterPriority === 'high' && !a.isPriority) return false
        if (filterProject !== 'all' && a.projectId !== filterProject) return false
        return true
      })
      .sort((a, b) => {
        if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
  }, [assignments, search, filterSubject, filterPriority, filterProject, showCompleted])

  const subjects = useMemo(() => {
    const set = new Set(assignments.map((a) => a.subject).filter(Boolean))
    return Array.from(set).sort()
  }, [assignments])

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {assignments.filter((a) => !a.isCompleted).length} incomplete
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditTask(undefined); setAddOpen(true) }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Select value={filterSubject} onValueChange={(v) => setFilterSubject(v ?? "all")}>
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v ?? "all")}>
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priority</SelectItem>
            <SelectItem value="high">High priority</SelectItem>
          </SelectContent>
        </Select>

        {projects.length > 0 && (
          <Select value={filterProject} onValueChange={(v) => setFilterProject(v ?? "all")}>
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <button
          onClick={() => setShowCompleted((v) => !v)}
          className={`px-3 py-1 rounded text-xs font-mono border transition-all ${
            showCompleted
              ? 'bg-primary/15 text-primary border-primary/50'
              : 'border-white/15 text-muted-foreground hover:border-white/25 hover:text-foreground'
          }`}
        >
          {showCompleted ? 'completed' : 'incomplete'}
        </button>
      </div>

      {/* Task list */}
      <div className="space-y-1.5">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No tasks found.
          </div>
        )}
        {filtered.map((a) => {
          const group = groups.find((g) => g.name === a.subject)
          const color = group?.colorHex ?? '#6366F1'
          const project = projects.find((p) => p.id === a.projectId)
          const atRisk = !a.isCompleted && isAtRisk(a, schedule.unscheduled)
          const days = daysUntil(a.dueDate)
          const overdue = days < 0

          return (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded border border-border bg-card p-3 hover:border-white/20 transition-all group"
            >
              {/* Complete button */}
              <button
                onClick={() => handleComplete(a.id)}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
              >
                {a.isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </button>

              {/* Color accent */}
              <div
                className="w-0.5 self-stretch rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${a.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                    {a.title}
                  </span>
                  {a.isPriority && <Star className="w-3 h-3 text-amber-400 shrink-0" />}
                  {atRisk && (
                    <span className="text-[10px] font-mono font-medium text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded shrink-0">
                      at-risk
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {a.subject && (
                    <span
                      className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: color + '22', color }}
                    >
                      {a.subject}
                    </span>
                  )}
                  {project && (
                    <span className="text-[10px] font-mono text-muted-foreground">{project.name}</span>
                  )}
                  <span className={`text-[10px] mono-nums ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {formatDueDate(a.dueDate)}
                  </span>
                  <span className="text-[10px] mono-nums text-muted-foreground">
                    {a.estimatedMinutes}m
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    D:{a.difficulty} I:{a.importance}
                  </span>
                </div>
              </div>

              {/* Edit button */}
              <button
                onClick={() => { setEditTask(a); setAddOpen(true) }}
                className="opacity-0 group-hover:opacity-100 text-[10px] font-mono text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 hover:bg-primary/10 px-2 py-1 rounded transition-all shrink-0"
              >
                edit
              </button>
            </div>
          )
        })}
      </div>

      <AddTaskSheet
        key={editTask?.id ?? 'new'}
        open={addOpen}
        onOpenChange={setAddOpen}
        editTask={editTask}
      />

      {pendingComplete && (
        <TimePromptDialog
          open={!!pendingComplete}
          taskTitle={pendingComplete.title}
          estimatedMinutes={pendingComplete.estimatedMinutes}
          onSave={(mins) => finishComplete(mins)}
          onSkip={() => finishComplete()}
        />
      )}
    </div>
  )
}
