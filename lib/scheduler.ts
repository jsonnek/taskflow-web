import type {
  Assignment,
  WorkBlock,
  Project,
  ScheduledSession,
  WorkBlockPlan,
  DayPlan,
  ScheduleResult,
} from '@/types'
import { nanoid } from 'nanoid'

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

function dateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

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
  remainingMinutes: number
  availableFrom: Date // distantFuture if blocked
  effectiveDue: Date
}

const DISTANT_FUTURE = new Date('2099-01-01')

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
  daysAhead = 28,
  now = new Date()
): ScheduleResult {
  const incomplete = assignments.filter((a) => !a.isCompleted)

  // Midnight of today — unblocked tasks are available from start of day, not current time
  const todayMidnight = new Date(now)
  todayMidnight.setHours(0, 0, 0, 0)

  // Build queue sorted by priority (highest first)
  const queue: QItem[] = incomplete
    .sort((a, b) => priorityScore(b, projects, now) - priorityScore(a, projects, now))
    .map((a) => ({
      assignment: a,
      remainingMinutes: Math.max(1, a.estimatedMinutes),
      availableFrom: isBlocked(a, assignments) ? DISTANT_FUTURE : todayMidnight,
      effectiveDue: effectiveDueDate(a, projects),
    }))

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

    // Blocks for this weekday, deduplicated by start time
    const blocksToday = workBlocks
      .filter((b) => b.dayOfWeek === weekday)
      .sort((a, b) => blockStartMinutes(a) - blockStartMinutes(b))
      .filter((b, idx, arr) => {
        if (idx === 0) return true
        return blockStartMinutes(b) !== blockStartMinutes(arr[idx - 1])
      })

    if (blocksToday.length === 0) continue

    const blockPlans: WorkBlockPlan[] = blocksToday.map((b) => ({
      block: b,
      sessions: [],
      usedMinutes: 0,
      freeMinutes: blockDuration(b),
      fillRatio: 0,
    }))

    const warnings: string[] = []

    for (const bp of blockPlans) {
      const capacity = blockDuration(bp.block)
      if (capacity <= 0) continue

      for (const item of queue) {
        if (item.remainingMinutes <= 0) continue
        if (item.availableFrom > day) continue

        // Skip only if due date is strictly in the future AND this day is past it
        // Overdue tasks (effectiveDue < today) should still be scheduled ASAP

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
          // Unlock dependents
          for (const dep of queue) {
            if (
              dep.availableFrom === DISTANT_FUTURE &&
              dep.assignment.prerequisiteIds.every((pid) => scheduledIds.has(pid))
            ) {
              dep.availableFrom = day
            }
          }
        }

        if (!fits && item.assignment.isSplittable) {
          // Warn if due today and still has remaining
          if (dateString(item.effectiveDue) === dayStr && item.remainingMinutes > 0) {
            warnings.push(`"${item.assignment.title}" may not finish by due date`)
          }
        }
      }

      bp.freeMinutes = capacity - bp.usedMinutes
      bp.fillRatio = capacity > 0 ? bp.usedMinutes / capacity : 0
    }

    const sessions = blockPlans.flatMap((bp) => bp.sessions)

    // Over-scheduled warning
    const totalUsed = blockPlans.reduce((s, bp) => s + bp.usedMinutes, 0)
    const totalCapacity = blockPlans.reduce((s, bp) => s + blockDuration(bp.block), 0)
    if (totalUsed > totalCapacity) {
      warnings.push('Over-scheduled: more work than available time')
    }

    if (sessions.length > 0) {
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
