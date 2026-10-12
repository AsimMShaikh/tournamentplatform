import { createAdminClient } from '@/lib/supabase/admin'
import { log } from '@/lib/domain/audit'
import type { Team } from '@/types/domain'

/**
 * Completes team registration when the owner submits their details via the private link.
 * Marks the token as used and associates the Supabase Auth user with the team.
 */
export async function createTeamRegistration(params: {
  teamId: string
  ownerUserId: string
  teamName: string
  ownerName: string
  ownerPhone: string
  ownerEmail?: string
}): Promise<Team> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('teams')
    .update({
      team_name: params.teamName,
      owner_user_id: params.ownerUserId,
      owner_name: params.ownerName,
      owner_phone: params.ownerPhone,
      owner_email: params.ownerEmail ?? null,
      token_used_at: new Date().toISOString(),
    })
    .eq('id', params.teamId)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to complete team registration: ${error?.message}`)
  }

  await log({
    actorId: params.ownerUserId,
    actorType: 'owner',
    action: 'team.registered',
    entityType: 'team',
    entityId: params.teamId,
    details: { team_name: params.teamName },
  })

  return data as Team
}

/**
 * Atomically approves a team payment and confirms (or waitlists) the team.
 *
 * Uses SELECT ... FOR UPDATE on tournament_config to prevent concurrent
 * over-confirmation. This must always run inside a DB transaction.
 *
 * Call via a Supabase RPC function (see: supabase/functions/approve_team_payment.sql)
 * rather than directly, so the transaction runs in the database.
 */
export async function approveTeamPayment(params: {
  paymentId: string
  adminId: string
  reviewNote?: string
}): Promise<{ outcome: 'confirmed' | 'waitlisted' }> {
  const supabase = createAdminClient()

  // Call the DB-level RPC that handles the transaction atomically
  const { data, error } = await supabase.rpc('approve_team_payment', {
    p_payment_id: params.paymentId,
    p_admin_id: params.adminId,
    p_review_note: params.reviewNote ?? undefined,
  })

  if (error) {
    throw new Error(`Failed to approve team payment: ${error.message}`)
  }

  const outcome = data as 'confirmed' | 'waitlisted'

  await log({
    actorId: params.adminId,
    actorType: 'admin',
    action: `payment.approved`,
    entityType: 'payment',
    entityId: params.paymentId,
    details: { outcome, note: params.reviewNote },
  })

  return { outcome }
}

/**
 * Rejects a team payment with a mandatory note.
 */
export async function rejectTeamPayment(params: {
  paymentId: string
  adminId: string
  reviewNote: string
}): Promise<void> {
  const supabase = createAdminClient()

  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('team_id')
    .eq('id', params.paymentId)
    .single()

  if (fetchError || !payment) {
    throw new Error('Payment not found.')
  }

  const { error } = await supabase
    .from('payments')
    .update({
      status: 'rejected',
      reviewer_id: params.adminId,
      reviewed_at: new Date().toISOString(),
      review_note: params.reviewNote ?? undefined,
    })
    .eq('id', params.paymentId)

  if (error) {
    throw new Error(`Failed to reject payment: ${error.message}`)
  }

  await log({
    actorId: params.adminId,
    actorType: 'admin',
    action: 'payment.rejected',
    entityType: 'payment',
    entityId: params.paymentId,
    details: { note: params.reviewNote },
  })
}
