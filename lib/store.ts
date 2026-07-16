import type {
  Assignment,
  WorkBlock,
  Project,
  TaskGroup,
  TimeEntry,
  Template,
  PredictionFactor,
  Syncable,
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

export type CollectionName = keyof typeof KEYS
export const COLLECTIONS = Object.keys(KEYS) as CollectionName[]

const PENDING_KEY = 'taskflow:sync-pending'

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

// ---------------------------------------------------------------------------
// Pending-change queue — every local write/delete is recorded here until the
// sync engine pushes it. Keyed `${collection}:${id}` so repeated edits to one
// record collapse into a single pending entry.
// ---------------------------------------------------------------------------

export interface PendingChange {
  collection: CollectionName
  id: string
  deleted: boolean
  updatedAt: string // ISO — for deletes this is the tombstone timestamp
}

type PendingMap = Record<string, PendingChange>

function readPending(): PendingMap {
  if (!isClient()) return {}
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as PendingMap) : {}
  } catch {
    return {}
  }
}

function writePending(map: PendingMap): void {
  if (!isClient()) return
  localStorage.setItem(PENDING_KEY, JSON.stringify(map))
}

// Every local write/delete funnels through markPending, so it doubles as the
// mutation event the sync engine listens to.
const mutationListeners = new Set<() => void>()

export function onLocalMutation(cb: () => void): () => void {
  mutationListeners.add(cb)
  return () => mutationListeners.delete(cb)
}

function markPending(collection: CollectionName, id: string, deleted: boolean, updatedAt: string): void {
  const map = readPending()
  map[`${collection}:${id}`] = { collection, id, deleted, updatedAt }
  writePending(map)
  mutationListeners.forEach((cb) => cb())
}

export const pendingChanges = {
  list: (): PendingChange[] => Object.values(readPending()),
  /** Queue an entry without touching the record (used by sync backfill).
   *  Never overwrites an existing pending entry for the same record. */
  markIfAbsent: (entry: PendingChange): void => {
    const map = readPending()
    const key = `${entry.collection}:${entry.id}`
    if (!map[key]) {
      map[key] = entry
      writePending(map)
    }
  },
  /** Remove entries that were successfully pushed — but only if the record
   *  hasn't been touched again since the push started. */
  clear: (pushed: PendingChange[]): void => {
    const map = readPending()
    for (const p of pushed) {
      const key = `${p.collection}:${p.id}`
      if (map[key] && map[key].updatedAt === p.updatedAt) delete map[key]
    }
    writePending(map)
  },
  count: (): number => Object.keys(readPending()).length,
}

// ---------------------------------------------------------------------------
// Collection stores
// ---------------------------------------------------------------------------

function upsert<T extends { id: string } & Syncable>(collection: CollectionName, item: T): void {
  const stamped = { ...item, updatedAt: new Date().toISOString() }
  const key = KEYS[collection]
  const items = getAll<T>(key)
  const idx = items.findIndex((i) => i.id === item.id)
  if (idx >= 0) items[idx] = stamped
  else items.push(stamped)
  saveAll(key, items)
  markPending(collection, item.id, false, stamped.updatedAt)
}

function remove(collection: CollectionName, id: string): void {
  const key = KEYS[collection]
  const items = getAll<{ id: string }>(key).filter((i) => i.id !== id)
  saveAll(key, items)
  markPending(collection, id, true, new Date().toISOString())
}

// Applied by the sync engine when a remote record wins LWW — writes the
// record as-is (keeping the remote updatedAt) and does NOT queue a push.
export function applyRemote(
  collection: CollectionName,
  id: string,
  data: ({ id: string } & Syncable) | null // null = remote delete
): void {
  const key = KEYS[collection]
  const items = getAll<{ id: string } & Syncable>(key)
  const idx = items.findIndex((i) => i.id === id)
  if (data === null) {
    if (idx >= 0) {
      items.splice(idx, 1)
      saveAll(key, items)
    }
    return
  }
  if (idx >= 0) items[idx] = data
  else items.push(data)
  saveAll(key, items)
}

export function getCollection<T>(collection: CollectionName): T[] {
  return getAll<T>(KEYS[collection])
}

// Assignments
export const assignmentStore = {
  getAll: () => getAll<Assignment>(KEYS.assignments),
  upsert: (a: Assignment) => upsert('assignments', a),
  remove: (id: string) => remove('assignments', id),
  saveAll: (items: Assignment[]) => saveAll(KEYS.assignments, items),
}

// Projects
export const projectStore = {
  getAll: () => getAll<Project>(KEYS.projects),
  upsert: (p: Project) => upsert('projects', p),
  remove: (id: string) => remove('projects', id),
}

// Task Groups
export const groupStore = {
  getAll: () => getAll<TaskGroup>(KEYS.task_groups),
  upsert: (g: TaskGroup) => upsert('task_groups', g),
  remove: (id: string) => remove('task_groups', id),
}

// Work Blocks
export const workBlockStore = {
  getAll: () => getAll<WorkBlock>(KEYS.work_blocks),
  upsert: (b: WorkBlock) => upsert('work_blocks', b),
  remove: (id: string) => remove('work_blocks', id),
}

// Time Entries
export const timeEntryStore = {
  getAll: () => getAll<TimeEntry>(KEYS.time_entries),
  upsert: (e: TimeEntry) => upsert('time_entries', e),
  remove: (id: string) => remove('time_entries', id),
}

// Templates
export const templateStore = {
  getAll: () => getAll<Template>(KEYS.templates),
  upsert: (t: Template) => upsert('templates', t),
  remove: (id: string) => remove('templates', id),
}

// Prediction Factors (keyed by subject; id mirrors subject for sync)
export const predictionStore = {
  getAll: () => getAll<PredictionFactor>(KEYS.prediction_factors),
  getForSubject: (subject: string): PredictionFactor | undefined =>
    getAll<PredictionFactor>(KEYS.prediction_factors).find(
      (f) => f.subject === subject
    ),
  upsert: (f: PredictionFactor) => {
    const withId = { ...f, id: f.subject }
    const all = getAll<PredictionFactor>(KEYS.prediction_factors)
    const idx = all.findIndex((x) => x.subject === f.subject)
    const stamped = { ...withId, updatedAt: new Date().toISOString() }
    if (idx >= 0) all[idx] = stamped
    else all.push(stamped)
    saveAll(KEYS.prediction_factors, all)
    markPending('prediction_factors', withId.id, false, stamped.updatedAt)
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
