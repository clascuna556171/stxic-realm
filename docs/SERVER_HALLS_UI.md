# Server Halls entrance refinement

The selected server and direct entry action live in a shared header above Hall and Servers & channels. Directory selection changes the selected community and hall wing without moving the character; entrance buttons explicitly walk toward a door. Walking remains optional. Entry opens the first active channel, or available archived history. Closed servers and servers without channels do not offer a misleading chat destination.

The directory uses ordinary interface typography, membership-scoped server search, an explicit selected state, a bounded server list and the complete selected-server channel list. Archived channel links identify read-only history. A separate link opens the community's shared hall. Hall options disclose effects and personal-hall customization, keeping it distinct from shared layouts.

Join and Create open a single in-workspace form with input focus, Escape/Back and focus restoration. Incoming invitations open Join directly. Existing RPCs, operator enablement and role-gated server settings remain authoritative. Settings/membership are secondary; members do not receive rename or channel-management controls.

Desktop controls share one compact row. Phones retain selection/entry above the view switch, a compact movement toolbar and internal directory scrolling. Short landscape windows combine the header controls. Focus-driven scrolling is contained within the directory; very short phone windows retain an outer scrolling fallback. Scene geometry, authored pixels, furniture, collisions, movement, catalog identifiers and saved layouts are unchanged.

Server and channel loading use decorative blocks with the existing skeleton animation, a loading status and reduced-motion/forced-color fallbacks. The startup skeleton recognizes `?spaces` as a scene destination. List, channel and action errors are separate; list/channel failures offer retries, while no membership, no matches, no channels, archived and closed states use actual fetched data.

## Verification

- `pnpm --dir apps/web typecheck`: pass; production build also checks TypeScript.
- `pnpm --dir apps/web test`: 112 passed.
- `pnpm --dir apps/web build`: pass. Existing Safety/Social dynamic-import warnings remain.
- `git diff --check`: pass. Impeccable mechanical scan of the changed entrance sources: no findings.
- `node apps/web/scripts/verify-server-halls-ui.mjs`: 28 checks covering desktop 1440x900, phone 390x844, narrow 320x700 and landscape 720x450; selection, search, wing/context retention, entry navigation, archived/closed/no-channel states, Join/Create focus and submissions, member permissions, failure/retry, skeletons and reduced motion. Screenshot review includes desktop, phone, directory, short landscape and Glass.
- `node apps/web/scripts/verify-workspace-ui.mjs`: seven sizes passed with the existing scene-height and visibility assertions intact, including Home interactions.
- `REALM_UI_ORIGIN=http://127.0.0.1:5175 node apps/web/scripts/verify-loading-ui.mjs`: four loading/recovery sizes passed.
- `node apps/web/scripts/verify-glass-ui.mjs`: guest toggle, persistence, editors, theme independence, reduced transparency, forced colors and responsive checks passed.

Evidence: `.impeccable/review/server-halls/verification.json` and PNGs; `.impeccable/review/workspace-layout/`; `.impeccable/review/glass/`.

All checks were lead-run local Chromium. Authenticated checks intercept Auth/PostgREST and execute local PGlite migrations/RLS; no hosted backend, real GoTrue, Realtime, mail, physical device, Safari or assistive-technology verification. No dependencies, production backend changes, migrations, commit, push or deployment.
