# Furniture interactions — 31 October 2026

Home and Hall viewers use `ItemActionModal.tsx`, a native dialog rendered above the Scene/Details workspace. Select an object, arrive beside it, then use its named action. Conventional object lists and Details actions remain available on narrow screens. Sit at PC / Sit on sofa and the fixed-size movement toolbar remain. Catalog IDs, footprints, saved layouts, `beside`, BFS and authoritative shared-home movement are unchanged.

| Item | Actions and storage |
|---|---|
| Coffee table / Hall gathering table | Notebook. Personal Notes supports add/edit/pin/delete, timestamps, 30 notes of up to 1,000 characters. Device storage is scoped to the viewer and home/server. Account-home Room Sticky Notes are owner-curated and visible only to permitted visitors. Guestbook is a secondary tab using the existing posting/moderation RPCs. Hall community notes reuse the server resource/announcement content. |
| Project desk / console | Workstation, safe explicit project-link cards in account homes, a 25-minute focus timer with pause/reset, a local snippet log, and Return to Chat. Hall workstations reuse the selected server’s real resources. Timer deadlines survive closing/reopening and reload; no notification/audio permission is requested. Desk sitting remains an adjacent local pose. |
| Lamp / lantern / Hall hearth | Toggle each instance’s light locally. Phaser ground lights use `lighting.ts`; Halls have per-instance warm light overlays. Hearth embers stop when its fire is off and respect the existing Ambient effects and reduced-motion settings. No sound is autoplayed. |
| Linen bed | Sleep at the accepted adjacent tile. Local resting pose, dim vignette, zZz and Resting status; wandering pauses. Movement keys, walking or Stand up wake the character, including a blocked movement attempt. Rest is not transmitted as multiplayer presence. |
| Bookshelf | Owner-curated reading/bookmark list in account homes, up to five titled public HTTPS links. Hall shelves use real announcements and channel/chat destinations, leaving empty states when no resources exist. No invented rules or fetched link previews. |
| Plant / fern | Check care, water, last-watered timestamp, Thriving mood and a short water-drop effect. Care state lasts for the current view/visit. |
| Sofa / banner | Adjacent sitting and a banner inspection with the existing Studio destination. |

## Permissions and persistence

`20261031000000_home_item_content.sql` adds independent revisioned owner content. `home_item_content` rechecks admission and `can_visit`; `save_home_item_content` derives ownership from Auth, locks the home and uses expected revisions. Notes/bookmarks are bounded and validated; no direct client writes exist. RLS hides inaccessible homes. Content joins private account export and cascades with home deletion. A failed protected read clears rendered content. Editors report save/storage failures and revision conflicts; editing a note changed by reconciliation requires reopening it.

Personal notes and snippets are browser-local conveniences, not encrypted account-backed storage or cross-device synchronization. Account homes scope them by viewer and home; Halls scope them by viewer and server. Anonymous preview data uses a separate guest key. Private notes never enter the shared-content RPC. Preview stickies/bookmarks remain local and say so in the interface. Lighting, plant care and rest are local to the current view.

The migration is local and **not deployed by this task**. Account stickies and reading lists require it on the target backend. Existing live rollout/review gates remain in force.

## Accessibility and verification

The dialog has a named heading, visible Close, Escape, focus containment/restoration, semantic controls, labeled inputs and visible focus rings. Controls and standalone action links have at least 44px targets. It uses a bottom sheet on phones, scrolls within the viewport and respects reduced motion. Opening an item does not resize the world.

Run `pnpm typecheck`, `pnpm test`, `pnpm test:database`, `pnpm test:interaction:ui`, `pnpm test:world:polish:ui`, `pnpm test:items:ui`, `pnpm test:world:social:ui` and `pnpm build`. Browser suites require the local Vite origin on port 5175 or `REALM_UI_ORIGIN`. Item captures and reports are under ignored `.impeccable/review/item-actions/`.

These checks use local Chromium, anonymous previews and intercepted Auth/PostgREST backed by disposable PGlite. They do not establish live Supabase, concurrent database-connection races, physical-device/Safari or assistive-technology coverage. No deployment is included.

Local verification on 31 October: typecheck, 51 unit tests, seven disposable PGlite SQL suites plus upgrade checks, the existing direct-interaction and five-size world-polish browser suites, the desktop/390px/320px item suite, the extended two-account shared-world suite and production build passed. The shared-world suite explicitly checked owner stickies and bookmarks across accounts, visitor read-only controls, failed-read content removal and the secondary guestbook tab. UI detection returned no findings. A fresh independent source/screenshot review requested larger standalone link targets; its focused verdict scored that fix resolved (44px Return to Chat and Studio links at 390px). The pre-existing large Phaser chunk warning remains. Changes are local and uncommitted.

## Furniture pose polish

PC sitting now renders the character in the actual chair, facing the screens, with the backrest in front and hands at the keyboard. Sofa sitting uses the free left cushion beside the kitten; sleep places the head on the right pillow beneath the quilt. A shared pixel-anchor resolver follows moved furniture and Hall instance IDs. These are visual anchors only: BFS, collision, visit RPC coordinates, layout/catalog geometry and the accepted adjacent floor tile remain unchanged. Stand/movement returns the sprite to that floor tile. Repeated position snapshots preserve the pose, and removed/unreachable targets clear it. Reduced motion preserves placement without adding a transition. Both Home viewers replay the current action when a delayed renderer opens; Hall characters and furniture foregrounds share the canvas viewBox/contain fit so phone letterboxing cannot shift the seat. Poses remain local to the viewer.

`pnpm test:poses:ui` checks the real Phaser artwork/anchors and snapshot/stand/movement/layout lifecycle plus Hall positioning on desktop and phone. Four new unit tests cover artwork, anchor validity and foreground occlusion.

Pose-polish verification: typecheck, 55 unit tests, database suites, production build, direct interaction UI, world-polish UI, the new pose suite and SQL-backed shared-world UI passed. The reviewer independently reproduced/rechecked delayed-renderer replay and confirmed the final desktop/phone coordinate fit. No hosted changes or new migration were made for this polish.
