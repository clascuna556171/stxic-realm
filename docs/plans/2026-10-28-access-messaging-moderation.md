# Implementation plan: access, communication administration and moderation

Date: 28 October 2026. Status: proposed plan for roadmap items **1, 2 and 6**; not an implementation or release approval. Baseline inspected: `f9e9785`, clean working tree before this plan. Keep the existing React/Vite/Supabase stack and obsidian interface.

Implementation update, 28 October 2026: the owner subsequently requested implementation. Local schema/server/client changes and checks are recorded in [Access operations](../ACCESS_OPERATIONS.md). Hosted configuration, actual mail/realtime/concurrency, scheduled retention/deletion rehearsal and independent QA remain release gates; this plan's full definition of done is not yet closed.

## Outcome and scope

An invited tester can verify their email, set/recover a password, join an authorized space, read and manage conversations, report abuse and control their data. Owners can manage their own spaces. Platform operators can manage admission and investigate reported abuse without receiving unrestricted access to private conversations.

Included: account invitation/recovery; space and channel administration; membership invitations/roles; channel history and reconnect recovery; unread counts; author edits/deletes; reports and moderation; server-enforced limits; privacy settings, export and deletion workflows. Apply relevant messaging and privacy changes to existing DMs as well as channels.

Keep existing profile/appearance, friendship/blocking, room privacy and draft behavior working. Guestbooks, halls, animation, voice, uploads/attachments, reactions, group DMs and public registration remain outside this plan. Upload and hall-board scope decisions can remain open without blocking these three items.

## Current evidence and gaps

- Channel messages are read as the latest 100 rows in `apps/web/src/data.ts`; `message-repository.ts` inserts directly into `messages`. New limits or mute rules must cover that old write route until it is explicitly revoked.
- The foundation has `spaces`, `space_members`, `channels` and `messages`, but membership roles are currently owner/admin/member and clients cannot provision these records. Existing policies expose only a caller's own membership row, so a new authorized roster API is needed.
- DMs already support earlier-history loading, idempotent sends and realtime hints. Their subscription currently listens only for inserts; edits/deletes need additional recovery support.
- Blocking, private themes, account appearance, home validation, movement throttling and home visitor limits already exist. Extend these controls rather than replacing them.
- `supabase/config.toml` currently sets local signup on, email confirmation off and redirects to port 3000. This is **local configuration evidence**, not proof of the hosted project's current settings. Inspect hosted settings separately before changing them.
- Auth users currently bootstrap profiles/homes immediately. Invitation acceptance and suspension therefore need an application admission check, not merely a hidden signup button.
- Auth deletion currently cascades through profiles, authored messages and direct conversations. Design data-preserving deletion migrations before enabling a user-facing delete action.

## Proposed product rules

These defaults make the plan buildable and can be changed during review.

| Area | Proposed first-version rule |
| --- | --- |
| Account admission | Closed alpha. Platform admin invites new accounts; public signup remains disabled. Existing legitimate accounts are backfilled as active. |
| Platform authority | A server-managed platform-admin allowlist, seeded through trusted tooling. It is separate from every space role; client-editable metadata never grants it. |
| Space authority | One owner per space, then admin, moderator and member. New membership invitations grant member only. |
| Roles | Owner transfers ownership and manages admins; admins manage channels and ordinary membership; moderators review reports, remove ordinary-member content and issue bounded mutes. No self-promotion or action against higher/equal administrative authority. |
| Membership invitations | Single-use, expiring, email-bound grants, revocable before acceptance. A space invitation alone cannot create a global account. |
| Channel visibility | All channels in this slice inherit active space membership. Existing history is visible to current members. Private per-channel ACLs are deferred. |
| Unread state | New members start at the current message position; previous visible history is not automatically counted unread. Reading marks only the messages actually reached, not simply opening a page. |
| Message changes | Authors can edit their own nonremoved messages and remove their own content. Edits carry an edited label and expected revision; deletion leaves a tombstone. Both channels and DMs follow this rule. |
| Blocking | Preserve existing DM/friend/home denial. In shared spaces hide blocked authors' content in the viewer's normal message projection; do not remove either user's space membership or grant moderators access to DMs. Counts and mention previews respect this projection. |
| Reporting DMs | A participant can submit bounded evidence from a message they are authorized to read. Platform reviewers see only that report/evidence, not a browsable DM inbox. Space moderators cannot read DM reports. |
| Suspension | A space restriction applies within that space. Platform suspension denies new application reads/writes/visits even with an already-issued JWT; recovery/export/deletion requests have narrowly scoped self-service endpoints. |
| Privacy | No new activity/game sharing. Home private/friends controls stay available, and private themes remain private. |

Inviting someone to Realm, inviting them into a space and accepting a friend request remain distinct actions. Recovery verifies account ownership; it never restores a revoked membership or bypasses a suspension.

## Delivery order

**A. Permission and limit foundation -> B. Account invitations/recovery -> C. Spaces/channels/membership -> D. Message history and controls -> E. Reports/privacy operations -> F. Integrated verification.**

Item 6 starts in A because moderation and limits cannot safely be bolted on after granting administration or sending invitations. Email setup can proceed alongside schema work; message recovery design can proceed once the permission model is fixed.

### A — Permission and limit foundation

1. Add private account-admission state (invited/active/suspended/deleting), platform-admin grants, scoped moderation restrictions, mutation audit records and atomic rate/usage counters. Backfill only an operator-reviewed list of existing legitimate account IDs as active, without changing their private preferences or homes; quarantine unknown pre-existing identities for review rather than admitting every Auth row.
2. Extend shared permission helpers so admission, suspension, membership, blocking and mutes are checked at the trusted database/Edge boundary. Apply active-account checks to existing profiles, themes, friends, DMs, homes and visit RPCs, not just the new admin screens.
3. Keep privileged routines in the unexposed private schema with pinned search paths and narrow invoker wrappers. Add server-only Edge Functions for Auth-admin, mail and export/deletion jobs. Verify callers through supported Auth APIs and the current database grant, not a decoded role string.
4. Centralize limits in private configuration. Enforce them transactionally; frontend disabled controls only explain the result. Use provider-side Auth limits for public Auth endpoints too: an app proxy alone would be bypassable.
5. Add minimum audit events for invitations, membership/role changes, restrictions, moderator removal, export/deletion requests and operator actions. Logs exclude credentials, raw invite/reset links, access tokens and unnecessary message bodies.
6. Ship guards for existing channel direct inserts first, then move clients to authorized RPCs. Keep the temporary old route subject to the same checks; revoke it only after the new client path is validated. Old clients must be gated or rejected, never exempt from new limits.

**Acceptance:** ordinary users cannot self-promote or call admin actions; a space admin is not a platform admin; suspended users' existing sessions fail new protected reads/writes; concurrent requests cannot exceed a limit; direct REST insert/update/delete attempts do not bypass controls. Existing active users and local anonymous previews retain their intended behavior.

### B — Account invitations, email verification and recovery

1. Choose a fixed development origin (current app uses `http://127.0.0.1:5175`) and strict port behavior. Add explicit callback routes and separate allowlisted local/staging/release origins. Reconcile local signup/email-confirmation settings and verify hosted settings; do not blindly push the whole local config to the linked project.
2. Configure a working mail sender, invitation/recovery templates and the redirect allowlist. Use local captured mail or dedicated test inboxes before any real invitation. Record delivery success/failure separately from invitation acceptance.
3. Build a platform-admin invitation screen and server-only invitation operation using Supabase Auth's supported admin flow. Keep the privileged key out of browser bundles. Record target, issuer, state, expiry/revocation and limited delivery metadata privately. Application admission must still reject a revoked/expired invitation even if an Auth identity was already created.
4. Add invite acceptance, verified-email handling, initial password setup and a short onboarding continuation. Process invite/recovery callbacks before normal account hydration/chat routing. Choose and test the callback/token flow supported by the installed SDK; do not assume every flow is PKCE or upgrade the SDK solely to match a newer example.
5. Add Forgot password -> neutral request confirmation -> validated recovery callback -> new password -> success/sign-in. Do not reveal whether an address exists. Handle expired/replayed/malformed links, reload, another browser/device and canceled recovery.
6. Add authorized resend/revoke controls with cooldowns. Never log full links. Verify how Supabase treats older links during resend rather than promising provider behavior that was not tested.
7. Bind admission/redemption to a verified Auth identity on the server. Do not accept a client-provided email or `email_verified`/`password_set` flag as proof. Password setup remains a required onboarding step; application admission follows the verified, valid invitation grant.

**Acceptance:** an invited recipient can complete onboarding and sign in; unrelated, expired, revoked or replayed grants fail; uninvited signup cannot enter the app; existing users can recover access; account enumeration is avoided. Real mail delivery and callbacks must pass before this milestone is declared complete. Auth/SMTP setup is an external prerequisite, not a mocked success.

### C — Spaces, channels and memberships

1. Add Create space; list/switch spaces; rename/archive space; create/rename/archive channels. Archive preserves content but prevents new writes. Hard deletion is not the default management action.
2. Guarantee one owner per space, preserve a last owner and implement transactional ownership transfer. Reconcile any ambiguous existing owner rows before adding constraints. Role checks are read from current database state, so stale browser menus cannot retain authority.
3. Add a permission-filtered member roster, invite existing admitted accounts by verified email, redeem membership invitations, cancel pending invitations, remove members and manage roles. New users first follow the separate platform-admission flow.
4. Issue membership tokens with cryptographic randomness, store only hashes, bind each to its target/space, expire and atomically consume them. Proposed membership expiry is seven days; resending creates a new token and revokes the old application token. Check blocks between the specific issuer and recipient at both issue and redemption, in either direction; deny that direct invitation with a neutral error if blocked. A personal block by an owner or another member is not an implicit space ban: a different authorized issuer may invite the recipient. Only an explicit space ban prevents all re-entry. Revalidate the issuer’s current active account and invitation authority at redemption; losing that authority invalidates their pending grants.
5. Add scoped channel mutes and space bans. A ban prevents re-invitation until explicitly lifted. Require reasons for moderation actions and retain an audit trail. Ordinary members can leave a space; owners must transfer ownership first.
6. When membership/role/archive state changes, invalidate the relevant cached view and recheck permission on the next request. Stop subscriptions and clear protected data after denial. No claim of erasing data a client has already downloaded.

**Acceptance:** owners/admins can manage only authorized spaces; members cannot create channels, invite/promote others or read another space's roster; only a verified target can redeem once; removed/banned users cannot read, post or regain membership with an old invite; last-owner and archive rules survive concurrent operations.

### D — Channel history, reconnects, unread state and message controls

1. Add bounded history APIs with stable cursors and matching indexes. Extend the current `(created_at,id)` ordering for historical pages; use pages such as 50 messages and preserve scroll position when prepending. Do not use timestamp alone.
2. Add a transactionally ordered mutation journal per channel/DM stream for create/edit/delete events. Serialize revision allocation with the stream row held until commit. A random UUID, transaction-start timestamp or free-running sequence alone is not a reliable commit-order watermark.
3. On subscribe/reconnect, reconcile a bounded server high-watermark, replay all authorized events after the last applied revision in pages and merge by message ID/revision. Recover edits/deletes of messages outside the latest page. If a journal cursor has expired, return an explicit reset and fetch a fresh authorized snapshot; never silently skip a gap.
4. Add self-owned per-stream read positions and exact unread counts (no message body previews returned by count APIs). Count new visible messages, not edits/deletes or the reader's own sends. Validate positions belong to the requested authorized stream and are monotonic.
5. Add author edit/delete UI with saving, error and stale-revision states. Tombstones preserve stream continuity; ordinary history/realtime payloads must stop returning removed bodies. Preserve the send-retry ID behavior across both channels and DMs, checking an existing identical retry before charging quota again.
6. Separate normal message content from restricted moderation evidence. Avoid shipping old deleted bodies inside a broadly readable journal. Keep only the minimum event projection needed for recovery; refetch the currently authorized representation when needed.
7. Preserve drafts per stream/account, prevent a late send response from replacing a newer draft and distinguish initial loading, earlier history, reconnecting, revoked access and archived/read-only channels.

**Acceptance:** with more than 100 intervening messages and concurrent equal-timestamp writes, reconnect has no missing/duplicate authorized messages; old loaded messages reflect remote edits/removals; unread counts remain correct across tabs/devices and membership/block changes; archived/muted/nonmember sends fail server-side; retrying a committed message does not consume a second quota unit or create a duplicate.

### E — Reports, moderation, quotas and privacy operations

1. Add Report message/user with a bounded reason and optional note, confirmation and abuse throttles. The server validates the reporter's relationship/access before capturing minimal evidence. Implement Report and block as one trusted operation so the current block behavior does not prevent reporting the abusive DM.
2. Add a queue for space owner/admin/moderator and a separate platform queue for reported DMs/global account issues. States: open, reviewing, actioned, dismissed. Dedupe repeated reports and use expected revisions/claiming to prevent conflicting reviewer decisions.
3. Support removal of reported content, bounded mutes, space bans and platform suspension with reasons, scope, expiry and audit history. Space staff cannot suspend global accounts or browse private DMs. Protect higher/equal-role targets and the last owner; route complaints about space staff to platform review.
4. Add a minimal privacy settings page for existing blocks/home privacy plus data export and account-deletion requests. Export only the requester's own profile/preferences/home/relationships and authored content; do not restore access to someone else's hidden DM history or include credentials, private themes belonging to others, or internal moderation evidence.
5. Generate exports in a private, expiring download workflow after current-user authorization and recent reauthentication. Require ownership again at download, use short-lived access, log creation/download without content and expire the artifact. Do not export to public storage or email attachments by default.
6. Implement account deletion as a resumable, audited job with a seven-day proposed cancellation period. Require recent reauthentication for request/cancellation. Revoke app access/visits when processing begins and handle owned spaces by ownership transfer or an explicitly confirmed space closure.
7. Before enabling deletion, migrate the existing cascade relationships. Proposed behavior: remove private profile/theme/home data and the user's message bodies from ordinary app data, subject to the narrowly retained report-evidence exception below; leave author/content tombstones in shared streams, preserve other people's contributions and retain only a minimal deleted participant reference. Any retained peer-authored DM history remains available only to that peer's export, not to normal messaging or new participants. This is an explicit proposed exception to the current friendship-only DM-history rule, not a silent side effect of deleting Auth rows.
8. Resolve deletion versus investigation explicitly: an already-captured, relevant report-evidence copy may survive account deletion inside the restricted case queue. It is not returned by ordinary history, realtime, account exports or search. Redact account email, handle and profile details unless essential to that case; keep only the necessary pseudonymous actor reference and bounded content/context. This is not a promise that retained evidence is anonymous.
9. Proposed evidence/report/moderation-audit retention: delete at the earlier of **90 days from original capture** or **30 days after case closure**. Account deletion does not reset or extend this clock. Open cases still expire at the original 90-day cap. Evidence containing another participant's words follows the same access/minimization/deadline rule; it is not republished or made part of a peer's export. No indefinite hold is included in this pilot. Purge timers and failing/retried deletion jobs must enforce the absolute cap.
10. Disclose this exception before a deletion request: normal profile/content is removed, but already-reported material may remain briefly for abuse investigation. If no relevant report evidence exists, there is no retained-content exception. Apply the same finite retention discipline to other audit data and expire exports/counters/invitations. These are proposed product rules for owner review before activation, not legal-compliance guarantees.

**Acceptance:** outsiders cannot file evidence about inaccessible messages or read queues; space staff cannot read DM evidence; a participant can report then block; expired restrictions stop applying; suspension blocks old sessions at the application boundary; export/deletion jobs are idempotent and resumable; deletion does not cascade away another user's messages or orphan owned spaces; retained evidence is isolated and expires at its original deadline; another account cannot download an export URL/artifact by changing IDs.

## Limit configuration: starting proposal

Store values server-side, adjustable only through trusted platform tooling and audited when changed. These values are initial proposals for the small pilot, not measured free-tier guarantees.

| Operation | Proposed pilot starting point |
| --- | --- |
| Channel + DM sends | Shared account bucket: 10 in 10 seconds, sustained 120/minute; retain 4,000-character body cap |
| Friend requests | Keep existing 30 pending maximum; add an hourly creation budget |
| Membership invitation creation | 5/hour per issuer and 20 pending per space |
| New account invitations | Platform-only, 10/day plus configured pilot admission budget |
| Reports | 5/hour per reporter, dedupe one open report per reporter/target |
| Space/channel creation | 2 owned spaces/account, 10 active channels/space |
| Recovery/resend | Provider-side Auth/IP/email controls plus app cooldown; validate actual configured provider limits |
| Homes | Preserve existing five occupants, ten catalog objects and 150 ms movement interval in this work |
| History/export | Bounded pages and maximum export jobs/artifact size, calibrated on pilot data before enabling downloads |

Return a clear retry-after or quota explanation, using HTTP 429 for throttling, 403 for denial and 409 for conflicting revisions. Use trusted request context for IP controls, not a body-supplied IP/device ID. Do not count an accepted idempotent retry twice. Set alerts and test the five-person workload before freezing sustained/storage/export budgets.

## Data/API and source map

| Area | Planned schema/service additions | Main owning sources |
| --- | --- | --- |
| Admission/Auth | Private platform grants/account state/invite audit; server-only Auth invitation endpoint; callback/recovery forms | `supabase/functions/`, new migrations, `apps/web/src/Account.tsx`, `main.tsx`, `App.tsx`, `supabase/config.toml` |
| Space administration | Membership invitations, role/archive/restriction fields and trusted create/manage/redeem RPCs | New migrations, new space repository/views, `App.tsx`, `WorkspaceNav.tsx` |
| Messaging | Stream revisions/events/read positions, revisioned edit/remove/send/list/recover APIs | New migrations, `data.ts`, `message-repository.ts`, `DirectMessages.tsx`, `direct.ts`, `App.tsx` |
| Safety/privacy | Reports/evidence, scoped actions/audit, limits, export/deletion jobs and private artifact lifecycle | New migrations, `supabase/functions/`, new safety/privacy repositories/views; existing account/social/home helpers |
| Verification | Pure behavior tests, rollback SQL permission tests, real Auth/realtime integration and browser evidence | `apps/web/tests/`, `supabase/tests/`, `apps/web/scripts/`, ignored `.impeccable/` review artifacts |

Final file splitting and exact RPC names are builder choices. Use additive migrations, generated types where useful and existing components/tokens. Avoid a broad framework or visual redesign.

## Verification and rollout

1. Establish the baseline with `pnpm typecheck`, `pnpm test`, `pnpm build`, the existing rollback SQL suite and the existing social integration suite in a dedicated test project. Keep service secrets confined to test/server environments and clean temporary identities/data.
2. Build a permission matrix with anonymous, invited/unverified, active member, moderator, admin, owner, platform admin, removed/banned, suspended and deleting accounts. Test scope and role changes while clients remain open.
3. Exercise adversarial direct REST/RPC writes; concurrent invite redemption, role transfer, message send/retry, journal allocation, quota boundaries and conflicting moderator actions. Prove that raw channel inserts cannot bypass new controls.
4. Verify real invite/recovery emails with test recipients, redirect validation, expired/reused links, reload and a second browser/device. Mock mail transport tests do not establish delivery. Never send invitations to real people as an incidental automated check.
5. Exercise multiple windows/identities with >100-message gaps, reconnects, out-of-order event delivery, edits/deletes, unread counts, blocks/removals and suspension. Check desktop/phone, keyboard/focus, accessible forms and the world failing while chat remains usable.
6. Rehearse export/deletion jobs, cancellation, failure/retry, artifact expiry, owner transfer and preservation of peer content. Test cleanup/retention jobs and rollback/forward-recovery before applying migrations to an existing project.
7. Deploy in compatible slices: guards/schema first, then enabled server operations, then UI, then revoke obsolete paths. Default new admin/admission/privacy features off until configured and tested. A disabled feature still must not leave an unguarded legacy write bypass. Record operator/bootstrap/SMTP steps and restore procedures.
8. Run independent implementation/security QA through the established visible review workflow before release approval. A missing reviewer/session remains an uncompleted review gate; automated or builder checks do not substitute for an independent pass.

## Definition of done

- A legitimate invitation -> verification/password setup -> membership -> channel conversation works without database-console provisioning of each tester.
- Public signup, role escalation, replayed grants, removed/suspended access and quota bypass attempts fail server-side.
- Space/channel management, complete authorized history recovery, unread state and author message controls work across two clients.
- Reports have scoped evidence, reviewable actions and audit history; blocking/reporting and current DM privacy remain coherent.
- Own-data export and deletion workflows are usable, resumable and verified without exposing another person's private information or losing their contributions.
- SMTP/callback configuration, rollback/recovery, retention and operational budgets are documented and exercised; relevant regressions and independent QA pass.

Completion of this plan closes roadmap items 1, 2 and 6 at the defined pilot scope. It does not close the remaining room interactions, halls, animation, Windows packaging or full alpha release checklist.

## Inputs required before enabling live features

The owner/operator supplies the initial platform-admin identity, intended web origins, working SMTP/sender configuration and pilot admission/budget settings. The block-versus-space-ban and retention/deletion proposals above need owner review before the corresponding features are activated. No provider purchase, live mail sending or deployment is authorized by merely writing this plan.

## Planning review

A fresh builder-completeness review identified two material ambiguities. Both are resolved as explicit **proposed** product rules above: only a block between an invitation's issuer/recipient stops that direct invitation, while a space ban governs membership exclusion; already-captured report evidence can outlive account deletion only under the restricted access and original absolute retention deadline. This review checks planning completeness and is not implementation/security QA.

## Primary implementation references

Checked 28 October 2026; confirm compatibility with the installed `@supabase/supabase-js` 2.49.8 before adopting newer API options.

- [Supabase Admin invitations](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)
- [Password setup/recovery](https://supabase.com/docs/guides/auth/passwords): recovery uses a reset request followed by an authenticated password update; the response must avoid account enumeration.
- [SMTP delivery prerequisites](https://supabase.com/docs/guides/auth/auth-smtp): the built-in sender is restricted and is not a production delivery solution.
- [Redirect URL allowlists](https://supabase.com/docs/guides/auth/redirect-urls): explicitly configure callback destinations, with exact release URLs.
- Repository requirements: `docs/FEATURES.md`, `docs/SECURITY_OPERATIONS.md`, `docs/DECISIONS.md`, current implementation and migrations.
