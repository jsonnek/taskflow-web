import type {
  Assignment,
  TimeEntry,
  TaskGroup,
  DayPlan,
  WorkBlock,
  DailyCompletionPoint,
  CompletionRateResult,
  StreakResult,
  GroupTimePoint,
  TimeAccuracyResult,
  WeekdayActivityPoint,
  ProjectProgressPoint,
  HeatmapCell,
} from '@/types'

function dateOnly(iso: string): string {
  return iso.split('T')[0]
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

// 1. Daily completions (14-day rolling window)
export function dailyCompletions(
  assignments: Assignment[],
  days = 14
): DailyCompletionPoint[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result: DailyCompletionPoint[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i)
    const dateStr = d.toISOString().split('T')[0]
    const count = assignments.filter(
      (a) => a.isCompleted && a.completedAt && dateOnly(a.completedAt) === dateStr
    ).length
    result.push({ date: dateStr, count })
  }
  return result
}

// 2. Completion rate
export function completionRate(assignments: Assignment[]): CompletionRateResult {
  const roots = assignments.filter((a) => !a.recurrenceParentId)
  const total = roots.length
  const completed = roots.filter((a) => a.isCompleted).length
  const onTimeCount = roots.filter(
    (a) =>
      a.isCompleted &&
      a.completedAt &&
      new Date(a.completedAt) <= new Date(a.dueDate)
  ).length
  return {
    completed,
    total,
    onTimeCount,
    onTimeRate: completed > 0 ? onTimeCount / completed : 0,
  }
}

// 3. Streaks (consecutive days with ≥1 completion)
export function streaks(assignments: Assignment[]): StreakResult {
  const completedDates = new Set(
    assignments
      .filter((a) => a.isCompleted && a.completedAt)
      .map((a) => dateOnly(a.completedAt!))
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Current streak
  let currentStreak = 0
  let cursor = new Date(today)
  while (completedDates.has(cursor.toISOString().split('T')[0])) {
    currentStreak++
    cursor = addDays(cursor, -1)
  }

  // Longest streak
  if (completedDates.size === 0) return { currentStreak, longestStreak: 0 }
  const sorted = Array.from(completedDates).sort()
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      run++
      longest = Math.max(longest, run)
    } else {
      run = 1
    }
  }

  return { currentStreak, longestStreak: longest }
}

// 4. Time by group/subject
export function timeByGroup(
  assignments: Assignment[],
  timeEntries: TimeEntry[],
  groups: TaskGroup[]
): GroupTimePoint[] {
  const map = new Map<string, { estimated: number; logged: number }>()

  for (const a of assignments) {
    if (!a.subject) continue
    const existing = map.get(a.subject) ?? { estimated: 0, logged: 0 }
    existing.estimated += a.estimatedMinutes

    const logged = timeEntries
      .filter((e) => e.assignmentId === a.id && e.endedAt)
      .reduce((sum, e) => {
        const mins =
          (new Date(e.endedAt!).getTime() - new Date(e.startedAt).getTime()) /
          60000
        return sum + mins
      }, 0)
    existing.logged += logged
    map.set(a.subject, existing)
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.logged > 0 || v.estimated > 0)
    .map(([subject, v]) => {
      const group = groups.find((g) => g.name === subject)
      return {
        subject,
        estimatedMinutes: Math.round(v.estimated),
        loggedMinutes: Math.round(v.logged),
        colorHex: group?.colorHex ?? '#6366F1',
      }
    })
    .sort((a, b) => a.subject.localeCompare(b.subject))
}

// 5. Overall time accuracy
export function overallTimeAccuracy(
  assignments: Assignment[],
  timeEntries: TimeEntry[]
): TimeAccuracyResult {
  let totalEstimated = 0
  let totalLogged = 0

  for (const a of assignments) {
    const entries = timeEntries.filter((e) => e.assignmentId === a.id && e.endedAt)
    if (entries.length === 0) continue
    const logged = entries.reduce((sum, e) => {
      return (
        sum +
        (new Date(e.endedAt!).getTime() - new Date(e.startedAt).getTime()) /
          60000
      )
    }, 0)
    totalEstimated += a.estimatedMinutes
    totalLogged += logged
  }

  return {
    ratio: totalLogged > 0 ? totalEstimated / totalLogged : 1,
    totalEstimated: Math.round(totalEstimated),
    totalLogged: Math.round(totalLogged),
  }
}

// 6. Weekday activity
export function weekdayActivity(timeEntries: TimeEntry[]): WeekdayActivityPoint[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const totals = new Array(7).fill(0)

  for (const e of timeEntries) {
    if (!e.endedAt) continue
    const dayIdx = new Date(e.startedAt).getDay()
    const mins =
      (new Date(e.endedAt).getTime() - new Date(e.startedAt).getTime()) / 60000
    totals[dayIdx] += mins
  }

  return days.map((day, i) => ({
    day,
    dayIndex: i,
    minutes: Math.round(totals[i]),
  }))
}

// 7. Project progress series
export function projectProgressSeries(
  assignments: Assignment[]
): ProjectProgressPoint[] {
  const projectMap = new Map<string, Assignment[]>()

  for (const a of assignments) {
    if (!a.projectId || !a.isCompleted || !a.completedAt) continue
    const arr = projectMap.get(a.projectId) ?? []
    arr.push(a)
    projectMap.set(a.projectId, arr)
  }

  const result: ProjectProgressPoint[] = []

  for (const [projectId, tasks] of projectMap.entries()) {
    const sortedDates = Array.from(
      new Set(tasks.map((t) => dateOnly(t.completedAt!)))
    ).sort()
    if (sortedDates.length < 3) continue

    let cumulative = 0
    const data = sortedDates.map((date) => {
      cumulative += tasks.filter((t) => dateOnly(t.completedAt!) === date).length
      return { date, count: cumulative }
    })

    result.push({
      projectId,
      projectName: projectId, // caller should resolve to name
      data,
    })
  }

  return result
}

// 8. Prediction accuracy trend (14-day rolling)
export function predictionAccuracyTrend(
  assignments: Assignment[],
  timeEntries: TimeEntry[],
  days = 14
): { date: string; accuracy: number }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result: { date: string; accuracy: number }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i)
    const dateStr = d.toISOString().split('T')[0]
    const completed = assignments.filter(
      (a) => a.isCompleted && a.completedAt && dateOnly(a.completedAt) === dateStr
    )
    const accuracies = completed
      .map((a) => {
        const entries = timeEntries.filter((e) => e.assignmentId === a.id && e.endedAt)
        if (entries.length === 0) return null
        const logged = entries.reduce(
          (s, e) =>
            s +
            (new Date(e.endedAt!).getTime() - new Date(e.startedAt).getTime()) /
              60000,
          0
        )
        return logged > 0 ? a.estimatedMinutes / logged : null
      })
      .filter((v): v is number => v !== null)

    if (accuracies.length > 0) {
      result.push({
        date: dateStr,
        accuracy: accuracies.reduce((s, v) => s + v, 0) / accuracies.length,
      })
    }
  }
  return result
}

// 9. Workload gauge
export function workloadGauge(
  dayPlans: DayPlan[],
  workBlocks: WorkBlock[]
): { scheduledMinutes: number; availableMinutes: number; utilizationRatio: number } {
  const scheduled = dayPlans.reduce(
    (s, d) => s + d.sessions.reduce((ss, sess) => ss + sess.duration, 0),
    0
  )
  // Available over same window
  const days = dayPlans.length
  const avgDailyAvailable =
    workBlocks.reduce(
      (s, b) =>
        s + (b.endHour * 60 + b.endMinute - (b.startHour * 60 + b.startMinute)),
      0
    ) / 7 // per day average

  const available = avgDailyAvailable * days

  return {
    scheduledMinutes: scheduled,
    availableMinutes: Math.round(available),
    utilizationRatio: available > 0 ? Math.min(scheduled / available, 1) : 0,
  }
}

// 10. Best-hour heatmap (7×24 grid)
export function bestHourHeatmap(timeEntries: TimeEntry[]): HeatmapCell[] {
  const grid = new Map<string, number>()

  for (const e of timeEntries) {
    if (!e.endedAt) continue
    const start = new Date(e.startedAt)
    const end = new Date(e.endedAt)
    const dayIdx = start.getDay()
    const hour = start.getHours()
    const mins = (end.getTime() - start.getTime()) / 60000
    const key = `${dayIdx}-${hour}`
    grid.set(key, (grid.get(key) ?? 0) + mins)
  }

  const cells: HeatmapCell[] = []
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      cells.push({
        dayIndex: d,
        hour: h,
        minutes: Math.round(grid.get(`${d}-${h}`) ?? 0),
      })
    }
  }
  return cells
}

// 11. Momentum score (0-100)
export function momentumScore(
  assignments: Assignment[],
  timeEntries: TimeEntry[]
): number {
  const { currentStreak } = streaks(assignments)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentCompletions = assignments.filter(
    (a) => a.isCompleted && a.completedAt && new Date(a.completedAt) >= sevenDaysAgo
  ).length

  const recentLogged = timeEntries
    .filter((e) => e.endedAt && new Date(e.startedAt) >= sevenDaysAgo)
    .reduce(
      (s, e) =>
        s +
        (new Date(e.endedAt!).getTime() - new Date(e.startedAt).getTime()) /
          60000,
      0
    )

  const targetWeeklyMinutes = 7 * 60 // 7 hours/week baseline
  const timeRatio = Math.min(recentLogged / targetWeeklyMinutes, 1)

  const raw =
    Math.min(currentStreak, 7) * 10 +
    Math.log(recentCompletions + 1) * 20 +
    timeRatio * 30

  return Math.min(100, Math.round(raw))
}
