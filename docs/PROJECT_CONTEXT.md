# Project context

Source: project specification v1.0, pp. 1, 3–4, 11–12. This is a planning baseline; implementation choices and targets require validation.

## Product

STXIC Realm is a Windows and web communication platform with direct messages, community channels and visitable 2D pixel-art homes. A space owner may enable a shared Server Hall. Chat is the primary experience and remains usable without the pixel world. Positioning: “Your group’s digital home.” Tagline: “A space that’s yours.”

The first audience is five invited friends who communicate, game, code or hang out. A public platform and community operators are longer-term possibilities. Initial operating cost target: ₱0/month, conditional on provider limits and actual use.

## Principles and journeys

- Communication first; a world failure must not block ordinary chat.
- Users control their identity and home; halls are optional.
- Design for low cost, privacy and accessibility from the start; scale based on measured demand.
- Core journey: accept invite, create an account, set up identity and decorate a home, visit friends, interact with home objects, join a space and optionally its hall, communicate and manage privacy.

## Scope

**P0 / closed alpha:** invite-only authentication, profiles, friends, direct messages, spaces and text channels, persistent chat, a personal home editor, visits, avatars, basic furniture, an optional hall and simple interactive objects.

**P1 / beta:** richer themes and room templates, memory wall, event board, presence refinements, stronger moderation, asset uploads and a voice pilot. The PDF also mentions basic attachments and an approved uploaded photo frame; see [scope clarification](DECISIONS.md) before planning uploads.

**P2 / future:** neighborhoods, public discovery, creator assets, plugins/blocks, pets, minigames and multiroom homes.

**Not alpha:** 3D or MMO simulation, unrestricted scripts/HTML/CSS, payments or a marketplace, production video/livestreaming, game overlays and public signup without moderation capacity. Voice/video is deferred.

## Measures and release intent

- Invite all five testers and observe weekly activity; at least three visiting or editing homes weekly is a hypothesis, not a guaranteed result.
- No lost acknowledged messages in testing; enforce visit permissions and synchronize join/leave.
- Stay within free-plan allowances and provide a keyboard-friendly non-pixel path for essential features.
- North-star question: do the original five voluntarily return, invite each other and use objects, rather than treat rooms as a one-time novelty?

The [roadmap](ROADMAP.md) describes release gates; it is not a commitment to dates.
