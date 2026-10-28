# Features and behavior

Source: specification v1.0, pp. 3–8, 10–12. Features are planned, not verified as implemented.

## Accounts, friends and messaging

Invite-only account creation, profile setup and friend requests lead to direct messages and space channels. Planned messaging includes history, edits/deletes, reactions and unread counts. The PDF also mentions basic attachments, but places asset uploads in beta; resolve this before implementation. Commit messages to PostgreSQL before showing delivery success. Use stable IDs and idempotency keys; reconnect with cursors to fetch missed records. Every read and write requires server-side authorization.

Presence options: online, away, do not disturb and invisible. Home presence and activity sharing are opt-in and must not reveal private app or game details by default. Voice/video is post-alpha.

## Personal homes

Each user owns one bounded tile-grid home in alpha, stored as structured scene data. A visitor enters from the profile. Privacy modes: private, friends-only, invite-only and public; public is disabled in alpha unless explicitly enabled. New homes default to friends-only. Owners set capacity, guestbook permissions and whether presence is shown.

Editor: choose a tile or furniture item, place/move/rotate where supported, validate collision and budget, preview and save. Trusted server logic validates ownership, allowed assets, coordinates and limits. A 16 × 12 map is an example to playtest, not a final requirement. Save using an expected revision; surface conflicts rather than silently overwriting edits.

Starter interactions: desk opens configured links or a project card; guestbook holds moderated entries; frame shows an approved bundled or uploaded image; chair/sofa triggers sitting; music player opens a playlist link (synchronized playback deferred); portal returns to chat or an allowed hall; trophy shelf displays selected achievements. Plants, lamps and rugs are decorative. Validate links and respect content/privacy permissions.

## Optional halls

A space exists without a hall. Its owner may enable one from a template; disabling hides access while retaining layout until explicit deletion. Ship one neutral starter template and a small curated catalog initially. Candidate future templates include Gaming Lounge, Guild Hall, Café and Tech Lab.

Owner controls enablement and permissions. Granted decorators edit layout; moderators manage content and visitors; members enter and interact; visitors only enter if permitted. Channel portals must check access to the destination. Other possible objects include a welcome sign, announcement or event board, memory wall and member showcase; the roadmap initially calls for a portal and board. Role grants, including portal configuration and moderation, must be checked server-side.

## Room interaction

Proposed join flow: authenticate → authorize → load scene revision → subscribe → announce join → reconcile occupants → process bounded movement → leave or time out. Send coarse position updates, interpolate visually, and check coordinates, speed and room bounds. Presence is ephemeral and does not establish membership or permission. A dedicated authoritative room service may be needed at public scale; this remains an architectural assessment, not a guarantee.

## Identity and content

Profile appearance is public; personal interface themes are local to each viewer. Themes use versioned JSON and allowlisted tokens/effects. Uploads, when supported, need MIME/type, dimensions, size and quota checks, safe rendering, metadata stripping where possible and moderation hooks. Prefer animated WebP or spritesheets over large GIFs.
