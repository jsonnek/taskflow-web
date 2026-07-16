import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Sync is opt-in infrastructure: when the env vars are absent the client is
// null and the app runs local-only, exactly as before.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return client
}

export function isSyncConfigured(): boolean {
  return Boolean(url && anonKey)
}
