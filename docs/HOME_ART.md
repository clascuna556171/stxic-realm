# Authored home architecture and furnishings

2 November 2026. Original code-authored pixel rectangles extend the existing Phaser 3.90 artwork. Cozy is the representative target: cream plaster, oak joinery, a deep window reveal with linen curtains, long floorboards, upholstered seating and folded bedding. Medieval uses hewn masonry, pavers, leather seams and brass hardware. Tech uses framed wall panels, slate slabs, metal cabinetry and a paneled bed frame. Material colors remain independent of the private interface theme.

The back-wall gallery is quieter, the threshold has a woven mat and stone foundation, and furniture has visible support rails, drawer fronts, inset panels and linen hems. Baked-in sofa/bed cats are replaced by folded textiles; Village Cat, Triarch and the other equipped companions remain separate real actors. Obsolete exterior shimmer, wall-vine pixels and detached lamp sparks are removed. The reading-lamp light pool follows its shade rather than its foot, and the window wash is reduced.

## Shared asset family and compatibility

| Source / family | Grid and anchor | Consumers |
| --- | --- | --- |
| `world/art.ts` / `roomPixels` | 512×384 integer cutaway; existing 16×12 room | Phaser Home and Home Studio, composed previews |
| `world/art.ts` / `furniturePixels` | Existing 32px tile units, existing per-item origins and extents | Home, Studio, thumbnails, Hall furniture and pose foregrounds |
| `world/art.ts` / `roomTextilePixels` | Clipped to interior; sofa/bed origins from the supplied layout | Phaser layout redraw and composed previews |
| `world/lighting.ts` and `room-life.ts` | Existing source coordinates and lifecycle | Phaser and shared light consumers |

No external artwork, generation service, new dependency or downloaded asset is used. All source art is original TypeScript. Architecture is static; no new animated layer or timer is introduced. New textile graphics belong to the Phaser scene and use its existing layout event and teardown.

Catalog IDs, collision footprints, starter positions, furniture pose anchors, movement authority, schema version, placement validation and history remain unchanged. Every starter object is reachable from the entrance. Saved homes are never rearranged. Rugs follow edits, disappear when their furniture is removed, and clip at room edges, including legacy seven-piece homes. Floor textiles have no collision or habitat contribution. Text/list controls, touch editing, keyboard input and reduced-motion behavior retain their existing meaning.

## Repeatable verification

`node apps/web/scripts/verify-home-art-ui.mjs --before` captures the current source before an art pass; the same command without `--before` captures the result. It uses the production Phaser renderer with three residents and Village Cat, Triarch and Wisp, at 1440×1000 and 390×844, in all three moods. It also captures actual Home/Studio pages, checks every starter object's entrance route, desk/sofa/bed poses, legacy/moved/removed/restored textile redraws against composed preview pixels, phone overflow and destroy/recreate behavior. It blocks external requests.

Before/after screenshots and raw command logs are in `.impeccable/review/home-art`; detailed run results are in that directory's `VERIFICATION.md`. The before images were captured before changing the artwork. Core and neighboring suites cover typechecking, unit tests, build, furniture poses, world UI, direct interaction, item actions, world polish, companion art and shared worlds. These are lead-run local Chromium checks, with mocked backend transport where required. They do not establish live Supabase multiplayer, physical-device/Safari rendering or independent art approval.
