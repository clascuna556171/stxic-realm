# Roadmap

Source: specification v1.0, pp. 11–12. The original estimate is 8–12 solo-developer weeks, dependent on availability, art and debugging. The indicative windows below are relative, not calendar commitments. Foundations and channel messaging are implemented, with the first profile/friends/DM/shared-home slice now added. Remaining release gates still apply; no whole-phase completion is implied. See [implementation and local setup](IMPLEMENTATION.md) for current scope and verification.

## Phase 0 — Foundations (indicative week 1)

Set up proposed monorepo, design tokens, CI, schema/auth and configuration boundaries. Define invite and privacy rules; prepare a reproducible local setup. **Exit:** a minimal authenticated app runs and migrations/policies are version controlled. Security policy coverage grows in later phases.

## Phase 1 — Communication (weeks 2–3)

Build friends, spaces, channels, persistent text messages and reconnect recovery. **Exit:** authorized users can exchange persisted messages, retrieve history after reconnect and are denied access to others' conversations. Chat is independent of the world.

## Phase 2 — Pixel prototype (weeks 4–5)

The local preview remains available. Signed-in shared homes now support accepted-friend/owner-only access, two-client tested visits, a text occupant list and server-validated movement. Five-person quotas, recovery and broader performance/accessibility verification remain open; see [implementation](IMPLEMENTATION.md).

Build one room with a small original sprite set, movement, join/leave, privacy checks and a non-spatial alternative. **Exit:** at least two authorized friends can join a home and see movement; restricted users cannot enter. Measure realtime use and verify disconnect/reconnect behavior.

## Phase 3 — Home Studio (weeks 6–7)

The editor supports anonymous browser drafts and signed-in account homes, ten furniture items, server validation, owner-only saving, revision conflicts, privacy and explicit draft import. Persistent guestbooks, owner posting controls, safe project-desk links and return-to-chat controls are now implemented locally, with SQL/RLS and browser verification. The new additive migration is not deployed. Adjacent sitting and interactive notebooks, workstations, lights, rest, reading lists and plant care are implemented locally; see [item interactions](ITEM_INTERACTIONS.md). Generic uploads remain future scope. See [shared world status and release gates](SHARED_WORLD.md).

Add the initial furniture catalog, bounded editor, server validation, versioned save/load and guestbook. **Exit:** owners can edit and reload their home; invalid or unauthorized changes fail, and stale revisions produce a visible conflict.

## Phase 4 — Server Hall (week 8)

Add a single optional starter hall, granted roles, portal and board. **Exit:** a space owner can enable and decorate it, grant appropriate rights and disable access without destroying its layout; channel portals enforce permissions.

**Local implementation complete for the starter scope, deployment/alpha exit pending:** space-backed optional halls, owner enablement and explicit decorator grants, validated revisioned saves, reused Hall Studio and undo/redo, permission-checked channel portals, and a persistent moderated announcement board. Personal device-local hub layouts remain separate. Local distinct-user SQL/RLS and browser checks cover the starter behavior; hosted rollout, real concurrent connections and release QA remain open. Hall multiplayer movement/presence is not part of this slice.

## Phase 5 — Polish and QA (weeks 9–10)

Local hardening and release inventory have started; alpha exit remains open. See [alpha release rehearsal](ALPHA_RELEASE.md) for the current gates and disputed hosted status.

Package Windows, test RLS with distinct users, accessibility, quotas, recovery, backups and clean-install instructions. **Exit:** satisfy the alpha release gates in [Security and operations](SECURITY_OPERATIONS.md), including chat remaining usable when the world fails.

## Phase 6 — Alpha iteration (weeks 11–12)

Run sessions with five invited testers, measure usage and costs, and fix defects. **Exit:** the alpha definition of done is met and tester feedback informs the next priorities.

## Alpha definition of done

- An invited member joins and customizes profile and home.
- Two or more friends visit a home together and see movement.
- A space owner creates, enables and decorates an optional hall.
- Text chat works in and outside the world using shared backend data.
- Data operations enforce permissions and basic quotas.
- Windows and hosted web share consistent core functionality.

## Beyond alpha

**Beta / 20–100 invited users:** load tests, metrics, moderation tools, tested recovery, asset processing and provider quota review; evaluate themes, templates, presence and a voice pilot. **Public:** only after moderation operations, abuse controls, privacy/legal decisions, capacity and support are ready. Consider dedicated authoritative room infrastructure when measurement shows it is needed. Monetization and public discovery remain future decisions.

## Current next priorities — 29 October 2026

The owner's subsequent account-profile request is implemented locally: uploaded photos/banners/gallery, flexible profile fields/style/sections and private notes, independent of the world character. Migration `20261029020000` and the media Edge/worker changes join the pending hosted rollout. [Account profile operations](ACCOUNT_PROFILES.md) records the current implementation, isolated checks and Storage/Auth release gates. Generic attachments/world uploads remain future scope.

Authentication/recovery, profiles/account appearance, friends/blocking, DMs, message history/unread/edit/remove, administration, moderation and a first shared-home/editor slice already have implementations. Do not restart them. Guestbook/project-link interactions and optional shared Server Halls now have local implementations. Next: reconcile the actual target ledger, rehearse the three 29 October feature migrations and the subsequent cleanup-safety migration, and complete live multi-user/concurrency/reconnect checks, Windows/web release operations and five-person alpha checks. Generic world uploads and full presence statuses remain future scope; adjacent sitting, click/tap routing, directional character views and validated Studio dragging now have local implementations (see [direct interaction](DIRECT_INTERACTION.md)); the starter alpha announcement board is now plain moderated text.

The [access plan](plans/2026-10-28-access-messaging-moderation.md) has schema/server/web implementation for admission/recovery, administration/history and moderation/privacy. A read-only linked migration-ledger check on 29 October confirmed `20261028000000`–`20261028070000` are applied; the previous “not deployed” statement was stale. Current function/configuration/mail/scheduler health was not revalidated by that ledger check. The current hosted state of the three 29 October feature migrations is disputed by a later handoff and must be independently checked; `20261029030000` is a new local cleanup-safety migration. Read [operations](ACCESS_OPERATIONS.md) and [shared world verification](SHARED_WORLD.md); full live pilot/release gates remain open.
