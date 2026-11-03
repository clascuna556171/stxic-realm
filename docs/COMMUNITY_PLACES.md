# Community places

## Intent and decisions

Extend the existing shared server hall into a useful community place. Keep personal hubs, homes, chat, Glass, loading skeletons and recent Halls work. React, Supabase and Phaser 3.90 remain pinned. No hosted migration, dependency, deployment, commit or push is part of this work.

The conventional Community view leads with a welcoming activity and remains usable without a canvas. People, Focus, Projects, Noticeboard and Memory are sections of one selected hall, not separate competing sidebars. Existing furniture opens the same sections: round table → Focus; desk → Projects; bookshelf/banner → Memory; console → Noticeboard. Walking remains optional. Existing object actions remain available.

## Presence and sessions

Opening Community reads authorized data without publishing a location. Explicit appearance starts a per-user, token-bound hall visit; joining focus starts a private visit if needed. A visit expires after 45 seconds without a heartbeat. Hidden, offline, idle (five minutes), teardown and failed reconciliation clear client occupants; stale tokens cannot revive expired visits. Re-entry is explicit. New tabs replace the old token; old-tab leave cannot remove a newer visit. No global availability is inferred from hall presence. Public intent is optional: open to chat, focusing, looking for a group. Blocking filters both directions; departed/banned/inactive members never appear. Visible positions use validated cardinal moves against current saved furniture. Characters come from account appearance records.

One focus session per hall, created by a member, runs 5–120 minutes from server timestamps. Host or staff can end it. Join/leave do not require walking or public hall appearance. Participant publication is separately opt-in; lists/counts describe only consenting current participants. Sessions survive client reconnects, while participant leases expire. Server snapshots include current time for clock-offset calculation. Unique IDs make retries safe; space locks serialize competing starts and reviews.

## Projects and notices

Staff starts a project with a goal, description and 1–8 fixed milestones. Members submit attributed contributions to milestones. Staff accepts/rejects with revision checks; progress counts milestones having accepted contributions, never messages or attendance. Completion requires all milestones accepted. Completed work may be deliberately displayed as a memory without changing layouts/equipment. Members can publish, edit, resolve and remove help requests; existing staff announcements remain the update mechanism. Relevant restrictions and membership are enforced in SQL.

## Memory and safety

Staff curates project completions, event recaps and community milestones. Members may deliberately preserve their own channel message, which is their consent to share. No other-author capture, DM, private-stream import or automatic archiving. Source message bodies are never copied: snapshots resolve the current live message and source channel in the same server; deleted messages, archived channels, inactive/departed authors, changed membership, blocking and source removal hide entries server-side. Source edits are reflected. A project memory requires an existing completed project. Author/staff edit and removal use revisions and audit logs. Existing user-report/moderation flow is available with entry context. Authored records enter private exports. Account erasure removes contributions, help requests and memories. Shared project goals, descriptions and milestones remain unattributed to preserve the community’s work; removing accepted contributions reopens completion and hides its commemorative memory. Project creation and Privacy explain this retention.

All new storage is private-schema RPC-only (no direct REST grants). Security-definer functions use an empty search path, require active membership and enabled hall, validate lengths/types, bound collections, serialize writes, and expose only current authorized projections. UI clears protected snapshots on failure. Chat links remain independent of activity/world failures.

## Verification plan

SQL: owner/mod/member/nonmember, raw table denial, blocks, lease expiry/re-entry/stale tabs, cardinal collision, competing session starts, timers/reconnect, private participants, contribution review/conflict/completion, memory source deletion/archival/membership, edits/removal and export/erasure. Browser: representative two-client journeys; retries and unavailable states; desktop 1440×900, phone 390×844, narrow 320×700, landscape 720×450; keyboard, reduced motion and Glass. Existing unit/database/typecheck/build and relevant world/Halls suites run locally, browser suites sequentially. Screenshots must be opened and inspected. No local fixture establishes hosted Realtime/Auth, physical-device, Safari or assistive-tech correctness.
