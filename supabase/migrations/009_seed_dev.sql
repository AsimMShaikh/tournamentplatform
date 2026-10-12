-- Development seed data — DO NOT run in production
-- Run only against the dev Supabase project

INSERT INTO tournament_config (
  name,
  event_date,
  max_teams,
  max_players_per_team,
  team_fee_paise,
  player_fee_paise,
  dupr_cap,
  no_dupr_rating,
  rating_cutoff_date,
  registration_status,
  tournament_status,
  upi_id
) VALUES (
  'Bring Your Own Team',
  '2026-10-21',
  8,
  8,
  700000,   -- ₹7,000
  65000,    -- ₹650
  30.0,
  3.75,
  '2026-10-01',
  'open',
  'upcoming',
  'vybe@upi'   -- replace with real UPI ID before testing payments
);
