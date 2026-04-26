'use client'

import { useState } from 'react'
import { Plus, FolderKanban, Trash2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useStore } from '@/hooks/use-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import type { Project } from '@/types'

function daysUntil(iso?: string): number | null {
  if (!iso) return null
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const due = new Date(iso); due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function ProjectsPage() {
  const { projects, assignments, groups, addProject, updateProject, deleteProject } = useStore()

  const [createOpen, setCreateOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | undefined>()
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [groupId, setGroupId] = useState('')
  const today = new Date().toISOString().split('T')[0]

  function openCreate() {
    setEditProject(undefined); setName(''); setNotes(''); setDueDate(''); setGroupId('')
    setCreateOpen(true)
  }
  function openEdit(e: React.MouseEvent, p: Project) {
    e.preventDefault(); e.stopPropagation()
    setEditProject(p); setName(p.name); setNotes(p.notes ?? '')
    setDueDate(p.dueDate ? p.dueDate.split('T')[0] : ''); setGroupId(p.groupId ?? '')
    setCreateOpen(true)
  }
  function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault(); e.stopPropagation()
    deleteProject(id)
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const data = { name: name.trim(), notes: notes || undefined, dueDate: dueDate ? new Date(dueDate).toISOString() : undefined, groupId: groupId || undefined }
    if (editProject) updateProject({ ...editProject, ...data })
    else addProject(data)
    setCreateOpen(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground font-mono">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {projects.map((project) => {
          const projectTasks = assignments.filter((a) => a.projectId === project.id)
          const completed = projectTasks.filter((a) => a.isCompleted).length
          const total = projectTasks.length
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0
          const isComplete = total > 0 && completed === total
          const days = daysUntil(project.dueDate)
          const group = groups.find((g) => g.id === project.groupId)
          const overdue = days !== null && days < 0

          return (
            <Link
              key={project.id}
              href={`/app/projects/${project.id}`}
              className="block rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-card/80 transition-all group"
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{project.name}</span>
                    {isComplete && (
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
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{project.notes}</p>
                  )}
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0 mt-0.5 ml-2" />
              </div>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {completed}/{total} tasks
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isComplete ? 'oklch(0.75 0.16 160)' : 'oklch(0.82 0.12 207)',
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                {project.dueDate ? (
                  <span className={`text-[10px] font-mono ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {overdue
                      ? `${Math.abs(days!)}d overdue`
                      : days === 0 ? 'due today'
                      : `${days}d left`}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-muted-foreground/40">no due date</span>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => openEdit(e, project)}
                    className="text-[10px] font-mono text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition-all"
                  >
                    edit
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, project.id)}
                    className="text-[10px] font-mono text-muted-foreground hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-red-500/10 transition-all"
                  >
                    delete
                  </button>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Create/edit dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{editProject ? 'edit project' : 'new project'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="proj-name">Name</Label>
              <Input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" autoFocus required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-notes">Notes</Label>
              <Input id="proj-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-due">Due Date</Label>
              <Input id="proj-due" type="date" min={today} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            {groups.length > 0 && (
              <div className="space-y-1.5">
                <Label>Subject Group</Label>
                <Select value={groupId} onValueChange={(v) => setGroupId(v ?? '')}>
                  <SelectTrigger>
                    <span className="text-sm">
                      {groupId ? groups.find(g => g.id === groupId)?.name ?? 'No group' : <span className="text-muted-foreground">No group</span>}
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
              <Button type="submit" className="flex-1" disabled={!name.trim()}>
                {editProject ? 'Save' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
