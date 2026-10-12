'use server'

import { createClient } from '@/lib/supabase/server'
import { addPlayersBatch } from '@/lib/domain/players'
import { redirect } from 'next/navigation'

interface NewPlayerInput {
  name: string
  phone: string | null
  email: string | null
  dupr_id: string | null
  submitted_rating: number | null
  rating_status: 'no_dupr' | 'verified'
}

export async function addPlayersAction(
  players: NewPlayerInput[],
  teamId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  if (!players.length) {
    return { error: 'Add at least one player.' }
  }

  // Verify team ownership and confirm status
  const { data: team } = await supabase
    .from('teams')
    .select('id, status')
    .eq('id', teamId)
    .eq('owner_user_id', user!.id)
    .maybeSingle()

  if (!team) return { error: 'Team not found.' }

  if (team.status !== 'confirmed') {
    return { error: 'Players can only be added after the team payment is approved.' }
  }

  try {
    await addPlayersBatch({
      teamId,
      actorId: user!.id,
      players,
    })
  } catch (err) {
    return { error: (err as Error).message }
  }

  redirect(`/owner/teams/${teamId}?added=1`)
}
