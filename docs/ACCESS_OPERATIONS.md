# Access, messaging and moderation operations

Implemented locally and deployed to linked development project `rrprjxubfdixoqvquptq` on 28 October 2026. Migrations `20261028030000` through `20261028070000` have been applied in order. Edge Functions `realm-invitations`, `realm-onboarding`, `realm-privacy`, and `realm-worker` are deployed with `verify_jwt: false`. Feature flags `administration`, `account_invitations`, and `privacy_jobs` are active. First platform administrator (`c.lascuna.556171@umindanao.edu.ph`) has been bootstrapped and verified.

## What is implemented

- Private admission (`invited`, `active`, bounded `suspended`, `deleting`), a database-managed platform-admin allowlist, restrictive RLS and guards on old privileged RPCs. Unknown existing identities remain unadmitted until explicitly reviewed. Already-issued JWTs do not bypass the current database state.
- Owner/admin/moderator/member space roles; exact ownership on open spaces; transactional transfer; space/channel names, archives and revisions; authorized rosters; email-bound, hashed, single-use seven-day membership grants. Issuer demotion/removal/leave revokes pending grants. Personal blocks affect only that issuer/recipient pair; an explicit space ban governs exclusion.
- Shared channel/DM server send limits, idempotent RPC sends, stable `(created_at,id)` history, commit-ordered per-stream journals, explicit expired-cursor reset, current-content recovery, revisioned edits/removal and tombstones. Journals contain IDs and operations, never previous bodies. The compatible channel insert route remains subject to the same guard and quota; raw edits/deletes are denied.
- Monotonic read positions, body-free counts and author/block projections. The frontend records positions when the message end is reached in a visible thread, including messages taller than the viewport. Account/stream drafts survive switching and a late send does not overwrite a newer draft. Realtime is a hint; periodic authenticated reconciliation remains authoritative.
- Bounded, deduplicated message/user reports, atomic report-before-block, separate space/platform queues, revisioned case claims and role-protected removals/mutes/bans/suspension. Staff-target cases go to platform review, including after later promotion. Reviewers receive captured evidence, never an unrestricted DM browser.
- Reauthenticated own-data requests, private 15-minute JSON exports, requester authorization again at download, seven-day cancellable deletion, bounded resumable worker batches and an Auth-deletion retry lease. Profile/theme/home data and authored bodies are removed; shared tombstones and peer-authored contributions survive. Explicitly closed spaces become permanently archived and may have no owner after deletion; other open spaces must retain exactly one owner.
- Evidence and case audit expire by the earlier of original capture +90 days or closure +30 days. Deletion does not extend this deadline. Account identifiers in retained evidence are redacted where captured profile/email fields occur; retained UUIDs remain pseudonymous, not anonymous. Private evidence never enters normal history, realtime, search or exports.

## Operator inputs and bootstrap

Supply the reviewed existing account IDs, initial platform-admin ID, exact development/staging/release origins, verified sender/SMTP credentials, pilot budgets and scheduler configuration. Keep service keys in server/test environments only.

1. Back up the target and rehearse restoration in a disposable project. Inspect existing spaces: each must have exactly one reviewed owner before migration `20261028030000`; ambiguous ownership aborts the migration. Review Auth identities rather than admitting all Auth rows.
2. Apply the additive migrations in order to a dedicated test project first. They move `pgcrypto` into `extensions` for qualified crypto calls. Check existing consumers if that extension was previously installed in another schema. All private routines have pinned search paths and explicit grants.
3. Copy `supabase/operator/bootstrap.sql` to private operator scratch, insert the reviewed IDs and administrator ID, and run it using trusted SQL tooling. The committed template intentionally fails without those inputs. It does not modify profiles, homes or theme preferences. Do not commit the reviewed identity list.
4. Administration, account invitations and privacy processing default to `false` in `realm_private.settings`. These flags do not exempt old routes from admission, archive, mute or quota enforcement. Use trusted SQL to enable one configured/tested slice at a time. Setting/grant/state changes are audited automatically. Never grant browser roles direct write access to private tables.

Space administration also enables report submission/review. Verify the retention scheduler and monitoring before enabling it. Example configuration command, only after the corresponding verification gate passes:

```sql
update realm_private.settings set value='true'::jsonb where key='administration';
-- Enable account_invitations and privacy_jobs separately after mail/job rehearsals.
```

Initial private limits are 10 sends/10 seconds plus 120/minute across channels and DMs, 4,000 characters, 30 pending friends with 30 new requests/hour, five membership invitations/hour and 20 pending/space, ten platform invitations/day, five reports/hour, two owned spaces, ten active channels/space, two privacy requests/day, at most five worker jobs/batch, 10,000 export rows and 5 MiB per artifact. Exports above budget fail safely for operator review. These are pilot proposals, not measured capacity or provider guarantees. Existing five-person homes, ten catalog objects and 150 ms movement interval remain unchanged.

## Auth, email and origins

Local Vite binds `127.0.0.1:5175` with a strict port. The committed local Supabase configuration disables signup, enables email confirmation, uses a 12-character password minimum, a 60-second mail cooldown, captured local SMTP and invitation/recovery templates. This is **not** evidence of hosted settings. Inspect hosted Auth signup, confirmations, provider limits, redirect allowlists and SMTP independently; do not push the entire local config to the linked project.

The installed SDK remains `@supabase/supabase-js` **2.49.8** (Auth **2.69.1**). The chosen flow is explicit implicit-token handling, with `detectSessionInUrl:false`; `/auth/callback` processes only invitation/recovery tokens before account hydration. It also accepts the SDK's `verifyOtp` token-hash form. This is not a PKCE implementation. Tokens are removed from the URL before app requests, continuation is scoped to the current verified user in session storage, and the document sets `Referrer-Policy:no-referrer`. Hosting logs must redact callback query strings and never capture bearer/reset/invite links.

`realm-invitations` verifies the human through `Auth.getUser`, then checks the current database platform grant. It records the hashed application grant, calls `admin.inviteUserByEmail` and separately records provider request success/failure. `sent` means the provider accepted the request; inbox delivery and account acceptance are separate. Replacing an invitation revokes its previous application grant. Supabase's behavior when resending to an existing invited identity still needs a captured-mail rehearsal; a rejected resend is recorded as failed, never reported as delivered.

`realm-onboarding` verifies the user, validates the bound invitation, performs the password update through the user's supported Auth API, then admits through a service-only completion RPC. Clients cannot attest that password setup succeeded. `accept_account` is not executable by browser roles. Verified email, current issuer authority, expiry, revocation and one-time use are checked in the database. Recovery uses a neutral email request response and the verified callback followed by password update; it never grants application admission or membership.

Allow only exact origins in `REALM_ALLOWED_ORIGINS`. In Auth's redirect allowlist, permit `/auth/callback?flow=recovery` and the invitation callback with a **query-token-only** pattern on each explicit origin. Do not use a wildcard hostname. See the local config for development examples. The normal mail templates use `ConfirmationURL`; verify preservation of the application `admission` grant end to end before enabling invitations.

Before live mail, use captured local mail or dedicated test inboxes to exercise initial invitation, password setup, resend, revoked/expired/reused/malformed links, reload, recovery, cancellation and a second device/browser. Mock responses do not establish actual mail delivery or provider rate-limit behavior.

## Edge and background processing

Deploy `realm-invitations`, `realm-onboarding`, `realm-privacy` and `realm-worker` only when authorized. Their handlers perform explicit authentication; gateway JWT checks are disabled in config so supported current Auth verification owns the boundary. The scheduler endpoint uses its own high-entropy `REALM_WORKER_SECRET`. Set exact origins and server secrets from `supabase/functions/.env.example`, never a browser environment file.

Schedule the worker with a trusted scheduler and a POST bearer secret. A cadence of at most one minute keeps the retention sweep timely; choose and monitor it before enabling privacy jobs. No scheduler was installed in this implementation. The worker always purges expired evidence/artifacts before processing jobs; run the sweep even if privacy job creation is disabled. Alert on missed sweeps, server failures and processing leases older than expected. A database TTL cannot erase a physical row without a running sweeper: queue APIs hide expired evidence immediately, but actual deletion requires this operational job. Do not promise an absolute physical purge deadline until the scheduler and monitoring have been exercised.

Exports are stored privately in `realm_private.export_artifacts`, with no public storage path or transferable signed URL. `realm-privacy` verifies the caller and invokes the download RPC with that caller's JWT, checking ownership and a password-authentication event within five minutes again. The download is a `no-store` attachment. The worker checks row and byte budgets and processes at most five jobs per call.

Deletion requests wait seven days and can be cancelled, with recent password authentication, before the deadline. Processing marks the account `deleting`, ends visits, closes only explicitly authorized owned spaces, and returns a leased Auth-delete task. Auth deletion scrubs content in the same transaction that removes identity rows. A crash before/after the external Auth call is retried safely; an already-missing Auth user completes the existing job. Failed jobs show a neutral operator-review message. After resolving a failure, trusted tooling may requeue that job; preserve its original creation/deletion/evidence deadlines and audit the intervention. No force-delete/cascade rollback is provided.

## Verification commands and evidence

```powershell
pnpm typecheck
pnpm test
pnpm test:database
pnpm build
npx --yes deno task --config supabase/functions/deno.json check
npx --yes deno task --config supabase/functions/deno.json test
# With the Vite server running and Chrome installed:
pnpm test:access:ui
```

The database runner uses PGlite's PostgreSQL engine and actual `pgcrypto`, role grants, RLS and functions. It runs rollback-only `social_homes.sql`, `access_messaging.sql` and `access_boundaries.sql` against a Supabase-shaped Auth shim. It does not emulate real GoTrue, HTTP, separate concurrent connections or Supabase Realtime. The UI script intercepts every provider request and uses shared simulated server fixtures for two browser contexts; screenshots are under ignored `.impeccable/access-review/`. It is frontend contract evidence, not real Auth/realtime evidence.

For real integration, supply a **dedicated disposable project** and server-only credentials. Install `supabase/tests/integration_fixture_support.sql` only there, run `pnpm test:access:integration` with `REALM_TEST_PROJECT_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and remove both test-only functions afterward. The support script explicitly enables administration/privacy on that disposable project. The suite provisions five test identities, checks concurrent redemption/retries/transfer, shared quota boundaries across raw REST/channel/DM sends, journal gaps, revisions, suspended JWTs, scoped reporting and private exports; it cleans up its fixtures. It sends no mail. The older social/foundation suites now also require an explicit dedicated-test URL and reviewed fixture admission.

Still required before release: real Auth/realtime and multi-connection concurrency, actual mail/callback delivery, scheduler/expiry and deletion retry rehearsal, backup/restore, five-person usage/cost/latency measurement, broader assistive-technology testing and independent visible QA. Missing external checks leave roadmap items 1, 2 and 6 unclosed at their full definition of done.

Independent review was requested through `D:\AgentTeam\Invoke-QA.ps1` after local verification, but dispatch was blocked because this project has no registered visible team session (`Start My Team.cmd`). No independent verdict exists. The request and dispatch receipt are saved in ignored `.impeccable/access-review/`; automated/builder checks are not a substitute.

## Compatible rollout and recovery

Ship guards/schema and reviewed admission first, server operations next, and the matching frontend next; enable each configured slice after checks. Old channel clients are guarded, not exempt. After the new route is proven in the target environment, explicitly retire the old insert grant:

```sql
revoke insert(channel_id,author_id,client_id,body) on public.messages from authenticated;
```

During rollback disable the feature flags and pause new invitations/jobs. Keep admission, limits, restrictions, private evidence and tombstone migrations intact; rolling back to an unguarded database would reopen bypasses. An old frontend may continue guarded sends while its column grant remains, or be deliberately rejected after retirement. Restore from a tested backup only under an operator recovery procedure; do not recreate message/participant cascade deletion. Deployment, hosted changes, actual mail and provider purchases require separate authorization.

Primary API references: [Admin invitations](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), [password recovery](https://supabase.com/docs/guides/auth/passwords). Compatibility was also checked against the installed SDK source.
