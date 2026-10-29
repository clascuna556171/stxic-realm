# STXIC Realm — Team Contribution & Sync Guide

Welcome to the **STXIC Realm** team! This guide explains how our team of five collaborates, keeps code and database schemas in sync, and avoids merge conflicts.

---

## 1. Team Members & Roles

| Name / GitHub Handle | Role & Focus Area |
|---|---|
| [@clascuna556171](https://github.com/clascuna556171) | **Project Lead / Repo Owner** — Architecture, Supabase & Deployment |
| [@leecodehub](https://github.com/leecodehub) | **Core Developer** — Pixel World, Canvas & Navigation |
| [@mdimco554902-a11y](https://github.com/mdimco554902-a11y) | **Core Developer** — Accessibility, UI Components & Design System |
| [@JKJapona](https://github.com/JKJapona) | **Core Developer** — Social, Profiles, Friends & Direct Messages |
| [@AlbertCandilas](https://github.com/AlbertCandilas) | **Core Developer** — Spaces, Channels & Chat Engine |

---

## 2. Quick Onboarding (First-Time Setup)

### Prerequisites
- **Node.js**: v22 or v24
- **pnpm**: v10+ (Install via `npm install -g pnpm` or `corepack enable pnpm`)
- **Git**

### One-Command Setup
Clone the repository and run the setup script:
```bash
git clone https://github.com/clascuna556171/stxic-realm.git
cd stxic-realm
pnpm run setup:team
```
This automatically:
1. Generates `apps/web/.env.local` from `apps/web/.env.example`.
2. Installs workspace dependencies with `pnpm install`.
3. Runs typechecks, unit tests, and the local PostgreSQL database test suite.

---

## 3. Daily Git & Sync Workflow

### Golden Rules
1. **Never commit directly to `main`**: All work happens on branches.
2. **Strictly `pnpm`**: Never run `npm` or `yarn` to avoid lockfile divergence.
3. **Always pull before starting**: Sync `main` before creating a new branch.

### Daily Feature Loop
```bash
# 1. Start on fresh main
git checkout main
git pull origin main

# 2. Create your feature or fix branch
git checkout -b feature/your-feature-name

# 3. Work and commit with clear messages
git add .
git commit -m "Add avatar selection to AppearanceStudio"

# 4. Push your branch to GitHub
git push -u origin feature/your-feature-name

# 5. Open a Pull Request (PR) on GitHub
# GitHub Actions CI will automatically test your branch.
# Have at least one teammate review before merging into main.
```

When someone else merges into `main`, update your branch:
```bash
git checkout main
git pull origin main
git checkout feature/your-feature-name
git merge main
```

---

## 4. Database & Supabase Workflow

### The Rule: Migrations in Code, Never Manual Dashboard Edits
Do not add or modify tables directly in the Supabase Cloud Table Editor. Doing so without a migration file breaks the app for other teammates.

1. **Creating a schema change**:
   - Add a timestamped SQL migration in `supabase/migrations/` (e.g., `YYYYMMDDHHMMSS_description.sql`).
2. **Testing locally**:
   - Run the local PostgreSQL test suite:
     ```bash
     pnpm test:database
     ```
3. **Applying to the shared Supabase project**:
   - Once reviewed and merged into `main`, migrations are applied to the cloud instance using:
     ```bash
     npx supabase db push
     ```

---

## 5. Helpful Commands

| Command | Action |
|---|---|
| `pnpm dev` | Start the local web development server |
| `pnpm build` | Build the web application |
| `pnpm typecheck` | Run TypeScript type checks across the workspace |
| `pnpm test` | Run unit and UI tests |
| `pnpm test:database` | Run local PostgreSQL / Supabase migration test suite |
