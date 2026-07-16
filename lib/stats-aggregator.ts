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

import { localDateString, localDateOfISO } from '@/lib/utils'

// Local calendar date of a stored ISO timestamp — splitting the raw string
// would give the UTC date, off by one for evening activity outside UTC.
const dateOnly = localDateOfISO

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function entryMinutes(e: TimeEntry): number {
  return (new Date(e.endedAt!).getTime() - new Date(e.startedAt).getTime()) / 60000
}

// Total logged minutes per assignment, one pass over the entries — callers
// were previously re-filtering the full entry list per assignment.
function loggedMinutesByAssignment(timeEntries: TimeEntry[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const e of timeEntries) {
    if (!e.endedAt) continue
    map.set(e.assignmentId, (map.get(e.assignmentId) ?? 0) + entryMinutes(e))
  }
  return map
}

// 1. Daily completions (14-day rolling window)
export function dailyCompletions(
  assignments: Assignment[],
  days = 14
): DailyCompletionPoint[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result: DailyCompletionPoint[] = []

  const countByDate = new Map<string, number>()
  for (const a of assignments) {
    if (!a.isCompleted || !a.completedAt) continue
    const date = dateOnly(a.completedAt)
    countByDate.set(date, (countByDate.get(date) ?? 0) + 1)
  }

  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i)
    const dateStr = localDateString(d)
    result.push({ date: dateStr, count: countByDate.get(dateStr) ?? 0 })
  }
  return result
}

// 2. Completion rate
export function completionRate(assignments: Assignment[]): CompletionRateResult {
  const roots = assignments.filter((a) => !a.recurrenceParentId)
  const total = roots.length
  const completed = roots.filter((a) => a.isCompleted).length
  // On-time = completed on or before the due *day* (due dates are stored as
  // midnight, so a timestamp comparison would count same-day completions late)
  const onTimeCount = roots.filter(
    (a) =>
      a.isCompleted &&
      a.completedAt &&
      dateOnly(a.completedAt) <= dateOnly(a.dueDate)
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
  while (completedDates.has(localDateString(cursor))) {
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
  const loggedByAssignment = loggedMinutesByAssignment(timeEntries)
  const groupByName = new Map(groups.map((g) => [g.name, g]))

  for (const a of assignments) {
    if (!a.subject) continue
    const existing = map.get(a.subject) ?? { estimated: 0, logged: 0 }
    existing.estimated += a.estimatedMinutes
    existing.logged += loggedByAssignment.get(a.id) ?? 0
    map.set(a.subject, existing)
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.logged > 0 || v.estimated > 0)
    .map(([subject, v]) => {
      const group = groupByName.get(subject)
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

  const loggedByAssignment = loggedMinutesByAssignment(timeEntries)
  for (const a of assignments) {
    const logged = loggedByAssignment.get(a.id)
    if (logged === undefined) continue
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

  const loggedByAssignment = loggedMinutesByAssignment(timeEntries)
  const completedByDate = new Map<string, Assignment[]>()
  for (const a of assignments) {
    if (!a.isCompleted || !a.completedAt) continue
    const date = dateOnly(a.completedAt)
    const arr = completedByDate.get(date) ?? []
    arr.push(a)
    completedByDate.set(date, arr)
  }

  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i)
    const dateStr = localDateString(d)
    const completed = completedByDate.get(dateStr) ?? []
    const accuracies = completed
      .map((a) => {
        const logged = loggedByAssignment.get(a.id)
        return logged ? a.estimatedMinutes / logged : null
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
  workBlocks: WorkBlock[],
  daysAhead = 28 // must match the horizon the plan was generated with
): { scheduledMinutes: number; availableMinutes: number; utilizationRatio: number } {
  const scheduled = dayPlans.reduce(
    (s, d) => s + d.sessions.reduce((ss, sess) => ss + sess.duration, 0),
    0
  )

  // Actual block capacity over the plan window, walking real weekdays —
  // dayPlans only contains days that received sessions, so its length (and a
  // 7-day average) would misstate availability.
  const minutesByWeekday = new Array<number>(8).fill(0) // 1=Sun…7=Sat
  for (const b of workBlocks) {
    minutesByWeekday[b.dayOfWeek] +=
      b.endHour * 60 + b.endMinute - (b.startHour * 60 + b.startMinute)
  }
  let available = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (let i = 0; i < daysAhead; i++) {
    available += minutesByWeekday[cursor.getDay() + 1]
    cursor.setDate(cursor.getDate() + 1)
  }

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
