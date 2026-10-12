import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateUploadedFile } from '@/lib/domain/payments'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const teamId = formData.get('team_id') as string | null

  if (!file || !teamId) {
    return NextResponse.json({ error: 'file and team_id are required' }, { status: 400 })
  }

  // Verify team belongs to the authenticated user
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .eq('owner_user_id', user.id)
    .single()

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 403 })
  }

  const validationError = validateUploadedFile({ type: file.type, size: file.size })
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const ext = file.type === 'application/pdf' ? 'pdf'
    : file.type === 'image/png' ? 'png'
    : 'jpg'

  const path = `${teamId}/${crypto.randomUUID()}.${ext}`
  const bucket = process.env.SUPABASE_PAYMENT_BUCKET ?? 'payment-proofs'

  const adminClient = createAdminClient()
  const { error } = await adminClient.storage
    .from(bucket)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false })

  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ path })
}
