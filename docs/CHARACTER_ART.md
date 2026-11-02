# World character artwork

2 November 2026. Original code-authored art; no downloaded or generated bitmap assets. The everyday jacket established the representative target before the same anatomy was carried across the existing options.

`apps/web/src/character.ts` owns one 48×64 integer pixel grid with a bottom-center (24,64) anchor. Smaller stepped heads, visible necks, tapered shoulders, connected sleeves/cuffs/hands and longer separated legs replace the earlier large-head silhouette. Hair silhouettes are short/nape, long/shoulder locks, clustered curls and asymmetric swept fringe. Derived color ramps preserve the selected skin, hair and eyes. Highlights favor the upper left; outlines and small material clusters distinguish linen/denim, cloak/leather/brass and paneled tech clothing.

The four views share their anatomy, palette and headgear envelope. Neutral plus opposing walk phases, blink, shoulder-only inhale, bent-knee seating and closed-eye supine bed rest are drawn as complete body parts. Rest retains the costume under the existing quilt foreground. Home's Phaser 3.90 renderer, HallTraveler and Character Studio consume these functions; no collision, movement authority, saved IDs or furniture anchor changes are required. Existing world display scale is retained to preserve furniture fit; inspection exports are native 1× and nearest-neighbor 3×.

The Studio adds only Front/Left/Rear/Right and an inspection pose selector. Drafts, save behavior, option IDs, account photos and profile banners retain their existing meaning. Idle/walk timers stop for reduced motion and hidden documents and remove listeners on teardown. Bed rest stays still, with closed eyes; seated characters may blink and breathe.

## Asset family / provenance manifest

| Source | Canvas / pivot | Variants | Motion / pose | Use |
| --- | --- | --- | --- | --- |
| `character.ts` resident layers | 48×64 / 24,64 | Existing 5 skins × 5 hair colors × 4 hair silhouettes × 4 eyes × 3 outfits × 4 accessories; four directions | Neutral, walk A/B, blink, inhale, seated, supine rest | World resident, shared SVG inspection |

All art in this pass is original authored TypeScript pixel rectangles. No external art, image generation, package or engine migration. Backgrounds and companions in captures are the existing Realm art, including the owner's uncommitted changes.

## Repeatable evidence

`node apps/web/scripts/verify-character-art-ui.mjs` exports 48 sampled appearances × four directions × seven states at 1×/3× (2,688 rendered cells per before/after family), captures actual Studio/Home and a real Phaser room with multiple residents, Village Cat, Triarch and Wisp at desktop/390px, and compares all 16 Studio view/pose combinations to shared source under reduced motion. It also checks idle animation and hidden/reduced-motion pauses. Unit coverage checks every supported skin/hair/style/outfit/accessory combination across all views and seven states, head/equipment stability, fixed support soles and palette immutability.

Baseline source/captures, sheets, screenshots, browser logs and final results are local ignored artifacts under `.impeccable/review/character-art`. `--before --sheets-only` re-exports the saved baseline source without overwriting the original in-world captures. Full outcomes and limits: `VERIFICATION.md` in that evidence directory.

These are lead-run local browser fixtures. They do not establish live authenticated multiplayer behavior, physical-device rendering, Safari/assistive-technology coverage or independent art approval. The existing two opposing walk phases and grid movement cadence are retained; this pass does not add a skeletal animation system or change authoritative movement timing.
