'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { submitTeamPaymentProof, submitPlayerPaymentProof } from '@/lib/domain/payments'
import { redirect } from 'next/navigation'

export async function submitPayment(formData: FormData) {
  const teamId = (formData.get('team_id') as string | null) ?? ''
  const screenshotPath = (formData.get('screenshot_path') as string | null) ?? ''
  const transactionRef = (formData.get('transaction_ref') as string | null)?.trim() ?? ''

  const errorBase = `/owner/teams/${teamId}?error=`

  if (!teamId || !screenshotPath) {
    redirect(`${errorBase}Screenshot+upload+is+required`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Verify the team belongs to this user before proceeding
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .eq('owner_user_id', user!.id)
    .single()

  if (!team) redirect('/owner/dashboard')

  try {
    await submitTeamPaymentProof({
      teamId,
      actorId: user!.id,
      screenshotPath,
      transactionRef: transactionRef || undefined,
    })
  } catch (err) {
    redirect(`${errorBase}${encodeURIComponent((err as Error).message)}`)
  }

  redirect(`/owner/teams/${teamId}?submitted=1`)
}

/**
 * Public action — no auth session required.
 * Validates via the player's payment_token.
 */
export async function submitPublicPayment(
  token: string,
  screenshotPath: string,
  transactionRef?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // payment_token added in migration 013 — not yet in generated database.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: player } = await (supabase as any)
    .from('players')
    .select('id, team_id, status')
    .eq('payment_token', token)
    .maybeSingle() as { data: { id: string; team_id: string; status: string } | null }

  if (!player) return { success: false, error: 'Invalid payment link.' }

  // Block resubmission if a submitted or approved payment already exists
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('player_id', player.id)
    .in('status', ['submitted', 'approved'])
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'A payment has already been submitted for this player.' }
  }

  // Fetch team owner for audit log actor
  const { data: team } = await supabase
    .from('teams')
    .select('owner_user_id')
    .eq('id', player.team_id)
    .maybeSingle()

  try {
    await submitPlayerPaymentProof({
      teamId: player.team_id,
      playerId: player.id,
      actorId: (team?.owner_user_id as string | null) ?? 'system',
      screenshotPath,
      transactionRef,
    })
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }

  return { success: true }
}
