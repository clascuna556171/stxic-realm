# Sprite Fusion furnishing and account refinement

29 October shared-world continuation reuses the compiled shelf, room/hall materials and free effects without generating assets or invoking any paid tools. The personal hub remains local; the new **shared Server Hall** mode saves per space after its two additive migrations are deployed. Earlier local-only hall statements below describe the personal mode. See [SHARED_WORLD.md](SHARED_WORLD.md).

## Free effects integration — 29 October 2026

The owner subsequently requested using free assets. Sprite Fusion MCP `list_vfx` and `get_vfx` supplied the MIT-licensed fireflies and embers sources, retained unmodified in `apps/web/src/world/vfx/` with their license. The license is also shipped at `/licenses/SpriteFusion-VFX.txt`.

`WorldAmbience.tsx` adapts their original fixed-60-Hz simulation to a half-resolution canvas composited at 30 Hz, using sparse densities. Fireflies are clipped to personal-room exterior greenery in guest and authenticated homes. Hall embers follow each placed hearth and disappear when it is removed; the existing Ambient effects toggle removes the overlay. Layout editing stays static. The original artwork, themes and navigation remain intact.

Animation stops when the page is hidden, the canvas is offscreen, or reduced motion is enabled. Listeners/observers/animation frames are released on unmount. No paid generation tools or credits were used. Other library effects (combat, ice, lightning, heavy weather) were reviewed and excluded because they distract from the cozy social setting. These free tools provide effects rather than a furniture/tileset catalog.

Source previews: [fireflies](https://www.spritefusion.com/pixel-art-vfx/fireflies), [embers](https://www.spritefusion.com/pixel-art-vfx/embers). A source-level regression verifies seeded deterministic rendering and that stopped effects drain; the world browser suite checks room interaction, hall toggling and reduced-motion behavior.

Implemented locally on 29 October 2026, following the owner's original room/character concept and existing cozy, medieval and tech choices. The obsidian/slate interface and personal accent settings remain intact.

## Artwork and provenance

Sprite Fusion MCP `generate_sprites_in_style` used `docs/images/realm-room-character-concept-v3.png` as the style reference. Request `req_26951d82-bd02-442a-a83b-ef541df60027` returned nine library-shelf variants in one batch. Original PNGs and the complete prompt/result metadata are preserved in `docs/images/spritefusion/`. The selected source is `shelf-7.png`, asset `b88ae9c9-4488-4536-809e-bf0b8e10977f`.

The service reported 15 credits used and zero remaining. Subsequent sofa and desk requests returned “An active subscription is required” and produced no new assets. Those furnishings continue to use Realm's existing original artwork; they are not Sprite Fusion assets. No repeated paid requests or subscription changes were made.

`python apps/web/scripts/compile-spritefusion.py` reproducibly crops the selected source's transparent padding, resamples to a 64×80 logical sprite using nearest-neighbor sampling, reduces it to 48 colors, and coalesces matching pixel runs into `world/spritefusion-shelf.ts`. Pillow is a development-only requirement for this optional art compilation step. Normal web builds need no new dependency and no external media request.

`world/sprite-art.ts` supplies the same compiled furnishing to both room and hall renderers. Cozy retains the source colors; medieval and tech map warm timber to the corresponding material palette while preserving books, ivy and lantern colors. Its 2×2-tile footprint and 16-pixel visual overhang preserve existing layouts and movement rules. Source-positioned lantern light follows the shelf when moved or removed.

## Account, halls and rooms

- Profile editing retains account-backed fields, revision-aware saves, reload, privacy copy and unsaved-change handling. A live identity preview pairs the member's character with a room setting, followed by links to character customization, Home Studio and Hall Studio. The setting is explicitly a character preview, not a rendering of the member's saved home layout. `ProfileScene.tsx` draws once on canvas; no animation loop or Phaser instance is added to the account page.
- Room architecture now uses the hall's shared material palette. Cozy has a daylight window, sage textiles and honey oak; the former purple floor portal is a woven medallion. Window/gallery details, entrance mat, stone steps and bed/sofa fabrics follow the selected mood.
- Home Studio has matching furniture thumbnails. Its renderer and thumbnails use the loaded home mood when editing an account home. Room preview thumbnails also follow the selected mood.
- The generated shelf is an independently movable component in both editors, using existing IDs and saved-layout formats. Hall saves remain local to this device and account; shared hall publishing and remote hall synchronization are unchanged.

## Verification

32 unit tests and production TypeScript/Vite build pass. The existing world, hall and simulated authenticated browser suites pass, covering room movement/inspection, layout undo/redo, saved themes/entrances, pointer and keyboard movement, stale-tab save conflicts, membership deep links and account isolation. The authenticated suite now checks the redesigned profile's frontend save/reload path, live preview, editor links, private-character-payload separation and 390/320px layouts against simulated Auth/PostgREST.

Visual inspection covers account/hall/room desktop and phone captures. The changed interface files' mechanical design scan found no issues. The hall fixture brings the first tab to the foreground before checking storage-conflict UI, avoiding headless browser background-tab throttling. A first parallel cold-development-server run timed out loading Phaser; the isolated warm-server world suite passed. No hosted-account verification, backend/deployment changes, assistive-technology testing, low-end performance benchmark or independent QA is implied. The existing large lazy Phaser bundle warning remains.
