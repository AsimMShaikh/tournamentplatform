CREATE TABLE teams (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code          TEXT NOT NULL UNIQUE,       -- short human-readable code e.g. VYBE-A1B2
  team_name          TEXT NOT NULL,
  owner_user_id      UUID NOT NULL REFERENCES auth.users(id),
  owner_name         TEXT NOT NULL,
  owner_phone        TEXT NOT NULL,
  owner_email        TEXT,
  status             TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment',
      'pending_review',
      'confirmed',
      'partially_confirmed',
      'waitlisted',
      'rejected',
      'cancelled'
    )),
  confirmed_at       TIMESTAMPTZ,
  registration_token TEXT UNIQUE,                -- private link token (UUID)
  token_used_at      TIMESTAMPTZ,                -- set when owner completes registration
  admin_notes        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
