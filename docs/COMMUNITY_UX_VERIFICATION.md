# Community journeys — 7 November 2026

Implemented locally on `main`, based on `9db9fae`. The starting tree was clean. No commit, push, deployment, hosted migration, or new dependency was made.

## Result

Chat now presents a membership-scoped **What’s happening** summary above Rooms. Its primary destination follows the available focus session, then an open project, then the noticeboard. It does not register presence, join anything, invent activity, or count private participants. An Activities link in the conversation header works at every tested width. Focus, Projects, Memory and Shared hall have direct destinations; the selected server stays in each URL.

Community activities put the current task before presence and administration. Hall objects are contextual to the scene, and connected chat sits in a **Chat in this server** disclosure that also works in the phone Community view. Compact headings and status spacing leave more room on short screens. Authored art, movement geometry, saved layouts and the existing theme/Glass preferences are retained.

An eligible own channel message now offers **Preserve in community memory** in its existing actions menu. A focused dialog previews that single message, explains sharing, asks for a title and requires deliberate confirmation. It retains the title on failure and retries with the same operation ID. There is no message-ID field or clipboard dependency. The action also works in connected hall chat. DMs, other authors’ messages, deleted messages and read-only threads do not offer it. The server remains the final authority; changes to a visible source reconcile the dialog.

The existing `community_change` and `community_state` contracts remain unchanged. Memories project current source text rather than an independent transcript. Source deletion, channel archival, blocking, or loss of relevant membership hide entries through server-side rules. Existing attribution, title editing, removal, staff display controls and reporting remain available where authorized. No conversation is archived automatically.

Unsent focus/project/contribution/notice/memory inputs and retry IDs survive activity tab changes and failed reads within the mounted server workspace. Protected result snapshots still clear on failure. Hall failures now offer Retry shared hall and Continue in chat; the scene boundary offers Retry hall scene. Existing per-channel chat drafts survive the return journey and can be sent.

## Verification

All checks below were lead-run. Browser suites ran sequentially against a dedicated local Vite server on port 5178.

| Check | Result / scope |
| --- | --- |
| `pnpm typecheck` | Passed; production build also runs `tsc --noEmit` |
| `pnpm test` | 124 passed |
| `pnpm test:database` | All 12 SQL suites and upgrade/integration fixture checks passed in local PGlite |
| `pnpm build` | Passed; existing Safety/Social mixed static/dynamic import warnings remain |
| `verify-community-places-ui.mjs` | 35 checks passed; owner, moderator, member, nonmember, private focus joining, contribution/review/completion, reporting/blocking, direct preservation and retry, source deletion, draft restoration, hall failure and return to chat |
| `verify-community-ui.mjs` | 20 checks passed; chat/search/sending, room/server controls, focus ownership, drafts, failure/retry and archive behavior |
| `verify-world-social-ui.mjs` | Passed with 1,520 intercepted requests; shared homes/halls, old layouts, collision/routing, decorator grants/revocation, stale revisions, undo/redo, renderer failure and chat, responsive workspaces |
| `verify-furniture-poses-ui.mjs` | Passed; anchors, posture, foreground occlusion, stable snapshots and stand/move restoration |
| `git diff --check` | Passed |

The SQL suite now explicitly checks DM preservation denial, memory visibility after blocking/unblocking, current source text after editing, and source-author membership loss. Existing checks cover nonmember access, consent, source archival/deletion, stale revisions, moderation and account erasure.

The community suite completes chat → selected community → shared hall → focus/projects at 1440×900, 390×844, 320×700 and 720×450. Other browser suites cover additional widths, long room lists and names. Keyboard checks cover message menus, dialog containment, Escape, focus restoration, and activity controls. The selected activity label passes the tested 4.5:1 foreground/background contrast check and 44px target-height check. Reduced motion and the existing Glass reduced-transparency fallback are exercised.

Screenshots were opened and visually inspected, including desktop chat, phone preservation failure, phone memory, narrow community navigation and short-landscape focus. The short landscape pane scrolls to lower session controls; it does not require walking.

## Evidence and screenshots

- [Community checks and captures](../.impeccable/review/community-places/verification.json)
- [Desktop chat and next action](../.impeccable/review/community-places/desktop-chat-next-step.png)
- [Phone community navigation](../.impeccable/review/community-places/phone-chat.png)
- [Narrow community navigation](../.impeccable/review/community-places/narrow-chat.png)
- [Phone preserve failure and retry](../.impeccable/review/community-places/phone-preserve-retry.png)
- [Phone community memory](../.impeccable/review/community-places/phone-memory.png)
- [Short landscape](../.impeccable/review/community-places/landscape-focus.png)
- [Reduced transparency](../.impeccable/review/community-places/phone-reduced-transparency.png)
- [Chat regression](../.impeccable/review/community-shell/verification.json)
- [Shared-world regression](../.impeccable/review/world-social/verification.json)
- [Furniture regression](../.impeccable/review/furniture-poses/verification.json)

These captures use explicitly seeded local fixture accounts/content. They do not establish hosted activity or real member presence.

## Updated assessment and remaining limits

The new-member path is materially clearer: real activity is visible from chat, useful destinations require fewer discovery steps, and preserving a message is a deliberate task instead of UUID handling. Administration and presence no longer precede the main activity. Failure recovery has explicit routes back to a working conversation. This is a verified functional improvement, not a measured usability score or a claim of 10/10 UX.

There is no independent QA verdict, real-new-member study, physical-phone or screen-reader validation in this run. Chromium viewport emulation and intercepted Auth/PostgREST backed by PGlite are not hosted Supabase Auth, HTTP/RLS, Realtime, connectivity or device evidence. Protected information reconciles on the existing polling/focus lifecycle rather than disappearing instantaneously. Activity drafts are memory-only within the workspace; a full page reload or server exit can discard them. Small/short panes still require scrolling. Disabled halls require owner enablement; empty communities require members/staff to create actual activity.

No new migration is needed for this change. A future authorized release needs the current existing migration chain, including `20261104000000_community_places.sql`, on its target backend, a reviewed client deployment, and hosted permission/recovery smoke tests. None was applied or deployed here.
