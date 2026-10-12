/**
 * RPC: add_players_batch
 *
 * Atomically:
 *   1. Locks the team row
 *   2. Checks active player count + new batch fits within max_players_per_team
 *   3. Resolves effective DUPR for all new players
 *   4. Checks cumulative DUPR of existing + new players <= dupr_cap
 *   5. Inserts all players, or rolls back the entire batch
 *
 * Returns: inserted player rows as JSON[]
 */
CREATE OR REPLACE FUNCTION add_players_batch(
  p_team_id UUID,
  p_players JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_players       INT;
  v_active_count      INT;
  v_dupr_cap          NUMERIC;
  v_no_dupr_rating    NUMERIC;
  v_existing_dupr     NUMERIC := 0;
  v_new_dupr          NUMERIC := 0;
  v_player            JSONB;
  v_effective_rating  NUMERIC;
  v_inserted          JSONB := '[]'::JSONB;
  v_new_player_id     UUID;
BEGIN
  -- Lock the team row to prevent concurrent additions
  PERFORM id FROM teams WHERE id = p_team_id FOR UPDATE;

  -- Load config
  SELECT max_players_per_team, dupr_cap, no_dupr_rating
  INTO v_max_players, v_dupr_cap, v_no_dupr_rating
  FROM tournament_config;

  -- Count active (non-removed, non-rejected) players
  SELECT COUNT(*) INTO v_active_count
  FROM players
  WHERE team_id = p_team_id
    AND status NOT IN ('removed', 'rejected');

  IF v_active_count + jsonb_array_length(p_players) > v_max_players THEN
    RAISE EXCEPTION 'Adding % player(s) would exceed the team limit of %. Current active: %.',
      jsonb_array_length(p_players), v_max_players, v_active_count;
  END IF;

  -- Sum existing confirmed players' effective DUPR
  SELECT COALESCE(SUM(
    CASE
      WHEN rating_status = 'no_dupr'  THEN v_no_dupr_rating
      WHEN rating_status = 'verified' THEN verified_rating
      ELSE NULL  -- pending/disputed → unresolved
    END
  ), 0) INTO v_existing_dupr
  FROM players
  WHERE team_id = p_team_id
    AND status IN ('confirmed', 'pending_review', 'pending_payment');

  -- Check for NULL (unresolved existing ratings)
  IF v_existing_dupr IS NULL THEN
    RAISE EXCEPTION 'Existing roster has unresolved DUPR ratings. Resolve them before adding players.';
  END IF;

  -- Validate and sum new players' effective DUPR
  FOR v_player IN SELECT * FROM jsonb_array_elements(p_players)
  LOOP
    v_effective_rating := CASE
      WHEN v_player->>'rating_status' = 'no_dupr'  THEN v_no_dupr_rating
      WHEN v_player->>'rating_status' = 'verified' THEN (v_player->>'submitted_rating')::NUMERIC
      ELSE NULL
    END;

    IF v_effective_rating IS NULL THEN
      RAISE EXCEPTION 'Player "%" has an unresolved DUPR rating status: %. Classify all players before adding.',
        v_player->>'name', v_player->>'rating_status';
    END IF;

    v_new_dupr := v_new_dupr + v_effective_rating;
  END LOOP;

  IF v_existing_dupr + v_new_dupr > v_dupr_cap THEN
    RAISE EXCEPTION 'Adding these players would exceed the DUPR cap of %. Existing: %, Adding: %, Total: %.',
      v_dupr_cap, v_existing_dupr, v_new_dupr, v_existing_dupr + v_new_dupr;
  END IF;

  -- Insert all players atomically
  FOR v_player IN SELECT * FROM jsonb_array_elements(p_players)
  LOOP
    INSERT INTO players (
      team_id,
      name,
      phone,
      email,
      dupr_id,
      submitted_rating,
      rating_status,
      status
    ) VALUES (
      p_team_id,
      v_player->>'name',
      v_player->>'phone',
      v_player->>'email',
      v_player->>'dupr_id',
      (v_player->>'submitted_rating')::NUMERIC,
      v_player->>'rating_status',
      'pending_payment'
    )
    RETURNING id INTO v_new_player_id;

    v_inserted := v_inserted || jsonb_build_object('id', v_new_player_id);
  END LOOP;

  RETURN v_inserted;
END;
$$;
