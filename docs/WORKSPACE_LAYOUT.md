# Viewport workspaces

Chat, direct messages, Home and Halls use the available browser viewport. Navigation, page headings and primary controls stay in place. Content exceeding the available area scrolls in its own pane; hiding the document's scrollbar alone is not the implementation.

`apps/web/src/workspace-layout.css`, imported after the shared chrome, owns the scoped layout overrides. Full editors, account/profile forms and other long reading/settings surfaces retain normal document scrolling.

## Chat and direct messages

- The application shell is bounded by `100dvh`, with the mobile navigation safe area subtracted.
- The channel heading and signed-in account controls remain separate from the channel-list scroller. Compact layouts use a horizontal channel list and retain a compact account/sign-out row.
- Conversation headers, refresh controls and the composer remain outside the message scroller. Long channel/member details scroll within their pane and keep their close/header row sticky.
- Abuse-report forms use their own scrollable conversation region, preserving the composer and other controls in limited space.
- The fixed workspace rail compresses spacing for short desktop/landscape windows instead of scrolling its destinations offscreen. Phones retain the existing bottom navigation and More menu.

## Home and halls

The `.viewport-world` class is applied only to the main room preview, authenticated Home, personal Server Halls and shared Server Hall. Scene containers use measured available height with their original 4:3 or 3:2 proportions. No artwork, stored coordinates or canvas pointer-coordinate system is stretched or cropped to fit.

Home keeps its people, objects, guestbook, project links and social settings in the inspector. Shared Server Halls keep announcements and owner settings beside the scene. Personal halls keep server search/list and the selected destination in their directory.

Personal Halls prioritize the scene: one compact toolbar combines the theme, customization, effects and Join/Create controls. The shell already identifies the page, so the duplicate heading/tagline, scene helper bars, location caption and Home/Avatar shortcut cards are removed. Home and Avatar remain in the main navigation. Management stays behind its compact disclosure, and empty status messages consume no space. The hall uses the full available content width at its original 3:2 proportions.

At widths up to 900px, `WorldViewSwitch.tsx` provides Scene/Details buttons. Hidden panes remain mounted, retaining drafts and current data. The `#home-social` destination initially opens Home details so settings shortcuts remain useful. Server management temporarily replaces the personal hall's scene with its existing forms; closing the disclosure returns to the hall.

Very short landscape windows omit repeated introductions and secondary hints, retaining navigation and actions. Shared hall content can scroll internally when its controls cannot physically fit above the scene.

## Verification

With a Vite server running, set `REALM_UI_ORIGIN` to its origin (default `http://127.0.0.1:5175`).

- `node apps/web/scripts/verify-workspace-ui.mjs`: isolated anonymous Home/Halls, document overflow, scene/control reachability, keyboard movement, object/sitting actions, view switching and fixed navigation at 1920×972, 1440×900, 1280×720, 663×844, 390×844, 320×740 and 844×390. Desktop halls must occupy at least 65% of the viewport height.
- `pnpm test:world:social:ui`: intercepted Auth/PostgREST backed by local PGlite SQL/RLS; preserves guestbook/settings, hall permissions, saved drafts and renderer-failure behavior. Additional layout checks use 41 channels and 45 fixture messages, checking stationary chrome/composer and internal scroll at desktop, laptop, narrow, phone and landscape sizes. Bulk-message fixture setup changes the send-burst setting only in its disposable local database.
- `pnpm test:world:ui`: existing anonymous world/editor behavior.
- `pnpm build`: includes TypeScript checks.

Captures and receipts are in ignored `.impeccable/review/workspace-layout/`. Browser checks use desktop Chrome and emulated viewport sizes; physical devices, mobile soft keyboards, screen readers and hosted multi-user behavior are not established by these tests. This change performs no hosted database or authentication operations.
