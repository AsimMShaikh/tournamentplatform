CREATE TABLE tournament_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  event_date            DATE NOT NULL,
  max_teams             INT NOT NULL DEFAULT 8,
  max_players_per_team  INT NOT NULL DEFAULT 8,
  team_fee_paise        INT NOT NULL DEFAULT 700000,   -- ₹7,000
  player_fee_paise      INT NOT NULL DEFAULT 65000,    -- ₹650
  dupr_cap              NUMERIC(4,2) NOT NULL DEFAULT 30.0,
  no_dupr_rating        NUMERIC(4,2) NOT NULL DEFAULT 3.75,
  rating_cutoff_date    DATE NOT NULL DEFAULT '2026-10-01',
  roster_lock_at        TIMESTAMPTZ,
  registration_status   TEXT NOT NULL DEFAULT 'open'
    CHECK (registration_status IN ('open', 'closed', 'waitlist_only')),
  tournament_status     TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (tournament_status IN ('upcoming', 'active', 'completed')),
  upi_qr_image_path     TEXT,
  upi_id                TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MVP singleton: only one row allowed
-- Replace with a proper tournaments table in Milestone 6
CREATE UNIQUE INDEX tournament_config_singleton ON tournament_config ((true));

CREATE TRIGGER tournament_config_updated_at
  BEFORE UPDATE ON tournament_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
