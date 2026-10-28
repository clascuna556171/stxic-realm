# Architecture and data

Source: specification v1.0, pp. 6–10, 13–14. The following stack and schemas are proposals pending implementation and testing.

## Proposed shape

A pnpm monorepo shares React + Vite web application code with a Tauri Windows shell. Phaser 3 renders pixel worlds; Tiled is proposed for map authoring and LibreSprite or a suitably licensed alternative for art. Supabase Auth, PostgreSQL, Realtime and Storage provide the initial backend; Cloudflare Pages hosts web, GitHub Actions provides CI and GitHub Releases distributes early Windows builds.

```text
apps/web/                  React + Vite application
apps/desktop/src-tauri/    Windows shell
packages/ui/               shared UI
packages/themes/           theme schemas and tokens
packages/world/            Phaser world
packages/features/         product features
packages/data/             repositories and adapters
packages/shared/           shared types and utilities
supabase/migrations/       versioned database and policy changes
docs/                      project knowledge
.github/workflows/         CI
```

React owns navigation, forms, settings and accessible chat; Phaser owns scene rendering, tiles, sprites and collision. Domain services own permissions, changes and serialization. Use AuthService, ChatRepository, WorldRepository, StorageService and RealtimeTransport boundaries rather than arbitrary component-level service calls. Never bundle service-role credentials or other secrets into clients.

## Proposed data model

UUID primary keys, timestamps where appropriate, foreign keys, indexes, constraints and row-level security are expected. Keep private account data separate from public profile metadata.

| Data | Purpose |
| --- | --- |
| profiles, profile_appearances, user_themes | User identity, public appearance and private theme |
| friendships | Requester, addressee and relationship status |
| spaces, space_members, channels | Ownership, roles and text channels |
| conversations, participants, messages, reactions | Direct/group and channel communication |
| homes, halls, scenes, scene_objects | Ownership, privacy, optional halls and versioned layouts |
| assets, guestbook_entries, invites | Controlled media, moderated entries and scoped hashed invitations |

Owners edit only their own profile/theme/home. Channel access requires membership or participant authorization. Hall edits require active role grants. Restrict asset paths and signed URLs by visibility; blocked users must not bypass restrictions through visits, guestbooks or invitations. Validate these rules with multiple real identities and deny-by-default RLS.

## Contracts and concurrency

Typed authenticated repositories/RPCs may expose `createSpace`, `requestFriendship`, `sendMessage`, `listMessages(cursor)`, `getHome`, `updateScene(expectedRevision)`, `joinRoom`, `updateProfileAppearance`, `setHomePrivacy` and `enableHall`. Version schemas. Scene saves reject stale revisions and provide reload/merge handling.

Realtime events are ephemeral hints: `room.join`, `player.move`, `player.leave`, `object.interact`, `room.layout.updated`, `presence.changed`. Fetch authoritative layout after an update and recover membership and missed messages after reconnect. Authenticated channels and bounded movement are necessary, but the design must establish which trusted component enforces validation before claiming spoofing resistance.

Illustrative scene (dimensions and identifiers are examples):

```json
{"schemaVersion":1,"sceneId":"uuid","kind":"home","grid":{"width":16,"height":12,"tileSize":32},"spawn":{"x":2,"y":2},"objects":[{"id":"uuid","assetId":"desk_basic","x":5,"y":4,"rotation":0,"config":{"action":"open_profile_links"}}],"revision":3}
```

## References

- [Tauri](https://tauri.app/), [Phaser](https://docs.phaser.io/), [Supabase](https://supabase.com/docs), [Cloudflare Pages](https://developers.cloudflare.com/pages/), [Tiled](https://www.mapeditor.org/) and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
- Provider limits and terms must be verified at deployment, not inferred from this document.
