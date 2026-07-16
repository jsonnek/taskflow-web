'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'
import { getSupabase, isSyncConfigured } from '@/lib/supabase'
import {
  syncNow,
  requestSync,
  getSyncStatus,
  getLastSyncedAt,
  getLastSyncError,
  onSyncStatusChange,
  onRemoteApplied,
  type SyncStatus,
} from '@/lib/sync'
import { onLocalMutation } from '@/lib/store'
import { useStore } from './use-store'

interface SyncContextValue {
  configured: boolean
  status: SyncStatus
  userEmail: string | null
  lastSyncedAt: string | null
  error: string | null
  signInWithEmail: (email: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

const SYNC_INTERVAL_MS = 60_000

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { refresh } = useStore()
  const configured = isSyncConfigured()
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus())
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  // Reflect engine status + reload store state when a pull changed data.
  useEffect(() => {
    const offStatus = onSyncStatusChange((s) => {
      setStatus(s)
      setLastSyncedAt(getLastSyncedAt())
    })
    const offApplied = onRemoteApplied(() => refresh())
    setLastSyncedAt(getLastSyncedAt())
    return () => {
      offStatus()
      offApplied()
    }
  }, [refresh])

  // Track auth state; sync on sign-in.
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null)
      if (data.session) void syncNow()
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user?.email ?? null)
      if (event === 'SIGNED_IN') void syncNow()
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Push local edits shortly after they happen.
  useEffect(() => {
    if (!configured) return
    return onLocalMutation(() => requestSync())
  }, [configured])

  // Sync on reconnect and on a slow heartbeat while the tab is visible.
  useEffect(() => {
    if (!configured) return
    const onOnline = () => void syncNow()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void syncNow()
      }
    }, SYNC_INTERVAL_MS)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(interval)
    }
  }, [configured])

  const signInWithEmail = useCallback(async (email: string) => {
    const supabase = getSupabase()
    if (!supabase) return { error: 'Sync is not configured' }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/app/settings/account' },
    })
    return { error: error?.message ?? null }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return { error: 'Sync is not configured' }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/app/settings/account' },
    })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return
    // Push any unsynced work before the session goes away.
    await syncNow()
    await supabase.auth.signOut()
  }, [])

  const manualSync = useCallback(async () => {
    await syncNow()
  }, [])

  const value = useMemo<SyncContextValue>(
    () => ({
      configured,
      status,
      userEmail,
      lastSyncedAt,
      error: getLastSyncError(),
      signInWithEmail,
      signInWithGoogle,
      signOut,
      syncNow: manualSync,
    }),
    [configured, status, userEmail, lastSyncedAt, signInWithEmail, signInWithGoogle, signOut, manualSync]
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}
