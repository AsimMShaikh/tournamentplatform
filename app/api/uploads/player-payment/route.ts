import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateUploadedFile } from '@/lib/domain/payments'

// Public endpoint — no auth session required.
// Security comes from the payment_token which is unique per player.
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const token = formData.get('payment_token') as string | null

  if (!file || !token) {
    return NextResponse.json({ error: 'file and payment_token are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // payment_token added in migration 013 — not yet in generated database.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: player } = await (supabase as any)
    .from('players')
    .select('id, team_id')
    .eq('payment_token', token)
    .maybeSingle() as { data: { id: string; team_id: string } | null }

  if (!player) {
    return NextResponse.json({ error: 'Invalid payment link.' }, { status: 403 })
  }

  const validationError = validateUploadedFile({ type: file.type, size: file.size })
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const ext = file.type === 'application/pdf' ? 'pdf'
    : file.type === 'image/png' ? 'png'
    : 'jpg'

  const path = `${player.team_id}/${player.id}/${crypto.randomUUID()}.${ext}`
  const bucket = process.env.SUPABASE_PAYMENT_BUCKET ?? 'payment-proofs'

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false })

  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ path })
}
