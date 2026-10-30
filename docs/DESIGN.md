# Design and experience

## Viewport workspaces — 30 October 2026

Chat/DMs and the main Home/Halls views stay within the browser viewport. The workspace rail, channel heading/account controls, chat header and composer stay in place; messages and long lists scroll inside their own panels. Worlds fit their original proportions within the available stage. Home social features and shared-hall boards/settings sit beside the scene, with Scene/Details buttons on narrower windows and retained drafts. Short windows use compact navigation and scrollable detail fallbacks. Full editors and long profile/settings forms keep normal document scrolling. See [workspace layout](WORKSPACE_LAYOUT.md) for boundaries and verification.

## Account profile frames — 30 October 2026

Profile frames extend the existing obsidian profile editor with six original material collections, each with separate circle, rounded-square and square SVG artwork. Frames surround the account photo or initials; world characters remain separate. Selection previews a draft, while the equipped marker reflects the saved collection. The bottom **Save profile & equip** action saves the whole profile; **Reset frame changes** restores only the saved frame, shape and effects. Compact portraits and reduced-motion views suppress optional effects. Frame art is independent of the private app palette; the interface remains dark. See [profile frames](PROFILE_FRAMES.md) for implementation, local verification and pending hosted rollout.

The owner requested more visible effects after the first pass felt plain. Each collection now has shape-following animated edge light and its own particle treatment: crimson embers, gold/jewel glints, woodland fireflies, cyan/violet circuits, fine white sparkles or floating pastel charms. The **Animated effects** preference controls both the fitting and gallery previews; gallery motion runs for the equipped, hovered or keyboard-focused sample. Motion pauses offscreen and in background documents, and the full static artwork remains for compact and reduced-motion views.

The owner subsequently rejected subtle edge motion and named Discord decorations as the reference. The current effect layer therefore adds larger animated objects: flames, sapphire starbursts, butterflies, lightning shards, monochrome star flares and playful cat/bunny companions. These original motifs extend around the silhouette and keep the central face clear. Preserve this pronounced motion direction when refining cosmetics; the earlier restrained glint-only treatment was not accepted.

## Approved modern social shell — 29 October 2026

The owner supplied a dark community/chat reference and explicitly selected: (1) modern app chrome with pixel artwork/display lettering mainly in worlds and studios, (2) charcoal surfaces with the user's chosen accent, and (3) rounded messages with the sender's own messages on the right plus server details on desktop. This supersedes the earlier pixel chat headings and sidebar character-alcove direction below.

`modern-shell.css` owns the shared neutral surfaces, conventional app typography, navigation states, rounded controls and message-bubble geometry. Profile cards still use their saved personal colors/fonts, and world art/layout data is untouched. `realm-experience.css` now owns only world destination hierarchy. Settings, profile editing, People, privacy and administration use conventional app typography; Home/Server Halls and world studios retain their pixel headings.

`MessageThread` owns the same bubble layout for channels and DMs, preserving chronological DOM order, visible authors, edits/tombstones, reporting, drafts and history. Own-message fill reads the existing private accent token and uses contrasting dark text. Message actions remain keyboard accessible rather than hover-only. Compact server-details mode keeps the thread mounted, preserves drafts and restores bottom scrolling when returning.

`ServerDetails` uses the existing membership-scoped `space_admin_data` RPC plus authorized profile projections. It shows real server names, channels, membership roles and account photos/initials, with no invented online status, voice, attachment or reaction capability. It polls while visible and reconciles on focus/online, discards late reads and clears member records on failure. A full-width details view replaces the conversation area on compact screens while open; closing or Escape returns focus to the header control. Empty servers follow the same layout. Clipboard failure exposes the actual computed destination for manual copying. Profile/Settings shortcuts and the mobile More disclosure remain.

Local verification: production build/typecheck and 37 unit tests pass; intercepted access contracts cover bubbles, membership-read failure isolation, keyboard dismissal and retained drafts; profile and world suites cover separate profile identity, old layouts, rendering failures and responsive flows. These use intercepted provider requests, not live Supabase evidence. A finish reviewer found the compact empty-server layout defect; the correction was independently verified at 390px.

## Settings discovery and home navigation — 29 October 2026

App settings has a dedicated `/?settings` destination grouped into Account & app and Your world. The desktop rail keeps labeled Profile and Settings icons visible. Phones retain Chat/Halls/People/Home and a More disclosure containing Profile, App settings, Character and Home Studio; Escape closes the disclosure and returns focus. Interface & colors links to the existing workbench with `section=interface` and the color section in view. Save ownership and account/character separation remain unchanged.

Home social controls separate return/refresh from section shortcuts. Guestbook and Project desk have labeled icons, and owners can open/focus Guestbook & project link settings through Home social settings. Posting retains its existing permissions, limits, retry behavior and revision checks.

## Character-led communication — 29 October 2026

The owner found the prior refinement bland. Reference research: [Nixtio, Online Game Interface Design](https://dribbble.com/shots/26863301-Online-Game-Interface-Design) for world/character integration and [TheKoswog, Next-Gen Game Community UI](https://dribbble.com/shots/25852745-Next-Gen-Game-Community-UI-Dark-Sleek-Design) for navigation/content hierarchy. These are conceptual references; no external artwork or UI assets were copied.

Chat now anchors its sidebar with the actual selected server name and an initial seal. Realm Display identifies the server/channel; conventional text remains in messages and forms. A desktop character alcove uses existing original artwork and account-backed character settings, explicitly separate from the account portrait and saved home layout. The character shortcut recedes on compact or short screens so the conversation and composer retain space. Server Halls uses stronger directory and destination hierarchy. Dark slate surfaces and user-selected accents remain; no invented presence, events or rewards are introduced.

## Navigation and icons — 29 October 2026

Chat, worlds and editors share the same labeled workspace navigation and current-page indicator. Compact, angular SVG glyphs take cues from Realm’s pixel world while retaining familiar, legible symbols; People and Avatar use different silhouettes. Chat keeps account profile and privacy links in its account area. At phone widths the navigation uses a safe-area-aware bottom bar; short landscape windows use a more compact side rail. Keyboard focus stays visible, and scene controls remain independent of the navigation. This is a local refinement of the existing obsidian interface and does not alter artwork or saved customization.

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

## Direct world interaction - 30 October 2026

Home and Halls now support click/tap routes around furniture, adjacent object actions, directional character artwork and editor-only drag placement. Existing obsidian controls, saved layouts and permissions remain the authority. Arrival controls remain in the scene on narrow windows; keyboard, position forms and directories remain available. Shared Home sends each step to the server; Hall walking has no multiplayer presence. See [direct interaction](DIRECT_INTERACTION.md) for behavior, checks and limits.
