import { createAdminClient } from '@/lib/supabase/admin'
import { log } from '@/lib/domain/audit'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024  // 2 MB

/**
 * Submits a team payment proof after the screenshot has been uploaded.
 * The screenshot upload happens separately via /api/uploads.
 */
export async function submitTeamPaymentProof(params: {
  teamId: string
  actorId: string
  screenshotPath: string
  transactionRef?: string
}): Promise<void> {
  const supabase = createAdminClient()

  const { data: config } = await supabase
    .from('tournament_config')
    .select('team_fee_paise')
    .single()

  if (!config) throw new Error('Tournament configuration not found.')

  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      team_id: params.teamId,
      player_id: null,
      payment_type: 'team',
      amount_paise: config.team_fee_paise,
      screenshot_path: params.screenshotPath,
      transaction_ref: params.transactionRef ?? null,
      status: 'submitted',
    })

  if (paymentError) {
    throw new Error(`Failed to submit payment: ${paymentError.message}`)
  }

  // Move team to pending_review
  await supabase
    .from('teams')
    .update({ status: 'pending_review' })
    .eq('id', params.teamId)

  await log({
    actorId: params.actorId,
    actorType: 'owner',
    action: 'payment.submitted',
    entityType: 'team',
    entityId: params.teamId,
    details: { payment_type: 'team', transaction_ref: params.transactionRef },
  })
}

/**
 * Submits a player payment proof.
 */
export async function submitPlayerPaymentProof(params: {
  teamId: string
  playerId: string
  actorId: string
  screenshotPath: string
  transactionRef?: string
}): Promise<void> {
  const supabase = createAdminClient()

  const { data: config } = await supabase
    .from('tournament_config')
    .select('player_fee_paise')
    .single()

  if (!config) throw new Error('Tournament configuration not found.')

  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      team_id: params.teamId,
      player_id: params.playerId,
      payment_type: 'player',
      amount_paise: config.player_fee_paise,
      screenshot_path: params.screenshotPath,
      transaction_ref: params.transactionRef ?? null,
      status: 'submitted',
    })

  if (paymentError) {
    throw new Error(`Failed to submit player payment: ${paymentError.message}`)
  }

  await supabase
    .from('players')
    .update({ status: 'pending_review' })
    .eq('id', params.playerId)

  await log({
    actorId: params.actorId,
    actorType: 'owner',
    action: 'payment.submitted',
    entityType: 'player',
    entityId: params.playerId,
    details: { payment_type: 'player', transaction_ref: params.transactionRef },
  })
}

/**
 * Approves a player payment and confirms the player.
 * adminId must be admin_users.id (PK) to satisfy the reviewer_id FK.
 */
export async function approvePlayerPayment(params: {
  paymentId: string
  playerId: string
  adminId: string
  reviewNote?: string
}): Promise<void> {
  const supabase = createAdminClient()

  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'approved',
      reviewer_id: params.adminId,
      reviewed_at: new Date().toISOString(),
      review_note: params.reviewNote ?? undefined,
    })
    .eq('id', params.paymentId)

  if (paymentError) throw new Error(`Failed to approve player payment: ${paymentError.message}`)

  const { error: playerError } = await supabase
    .from('players')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', params.playerId)

  if (playerError) throw new Error(`Failed to confirm player: ${playerError.message}`)

  await log({
    actorId: params.adminId,
    actorType: 'admin',
    action: 'player_payment.approved',
    entityType: 'payment',
    entityId: params.paymentId,
    details: { player_id: params.playerId },
  })
}

/**
 * Rejects a player payment and returns the player to pending_payment
 * so they can resubmit via their shareable payment link.
 */
export async function rejectPlayerPayment(params: {
  paymentId: string
  playerId: string
  adminId: string
  reviewNote: string
}): Promise<void> {
  const supabase = createAdminClient()

  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'rejected',
      reviewer_id: params.adminId,
      reviewed_at: new Date().toISOString(),
      review_note: params.reviewNote,
    })
    .eq('id', params.paymentId)

  if (paymentError) throw new Error(`Failed to reject player payment: ${paymentError.message}`)

  const { error: playerError } = await supabase
    .from('players')
    .update({ status: 'pending_payment' })
    .eq('id', params.playerId)

  if (playerError) throw new Error(`Failed to update player status: ${playerError.message}`)

  await log({
    actorId: params.adminId,
    actorType: 'admin',
    action: 'player_payment.rejected',
    entityType: 'payment',
    entityId: params.paymentId,
    details: { player_id: params.playerId, note: params.reviewNote },
  })
}

/**
 * Generates a short-lived signed URL for an admin to view a payment screenshot.
 * Signed URLs expire after 15 minutes — never return raw storage paths to the browser.
 */
export async function getPaymentProofSignedUrl(
  screenshotPath: string
): Promise<string> {
  const supabase = createAdminClient()
  const bucket = process.env.SUPABASE_PAYMENT_BUCKET ?? 'payment-proofs'

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(screenshotPath, 60 * 15)  // 15 minutes

  if (error || !data) {
    throw new Error(`Failed to generate signed URL: ${error?.message}`)
  }

  return data.signedUrl
}

/**
 * Validates an uploaded file before storing it.
 * Call in /api/uploads before writing to storage.
 */
export function validateUploadedFile(file: {
  type: string
  size: number
}): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `File type not allowed. Upload a JPG, PNG, or PDF.`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File too large. Maximum size is 2 MB.`
  }
  return null
}
