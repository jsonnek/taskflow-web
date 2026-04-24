'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  CheckSquare,
  FolderKanban,
  BarChart3,
  Settings,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/app/timeline', label: 'Timeline', icon: CalendarDays },
  { href: '/app/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/app/projects', label: 'Projects', icon: FolderKanban },
  { href: '/app/stats', label: 'Stats', icon: BarChart3 },
]

const settings = [
  { href: '/app/settings/work-blocks', label: 'Work Blocks', icon: Settings },
  { href: '/app/settings/subjects', label: 'Subjects', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 shrink-0 flex flex-col border-r border-border bg-background h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Task Flow</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}

        <div className="pt-4 pb-1 px-2.5">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Settings
          </span>
        </div>

        {settings.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
              pathname === href
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground tabular-nums">
          v4.0 · localStorage
        </p>
      </div>
    </aside>
  )
}
