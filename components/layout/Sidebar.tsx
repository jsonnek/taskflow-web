'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  CheckSquare,
  FolderKanban,
  BarChart3,
  Clock,
  Tag,
  Terminal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/app/timeline', label: 'timeline', icon: CalendarDays },
  { href: '/app/tasks', label: 'tasks', icon: CheckSquare },
  { href: '/app/projects', label: 'projects', icon: FolderKanban },
  { href: '/app/stats', label: 'stats', icon: BarChart3 },
]

const config = [
  { href: '/app/settings/work-blocks', label: 'work-blocks', icon: Clock },
  { href: '/app/settings/subjects', label: 'subjects', icon: Tag },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-48 shrink-0 flex flex-col border-r border-border h-screen sticky top-0" style={{ background: 'var(--sidebar)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
        <Terminal className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-mono font-bold tracking-tight">
          task<span className="text-primary">flow</span>
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-3 space-y-px overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 rounded text-xs font-mono transition-all relative',
                active
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-primary" />
              )}
              <Icon className={cn('w-3.5 h-3.5 shrink-0', active && 'text-primary')} />
              {label}
            </Link>
          )
        })}

        <div className="pt-4 pb-1 px-3">
          <span className="text-[9px] font-mono text-muted-foreground/50 tracking-widest">
            // config
          </span>
        </div>

        {config.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 rounded text-xs font-mono transition-all relative',
                active
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-primary" />
              )}
              <Icon className={cn('w-3.5 h-3.5 shrink-0', active && 'text-primary')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[9px] font-mono text-muted-foreground/40 tracking-wider">
          v4.0 · offline · local
        </p>
      </div>
    </aside>
  )
}
