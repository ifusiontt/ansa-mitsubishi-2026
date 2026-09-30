# ANSA Mitsubishi 2026 Project Guidelines

## Architecture Overview
- **Repository Root:** `~/development/Mitsubishi_Ansa_Mitsubishi_2026`
- **Frontend / SSR:** Nuxt 3 (`./nuxt`) with Tailwind CSS design tokens and custom block renderer.
- **Headless CMS:** Directus 12 (`./directus`) backed by PostgreSQL/SQLite.
- **Seeding & Automation:** Node.js utilities (`./scripts/`) and Python scripts (`./directus/seeds/`).
- **Fleet Scope:** Outlander Sport, Triton, Xpander Cross, and Xpander.

## Critical Rules
1. **Context Boundaries:** Never read or edit `.tmp/`, `content-raw/`, or `graphify-out/` directly. Use designated scripts in `./scripts/` and `./directus/seeds/`.
2. **Environment Protection:** Never commit or output secrets from `directus/.env` or root `.env` files.
3. **M2M Relational Paths:** Expand Directus M2M junction tables deeply in API routes (e.g., `images.directus_files_id.*` instead of bare `images.*`).
4. **Validation Routine:** Validate frontend changes by running `npm run typecheck` inside `./nuxt` and API contracts using `node scripts/test-vehicle-api.mjs`.
5. **Brand Tokens:** Mitsubishi Red (`#C3002F`) accent paired with Dark Slate (`#0A0A0A`).
