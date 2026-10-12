-- Enable RLS on all tables
ALTER TABLE tournament_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE players           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────
-- Helper: returns true if the current user is an active admin
-- SECURITY DEFINER runs as the function owner (bypasses RLS on admin_users)
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────
-- tournament_config: public read, admin write only
-- ─────────────────────────────────────────────────────────
CREATE POLICY "tc_public_read"
  ON tournament_config FOR SELECT
  USING (true);

CREATE POLICY "tc_admin_write"
  ON tournament_config FOR ALL
  USING (is_admin());

-- ─────────────────────────────────────────────────────────
-- admin_users: each admin can only read their own row
-- Writes go through service-role only (provisioned manually)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "au_self_read"
  ON admin_users FOR SELECT
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────
-- teams: owner accesses their own team; admin accesses all
-- ─────────────────────────────────────────────────────────
CREATE POLICY "teams_owner_access"
  ON teams FOR ALL
  USING (owner_user_id = auth.uid());

CREATE POLICY "teams_admin_access"
  ON teams FOR ALL
  USING (is_admin());

-- ─────────────────────────────────────────────────────────
-- players: owner accesses players in their team; admin accesses all
-- ─────────────────────────────────────────────────────────
CREATE POLICY "players_owner_access"
  ON players FOR ALL
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "players_admin_access"
  ON players FOR ALL
  USING (is_admin());

-- ─────────────────────────────────────────────────────────
-- payments: owner can read + insert for their team; admin has full access
-- Owners cannot update or delete payments (no accidental tampering)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "payments_owner_read"
  ON payments FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "payments_owner_insert"
  ON payments FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "payments_admin_access"
  ON payments FOR ALL
  USING (is_admin());

-- ─────────────────────────────────────────────────────────
-- audit_logs: admin read only
-- Inserts go through service-role client on the server — never from browser
-- ─────────────────────────────────────────────────────────
CREATE POLICY "al_admin_read"
  ON audit_logs FOR SELECT
  USING (is_admin());
