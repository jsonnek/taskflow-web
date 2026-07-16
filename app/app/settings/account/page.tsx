'use client'

import { useState } from 'react'
import { Cloud, CloudOff, LogOut, RefreshCw, Mail, CheckCircle2 } from 'lucide-react'
import { PgHeader } from '@/components/layout/PgHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSync } from '@/hooks/use-sync'
import { pendingChanges } from '@/lib/store'

function statusLabel(status: string): string {
  switch (status) {
    case 'syncing': return 'syncing…'
    case 'idle': return 'synced'
    case 'error': return 'sync error'
    case 'signed-out': return 'signed out'
    default: return 'local only'
  }
}

export default function AccountPage() {
  const sync = useSync()
  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setFormError(null)
    const { error } = await sync.signInWithEmail(email.trim())
    setBusy(false)
    if (error) setFormError(error)
    else setLinkSent(true)
  }

  async function googleSignIn() {
    setFormError(null)
    const { error } = await sync.signInWithGoogle()
    if (error) setFormError(error)
  }

  const pendingCount = pendingChanges.count()

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 page-enter">
      <PgHeader
        title="account"
        sub="sync your data across devices"
        stats={[{ v: statusLabel(sync.status), l: 'status' }]}
      />

      {/* Not configured — setup instructions */}
      {!sync.configured && (
        <div className="rounded-lg border border-dashed border-border p-6">
          <div className="flex items-center gap-2 mb-3">
            <CloudOff className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium">Sync backend not configured</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Your data lives in this browser only. To enable accounts and
            multi-device sync:
          </p>
          <ol className="text-xs text-muted-foreground font-mono space-y-1.5 list-decimal list-inside">
            <li>Create a free project at supabase.com</li>
            <li>Run <span className="text-primary">supabase/migrations/001_records.sql</span> in its SQL editor</li>
            <li>Copy <span className="text-primary">.env.local.example</span> to <span className="text-primary">.env.local</span> and fill in the project URL + anon key</li>
            <li>Restart the dev server</li>
          </ol>
        </div>
      )}

      {/* Configured, signed out — sign-in form */}
      {sync.configured && !sync.userEmail && (
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cloud className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">Sign in to sync</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-5">
            Your data stays on this device and keeps working offline. Signing
            in backs it up and syncs it to your other devices.
          </p>

          {linkSent ? (
            <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/30 px-3 py-2.5 text-xs text-primary">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Check your email — we sent a sign-in link to {email.trim()}.
            </div>
          ) : (
            <form onSubmit={sendMagicLink} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-mono">email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={busy || !email.trim()}>
                  <Mail className="w-3.5 h-3.5 mr-1.5" />
                  {busy ? 'sending…' : 'send sign-in link'}
                </Button>
                <span className="text-[10px] font-mono text-muted-foreground/50">or</span>
                <Button type="button" size="sm" variant="outline" onClick={googleSignIn}>
                  continue with google
                </Button>
              </div>
            </form>
          )}

          {formError && (
            <p className="mt-3 text-xs text-red-400 font-mono">{formError}</p>
          )}
        </div>
      )}

      {/* Signed in — status + controls */}
      {sync.configured && sync.userEmail && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">{sync.userEmail}</p>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary">
                {statusLabel(sync.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-md border border-border px-3 py-2">
                <p className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-widest mb-1">last synced</p>
                <p className="font-mono text-xs">
                  {sync.lastSyncedAt
                    ? new Date(sync.lastSyncedAt).toLocaleString()
                    : 'never'}
                </p>
              </div>
              <div className="rounded-md border border-border px-3 py-2">
                <p className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-widest mb-1">pending changes</p>
                <p className="font-mono text-xs">{pendingCount}</p>
              </div>
            </div>

            {sync.status === 'error' && sync.error && (
              <p className="mb-4 text-xs text-red-400 font-mono">{sync.error}</p>
            )}

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => sync.syncNow()} disabled={sync.status === 'syncing'}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${sync.status === 'syncing' ? 'animate-spin' : ''}`} />
                sync now
              </Button>
              <Button size="sm" variant="ghost" onClick={() => sync.signOut()}>
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                sign out
              </Button>
            </div>
          </div>

          <p className="text-[10px] font-mono text-muted-foreground/40 leading-relaxed px-1">
            Signing out keeps your data on this device. Sync pushes local
            changes and pulls anything newer from your other devices — the most
            recent edit to each item wins.
          </p>
        </div>
      )}
    </div>
  )
}
