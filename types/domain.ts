// Application-level domain types
// These are derived from the DB schema but shaped for app logic.

export type TeamStatus =
  | 'pending_payment'
  | 'pending_review'
  | 'confirmed'
  | 'partially_confirmed'
  | 'waitlisted'
  | 'rejected'
  | 'cancelled'

export type PlayerStatus =
  | 'pending_payment'
  | 'pending_review'
  | 'confirmed'
  | 'rejected'
  | 'removed'

export type RatingStatus = 'pending' | 'verified' | 'no_dupr' | 'disputed'

export type PaymentType = 'team' | 'player'

export type PaymentStatus =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'refund_due'
  | 'refunded'

export type RegistrationStatus = 'open' | 'closed' | 'waitlist_only'

export type TournamentStatus = 'upcoming' | 'active' | 'completed'

export type AdminRole = 'admin' | 'super_admin'

export type AuditActorType = 'admin' | 'owner' | 'system'

// Effective DUPR result — null means unresolved (blocks operations)
export type EffectiveDupr = number | null

export interface TournamentConfig {
  id: string
  name: string
  event_date: string
  max_teams: number
  max_players_per_team: number
  team_fee_paise: number
  player_fee_paise: number
  dupr_cap: number
  no_dupr_rating: number
  rating_cutoff_date: string
  roster_lock_at: string | null
  registration_status: RegistrationStatus
  tournament_status: TournamentStatus
  upi_id: string | null
  upi_qr_image_path: string | null
}

export interface Team {
  id: string
  team_code: string
  team_name: string
  owner_user_id: string | null
  owner_name: string
  owner_phone: string
  owner_email: string | null
  status: TeamStatus
  confirmed_at: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  team_id: string
  name: string
  phone: string | null
  email: string | null
  dupr_id: string | null
  submitted_rating: number | null
  verified_rating: number | null
  rating_status: RatingStatus
  status: PlayerStatus
  confirmed_at: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  team_id: string
  player_id: string | null
  payment_type: PaymentType
  amount_paise: number
  screenshot_path: string | null
  transaction_ref: string | null
  status: PaymentStatus
  reviewer_id: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  actor_type: AuditActorType
  action: string
  entity_type: string
  entity_id: string
  details: Record<string, unknown> | null
  created_at: string
}
