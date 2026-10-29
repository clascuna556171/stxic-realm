# Flexible account profiles

Implemented locally on 29 October 2026 from the supplied Discord profile screenshot. Account identity and the in-app world character are separate.

## Using profiles

Open **Profile** (`/?profile`) to customize an account. Click a member portrait in People or chat, or open `/?profile=<user UUID>`, to view a shared card. A `space=<UUID>` context reveals actual membership roles only when viewer and member both belong to that space. Roles are not editable badges.

- Identity: name, handle, short bio, pronouns, status and up to 2,000 characters of about text.
- Photos & banner: upload an account photo, banner and up to six gallery photos; adjust focus, banner height and photo shape. Reuse images from the private upload library. Removing an image from a card is an edit; deleting its file requires removing it from the saved card first.
- Style: arbitrary six-digit background/text/accent colors and three local font families. Private app themes stay independent. Action text chooses black or white by measured contrast; low body-text contrast gives an advisory while retaining the owner's choice.
- Sections: reorder/hide About, Details, Connections, Photos and Member since; add eight custom details and eight titled HTTPS links. Links are user-supplied, not verified provider identities. Join dates are server-derived; unavailable legacy dates are not invented.
- Member view: Message for accepted friends, Add friend, Visit home, Report and Block. Viewer notes remain private to their author and have independent revisions.

Owners get a live preview and explicit Save/Reload controls. Phones use an Edit/Preview switch. Polling and focus/online reconciliation retain dirty edits and private notes. Stale saves return `PT409` and require explicit reload. Character appearance, home mood and private app theme are absent from profile-card saves. Account photos or initials now appear in people lists, chat portraits and the signed-in footer; world/editor characters remain intact.

## Upload and access boundary

The browser accepts PNG, JPEG, WebP, GIF and AVIF. Static images are decoded/re-encoded to WebP, removing original static-image metadata. GIF animation is retained within the server budget; GIF bytes may retain embedded metadata. AVIF depends on browser decoding and becomes WebP. The server independently inspects PNG/JPEG/WebP/GIF structure/signature/dimensions/frame budgets, never trusting names or Content-Type. SVG, scripts and other unsupported content are rejected. This is structural image validation, not a complete server-side decoder or malware scanner.

Pilot limits: 8 MiB/file, 8,192 pixels/side, 16 megapixels, 100 animation frames / 100 million canvas-pixels across frames, 30 files and 60 MiB reserved storage/account, 15 new reservations/hour. Failed reservations remain private and removable; unused images never publish implicitly.

`realm-profile-media` verifies Auth.getUser, current admission and exact configured origins before bounded binary reading and service-only reserve/finish/cleanup operations. Browser roles cannot attest completion, write media rows or write the private `realm-profiles` bucket directly. Restrictive Storage guards also constrain generic permissive policies. UUID paths never contain supplied filenames; retries do not overwrite blobs.

Owners resolve their ready uploads. Other admitted, unblocked members resolve only media referenced by a visible card. Hidden gallery media and hidden text sections are omitted from visitor projections; raw card rows are owner-only. Narrow portrait projections expose only the current account-photo path/framing. Signed URLs expire after 60 seconds and refresh while open. Already issued URLs can remain usable until expiry after a block or visibility change; no immediate invalidation is promised.

Reduced motion extracts bounded still frames, including GIFs; a failed safe capture hides the image instead of playing motion. File, framing and tab controls support keyboards. There is no remote URL ingestion or arbitrary user HTML/CSS/JavaScript execution.

Own-data exports include card metadata, upload references and requester-private notes, not binary image archives. Account deletion removes metadata and privately queues blob paths. The updated scheduler worker removes up to 30 eligible queued objects/run after a one-hour grace period when the cleanup-safety migration is applied; physical erasure requires its deployment and an operational scheduler. Existing export/retention budgets apply.

## Deployment and verification

Additive migration: `20261029020000_account_profiles.sql`. New Edge Function: `realm-profile-media`; updated worker: `realm-worker`. Apply the two earlier home/hall migrations first, then this migration; deploy the upload function/worker after schema review, configure exact `REALM_ALLOWED_ORIGINS`, then ship the frontend. A later handoff reports the three feature migrations and functions were deployed, contradicting the earlier local record. Verify the actual target ledger and function versions before rollout. The subsequent cleanup-safety migration is local; this Phase 5 pass made no hosted changes.

The functions-js installed with Supabase JS 2.49.8 omits binary bodies when invoke-level Content-Type is explicitly provided. Upload callers let the SDK choose that header; the server inspects the bytes.

Checks: `pnpm test`, `pnpm test:database`, `pnpm typecheck`, `pnpm build`, Deno `check`/`test` tasks in `supabase/functions/deno.json`, `pnpm test:profile:ui`, `pnpm test:access:ui`, `pnpm test:world:social:ui`.

SQL checks run actual PGlite functions/grants/RLS with Auth/Storage shims: ownership, slot checks, unpublished/hidden media, direct-write denial under generic policies, blocks, private notes, stale saves, links/styles, independent character data, exports and GC queues. Profile browser checks intercept **all** Auth/PostgREST/Storage/Edge requests, executing SQL and binary inspection locally. They exercise file selection/normalization, publish/reload, multiple users, notes/roles, blocking, stale saves, failed-read drafts, keyboard controls, reduced motion and 1440/390/320px layouts. Captures/receipt: ignored `.impeccable/review/account-profiles/`. The uploaded screenshot artwork is synthetic test content, not shipped demo data.

This does not establish hosted Storage/GoTrue/Edge, real signed-URL expiry/CORS or multi-connection concurrency. Staging upload/download/revocation, worker cleanup, moderation operations, assistive technology and real-device image performance remain release gates. Do not reset the linked development project or run destructive integration suites there.

The independent UI finish reviewer scored the listed contrast/control/mobile/documentation fixes resolved after settled recaptures. That disposition covers those fixes only. Separate visible backend QA via `D:\AgentTeam\Invoke-QA.ps1` failed dispatch with `runtime_unavailable` (Orca unreachable); no independent backend pass exists. Request and dispatch receipt are saved beside the captures.
