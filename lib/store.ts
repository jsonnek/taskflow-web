import type {
  Assignment,
  WorkBlock,
  Project,
  TaskGroup,
  TimeEntry,
  Template,
  PredictionFactor,
} from '@/types'

const KEYS = {
  assignments: 'taskflow:assignments',
  projects: 'taskflow:projects',
  task_groups: 'taskflow:task_groups',
  work_blocks: 'taskflow:work_blocks',
  time_entries: 'taskflow:time_entries',
  templates: 'taskflow:templates',
  prediction_factors: 'taskflow:prediction_factors',
} as const

function isClient() {
  return typeof window !== 'undefined'
}

function getAll<T>(key: string): T[] {
  if (!isClient()) return []
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function saveAll<T>(key: string, items: T[]): void {
  if (!isClient()) return
  localStorage.setItem(key, JSON.stringify(items))
}

function upsert<T extends { id: string }>(key: string, item: T): void {
  const items = getAll<T>(key)
  const idx = items.findIndex((i) => i.id === item.id)
  if (idx >= 0) items[idx] = item
  else items.push(item)
  saveAll(key, items)
}

function remove(key: string, id: string): void {
  const items = getAll<{ id: string }>(key).filter((i) => i.id !== id)
  saveAll(key, items)
}

// Assignments
export const assignmentStore = {
  getAll: () => getAll<Assignment>(KEYS.assignments),
  upsert: (a: Assignment) => upsert(KEYS.assignments, a),
  remove: (id: string) => remove(KEYS.assignments, id),
  saveAll: (items: Assignment[]) => saveAll(KEYS.assignments, items),
}

// Projects
export const projectStore = {
  getAll: () => getAll<Project>(KEYS.projects),
  upsert: (p: Project) => upsert(KEYS.projects, p),
  remove: (id: string) => remove(KEYS.projects, id),
}

// Task Groups
export const groupStore = {
  getAll: () => getAll<TaskGroup>(KEYS.task_groups),
  upsert: (g: TaskGroup) => upsert(KEYS.task_groups, g),
  remove: (id: string) => remove(KEYS.task_groups, id),
}

// Work Blocks
export const workBlockStore = {
  getAll: () => getAll<WorkBlock>(KEYS.work_blocks),
  upsert: (b: WorkBlock) => upsert(KEYS.work_blocks, b),
  remove: (id: string) => remove(KEYS.work_blocks, id),
}

// Time Entries
export const timeEntryStore = {
  getAll: () => getAll<TimeEntry>(KEYS.time_entries),
  upsert: (e: TimeEntry) => upsert(KEYS.time_entries, e),
  remove: (id: string) => remove(KEYS.time_entries, id),
}

// Templates
export const templateStore = {
  getAll: () => getAll<Template>(KEYS.templates),
  upsert: (t: Template) => upsert(KEYS.templates, t),
  remove: (id: string) => remove(KEYS.templates, id),
}

// Prediction Factors (keyed by subject)
export const predictionStore = {
  getAll: () => getAll<PredictionFactor>(KEYS.prediction_factors),
  getForSubject: (subject: string): PredictionFactor | undefined =>
    getAll<PredictionFactor>(KEYS.prediction_factors).find(
      (f) => f.subject === subject
    ),
  upsert: (f: PredictionFactor) => {
    const all = getAll<PredictionFactor>(KEYS.prediction_factors)
    const idx = all.findIndex((x) => x.subject === f.subject)
    if (idx >= 0) all[idx] = f
    else all.push(f)
    saveAll(KEYS.prediction_factors, all)
  },
}

// EWMA update on task completion
export function updatePredictionFactor(
  subject: string,
  estimatedMinutes: number,
  actualMinutes: number
) {
  if (estimatedMinutes <= 0 || actualMinutes <= 0) return
  const alpha = 0.3
  const accuracy = actualMinutes / estimatedMinutes
  const existing = predictionStore.getForSubject(subject)
  const oldFactor = existing?.factor ?? 1.0
  const newFactor = alpha * accuracy + (1 - alpha) * oldFactor
  predictionStore.upsert({
    subject,
    factor: newFactor,
    sampleCount: (existing?.sampleCount ?? 0) + 1,
  })
}
