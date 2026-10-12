import { createAdminClient } from '@/lib/supabase/admin'
import type { AuditActorType } from '@/types/domain'

/**
 * Append an audit log entry.
 *
 * Always called server-side using the service-role client.
 * Audit logs are insert-only — never updated or deleted.
 */
export async function log(params: {
  actorId: string | null
  actorType: AuditActorType
  action: string
  entityType: 'team' | 'player' | 'payment'
  entityId: string
  details?: Record<string, unknown>
}): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase.from('audit_logs').insert({
    actor_id: params.actorId,
    actor_type: params.actorType,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    details: (params.details ?? null) as import('@/types/database').Json | null,
  })

  if (error) {
    // Audit failures should not break the main operation — log to console
    console.error('[audit] Failed to write audit log:', error.message, params)
  }
}
