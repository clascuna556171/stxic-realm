# Pets at home — visual target and implementation

2 November 2026. Owner authorized applying the selected game-development references, then requested a focused **First Wyrm and profile-banner roaming** pass. Village Cat and the sofa corner remain the initial visual target. Existing code-native artwork is extended directly; no skill installation, engine migration, downloaded art, generation service, or new dependency is required.

## Shared visual rules

- Warm tabby fur, cream muzzle/paws, an oxblood scarf, stepped silhouettes and discrete pixel clusters. Highlights come from the upper left. Pose volume and the bottom-center ground anchor stay consistent.
- Cat canvas stays 32×32 with five states and four frames. Front, rear and both side views are authored in `village-cat-art.ts`; the rear has no facial features, side profiles lead with the muzzle, and sleep uses a curled silhouette. Cat and Triarch are fully redrawn; the other six species retain their authored designs and gain horizontal facing plus shared behavior/rendering improvements.
- Triarch keeps its 48×36 canvas and three-headed identity. `triarch-art.ts` supplies four views, two hind legs, swept and scalloped violet wing arms, curved necks, antique-gold leading edges and horns, and a low coiled sleep. An ember greeting is confined to the happy state. It renders at native scale in Phaser and exactly 2× in the profile banner.
- World pet pixels render at native scale, including the existing 48×36 Triarch. Contact shadows remain small and change shape for sleep. Permanent nameplates are replaced with hover/reaction labels; wildlife still has its existing text/keyboard bonding action outside the canvas.
- The woven sofa-side mat and low ceramic water dish reuse each mood's cloth, timber, stone and sky colors. Cozy, medieval and tech stay distinct. This is a decorative floor textile, with no new collision footprint, catalog ID or stored layout change.
- A mat exists only where an adjacent floor tile is available. It follows the sofa on layout edits and disappears when the sofa is removed. Both Phaser and composed-room previews use the same pixel function.

## Behavior

Personality chooses an intent; a bounded room BFS produces cardinal waypoints around furniture, other pets, the owner, visitors and the entrance tile. Replanning happens on behavior ticks, not every render frame. Unreachable targets produce a resting state rather than repeated movement into furniture.

| Personality | Intent |
| --- | --- |
| Sleepy | Seek the sofa mat or nearby bed floor, then sleep |
| Curious | Approach plants, bookshelves and lamps to inspect |
| Playful | Explore short routes, then react happily |
| Shy | Retreat from the nearest approaching owner/visitor |
| Loyal | Approach an adjacent owner tile without occupying their position |
| Mischievous | Investigate desks, banners and consoles |

Click reactions interrupt the current destination. Existing reduced-motion and hidden-page gates remain in place. These positions and activities are local presentation; server-owned pet ownership, equipment, access and player movement remain authoritative.

The banner companion uses measured pixel bounds, reserves the avatar overlap at the left edge, and keeps the entire sprite inset from the banner edges. Short walks use compositor transforms at constant speed, match the facing artwork, then alternate idle/sitting pauses (longer sleep for Sleepy). Mobile uses the same route, rather than a pinned percentage. Hover and keyboard focus freeze the hit target; clicking or Enter greets the pet. Offscreen, hidden-page and reduced-motion changes cancel the walk at its current visible position. Resizing clamps that position to the new lane, and changing equipment resets the companion lifecycle. There is no banner canvas or per-frame movement loop.

## Assets and validation

- Source: `apps/web/src/pets/village-cat-art.ts`, `triarch-art.ts`, `banner-roam.ts`, `apps/web/src/ProfileBannerPet.tsx`, and `apps/web/src/world/pet-corner.ts`.
- Generator: `node apps/web/scripts/generate-pet-sprites.mjs`.
- Exports: `public/pets/cat-sheet.svg` and `triarch-sheet.svg` (five state rows, four frame columns); `cat-turns.svg` and `triarch-turns.svg` (four direction columns; each state occupies four frame rows).
- Checks: `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm test:pets:ui`, `pnpm test:pets:art:ui`, and `pnpm test:pets:banner:ui`; neighboring furniture poses and shared-world checks exercise the actual Phaser integration.
- Local art fixture captures and result JSON: `.impeccable/review/pet-home-art`. The fixture is explicitly labeled as local and has no hosted backend transport.

## Reference provenance

Applied the process and engine-neutral guidance from [create-game-assets](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/create-game-assets/SKILL.md), its [art-direction reference](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/create-game-assets/references/art-direction.md), and [game-ai](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-ai/SKILL.md). Pixel artwork and TypeScript implementation are original to this project; no example source or third-party artwork was copied. Reference repository is Apache-2.0; no package was installed.
