# STXIC Realm project knowledge

This folder is the working information source for STXIC Realm. The [original project specification](STXIC_Realm_Project_Documentation_v1.0.pdf) is the baseline; these Markdown documents organize its contents for planning and implementation. The PDF is version 1.0, dated 26 October 2026, and describes a **planning specification**, not a built or validated product.

## Start here

- [Project context](docs/PROJECT_CONTEXT.md) — purpose, users, scope and success measures.
- [Visual direction and logo concept](docs/VISUAL_DIRECTION.md) — owner-preferred direction and customization goals.
- [Rooms and character direction](docs/ROOMS_AND_CHARACTERS_DIRECTION.md) — visual references, customization ideas and open decisions.
- [Logo kit and usage](docs/BRAND_ASSETS.md) — SVG variants and brand application.
- [Design and experience](docs/DESIGN.md) — visual direction, navigation and accessibility.
- [Features and behavior](docs/FEATURES.md) — messaging, homes, halls, identity and multiplayer.
- [Architecture and data](docs/ARCHITECTURE.md) — proposed stack, boundaries, data and contracts.
- [Security and operations](docs/SECURITY_OPERATIONS.md) — privacy, moderation, deployment and quality gates.
- [Implementation and local setup](docs/IMPLEMENTATION.md) — current working slice, setup and verification limits.
- [Roadmap](docs/ROADMAP.md) — proposed phases, dependencies and acceptance criteria.
- [Decisions and questions](docs/DECISIONS.md) — proposals, uncertainties and scope clarifications.

## How to use this source

The PDF is the historical source. These files are the editable working source: update the relevant document and decision record as choices are made, and note when a decision supersedes the PDF. Requirements and proposed implementation choices are distinguished where relevant. Do not treat estimates, examples or targets as evidence of implemented functionality. If documents conflict, resolve the conflict explicitly in [Decisions](docs/DECISIONS.md) rather than silently choosing one.

**Current state:** a web and database foundation is being implemented; see the setup guide for what is implemented and what remains unverified. The original sample is a separate UI-only prototype.



## Current account/social slice

Signed-in profiles, public characters/private themes, friend requests/blocking, 1:1 DMs and shared homes are implemented in `apps/web`. Account homes have owner-only, revision-checked saves and friends/private access; movement is validated by database RPCs. Anonymous room/appearance drafts remain separate. See [implementation and verification](docs/IMPLEMENTATION.md#account-identity-friends-dms-and-shared-homes--28-october-2026) for routes, test commands and remaining alpha work. The visual overhaul and this account slice are uncommitted development work, not a released alpha.
