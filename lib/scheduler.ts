import type {
  Assignment,
  WorkBlock,
  Project,
  ScheduledSession,
  WorkBlockPlan,
  DayPlan,
  ScheduleResult,
  PredictionFactor,
} from '@/types'
import { nanoid } from 'nanoid'
import { localDateString } from '@/lib/utils'

function blockDuration(b: WorkBlock): number {
  return (b.endHour * 60 + b.endMinute) - (b.startHour * 60 + b.startMinute)
}

function blockStartMinutes(b: WorkBlock): number {
  return b.startHour * 60 + b.startMinute
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function effectiveDueDate(
  assignment: Assignment,
  projects: Project[]
): Date {
  const taskDue = new Date(assignment.dueDate)
  if (!assignment.projectId) return taskDue
  const project = projects.find((p) => p.id === assignment.projectId)
  if (!project?.dueDate) return taskDue
  const projDue = new Date(project.dueDate)
  return projDue < taskDue ? projDue : taskDue
}

export function priorityScore(
  assignment: Assignment,
  projects: Project[],
  now: Date
): number {
  const due = effectiveDueDate(assignment, projects)
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
  const urgencyRatio = clamp(1 - hoursUntilDue / 168, 0, 1)
  return (
    assignment.importance * 0.35 +
    assignment.difficulty * 0.25 +
    urgencyRatio * 5.0 * 0.4
  )
}

const dateString = localDateString

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

// dayOfWeek: 1=Sun...7=Sat (matching WorkBlock convention)
function weekdayNumber(d: Date): number {
  return d.getDay() + 1
}

interface QItem {
  assignment: Assignment
  plannedMinutes: number // estimate after prediction-factor adjustment
  remainingMinutes: number
  blocked: boolean // has incomplete, unscheduled prerequisites
  availableFrom: Date // earliest day this item may be scheduled (once unblocked)
  effectiveDue: Date
  // Last day (local YYYY-MM-DD) this item may be scheduled. Tasks already
  // overdue when the plan is generated are clamped to today so they still
  // get scheduled ASAP instead of being dropped.
  dueDay: string
}

export function isBlocked(assignment: Assignment, allAssignments: Assignment[]): boolean {
  return assignment.prerequisiteIds.some((pid) => {
    const prereq = allAssignments.find((a) => a.id === pid)
    return prereq ? !prereq.isCompleted : false
  })
}

export function generatePlan(
  assignments: Assignment[],
  workBlocks: WorkBlock[],
  projects: Project[],
  predictionFactors: PredictionFactor[] = [],
  daysAhead = 28,
  now = new Date()
): ScheduleResult {
  const incomplete = assignments.filter((a) => !a.isCompleted)

  // Correct estimates by the per-subject EWMA accuracy factor once there's
  // enough history to trust it. Clamped so one wild outlier can't blow up
  // (or starve) the schedule.
  const factorBySubject = new Map(
    predictionFactors
      .filter((f) => f.sampleCount >= 2)
      .map((f) => [f.subject, clamp(f.factor, 0.5, 2)])
  )
  const adjustedMinutes = (a: Assignment): number => {
    const factor = factorBySubject.get(a.subject) ?? 1
    return Math.max(1, Math.round(a.estimatedMinutes * factor))
  }

  // Midnight of today — unblocked tasks are available from start of day, not current time
  const todayMidnight = new Date(now)
  todayMidnight.setHours(0, 0, 0, 0)

  const assignmentById = new Map(assignments.map((a) => [a.id, a]))
  const isBlockedById = (a: Assignment): boolean =>
    a.prerequisiteIds.some((pid) => {
      const prereq = assignmentById.get(pid)
      return prereq ? !prereq.isCompleted : false
    })

  // Build queue sorted by priority (highest first)
  const queue: QItem[] = incomplete
    .sort((a, b) => priorityScore(b, projects, now) - priorityScore(a, projects, now))
    .map((a) => {
      const effectiveDue = effectiveDueDate(a, projects)
      const dueDay = effectiveDue < todayMidnight
        ? dateString(todayMidnight)
        : dateString(effectiveDue)
      const planned = adjustedMinutes(a)
      return {
        assignment: a,
        plannedMinutes: planned,
        remainingMinutes: planned,
        blocked: isBlockedById(a),
        availableFrom: todayMidnight,
        effectiveDue,
        dueDay,
      }
    })

  // Track which sessions have been scheduled (for unlocking deps)
  const scheduledIds = new Set<string>(
    assignments.filter((a) => a.isCompleted).map((a) => a.id)
  )

  const dayPlans: DayPlan[] = []
  const unscheduled: Assignment[] = []

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const day = addDays(now, dayOffset)
    day.setHours(0, 0, 0, 0)
    const dayStr = dateString(day)
    const weekday = weekdayNumber(day)

    const warnings: string[] = []

    // Expire items whose due day has passed with work still remaining —
    // they can no longer be scheduled and surface as unscheduled/at-risk.
    for (let i = queue.length - 1; i >= 0; i--) {
      const item = queue[i]
      if (item.dueDay < dayStr && item.remainingMinutes > 0) {
        const started = item.remainingMinutes < item.plannedMinutes
        warnings.push(
          started
            ? `"${item.assignment.title}" could not be finished before its due date`
            : `"${item.assignment.title}" could not be scheduled before its due date`
        )
        unscheduled.push(item.assignment)
        queue.splice(i, 1)
      }
    }

    // Blocks for this weekday, deduplicated by start time
    const blocksToday = workBlocks
      .filter((b) => b.dayOfWeek === weekday)
      .sort((a, b) => blockStartMinutes(a) - blockStartMinutes(b))
      .filter((b, idx, arr) => {
        if (idx === 0) return true
        return blockStartMinutes(b) !== blockStartMinutes(arr[idx - 1])
      })

    if (blocksToday.length === 0) {
      if (warnings.length > 0) {
        dayPlans.push({ date: dayStr, blockPlans: [], sessions: [], warnings })
      }
      continue
    }

    const blockPlans: WorkBlockPlan[] = blocksToday.map((b) => ({
      block: b,
      sessions: [],
      usedMinutes: 0,
      freeMinutes: blockDuration(b),
      fillRatio: 0,
    }))

    for (const bp of blockPlans) {
      const capacity = blockDuration(bp.block)
      if (capacity <= 0) continue

      for (const item of queue) {
        if (item.remainingMinutes <= 0) continue
        if (item.blocked || item.availableFrom > day) continue

        const freeSpace = capacity - bp.usedMinutes
        if (freeSpace <= 0) break

        const fits = item.remainingMinutes <= freeSpace
        const canPlace = fits || item.assignment.isSplittable

        if (!canPlace) continue

        const duration = fits ? item.remainingMinutes : freeSpace
        const session: ScheduledSession = {
          id: nanoid(),
          assignment: item.assignment,
          date: dayStr,
          blockStart: blockStartMinutes(bp.block) + bp.usedMinutes,
          duration,
          isPartial: !fits,
        }

        bp.sessions.push(session)
        bp.usedMinutes += duration
        item.remainingMinutes -= duration

        if (item.remainingMinutes <= 0) {
          scheduledIds.add(item.assignment.id)
          // Unlock dependents whose prerequisites are now all completed or
          // fully scheduled. Prerequisite ids that no longer resolve to an
          // assignment (deleted tasks) are ignored.
          for (const dep of queue) {
            if (
              dep.blocked &&
              dep.assignment.prerequisiteIds.every(
                (pid) => scheduledIds.has(pid) || !assignmentById.has(pid)
              )
            ) {
              dep.blocked = false
              dep.availableFrom = day
            }
          }
        }

      }

      bp.freeMinutes = capacity - bp.usedMinutes
      bp.fillRatio = capacity > 0 ? bp.usedMinutes / capacity : 0
    }

    const sessions = blockPlans.flatMap((bp) => bp.sessions)

    // Anything due today that still has remaining work won't make its deadline
    // — warn even if it never received a session (it will expire tomorrow).
    for (const item of queue) {
      if (item.dueDay === dayStr && item.remainingMinutes > 0) {
        warnings.push(`"${item.assignment.title}" may not finish by its due date`)
      }
    }

    if (sessions.length > 0 || warnings.length > 0) {
      dayPlans.push({ date: dayStr, blockPlans, sessions, warnings })
    }
  }

  // Items never fully scheduled
  for (const item of queue) {
    if (item.remainingMinutes > 0 && !scheduledIds.has(item.assignment.id)) {
      unscheduled.push(item.assignment)
    }
  }

  return { days: dayPlans, unscheduled }
}

export function isAtRisk(assignment: Assignment, unscheduled: Assignment[], now = new Date()): boolean {
  const due = new Date(assignment.dueDate)
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
  return (
    unscheduled.some((u) => u.id === assignment.id) && hoursUntilDue < 72
  )
}
