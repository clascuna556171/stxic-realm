# Hall Studio and visual consistency

## Shared mode added — 29 October 2026

The personal cross-server mode described below remains device-local. A separate `/?server-hall=<space UUID>` view now offers **Decorate shared hall** to current owners and explicitly granted decorators. It reuses the same `HallEditor`, canvas, catalog, themes, placement rules and undo/redo with Supabase RPC save/reload and expected revisions. Shared enablement, grants, portal destinations and announcements have their own server checks. Local hub layouts are never implicitly imported or overwritten. The two new additive migrations remain undeployed; read [SHARED_WORLD.md](SHARED_WORLD.md) for current scope, verification and release gates. The earlier “no backend migrations” wording below records the original personal-editor slice only.

29 October 2026. Supersedes the illustrated, non-editable hall from the first visual pass. The owner asked to correct the mismatched vibe/color and make the hall editable with different components and themes.

## Current experience

- Open **Customize hall** above the hall, or `/?hall-studio`. The normal hall remains `/?spaces`; the guest route is `/?hall-preview`.
- Three environment themes: **Cozy conservatory** (cream, oak, sage), **Emberkeep hall** (limestone, wine-red, firelight), and **Moonlit observatory** (slate, silver, cyan). Theme changes recolor architecture and furniture together. Private app accents remain independent.
- Three entrance slots each offer carved oak doors, an open stone arch or a moonlit portal. Server selection and channel navigation continue to use the membership-scoped directory.
- Ten component types: gathering table, hearth, library shelf, sofa, fern, lantern, banner, project desk, music console and reading lamp. Multiple instances are allowed, up to 32 pieces.
- Add a component, drag it, click a free floor tile to move the selected piece, use arrow keys while the canvas is focused, or enter its column/row. The placed-components list supplies a conventional selection path. Overlaps, bounds, door landings and the central aisle are validated.
- Undo/redo retains up to 50 edits, including themes and architecture. Starter restoration is reversible. Saving preserves history; reloading resets it. Unsaved navigation is guarded, and conflicting writes from another tab require reload.

## Storage and permission scope

This is a **personal cross-server hall**, saved on the current browser/device. Keys are `stxic-realm:hall:v1:<user UUID>` for signed-in accounts and `stxic-realm:hall:v1:guest` for anonymous use. Layouts do not sync across devices or publish to other members. The UI discloses this. Account isolation was checked through the simulated authenticated browser suite. No backend migrations, permissions, hosted data or configuration were changed.

Saved version-1 layouts contain only an allowlisted theme, three allowlisted door styles, runner/greenery booleans and bounded component identities/positions. Invalid data falls back to a starter with a visible warning and can be explicitly replaced in Studio. Failed storage writes keep the current edits open. Stale-write checks supplement cross-tab storage events; this is browser-local draft protection, not transactional collaborative editing.

## Rendering and visual system

`world/hall-art.ts` supplies original deterministic pixel architecture and components to `HallCanvas.tsx` at 768 × 512. It shares furniture with rooms through `world/art.ts`; the configurable character remains 48 × 64 and scales with the hall's pixel proportions. Layout/selection changes redraw the canvas once. No persistent rendering loop, WebGL or new dependency is needed. Subtle ambient effects remain optional and honor reduced motion.

`world/palette.ts` owns environment materials. `world/world-theme.css` restores one obsidian/slate interface across halls, rooms, appearance editing and navigation, removing the prior hall-specific olive/gold controls. Character alcoves and room furniture use the environment palette, while account-selected interface accents remain intact.

The previous generated illustration is preserved as `docs/images/great-hall-source.png` and `docs/images/great-hall-illustrated-v1.webp`. It is no longer a runtime background or shipped public asset. Its original generation prompt remains in [the historical hall notes](SERVER_HALLS.md).

## Verification

- `pnpm test`: 32 passing tests, including all hall themes/art bounds, validation, unsafe saves, history and existing room/character contracts.
- `pnpm build`: TypeScript and production build pass. The existing large lazy Phaser chunk warning remains.
- `pnpm test:hall:ui`: add/move/remove, protected aisle, undo/redo, themes/entrances/runner, save/reload, view integration, pointer drag, keyboard movement, cross-tab conflict and 320px/phone layouts pass.
- `pnpm test:world:ui`: hall navigation/search/effects/reduced motion, appearance persistence, room movement/inspection and Studio removal/undo pass.
- `pnpm test:access:ui`: simulated messaging/admin/privacy/callback flows, hall navigation and per-account hall isolation pass. No real hosted users or mail were used.

Captures: `.impeccable/review/hall-studio/`, `.impeccable/review/world-overhaul/` and `.impeccable/access-review/` (ignored). Desktop/phone layouts were inspected in a batch and confirmed after fixes. The mechanical design scan flagged the material swatches' rounded thick borders; their unnecessary rounding was removed. This pass does not certify live backend behavior, screen-reader support, low-end device performance or independent QA. Shared hall publishing and cross-device synchronization remain separate work.
