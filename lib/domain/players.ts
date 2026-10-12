import { createAdminClient } from '@/lib/supabase/admin'
import { checkDuprCap } from '@/lib/domain/ratings'
import { log } from '@/lib/domain/audit'
import type { Player } from '@/types/domain'

type NewPlayer = Pick<Player,
  'name' | 'phone' | 'email' | 'dupr_id' | 'submitted_rating' | 'rating_status'
>

/**
 * Adds a single player to a team.
 * Validates capacity and DUPR cap atomically via DB RPC.
 */
export async function addPlayer(params: {
  teamId: string
  actorId: string
  player: NewPlayer
}): Promise<Player> {
  return addPlayersBatch({
    teamId: params.teamId,
    actorId: params.actorId,
    players: [params.player],
  }).then(players => players[0])
}

/**
 * Adds a batch of players atomically.
 * ALL players are inserted or NONE — partial adds are not allowed.
 *
 * Calls a DB RPC to lock the team row and perform all checks in one transaction.
 */
export async function addPlayersBatch(params: {
  teamId: string
  actorId: string
  players: NewPlayer[]
}): Promise<Player[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('add_players_batch', {
    p_team_id: params.teamId,
    p_players: params.players,
  })

  if (error) {
    throw new Error(error.message)
  }

  await log({
    actorId: params.actorId,
    actorType: 'owner',
    action: 'players.batch_added',
    entityType: 'team',
    entityId: params.teamId,
    details: { count: params.players.length },
  })

  return data as unknown as Player[]
}

/**
 * Removes a player from the team (sets status to 'removed').
 * Hard deletion is not allowed — records must be preserved for audit purposes.
 */
export async function removePlayer(params: {
  playerId: string
  actorId: string
  actorType: 'admin' | 'owner'
  reason?: string
}): Promise<void> {
  const supabase = createAdminClient()

  const { data: player, error: fetchError } = await supabase
    .from('players')
    .select('id, team_id, name')
    .eq('id', params.playerId)
    .single()

  if (fetchError || !player) {
    throw new Error('Player not found.')
  }

  const { error } = await supabase
    .from('players')
    .update({ status: 'removed' })
    .eq('id', params.playerId)

  if (error) {
    throw new Error(`Failed to remove player: ${error.message}`)
  }

  await log({
    actorId: params.actorId,
    actorType: params.actorType,
    action: 'player.removed',
    entityType: 'player',
    entityId: params.playerId,
    details: { reason: params.reason, team_id: player.team_id },
  })
}

/**
 * Admin sets the verified DUPR rating and rating status for a player.
 * ratingStatus 'disputed' or 'no_dupr' should be passed with verifiedRating = null.
 */
export async function verifyPlayerRating(params: {
  playerId: string
  adminId: string
  verifiedRating: number | null
  ratingStatus: 'verified' | 'no_dupr' | 'disputed'
}): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('players')
    .update({
      verified_rating: params.verifiedRating,
      rating_status: params.ratingStatus,
    })
    .eq('id', params.playerId)

  if (error) throw new Error(`Failed to update player rating: ${error.message}`)

  await log({
    actorId: params.adminId,
    actorType: 'admin',
    action: 'player.rating_verified',
    entityType: 'player',
    entityId: params.playerId,
    details: { rating_status: params.ratingStatus, verified_rating: params.verifiedRating },
  })
}

/**
 * Replaces a removed/rejected player with a new one.
 * Validates DUPR cap after replacement.
 */
export async function replacePlayer(params: {
  teamId: string
  removedPlayerId: string
  newPlayer: NewPlayer
  actorId: string
}): Promise<Player> {
  // Remove the old player first
  await removePlayer({
    playerId: params.removedPlayerId,
    actorId: params.actorId,
    actorType: 'owner',
    reason: 'replaced',
  })

  // Add the replacement
  return addPlayer({
    teamId: params.teamId,
    actorId: params.actorId,
    player: params.newPlayer,
  })
}
