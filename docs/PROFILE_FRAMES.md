# Account profile frames

Six original collections, each with circle, rounded-square and square artwork. Open **Profile → Profile frames** (`/?profile`). Choose a collection and shape, preview against your actual account photo or initials, then **Save profile & equip**. This uses the same whole-profile save as the editor's top button. Unsaved edits stay separate from the saved selection. Reset frame changes affects only the frame, shape and effects controls. No frame removes the ornament while retaining the photo shape.

## Architecture

The current frontend is React 19, TypeScript and Vite with plain CSS; routing uses query parameters. Supabase owns authenticated account profiles and optimistic revisions. There is no parallel cosmetic profile store or new dependency.

- `apps/web/src/profile-frames.ts`: validated typed catalog, stable IDs, theme/material descriptions, palettes, availability and three asset references per collection. Unknown/retired IDs render without a frame.
- `ProfileFrame.tsx`: shared photo/initials mask underneath an independent transparent overlay. Insets reserve room for ornaments within a fixed layout footprint. Accepts `avatarSrc`, `frameId`, `frameShape`, `size`, `showEffects`, `className`, label, initials and photo focus. Both `rounded` (legacy) and `rounded-square` are accepted.
- `FrameGallery.tsx`: immediate draft preview, native radio shapes, selectable collection buttons, effects toggle, equipped indicator, no-frame, reset, compact previews and the existing form's submit action. Existing form fieldsets own loading/disabled behavior; existing error/success/conflict handling owns save feedback.
- `AccountPortrait.tsx`: shared rendering in People, chat/message author portraits, server members and the signed-in account footer. The DM header now includes the peer portrait. Public profile cards use the same renderer. Small/list portraits never animate.
- `public/profile-frames/`: eighteen independently usable, transparent, self-contained SVGs. Original paths and ornaments are authored by `scripts/generate-profile-frames.mjs`. No crops or embedded pieces of the supplied reference boards. Metallic shading describes metal; backgrounds and avatar centers are transparent. Artwork remains independent of private UI colors.

Account photos remain separate from world characters. The verification contact sheet uses the existing original Realm character **only as a labeled rendering sample**; it is not assigned to anyone's account.

## Animated effects

The **Animated effects** switch saves the existing `frame_effects` preference. `FrameEffects.tsx` supplies shape-specific SVG light paths and original peripheral particles: Dark Realm has crimson energy and rising embers; Royal Legend has a gold sweep and jewel glints; Nature Spirit has drifting fireflies; Cyber Core has racing cyan/violet circuits; Minimal Mono has fine white glints; Cozy Friends has floating hearts and lilac stars. The avatar center is never covered by an effect.

After the owner found the first motion pass too subtle, the visual target moved toward the larger object-based decorations shown in [Discord's official avatar decoration examples](https://discord.com/blog/avatar-decorations-collect-and-keep-the-newest-styles). Realm now layers original dancing flame tongues, sapphire/gold starbursts, fluttering butterflies, branching lightning and shards, rotating monochrome flares, and bobbing cat/bunny companions with heart balloons. These are original SVG paths, not Discord artwork. Their larger silhouettes move beyond the edge while the face stays readable. Each collection has a distinct 1.7–3.6 second ornament loop in addition to its moving light trace.

Effects run on the live fitting and equipped profile. Gallery samples animate only when equipped, hovered or keyboard-focused. List portraits stay static, sizes below 64px omit effect markup, and CSS also suppresses effects for small responsive containers. IntersectionObserver and document visibility events pause offscreen/background effects. Reduced motion hides the ornamental effect layer and removes its animations while retaining the full static artwork. No canvas, animation dependency, timer or database change is needed for this enhancement.

`node apps/web/scripts/verify-frame-effects.mjs` verifies actual browser motion, all six styles, silhouette paths, the toggle, visibility pausing, reduced motion and phone widths. It creates an ignored interactive preview and captures in `.impeccable/review/profile-frames/effects/`; its receipt records the local preview URL. This is a development rendering aid, not another profile screen or an account save.

## Persistence and authorization

`20261030000000_profile_frames.sql` extends `profile_cards.style` with `frame_id` (default `none`) and `frame_effects` (boolean). Existing `avatar_shape` is the normalized shared photo/frame silhouette (`circle`, `rounded`, `square`). This deliberately extends the actual **account card**, rather than `profile_appearances`, which now owns the independent world character.

The migration wraps the original twelve-field style validator and allowlists the six stable IDs plus `none`. Existing style fields survive additive defaults. The existing `save_profile_card` RPC retains its current-account authorization, row locks and identity/card revision checks; legacy saves omitting frame fields preserve equipped cosmetics. Invalid new selections are rejected server-side. The narrow `account_portraits` projection carries frame settings and supports framed initials with no upload, using the same profile visibility/block checks. Own identity exports the frame as well. No raw browser update permission is added. The existing privacy export includes the style through the account card.

Apply this additive migration in normal reviewed deployment order before using frame saves on a hosted environment. Dynamic function updates have guards and fail if their expected owning implementation changes; review them if the earlier account-profile migration is replaced. This work has not applied the migration or deployed the frontend to hosted Supabase.

## Verification

- `pnpm test`: catalog completeness, uniqueness, shape references, malformed entries and selection fallback, alongside existing tests.
- `pnpm test:database`: actual local PostgreSQL/PGlite functions and RLS. Includes equip/reload, fields retained, invalid IDs/shapes/effects, framed initials, stale revisions, legacy clients, forged owner IDs, direct-write denial and blocked projections. Existing account/media/character tests remain enabled.
- `pnpm typecheck` and `pnpm build`.
- With the Vite server running, `pnpm test:profile:ui`: real browser with intercepted Auth/PostgREST/Storage/Edge transport backed by local SQL. Exercises draft selection, shapes, effects, reset, no-frame, save/reload and existing account flows. Canvas reads confirm clear centers for all 18 SVGs. Desktop, 390px and 320px captures are under ignored `.impeccable/review/profile-frames/`.
- `node apps/web/scripts/verify-frame-rendering.mjs`: real component at 32/48/64/96/128/256px, all 18 variants, missing artwork/photo and invalid-ID fallbacks, compact effects and reduced motion. Produces the labeled contact sheet and verification receipt in that directory. `REALM_UI_ORIGIN` selects the running development server (default `http://127.0.0.1:5175`). This rendering harness uses Vite's development module URLs, not the production bundle.

These checks do not establish hosted Auth/PostgREST deployment, production multi-connection concurrency, real device performance or screen-reader coverage. The app's current interface is dark; the frame art itself is theme-independent, but a full application light theme remains outside this change. Existing Phaser bundle-size warnings are unrelated to frames.
