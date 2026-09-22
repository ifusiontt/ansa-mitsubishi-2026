# Mitsubishi ANSA — Directus Deployment Notes

Deployment completed: 2026-09-21 (Directus 12.3.1, PostGIS, Redis)

## What was deployed

| Step | Result |
|---|---|
| Target schema applied | 38 collections, 393 fields, 84 relations (`POST /schema/diff` → `POST /schema/apply`) |
| Mitsubishi seed data | `vehicles` (5), `vehicle_trims` (13), `dealers` (3) — all via `POST /items/{collection}` |
| Starter content | `globals` singleton, `navigation` (main/footer + 8 items), 4 pages (`/`, `/dealers`, `/about`, `/contact`), hero/richtext/button blocks, 1 redirect |
| Public read permissions | 31 permission rows on the public policy (see below) |
| Verification | API 200s (authed + anon), Nuxt SSR pages 200 with rendered content |

## Key deviations from the prepared artifacts (documented)

1. **`mitsubishi-target-schema.json` did not contain the Mitsubishi collections.**
   The prepared file was the raw Directus 12.3.1 starter-template export (35 collections:
   `block_*`, `pages`, `posts`, `globals`, …). The three content collections
   (`vehicles`, `vehicle_trims`, `dealers`) were derived from
   `directus/seeds/mitsubishi-initial-data.json` and merged in via
   `directus/schema/patch-mitsubishi-collections.js` (idempotent; original kept at
   `mitsubishi-target-schema.json.orig`).
   - Integer auto-increment `id` PKs (match the seed's explicit ids 1–5 / 1–13 / 1–3).
   - `vehicle_trims.vehicle` is a real M2O FK → `vehicles.id` (`ON DELETE SET NULL`).
   - `status` fields default to `published`; `slug`s are unique.

2. **Schema apply is a two-step call in Directus 12** (the endpoint does not accept the
   snapshot directly):
   ```
   POST /schema/diff?mode=merge   ← body: unwrapped snapshot ({version, directus, vendor, ...})
   POST /schema/apply             ← body: the {hash, diff} object returned by /schema/diff
   ```
   The prepared JSON file carries a `{"data": {...}}` envelope; both endpoints expect the
   **inner** object.

3. **Sequences** were advanced after seeding explicit ids:
   `setval` on `vehicles_id_seq` (5), `vehicle_trims_id_seq` (13), `dealers_id_seq` (3).

## Directus 12 gotchas hit (for future reference)

- **`ADMIN_TOKEN` is only read at first admin bootstrap.** For an already-bootstrapped
  admin the static token was set via `PATCH /users/{id}` with `token` from `ADMIN_TOKEN` in `directus/.env`.
- **Permissions are policy-based and `fields` is a whitelist.**
  `fields: null` = *no* fields allowed (silent stripping / 403). Use an explicit list or `["*"]`.
  `permissions` / `validation` are **row-level filters**, not field lists.
  The public policy id: `abf8a154-5b1c-4a46-ac9c-7300570f4f17`.
- **Singletons**: `POST /items/{singleton}` is not routed; read with
  `GET /items/{singleton}` (returns the object, not an array) and upsert with
  `PATCH /items/{singleton}`.
- PK-only `fields=id` requests return a bare array of ids.

## Public read permissions

- **Explicit field lists** (safe by construction): `vehicles`, `vehicle_trims`, `dealers`,
  and `globals` — **excluding the secrets `openai_api_key` and `directus_url`**.
- **`fields: ["*"]`** (public marketing content): `navigation`, `navigation_items`, `pages`,
  `page_blocks`, all `block_*` collections, `posts`, `redirects`, `forms`, `form_fields`.
- **Deliberately NOT public**: `ai_prompts`, `form_submissions`, `form_submission_values`,
  `website`.

## Services

- Directus CMS: http://localhost:8055 (admin: http://localhost:8055/admin)
- Nuxt frontend: http://localhost:3000 (`pnpm dev` in `nuxt/`, log: `/tmp/nuxt-dev.log`)
- Static token used by the frontend: `DIRECTUS_SERVER_TOKEN` in `nuxt/.env`
  (note: the starter fetches anonymously on purpose — `staticToken()` is commented out in
  `nuxt/server/utils/directus-server.ts`, so public read permissions carry the site).

## Re-seeding (after a schema re-apply / DB wipe)

Full restore order (all scripts in `directus/seeds/`, all idempotent-guarded):

```bash
python3 seed-mitsubishi-data.py    # 5 vehicles, 13 trims, 3 dealers (explicit ids; aborts if rows exist)
python3 seed-starter-content.py    # globals, navigation, pages, blocks, redirect (skips if home page exists)
python3 seed-permissions.py        # 32 public read permissions (whitelists + ["*"]; patch-or-create)
# then advance the integer sequences:
docker exec directus-mitsubishi-db psql -U directus -d directus -tAc \
  "SELECT setval('vehicles_id_seq', (SELECT MAX(id) FROM vehicles)),
          setval('vehicle_trims_id_seq', (SELECT MAX(id) FROM vehicle_trims)),
          setval('dealers_id_seq', (SELECT MAX(id) FROM dealers));"
```

Note: a `POST /schema/apply` re-run against a wiped DB also drops the permission rows and
all content — the sequence above restores everything (verified 2026-09-21).
