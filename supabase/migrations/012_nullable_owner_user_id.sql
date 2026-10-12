-- Pending team slots (created by admin when generating a registration link)
-- have no owner yet. Allow owner_user_id to be NULL until the owner completes
-- registration via the private link.
--
-- The FK constraint is preserved: non-null values are still validated against
-- auth.users. The RLS policy (owner_user_id = auth.uid()) continues to work
-- correctly — NULL never matches, so unowned slots are invisible to owners
-- and only accessible to admins via the admin policy.

ALTER TABLE teams ALTER COLUMN owner_user_id DROP NOT NULL;
