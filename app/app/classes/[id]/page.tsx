'use client'

import { useMemo, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, FolderKanban, Circle, Plus, Pencil, RotateCcw } from 'lucide-react'
import { useStore } from '@/hooks/use-store'
import { PgHeader } from '@/components/layout/PgHeader'
import { Button } from '@/components/ui/button'
import { TimePromptDialog } from '@/components/tasks/TimePromptDialog'
import { AddTaskSheet } from '@/components/tasks/AddTaskSheet'
import { ProjectDialog } from '@/components/projects/ProjectDialog'
import type { Assignment, Project } from '@/types'

function daysUntil(iso: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const due = new Date(iso); due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function fmtDue(d: number) {
  if (d < 0) return `${Math.abs(d)}d overdue`
  if (d === 0) return 'due today'
  if (d === 1) return 'due tomorrow'
  return `${d}d`
}

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { assignments, groups, projects, completeAssignment, uncompleteAssignment, addTimeEntry } = useStore()
  const [pendingComplete, setPendingComplete] = useState<Assignment | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editTask, setEditTask] = useState<Assignment | undefined>()
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | undefined>()

  const group = groups.find((g) => g.id === id)
  const groupAssignments = useMemo(
    () => assignments.filter((a) => a.subject === group?.name || a.groupId === id),
    [assignments, group, id]
  )
  const groupProjects = useMemo(
    () => projects.filter((p) => p.groupId === id),
    [projects, id]
  )

  const pending = groupAssignments.filter((a) => !a.isCompleted)
  const done = groupAssignments.filter((a) => a.isCompleted)
  const pct = groupAssignments.length
    ? Math.round((done.length / groupAssignments.length) * 100)
    : 0

  const handleComplete = (a: Assignment) => {
    if (a.isCompleted) {
      uncompleteAssignment(a.id)
    } else {
      setPendingComplete(a)
    }
  }

  if (!group) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <p className="font-mono text-sm text-muted-foreground">Class not found.</p>
        <Link href="/app/classes" className="text-primary text-sm hover:underline mt-2 inline-block">
          ← Back to classes
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 page-enter">
      <PgHeader
        title={group.name.toLowerCase()}
        sub={`${pending.length} assignments · ${groupProjects.length} projects`}
        stats={[
          { v: pending.length, l: 'pending' },
          { v: `${pct}%`, l: 'done' },
        ]}
        action={
          <Link href="/app/classes">
            <Button variant="outline" size="sm" className="gap-1.5 font-mono text-xs">
              <ArrowLeft className="w-3 h-3" /> classes
            </Button>
          </Link>
        }
      />

      {/* Progress bar */}
      <div className="h-0.5 bg-muted rounded-full overflow-hidden mb-6">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: group.colorHex,
            boxShadow: `0 0 8px ${group.colorHex}70`,
          }}
        />
      </div>

      {/* Assignments */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50">
          // assignments
        </p>
        <button
          onClick={() => { setEditTask(undefined); setAddOpen(true) }}
          className="flex items-center gap-1 font-mono text-[10px] text-primary/70 hover:text-primary border border-primary/20 hover:border-primary/50 hover:bg-primary/10 px-2 py-0.5 rounded transition-all"
        >
          <Plus className="w-3 h-3" /> add task
        </button>
      </div>
      <div className="flex flex-col gap-1.5 mb-6">
        {pending.length === 0 && (
          <div className="font-mono text-[11px] text-muted-foreground/40 text-center px-4 py-3.5 rounded-md border border-dashed border-border">
            no pending assignments
          </div>
        )}
        {pending
          .sort((a, b) => {
            if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1
            return daysUntil(a.dueDate) - daysUntil(b.dueDate)
          })
          .map((task) => {
            const days = daysUntil(task.dueDate)
            const overdue = days < 0
            return (
              <div
                key={task.id}
                className="flex items-center gap-2.5 bg-card rounded-lg px-3 py-2.5 border group/row transition-all"
                style={{ borderColor: overdue ? 'oklch(0.65 0.22 25/40%)' : 'var(--border)' }}
              >
                <button
                  onClick={() => handleComplete(task)}
                  className="shrink-0 flex text-muted-foreground/50 hover:text-primary transition-colors mt-0.5"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <div
                  className="w-0.5 self-stretch min-h-6 rounded-full shrink-0"
                  style={{ background: group.colorHex, boxShadow: `0 0 5px ${group.colorHex}60` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[13px] font-medium">{task.title}</span>
                    {task.isPriority && <span className="text-amber-400 text-xs">★</span>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="font-mono text-[9px] font-bold px-1.5 py-px rounded"
                      style={{ background: group.colorHex + '22', color: group.colorHex }}
                    >
                      {task.subject}
                    </span>
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: overdue ? 'oklch(0.70 0.22 25)' : 'var(--muted-foreground)' }}
                    >
                      {fmtDue(days)}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/50">
                      {task.estimatedMinutes}m
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { setEditTask(task); setAddOpen(true) }}
                  className="opacity-0 group-hover/row:opacity-100 transition-opacity font-mono text-[10px] text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 hover:bg-primary/10 px-2 py-0.5 rounded shrink-0"
                >
                  edit
                </button>
              </div>
            )
          })}

        {done.length > 0 && (
          <details className="group/done">
            <summary className="font-mono text-[10px] text-muted-foreground/40 py-1.5 px-1 cursor-pointer list-none flex items-center gap-1 hover:text-muted-foreground/70 transition-colors">
              <span className="inline-block transition-transform group-open/done:rotate-90">▶</span>
              {done.length} completed
            </summary>
            <div className="flex flex-col gap-1 mt-1">
              {done.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2.5 bg-card/50 rounded-lg px-3 py-2 border border-border/50 group/done-row"
                >
                  <button
                    onClick={() => uncompleteAssignment(task.id)}
                    className="shrink-0 flex text-primary/60 hover:text-muted-foreground transition-colors"
                    title="Restore"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <div
                    className="w-0.5 self-stretch min-h-5 rounded-full shrink-0 opacity-40"
                    style={{ background: group.colorHex }}
                  />
                  <span className="text-[12px] text-muted-foreground/60 line-through flex-1 truncate">
                    {task.title}
                  </span>
                  {task.completedAt && (
                    <span className="font-mono text-[9px] text-muted-foreground/40 shrink-0">
                      {new Date(task.completedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Projects */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50">
          // projects
        </p>
        <button
          onClick={() => { setEditProject(undefined); setProjectDialogOpen(true) }}
          className="flex items-center gap-1 font-mono text-[10px] text-primary/70 hover:text-primary border border-primary/20 hover:border-primary/50 hover:bg-primary/10 px-2 py-0.5 rounded transition-all"
        >
          <Plus className="w-3 h-3" /> new project
        </button>
      </div>
      {groupProjects.length === 0 ? (
        <div className="font-mono text-[11px] text-muted-foreground/40 text-center px-4 py-3.5 rounded-md border border-dashed border-border">
          no projects
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {groupProjects.map((proj) => {
            const projTasks = assignments.filter((a) => a.projectId === proj.id)
            const projDone = projTasks.filter((a) => a.isCompleted).length
            const projPct = projTasks.length ? Math.round((projDone / projTasks.length) * 100) : 0
            return (
              <div key={proj.id} className="group/proj bg-card rounded-lg border transition-all" style={{ borderColor: group.colorHex + '40' }}>
                <Link
                  href={`/app/projects/${proj.id}`}
                  className="block px-3.5 pt-3 pb-2"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FolderKanban className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    <span className="text-[13px] font-medium flex-1">{proj.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground/50">
                      {projDone}/{projTasks.length} · {projPct}%
                    </span>
                  </div>
                  <div className="h-0.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${projPct}%`, background: group.colorHex, boxShadow: `0 0 5px ${group.colorHex}70` }}
                    />
                  </div>
                </Link>
                <div className="flex justify-end px-3.5 pb-2 opacity-0 group-hover/proj:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditProject(proj); setProjectDialogOpen(true) }}
                    className="font-mono text-[9px] text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 hover:bg-primary/10 px-2 py-0.5 rounded transition-all"
                  >
                    edit
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / edit project dialog */}
      <ProjectDialog
        key={editProject?.id ?? 'new-proj'}
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        editProject={editProject}
        defaultGroupId={id}
      />

      {/* Add / edit task sheet */}
      <AddTaskSheet
        key={editTask?.id ?? 'new'}
        open={addOpen}
        onOpenChange={setAddOpen}
        editTask={editTask}
        defaultSubject={group.name}
      />

      {/* Time prompt */}
      {pendingComplete && (
        <TimePromptDialog
          open={!!pendingComplete}
          taskTitle={pendingComplete.title}
          estimatedMinutes={pendingComplete.estimatedMinutes}
          onSave={(minutes, completedAt) => {
            const endedAt = new Date(completedAt)
            addTimeEntry({
              assignmentId: pendingComplete.id,
              startedAt: new Date(endedAt.getTime() - minutes * 60000).toISOString(),
              endedAt: endedAt.toISOString(),
            })
            completeAssignment(pendingComplete.id, completedAt)
            setPendingComplete(null)
          }}
          onSkip={() => {
            completeAssignment(pendingComplete.id)
            setPendingComplete(null)
          }}
        />
      )}
    </div>
  )
}
