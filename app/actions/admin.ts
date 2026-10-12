'use server'

import { createClient } from '@/lib/supabase/server'
import { approveTeamPayment, rejectTeamPayment } from '@/lib/domain/teams'
import { approvePlayerPayment, rejectPlayerPayment } from '@/lib/domain/payments'
import { verifyPlayerRating } from '@/lib/domain/players'
import { generateRegistrationToken } from '@/lib/tokens'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
// Returns the admin_users.id (PK) — required for payments.reviewer_id FK
async function requireAdmin(): Promise<{ adminRowId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user!.id)
    .eq('status', 'active')
    .single()

  if (!adminUser) redirect('/')
  return { adminRowId: adminUser.id as string }
}

export async function generateToken(): Promise<{ url: string }> {
  await requireAdmin()

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  const baseUrl = `${proto}://${host}`

  const result = await generateRegistrationToken(baseUrl)
  return { url: result.url }
}

export async function approvePayment(formData: FormData) {
  const { adminRowId } = await requireAdmin()
  const paymentId = (formData.get('payment_id') as string | null) ?? ''
  const reviewNote = (formData.get('review_note') as string | null)?.trim() ?? ''

  try {
    await approveTeamPayment({
      paymentId,
      adminId: adminRowId,
      reviewNote: reviewNote || undefined,
    })
  } catch (err) {
    redirect(`/admin/payments?error=${encodeURIComponent((err as Error).message)}`)
  }

  redirect('/admin/payments?approved=1')
}

export async function rejectPayment(formData: FormData) {
  const { adminRowId } = await requireAdmin()
  const paymentId = (formData.get('payment_id') as string | null) ?? ''
  const reviewNote = (formData.get('review_note') as string | null)?.trim() ?? ''

  if (!reviewNote) {
    redirect('/admin/payments?error=A+rejection+note+is+required')
  }

  try {
    await rejectTeamPayment({
      paymentId,
      adminId: adminRowId,
      reviewNote,
    })
  } catch (err) {
    redirect(`/admin/payments?error=${encodeURIComponent((err as Error).message)}`)
  }

  redirect('/admin/payments?rejected=1')
}

export async function approvePlayerPaymentAction(formData: FormData) {
  const { adminRowId } = await requireAdmin()
  const paymentId = (formData.get('payment_id') as string | null) ?? ''
  const playerId = (formData.get('player_id') as string | null) ?? ''
  const reviewNote = (formData.get('review_note') as string | null)?.trim() ?? ''
  const teamId = (formData.get('team_id') as string | null) ?? ''

  try {
    await approvePlayerPayment({
      paymentId,
      playerId,
      adminId: adminRowId,
      reviewNote: reviewNote || undefined,
    })
  } catch (err) {
    redirect(`/admin/teams/${teamId}?error=${encodeURIComponent((err as Error).message)}`)
  }

  redirect(`/admin/teams/${teamId}?player_approved=1`)
}

export async function rejectPlayerPaymentAction(formData: FormData) {
  const { adminRowId } = await requireAdmin()
  const paymentId = (formData.get('payment_id') as string | null) ?? ''
  const playerId = (formData.get('player_id') as string | null) ?? ''
  const reviewNote = (formData.get('review_note') as string | null)?.trim() ?? ''
  const teamId = (formData.get('team_id') as string | null) ?? ''

  if (!reviewNote) {
    redirect(`/admin/teams/${teamId}?error=A+rejection+note+is+required`)
  }

  try {
    await rejectPlayerPayment({
      paymentId,
      playerId,
      adminId: adminRowId,
      reviewNote,
    })
  } catch (err) {
    redirect(`/admin/teams/${teamId}?error=${encodeURIComponent((err as Error).message)}`)
  }

  redirect(`/admin/teams/${teamId}?player_rejected=1`)
}

export async function verifyPlayerRatingAction(formData: FormData) {
  const { adminRowId } = await requireAdmin()
  const playerId = (formData.get('player_id') as string | null) ?? ''
  const teamId = (formData.get('team_id') as string | null) ?? ''
  const ratingStatus = (formData.get('rating_status') as string | null) ?? ''
  const verifiedRatingStr = (formData.get('verified_rating') as string | null)?.trim() ?? ''

  if (!['verified', 'no_dupr', 'disputed'].includes(ratingStatus)) {
    redirect(`/admin/teams/${teamId}?error=Invalid+rating+status`)
  }

  const verifiedRating = ratingStatus === 'verified' && verifiedRatingStr
    ? parseFloat(verifiedRatingStr)
    : null

  try {
    await verifyPlayerRating({
      playerId,
      adminId: adminRowId,
      verifiedRating,
      ratingStatus: ratingStatus as 'verified' | 'no_dupr' | 'disputed',
    })
  } catch (err) {
    redirect(`/admin/teams/${teamId}?error=${encodeURIComponent((err as Error).message)}`)
  }

  redirect(`/admin/teams/${teamId}?rating_updated=1`)
}
