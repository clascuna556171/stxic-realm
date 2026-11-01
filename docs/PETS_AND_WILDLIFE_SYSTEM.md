# STXIC Realm — Pets & Realm Wildlife System

This document specifies the architecture, database schema, security model, wildlife habitat engine, house movement, profile banner companions, and verification suite for the **Pets & Realm Wildlife System** in STXIC Realm.

---

## 1. Overview & Design Philosophy

Pets in STXIC Realm are living inhabitants of a resident's personal Realm rather than static inventory icons:

- **Starter Adoption**: Every resident can freely adopt one starter companion (`Village Cat`, `Tiny Slime`, or `Woodland Pup`).
- **Realm Wildlife (Habitat Discovery)**: Furniture and decorations contribute habitat tags (`Forest`, `Cozy`, `Magical`, `Ancient`, `Dark`, `Water`, `Warm`, `Light`). When a saved home meets a wild creature's habitat requirements, that creature can visit the room. Completing a gentle 3-step bonding interaction permanently welcomes the pet into the owner's collection.
- **Living House Companions**: Up to **3 owned pets** can be equipped to roam inside the owner's Phaser house scene. Pets navigate walkable floor tiles, respect walls and furniture footprints, react to clicks and nearby owners, and express distinct personality state machines (`Sleepy`, `Curious`, `Playful`, `Shy`, `Loyal`, `Mischievous`).
- **Profile Banner Companion**: Up to **1 owned pet** can be equipped to appear along the lower edge of the user's profile banner (`ProfileBannerPet`), rendered with a lightweight SVG pixel-art loop without spinning up a Phaser canvas on profile pages.
- **Triarch — The First Wyrm (`Founder Exclusive`)**: A sovereign three-headed dragon companion (`48×36` pixel canvas) reserved strictly for the verified STXIC Realm creator account via server-side verification (an operator-verified UUID in `realm_private.founder_accounts` and `realm_private.is_founder`).

---

## 2. Species Catalog

| Species ID | Name | Subtitle | Category | Rarity | Acquisition / Habitat Requirements |
|---|---|---|---|---|---|
| `cat` | Village Cat | — | Starter | `Starter` | Free starter adoption (pick 1 of 3 starters) |
| `slime` | Tiny Slime | — | Starter | `Starter` | Free starter adoption (pick 1 of 3 starters) |
| `pup` | Woodland Pup | — | Starter | `Starter` | Free starter adoption (pick 1 of 3 starters) |
| `fox` | Moss Fox | — | Wildlife | `Uncommon` | `Forest >= 2` and `Cozy >= 1` |
| `wisp` | Crystal Wisp | — | Wildlife | `Uncommon` | `Magical >= 2` |
| `bat` | Cave Bat | — | Wildlife | `Rare` | `Dark >= 1` and `Ancient >= 1` |
| `owl` | Moon Owl | — | Achievement | `Rare` | `Ancient >= 1`, `Magical >= 1`, and `Light >= 1` |
| `triarch` | Triarch | The First Wyrm | Creator Exclusive | `Founder Exclusive` | Server-verified founder grant only (`realm_private.grant_founder_pet`) |

### Pixel-Art Sprite Sheets & Animations

Each species is authored in [`pet-sprites.ts`](../apps/web/src/pets/pet-sprites.ts) and exported to static SVG sprite sheets in `apps/web/public/pets/<species>-sheet.svg` via [`generate-pet-sprites.mjs`](../apps/web/scripts/generate-pet-sprites.mjs).

Every species supports 5 animation states (`idle`, `walk`, `sit`, `sleep`, `happy`) with 4 frames per state:
- Standard companions (`cat`, `slime`, `pup`, `fox`, `wisp`, `bat`, `owl`) render on a `32×32` pixel grid.
- `triarch` renders on a `48×36` pixel grid with charcoal/obsidian scales, scalloped royal-purple wing membranes, antique gold horns, two hind legs, and three independently glancing heads. Four authored views match travel direction; sleep coils the body and lowers all three chins, while happy interactions give a contained violet/gold ember greeting.

---

## 3. Database Schema & Server Authority

Implemented in [`20261102010000_pets_and_wildlife.sql`](../supabase/migrations/20261102010000_pets_and_wildlife.sql):

### Tables

1. **`public.pet_species`**: Canonical read-only catalog of all 8 species, habitat requirements (`jsonb`), personality pools, and sort order.
2. **`public.user_pets`**: Permanent pet ownership records (`id`, `user_id`, `species_id`, `nickname`, `personality`, `acquired_at`, `is_starter`, `affection_level`). Enforces `unique (user_id, species_id)` so pets cannot be duplicated.
3. **`public.pet_encounters`**: Persistent wildlife visitor records (`id`, `user_id`, `species_id`, `status` in `'active' | 'bonded' | 'expired'`). Partial unique index `pet_encounters_one_active_per_user_idx` guarantees at most one active visitor per home and preserves encounters across browser reloads and sessions.
4. **`public.user_pet_equipment`**: Tracks `banner_pet_id` (max 1) and `house_pet_ids` (`uuid[]`, constrained to `cardinality(house_pet_ids) <= 3`).
5. **`realm_private.furniture_habitat_tags`**: Server-side mapping of furniture IDs to habitat tag arrays used when `save_home` evaluates room habitats.
6. **`realm_private.founder_accounts`**: Stores founder user IDs with an operator-set `verified_at` timestamp. Profile names, email patterns, and platform-admin status do not authorize founder access. Direct client access is revoked.

### Row-Level Security & RPCs

All mutations on `user_pets`, `pet_encounters`, and `user_pet_equipment` are revoked from direct client `INSERT`/`UPDATE`/`DELETE` and execute through `security definer` RPCs:

- **`public.adopt_starter_pet(p_species_id, p_nickname)`**: Verifies `p_species_id in ('cat', 'slime', 'pup')`, ensures the caller has not already claimed a starter pet, assigns a personality from the species pool, and auto-equips the new companion to the user's house and profile banner.
- **`public.bond_wildlife_pet(p_encounter_id, p_nickname)`**: Verifies the caller owns the active encounter, marks it `'bonded'`, inserts the permanent `user_pets` row, and auto-equips the pet if a house or banner slot is open.
- **`public.update_pet_nickname(p_pet_id, p_nickname)`**: Validates ownership and nickname constraints (`<= 24` chars, no control characters or angle brackets).
- **`public.equip_pet(p_slot, p_pet_ids)`**: Validates that the caller owns every specified pet UUID, rejects duplicate pet IDs, and enforces the 3-pet house limit and 1-pet banner limit.
- **`public.interact_with_pet(p_pet_id)`**: Increments `affection_level` (up to 999999) for an owned pet.
- **`public.get_user_pets(p_user_id)`**: Returns the catalog, owned pets, equipped pets, and (for the owner only) any active wildlife encounter. Also automatically grants `triarch` if the owner is a verified founder.
- **`realm_private.grant_founder_pet(p_user_id)`**: Strictly checks `realm_private.is_founder(target_id)` and rejects any non-founder caller with `Founder exclusive pet is restricted to the STXIC Realm creator.`

### Integration with `save_home` & `room_state`

- **`public.save_home`**: Preserves existing layout validation, privacy controls, and revision checks, then calls `realm_private.evaluate_wildlife_encounter(auth.uid())` so qualifying unowned wildlife species spawn a persistent `active` encounter immediately upon saving a matching room layout.
- **`public.room_state`**: Augments the room state payload with `house_pets` (visible to authorized home visitors) and `wildlife_encounter` (visible to the home owner).

---

## 4. Realm Wildlife — Habitat Evaluation Engine

Client-side preview and Wildlife Journal clues live in [`wildlife-engine.ts`](../apps/web/src/world/wildlife-engine.ts), mirrored on the server in `realm_private.furniture_habitat_tags`:

| Furniture ID | Habitat Tags |
|---|---|
| `desk` | `Cozy`, `Light` |
| `bookshelf` | `Ancient`, `Magical`, `Dark` |
| `sofa` | `Cozy` |
| `lantern` | `Magical`, `Light`, `Warm`, `Ancient` |
| `banner` | `Ancient`, `Magical`, `Dark` |
| `console` | `Magical`, `Light` |
| `plant` | `Forest`, `Water` |
| `bed` | `Cozy`, `Warm` |
| `coffee-table` | `Cozy`, `Warm` |
| `floor-lamp` | `Forest`, `Warm`, `Light` |
| `mushroom-lamp` | `Forest`, `Warm` |
| `potted-fern` | `Forest` |
| `wooden-pet-bed` | `Cozy` |
| `crystal-lantern` | `Magical`, `Light` |
| `ancient-altar` | `Ancient`, `Magical` |
| `dark-candle` | `Dark`, `Ancient` |

In **Home Studio** ([`HomeStudio.tsx`](../apps/web/src/world/HomeStudio.tsx)), selecting any furniture piece displays its habitat tags and the room's active habitat totals so residents can intentionally design habitats for undiscovered creatures.

---

## 5. House Pet Movement & Profile Banner Companion

### Phaser House Integration ([`pet-actor.ts`](../apps/web/src/world/pet-actor.ts) & [`renderer.ts`](../apps/web/src/world/renderer.ts))

- Renders up to 3 equipped house pets plus any active wild visitor inside the room scene.
- Uses [`isWalkableForPet`](../apps/web/src/world/pet-actor.ts) and [`findSafePetTile`](../apps/web/src/world/pet-actor.ts) to guarantee pets never overlap walls, furniture footprints, `ROOM.spawn`, or each other.
- When a user edits furniture in Home Studio or reloads a layout where a tile becomes blocked, [`stepPetBehavior`](../apps/web/src/world/pet-actor.ts) immediately relocates the pet to the nearest valid walkable tile.
- Clicking an equipped house pet triggers a happy heart/sparkle reaction and displays its name, species, and personality; clicking a wild visitor opens [`WildlifeEncounterModal.tsx`](../apps/web/src/world/WildlifeEncounterModal.tsx).

### Profile Banner Companion ([`ProfileBannerPet.tsx`](../apps/web/src/ProfileBannerPet.tsx))

- Renders the equipped banner pet along the lower edge of the profile banner in [`ProfileStudio.tsx`](../apps/web/src/ProfileStudio.tsx).
- Uses [`PetSprite.tsx`](../apps/web/src/pets/PetSprite.tsx) with `IntersectionObserver`, `document.hidden`, and `prefers-reduced-motion` listeners so animations pause automatically when off-screen or when reduced motion is enabled.
- Measures a safe lane clear of the avatar overlap, walks with matching side views at constant speed, and rests between walks. Hover/focus pauses the hit target; clicking or Enter greets the companion. Resize, visibility and reduced-motion changes interrupt movement at its visible position. Mobile retains roaming; no canvas is created. `pnpm test:pets:banner:ui` verifies these behaviors and equipment lifecycle changes.

---

## 6. Verification & Release Notes

- **Database & RLS Tests**: [`supabase/tests/pets_and_wildlife.sql`](../supabase/tests/pets_and_wildlife.sql) verifies starter adoption limits, habitat evaluation on `save_home`, persistent encounters across reloads, bonding into permanent ownership, equipment caps (max 3 house pets, max 1 banner pet), cross-user RLS protection, and founder-only protection on `triarch`.
  - Run via: `pnpm test:database`
- **Unit Tests**: [`apps/web/tests/pets.test.mjs`](../apps/web/tests/pets.test.mjs) verifies all 8 species, 5 animation states × 4 frames pixel bounds, Triarch's `48×36` multi-head frames, habitat evaluation, and collision-safe pet movement.
  - Run via: `pnpm test`
- **Migration Rollout**: Migration `20261102010000_pets_and_wildlife.sql` is additive and tested locally against the full migration chain (`pnpm test:database`). Apply to the hosted Supabase project during the next migration rollout window.


## 7. QA hardening — 2 November 2026

`20261102020000_pet_authority_hardening.sql` is an additive corrective migration. Apply it after the original pets migration. It closes name/email/admin-based founder impersonation, prevents self-enrollment, hides legacy unverified Triarch records from client reads and active equipment, and preserves those records for operator review. **All legacy founder entries remain unverified until an operator explicitly approves the actual creator UUID.** Do not copy or approve the old automatic registry wholesale.

After independently verifying the creator's account UUID through trusted account ownership evidence, a trusted database operator can run the following with that UUID (not a username, display name, or unverified email):

```sql
insert into realm_private.founder_accounts(user_id, verified_at)
values ('<verified-creator-uuid>'::uuid, clock_timestamp())
on conflict (user_id) do update set verified_at = excluded.verified_at;
```

The creator can then claim/restore Triarch through `public.grant_founder_pet()` while signed in. Existing preserved pet IDs and affection remain intact. Review unrelated legacy entries rather than authorizing them. Client roles cannot set `verified_at` or provision their own founder row. There is no account/local-storage fallback for missing pet RPCs: failures remain failures with migration/schema recovery guidance.

Shared homes accept authoritative empty companion/encounter snapshots and reset pet state per visit. Banner behavior and sprite frames share intersection, page-visibility, and reduced-motion gating. Wildlife bonding uses a native modal dialog with focus containment, Escape dismissal, and focus restoration. Pet interface surfaces, text, borders, and accents use `--realm-*` tokens; species pixel-art colors stay authored.

Regression checks: `pnpm test`, `pnpm test:database` (including `pet_authority.sql` plus the legacy-grant upgrade fixture), and `pnpm test:pets:ui` (isolated real components, installed Chrome, no live backend). These local checks do not apply migrations to hosted Supabase.

## 8. Pets at home — art and behavior pass

The Village Cat now has four authored directions and a curled sleeping pose; `cat-turns.svg` exports all views. A mood-matched woven mat and ceramic water dish sit on valid floor beside the sofa and follow layout edits. All house companions use native pixel scale, contextual labels, grounded shadows and personality-specific destinations with cardinal path routing. Shy pets react to nearby visitors as well as the owner. The other seven species retain their original authored artwork with horizontal facing support; they have not all been redrawn into four views.

See [visual target, scope, source provenance and asset layout](PET_HOME_ART_DIRECTION.md). Run `pnpm test:pets:art:ui` for the real Phaser art/resting/reduced-motion checks and desktop/phone captures. This pass adds no catalog IDs, saved geometry or database migration.
