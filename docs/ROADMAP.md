# Roadmap

Source: specification v1.0, pp. 11–12. The original estimate is 8–12 solo-developer weeks, dependent on availability, art and debugging. The indicative windows below are relative, not calendar commitments. Nothing here is marked complete: the inspected folder contained only the source PDF before this documentation was created.

## Phase 0 — Foundations (indicative week 1)

Set up proposed monorepo, design tokens, CI, schema/auth and configuration boundaries. Define invite and privacy rules; prepare a reproducible local setup. **Exit:** a minimal authenticated app runs and migrations/policies are version controlled. Security policy coverage grows in later phases.

## Phase 1 — Communication (weeks 2–3)

Build friends, spaces, channels, persistent text messages and reconnect recovery. **Exit:** authorized users can exchange persisted messages, retrieve history after reconnect and are denied access to others' conversations. Chat is independent of the world.

## Phase 2 — Pixel prototype (weeks 4–5)

Build one room with a small original sprite set, movement, join/leave, privacy checks and a non-spatial alternative. **Exit:** at least two authorized friends can join a home and see movement; restricted users cannot enter. Measure realtime use and verify disconnect/reconnect behavior.

## Phase 3 — Home Studio (weeks 6–7)

Add the initial furniture catalog, bounded editor, server validation, versioned save/load and guestbook. **Exit:** owners can edit and reload their home; invalid or unauthorized changes fail, and stale revisions produce a visible conflict.

## Phase 4 — Server Hall (week 8)

Add a single optional starter hall, granted roles, portal and board. **Exit:** a space owner can enable and decorate it, grant appropriate rights and disable access without destroying its layout; channel portals enforce permissions.

## Phase 5 — Polish and QA (weeks 9–10)

Package Windows, test RLS with distinct users, accessibility, quotas, recovery, backups and clean-install instructions. **Exit:** satisfy the alpha release gates in [Security and operations](SECURITY_OPERATIONS.md), including chat remaining usable when the world fails.

## Phase 6 — Alpha iteration (weeks 11–12)

Run sessions with five invited testers, measure usage and costs, and fix defects. **Exit:** the alpha definition of done is met and tester feedback informs the next priorities.

## Alpha definition of done

- An invited member joins and customizes profile and home.
- Two or more friends visit a home together and see movement.
- A space owner creates, enables and decorates an optional hall.
- Text chat works in and outside the world using shared backend data.
- Data operations enforce permissions and basic quotas.
- Windows and hosted web share consistent core functionality.

## Beyond alpha

**Beta / 20–100 invited users:** load tests, metrics, moderation tools, tested recovery, asset processing and provider quota review; evaluate themes, templates, presence and a voice pilot. **Public:** only after moderation operations, abuse controls, privacy/legal decisions, capacity and support are ready. Consider dedicated authoritative room infrastructure when measurement shows it is needed. Monetization and public discovery remain future decisions.
