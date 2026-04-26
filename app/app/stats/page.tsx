'use client'

import { useMemo } from 'react'
import { useStore } from '@/hooks/use-store'
import { useScheduler } from '@/hooks/use-scheduler'
import { PgHeader } from '@/components/layout/PgHeader'
import * as stats from '@/lib/stats-aggregator'

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  cyan:   'oklch(0.82 0.12 207)',
  green:  'oklch(0.72 0.18 155)',
  purple: 'oklch(0.68 0.16 290)',
  amber:  'oklch(0.80 0.18 65)',
  red:    'oklch(0.65 0.22 25)',
  muted:  'oklch(0.16 0.01 220)',
  faint:  'oklch(0.40 0.01 220)',
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color,
}: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3.5">
      <p className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-widest mb-1.5">{label}</p>
      <p className="font-mono text-3xl font-bold leading-none mb-1" style={{ color, textShadow: `0 0 14px ${color}40` }}>
        {value}
      </p>
      <p className="font-mono text-[9px] text-muted-foreground/50">{sub}</p>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-sm font-semibold mb-4">{title}</p>
      {children}
    </div>
  )
}

// Pure-CSS bar chart
function BarChart({
  data, color, labelKey, valueKey, unit = '', height = 80,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  color: string
  labelKey: string
  valueKey: string
  unit?: string
  height?: number
}) {
  const max = Math.max(...data.map((d) => Number(d[valueKey])), 1)
  return (
    <div>
      <div className="flex items-end gap-0.5" style={{ height }}>
        {data.map((d, i) => {
          const v = Number(d[valueKey])
          const pct = Math.max((v / max) * 100, v > 0 ? 4 : 2)
          const isMax = v === max && v > 0
          // vary opacity: 15% at 0, up to 80% at max
          const opacity = v === 0 ? 8 : 15 + Math.round((v / max) * 65)
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              title={unit ? `${v}${unit}` : String(v)}
              style={{
                height: `${pct}%`,
                minHeight: 3,
                background: `oklch(from ${color} l c h / ${opacity}%)`,
                boxShadow: isMax ? `0 -3px 10px ${color}80` : 'none',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// SVG donut ring
function Donut({
  segments, size = 100, thickness = 13,
}: {
  segments: { value: number; color: string; label: string }[]
  size?: number
  thickness?: number
}) {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, sg) => s + sg.value, 0) || 1
  // largest segment label
  const main = segments.reduce((a, b) => (a.value > b.value ? a : b))
  const mainPct = Math.round((main.value / total) * 100)

  let offset = circ * 0.25 // start at top
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.muted} strokeWidth={thickness} />
      {segments.map((sg, i) => {
        const dash = (sg.value / total) * circ
        const el = (
          <circle
            key={i}
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={sg.color}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={offset}
            strokeLinecap="butt"
          />
        )
        offset -= dash
        return el
      })}
      {/* Glow layer for main segment */}
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={main.color}
        strokeWidth={thickness}
        strokeDasharray={`${(main.value / total) * circ} ${circ}`}
        strokeDashoffset={circ * 0.25}
        style={{ filter: 'blur(5px)', opacity: 0.3 }}
      />
      <text
        x={size/2} y={size/2}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Geist Mono', ui-monospace, monospace"
        fontSize="14"
        fontWeight="700"
        fill="oklch(0.88 0.005 220)"
      >
        {mainPct}%
      </text>
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const { assignments, timeEntries, workBlocks } = useStore()
  const schedule = useScheduler()

  const completions  = useMemo(() => stats.dailyCompletions(assignments),                            [assignments])
  const rate         = useMemo(() => stats.completionRate(assignments),                               [assignments])
  const streakData   = useMemo(() => stats.streaks(assignments),                                      [assignments])
  const weekday      = useMemo(() => stats.weekdayActivity(timeEntries),                              [timeEntries])
  const gaugeData    = useMemo(() => stats.workloadGauge(schedule.days, workBlocks),                  [schedule.days, workBlocks])
  const heatmap      = useMemo(() => stats.bestHourHeatmap(timeEntries),                              [timeEntries])
  const momentum     = useMemo(() => stats.momentumScore(assignments, timeEntries),                   [assignments, timeEntries])

  const onTimePct  = rate.total > 0 ? Math.round(rate.onTimeRate * 100) : 0
  const lateCnt    = rate.completed - rate.onTimeCount
  const remaining  = rate.total - rate.completed

  // Heatmap grid: hours 8-17, days Mon-Sun
  const HOURS    = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
  const DAYS_ABB = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const heatmapMax = Math.max(...heatmap.map((c) => c.minutes), 1)

  // Weekday chart data (Mon=1..Sun=0 in dayIndex; remap to M..S)
  const weekdayChartData = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
    const dayIndex = i === 6 ? 0 : i + 1  // Mon=1, Sun=0
    const found = weekday.find((w) => w.dayIndex === dayIndex)
    return { day: d, minutes: found?.minutes ?? 0 }
  })

  // Completion chart labels
  const chartStart = completions[0]?.date
    ? new Date(completions[0].date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })
    : ''
  const chartEnd = completions[completions.length - 1]?.date
    ? new Date(completions[completions.length - 1].date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })
    : ''

  const donutSegments = [
    { value: rate.onTimeCount, color: C.green,  label: 'on time' },
    { value: lateCnt,          color: C.amber,  label: 'late' },
    { value: remaining,        color: C.muted,  label: 'remaining' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 page-enter">
      <PgHeader
        title="stats"
        sub="productivity at a glance"
        stats={[
          { v: `${streakData.currentStreak}d`, l: 'streak' },
          { v: `${onTimePct}%`,                l: 'on-time' },
        ]}
      />

      {/* Top stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Streak"
          value={`${streakData.currentStreak}d`}
          sub={`Best: ${streakData.longestStreak}d`}
          color={C.cyan}
        />
        <StatCard
          label="Completion"
          value={`${onTimePct}%`}
          sub={`${rate.onTimeCount}/${rate.total} on time`}
          color={C.green}
        />
        <StatCard
          label="Momentum"
          value={momentum}
          sub="0–100 composite"
          color={C.purple}
        />
        <StatCard
          label="Workload"
          value={`${Math.round(gaugeData.utilizationRatio * 100)}%`}
          sub={`${gaugeData.scheduledMinutes}m / ${gaugeData.availableMinutes}m`}
          color={C.amber}
        />
      </div>

      {/* Charts 2-col grid */}
      <div className="grid grid-cols-2 gap-4">

        {/* 1. Daily Completions */}
        <ChartCard title="Daily Completions (14 days)">
          <BarChart
            data={completions}
            color={C.cyan}
            labelKey="date"
            valueKey="count"
            height={80}
          />
          <div className="flex justify-between mt-1.5">
            <span className="font-mono text-[9px] text-muted-foreground/40">{chartStart}</span>
            <span className="font-mono text-[9px] text-muted-foreground/40">{chartEnd}</span>
          </div>
        </ChartCard>

        {/* 2. Busiest Weekday */}
        <ChartCard title="Busiest Weekday">
          <BarChart
            data={weekdayChartData}
            color={C.purple}
            labelKey="day"
            valueKey="minutes"
            unit="m"
            height={80}
          />
          <div className="flex mt-1.5">
            {weekdayChartData.map((d, i) => (
              <div key={i} className="flex-1 text-center font-mono text-[9px] text-muted-foreground/40">
                {d.day}
              </div>
            ))}
          </div>
        </ChartCard>

        {/* 3. Completion Rate donut */}
        <ChartCard title="Completion Rate">
          <div className="flex items-center gap-6">
            <Donut segments={donutSegments} size={108} thickness={14} />
            <div className="flex flex-col gap-2.5 text-sm">
              {[
                { color: C.green, label: 'on time', value: rate.onTimeCount },
                { color: C.amber, label: 'late',    value: lateCnt },
                { color: C.muted, label: 'remaining',value: remaining },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                  <span className="text-muted-foreground text-xs">
                    {r.label}:{' '}
                    <span className="font-mono font-bold text-foreground">{r.value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* 4. Best-Hour Heatmap */}
        <ChartCard title="Best-Hour Heatmap">
          <div>
            {/* Day headers */}
            <div className="flex mb-1.5 ml-8 gap-0.5">
              {DAYS_ABB.map((d, i) => (
                <div key={i} className="flex-1 text-center font-mono text-[8px] text-muted-foreground/40">{d}</div>
              ))}
            </div>
            {/* Hour rows */}
            {HOURS.map((hour) => (
              <div key={hour} className="flex items-center gap-0.5 mb-0.5">
                <span className="font-mono text-[8px] text-muted-foreground/40 w-7 shrink-0 text-right pr-1">
                  {hour % 12 || 12}{hour < 12 ? 'a' : 'p'}
                </span>
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  // heatmap uses 0=Sun..6=Sat; our display is Mon-Sun
                  const heatDayIdx = dayIdx === 6 ? 0 : dayIdx + 1
                  const cell = heatmap.find((c) => c.dayIndex === heatDayIdx && c.hour === hour)
                  const intensity = cell ? cell.minutes / heatmapMax : 0
                  const opacity = intensity === 0 ? 0 : 10 + Math.round(intensity * 65)
                  return (
                    <div
                      key={dayIdx}
                      className="flex-1 h-3 rounded-sm"
                      title={cell ? `${cell.minutes}m` : '0m'}
                      style={{
                        background: intensity === 0
                          ? C.muted
                          : `oklch(0.82 0.12 207 / ${opacity}%)`,
                        boxShadow: intensity > 0.8 ? `0 0 5px oklch(0.82 0.12 207/50%)` : 'none',
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </ChartCard>

      </div>
    </div>
  )
}
