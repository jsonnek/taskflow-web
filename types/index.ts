export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'specificDays' | 'monthly'
  daysOfWeek: number[] // 1=Sun…7=Sat
  interval: number
  endDate?: string // ISO string
}

export interface Assignment {
  id: string
  title: string
  subject: string
  dueDate: string // ISO string
  estimatedMinutes: number
  difficulty: number // 1-5
  importance: number // 1-5
  isCompleted: boolean
  completedAt?: string // ISO string
  isPriority: boolean
  isSplittable: boolean
  manualOrder?: number
  recurrenceRuleData?: RecurrenceRule
  recurrenceParentId?: string
  projectId?: string
  groupId?: string
  projectOrder?: number
  prerequisiteIds: string[]
  createdAt: string // ISO string
}

export interface WorkBlock {
  id: string
  dayOfWeek: number // 1=Sun…7=Sat
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  name: string
}

export interface Project {
  id: string
  name: string
  notes?: string
  dueDate?: string // ISO string
  groupId?: string
  createdAt: string
}

export interface TaskGroup {
  id: string
  name: string
  colorHex: string
  createdAt: string
}

export interface TimeEntry {
  id: string
  assignmentId: string
  startedAt: string // ISO string
  endedAt?: string // ISO string
}

export interface Template {
  id: string
  name: string
  subject?: string
  estimatedMinutes?: number
  difficulty?: number
  importance?: number
  isSplittable?: boolean
  recurrenceRuleData?: RecurrenceRule
}

// Prediction factor per subject (EWMA correction)
export interface PredictionFactor {
  subject: string
  factor: number // ratio: actual/estimated; 1.0 = perfect
  sampleCount: number
}

// Scheduler types
export interface ScheduledSession {
  id: string
  assignment: Assignment
  date: string // ISO date string YYYY-MM-DD
  blockStart: number // minutes from midnight
  duration: number // minutes
  isPartial: boolean
}

export interface WorkBlockPlan {
  block: WorkBlock
  sessions: ScheduledSession[]
  usedMinutes: number
  freeMinutes: number
  fillRatio: number // 0-1
}

export interface DayPlan {
  date: string // YYYY-MM-DD
  blockPlans: WorkBlockPlan[]
  sessions: ScheduledSession[] // flattened
  warnings: string[]
}

export interface ScheduleResult {
  days: DayPlan[]
  unscheduled: Assignment[]
}

// Stats types
export interface DailyCompletionPoint {
  date: string
  count: number
}

export interface CompletionRateResult {
  completed: number
  total: number
  onTimeCount: number
  onTimeRate: number
}

export interface StreakResult {
  currentStreak: number
  longestStreak: number
}

export interface GroupTimePoint {
  subject: string
  estimatedMinutes: number
  loggedMinutes: number
  colorHex: string
}

export interface TimeAccuracyResult {
  ratio: number
  totalEstimated: number
  totalLogged: number
}

export interface WeekdayActivityPoint {
  day: string
  dayIndex: number
  minutes: number
}

export interface ProjectProgressPoint {
  projectId: string
  projectName: string
  data: { date: string; count: number }[]
}

export interface HeatmapCell {
  dayIndex: number // 0=Sun…6=Sat
  hour: number // 0-23
  minutes: number
}
