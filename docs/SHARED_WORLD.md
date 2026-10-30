# Home social features and shared Server Halls

Implemented locally on 29 October 2026 in `apps/web`. This is an additive implementation over the existing dirty checkout. The separate `Build STXIC Realm App` sample is outside this work.

## Deployment boundary

A read-only `supabase@2.122.0 migration list --linked` on 29 October confirmed the linked development project's migration ledger contains `20261028000000` through `20261028070000`. This supersedes the old roadmap statement that the access migrations were undeployed. It does **not** independently establish current Edge Function configuration, Auth/mail settings, flags, scheduler health or previous live-test results.

The two world migrations and `20261029020000_account_profiles.sql` exist locally. A later handoff reports they were deployed, contradicting earlier local notes; current hosted state needs independent verification. This Phase 5 pass made no hosted changes. Do not run the old integration suites or reset the linked project to test this slice.

## Personal home social features

Visit `/?home=<owner UUID>`. The object list remains the conventional selection path; project desk selection exposes **Open project links**, the coffee table describes the guestbook, and **Open guestbook** and **Return to chat** are always available without operating the canvas. Home Studio links to these settings. Movement, privacy, ten-item catalog, saved positions and editor history stay intact. Sitting and [furniture interactions](ITEM_INTERACTIONS.md) are now implemented locally. Uploads, playlists and achievements remain future interactions.

- `home_social` checks current admission, owner admission, friendship, privacy and blocks on each read. Visitors see entries only from visible authors. Owners can moderate their entire guestbook, including blocked authors (displayed as “Unavailable account”), so hidden entries cannot trap the capacity limit.
- `save_home_social` changes only the caller's own posting setting and up to five titled external HTTPS links. It has its own expected revision, separate from the home layout, and does not end visits. Owners choose friends-and-owner or owner-only posting; private homes remain private regardless of this choice.
- `post_guestbook` derives the author from Auth, accepts 1–1,000 trimmed characters, uses a per-author/home retry UUID, and enforces 100 entries per home and five new entries per account/hour. Home/account locks serialize permission and quota checks. There are no client write grants.
- `remove_guestbook` allows the owner, an author who can still visit, or an active platform administrator. Space moderator roles confer no authority over unrelated personal homes. Authorized visitors with platform-admin status see removal controls; an operator can use the permission-checked removal RPC for a known entry in an otherwise private home. A separate guestbook reporting/discovery queue is not supplied.
- Links are rendered as text and explicit new-tab anchors with `noopener noreferrer` and no referrer. Both SQL and frontend reject non-HTTPS schemes, credentials, backslashes/control characters, local/IP hosts and arbitrary ports. There are no embeds, previews or server fetches of user URLs.
- The additive home migration removes display-name/description comparison from SQL furniture validation. IDs, dimensions, bounded integer coordinates, duplicates, overlap and spawn protection remain checked. It does not rewrite a saved home, move objects or change canonical sofa metadata. Old migration-catalog and newer display-copy layouts are regression tested.

## Shared Server Halls

The personal cross-server hub remains `/?spaces`; its **Customize hall** / `/?hall-studio` mode still saves `stxic-realm:hall:v1:<account-or-guest>` on the current device. No local layout is implicitly imported, repurposed or overwritten.

Choose **Open shared server hall** for a server in the hub, or open `/?server-hall=<space UUID>`:

- One `server_halls` record belongs to one space. New halls default disabled, using the same cozy starter arrangement. Owners enable/disable without deleting layout, portals or announcements. Members of a disabled hall still have a direct chat link; non-editors receive no disabled layout through the snapshot RPC.
- Only the current owner and explicitly granted decorators save layouts. Admin/moderator rank alone is insufficient. Only the owner changes enablement, decorator grants and portal destinations. Archived spaces are read-only; closed spaces and banned, removed, suspended or otherwise unadmitted users cannot access a hall. Grants reference the exact membership row and disappear on leave/removal, including across a later rejoin.
- `manage_server_hall` locks the space consistently with membership/channel administration, requires an expected hall revision and validates the version, themes, doors, boolean architecture settings, allowlisted component kinds, unique IDs, 32-piece budget, footprints, bounds, door landings, overlap and central aisle. Grant/configuration edits also increment the hall revision. Stale saves return `PT409`, never last-write-wins.
- **Decorate shared hall** reuses `HallEditor`, `HallCanvas`, the existing catalog, placement controls, all three themes, entrance styles and 50-edit undo/redo. Saves publish to the space; explicit reload resets history. Remote updates mark a draft conflicted without replacing it. Failed saves retain edits; loss of authority disables saving while leaving the user's draft open for inspection.
- Three channel portal slots are owner-configured. Saving rejects archived or other-space channels. `enter_hall_portal` rechecks current membership, enabled state, server archive/closure and the channel's current server/archive state before returning a destination ID. Conventional portal buttons support keyboard activation; destination chat also uses its existing RLS/history checks.
- The announcement board holds at most 20 entries of 1–2,000 characters. Owners, admins and moderators can create/edit/remove; decorators have no implicit content authority. Edits/removals require the current entry revision; creates use author/client retry IDs. A per-account 20/hour write limit and current server-wide mute apply to posting/editing. Removal remains available to authorized moderators. Reads filter blocked authors; removal is audited without retaining bodies in the audit log.
- Social snapshots reconcile every ten seconds while visible and on focus/online/visibility changes; explicit refresh is available. Failed reads clear visible protected records. Request ordering rejects late snapshots. This does not add hall occupants, realtime movement or a multiplayer presence service.
- Unsaved project-link, posting, portal and announcement drafts remain mounted but hidden during failed reads, then return after successful reconciliation. Protected read content is hidden while unavailable; current server permissions still govern every action. Assigned portal buttons name the authorized channel destination instead of requiring users to guess from door position.
- A scene error boundary keeps the portal, announcement and chat controls usable when drawing fails. The editor also isolates its canvas so its component list and position fields still work on a drawing failure. Reduced motion and the existing ambient-effect toggle are retained. Desktop, 390px and 320px conventional controls are checked. Existing Sprite Fusion shelf artwork and free effects are reused; no generation or paid calls were made.

Guestbook and announcement authorship is included in the existing private export, with row/byte budgets maintained. Account erasure deletes authored social content and owned home data; other authors' announcements and guestbook entries outside the deleted home survive. A deleted membership does not delete its server's hall layout.

## Verification and release gates

Run:

```powershell
pnpm test:database
pnpm test
pnpm typecheck
pnpm build
# Existing Vite server at 127.0.0.1:5175 and Chrome:
pnpm test:world:social:ui
pnpm test:hall:ui
pnpm test:world:ui
pnpm test:access:ui
```

`test:database` uses actual local PGlite PostgreSQL functions, grants and RLS with a Supabase-shaped Auth shim, including rollback-only `world_social.sql` and legacy upgrade checks. It verifies distinct users, allowed/denied actions, invalid layouts, old home metadata, revision conflicts, quotas, privacy, blocks, idempotent retries, disabled-state preservation, portal isolation and account deletion/export behavior. This is not real GoTrue, PostgREST, multi-connection concurrency or Realtime evidence.

`test:world:social:ui` intercepts **every** provider request. Its simulated Auth/PostgREST adapter executes the new operations against an isolated PGlite database populated with test identities. It checks the actual frontend, cross-account persistence/reload, guestbook links and settings, shared editor/undo, stale saves, revocation, disabled halls, moderation, keyboard portal navigation, a deliberately broken renderer and phone overflow. Captures and the verification receipt are in ignored `.impeccable/review/world-social/`. Existing access UI uses JavaScript fixtures; neither browser suite establishes live backend behavior.

Before release: reconcile the target ledger and obtain authorization for any required deployment of the three feature migrations and cleanup-safety follow-up, rehearse deployment and backup restoration on a disposable/staging project, then verify real JWT/HTTP policies, membership/decorator revocation and two-connection races, retries after lost responses, reconnect behavior, five-person usage/latency, assistive technology and Windows/web packaging. Existing mail, scheduler/retention/deletion and independent-QA gates still apply. Do not mark either phase release-complete merely because local checks pass.

The implementation's visible QA request was submitted through `D:\AgentTeam\Invoke-QA.ps1`, but dispatch returned `runtime_unavailable`: the running Orca app could not be reached. No independent backend verdict is claimed. The request and receipt are saved beside the captures. A separate UI finish review identified draft retention and portal labeling issues; a verdict pass scored those fixes, product-scope copy, slate control styling and portal-save acknowledgement resolved. That verdict covers the listed fixes, not whole-surface or backend readiness. No durable visual-system change was needed. Browser request totals vary with polling; `verification.json` and `final-browser-run.txt` record the latest run.
