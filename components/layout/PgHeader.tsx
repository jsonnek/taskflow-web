'use client'

import { cn } from '@/lib/utils'

interface StatChip {
  v: string | number
  l: string
}

interface PgHeaderProps {
  title: string
  sub?: string
  stats?: StatChip[]
  action?: React.ReactNode
  className?: string
}

export function PgHeader({ title, sub, stats, action, className }: PgHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-7 pb-5 border-b border-border relative', className)}>
      {/* Cyan accent underline */}
      <span
        className="absolute bottom-[-1px] left-0 h-px w-14"
        style={{ background: 'oklch(0.82 0.12 207)', boxShadow: '0 0 10px oklch(0.82 0.12 207/60%)' }}
      />
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ letterSpacing: '-.03em', textShadow: 'none' }}
        >
          {title}
        </h1>
        {sub && (
          <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{sub}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        {stats?.map((s, i) => (
          <div
            key={i}
            className="flex flex-col items-end px-2.5 py-1.5 bg-card border border-border rounded-md"
          >
            <span
              className="font-mono text-[15px] font-bold text-primary"
              style={{ textShadow: '0 0 8px oklch(0.82 0.12 207/50%)' }}
            >
              {s.v}
            </span>
            <span className="font-mono text-[9px] text-muted-foreground/60">{s.l}</span>
          </div>
        ))}
        {action}
      </div>
    </div>
  )
}
