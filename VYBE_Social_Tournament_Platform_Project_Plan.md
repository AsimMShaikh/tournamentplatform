# VYBE Social Tournament Platform

## Project Plan and Architecture Blueprint

**Status:** Pre-implementation plan\
**Brand:** VYBE Social\
**Tagline:** Sports. Community. Experiences.\
**Initial event:** Bring Your Own Team (BYOT), 21 October 2026

## 1. Objective

Build a secure registration and payment-verification system for the
first tournament, with an architecture that can later support fixture
generation, scoring, standings, court scheduling, and different
tournament formats without rebuilding the registration system.

**Recommended stack:** Next.js App Router + TypeScript, Vercel hosting,
Supabase PostgreSQL/Auth/Storage, GitHub, Tailwind CSS. Use a modular
monolith initially, with explicit domain boundaries rather than separate
services.

## 2. MVP Scope

-   Public tournament information and rules.
-   Team owner sign-in through phone OTP.
-   Team creation and owner dashboard.
-   Team payment of ₹7,000 using UPI QR and screenshot/reference upload.
-   Admin manually reviews and approves/rejects team payment.
-   A team slot is reserved only after team payment approval.
-   Player registration individually or in batches.
-   Each player pays ₹650 separately, with their own payment proof and
    review status.
-   Maximum 8 confirmed teams and 8 active players per team.
-   Cumulative team DUPR limit of 30.0.
-   Admin rating verification, audit logs, private payment-proof
    storage.
-   Waitlist/rejection/refund workflow if capacity is exhausted.

**Not in the MVP:** automatic payment gateway, automatic DUPR
integration, fixture generation, live scoring, court scheduling, public
leaderboard, multi-organization SaaS administration.

## 3. Initial Tournament Configuration

  Setting                           Value
  --------------------------------- ----------------------------------
  Tournament                        Bring Your Own Team
  Event date                        21 October 2026
  Maximum teams                     8
  Maximum players per team          8
  Team fee                          ₹7,000
  Player fee                        ₹650 per player
  Cumulative DUPR cap               30.0
  Rating cutoff date                1 October 2026
  No-DUPR rating for calculations   3.75
  Payment method                    UPI QR + screenshot/reference
  Payment review                    Manual
  Owner authentication              Phone OTP
  Team slot reservation             After team payment approval only

### DUPR rules

-   Use ratings as of 1 October 2026.
-   If a player has multiple DUPR IDs, use the highest applicable rating
    after admin verification.
-   Explicitly classified no-DUPR players count as 3.75.
-   If a DUPR ID exists but the cutoff-date rating is not verified, the
    effective rating remains unresolved. Do not silently classify the
    player as no-DUPR.
-   Block additions/confirmation if the cumulative rating exceeds 30.0.
-   Keep submitted ratings separate from verified ratings and audit
    admin decisions.

## 4. Roles

**Public visitor:** View event details, rules, eligibility and fees.

**Team owner:** Authenticate by phone OTP; manage their own team; submit
team proof; add players individually or in batches; submit separate
proof per player; see statuses and validation errors. Cannot approve
payments or verify their own ratings.

**Admin:** Review payments, approve/reject with notes, verify ratings,
manage waitlist/replacements/cancellations, view audit logs. Later,
administer fixtures, scoring and standings.

## 5. Suggested Routes

-   `/` --- public tournament landing page
-   `/rules` --- rules and eligibility
-   `/register/team` --- team registration
-   `/register/player` --- player registration entry point
-   `/auth/login` --- phone OTP
-   `/auth/callback` --- auth callback if needed
-   `/owner/dashboard` --- owner overview
-   `/owner/teams/[teamId]` --- team, players, payments and statuses
-   `/admin` --- admin overview
-   `/admin/payments` --- payment review queue
-   `/admin/teams/[teamId]` --- team/player review
-   `/api/uploads` --- upload endpoint if required
-   `/api/webhooks/*` --- reserved for future integrations

Authorization must be enforced server-side, not just by hiding UI
controls.

## 6. Database Blueprint

Use UUID keys, timestamps, and version-controlled SQL migrations.

### `tournament_config`

Initial singleton configuration: name/date, maximum teams and players,
DUPR cap, no-DUPR rating, rating cutoff, fees in paise, and
tournament/registration status. When multiple tournaments are supported,
replace the singleton assumption with a proper `tournaments` table and
tournament-scoped records.

### `admin_users`

Supabase Auth user ID and role/status fields.

### `teams`

`id`, unique `team_code`, `team_name`, `owner_user_id`, owner
name/phone/email, status (`pending_payment`, `pending_review`,
`confirmed`, `waitlisted`, `rejected`, `cancelled`), `confirmed_at`,
timestamps.

### `players`

`id`, `team_id`, name/contact, `dupr_id`, `submitted_rating`,
`verified_rating`, `rating_status` (`pending`, `verified`, `no_dupr`,
`disputed`), player status (`pending_payment`, `pending_review`,
`confirmed`, `rejected`, `removed`), timestamps.

### `payments`

`id`, `team_id`, nullable `player_id`, `payment_type` (`team`,
`player`), `amount_paise`, private `screenshot_path`, transaction
reference, status (`submitted`, `approved`, `rejected`, `refund_due`,
`refunded`), reviewer, review timestamp/note, creation timestamp.

Constraints: team payment has no player ID and amount 700000 paise;
player payment requires a player ID and amount 65000 paise. Enforce that
a payment's player belongs to the same team. Prevent duplicate
active/approved payment obligations and preserve payment history.

### `audit_logs`

Actor ID, action, entity type/ID, structured JSON details and timestamp.

### Future tournament tables

`tournaments`, versioned `format_config`/rules, `groups`, group
memberships, `fixtures`/`ties`, `matches`, participants, scores/results,
standings or cached standings, courts, court assignments, referee
assignments and published results.

Use relational tables for entities requiring integrity, querying and
reporting. Use JSON configuration for genuinely variable rules, not as a
substitute for all relational structure.

## 7. Eligibility, Capacity and Transactions

An effective DUPR calculation should return: - `3.75` for explicitly
classified no-DUPR players; - verified rating when status is verified
and the value exists; - `null` for unresolved or disputed ratings.

A team with an unresolved active-player rating cannot pass cumulative
DUPR validation.

**Team capacity:** During team-payment approval, lock a shared
tournament/configuration row with `FOR UPDATE`, check confirmed-team
count and confirm the team in the same database transaction. If all 8
slots are taken, waitlist or reject/refund according to the published
policy.

**Player capacity:** Lock the team row, check active roster count and
cumulative DUPR, then insert the entire batch in one transaction. Batch
additions are atomic: all pass or none are inserted.

Do not rely on frontend-only checks. Use database functions/RPCs or
carefully designed server-side transactions, and make operations
idempotent where retries could create duplicates.

Suggested domain operations: `createTeamRegistration()`,
`submitTeamPaymentProof()`, `addPlayer()`, `addPlayersBatch()`,
`submitPlayerPaymentProof()`, `replacePlayer()`, `removePlayer()`,
`approvePayment()`, `rejectPayment()`, `verifyPlayerRating()`.

## 8. Security

-   Enable RLS on all exposed tables.
-   Owners can access only their own team and related records; admins
    require explicit authorization.
-   Keep the Supabase service-role key server-only; never expose it via
    `NEXT_PUBLIC_`.
-   Prefer server-side mutations for sensitive operations.
-   Keep payment proofs in a private storage bucket with short-lived
    signed URLs for authorized review.
-   Restrict upload size and file types; validate content, not just
    extension.
-   Normalize phone numbers to E.164 and configure OTP abuse/rate
    limits.
-   Audit payment decisions, rating verification, confirmation,
    replacement and cancellation.
-   Collect only necessary personal data and define payment-proof
    retention.
-   Use separate development/test and production environments where
    practical.

## 9. Payment Workflow

1.  Owner creates a team draft.
2.  App displays UPI QR and ₹7,000 fee.
3.  Owner submits reference and screenshot.
4.  Payment enters review queue.
5.  Admin approves/rejects with a note.
6.  Approval transaction checks capacity and confirms team.
7.  If capacity is exhausted, apply published waitlist/refund policy;
    never confirm a ninth team.
8.  Owner adds players individually or in a batch.
9.  Each player has a separate ₹650 payment obligation and proof.
10. Admin reviews each player payment independently.
11. Player confirmation requires payment approval and eligibility checks
    according to policy.

Payment approval and team confirmation should be one transaction or a
recoverable workflow to avoid inconsistent states.

## 10. Extensibility: Tournament Engine

Keep registration/payments separate from tournament operations.
Tournament-specific limits and rules should be configuration/policy data
rather than hardcoded across the application.

Format configuration should eventually describe: - team or individual
format, roster size and roster-lock date; - eligibility rules; - group
count/size and qualification rules; - fixture generation strategy; - tie
structure and matches per tie; - match scoring and points awarded; -
standings and tie-breaker order; - bracket mapping; - courts/time
slots; - substitutions and match eligibility.

Potential future formats: round robin, groups plus knockout, single
elimination, double elimination, league tables, and team ties with
multiple doubles/singles matches or weighted matches.

Design principles: - Store authoritative match results with
creator/verifier and timestamps. - Calculate standings from recorded
results using a versioned ruleset. - Separate fixture generation from
fixture storage; allow review before publication. - Avoid silently
rewriting published fixtures when registrations change. - Audit score
corrections and recalculate standings from authoritative results. -
Expose public scores through read-only published views.

Do not build every format or a generic plugin system now. A modular
monolith and explicit tournament domain are enough. This avoids major
architectural change later without overengineering the MVP.

## 11. Free-Tier and Deployment Plan

### Vercel

Vercel Hobby's published general limit is 200 projects, so a second
project is technically possible under that limit. Each project can have
its own deployment URL and environment variables.

**Important:** Vercel Hobby is restricted to personal, non-commercial
use. Because this platform supports paid tournament registrations and
prize money, verify the current terms and suitability before using Hobby
for the live event. Low traffic does not itself make a use case
eligible.

Official references: - https://vercel.com/docs/limits -
https://vercel.com/docs/plans/hobby - https://vercel.com/legal/terms

### Supabase

Published Free plan allowances include: - 2 active free projects across
organizations where you are owner/admin; paused projects do not count. -
500 MB database per project. - 1 GB file storage. - 5 GB egress. -
50,000 monthly active users. - Free projects may pause after one week of
inactivity.

This is likely sufficient for a small tournament's database and user
count. Payment screenshots and project inactivity are the more practical
constraints. Compress screenshots and set a sensible upload limit.

Official references: -
https://supabase.com/docs/guides/platform/billing-on-supabase -
https://supabase.com/docs/guides/platform/billing-faq -
https://supabase.com/docs/guides/storage/uploads/file-limits

### Other cost considerations

-   GitHub free repository is likely sufficient for source control.
-   Supabase phone OTP requires an SMS provider/configuration; SMS
    delivery may cost money. Do not assume it is free. Test Indian
    delivery and provider pricing before launch.
-   A Vercel default domain can avoid an initial domain purchase; custom
    domains cost extra.
-   Manual UPI proof avoids payment gateway fees but requires careful
    manual review.
-   Keep an export/backup procedure; do not assume free hosting offers
    the recovery guarantees needed for event data.
-   Set usage alerts where available, limit screenshot size, avoid
    duplicate uploads and re-check provider terms/quotas before launch.

## 12. Environment Variables

Example `.env.local`:

``` env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PAYMENT_BUCKET=payment-proofs
```

Use the current Supabase publishable key if available. The service-role
key is server-only and must never be exposed to browser code. Configure
local, preview and production environments separately.

## 13. Milestones

### Milestone 0: Policy decisions

-   Confirm hosting-plan eligibility for a paid event.
-   Confirm OTP/SMS provider and cost.
-   Publish waitlist/refund policy.
-   Decide whether partially filled teams can be confirmed and how
    roster lock works.
-   Define admin access.

### Milestone 1: Foundation

-   Create Git repository and Next.js project.
-   Create Supabase project.
-   Add migrations, generated types, RLS and admin authorization.
-   Configure private payment storage and development seed data.

### Milestone 2: Team registration

-   Phone OTP.
-   Team creation and owner dashboard.
-   Team payment proof upload.
-   Admin review and atomic capacity allocation.

### Milestone 3: Player registration

-   Individual and batch entry.
-   Separate player payments.
-   DUPR verification workflow.
-   Capacity/DUPR checks, replacement/removal and audit trail.

### Milestone 4: Admin and launch

-   Payment queue and team detail screens.
-   Security/authorization tests.
-   Concurrent capacity tests.
-   Export/backup runbook.
-   Mobile testing and production launch checklist.

### Milestone 5: Tournament operations

-   Format configuration and rules version.
-   Group allocation and fixture generation.
-   Fixture review/publication.
-   Score entry/correction.
-   Standings, tie-breakers and public scoreboard.

### Milestone 6: Multiple tournaments

-   Add tournament entity and tournament-scoped records.
-   Reusable format templates.
-   Tournament-specific admins/permissions.
-   Historical results and reusable team/player profiles as needed.

## 14. MVP Acceptance Criteria

-   Owner OTP session accesses only their own team.
-   Team draft does not reserve a slot.
-   Team payment proof is private and reviewable by an admin.
-   Atomic approval can never confirm a ninth team.
-   Individual and batch player registration work.
-   Over-capacity or over-DUPR batches are rejected atomically.
-   Unverified ratings block eligibility when required.
-   No-DUPR players count as 3.75 consistently.
-   Each player has an independent ₹650 payment/review status.
-   Unauthorized users cannot read payment proofs or mutate
    registrations.
-   Admin actions are auditable.
-   Concurrent team approvals and player additions are tested.
-   Mobile screens are usable and no service-role secret is
    client-exposed.

## 15. Key Risks

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  More teams pay than slots available Atomic approval; clear
                                      waitlist/refund policy

  Concurrent approvals overbook teams Lock configuration row in
                                      transaction

  Concurrent player additions exceed  Lock team row and validate/insert
  cap                                 batch transactionally

  Rating is incorrect/disputed        Separate submitted/verified rating
                                      and audit changes

  Payment proof leaks                 Private bucket and short-lived
                                      signed URLs

  OTP costs surprise                  Test provider/pricing before launch

  Free hosting terms do not permit    Verify provider terms before launch
  event use                           

  Future formats require rewrite      Versioned rules and separate
                                      tournament engine

  Score corrections corrupt standings Audit changes and recalculate from
                                      authoritative results
  -----------------------------------------------------------------------

## 16. Recommended Decision

Proceed with **Next.js + Vercel + Supabase** as a modular monolith,
subject to confirming hosting-plan terms for the paid event.

Keep these domains distinct: 1. Identity and authorization 2. Tournament
configuration 3. Team/player registration 4. Eligibility and rating
verification 5. Payments and review 6. Tournament operations 7. Scoring
and standings 8. Audit and reporting

Build only the MVP now, but keep these boundaries explicit. That gives
the first event a manageable implementation and a credible path to a
reusable tournament platform.
