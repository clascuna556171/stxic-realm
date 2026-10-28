# Security, privacy and operations

Source: specification v1.0, pp. 8–11. These are requirements and proposed controls, not claims that controls exist.

## Security and privacy

- Apply least privilege, deny-by-default RLS, trusted validation for sensitive mutations and multi-identity policy tests. Frontend visibility and ephemeral presence never establish authorization.
- Rate-limit authentication, invitations, messages, guestbooks, uploads and movement. Store invitation codes hashed where feasible, with expiry and usage caps.
- Restrict asset access according to visibility; validate file content, size, dimensions and rendering. Add quotas, moderation hooks and safe link handling. Escape content and sanitize any rich text to prevent XSS.
- Default homes to friends-only, make activity/presence sharing opt-in and provide blocking, reporting, privacy and deletion/export paths. A block must apply across visits, invitations and guestbooks.
- Validate themes against allowlisted, versioned JSON. No imported executable JavaScript; arbitrary custom CSS would need isolation and a threat model.
- Authenticate room channels and validate movement bounds and rate through an appropriate trusted boundary. Protect accounts with session management and audit trails.

Public signup requires reporting and moderator queues, takedown and abuse response, retention and age-related policy decisions, terms and a privacy notice. Invite-only alpha reduces exposure but does not replace basic controls.

## Free-tier operating plan

Target ₱0/month for five users, subject to provider quotas and terms, which may change or require billing details. Before inviting testers, verify actual provider terms, record usage limits and alerts, and establish conservative budgets. Bundle common art, cap objects/visitors/media, throttle movement, unsubscribe on navigation and monitor storage and realtime usage. No custom domain or store registration is required by the proposed alpha.

Keep staging and production configurations separate; never commit secrets. Version migrations and seed data. Prepare periodic permitted exports, test restoration, rehearse service suspension/recovery and prepare frontend and schema rollback. Do not assume the free tier includes automated backups.

## Verification and release gates

Test validators and theme tokens, repositories and RLS, and end-to-end account, messaging, editing and permissions. Run five-person sessions for reconnect, stale presence and conflicts. Before alpha:

- No cross-user data exposure in policy tests; restricted home entry and hall editing are denied.
- All five testers can send/receive persisted messages and recover after reconnect.
- Home layouts save and reload without corruption; conflicting edits do not silently overwrite.
- Chat remains usable if Phaser fails; essential features have a keyboard-friendly alternative.
- Clean-machine Windows build/install instructions work, with quotas and basic controls enforced.

Before expanding, review measured demand, capacity, backups, provider limits and moderation readiness.

## Local access controls and rollout

The access/moderation plan now has local database, Edge and frontend implementation. Current-state admission guards apply to old table/RPC routes as well as the new screens; current space roles, bounded restrictions, shared send limits and private evidence/artifacts are enforced at the database boundary. New administration/reporting, invitations and privacy processing default off. See [Access operations](ACCESS_OPERATIONS.md) for bootstrap, exact origins, server keys, callback flow, email/job rehearsal, retention monitoring and compatible rollback.

Do not enable reporting without a verified retention scheduler. Expired evidence is omitted from queues immediately, but physical removal requires the sweep; a stopped worker cannot satisfy a purge deadline. Real mail/Auth/realtime/concurrency, scheduler/deletion rehearsal, measured budgets, restoration and independent visible QA remain gates. No new migration, live mail, hosted configuration or release was applied in this implementation pass.
