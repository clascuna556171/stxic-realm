# Design and experience

## Account profiles — 29 October 2026

The owner's Discord profile reference supersedes the earlier character-preview treatment of account profiles. The card uses an uploaded banner, overlapping photo, status, name/handle/pronouns, actions and reorderable content. Account photos belong to the account; the pixel character belongs to rooms, halls and its character studio. Communication portraits use account photos or initials. Never silently use the world character as an account photo.

The charcoal card pairs with labeled Identity, Photos & banner, Style and Sections controls. Phones use a sticky Edit/Preview switch. Public profile colors/fonts/framing are separate from the private app theme. Customization is structured data; user HTML/CSS/JavaScript never executes. Accent colors get contrasting black/white action text; low body-text contrast is disclosed. Reduced motion uses still frames. Exact capabilities and pending deployment: [ACCOUNT_PROFILES.md](ACCOUNT_PROFILES.md). Earlier character-preview descriptions below are historical.

## Sprite Fusion and account refinement — 29 October 2026

The original warm room concept remains the visual authority. A Sprite Fusion library shelf now appears consistently in halls, personal rooms and their editors, with theme-aware timber and source-positioned lantern light. Rooms share the hall's material palette; cozy daylight, sage textiles and oak replace the remaining purple floor portal and mismatched details. Account profiles combine a live character setting, readable account fields and direct links to the three editors. The setting is labeled Character preview and does not claim to show a saved home. See [Sprite Fusion artwork and verification](SPRITEFUSION_ART.md).

## Editable hall and palette correction — 29 October 2026

The owner rejected the mismatch between the illustrated hall, olive/gold controls and the rest of Realm. Current world surfaces use one obsidian/slate interface and original modular pixel artwork. Environment materials come from `world/palette.ts`: cozy cream/oak/sage, medieval limestone/wine-red, and tech slate/silver/cyan. Rooms, furniture and character alcoves inherit those materials; user-selected interface accents remain independent. The personal hall can be arranged in Hall Studio with multiple components, swappable entrances, undo/redo and browser-local account-scoped saves. See [Hall Studio](HALL_STUDIO.md). This supersedes the illustrated-hall implementation below.

## Server Halls and world update — 29 October 2026

The owner's visual-overhaul brief extends Realm into a medieval pixel-art world. Server Halls now leads with an original stone-and-oak gathering hall, selectable entrances, a searchable membership directory and working links into the selected server's channels. Brass, sage, wine-red heraldry and warm lighting belong to the world surfaces; private app accents remain personal. Rooms gain shared source-positioned lighting and medieval masonry; character previews use the same stone-and-brass vocabulary. A self-hosted Pixelify Sans display face complements conventional body text. See [Server Halls](SERVER_HALLS.md) for components, assets, states, verification commands and limits. The historical sections below describe earlier slices; current account and permission behavior is documented in IMPLEMENTATION.md.

Source: specification v1.0, pp. 4–5, 7, 11–12. The PDF describes the planning baseline; the implemented local web direction below supersedes its earlier palette suggestions.

## Brand and visual direction

**Implemented local direction (28 October 2026):** The owner requested a full visual overhaul, original rooms and characters, and an obsidian default. The web app now uses neutral charcoal surfaces across sign-in, chat, room preview, Home Studio and appearance editing. Personal accents and logo colors remain optional choices. This supersedes the earlier green-charcoal implementation and the provisional violet default. The existing flat orbital mark is retained; generated mood concepts remain references, not shipped artwork.

STXIC is the umbrella brand; Realm is the product. Personality: welcoming, calm, expressive, modern and technically competent. Write clearly and concisely without gamer-only jargon. The current app uses a proposed vector logo kit; a simpler concept has since been preferred by the owner. Both remain subject to further design review and reference rights and trademark availability checks before public release. See [logo usage](BRAND_ASSETS.md).

| Token | Proposed default |
| --- | --- |
| Background / surface / elevated | Obsidian `#101115` / Graphite `#1A1C22` / Slate `#262933` |
| Default action / selected accent | Neutral Mist `#DEDEE6`; selectable sage, ocean, clay, violet and mist |
| Primary / secondary text | Mist `#ECECF1` / Muted `#9295A3` |
| Typography | Inter; Segoe UI Variable fallback; JetBrains Mono for code |
| Spacing | 4, 8, 12, 16, 24, 32 px |
| Radius | 8, 12, 16, 24 px |
| Motion | 120–240 ms transitions, with reduced-motion override |

The shell should be quiet and restrained while users customize their own accents. The current local slice implements dark mode; light mode remains planned. Validate actual contrast instead of assuming the palette is accessible. Pixel art uses a consistent grid, nearest-neighbor scaling, a restrained palette and legible silhouettes. Effects must not obscure names, controls, moderation labels or messages. Use original or properly licensed assets.

## Navigation and states

The proposed desktop shell has a space rail, channel/friend sidebar, main chat or world canvas, optional member/activity inspector and bottom user controls. A scene is a dedicated view with a quick return to chat. Shared app-level routes are proposed:

`/friends`, `/messages/:conversationId`, `/spaces/:spaceId/channels/:channelId`, `/homes/:userId`, `/spaces/:spaceId/hall`, `/studio/profile`, `/studio/home`, `/settings`.

Design loading, empty, offline, permission-denied, private-home, full-room, reconnecting, upload-rejected and save-conflict states. Show unsaved edits. If previews exist, distinguish saving from publishing. Responsive web support is desirable; a polished phone app is outside alpha. Touch-friendly inspection may precede touch editing.

## Accessibility and performance

Target WCAG 2.2 AA for the conventional web UI where applicable: keyboard navigation, visible focus, readable contrast, meaningful text alternatives and reduced motion. Every spatial interaction needs a text/list-based equivalent. Chat must be usable even if the world fails. Lazy-load scene assets and the renderer; use sprite atlases and viewport culling, and limit effects. Performance targets are provisional and need measurement on ordinary laptops.

## Identity and themes

Public profile appearance (avatar frame, banner, badges and room) is separate from the viewer's private application theme. Use versioned, validated theme JSON mapped to approved tokens and effects, with safe fallbacks; never execute imported JavaScript. Proposed controls cover colors, allowlisted fonts, density, bounded sidebar width, panels and effects. Reduce or disable motion when requested.



## Implemented art and workbench

- Shared rail connects Chat, Home, Avatar and Studio; narrow screens use bottom navigation. Room inspection and placement retain text controls and do not require operating the canvas.
- `apps/web/src/world/art.ts` owns original deterministic pixel artwork: oak/slate floors, architectural trim, city window, wall gallery, shelves, rug and ten catalog pieces. Phaser draws those same shapes used by the SVG sign-in illustration and furniture thumbnails. No supplied reference artwork is copied into runtime assets.
- Cozy, medieval and tech moods change room materials independently of the private app palette. Existing saved layouts remain valid; the three extra pieces are available in the catalog without being inserted into old drafts.
- `apps/web/src/character.ts` owns the configurable 48 × 64 character. Portraits crop the same drawing used for the full character and room sprite. Six starter looks change identity fields while preserving theme and room mood. Skin, hair style/color, eyes, clothing and accessories remain editable.
- The appearance workbench groups character controls separately from room/interface controls, shows a live full character plus portrait, reports unsaved changes and saves only to browser storage. The room sprite refreshes on room navigation.
- UI surfaces: `#101115`, `#18191F`, `#22242D`; dividers `#30323D`; secondary text `#A6A8B7`. Inter remains the documented interface face. Pixel art carries personality while controls stay conventional.

These are local prototype capabilities. Directional animation, multiplayer, profile synchronization and server-backed home editing remain outside this slice.

## Account-backed surfaces — 28 October 2026

Profile, People and Direct message views extend the obsidian workspace. Signed-in Home/Studio/Appearance use account data; anonymous previews remain device-only. Public character identity and private interface theme are separate database records. The five-item narrow navigation is Chat, People, Home, Avatar, Studio; the Profile is reachable through the People header. Shared rooms show a text roster/positions alongside the scene. Save conflicts name the need to reload; access revocation ends a visit instead of retaining movement rights. See implementation notes for the checked desktop/phone flows and current limits.

Access/admin/privacy additions inherit these surfaces: space switching in chat, conventional labeled administration forms, scoped report queues and a privacy page with explicit reauthentication and deletion disclosure. Channel and DM message controls share a thread component, preserving scroll on earlier-history loads and device drafts per account/stream. Private/space authority comes from current server state; disabled setup, access loss, saving, expiry and revision-conflict states are visible. No visual identity, artwork or world interaction redesign is included.
