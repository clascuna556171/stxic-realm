# STXIC Realm agent guidance

Apply the installed brainstorming skill proportionately to each prompt. Clear tasks need a quick assumptions check, not another approval cycle. Do not automatically invoke other Superpowers skills.

## Current project and boundaries

- The working application is `apps/web`: React, TypeScript, Vite, **Phaser 3.90**, and Supabase. The `Build STXIC Realm App` folder is a separate historical export.
- Read the current Git state and relevant source before editing. Preserve existing uncommitted work. Do not reset, deploy, apply hosted migrations, commit, or push without the owner's authorization.
- Keep Phaser 3.90 and the existing architecture. The installed Phaser guide also covers Phaser 4; verify examples against this project's pinned version. Engine migration requires an explicit request.
- Ownership, equipment, permissions, founder verification and public badge unlocks remain server-owned. Founder authority uses an independently verified UUID, never names, email patterns, client storage, or generic administrator status.
- Preserve catalog IDs, collision footprints, saved layouts, validation, editing and undo/redo. Account photos and banners remain separate from world characters.

## Shared game-development skills

Canonical project skills are in `.agents/skills/`. Read only the skills and supporting references relevant to the task:

| Task | Skill |
| --- | --- |
| Pet/character/furniture art, animation sheets, scale and asset QA | `create-game-assets` |
| Pet personalities, decisions, interruption and routing | `game-ai` |
| Home/hall composition, movement clearance and interaction reachability | `level-design` |
| Character/pet reactions, anticipation and settling | `game-feel` |
| Spatial controls, inspection UI, keyboard focus and responsive layout | `game-ui-ux` |
| Measured frame-time, redraw, batching and allocation work | `performance-optimization` |
| Phaser scene/rendering/lifecycle work, adapted to 3.90 | `phaser-core` |

The selected upstream revision and file hashes are recorded in `.agents/skills/gamedev-lock.json`. Claude-compatible copies live in `.claude/skills/`; check or refresh them with `scripts/sync-game-dev-skills.ps1`. References to other engines or related skills in upstream documentation do not authorize installing them or expanding the task.

## Visual and behavioral constraints

- Use `docs/DESIGN.md`, `docs/PET_HOME_ART_DIRECTION.md`, `docs/PETS_AND_WILDLIFE_SYSTEM.md` and `docs/ROOMS_AND_CHARACTERS_DIRECTION.md` as the existing design context. Preserve Village Cat and Triarch's identities and authored palettes.
- Preserve crisp pixel grids, stable ground anchors and intentional integer display scales. Keep cozy, medieval and tech materials distinct. UI uses `var(--realm-*)`; pixel art keeps authored colors. Avoid OS emoji and generic glow/gradient decoration.
- Respect reduced motion, visibility pauses, scene teardown and asynchronous response lifecycles. Floating/flying presentation must still respect room collision and authoritative equipment.
- Prefer the existing small-room personality and cardinal-routing model. New behavior should improve observable interactions, without unrelated combat, marketplaces or monetization.

## Verification and handoff

Run checks appropriate to the change. Core commands are `pnpm typecheck`, `pnpm test`, and `pnpm build`; SQL changes also need `pnpm test:database`. Rendered changes need relevant browser suites and desktop/phone inspection. Run browser suites sequentially. Use pose/shared-world checks when touching those behaviors. Distinguish local fixtures from live backend evidence and lead-run checks from independent QA.

For relevant project history, consult `D:\Tech Second Brain\AI Knowledge\Project Index.md` and the matching Realm handoff selectively; verify notes against source. After significant authorized work, update that handoff concisely. Do not store secrets or unrelated sensitive data.
