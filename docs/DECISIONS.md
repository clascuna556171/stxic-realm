# Decisions and open questions

Source: specification v1.0, pp. 1, 4–6, 8, 12. This records the source's current direction, not user approval of untested implementation details. Update entries as decisions are made and record their rationale and date.

## Product direction in the PDF

| Topic | Current direction | Status |
| --- | --- | --- |
| Chat and worlds | Chat first; personal homes; optional halls | Agreed in principle in source |
| Audience and cost | Five invited friends; ₱0/month target | Target, dependent on real usage/provider limits |
| Initial platforms | Windows and web | Direction in source |
| Privacy | Friends-only homes by default; public visibility requires consent | Planned; public mode disabled in alpha unless explicitly enabled |
| Voice, monetization, neighborhoods | Deferred beyond alpha | Direction in source; business model undecided |
| Theme safety | Validated token JSON, no executable imports | Planned security constraint |
| Edit conflicts | Expected revision and explicit conflict handling | Proposed implementation |
| Stack | React/Vite, Tauri, Phaser, Supabase and Cloudflare Pages | Proposal, pending testing |
| Delivery | 8–12 solo weeks | Estimate, not deadline |

## Validate with the five testers

- Top-down versus isometric view; top-down is simpler as an initial hypothesis.
- Grid size (16 × 12 is an example), avatar scale, furniture footprints and palette.
- Guestbook versus memory wall as the first social object.
- How often homes are used relative to chat.
- Whether halls admit public visitors or only members.

## Resolve before implementation or release

- **Uploads and attachments:** P1 lists asset uploads, while the messaging section mentions basic attachments and a home photo frame can show an uploaded image. Decide whether alpha uses bundled images only and defers attachments, or explicitly includes limited uploads. Do not treat either interpretation as decided.
- **Object priorities:** the roadmap calls for an alpha hall portal and board, while the event board and memory wall are P1. Choose the alpha board's specific behavior and defer richer board features as appropriate.
- **Realtime trust:** identify a trusted enforcement mechanism for room authorization, movement validation and event spoofing; a client-only check is insufficient. Measure traffic and provider quotas before scaling.
- **Concrete limits:** choose and validate visitor, object, upload, guestbook and movement budgets; none are fixed by the source.
- **Accessibility:** define and test text/list equivalents for each meaningful spatial action and measurable performance targets.
- **Operations:** verify current provider pricing/terms, backups and recovery; establish staging, secret handling and release ownership.
- **Public release:** settle moderation, content handling, retention, age-related policy, privacy notice, terms and trademark review before opening registration.

Record new decisions with date, decision, reason, affected documents and what evidence remains needed. Do not turn hypotheses into commitments without an explicit decision.

## Initial implementation decisions — 28 October 2026

- The initial channel slice uses the proposed React/Vite + Supabase stack and keeps the visual demo separate. This is an implementation choice to validate, not evidence that the stack is final.
- Closed access starts with administrator-provisioned accounts and memberships; the self-service invite workflow remains to be implemented. Public signup must be disabled in the target Supabase project.
- Realtime Postgres Changes trigger a fresh database read; only the latest 100 messages are fetched, so cursor-based recovery remains open. See [implementation and local setup](IMPLEMENTATION.md).

## Obsidian overhaul — 28 October 2026

Owner instruction: replace the green default with obsidian and overhaul rooms, characters and avatars using original artwork. Implemented choice: neutral shell surfaces and a new neutral default action accent, preserving existing explicit saved accent selections. Retain the current React/Phaser grid and use shared deterministic pixel geometry for editable art, SVG portraits and canvas rendering rather than introducing a 3D stack. This preserves placement/collision behavior and local draft compatibility. Added six identity starters and three furniture items. The owner delegated creative choices; the final art is available for their review and is not represented as an exact reproduction of the concept images. Shared/server-backed appearance remains future work.

## Account/social/shared-home implementation — 28 October 2026

Owner approved the sequence: account profiles/appearance, friends/DMs, then shared homes. Implemented public profiles/character identity separately from private theme records; preserved anonymous drafts and made account-home import explicit. Home access initially supports owner-only or accepted friends, with blocking applied to requests, direct conversations and cross-home visits. A revoked friendship hides retained 1:1 history until a new friendship is accepted. Chosen provisional budgets: five occupants, 150 ms minimum adjacent movement interval, 1.5-second polling, 10-second heartbeat refresh and 45-second expiry. DB functions validate movement and revisions; no client broadcast is trusted as authority. Logical revision conflicts use PostgREST HTTP 409 (`PT409`), avoiding classification as server/transaction errors. These choices are a first alpha implementation, not finalized capacity or release readiness. Guestbooks, halls, full moderation and invite/recovery remain future work.
