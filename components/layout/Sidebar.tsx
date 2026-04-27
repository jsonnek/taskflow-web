'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  CheckSquare,
  FolderKanban,
  BarChart3,
  Clock,
  Tag,
  Home,
  ChevronRight,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/hooks/use-store'
import * as stats from '@/lib/stats-aggregator'

// Sidebar width for data variant
const W = 240

function NavItem({
  href,
  label,
  active,
  icon: Icon,
  badge,
  indent = 0,
  colorDot,
}: {
  href: string
  label: string
  active: boolean
  icon?: React.ElementType
  badge?: number
  indent?: number
  colorDot?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 py-1.5 rounded text-[11px] font-mono transition-all relative select-none',
        active ? 'text-primary bg-primary/7' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
      )}
      style={{ paddingLeft: 10 + indent * 14, paddingRight: 8 }}
    >
      {active && (
        <span
          className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-primary"
          style={{ boxShadow: '0 0 8px oklch(0.82 0.12 207/70%)' }}
        />
      )}
      {colorDot ? (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: colorDot, boxShadow: `0 0 6px ${colorDot}99` }}
        />
      ) : Icon ? (
        <Icon className={cn('w-3.5 h-3.5 shrink-0', active ? 'text-primary' : 'text-muted-foreground/60')} />
      ) : null}
      <span
        className="flex-1 truncate"
        style={{ textShadow: active ? '0 0 10px oklch(0.82 0.12 207/60%)' : '' }}
      >
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span
          className="font-mono text-[9px] px-1.5 py-px rounded-full leading-relaxed"
          style={{
            background: 'oklch(0.65 0.22 25/20%)',
            color: 'oklch(0.70 0.22 25)',
            border: '1px solid oklch(0.65 0.22 25/35%)',
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}

function SecLabel({ label }: { label: string }) {
  return (
    <div className="font-mono text-[9px] text-white/20 uppercase tracking-widest px-2.5 pt-3.5 pb-1 select-none">
      {label}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { assignments, groups, projects } = useStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggle = (id: string) =>
    setExpanded((p) => ({ ...p, [id]: !p[id] }))

  // Compute stats for footer
  const streakData = stats.streaks(assignments)
  const rateData = stats.completionRate(assignments)
  const onTimeRate = rateData.total > 0
    ? Math.round(rateData.onTimeRate * 100)
    : 0

  // At-risk count for tasks badge
  const atRisk = assignments.filter((a) => {
    if (a.isCompleted) return false
    const d = new Date(a.dueDate)
    d.setHours(0, 0, 0, 0)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return (d.getTime() - now.getTime()) / 86400000 <= 1
  }).length

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <aside
      className="shrink-0 flex flex-col border-r border-border h-screen sticky top-0 overflow-hidden"
      style={{ width: W, background: 'var(--sidebar)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 h-14 border-b border-border shrink-0">
        <div
          className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0"
          style={{ boxShadow: '0 0 14px oklch(0.82 0.12 207/45%), 0 0 30px oklch(0.82 0.12 207/15%)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="oklch(0.08 0.01 220)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 17l6-6-6-6M12 19h8" />
          </svg>
        </div>
        <span className="text-sm font-mono font-bold tracking-tight whitespace-nowrap">
          task<span className="text-primary" style={{ textShadow: '0 0 10px oklch(0.82 0.12 207/60%)' }}>flow</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-1.5 py-2 flex flex-col gap-px overflow-y-auto">
        {/* Main nav */}
        <NavItem href="/app/home"      label="home"        icon={Home}         active={isActive('/app/home')} />
        <NavItem href="/app/timeline"  label="timeline"    icon={CalendarDays} active={isActive('/app/timeline')} />
        <NavItem href="/app/tasks"     label="tasks"       icon={CheckSquare}  active={isActive('/app/tasks')} badge={atRisk || undefined} />
        <NavItem href="/app/classes"   label="classes"     icon={BookOpen}     active={isActive('/app/classes')} />
        <NavItem href="/app/projects"  label="projects"    icon={FolderKanban} active={isActive('/app/projects')} />
        <NavItem href="/app/stats"     label="stats"       icon={BarChart3}    active={isActive('/app/stats')} />

        {/* Classes section */}
        <SecLabel label="// classes" />

        {groups.map((group) => {
          const groupTasks = assignments.filter(
            (a) => !a.isCompleted && (a.subject === group.name || a.groupId === group.id)
          ).length
          const groupProjects = projects.filter((p) => p.groupId === group.id)
          const isExp = expanded[group.id]
          const classActive = isActive(`/app/classes/${group.id}`)

          return (
            <div key={group.id}>
              <div className="flex items-center rounded overflow-hidden">
                <Link
                  href={`/app/classes/${group.id}`}
                  className={cn(
                    'flex items-center gap-2 flex-1 py-1.5 text-[11px] font-mono rounded transition-all relative',
                    classActive ? 'text-primary bg-primary/7' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                  style={{ paddingLeft: 10, paddingRight: 6 }}
                >
                  {classActive && (
                    <span
                      className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-primary"
                      style={{ boxShadow: '0 0 8px oklch(0.82 0.12 207/70%)' }}
                    />
                  )}
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: group.colorHex, boxShadow: `0 0 6px ${group.colorHex}99` }}
                  />
                  <span
                    className="flex-1 truncate"
                    style={{ textShadow: classActive ? '0 0 10px oklch(0.82 0.12 207/60%)' : '' }}
                  >
                    {group.name.toLowerCase()}
                  </span>
                  {groupTasks > 0 && (
                    <span
                      className="font-mono text-[9px] px-1 rounded-full leading-relaxed"
                      style={{
                        background: group.colorHex + '25',
                        color: group.colorHex,
                      }}
                    >
                      {groupTasks}
                    </span>
                  )}
                </Link>
                {(groupProjects.length > 0) && (
                  <button
                    onClick={() => toggle(group.id)}
                    className="flex items-center justify-center p-1.5 text-muted-foreground/40 hover:text-muted-foreground transition-all shrink-0"
                    style={{ transform: isExp ? 'rotate(90deg)' : 'none' }}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {isExp && (
                <div className="animate-in slide-in-from-left-1 duration-150">
                  {groupProjects.map((proj) => (
                    <NavItem
                      key={proj.id}
                      href={`/app/projects/${proj.id}`}
                      label={proj.name.toLowerCase()}
                      icon={FolderKanban}
                      active={isActive(`/app/projects/${proj.id}`)}
                      indent={1}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {groups.length === 0 && (
          <p className="font-mono text-[10px] text-muted-foreground/30 px-2.5 py-2">
            no classes yet
          </p>
        )}

        {/* Config */}
        <SecLabel label="// config" />
        <NavItem href="/app/settings/work-blocks" label="work-blocks" icon={Clock} active={isActive('/app/settings/work-blocks')} />
        <NavItem href="/app/settings/subjects"    label="subjects"    icon={Tag}   active={isActive('/app/settings/subjects')} />
      </nav>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-border shrink-0">
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {[
            { l: 'streak', v: `${streakData.currentStreak}d`, c: 'oklch(0.82 0.12 207)' },
            { l: 'on-time', v: `${onTimeRate}%`, c: 'oklch(0.72 0.18 155)' },
          ].map((s) => (
            <div
              key={s.l}
              className="bg-card border border-border rounded-md px-2 py-1.5"
            >
              <div className="font-mono text-[8px] text-muted-foreground/50 mb-0.5">{s.l}</div>
              <div
                className="font-mono text-sm font-bold"
                style={{ color: s.c, textShadow: `0 0 8px ${s.c}80` }}
              >
                {s.v}
              </div>
            </div>
          ))}
        </div>
        <p className="font-mono text-[9px] text-white/20 tracking-wider">
          v4.0 · offline · local
        </p>
      </div>
    </aside>
  )
}
