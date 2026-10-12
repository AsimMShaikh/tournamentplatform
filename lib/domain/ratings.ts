import type { Player, EffectiveDupr } from '@/types/domain'

/**
 * Returns the effective DUPR rating for a player used in cumulative calculations.
 *
 * Rules (from tournament config):
 *   - 'no_dupr'  → 3.75 (explicitly classified, counts toward cap)
 *   - 'verified' → verified_rating (confirmed by admin)
 *   - 'pending'  → null (unresolved — BLOCKS team confirmation)
 *   - 'disputed' → null (unresolved — BLOCKS team confirmation)
 *
 * A null result must cause the calling operation to fail — never silently default.
 */
export function effectiveDupr(player: Pick<Player, 'rating_status' | 'verified_rating'>): EffectiveDupr {
  switch (player.rating_status) {
    case 'no_dupr':
      return 3.75
    case 'verified':
      return player.verified_rating ?? null
    case 'pending':
    case 'disputed':
      return null
  }
}

/**
 * Calculates the cumulative DUPR for a list of players.
 * Returns null if any player has an unresolved rating.
 */
export function cumulativeDupr(
  players: Pick<Player, 'rating_status' | 'verified_rating'>[]
): number | null {
  let total = 0
  for (const player of players) {
    const rating = effectiveDupr(player)
    if (rating === null) return null   // unresolved — abort
    total += rating
  }
  return total
}

/**
 * Checks whether adding new players would exceed the DUPR cap.
 * Returns an error string if blocked, or null if allowed.
 */
export function checkDuprCap(params: {
  existingPlayers: Pick<Player, 'rating_status' | 'verified_rating'>[]
  newPlayers: Pick<Player, 'rating_status' | 'verified_rating'>[]
  duprCap: number
}): string | null {
  const existingTotal = cumulativeDupr(params.existingPlayers)
  const newTotal = cumulativeDupr(params.newPlayers)

  if (existingTotal === null) {
    return 'Existing roster has unresolved DUPR ratings. Resolve them before adding players.'
  }
  if (newTotal === null) {
    return 'One or more new players have unresolved DUPR ratings. Classify all players before adding.'
  }
  if (existingTotal + newTotal > params.duprCap) {
    return `Adding these players would exceed the DUPR cap of ${params.duprCap}. ` +
           `Current: ${existingTotal.toFixed(2)}, Adding: ${newTotal.toFixed(2)}, ` +
           `Total: ${(existingTotal + newTotal).toFixed(2)}.`
  }
  return null
}
