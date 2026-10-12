CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  player_id       UUID REFERENCES players(id) ON DELETE RESTRICT,
  payment_type    TEXT NOT NULL
    CHECK (payment_type IN ('team', 'player')),
  amount_paise    INT NOT NULL,
  screenshot_path TEXT,                         -- path in private storage bucket
  transaction_ref TEXT,                         -- UPI transaction reference
  status          TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'approved', 'rejected', 'refund_due', 'refunded')),
  reviewer_id     UUID REFERENCES admin_users(id),
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Team payment: no player, fixed ₹7,000 (700000 paise)
  -- Player payment: must have player, fixed ₹650 (65000 paise)
  CONSTRAINT payment_type_rules CHECK (
    (payment_type = 'team'   AND player_id IS NULL     AND amount_paise = 700000) OR
    (payment_type = 'player' AND player_id IS NOT NULL AND amount_paise = 65000)
  )
);

-- Prevent two active/approved payments for the same team slot
CREATE UNIQUE INDEX payments_team_no_duplicate
  ON payments (team_id)
  WHERE payment_type = 'team' AND status IN ('submitted', 'approved');

-- Prevent two active/approved payments for the same player
CREATE UNIQUE INDEX payments_player_no_duplicate
  ON payments (player_id)
  WHERE payment_type = 'player' AND status IN ('submitted', 'approved');

CREATE INDEX payments_team_idx ON payments (team_id);
CREATE INDEX payments_status_idx ON payments (status);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
