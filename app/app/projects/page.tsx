'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, FolderKanban, ArrowRight, Trash2 } from 'lucide-react'
import { useStore } from '@/hooks/use-store'
import { PgHeader } from '@/components/layout/PgHeader'
import { ProjectDialog } from '@/components/projects/ProjectDialog'
import { Button } from '@/components/ui/button'
import type { Project } from '@/types'

function daysUntil(iso?: string): number | null {
  if (!iso) return null
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const due = new Date(iso); due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function ProjectsPage() {
  const { projects, assignments, groups, deleteProject } = useStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | undefined>()

  function openCreate() {
    setEditProject(undefined)
    setDialogOpen(true)
  }
  function openEdit(e: React.MouseEvent, p: Project) {
    e.preventDefault(); e.stopPropagation()
    setEditProject(p)
    setDialogOpen(true)
  }
  function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault(); e.stopPropagation()
    deleteProject(id)
  }

  // Group projects by class
  const grouped = useMemo(() => {
    const withGroup = groups.map((g) => ({
      group: g,
      projects: projects.filter((p) => p.groupId === g.id),
    })).filter((g) => g.projects.length > 0)

    const ungrouped = projects.filter((p) => !p.groupId)
    return { withGroup, ungrouped }
  }, [projects, groups])

  const totalComplete = useMemo(() => {
    return projects.filter((p) => {
      const tasks = assignments.filter((a) => a.projectId === p.id)
      return tasks.length > 0 && tasks.every((a) => a.isCompleted)
    }).length
  }, [projects, assignments])

  function ProjectCard({ project }: { project: Project }) {
    const tasks = assignments.filter((a) => a.projectId === project.id)
    const completed = tasks.filter((a) => a.isCompleted).length
    const total = tasks.length
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    const isComplete = total > 0 && completed === total
    const days = daysUntil(project.dueDate)
    const overdue = days !== null && days < 0
    const group = groups.find((g) => g.id === project.groupId)

    return (
      <Link
        href={`/app/projects/${project.id}`}
        className="flex flex-col bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-all group/card"
        style={group ? { borderColor: group.colorHex + '30' } : {}}
        onMouseEnter={(e) => {
          if (group) (e.currentTarget as HTMLElement).style.borderColor = group.colorHex + '60'
        }}
        onMouseLeave={(e) => {
          if (group) (e.currentTarget as HTMLElement).style.borderColor = group.colorHex + '30'
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              {group && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: group.colorHex, boxShadow: `0 0 5px ${group.colorHex}80` }}
                />
              )}
              <span className="font-medium text-sm">{project.name}</span>
              {isComplete && (
                <span className="text-[9px] font-mono font-medium text-primary bg-primary/10 border border-primary/20 px-1.5 py-px rounded">
                  complete
                </span>
              )}
            </div>
            {project.notes && (
              <p className="text-xs text-muted-foreground truncate">{project.notes}</p>
            )}
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover/card:text-primary/60 transition-colors shrink-0 mt-0.5 ml-2" />
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[9px] text-muted-foreground/60">{completed}/{total} tasks</span>
            <span className="font-mono text-[9px] text-muted-foreground/60">{pct}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: isComplete
                  ? 'oklch(0.72 0.18 155)'
                  : group?.colorHex ?? 'oklch(0.82 0.12 207)',
                boxShadow: pct > 0 ? `0 0 5px ${group?.colorHex ?? 'oklch(0.82 0.12 207)'}60` : 'none',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto">
          {project.dueDate ? (
            <span className={`font-mono text-[9px] ${overdue ? 'text-red-400' : 'text-muted-foreground/50'}`}>
              {overdue
                ? `${Math.abs(days!)}d overdue`
                : days === 0 ? 'due today'
                : `${days}d left`}
            </span>
          ) : (
            <span className="font-mono text-[9px] text-muted-foreground/30">no due date</span>
          )}

          <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
            <button
              onClick={(e) => openEdit(e, project)}
              className="font-mono text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition-all"
            >
              edit
            </button>
            <button
              onClick={(e) => handleDelete(e, project.id)}
              className="font-mono text-[9px] text-muted-foreground hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-red-500/10 transition-all"
            >
              delete
            </button>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 page-enter">
      <PgHeader
        title="projects"
        sub={`${projects.length} project${projects.length !== 1 ? 's' : ''} · ${totalComplete} complete`}
        stats={[
          { v: projects.length, l: 'total' },
          { v: totalComplete, l: 'done' },
        ]}
        action={
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        }
      />

      {projects.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <FolderKanban className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No projects yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Create a project to group related tasks together.
          </p>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>
      )}

      {/* Grouped by class */}
      {grouped.withGroup.map(({ group, projects: groupProjects }) => (
        <div key={group.id} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: group.colorHex, boxShadow: `0 0 6px ${group.colorHex}90` }}
            />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {group.name}
            </span>
            <div className="flex-1 h-px bg-border ml-1" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groupProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      ))}

      {/* Ungrouped */}
      {grouped.ungrouped.length > 0 && (
        <div className="mb-8">
          {grouped.withGroup.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40">
                ungrouped
              </span>
              <div className="flex-1 h-px bg-border ml-1" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped.ungrouped.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}

      <ProjectDialog
        key={editProject?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editProject={editProject}
      />
    </div>
  )
}
