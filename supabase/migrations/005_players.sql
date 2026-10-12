CREATE TABLE players (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id          UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  name             TEXT NOT NULL,
  phone            TEXT,
  email            TEXT,
  dupr_id          TEXT,
  submitted_rating NUMERIC(4,2),                -- as entered by owner
  verified_rating  NUMERIC(4,2),                -- as confirmed by admin
  rating_status    TEXT NOT NULL DEFAULT 'pending'
    CHECK (rating_status IN ('pending', 'verified', 'no_dupr', 'disputed')),
  status           TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment',
      'pending_review',
      'confirmed',
      'rejected',
      'removed'
    )),
  confirmed_at     TIMESTAMPTZ,
  admin_notes      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX players_team_idx ON players (team_id);

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
