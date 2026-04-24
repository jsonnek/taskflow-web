'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useStore } from '@/hooks/use-store'
import { useScheduler } from '@/hooks/use-scheduler'
import * as stats from '@/lib/stats-aggregator'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold mono-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium mb-4">{title}</p>
      {children}
    </div>
  )
}

export default function StatsPage() {
  const { assignments, timeEntries, groups, workBlocks } = useStore()
  const schedule = useScheduler()

  const completions = useMemo(() => stats.dailyCompletions(assignments), [assignments])
  const rate = useMemo(() => stats.completionRate(assignments), [assignments])
  const streakData = useMemo(() => stats.streaks(assignments), [assignments])
  const timeGroups = useMemo(() => stats.timeByGroup(assignments, timeEntries, groups), [assignments, timeEntries, groups])
  const weekday = useMemo(() => stats.weekdayActivity(timeEntries), [timeEntries])
  const projProgress = useMemo(() => stats.projectProgressSeries(assignments), [assignments])
  const predTrend = useMemo(() => stats.predictionAccuracyTrend(assignments, timeEntries), [assignments, timeEntries])
  const gauge = useMemo(() => stats.workloadGauge(schedule.days, workBlocks), [schedule.days, workBlocks])
  const heatmap = useMemo(() => stats.bestHourHeatmap(timeEntries), [timeEntries])
  const momentum = useMemo(() => stats.momentumScore(assignments, timeEntries), [assignments, timeEntries])

  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const heatmapMax = Math.max(...heatmap.map((c) => c.minutes), 1)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Stats</h1>
        <p className="text-sm text-muted-foreground">Your productivity at a glance</p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Current Streak"
          value={`${streakData.currentStreak}d`}
          sub={`Best: ${streakData.longestStreak}d`}
        />
        <StatCard
          label="Completion Rate"
          value={`${Math.round(rate.onTimeRate * 100)}%`}
          sub={`${rate.completed} / ${rate.total} on time`}
        />
        <StatCard
          label="Momentum Score"
          value={momentum}
          sub="0–100 composite"
        />
        <StatCard
          label="Workload"
          value={`${Math.round(gauge.utilizationRatio * 100)}%`}
          sub={`${gauge.scheduledMinutes}m / ${gauge.availableMinutes}m`}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Daily completions */}
        <ChartCard title="Daily Completions (14 days)">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={completions} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="date"
                tickFormatter={(v) => {
                  const d = new Date(v + 'T00:00:00')
                  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
                }}
                tick={{ fontSize: 10 }}
                interval={2}
              />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString()}
                formatter={(v) => [v, 'Completed']}
              />
              <Bar dataKey="count" fill="#6366F1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2. Completion rate donut */}
        <ChartCard title="Overall Completion Rate">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'On time', value: rate.onTimeCount },
                    { name: 'Late', value: rate.completed - rate.onTimeCount },
                    { name: 'Incomplete', value: rate.total - rate.completed },
                  ]}
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#F97316" />
                  <Cell fill="#e5e7eb" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>On time: {rate.onTimeCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                <span>Late: {rate.completed - rate.onTimeCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-200" />
                <span>Incomplete: {rate.total - rate.completed}</span>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* 3. Time by subject */}
        {timeGroups.length > 0 && (
          <ChartCard title="Time by Subject (est. vs logged)">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={timeGroups} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="m" />
                <Tooltip formatter={(v, name) => [`${v}m`, name === 'estimatedMinutes' ? 'Estimated' : 'Logged']} />
                <Bar dataKey="estimatedMinutes" fill="#c7d2fe" name="estimatedMinutes" radius={[3, 3, 0, 0]} />
                <Bar dataKey="loggedMinutes" fill="#6366F1" name="loggedMinutes" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* 4. Busiest weekday */}
        <ChartCard title="Busiest Weekday">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weekday} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="m" />
              <Tooltip formatter={(v) => [`${v}m`, 'Logged']} />
              <Bar dataKey="minutes" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5. Project progress */}
        {projProgress.length > 0 && (
          <ChartCard title="Project Progress">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
                <XAxis
                  dataKey="date"
                  allowDuplicatedCategory={false}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => {
                    const d = new Date(v + 'T00:00:00')
                    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
                  }}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                {projProgress.map((proj, i) => (
                  <Line
                    key={proj.projectId}
                    data={proj.data}
                    dataKey="count"
                    name={proj.projectName}
                    stroke={['#6366F1', '#10B981', '#F97316', '#EC4899'][i % 4]}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* 6. Prediction accuracy trend */}
        {predTrend.length > 0 && (
          <ChartCard title="Prediction Accuracy Trend">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={predTrend} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => {
                    const d = new Date(v + 'T00:00:00')
                    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
                  }}
                />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip formatter={(v) => [`${(Number(v) * 100).toFixed(0)}%`, 'Accuracy']} />
                <Line dataKey="accuracy" stroke="#10B981" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* 7. Workload gauge */}
        <ChartCard title="Workload Gauge">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={140} height={140}>
              <RadialBarChart
                innerRadius={50}
                outerRadius={70}
                startAngle={90}
                endAngle={-270}
                data={[{ value: gauge.utilizationRatio * 100, fill: gauge.utilizationRatio > 0.9 ? '#EF4444' : gauge.utilizationRatio > 0.7 ? '#F97316' : '#10B981' }]}
              >
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f3f4f6' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-sm">
              <p className="text-2xl font-bold mono-nums">
                {Math.round(gauge.utilizationRatio * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {gauge.scheduledMinutes}m scheduled
              </p>
              <p className="text-xs text-muted-foreground">
                {gauge.availableMinutes}m available
              </p>
            </div>
          </div>
        </ChartCard>

        {/* 8. Best-hour heatmap */}
        <ChartCard title="Best-Hour Heatmap">
          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              {/* Day labels */}
              <div className="flex mb-1 ml-8">
                {DAYS_SHORT.map((d) => (
                  <div key={d} className="flex-1 text-center text-[9px] text-muted-foreground">
                    {d}
                  </div>
                ))}
              </div>
              {/* Hours */}
              {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((hour) => (
                <div key={hour} className="flex items-center mb-0.5">
                  <span className="text-[9px] text-muted-foreground mono-nums w-7 shrink-0 text-right pr-1">
                    {hour % 12 || 12}{hour < 12 ? 'a' : 'p'}
                  </span>
                  {DAYS_SHORT.map((_, dayIdx) => {
                    const cell = heatmap.find((c) => c.dayIndex === dayIdx && c.hour === hour)
                    const intensity = cell ? cell.minutes / heatmapMax : 0
                    return (
                      <div
                        key={dayIdx}
                        title={cell ? `${cell.minutes}m` : '0m'}
                        className="flex-1 mx-0.5 h-4 rounded-sm transition-colors"
                        style={{
                          backgroundColor:
                            intensity === 0
                              ? 'var(--muted)'
                              : `rgba(99,102,241,${0.15 + intensity * 0.85})`,
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
