'use client'

import { useState, useMemo, useCallback } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Star, CheckCircle2, Circle, RotateCcw,
  ArrowUp, ArrowDown, ChevronDown, ChevronUp, Pencil, Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useStore } from '@/hooks/use-store'
import { AddTaskSheet } from '@/components/tasks/AddTaskSheet'
import { TimePromptDialog } from '@/components/tasks/TimePromptDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import type { Assignment, Project } from '@/types'

type SortKey = 'manual' | 'priority' | 'dueDate' | 'time'
type FilterKey = 'all' | 'incomplete' | 'completed'

function daysUntil(iso: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const due = new Date(iso); due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function fmtDate(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDue(iso: string) {
  const d = daysUntil(iso)
  if (d < 0) return { label: `${Math.abs(d)}d overdue`, overdue: true }
  if (d === 0) return { label: 'today', overdue: false }
  if (d === 1) return { label: 'tomorrow', overdue: false }
  return { label: `${d}d`, overdue: false }
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const {
    projects, assignments, groups,
    updateProject, deleteProject,
    updateAssignment, completeAssignment, uncompleteAssignment, addTimeEntry,
  } = useStore()

  const project = projects.find((p) => p.id === id)

  // Task sheet
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTask, setEditTask] = useState<Assignment | undefined>()

  // Time prompt
  const [pendingComplete, setPendingComplete] = useState<Assignment | null>(null)

  // Edit project dialog
  const [editOpen, setEditOpen] = useState(false)
  const [projName, setProjName] = useState(project?.name ?? '')
  const [projNotes, setProjNotes] = useState(project?.notes ?? '')
  const [projDue, setProjDue] = useState(project?.dueDate ? project.dueDate.split('T')[0] : '')
  const [projGroupId, setProjGroupId] = useState(project?.groupId ?? '')

  // List controls
  const [sortKey, setSortKey] = useState<SortKey>('manual')
  const [filter, setFilter] = useState<FilterKey>('incomplete')

  const today = new Date().toISOString().split('T')[0]

  const projectTasks = useMemo(
    () => assignments.filter((a) => a.projectId === id),
    [assignments, id]
  )
  const completed = projectTasks.filter((a) => a.isCompleted).length
  const total = projectTasks.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const isProjectComplete = total > 0 && completed === total

  const filtered = useMemo(() => {
    return projectTasks
      .filter((a) => {
        if (filter === 'incomplete') return !a.isCompleted
        if (filter === 'completed') return a.isCompleted
        return true
      })
      .sort((a, b) => {
        switch (sortKey) {
          case 'priority':
            if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          case 'dueDate':
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          case 'time':
            return b.estimatedMinutes - a.estimatedMinutes
          case 'manual':
          default:
            return (a.projectOrder ?? 999) - (b.projectOrder ?? 999)
        }
      })
  }, [projectTasks, filter, sortKey])

  // Completion flow
  const handleComplete = useCallback((task: Assignment) => {
    if (task.isCompleted) {
      uncompleteAssignment(task.id)
    } else {
      setPendingComplete(task)
    }
  }, [uncompleteAssignment])

  function finishComplete(actualMinutes?: number) {
    if (!pendingComplete) return
    if (actualMinutes && actualMinutes > 0) {
      const endedAt = new Date()
      const startedAt = new Date(endedAt.getTime() - actualMinutes * 60000)
      addTimeEntry({ assignmentId: pendingComplete.id, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString() })
    }
    completeAssignment(pendingComplete.id)
    setPendingComplete(null)
  }

  // Priority toggle
  function togglePriority(task: Assignment) {
    updateAssignment({ ...task, isPriority: !task.isPriority })
  }

  // Manual reorder
  function move(task: Assignment, dir: -1 | 1) {
    const sorted = [...filtered].sort((a, b) => (a.projectOrder ?? 999) - (b.projectOrder ?? 999))
    const idx = sorted.findIndex((t) => t.id === task.id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= sorted.length) return
    // Swap orders
    const other = sorted[newIdx]
    const aOrder = task.projectOrder ?? idx
    const bOrder = other.projectOrder ?? newIdx
    updateAssignment({ ...task, projectOrder: bOrder })
    updateAssignment({ ...other, projectOrder: aOrder })
  }

  // Edit project
  function openEditProject() {
    setProjName(project?.name ?? '')
    setProjNotes(project?.notes ?? '')
    setProjDue(project?.dueDate ? project.dueDate.split('T')[0] : '')
    setProjGroupId(project?.groupId ?? '')
    setEditOpen(true)
  }
  function saveProject(e: React.FormEvent) {
    e.preventDefault()
    if (!project || !projName.trim()) return
    updateProject({
      ...project,
      name: projName.trim(),
      notes: projNotes || undefined,
      dueDate: projDue ? new Date(projDue).toISOString() : undefined,
      groupId: projGroupId || undefined,
    })
    setEditOpen(false)
  }
  function handleDeleteProject() {
    if (!project) return
    deleteProject(project.id)
    router.push('/app/projects')
  }

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/app/projects" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 font-mono">
          <ArrowLeft className="w-3.5 h-3.5" /> projects
        </Link>
        <p className="text-muted-foreground text-sm">Project not found.</p>
      </div>
    )
  }

  const group = groups.find((g) => g.id === project.groupId)
  const projDays = daysUntil(project.dueDate ?? '')
  const projOverdue = project.dueDate && projDays < 0

  const totalEstimated = projectTasks.filter(a => !a.isCompleted).reduce((s, a) => s + a.estimatedMinutes, 0)

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Back */}
      <Link href="/app/projects" className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors mb-5">
        <ArrowLeft className="w-3 h-3" /> projects
      </Link>

      {/* Project header */}
      <div className="rounded-lg border border-border bg-card p-5 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-lg font-semibold tracking-tight">{project.name}</h1>
              {isProjectComplete && (
                <span className="text-[10px] font-mono font-medium text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                  complete
                </span>
              )}
              {group && (
                <span
                  className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: group.colorHex + '22', color: group.colorHex }}
                >
                  {group.name}
                </span>
              )}
            </div>
            {project.notes && (
              <p className="text-sm text-muted-foreground mb-3">{project.notes}</p>
            )}

            {/* Progress */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono text-muted-foreground">{completed}/{total} tasks · {pct}%</span>
                {totalEstimated > 0 && (
                  <span className="text-xs font-mono text-muted-foreground">{totalEstimated}m remaining</span>
                )}
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isProjectComplete ? 'oklch(0.75 0.16 160)' : 'oklch(0.82 0.12 207)',
                  }}
                />
              </div>
            </div>

            {project.dueDate && (
              <span className={`text-xs font-mono ${projOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                due {fmtDate(project.dueDate)}
                {projOverdue
                  ? ` · ${Math.abs(projDays)}d overdue`
                  : projDays === 0 ? ' · today'
                  : ` · ${projDays}d left`}
              </span>
            )}
          </div>

          {/* Project actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={openEditProject}
              className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 hover:bg-primary/10 px-2 py-1 rounded transition-all"
            >
              <Pencil className="w-3 h-3" /> edit
            </button>
            <button
              onClick={handleDeleteProject}
              className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-red-400 border border-transparent hover:border-red-500/30 hover:bg-red-500/10 px-2 py-1 rounded transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Task controls */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Filter tabs */}
        <div className="flex rounded border border-border overflow-hidden text-[11px] font-mono">
          {(['incomplete', 'all', 'completed'] as FilterKey[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1.5 transition-colors border-r border-border last:border-0 ${
                filter === f ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Sort */}
        <Select value={sortKey} onValueChange={(v) => setSortKey((v ?? 'manual') as SortKey)}>
          <SelectTrigger className="h-7 text-[11px] font-mono w-36 border-border">
            <span className="text-muted-foreground mr-1">sort:</span>
            <span className="text-foreground">{sortKey}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual order</SelectItem>
            <SelectItem value="priority">Priority first</SelectItem>
            <SelectItem value="dueDate">Due date</SelectItem>
            <SelectItem value="time">Time (longest)</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Add task */}
        <Button
          size="sm"
          className="h-7 text-[11px] font-mono gap-1.5"
          onClick={() => { setEditTask(undefined); setSheetOpen(true) }}
        >
          <Plus className="w-3.5 h-3.5" /> add task
        </Button>
      </div>

      {/* Task list */}
      <div className="space-y-1">
        {filtered.length === 0 && (
          <div className="text-center py-10 border border-dashed border-border rounded-lg">
            <p className="text-xs font-mono text-muted-foreground">
              {filter === 'completed' ? 'No completed tasks yet.' : 'No tasks. Add one above.'}
            </p>
          </div>
        )}

        {filtered.map((task, idx) => {
          const tgroup = groups.find((g) => g.name === task.subject)
          const color = tgroup?.colorHex ?? '#6366F1'
          const due = fmtDue(task.dueDate)
          const isFirst = idx === 0
          const isLast = idx === filtered.length - 1

          return (
            <div
              key={task.id}
              className="flex items-center gap-2.5 rounded border border-border bg-card px-3 py-2.5 hover:border-white/15 transition-all group"
            >
              {/* Complete toggle */}
              <button
                onClick={() => handleComplete(task)}
                className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                title={task.isCompleted ? 'Mark incomplete' : 'Mark complete'}
              >
                {task.isCompleted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-primary group-hover:hidden" />
                    <RotateCcw className="w-4 h-4 hidden group-hover:block" />
                  </>
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </button>

              {/* Color bar */}
              <div className="w-0.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: color }} />

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm ${task.isCompleted ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                    {task.title}
                  </span>
                  {task.isPriority && <Star className="w-3 h-3 text-amber-400 shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {task.subject && (
                    <span className="text-[10px] font-mono" style={{ color }}>{task.subject}</span>
                  )}
                  {task.isCompleted && task.completedAt ? (
                    <span className="text-[10px] font-mono text-primary/50">
                      done {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  ) : (
                    <span className={`text-[10px] font-mono ${due.overdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {due.label}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-muted-foreground">{task.estimatedMinutes}m</span>
                  <span className="text-[10px] font-mono text-muted-foreground/50">D:{task.difficulty} I:{task.importance}</span>
                </div>
              </div>

              {/* Actions — visible on hover */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {/* Priority star */}
                <button
                  onClick={() => togglePriority(task)}
                  className={`p-1.5 rounded transition-colors ${
                    task.isPriority
                      ? 'text-amber-400 hover:text-muted-foreground'
                      : 'text-muted-foreground/40 hover:text-amber-400'
                  }`}
                  title={task.isPriority ? 'Remove priority' : 'Set priority'}
                >
                  <Star className="w-3.5 h-3.5" />
                </button>

                {/* Reorder — only visible in manual sort */}
                {sortKey === 'manual' && (
                  <div className="flex flex-col gap-px">
                    <button
                      onClick={() => move(task, -1)}
                      disabled={isFirst}
                      className="p-0.5 text-muted-foreground/40 hover:text-foreground transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => move(task, 1)}
                      disabled={isLast}
                      className="p-0.5 text-muted-foreground/40 hover:text-foreground transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Edit */}
                {!task.isCompleted && (
                  <button
                    onClick={() => { setEditTask(task); setSheetOpen(true) }}
                    className="text-[10px] font-mono text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 hover:bg-primary/10 px-2 py-1 rounded transition-all"
                  >
                    edit
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add task sheet — pre-fill projectId */}
      <AddTaskSheet
        key={editTask?.id ?? `new-${id}`}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editTask={editTask}
        defaultProjectId={id}
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

      {/* Edit project dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">edit project</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveProject} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={projName} onChange={(e) => setProjName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={projNotes} onChange={(e) => setProjNotes(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" min={today} value={projDue} onChange={(e) => setProjDue(e.target.value)} />
            </div>
            {groups.length > 0 && (
              <div className="space-y-1.5">
                <Label>Subject Group</Label>
                <Select value={projGroupId} onValueChange={(v) => setProjGroupId(v ?? '')}>
                  <SelectTrigger>
                    <span className="text-sm">
                      {projGroupId ? groups.find(g => g.id === projGroupId)?.name : <span className="text-muted-foreground">No group</span>}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No group</SelectItem>
                    {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="submit" className="flex-1" disabled={!projName.trim()}>Save</Button>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
