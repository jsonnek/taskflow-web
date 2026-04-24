'use client'

import { useState } from 'react'
import { Plus, FolderKanban, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useStore } from '@/hooks/use-store'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Project } from '@/types'

function formatDate(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(iso)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function ProjectsPage() {
  const {
    projects,
    assignments,
    groups,
    addProject,
    updateProject,
    deleteProject,
    completeAssignment,
  } = useStore()

  const [createOpen, setCreateOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | undefined>()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [groupId, setGroupId] = useState('')

  function openCreate() {
    setEditProject(undefined)
    setName('')
    setNotes('')
    setDueDate('')
    setGroupId('')
    setCreateOpen(true)
  }

  function openEdit(p: Project) {
    setEditProject(p)
    setName(p.name)
    setNotes(p.notes ?? '')
    setDueDate(p.dueDate ? p.dueDate.split('T')[0] : '')
    setGroupId(p.groupId ?? '')
    setCreateOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const data = {
      name: name.trim(),
      notes: notes || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      groupId: groupId || undefined,
    }
    if (editProject) {
      updateProject({ ...editProject, ...data })
    } else {
      addProject(data)
    }
    setCreateOpen(false)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">{projects.length} projects</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {projects.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <FolderKanban className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No projects yet</p>
          <p className="text-xs text-muted-foreground">Create a project to group related tasks together.</p>
        </div>
      )}

      <div className="space-y-3">
        {projects.map((project) => {
          const projectTasks = assignments.filter((a) => a.projectId === project.id)
          const completed = projectTasks.filter((a) => a.isCompleted).length
          const total = projectTasks.length
          const progress = total > 0 ? (completed / total) * 100 : 0
          const isComplete = total > 0 && completed === total
          const days = daysUntil(project.dueDate)
          const isExpanded = expandedId === project.id
          const group = groups.find((g) => g.id === project.groupId)

          return (
            <div key={project.id} className="rounded-lg border border-border bg-card overflow-hidden">
              {/* Project header */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{project.name}</span>
                      {isComplete && (
                        <Badge variant="secondary" className="text-[10px]">Complete</Badge>
                      )}
                      {group && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ backgroundColor: group.colorHex + '22', color: group.colorHex }}
                        >
                          {group.name}
                        </span>
                      )}
                    </div>

                    {project.notes && (
                      <p className="text-xs text-muted-foreground mb-2">{project.notes}</p>
                    )}

                    <div className="flex items-center gap-3 mb-2">
                      <Progress value={progress} className="flex-1 h-1.5" />
                      <span className="text-xs mono-nums text-muted-foreground shrink-0">
                        {completed}/{total}
                      </span>
                    </div>

                    {project.dueDate && (
                      <span className={`text-xs mono-nums ${days !== null && days < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        Due {formatDate(project.dueDate)}
                        {days !== null && days >= 0 && ` · ${days}d left`}
                        {days !== null && days < 0 && ` · ${Math.abs(days)}d overdue`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(project)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : project.id)}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Task list */}
              {isExpanded && (
                <div className="border-t border-border">
                  {projectTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-4 py-3">No tasks in this project.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {projectTasks
                        .sort((a, b) => (a.projectOrder ?? 0) - (b.projectOrder ?? 0))
                        .map((task) => {
                          const tgroup = groups.find((g) => g.name === task.subject)
                          const color = tgroup?.colorHex ?? '#6366F1'
                          return (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 px-4 py-2.5"
                            >
                              <div
                                className="w-1 h-4 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span
                                className={`flex-1 text-sm ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}
                              >
                                {task.title}
                              </span>
                              <span className="text-xs mono-nums text-muted-foreground shrink-0">
                                {task.estimatedMinutes}m
                              </span>
                              {!task.isCompleted && (
                                <button
                                  onClick={() => completeAssignment(task.id)}
                                  className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                >
                                  Done
                                </button>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Create/edit dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editProject ? 'Edit Project' : 'New Project'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="proj-name">Name *</Label>
              <Input
                id="proj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-notes">Notes</Label>
              <Input
                id="proj-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-due">Due Date</Label>
              <Input
                id="proj-due"
                type="date"
                min={today}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            {groups.length > 0 && (
              <div className="space-y-1.5">
                <Label>Group</Label>
                <Select value={groupId} onValueChange={(v) => setGroupId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="No group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No group</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="submit" className="flex-1" disabled={!name.trim()}>
                {editProject ? 'Save' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
