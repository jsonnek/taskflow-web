'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Search, CheckCircle2, Circle, Star, RotateCcw, Timer } from 'lucide-react'
import { useStore } from '@/hooks/use-store'
import { useScheduler } from '@/hooks/use-scheduler'
import { isAtRisk } from '@/lib/scheduler'
import { AddTaskSheet } from '@/components/tasks/AddTaskSheet'
import { TimePromptDialog } from '@/components/tasks/TimePromptDialog'
import { LogTimeDialog } from '@/components/tasks/LogTimeDialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PgHeader } from '@/components/layout/PgHeader'
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
  const { assignments, groups, projects, timeEntries, completeAssignment, uncompleteAssignment, addTimeEntry } = useStore()
  const schedule = useScheduler()

  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('all')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterProject, setFilterProject] = useState('all')
  const [showCompleted, setShowCompleted] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editTask, setEditTask] = useState<Assignment | undefined>()
  const [pendingComplete, setPendingComplete] = useState<Assignment | null>(null)
  const [logTimeTask, setLogTimeTask] = useState<Assignment | null>(null)

  const handleComplete = useCallback((id: string) => {
    const a = assignments.find((x) => x.id === id)
    if (!a) return
    if (a.isCompleted) {
      uncompleteAssignment(id)
    } else {
      setPendingComplete(a)
    }
  }, [assignments, uncompleteAssignment])

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

  const filtered = useMemo(() => {
    return assignments
      .filter((a) => {
        if (!showCompleted && a.isCompleted) return false
        if (showCompleted && !a.isCompleted) return false
        if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
        if (filterSubject !== 'all' && a.subject !== filterSubject) return false
        if (filterGroup !== 'all') {
          const g = groups.find((gr) => gr.id === filterGroup)
          if (!g) return false
          if (a.subject !== g.name && a.groupId !== g.id) return false
        }
        if (filterPriority === 'high' && !a.isPriority) return false
        if (filterProject !== 'all' && a.projectId !== filterProject) return false
        return true
      })
      .sort((a, b) => {
        if (showCompleted) {
          // Most recently completed first
          return new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime()
        }
        if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
  }, [assignments, groups, search, filterSubject, filterPriority, filterProject, filterGroup, showCompleted])

  const subjects = useMemo(() => {
    const set = new Set(assignments.map((a) => a.subject).filter(Boolean))
    return Array.from(set).sort()
  }, [assignments])

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <PgHeader
        title="tasks"
        sub={`${assignments.filter((a) => !a.isCompleted).length} incomplete · ${assignments.filter((a) => a.isCompleted).length} completed`}
        stats={[
          { v: assignments.filter((a) => !a.isCompleted).length, l: 'pending' },
          { v: assignments.filter((a) => !a.isCompleted && daysUntil(a.dueDate) <= 1).length, l: 'at-risk' },
        ]}
        action={
          <Button size="sm" onClick={() => { setEditTask(undefined); setAddOpen(true) }} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
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
              <span className="flex flex-1 text-left truncate text-sm">
                {filterProject === 'all'
                  ? <span className="text-muted-foreground">Project</span>
                  : (projects.find(p => p.id === filterProject)?.name ?? 'Project')
                }
              </span>
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

      {/* Class filter pills */}
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {groups.map((g) => {
            const count = assignments.filter(
              (a) => !a.isCompleted && (a.subject === g.name || a.groupId === g.id)
            ).length
            const active = filterGroup === g.id
            if (!count && !active) return null
            return (
              <button
                key={g.id}
                onClick={() => setFilterGroup((f) => (f === g.id ? 'all' : g.id))}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border transition-all"
                style={{
                  borderColor: active ? g.colorHex + '70' : 'var(--border)',
                  background: active ? g.colorHex + '18' : 'transparent',
                  color: active ? g.colorHex : 'var(--muted-foreground)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: g.colorHex, boxShadow: active ? `0 0 4px ${g.colorHex}80` : 'none' }}
                />
                {g.name.toLowerCase()}
                {count > 0 && <span className="opacity-70">{count}</span>}
              </button>
            )
          })}
        </div>
      )}

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
          const taskAtRisk = !a.isCompleted && isAtRisk(a, schedule.unscheduled)
          const days = daysUntil(a.dueDate)
          const overdue = days < 0

          // Time logged for this task
          const taskEntries = timeEntries.filter((e) => e.assignmentId === a.id && e.endedAt)
          const loggedMins = Math.round(taskEntries.reduce((s, e) =>
            s + (new Date(e.endedAt!).getTime() - new Date(e.startedAt).getTime()) / 60000, 0))
          const logPct = Math.min((loggedMins / a.estimatedMinutes) * 100, 100)
          const hasLogged = loggedMins > 0

          return (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded border border-border bg-card p-3 hover:border-white/20 transition-all group"
            >
              {/* Complete / undo button */}
              <button
                onClick={() => handleComplete(a.id)}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                title={a.isCompleted ? 'Mark incomplete' : 'Mark complete'}
              >
                {a.isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-primary group-hover:hidden" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
                {a.isCompleted && (
                  <RotateCcw className="w-4 h-4 text-muted-foreground hidden group-hover:block" />
                )}
              </button>

              {/* Color accent */}
              <div className="w-0.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: color }} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${a.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                    {a.title}
                  </span>
                  {a.isPriority && !a.isCompleted && <Star className="w-3 h-3 text-amber-400 shrink-0" />}
                  {taskAtRisk && (
                    <span className="text-[10px] font-mono font-medium text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded shrink-0">
                      at-risk
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {a.subject && (
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: color + '22', color }}>
                      {a.subject}
                    </span>
                  )}
                  {project && <span className="text-[10px] font-mono text-muted-foreground">{project.name}</span>}
                  {a.isCompleted && a.completedAt ? (
                    <span className="text-[10px] mono-nums text-primary/60">
                      done {new Date(a.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  ) : (
                    <span className={`text-[10px] mono-nums ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {formatDueDate(a.dueDate)}
                    </span>
                  )}
                  {/* Time progress */}
                  {hasLogged ? (
                    <span className="text-[10px] font-mono text-primary/70">
                      {loggedMins}m / {a.estimatedMinutes}m
                    </span>
                  ) : (
                    <span className="text-[10px] mono-nums text-muted-foreground">{a.estimatedMinutes}m</span>
                  )}
                </div>

                {/* Time logged progress bar */}
                {hasLogged && !a.isCompleted && (
                  <div className="mt-1.5 h-0.5 bg-muted rounded-full overflow-hidden w-full max-w-xs">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${logPct}%`, background: color, boxShadow: `0 0 4px ${color}60` }}
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {a.isCompleted ? (
                  <button
                    onClick={() => uncompleteAssignment(a.id)}
                    className="text-[10px] font-mono text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 hover:bg-primary/10 px-2 py-1 rounded transition-all opacity-0 group-hover:opacity-100"
                  >
                    restore
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setLogTimeTask(a)}
                      className="flex items-center gap-1 text-[10px] font-mono border px-2 py-1 rounded transition-all"
                      style={{
                        color: color,
                        borderColor: color + '40',
                        background: color + '10',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = color + '80'
                        ;(e.currentTarget as HTMLElement).style.background = color + '20'
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = color + '40'
                        ;(e.currentTarget as HTMLElement).style.background = color + '10'
                      }}
                      title="Log time"
                    >
                      <Timer className="w-3 h-3" />
                      log time
                    </button>
                    <button
                      onClick={() => { setEditTask(a); setAddOpen(true) }}
                      className="text-[10px] font-mono text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 hover:bg-primary/10 px-2 py-1 rounded transition-all opacity-0 group-hover:opacity-100"
                    >
                      edit
                    </button>
                  </>
                )}
              </div>
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
          onSave={(mins, completedAt) => finishComplete(mins, completedAt)}
          onSkip={() => { completeAssignment(pendingComplete!.id); setPendingComplete(null) }}
        />
      )}

      {logTimeTask && (
        <LogTimeDialog
          open={!!logTimeTask}
          onOpenChange={(v) => { if (!v) setLogTimeTask(null) }}
          taskTitle={logTimeTask.title}
          estimatedMinutes={logTimeTask.estimatedMinutes}
          alreadyLoggedMinutes={Math.round(
            timeEntries
              .filter((e) => e.assignmentId === logTimeTask.id && e.endedAt)
              .reduce((s, e) => s + (new Date(e.endedAt!).getTime() - new Date(e.startedAt).getTime()) / 60000, 0)
          )}
          onSave={(minutes, endedAt) => {
            const startedAt = new Date(new Date(endedAt).getTime() - minutes * 60000).toISOString()
            addTimeEntry({ assignmentId: logTimeTask.id, startedAt, endedAt })
            setLogTimeTask(null)
          }}
        />
      )}
    </div>
  )
}
