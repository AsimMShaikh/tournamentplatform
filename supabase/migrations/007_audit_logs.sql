CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID,                             -- auth.users id; null = system action
  actor_type  TEXT NOT NULL
    CHECK (actor_type IN ('admin', 'owner', 'system')),
  action      TEXT NOT NULL,
  -- Examples: 'payment.approved', 'payment.rejected', 'team.confirmed',
  --           'team.waitlisted', 'player.removed', 'rating.verified'
  entity_type TEXT NOT NULL,                   -- 'team' | 'player' | 'payment'
  entity_id   UUID NOT NULL,
  details     JSONB,                           -- structured context (old/new values, reason)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at: audit logs are append-only, never modified
);

CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_actor_idx  ON audit_logs (actor_id);
CREATE INDEX audit_logs_time_idx   ON audit_logs (created_at DESC);
