# Realm's selected game-development skills

Seven skills from [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills), installed on 2 November 2026 at revision `19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9`:

- `create-game-assets`
- `game-ai`
- `level-design`
- `game-feel`
- `game-ui-ux`
- `performance-optimization`
- `phaser-core`

Each complete upstream skill folder is preserved, including its supporting references, templates and scripts. `gamedev-lock.json` records the source paths and SHA-256 hashes of all 24 skill files. `LICENSE.gamedev.txt` and `NOTICE.gamedev.txt` preserve upstream attribution. The full catalog, generic router, other engine skills and package dependencies are not installed.

## Agent discovery

The canonical project installation is `.agents/skills/`, the shared repository location supported by Codex, Gemini CLI, GitHub Copilot, Cursor and Antigravity in their documented configurations. It is project-scoped; no user-global skill directories were changed. Actual discovery still depends on the installed agent version and settings.

Claude Code uses the complete copies in `.claude/skills/` and reads the root `CLAUDE.md`, which points to `AGENTS.md`. This checkout has `core.symlinks=false`, so ordinary copies keep Windows and repository checkouts usable without requiring developer-mode symlinks. Keep canonical and Claude copies synchronized with the helper below; do not edit both independently.

The host must discover or refresh its skill catalog before native activation is available. Codex should expose the new skills on the next turn; reopen another agent's session or refresh its skills list when needed. This installation verifies the filesystem and metadata, not interactive activation in every agent application.

## Verify or synchronize copies

Run from the repository root in **PowerShell 7**:

```powershell
# Read-only integrity/inventory check.
./scripts/sync-game-dev-skills.ps1

# Copy the reviewed canonical files to Claude's project skill directory, then check.
./scripts/sync-game-dev-skills.ps1 -Sync
```

The helper verifies the approved seven names, canonical inventory and hashes, and identical Claude file inventories/content. It downloads nothing and never deletes directories or runs upstream scripts. A changed canonical file requires an intentionally reviewed manifest update; unexpected stale files are reported rather than deleted.

## Realm-specific use

Follow root `AGENTS.md`. In particular, retain **Phaser 3.90**, the React/Phaser/Supabase architecture, original pet/character identities, catalog/layout geometry and server-owned permissions. The Phaser guide includes newer-major examples; check applicability to 3.90. Select relevant skills proportionately. Suggestions to load other skills or install tools do not override the owner's scope or authorize a bulk installation.

To update, review a specific upstream revision, replace the selected canonical folders through an appropriate reviewed install/update workflow, update the lock inventory and attribution, then run the synchronization helper. Changes should be deliberate and reviewable; this installation does not auto-update.
