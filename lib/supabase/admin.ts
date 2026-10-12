import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Service-role Supabase client.
 *
 * SECURITY: This client bypasses RLS entirely.
 * - ONLY import this in Server Actions, Route Handlers, or server-only lib files.
 * - NEVER import in Client Components or any file with 'use client'.
 * - NEVER prefix the key with NEXT_PUBLIC_.
 *
 * Use for:
 *   - Audit log writes (append-only, no user context needed)
 *   - Admin-triggered mutations that require bypassing RLS
 *   - Payment proof signed URL generation
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'This client must only be used server-side.'
    )
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
