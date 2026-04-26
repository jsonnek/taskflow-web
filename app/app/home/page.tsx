'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useStore } from '@/hooks/use-store'
import { PgHeader } from '@/components/layout/PgHeader'
import * as stats from '@/lib/stats-aggregator'
import { useScheduler } from '@/hooks/use-scheduler'

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

export default function HomePage() {
  const { assignments, groups, timeEntries, workBlocks } = useStore()
  const schedule = useScheduler()

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'good morning.' : hour < 17 ? 'good afternoon.' : hour < 21 ? 'good evening.' : 'burning the midnight oil.'
  const today = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })

  // Stats
  const streakData = useMemo(() => stats.streaks(assignments), [assignments])
  const rateData = useMemo(() => stats.completionRate(assignments), [assignments])
  const momentumScore = useMemo(() => stats.momentumScore(assignments, timeEntries), [assignments, timeEntries])
  const gaugeData = useMemo(() => stats.workloadGauge(schedule.days, workBlocks), [schedule.days, workBlocks])
  const completions = useMemo(() => stats.dailyCompletions(assignments), [assignments])

  const onTimeRate = rateData.total > 0 ? Math.round(rateData.onTimeRate * 100) : 0
  const pending = assignments.filter((a) => !a.isCompleted).length

  // Urgent tasks (due today or overdue or due tomorrow and priority)
  const urgent = useMemo(
    () =>
      assignments
        .filter((a) => !a.isCompleted)
        .map((a) => ({ ...a, days: daysUntil(a.dueDate) }))
        .filter((a) => a.days <= 1)
        .sort((a, b) => a.days - b.days || (b.isPriority ? 1 : -1))
        .slice(0, 5),
    [assignments]
  )

  // Classes overview
  const classCards = useMemo(
    () =>
      groups.map((g) => {
        const all = assignments.filter((a) => a.subject === g.name || a.groupId === g.id)
        const done = all.filter((a) => a.isCompleted).length
        const pct = all.length ? Math.round((done / all.length) * 100) : 0
        return { ...g, total: all.length, done, pct }
      }),
    [groups, assignments]
  )

  // Chart data
  const chartMax = Math.max(...completions.map((c) => c.count), 1)

  const statCards = [
    { l: 'Streak',   v: `${streakData.currentStreak}d`, sub: `Best: ${streakData.longestStreak}d`,       c: 'oklch(0.82 0.12 207)' },
    { l: 'On-Time',  v: `${onTimeRate}%`,                sub: `${rateData.onTimeCount} / ${rateData.total} tasks`, c: 'oklch(0.72 0.18 155)' },
    { l: 'Momentum', v: `${momentumScore}`,              sub: '0–100 composite',                          c: 'oklch(0.72 0.14 255)' },
    { l: 'Workload', v: `${Math.round(gaugeData.utilizationRatio * 100)}%`, sub: 'of capacity used', c: 'oklch(0.80 0.18 65)' },
  ]

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 page-enter">
      <PgHeader
        title={greeting}
        sub={today}
        stats={[
          { v: `${streakData.currentStreak}d`, l: 'streak' },
          { v: `${onTimeRate}%`, l: 'on-time' },
          { v: pending, l: 'pending' },
        ]}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {statCards.map((s) => (
          <div key={s.l} className="bg-card border border-border rounded-lg p-3 transition-colors">
            <p className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-widest mb-1.5">{s.l}</p>
            <p
              className="font-mono text-2xl font-bold leading-none"
              style={{ color: s.c, textShadow: `0 0 14px ${s.c}40` }}
            >
              {s.v}
            </p>
            <p className="font-mono text-[9px] text-muted-foreground/50 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Two-col: urgent + chart */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Urgent today */}
        <div className="bg-card border border-border rounded-lg p-3.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-2.5">// urgent today</p>
          <div className="flex flex-col gap-1.5">
            {urgent.length === 0 && (
              <p className="font-mono text-[11px] text-muted-foreground/40 py-3">no urgent tasks.</p>
            )}
            {urgent.map((t) => {
              const group = groups.find((g) => g.name === t.subject || g.id === t.groupId)
              const color = group?.colorHex ?? 'oklch(0.82 0.12 207)'
              const isToday = t.days === 0
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-md border"
                  style={{
                    borderColor: isToday ? 'oklch(0.65 0.22 25/40%)' : 'var(--border)',
                    background: isToday ? 'oklch(0.65 0.22 25/5%)' : 'transparent',
                  }}
                >
                  <div
                    className="w-0.5 self-stretch min-h-7 rounded-full shrink-0"
                    style={{ background: color, boxShadow: `0 0 5px ${color}60` }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate">{t.title}</p>
                    <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                      {fmtDue(t.days)} · {t.estimatedMinutes}m
                    </p>
                  </div>
                  {isToday && (
                    <span
                      className="font-mono text-[9px] px-1.5 py-px rounded shrink-0"
                      style={{
                        background: 'oklch(0.65 0.22 25/15%)',
                        color: 'oklch(0.70 0.22 25)',
                        border: '1px solid oklch(0.65 0.22 25/30%)',
                      }}
                    >
                      today
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Completion chart */}
        <div className="bg-card border border-border rounded-lg p-3.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-2.5">// completions — 14d</p>
          <div className="flex items-end gap-0.5 h-20 mb-1.5">
            {completions.map((pt, i) => {
              const h = chartMax > 0 ? Math.round((pt.count / chartMax) * 100) : 0
              const isMax = pt.count === chartMax && pt.count > 0
              const opacity = 15 + Math.round((pt.count / chartMax) * 65)
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm min-h-[3px]"
                  style={{
                    height: `${Math.max(h, 4)}%`,
                    background: `oklch(0.82 0.12 207 / ${opacity}%)`,
                    boxShadow: isMax ? '0 -3px 10px oklch(0.82 0.12 207/50%)' : 'none',
                  }}
                />
              )
            })}
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[9px] text-muted-foreground/40">
              {completions[0]?.date
                ? new Date(completions[0].date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })
                : ''}
            </span>
            <span className="font-mono text-[9px] text-muted-foreground/40">
              {completions[completions.length - 1]?.date
                ? new Date(completions[completions.length - 1].date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })
                : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Classes overview */}
      {classCards.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-3.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-3">// classes overview</p>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(classCards.length, 5)}, 1fr)` }}>
            {classCards.map((cls) => (
              <Link
                key={cls.id}
                href={`/app/classes/${cls.id}`}
                className="p-2.5 rounded-md border border-border hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: cls.colorHex, boxShadow: `0 0 5px ${cls.colorHex}90` }}
                  />
                  <span className="font-mono text-[10px] font-medium truncate">{cls.name.toLowerCase()}</span>
                </div>
                <div className="h-0.5 bg-muted rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${cls.pct}%`,
                      background: cls.colorHex,
                      boxShadow: `0 0 4px ${cls.colorHex}70`,
                    }}
                  />
                </div>
                <span className="font-mono text-[9px] text-muted-foreground/50">
                  {cls.done}/{cls.total}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {classCards.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-lg p-6 text-center">
          <p className="font-mono text-[11px] text-muted-foreground/50">
            add subjects in{' '}
            <Link href="/app/settings/subjects" className="text-primary hover:underline">
              settings → subjects
            </Link>{' '}
            to see your classes here.
          </p>
        </div>
      )}
    </div>
  )
}
