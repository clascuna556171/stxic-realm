# Direct interaction — 30 October 2026

Home and Halls now accept mouse/touch destinations and object approaches. This work builds on the existing room grid, saved layouts, original pixel character, viewport workspaces and Studio history. It adds no dependencies, schema changes or hosted writes.

## Movement and actions

`world/navigation.ts` finds cardinal routes with breadth-first search. Furniture footprints and room/hall bounds remain blocked. Objects resolve to the nearest reachable adjacent floor tile; unreachable destinations stop with a message and retain the last valid position. A single serialized walker replaces destinations, waits for an outstanding step to settle, suppresses obsolete arrival actions, and supports Stop/Escape and unmount cancellation. Routes recheck current geometry at each step.

Home offers Sit at PC / Sit on sofa on arrival. Sitting is a local pose at the adjacent floor tile, not a teleport into a blocked furniture cell. Other objects expose their existing description/social controls. Hall entrances offer entry after arrival; directory search, direct server/channel links and text alternatives remain available. Halls also list their placed objects under Movement & objects. Arrow keys/WASD, movement buttons and labeled column/row forms provide non-spatial alternatives. Arrival actions stay in the Scene view on narrow windows, without changing focus automatically.

Shared Home sends every route step through the unchanged `move_home` RPC and renders only accepted coordinates. Server bounds, one-tile steps, rate limits, collision, visit tokens, expiry and access rules remain authoritative. Stale own-sequence snapshots are discarded; polling and movement reads are serialized so older responses cannot rewind the visitor roster. Saving a home or losing access ends the route/visit. Sitting and facing add no position or permission claims to the database.

Hall walking is local navigation in the personal hub or shared hall view. **Halls still have no multiplayer movement/presence service.** Shared arrangements remain server-owned and channel entry still calls `enter_hall_portal`, which checks current access. This feature does not create or simulate synchronized hall occupants.

## Artwork and placement

`character.ts` now provides front/rear/left/right artwork and two alternating walking phases using the existing skin, hair, eyes, outfit and accessory choices. Portraits and Appearance Studio keep the original front view. Idle actors retain their last observed facing. Shared guests derive facing from accepted position changes, reset correctly when a visitor re-enters with sequence zero, and snap skipped polling positions rather than interpolate across furniture. Facing is not persisted; a new visit starts facing forward. Reduced motion removes walking phases and positional interpolation; automatic room wandering starts paused.

Home Studio and Hall Studio show footprint previews during pointer/touch drags: a valid outline or an invalid outline with a cross and an explanatory status. A drop commits one existing history edit only after `placeObject` / `placeHallPiece` accepts it. Invalid or cancelled gestures retain the original position and redo history. Escape/pointer cancellation cancels a drag. Arrows and position fields remain available. Save, Undo/Redo, Cancel changes, reload and revision/conflict handling remain in the editors. Viewer taps cannot rearrange furniture.

The Phaser renderer observes parent size changes so arrival controls and Scene/Details switching cannot leave pointer coordinates using an old canvas scale. Guest rendering and movement listeners are cleaned up when a scene closes.

## Verification and remaining gates

Run a local Vite server on port 5175, or set `REALM_UI_ORIGIN`, then use:

- `pnpm test`, `pnpm typecheck`, `pnpm build`
- `pnpm test:interaction:ui` — anonymous worlds; external HTTP blocked; desktop and Chromium touch emulation, floor/object routing, replacement/blocked destinations, four hall facings, both Studio previews/invalid drops, Undo, Cancel, Escape, touch cancellation and reduced motion.
- `pnpm test:world:ui`, `pnpm test:hall:ui` — existing world/customization and saved-hall/conflict regressions.
- `pnpm test:world:social:ui` — intercepted Auth/PostgREST backed by disposable local PGlite SQL/RLS, including two simulated identities, shared-home route arrival, sitting without coordinate changes, delayed-response route replacement, owner revision/access loss, shared Hall permissions/conflicts and channel entry.
- `pnpm test:database` — existing disposable SQL/RLS suites; no linked project writes.

Screenshots and detailed reports go under ignored `.impeccable/review/direct-interaction` and the existing world/hall/world-social folders. These are local or simulated checks, not live Supabase, real concurrent network clients, physical touch devices or assistive-technology certification. Live multi-user latency/reconnect, real devices and the existing release gates remain pending. No deployment is included.

Local results on 30 October: all 47 unit tests, typecheck/production build, six disposable SQL suites plus upgrade checks, direct-interaction browser checks (including actual Phaser directional graphics and guest re-entry), existing world/Hall Studio browser suites, intercepted shared-world suite and seven-size viewport suite passed. The UI mechanical detector returned no findings. The existing large Phaser bundle warning remains. Independent QA was requested through `D:\AgentTeam\Invoke-QA.ps1`, but Orca returned `runtime_unavailable`; no review was dispatched or independent verdict obtained. Changes remain local and uncommitted.
