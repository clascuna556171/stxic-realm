# Implementation and local setup

## Modern social shell — 29 October 2026

The approved reference direction now spans the shared app chrome through `modern-shell.css`: charcoal surfaces, chosen private accents, conventional app typography, rounded channel/DM messages (own messages right) and membership-scoped `ServerDetails`. Compact details mode retains the mounted thread and device draft, with close/Escape returning focus. Real channels/members/roles come from existing RPCs; unavailable details clear protected member content without disabling chat. World/studio lettering and artwork remain separate, as do account-photo/profile customization and saved world data. This is local frontend work; no new schema, hosted configuration, deployment or dependencies. Current design contract: [DESIGN.md](DESIGN.md).

## Phase 5 release preparation — 29 October 2026

The source includes three 29 October feature migrations plus the new forward-only `20261029030000_profile_media_cleanup_safety.sql`. The latest handoff claims the feature migrations and profile/worker functions were deployed, while earlier local records say pending. Hosted state and SQL equivalence are unverified; check the actual target before any rollout. `pnpm release:preflight` is a read-only local inventory, not a hosted or release certification. [Alpha release rehearsal](ALPHA_RELEASE.md) specifies isolated verification, backup/restore, rollout and rollback gates. The cleanup migration tracks pending and deleting upload paths and delays collection for one hour; real Storage, Edge and concurrency behavior remains to be tested. The proposed Tauri desktop shell does not exist yet.

Current checks: 37 unit tests, five PGlite SQL/RLS suites and legacy upgrade checks, production build, local release preflight, and intercepted profile, access, hall, world and world-social browser suites passed. The world-social suite sends a message after a deliberately failed renderer. Its first concurrent rerun timed out before this check; the subsequent isolated run passed. Browser providers were intercepted; none of these checks establishes live Supabase, signed-URL expiry, real Storage cleanup or concurrent HTTP behavior. Docker engine and Deno were unavailable in this pass. The Windows shell and installer, hosted web configuration, live isolated integration suite and recovery rehearsal remain open.


## Flexible account profiles — 29 October 2026

Account profiles now follow the owner's Discord-style reference with uploaded account photos/banners/gallery, pronouns/status/about, custom details and HTTPS connections, colors/fonts/crops, section order/visibility, viewer-private notes and actual shared-space roles. Account portraits in people/chat use photos or initials; pixel characters remain in worlds and their own studio. No existing character/home/theme data is converted. See [ACCOUNT_PROFILES.md](ACCOUNT_PROFILES.md).

Migration `20261029020000_account_profiles.sql`, `realm-profile-media` and the worker blob-GC update exist locally alongside the two earlier home/hall migrations. Their hosted state is disputed and requires verification; this Phase 5 pass made no hosted changes. Local SQL/RLS, binary-validation and intercepted browser checks are distinct from live Storage/Auth/Edge evidence. The older character-preview profile sections below are historical; they no longer describe the account profile screen.

## Home guestbooks, object actions and shared Server Halls — 29 October 2026

Current scope and operations: [SHARED_WORLD.md](SHARED_WORLD.md). New additive migrations `20261029000000` and `20261029010000` implement private/friend-authorized persistent guestbooks, posting controls/limits/removal, safe project links, separate space-backed optional halls, explicit decorator grants, validated revisioned layouts, channel portals and moderated announcements. The existing Hall Studio, art, themes, placement rules and undo/redo are reused. Device-local personal hubs and old home arrangements are preserved. The server furniture validator now separates display copy from identity/geometry too.

**Deployment:** a read-only linked migration-list check confirmed migrations through `20261028070000` are applied. The later shared handoff reports these migrations deployed, conflicting with earlier local notes; verify the actual ledger and function versions. This Phase 5 pass changed no hosted data, configuration or functions. Historical deployment/integration records below describe their original checks, not a new certification of current hosted Auth, Edge Functions, feature flags or mail/scheduler operation. Earlier “guestbooks/halls unimplemented” statements are superseded by this section; release gates are not closed.

Local validation includes actual PGlite SQL/RLS distinct-user tests and browser flows with intercepted Auth/PostgREST backed by PGlite. They are separate from live Supabase verification. Run `pnpm test:world:social:ui` for the new screens, alongside the existing database/unit/build/hall/world/access checks. Hosted rollout, real multi-connection races, live reconnect/Auth, operational rehearsal and independent QA remain release gates. See the shared-world guide for exact permissions, limits and evidence.

## Sprite Fusion artwork and account refinement — 29 October 2026

The account/profile layout, shared hall/room shelf, room materials and editor thumbnails were refined around the original reference. One Sprite Fusion style-guided batch returned nine shelf variants; the selected original is preserved with its prompt and compiled into project-owned pixel data. Further sofa/desk generation was blocked by the service's active-subscription requirement after the remaining 15 credits were used. Existing furniture continues to be original Realm artwork. No backend/schema, publishing or save-scope changes were introduced. Current files, provenance, compilation, validation and limits: [SPRITEFUSION_ART.md](SPRITEFUSION_ART.md).

[Hall Studio](HALL_STUDIO.md) at `/?hall-studio` now edits personal hall components, entrance styles and three themes. Saved layouts are browser-local and scoped by account; they do not publish to server members or sync across devices. `pnpm test:hall:ui` verifies the editor. The hall uses shared modular pixel art, replacing the earlier illustrated backdrop.

The 29 October visual update adds [Server Halls](SERVER_HALLS.md): `/?spaces` for membership-scoped server navigation and `/?hall-preview` for the anonymous illustration preview. Existing administration is in **Manage spaces** below the hall. Run `pnpm test:world:ui` for local world interaction checks, alongside `pnpm test:access:ui` for simulated authenticated contracts.

The working app is in `apps/web`; `Build STXIC Realm App` remains a separate UI-only sample. The latest slice adds invitation/recovery, space/channel/membership administration, journal-backed messaging/unread/edit/remove, moderation, limits and privacy jobs. Read [Access operations](ACCESS_OPERATIONS.md) for setup and release gates. Historical records report that migrations through `20261028070000` and earlier functions were deployed and an administrator bootstrapped; current hosted function/configuration status was not revalidated in this pass.

## Requirements

Node 24 and pnpm 11.22.0. For an isolated local backend, a running Docker engine and Supabase CLI are needed; alternatively use a dedicated, non-production Supabase project. Never run development migrations against an existing production project without review and backup. Do not commit credentials or use a service-role key in browser code.

1. Run `pnpm install --frozen-lockfile` at the repository root.
2. Use a dedicated disposable Supabase project and inspect its actual Auth settings; disable public signup, verify confirmation/redirect/provider limits and configure captured/test SMTP. New frontend callback routes are `/auth/callback` and `/auth/recover`.
3. Follow [the migration preflight, reviewed account bootstrap and compatible rollout](ACCESS_OPERATIONS.md). Apply all migrations in order only to the authorized target. SQL expects Supabase's `auth` schema, roles and realtime publication. Never expose service-role access to the frontend.
4. Explicitly admit reviewed existing identities and bootstrap the platform administrator with trusted tooling. New admin/reporting, invitation and privacy processing features remain disabled until configured/tested; owners then create spaces/channels and invite verified admitted members through RPC-backed screens.
5. Copy `apps/web/.env.example` to `apps/web/.env.local`, set the project URL and public anon/publishable key, then run `pnpm dev`. Verify the key is a public client key, not the secret/service-role key.
6. Run `pnpm typecheck`, `pnpm test`, and `pnpm build`.

Example provisioning (replace the UUIDs; execute only as a trusted administrator):

```sql
insert into public.spaces (id, name) values ('11111111-1111-4111-8111-111111111111', 'Friends');
insert into public.space_members (space_id, user_id, role) values
  ('11111111-1111-4111-8111-111111111111', '<existing-auth-user-uuid>', 'owner');
insert into public.channels (space_id, name) values ('11111111-1111-4111-8111-111111111111', 'general');
```

## Integration verification status

Verified on 28 October 2026 against linked Supabase project `stxic-realm` (`rrprjxubfdixoqvquptq`, region `ap-northeast-1`) using `pnpm test:integration`:
- **Unauthenticated (Anon)**: 0 spaces, 0 channels, and 0 messages returned; inserts fail with 42501 (insufficient privilege).
- **Authentication**: Users sign in with password and receive standard scoped JWT sessions.
- **Membership Isolation**: Enrolled members (Member 1, Member 2) read their assigned spaces and channels; nonmember (Member 3) receives 0 spaces, 0 channels, and 0 messages.
- **Messaging & RLS**: Enrolled members post and read messages. Nonmember inserts are rejected by `messages_insert_members` policy.
- **Anti-Spoofing & Privilege Escalation**: Attempts to spoof another user's `author_id` or insert unauthorized records into `space_members` or `channels` are rejected by RLS and grant constraints.
- **Realtime**: `supabase_realtime` publication delivers `postgres_changes` events to authenticated members. (Note: in server/Node.js runners, `client.realtime.setAuth(token)` is required to carry the user's JWT context across the WebSocket).
- **Membership Revocation**: Deleting a user's `space_members` entry immediately halts read visibility and write permissions.

Run the automated integration verification suite only against a separately verified disposable project, after applying its test-only fixture SQL and setting `REALM_TEST_PROJECT_URL` and `REALM_DISPOSABLE_TEST_CONFIRM` to that exact origin, plus the disposable public and service keys. The suites create and delete test identities. For example:
```powershell
$env:REALM_TEST_PROJECT_URL="<disposable-project-origin>"
$env:REALM_DISPOSABLE_TEST_CONFIRM=$env:REALM_TEST_PROJECT_URL
$env:SUPABASE_SERVICE_ROLE_KEY="<disposable-service-key>"
pnpm test:integration
```

## Remaining blockers and next work

1. **Access/communication release verification:** invitation/recovery UI, cursor recovery, provisioning, unread state, message changes, reporting, moderator queues and quotas are implemented. Real mail/provider/concurrency and operational gates still require the checks in ACCESS_OPERATIONS.md.
2. **World rollout:** guestbooks, safe desk links and optional shared halls/portals/boards are implemented locally in the two new migrations. Reconcile actual target state and stage/deploy only with authorization; live distinct-user/concurrency and reconnect checks remain open.
3. **Future content:** attachments/uploads, sitting, additional object actions, directional animation and hall multiplayer presence are not implemented in this slice.
4. **Independent verification:** local PGlite and intercepted-browser tests do not replace real Supabase or assistive-technology testing.
5. **Release operations:** Windows packaging, hosted web, complete reconnect/accessibility testing, backup restoration, five-person load/usage checks and alpha release gates remain outstanding.

## Local room prototype

Run `pnpm dev`, then open `http://localhost:5173/?room-preview` (use the port Vite prints). This isolated preview needs no backend. Focus the canvas and use arrow keys, or use the on-screen direction controls. Select an object with the mouse in the room or use the accessible object list. The scene uses a provisional 16 × 12 top-down grid, original programmatically drawn pixel furniture and local collision checks. It is separate from chat and lazy-loaded.

The preview is not a personal home: it does not authenticate visitors, enforce privacy, show multiplayer or synchronize state. The non-spatial object list is an inspection alternative; the objects do not yet perform their planned actions. Backend integration, authoritative validation, accessibility testing with assistive technologies, art direction and real multiplayer testing remain open. Antigravity owns Supabase work.

## Anonymous/local Home Studio

The following describes unsigned browser drafts. Signed-in Home Studio now saves account homes as described below.

Open `/?room-studio`, or choose **Edit room** from the room preview. Select one of ten catalog items, enter a one-based top-left column and row, and move, remove or restore it. Local validation rejects out-of-bounds placements, overlaps, unknown items and blocked entry tiles. **Save local draft** stores a versioned layout in this browser only; the preview reads the last saved draft. Storage failures are reported and changes to the stored draft from another tab are detected before a save, but this is not a server revision or atomic concurrency guarantee. Reloading or leaving with unsaved changes prompts for confirmation.

Drafts are origin-specific and can be removed by browser data clearing. The anonymous draft path has no account ownership or shared save. Signed-in ownership, server validation and visits are implemented below; rotation, multiple copies and guestbooks remain open. Treat these edits as experimental; do not store sensitive data in browser drafts. Phase 3 remains incomplete.

## Obsidian visual overhaul — 28 October 2026

This records the earlier local UI slice. The account/social section below supersedes its local-only limits for signed-in users.

The current frontend uses the documented obsidian/graphite/slate family, replacing the previous green-tinted shell. New browser preferences default to a neutral `obsidian` accent; existing explicit color choices are preserved. All shell backgrounds stay neutral even when a user chooses sage. Logo color remains independent. Sign-in, chat, room preview, Home Studio and the appearance workbench share this system.

Open `/?appearance` to choose one of six original starter looks or edit skin tone, hair color/style, eyes, everyday/medieval/tech clothing and accessories. Character and Room & interface sections group the controls. Full character, cropped portrait and room sprite share the same original 48 × 64 pixel drawing. Save writes the existing versioned localStorage preference key, retaining compatibility with older settings. Unsaved changes warn before leaving. Private interface colors and local room moods are separate controls.

The original room artwork in `src/world/art.ts` supplies detailed pixel furniture, staggered floorboards, a city window, wall gallery, shelves, trim and rugs. The same artwork appears as SVG on sign-in and as lazy-loaded Phaser graphics in the room/editor. Room moods change materials. The catalog contains ten items, including the new linen bed, coffee table and reading lamp. Older stored layouts retain their contents. Placement validation, collision and text-based controls are preserved. WASD supplements arrow keys in the room.

**Verification:** production build and 14 unit tests pass, including saved preference/layout compatibility, valid character combinations, room-art bounds and reachability of every walkable starter tile. Browser checks covered desktop (1440 × 1000) and phone (390 × 844), room movement, appearance save/reload, saved tech room mood, and furniture removal/restoration with save/reload. Captures are in `.impeccable/review/`. Authenticated chat was not visually exercised in this pass; no backend integration checks were rerun. Phaser remains a separate approximately 1.2 MB minified chunk (about 320 KB gzip), with the existing build size warning.

**Limits:** all identity, room mood and layout choices here are browser-only, origin-specific and not shared/account-backed. Character art is front-facing static geometry, not a directional animation sheet. Room objects remain descriptive; visits, sitting, guestbooks, uploads, privacy enforcement and multiplayer are not supplied by this redesign. Antigravity's backend work is untouched.

## Account identity, friends, DMs and shared homes — 28 October 2026

The roadmap recommendation is now implemented as a first account-backed slice. Migrations `20261028010000_identity_social_homes.sql` and `20261028020000_conflict_http_status.sql` are applied to the existing linked development project. The earlier local-only sections above describe the anonymous preview; signed-in routes now use account data.

### Identity and appearance

- Auth users receive a profile, public character appearance, private theme and a default friends-only home. Existing auth users were backfilled. Generated handles use UUID characters, never email addresses.
- `/?profile` edits display name, unique lowercase handle and bio. Signed-in members see public profile/character data; interface accent/logo choices remain owner-only in `user_themes`.
- Signed-in `/?appearance` loads and saves account appearance, private theme and the owner's room mood. Anonymous appearance still uses the original browser-only draft. Signing in does not silently upload an anonymous draft. Saves reject stale profile revisions and expose account reload.
- Auth/account changes clear active in-memory appearance before another account loads. Chat authors resolve to profile names and shared characters where visible.

### Friends and direct messages

- `/?friends` supports exact-handle requests, incoming acceptance/decline, outgoing cancellation, removal, blocking and unblocking. Only the request recipient may accept. Unblocking does not restore a friendship.
- Accepted friends can open a unique 1:1 conversation at `/?dm=<conversation-id>`. Messages use server-derived authors, idempotent client IDs, an earlier-history cursor and permission-filtered realtime notifications with a 10-second read fallback. A pending send disables the text field to preserve retry intent.
- Removing a friendship or blocking either direction revokes DM reads/sends and visits between those users. Retained DM history becomes readable again only after a new accepted friendship. The later access migrations replace Auth cascade deletion with content/author tombstones and preserve peer contributions.
- This baseline did not add group DMs, unread counts, message editing, reporting or messaging administration; the later access implementation below adds the latter controls locally.

### Homes and trusted movement

- `/?home=<owner-id>` enters a shared account home. `/?room-preview` remains a separate anonymous/local scene. Signed-in Home Studio edits the account home, with an explicit **Import saved browser draft** action; import is not published until save.
- Home saves validate the original ten-item catalog, integer positions, bounds, unique objects, collisions and clear spawn on the server. The owner alone saves; expected revisions reject conflicts with HTTP 409. Privacy choices are accepted friends or owner only. Public/invite-only home modes are not supplied.
- Visits use short-lived per-user tokens. Server RPCs authorize every read/move, enforce adjacent unblocked tiles and a 150 ms minimum movement interval, and cap a home at five occupants. These are provisional alpha budgets, not measured capacity claims.
- Occupant positions are polled approximately every 1.5 seconds; heartbeat writes occur at most every 10 seconds. Visits expire after 45 seconds without a heartbeat. Hidden tabs stop polling and may require re-entry. Replacing a visit token ends the older session. Home edits invalidate active visits so every client rejoins the same layout.
- Shared sprites and the text visitor/position list use server-returned identities. Room rendering failure retains non-canvas controls. Movement is database-authoritative; it does not trust client broadcast positions.
- Privileged routines live in the unexposed `realm_private` schema with pinned search paths; public RPCs are narrow invoker wrappers. Client roles have read-only table grants and scoped RPC execution, including no anonymous access. Interface themes are never returned with public character data.

### Verification

- 17 unit tests pass, including separation of public character/private theme data, conflict propagation, and stable DM-history merging; production build passes. The existing lazy Phaser chunk-size warning remains.
- `pnpm test:social:sql` runs rollback-only multi-identity database tests. It checks automatic bootstrap, grants, private themes, invalid character rejection, sender/outsider acceptance denial, DM isolation/retries, two occupants, movement/speed validation, home revision conflicts and revocation/blocking. Both schemas pass `supabase db lint --linked --schema public,realm_private --level error`.
- With an admin key supplied only to the test process, `pnpm test:social` provisions three temporary identities, signs them in through Auth, verifies profile saves/private themes, friendship acceptance, actual realtime DM delivery and retries, denied spoofing/outsider access, two-user homes, visible movement/collision, stale saves, privacy revocation and blocking. Default execution deletes its fixtures. A temporary `--keep-browser-fixtures` flag is for supervised browser QA only; remove fixtures afterward with `--cleanup-fixtures`.
- Two isolated browser origins exercised signed-in profile save/reload, account character save/reload, friend lists, two-way DMs, shared movement observed by the other browser, privacy ending another visit, and account furniture save/reload/restoration. Desktop (1440 × 1000) and phone (390 × 844) screens were inspected. Evidence is in `.impeccable/account-review/` and uses temporary test identities.
- No five-person load test, assistive-technology pass, arbitrary network-loss simulation, Windows package or production deployment was performed. The visible Copilot QA handoff was attempted through `D:\AgentTeam\Invoke-QA.ps1` but could not start: no team session is registered for this project. No independent QA pass is claimed. This remains a development slice, not an alpha-release approval.

Reference guidance used: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [function security and grants](https://supabase.com/docs/guides/database/functions), and [PostgREST custom HTTP errors](https://docs.postgrest.org/en/stable/references/errors.html#raise-errors-with-http-status-codes).

## Access, communication administration and moderation — 28 October 2026

Implemented locally from the approved implementation request: private admission/current-session enforcement, platform grants, guarded legacy writes, space/channel/role/invitation APIs and screens, complete cursor history and journal recovery, channel/DM unread/edit/remove, atomic report-and-block, scoped review actions, private exports and resumable deletion with peer-content preservation. Routes include `/?spaces`, `/?platform`, `/?moderation&space=<id>`, `/?privacy`, `/auth/callback` and `/auth/recover`. Ordinary conversation screens use the same stream component for channels and DMs. Anonymous previews and existing identity/home workflows remain separate.

Migrations `20261028030000` through `20261028070000`, Edge sources, local Auth/mail configuration and test tooling are in the repository. The linked migration ledger was rechecked on 29 October and confirms those migrations are applied; the earlier undeployed statement is superseded. Feature flags default off in migration source; the later deployment record documents activation, but current hosted flags, Edge configuration and provider/scheduler health were not revalidated in this continuation. [Access operations](ACCESS_OPERATIONS.md) is the current setup/verification/restore source and supersedes the historical baseline's latest-100, admin-console membership and cascade-deletion behavior.

Local evidence: TypeScript and production build pass; 24 unit tests, three rollback SQL suites, migration/upgrade checks and four Edge HTTP tests pass. The browser contract suite exercises two simulated clients, gaps beyond 100 changes, old edits/removal, late-send drafts, reporting, space creation, privacy requests, callbacks and suspension; desktop/phone captures are in `.impeccable/access-review/`. Provider requests are intercepted in that suite. These checks are not real mail, Auth/realtime or multi-connection concurrency evidence.

Real social/access integration currently cannot run without a dedicated test-project URL and server test credentials. Docker is unavailable. Actual inbox delivery/resend, hosted Auth settings, scheduler/deletion retry/physical purge rehearsal, measured five-person budgets, backup/restore and independent visible security/implementation QA remain open. The existing lazy Phaser chunk warning persists.

## Home Studio undo/redo — 28 October 2026

Furniture placement, movement, removal and explicit browser-draft import now have a 50-edit in-memory history. Undo/Redo buttons and Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y operate outside text fields. Invalid/no-op edits preserve history; new edits discard redo; saving retains history and updates the dirty baseline; reloading clears history. Restored coordinates follow the selected item. Privacy settings are separate from layout history. No Supabase schema/Auth/server files changed in this pass.

Checks: 27 unit tests, TypeScript/build, and isolated desktop/phone browser interactions pass. Captures: `.impeccable/review/studio-undo/`. Account save/import wiring retains the existing API; no new live Supabase verification was performed for this frontend change.

Independent visible QA for the undo/redo slice could not dispatch: Invoke-QA.ps1 returned runtime_unavailable because the Orca app could not be reached. No independent pass is claimed; the saved request is .impeccable/review/studio-undo/qa-request.md.

## Hosted Supabase deployment & Concept v3 visual overhaul — 29 October 2026

1. **Hosted Supabase Integration (`rrprjxubfdixoqvquptq`):**
   - Applied migrations `20261028030000_access_foundation.sql` through `20261028070000_server_jobs_and_grants.sql` (including `WHERE s.id IS NOT NULL` safeupdate fix in `realm_private.maintenance()`).
   - Configured closed-alpha Auth (`enable_signup: false`, `external_email_enabled: true`, `site_url: http://127.0.0.1:5175`, callback allowlist, minimum password length 12, secure password change).
   - Bootstrapped administrator account `c.lascuna.556171@umindanao.edu.ph` as `active` and `platform_admin`.
   - Deployed Edge Functions (`realm-invitations`, `realm-onboarding`, `realm-privacy`, `realm-worker`), verified `realm-worker` execution (`204 No Content`), and enabled feature flags (`administration`, `account_invitations`, `privacy_jobs`).
   - Verified live frontend password recovery, sign-in, profile view, space creation and channel messaging/editing on `http://127.0.0.1:5175/`.
2. **Concept v3 & Reference Visual Implementation:**
   - Updated the orbital `R` SVG mark (`Brand.tsx`, `apps/web/public/brand/`), 48 × 64 RPG character sprites (`character.ts`), 512 × 384 pixel room and 10 furniture pieces (`art.ts`, `RoomArtwork.tsx`, `renderer.ts`), 12-starter `AppearanceStudio.tsx` with twilight castle preview backdrop and Randomize/Reset controls, and `Spaces.tsx` moonlit pixel castle hero banner and space cards.
   - Passed `pnpm typecheck`, `pnpm test` (27/27), `pnpm test:database`, Deno `check`/`test` (4/4), `pnpm build`, and `pnpm test:access:ui`.

## Saved-home compatibility fix — 29 October 2026

Owner saw unsupported-layout error on their authenticated home. Root cause: layout.validateLayout compared saved furniture names/descriptions to current display copy; visual changes had changed sofa description relative to migration 20261028010000 furniture_catalog. Restored canonical sofa metadata for server save compatibility. Layout validation now checks asset IDs, dimensions, duplicate IDs, integer positions, bounds, overlap and spawn independently of text. parseLayout rehydrates canonical metadata while preserving saved positions; invalid geometry stays rejected. Added regression loading the literal database migration catalog plus newer sofa text and moved furniture. Build and 34 unit tests pass. No hosted home layout was reset or rewritten; refresh should load it. Live authenticated browser confirmation remains unverified.
