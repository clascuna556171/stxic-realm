# Design and experience

Source: specification v1.0, pp. 4–5, 7, 11–12. All artwork and interface details remain proposed.

## Brand and visual direction

STXIC is the umbrella brand; Realm is the product. Personality: welcoming, calm, expressive, modern and technically competent. Write clearly and concisely without gamer-only jargon. A simple orbit/portal motif is a logo direction, not a finished mark; design an original mark and check trademark availability before public release.

| Token | Proposed default |
| --- | --- |
| Background / surface / elevated | Obsidian `#101115` / Graphite `#1A1C22` / Slate `#262933` |
| Accent | Realm Violet `#A78BFA` |
| Primary / secondary text | Mist `#ECECF1` / Muted `#9295A3` |
| Typography | Inter; Segoe UI Variable fallback; JetBrains Mono for code |
| Spacing | 4, 8, 12, 16, 24, 32 px |
| Radius | 8, 12, 16, 24 px |
| Motion | 120–240 ms transitions, with reduced-motion override |

The shell should be quiet and restrained while users customize their own accents. Offer light and dark themes; validate actual contrast instead of assuming the palette is accessible. Pixel art uses a consistent grid, nearest-neighbor scaling, a restrained palette and legible silhouettes. Effects must not obscure names, controls, moderation labels or messages. Use original or properly licensed assets.

## Navigation and states

The proposed desktop shell has a space rail, channel/friend sidebar, main chat or world canvas, optional member/activity inspector and bottom user controls. A scene is a dedicated view with a quick return to chat. Shared app-level routes are proposed:

`/friends`, `/messages/:conversationId`, `/spaces/:spaceId/channels/:channelId`, `/homes/:userId`, `/spaces/:spaceId/hall`, `/studio/profile`, `/studio/home`, `/settings`.

Design loading, empty, offline, permission-denied, private-home, full-room, reconnecting, upload-rejected and save-conflict states. Show unsaved edits. If previews exist, distinguish saving from publishing. Responsive web support is desirable; a polished phone app is outside alpha. Touch-friendly inspection may precede touch editing.

## Accessibility and performance

Target WCAG 2.2 AA for the conventional web UI where applicable: keyboard navigation, visible focus, readable contrast, meaningful text alternatives and reduced motion. Every spatial interaction needs a text/list-based equivalent. Chat must be usable even if the world fails. Lazy-load scene assets and the renderer; use sprite atlases and viewport culling, and limit effects. Performance targets are provisional and need measurement on ordinary laptops.

## Identity and themes

Public profile appearance (avatar frame, banner, badges and room) is separate from the viewer's private application theme. Use versioned, validated theme JSON mapped to approved tokens and effects, with safe fallbacks; never execute imported JavaScript. Proposed controls cover colors, allowlisted fonts, density, bounded sidebar width, panels and effects. Reduce or disable motion when requested.
