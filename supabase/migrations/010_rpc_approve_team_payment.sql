/**
 * RPC: approve_team_payment
 *
 * Atomically:
 *   1. Locks tournament_config row (prevents concurrent over-confirmation)
 *   2. Counts confirmed teams
 *   3. Approves the payment
 *   4. Confirms the team (if slot available) or waitlists it (if full)
 *
 * Returns: 'confirmed' | 'waitlisted'
 */
CREATE OR REPLACE FUNCTION approve_team_payment(
  p_payment_id  UUID,
  p_admin_id    UUID,
  p_review_note TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id       UUID;
  v_max_teams     INT;
  v_confirmed     INT;
  v_outcome       TEXT;
BEGIN
  -- Get the team linked to this payment
  SELECT team_id INTO v_team_id
  FROM payments
  WHERE id = p_payment_id AND payment_type = 'team';

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Payment not found or not a team payment: %', p_payment_id;
  END IF;

  -- Lock the tournament config row to prevent concurrent approvals
  SELECT max_teams INTO v_max_teams
  FROM tournament_config
  FOR UPDATE;

  -- Count currently confirmed teams
  SELECT COUNT(*) INTO v_confirmed
  FROM teams
  WHERE status = 'confirmed';

  -- Approve the payment
  UPDATE payments
  SET
    status      = 'approved',
    reviewer_id = p_admin_id,
    reviewed_at = now(),
    review_note = p_review_note,
    updated_at  = now()
  WHERE id = p_payment_id;

  -- Confirm or waitlist based on available slots
  IF v_confirmed < v_max_teams THEN
    UPDATE teams
    SET
      status       = 'confirmed',
      confirmed_at = now(),
      updated_at   = now()
    WHERE id = v_team_id;

    v_outcome := 'confirmed';
  ELSE
    UPDATE teams
    SET
      status     = 'waitlisted',
      updated_at = now()
    WHERE id = v_team_id;

    v_outcome := 'waitlisted';
  END IF;

  RETURN v_outcome;
END;
$$;
