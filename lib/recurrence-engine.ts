import type { Assignment, RecurrenceRule } from '@/types'
import { nanoid } from 'nanoid'

export function nextOccurrenceDate(
  fromDate: Date,
  rule: RecurrenceRule
): Date | null {
  let next: Date

  switch (rule.frequency) {
    case 'daily': {
      next = new Date(fromDate)
      next.setDate(next.getDate() + rule.interval)
      break
    }
    case 'weekly': {
      next = new Date(fromDate)
      next.setDate(next.getDate() + rule.interval * 7)
      break
    }
    case 'specificDays': {
      if (rule.daysOfWeek.length === 0) return null
      next = new Date(fromDate)
      let found = false
      for (let i = 1; i <= 14; i++) {
        next.setDate(next.getDate() + 1)
        const weekday = next.getDay() + 1 // 1=Sun…7=Sat
        if (rule.daysOfWeek.includes(weekday)) {
          found = true
          break
        }
      }
      if (!found) return null
      break
    }
    case 'monthly': {
      next = new Date(fromDate)
      const targetMonth = next.getMonth() + rule.interval
      next.setMonth(targetMonth)
      // Snap to end-of-month if needed
      if (next.getMonth() !== ((targetMonth % 12) + 12) % 12) {
        next.setDate(0) // last day of previous month
      }
      break
    }
    default:
      return null
  }

  if (rule.endDate && next > new Date(rule.endDate)) return null
  return next
}

export function generateNextOccurrence(
  source: Assignment
): Assignment | null {
  if (!source.recurrenceRuleData) return null
  const nextDate = nextOccurrenceDate(
    new Date(source.dueDate),
    source.recurrenceRuleData
  )
  if (!nextDate) return null

  return {
    ...source,
    id: nanoid(),
    dueDate: nextDate.toISOString(),
    isCompleted: false,
    completedAt: undefined,
    createdAt: new Date().toISOString(),
    recurrenceParentId: source.recurrenceParentId ?? source.id,
    prerequisiteIds: [],
  }
}
