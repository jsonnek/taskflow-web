'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useStore } from '@/hooks/use-store'
import { PgHeader } from '@/components/layout/PgHeader'

export default function ClassesPage() {
  const { assignments, groups, projects } = useStore()

  const classes = useMemo(
    () =>
      groups.map((g) => {
        const all = assignments.filter((a) => a.subject === g.name || a.groupId === g.id)
        const done = all.filter((a) => a.isCompleted).length
        const pending = all.filter((a) => !a.isCompleted).length
        const pct = all.length ? Math.round((done / all.length) * 100) : 0
        const groupProjects = projects.filter((p) => p.groupId === g.id)
        return { ...g, total: all.length, done, pending, pct, projects: groupProjects }
      }),
    [groups, assignments, projects]
  )

  const totalProjects = classes.reduce((s, c) => s + c.projects.length, 0)

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 page-enter">
      <PgHeader
        title="classes"
        sub={`${classes.length} classes · ${totalProjects} projects`}
        stats={[
          { v: classes.length, l: 'classes' },
          { v: totalProjects, l: 'projects' },
        ]}
      />

      {classes.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <p className="text-sm font-medium mb-1">No classes yet</p>
          <p className="text-xs text-muted-foreground">
            Add subjects in{' '}
            <Link href="/app/settings/subjects" className="text-primary hover:underline">
              Settings → Subjects
            </Link>{' '}
            to organise your work into classes.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {classes.map((cls) => (
          <Link
            key={cls.id}
            href={`/app/classes/${cls.id}`}
            className="flex items-center gap-3.5 bg-card border border-border rounded-lg px-4 py-3.5 transition-all hover:border-primary/30"
            style={{}}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = cls.colorHex + '60'
              ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${cls.colorHex}10`
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = ''
              ;(e.currentTarget as HTMLElement).style.boxShadow = ''
            }}
          >
            {/* Color dot */}
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: cls.colorHex, boxShadow: `0 0 8px ${cls.colorHex}` }}
            />
            {/* Name + progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-semibold">{cls.name}</span>
                <span
                  className="font-mono text-[9px] px-1.5 py-px rounded-full border"
                  style={{
                    background: cls.colorHex + '20',
                    color: cls.colorHex,
                    borderColor: cls.colorHex + '40',
                  }}
                >
                  {cls.pending} pending
                </span>
                {cls.projects.length > 0 && (
                  <span className="font-mono text-[9px] text-muted-foreground/50">
                    {cls.projects.length} project{cls.projects.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="h-0.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${cls.pct}%`,
                    background: cls.colorHex,
                    boxShadow: `0 0 5px ${cls.colorHex}60`,
                  }}
                />
              </div>
            </div>
            {/* Completion % + chevron */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-[11px] text-muted-foreground/60">
                {cls.done}/{cls.total}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
