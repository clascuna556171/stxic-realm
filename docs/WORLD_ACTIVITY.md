# World conversation, focus and sound

Homes now have a room conversation in the inspector. Personal halls connect to a selected active channel; shared halls connect to a configured channel portal. Channel messages still use the existing journal-backed `MessageThread`, including its permissions and read-only behavior. Direct messages never become world speech.

## Speech and typing

- `activity-state.ts` owns the tested 4.5-second lifetime, Unicode truncation to 120 codepoints, animation envelope, five-second typing expiry and 1.5-second publication throttle.
- `activity-overlay.ts`, called by `renderer.ts`, creates pixel-bordered Phaser containers above the local avatar or an actual home visitor. Text wraps at 144 px inside a 160 px maximum frame. New speech reuses the actor's container and resets its lifetime; repeated polling never replays the same message.
- Halls use the same lifecycle in their existing SVG traveler layer. Measured glyph widths wrap wide Latin/CJK/emoji text. Bubbles clamp to the scene bounds. Existing hall movement and traveler presence remain local: the hall only shows bubbles for its represented local avatar. Shared homes represent their real visitor roster.
- The overlay follows rendered actor coordinates, including seated anchors. Typing and the focus countdown remain visible alongside speech. `prefers-reduced-motion` uses fixed dots and opacity with no float or fade.
- `MessageThread.tsx` publishes typing only after composer edits in channels. Clear/send, blur, visibility change, scope changes and unmount stop it. Draft restoration alone does not announce typing. Database channel inserts also clear typing atomically.
- `useWorldActivity.ts` polls permission-checked snapshots about once per second while visible. Scope generations and request tickets reject stale replies. Local typing changes apply immediately; remote states arrive on the next poll. Opening history does not replay old speech. Disconnected typing expires on the server after five seconds; focus presence expires after ten seconds without a heartbeat.

## Spatial focus

The 25-minute timer belongs to `useWorldItems`, so closing the workstation sheet does not stop it. Starting settles the avatar at the selected desk/console and shows a monitor-colored glow and countdown. Stand/walk, layout changes or ending a visit pause the session; resuming uses the remaining time. Completion uses a wall-clock deadline, so background timer throttling cannot extend the session. Reset returns to 25 minutes. Timer state lasts for this mounted world visit; reloading or leaving the route resets it. Notes/snippets keep their existing device storage.

Home focus deadlines/targets synchronize through the same scoped activity RPC. Sound choices and volumes are private to the listener and never enable another visitor's audio.

## Soundscape

Open a Project desk or Tech/Music console workstation for Gentle Rain, Hearth Embers, Night Crickets and Lofi Focus. Each has a toggle and a volume slider, plus a master mute. Enabling a track is the only path that creates/resumes an `AudioContext`. Focusing, opening a room, changing volume or unmuting cannot start playback by themselves.

`soundscape.ts` generates bounded, eight-second mono buffers locally. Endpoint tapers prevent loop discontinuities; there are no external recordings, downloads or audio licenses. Gain changes are smoothed. Tracks stop/disconnect when disabled; all sources/nodes and the context are disposed on world unmount/page hide. Returning from page cache does not restart sound. Context failures return every track to Off with a retry message.

## Database and rollout

Migration `20261031010000_world_activity.sql` is additive. It was applied to the configured development backend on 31 October 2026, together with the pending profile-frame (`20261030000000`) and home-item-content (`20261031000000`) migrations. The linked ledger now matches all 15 local migrations. Frontend changes remain local and uncommitted; no separate frontend hosting release was performed.

The migration provides private activity and room-speech tables plus `world_activity_update`, `world_activity_snapshot` and `room_say`. Writers derive identity from Auth. Home reads/writes require an active visit and current `can_visit`; channel activity uses existing stream permissions. Anonymous callers and direct table access are denied. Blocked/inactive authors are filtered. Speech send retries are idempotent; room sends are bounded to 60/minute. Room history returns at most 50 messages within 24 hours, with cleanup on writes and through existing service-role maintenance. Authored room speech joins existing privacy exports and cascades on user/home deletion.

## Build and verification

The old distributed Phaser file was one indivisible 1.2 MB module. Production now bundles the installed Phaser source with its build feature flags and a `globalThis` alias, splitting vendor modules below the existing 500 kB warning budget. Canvas/WebGL remain enabled; Phaser sound is disabled because Realm's renderer already uses `noAudio` and the soundscape owns its separate gesture-gated Web Audio context. The chunk warning limit is unchanged. Development retains the distributed Phaser entry.

Commands:

```powershell
pnpm typecheck
pnpm test
pnpm test:database
$env:REALM_UI_ORIGIN='http://127.0.0.1:5178'
pnpm test:activity:ui
pnpm test:items:ui
pnpm test:poses:ui
pnpm test:world:social:ui
pnpm build
# Run Vite preview separately; verify the actual production renderer too.
$env:REALM_UI_ORIGIN='http://127.0.0.1:5179'
$env:REALM_PRODUCTION='1'
pnpm test:activity:ui
```

Activity browser checks cover 1440/390/320 px, no autoplay, all four tracks, volume/mute, timer close/reopen/stand, viewport containment and audio cleanup. The development-only fixture additionally exercises actual Phaser wrapping, edge anchoring, replacement, timed destruction, overlapping statuses and typing stop. The SQL-backed two-account suite checks room speech/typing, synchronized focus and walk pause, hall channel speech, access loss and neighboring viewport behavior. Captures: ignored `.impeccable/review/world-activity` and `world-social`.

These are local Chromium and disposable PGlite checks with intercepted Auth/PostgREST. They do not establish hosted Supabase, real multi-connection races, Realtime transport, physical-device, Safari, or screen-reader coverage.

Verified on 31 October 2026: `pnpm typecheck` (zero errors), `pnpm test` (64/64), `pnpm test:database` (eight SQL suites, fixture support and legacy upgrade), `pnpm build` (zero warnings), activity UI in development and production at three sizes, existing item-actions UI at three sizes, furniture poses UI and the extended shared-world UI (1,538 intercepted requests). Independent review passed after fixes for wide-glyph wrapping, overlapping statuses and delayed heartbeat coalescing. The full shared-world run also exposed an existing long-channel-list overflow at compact widths; its list now scrolls inside an 88 px cap. `.viewport-world` constraints remain intact.

## Hosted recovery — 31 October 2026

The owner reported invisible speech/typing and `Invalid profile settings or section limits.` on profile saves. Read-only checks confirmed the app's configured backend lacked all three pending migrations: world RPCs returned `PGRST202`, and the original twelve-field profile validator rejected style payloads containing frame fields. The local PGlite suites passed before applying exactly those three migrations through the linked CLI. No reset, account edits, or real chat sends were used for rollout.

After rollout: the migration ledger matches; frame-style validation passes; saved styles remain valid; all three world RPCs are visible in the REST schema cache and still deny anonymous access. A transaction-rolled-back hosted database smoke test called the existing profile-save RPC with a frame, entered an account home, and verified typing/focus publish/read/clear. It left no profile or presence changes behind. This exercises database RPCs under an authenticated database role, not a real browser Auth session or a visual hosted multiplayer test. The owner's Chrome window was minimized and could not be observed through the available browser interface.

To check in the app, save any existing profile draft first, then reload the world page. Home conversation is in the inspector (People, objects & guestbook on compact screens); halls provide Connected hall chat. Deep Work starts from a desk/console workstation's Start timer button. Halls retain their existing local-only traveler presence.
