# ANSA Mitsubishi 2026 — Project Rules &amp; Context

## 🚨 Critical System Safety Guardrails

- **NEVER** run `docker-compose down -v` or any command with `-v` / `--volumes`. Wiping Postgres volumes destroys project collections.

- Always use `docker-compose down` (without `-v`) or `docker-compose restart`.

## 📦 System Architecture &amp; Manifest

- **State Source of Truth:** On startup or beginning any new phase, read `project-manifest.json` in the project root to inspect live database counts, target tasks, and schema structure.

- **Frontend:** Nuxt 4 ([`http://localhost:3000`](http://localhost:3000`))

- **Backend:** Directus 12 ([`http://localhost:8055`](http://localhost:8055`)) with active Innovation Grant license key.

- **Admin Static Token:** configured as `ADMIN_TOKEN` in `directus/.env` (gitignored — see `directus/.env.example`)

- **Brand Tokens:** Mitsubishi Red (`#C3002F`), dark industrial &amp; clean light design system.

## 🛠 Directus Schema Rules

- Directus 12 `/schema/apply` payloads require unwrapped JSON with a valid state `hash` generated via `/schema/diff?mode=merge`. Use `node directus/schema/patch-mitsubishi-collections.js` if applying merged schemas.

- Do not deactivate live collections to bypass collection caps—the license is active.