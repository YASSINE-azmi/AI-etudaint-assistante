import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { env } from '@/lib/env'

let client: SupabaseClient | undefined

/**
 * Browser auth client (email only, plan §6.1).
 *
 * Created on first use rather than at import: `main.tsx` imports the whole app before the
 * env gate decides what to render, and `createClient` throws on a missing URL.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      throw new Error('Supabase is not configured: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
    }
    client = createClient(env.supabaseUrl, env.supabaseAnonKey)
  }
  return client
}

/** The current Supabase access token, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession()
  return data.session?.access_token ?? null
}
