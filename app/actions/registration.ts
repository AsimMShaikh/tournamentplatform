'use server'

import { createClient } from '@/lib/supabase/server'
import { validateRegistrationToken } from '@/lib/tokens'
import { createTeamRegistration } from '@/lib/domain/teams'
import { redirect } from 'next/navigation'

export async function registerTeam(formData: FormData) {
  const token = (formData.get('token') as string | null) ?? ''
  const teamName = (formData.get('team_name') as string | null)?.trim() ?? ''
  const ownerName = (formData.get('owner_name') as string | null)?.trim() ?? ''
  const ownerPhone = (formData.get('owner_phone') as string | null)?.trim() ?? ''
  const ownerEmail = (formData.get('owner_email') as string | null)?.trim() ?? ''

  const errorBase = `/register/team?token=${encodeURIComponent(token)}&error=`

  if (!teamName || !ownerName || !ownerPhone) {
    redirect(`${errorBase}All+required+fields+must+be+filled`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/register/team?token=${token}`)}`)
  }

  let teamId: string
  try {
    const teamData = await validateRegistrationToken(token)
    teamId = teamData.id
  } catch (err) {
    redirect(`${errorBase}${encodeURIComponent((err as Error).message)}`)
  }

  try {
    await createTeamRegistration({
      teamId: teamId!,
      ownerUserId: user!.id,
      teamName,
      ownerName,
      ownerPhone,
      ownerEmail: ownerEmail || undefined,
    })
  } catch (err) {
    redirect(`${errorBase}${encodeURIComponent((err as Error).message)}`)
  }

  redirect('/owner/dashboard')
}
