import { getSupabase } from '@/lib/supabase'
import {
  COLLECTIONS,
  type CollectionName,
  type PendingChange,
  pendingChanges,
  getCollection,
  applyRemote,
} from '@/lib/store'
import type { Syncable } from '@/types'

// ---------------------------------------------------------------------------
// Offline-first sync: localStorage is the working store; this module pushes
// the pending-change queue to Supabase and pulls newer remote records, doing
// last-write-wins per record on the `updatedAt` stamp. Deletes travel as
// tombstones (data = null, deleted = true).
//
// Known v1 approximation: pull-then-push means a record edited on another
// device between our pull and push can be overwritten by our older edit.
// With one user on a couple of devices this window is milliseconds wide.
// ---------------------------------------------------------------------------

const LAST_SYNCED_KEY = 'taskflow:last-synced-at'
const BACKFILL_KEY_PREFIX = 'taskflow:backfilled:'
const PUSH_BATCH_SIZE = 500
const PULL_PAGE_SIZE = 1000

type LocalRecord = { id: string } & Syncable

interface RemoteRow {
  collection: string
  id: string
  data: LocalRecord | null
  deleted: boolean
  updated_at: string
}

export type SyncStatus = 'disabled' | 'signed-out' | 'idle' | 'syncing' | 'error'

export interface SyncResult {
  pushed: number
  pulled: number
}

// Status + change notification (consumed by the useSync hook)
let currentStatus: SyncStatus = 'disabled'
let lastError: string | null = null
const statusListeners = new Set<(s: SyncStatus) => void>()
// Fired when a pull changed local data, so the store can reload state.
const remoteAppliedListeners = new Set<() => void>()

function setStatus(s: SyncStatus) {
  currentStatus = s
  statusListeners.forEach((cb) => cb(s))
}

export function getSyncStatus(): SyncStatus {
  return currentStatus
}

export function getLastSyncError(): string | null {
  return lastError
}

export function onSyncStatusChange(cb: (s: SyncStatus) => void): () => void {
  statusListeners.add(cb)
  return () => statusListeners.delete(cb)
}

export function onRemoteApplied(cb: () => void): () => void {
  remoteAppliedListeners.add(cb)
  return () => remoteAppliedListeners.delete(cb)
}

export function getLastSyncedAt(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LAST_SYNCED_KEY)
}

// ---------------------------------------------------------------------------

function localUpdatedAt(collection: CollectionName, id: string): string | null {
  const record = getCollection<LocalRecord>(collection).find((r) => r.id === id)
  if (record?.updatedAt) return record.updatedAt
  // A locally deleted record only exists as a pending tombstone.
  const tombstone = pendingChanges
    .list()
    .find((p) => p.collection === collection && p.id === id)
  return tombstone?.updatedAt ?? null
}

function isCollectionName(s: string): s is CollectionName {
  return (COLLECTIONS as string[]).includes(s)
}

async function pull(userId: string): Promise<number> {
  const supabase = getSupabase()!
  const since = getLastSyncedAt()
  let applied = 0
  let maxSeen = since ?? ''
  let from = 0

  for (;;) {
    let query = supabase
      .from('records')
      .select('collection,id,data,deleted,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: true })
      .range(from, from + PULL_PAGE_SIZE - 1)
    if (since) query = query.gt('updated_at', since)

    const { data: rows, error } = await query
    if (error) throw new Error(error.message)
    if (!rows || rows.length === 0) break

    for (const row of rows as RemoteRow[]) {
      if (!isCollectionName(row.collection)) continue
      if (row.updated_at > maxSeen) maxSeen = row.updated_at

      const local = localUpdatedAt(row.collection, row.id)
      // Local wins ties (>=): our own pushed rows echo back with equal stamps.
      if (local && local >= row.updated_at) continue

      if (row.deleted || row.data === null) {
        applyRemote(row.collection, row.id, null)
      } else {
        applyRemote(row.collection, row.id, { ...row.data, updatedAt: row.updated_at })
      }
      applied++
    }

    if (rows.length < PULL_PAGE_SIZE) break
    from += PULL_PAGE_SIZE
  }

  if (maxSeen) localStorage.setItem(LAST_SYNCED_KEY, maxSeen)
  return applied
}

async function push(userId: string): Promise<number> {
  const supabase = getSupabase()!
  const pending = pendingChanges.list()
  if (pending.length === 0) return 0

  const rows = pending.map((p) => {
    const record = p.deleted
      ? null
      : getCollection<LocalRecord>(p.collection).find((r) => r.id === p.id) ?? null
    return {
      user_id: userId,
      collection: p.collection,
      id: p.id,
      data: record,
      // A pending upsert whose record vanished locally is treated as a delete.
      deleted: p.deleted || record === null,
      updated_at: record?.updatedAt ?? p.updatedAt,
    }
  })

  for (let i = 0; i < rows.length; i += PUSH_BATCH_SIZE) {
    const batch = rows.slice(i, i + PUSH_BATCH_SIZE)
    const { error } = await supabase
      .from('records')
      .upsert(batch, { onConflict: 'user_id,collection,id' })
    if (error) throw new Error(error.message)
  }

  // Only clears entries untouched since we snapshotted them.
  pendingChanges.clear(pending)
  return rows.length
}

/** On first sign-in (per user), queue every local record so existing data
 *  reaches the server. */
function ensureBackfill(userId: string): void {
  const key = BACKFILL_KEY_PREFIX + userId
  if (localStorage.getItem(key)) return
  for (const collection of COLLECTIONS) {
    for (const record of getCollection<LocalRecord>(collection)) {
      // Re-writing through applyRemote won't queue; instead mark via a
      // synthetic pending entry using the record's own timestamp.
      markBackfillPending(collection, record)
    }
  }
  localStorage.setItem(key, new Date().toISOString())
}

function markBackfillPending(collection: CollectionName, record: LocalRecord): void {
  // Records created before sync existed have no updatedAt — stamp them now
  // (via applyRemote so the stamp itself doesn't queue a second entry).
  if (!record.updatedAt) {
    record.updatedAt = new Date().toISOString()
    applyRemote(collection, record.id, record)
  }
  pendingChanges.markIfAbsent({
    collection,
    id: record.id,
    deleted: false,
    updatedAt: record.updatedAt,
  })
}

// ---------------------------------------------------------------------------

let syncInFlight: Promise<SyncResult | null> | null = null

export function syncNow(): Promise<SyncResult | null> {
  // Coalesce concurrent callers onto the in-flight run.
  if (syncInFlight) return syncInFlight
  syncInFlight = doSync().finally(() => {
    syncInFlight = null
  })
  return syncInFlight
}

async function doSync(): Promise<SyncResult | null> {
  const supabase = getSupabase()
  if (!supabase) {
    setStatus('disabled')
    return null
  }
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user?.id
  if (!userId) {
    setStatus('signed-out')
    return null
  }

  setStatus('syncing')
  try {
    ensureBackfill(userId)
    const pulled = await pull(userId)
    const pushed = await push(userId)
    lastError = null
    setStatus('idle')
    if (pulled > 0) remoteAppliedListeners.forEach((cb) => cb())
    return { pushed, pulled }
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e)
    setStatus('error')
    return null
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

/** Debounced sync — called after local mutations. */
export function requestSync(delayMs = 3000): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void syncNow()
  }, delayMs)
}
