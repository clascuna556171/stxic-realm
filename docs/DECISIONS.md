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
