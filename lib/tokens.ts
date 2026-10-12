import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Generates a private registration token and inserts a pending team row.
 * Returns the URL to share with the team owner.
 *
 * Called by admin when allocating a registration slot.
 */
export async function generateRegistrationToken(baseUrl: string): Promise<{
  token: string
  url: string
  teamId: string
}> {
  const supabase = createAdminClient()
  const token = crypto.randomUUID()

  const { data, error } = await supabase
    .from('teams')
    .insert({
      team_code: generateTeamCode(),
      team_name: '',               // filled in by owner during registration
      owner_user_id: null as unknown as string, // nullable after migration 012; database.ts predates it
      owner_name: '',
      owner_phone: '',
      status: 'pending_payment',
      registration_token: token,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to generate registration token: ${error?.message}`)
  }

  return {
    token,
    teamId: data.id,
    url: `${baseUrl}/register/team?token=${token}`,
  }
}

/**
 * Validates a registration token.
 * Returns the team row if valid and unused; throws if invalid or already used.
 */
export async function validateRegistrationToken(token: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('teams')
    .select('id, status, token_used_at')
    .eq('registration_token', token)
    .single()

  if (error || !data) {
    throw new Error('Invalid registration link.')
  }

  if (data.token_used_at) {
    throw new Error('This registration link has already been used.')
  }

  return data
}

/**
 * Marks a token as used once the owner completes registration.
 */
export async function markTokenUsed(teamId: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('teams')
    .update({ token_used_at: new Date().toISOString() })
    .eq('id', teamId)

  if (error) {
    throw new Error(`Failed to mark token as used: ${error.message}`)
  }
}

// Generates a short human-readable team code e.g. VYBE-A1B2
function generateTeamCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const part = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
  return `VYBE-${part}`
}
