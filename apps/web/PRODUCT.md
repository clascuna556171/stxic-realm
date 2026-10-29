# STXIC Realm

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

Realm lets people communicate in servers and channels, customize a pixel character, and make and visit personal rooms. The owner requests an immersive medieval pixel-art world with Server Halls as its central navigation hub.

## Capabilities and Constraints

The existing React/Vite client uses Supabase authentication, membership-scoped servers (called spaces by the backend), messaging, invitations, administration, profiles and shared homes. Preserve those systems and their permissions. Anonymous character, room and hall previews must clearly describe their preview status. Never invent presence counts or expose servers outside the signed-in user's membership.

## Brand Commitments

STXIC Realm retains its existing logo and personal theme settings. The owner's reference is `docs/images/realm-room-character-concept-v3.png`: detailed pixel art, warm lighting, rich materials and mature fantasy character silhouettes. Avoid anime, childish cartoons, generic dashboard compositions and unnecessary dependencies.

## Product Principles

- Server discovery and entry must be immediately understandable.
- Spatial interactions need conventional text and keyboard equivalents.
- Build on working character customization, room layouts and account systems.
- Account profiles use uploaded photos and banners, independent of the in-app pixel character. Profiles, people lists and communication portraits use account photos (initials when absent); rooms and halls keep the world character.
- Favor coherent art, efficient rendering and reduced-motion support.
- Personal hub customization uses browser-local saves scoped by account. A separate shared Server Hall implementation stores validated, revisioned arrangements per space, with owner enablement and explicit decorator grants. Its two additive migrations are local and await hosted rollout; personal hub layouts are never implicitly imported or overwritten.

## Evidence on Hand

Account profile customization includes pronouns, status, extended about text, photos, custom details, HTTPS connections, colors/fonts/crops, section order/visibility, viewer-private notes and membership-derived server roles. Private Storage, validated uploads and revisions are implemented locally in migration `20261029020000` and `realm-profile-media`. Hosted deployment is pending, including the two earlier home/hall migrations. Local checks intercept provider APIs and use PGlite; they are not hosted Storage/Auth evidence. No subscription or paid generation is required.

The repository, its documented implementation and supplied concept image. Production readiness and current hosted backend behavior are not established by visual work.
