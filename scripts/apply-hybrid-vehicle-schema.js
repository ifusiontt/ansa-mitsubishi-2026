#!/usr/bin/env node
/**
 * apply-hybrid-vehicle-schema.js
 * =============================================================================
 * ANSA Mitsubishi 2026 — Hybrid Vehicle Schema Architecture (Directus 12.3)
 *
 * What this script does (all via the Directus REST API — no docker, no DB access):
 *
 *   1. SCHEMA  — idempotently applies the hybrid vehicle schema using the
 *      Directus 12 schema API:
 *        GET  /schema/snapshot
 *        POST /schema/diff?mode=merge   (partial snapshot, version: 2)
 *        POST /schema/apply             (diff body)
 *
 *      Changes:
 *        - CREATE collection `vehicle_colors`
 *            id (int PK, auto-increment), sort (int),
 *            vehicle_id (M2O -> vehicles), color_name (string),
 *            hex_code (string), image (M2O -> directus_files)
 *        - UPDATE `vehicles`:
 *            + hero_block  (M2O  -> block_hero_custom, select-dropdown-m2o)
 *            + colors      (O2M  -> vehicle_colors,      list-o2m)
 *            + highlights  (O2M  -> block_content_items, list-o2m)
 *            + trims       (O2M  -> vehicle_trims,       list-o2m)
 *        - UPDATE `block_content_items`:
 *            + vehicle (M2O -> vehicles)  [backs the `highlights` O2M]
 *        - UPDATE `vehicle_trims`:
 *            * key_features interface: json (raw code editor) -> list (repeater)
 *            * relation vehicle -> vehicles: one_field = 'trims'
 *
 *      NOTE on key_features: the Directus `list` (repeater) interface operates
 *      on arrays of OBJECTS (verified in app source: value: Record<string,
 *      unknown>[]). To keep the repeater functional, key_features rows use the
 *      shape [{ "value": "feature string" }]. Phase 2b migrates any legacy
 *      plain-string arrays in place (idempotent).
 *
 *   2. PERMS   — ensures the public read permissions (policy-based field
 *      whitelists, see directus/seeds/seed-permissions.py) cover the new
 *      fields: vehicles +hero_block/colors/highlights/trims, plus a new
 *      vehicle_colors read row. Required so the public nested query works.
 *
 *   3. SEED    — idempotently seeds the "Mitsubishi Outlander Sport" test record:
 *        - vehicles row (title/slug/starting_price 255000 TTD + full context)
 *        - block_hero_custom row ("Drive Your Ambition" / "Outlander Sport")
 *          with a generated hero media image (ImageMagick PNG, uploaded once)
 *        - 3 x vehicle_colors (Octane Blue, Energetic Yellow, Diamond White)
 *        - 3 x block_content_items highlights (PERFORMANCE / DESIGN / INTERIOR)
 *        - 3 x vehicle_trims (ES / LE / SEL) linked to the vehicle
 *        - key_features string-array -> {value}-object migration (all trims)
 *
 *   4. VERIFY  — runs the exact public (unauthenticated) query:
 *        GET /items/vehicles?fields=*,hero_block.*,colors.*,highlights.*,trims.*
 *      asserts HTTP 200 and the full nested payload for the Outlander Sport.
 *
 *   5. MANIFEST — updates project-manifest.json (stats + sprint state) only
 *      after verification passes.
 *
 * Usage:
 *   node scripts/apply-hybrid-vehicle-schema.js
 *
 * Env overrides:
 *   DIRECTUS_URL   (default http://localhost:8055)
 *   ADMIN_TOKEN    (default admin-static-token-12345)
 *   SKIP_IMAGE=1   skip hero image generation/upload (reuse existing file)
 *
 * Requirements: Node >= 20 (global fetch/FormData/Blob), ImageMagick `convert`
 * (only when generating the hero image).
 *
 * SAFETY: merge-mode schema diffs are strictly additive (deletions are
 * suppressed by the API in merge mode). This script never drops collections,
 * columns, or data.
 * =============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

/* ------------------------------------------------------------------ */
/* config                                                              */
/* ------------------------------------------------------------------ */

const BASE = (process.env.DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '');
const TOKEN = process.env.ADMIN_TOKEN || 'admin-static-token-12345';
const SKIP_IMAGE = process.env.SKIP_IMAGE === '1';
const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'project-manifest.json');

const BRAND_RED = '#C3002F';

const log = (...args) => console.log(...args);
const step = (n, title) => log(`\n${'='.repeat(72)}\n[${n}] ${title}\n${'='.repeat(72)}`);

/* ------------------------------------------------------------------ */
/* http helper                                                         */
/* ------------------------------------------------------------------ */

async function req(method, urlPath, { body, auth = true, raw = false, form } = {}) {
  const headers = {};
  if (auth) headers.Authorization = `Bearer ${TOKEN}`;
  let payload;
  if (form) {
    payload = form; // fetch sets multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + urlPath, { method, headers, body: payload });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  if (raw) return { status: res.status, text, json };
  if (!res.ok) {
    const msg = json?.errors?.map((e) => e.message).join('; ') || text.slice(0, 500);
    throw new Error(`${method} ${urlPath} -> ${res.status}: ${msg}`);
  }
  return { status: res.status, json, text };
}

const get = (p, opts) => req('GET', p, opts);
const post = (p, body, opts) => req('POST', p, { ...opts, body });
const patch = (p, body) => req('PATCH', p, { body });

/* ------------------------------------------------------------------ */
/* snapshot helpers                                                    */
/* ------------------------------------------------------------------ */

const fieldMeta = (collection, field, sort, extra = {}) => ({
  collection,
  conditions: null,
  display: null,
  display_options: null,
  field,
  group: null,
  hidden: false,
  interface: 'input',
  note: null,
  options: null,
  readonly: false,
  required: false,
  searchable: true,
  sort,
  special: null,
  translations: null,
  validation: null,
  validation_message: null,
  width: 'half',
  ...extra,
});

const fieldSchema = (table, field, data_type, extra = {}) => ({
  name: field,
  table,
  data_type,
  default_value: null,
  max_length: null,
  numeric_precision: null,
  numeric_scale: null,
  is_nullable: true,
  is_unique: false,
  is_indexed: false,
  is_primary_key: false,
  is_generated: false,
  generation_expression: null,
  has_auto_increment: false,
  foreign_key_table: null,
  foreign_key_column: null,
  ...extra,
});

const intSchema = (table, field, extra = {}) =>
  fieldSchema(table, field, 'integer', { numeric_precision: 32, numeric_scale: 0, ...extra });

const m2oRelationMeta = (manyCollection, manyField, oneCollection, oneField, sortField) => ({
  junction_field: null,
  many_collection: manyCollection,
  many_field: manyField,
  one_allowed_collections: null,
  one_collection: oneCollection,
  one_collection_field: null,
  one_deselect_action: 'nullify',
  one_field: oneField,
  sort_field: sortField,
});

/* ------------------------------------------------------------------ */
/* seed data                                                           */
/* ------------------------------------------------------------------ */

const VEHICLE = {
  title: 'Mitsubishi Outlander Sport',
  slug: '2025-outlander-sport',
  tagline: 'Compact Crossover Ambition For The Urban Explorer',
  hero_headline: 'Outdrive The Limits In Compact Crossover Form',
  starting_price: 255000, // TTD
  primary_color: '#003399',
  brochure_url: 'https://ansamitsubishi.com/brochures/2025-mitsubishi-outlander-sport.pdf',
  status: 'published',
  model_year: 2025,
  category: 'Compact Crossover SUV',
  body_type: 'SUV',
  seating_capacity: 5,
  fuel_type: 'Gasoline',
  warranty: '5-Year / 100,000 km Manufacturer Warranty',
  overview:
    "The 2025 Mitsubishi Outlander Sport brings Outlander-grade ambition to the compact crossover class. A bold Dynamic Shield front end, refined MIVEC 2.0L/2.4L powertrains with smooth CVT, and the full Mitsubishi Safety Sensing suite make it the definitive everyday escape hatch — from Port of Spain commutes to the road to Caronia.",
};

const HERO_BLOCK = {
  title: 'Outlander Sport — Hero',
  highlight_keyword: 'Outlander Sport',
  headline: 'Drive Your Ambition',
  body: 'Bold. Capable. Uncompromising. The 2025 Mitsubishi Outlander Sport is engineered to outdrive the limits of the compact crossover class.',
  template: 'hero_immersive',
  variant: 'dark_industrial',
  container_width: 'contained',
};

const COLORS = [
  { sort: 1, color_name: 'Octane Blue', hex_code: '#003399' },
  { sort: 2, color_name: 'Energetic Yellow', hex_code: '#E5C100' },
  { sort: 3, color_name: 'Diamond White', hex_code: '#FFFFFF' },
];

const HIGHLIGHTS = [
  {
    sort: 1,
    tagline: 'PERFORMANCE',
    headline: 'Outdrive The Limits With Prevailing Performance',
    description:
      'A refined MIVEC engine and smooth CVT deliver confident, efficient performance in every drive mode.',
  },
  {
    sort: 2,
    tagline: 'DESIGN',
    headline: 'Outpace The Norms With Dazzling Design',
    description:
      'Dynamic Shield design language with sculpted body lines, LED lighting, and bold alloy wheels.',
  },
  {
    sort: 3,
    tagline: 'INTERIOR',
    headline: 'Outstand With Comfort With Uncompromising Safety & Luxury',
    description:
      'A driver-focused cabin with premium materials, Smartphone-link audio, and Mitsubishi Safety Sensing.',
  },
];

const TRIMS = [
  {
    trim_name: 'ES',
    price: 255000,
    engine: '2.0L MIVEC 4-Cylinder (149 hp @ 6,000 rpm)',
    transmission: 'Continuously Variable Transmission (CVT) with 8-Speed Manual Shift Mode',
    drivetrain: 'FWD',
    key_features: [
      '7.0-inch Smartphone-link Display Audio with Apple CarPlay & Android Auto',
      'Forward Collision Mitigation (FCM) with Pedestrian Detection',
      'Blind Spot Warning (BSW) with Lane Change Assist (LCA)',
      '18-inch Two-Tone Alloy Wheels with All-Season Tires',
      'Push Button Start with Remote Keyless Entry',
      'Dual Automatic Climate Control',
    ],
  },
  {
    trim_name: 'LE',
    price: 272000,
    engine: '2.0L MIVEC 4-Cylinder (149 hp @ 6,000 rpm)',
    transmission: 'Continuously Variable Transmission (CVT) with 8-Speed Manual Shift Mode',
    drivetrain: 'FWD',
    key_features: [
      '8.0-inch Smartphone-link Display Audio (SDA) with Wireless Apple CarPlay & Android Auto',
      '8-Way Power Driver Seat with 4-Way Power Lumbar',
      'Heated Front Seats',
      'Rear Cross Traffic Alert (RCTA) with Rear Automatic Emergency Braking',
      'LED Headlamps with Auto High Beam',
      'Dual-Zone Automatic Climate Control',
    ],
  },
  {
    trim_name: 'SEL',
    price: 289000,
    engine: '2.4L MIVEC 4-Cylinder (181 hp @ 6,000 rpm)',
    transmission: 'Continuously Variable Transmission (CVT) with 8-Speed Manual Shift Mode',
    drivetrain: 'FWD',
    key_features: [
      '9.0-inch Smartphone-link Display Audio with Navigation',
      'Multi-Material Leather-Appointed Seating',
      'Power Tailgate with Obstacle Detection',
      'Heated & Ventilated Front Seats',
      '19-inch Two-Tone Machined Alloy Wheels',
      'Wireless Smartphone Charging (Qi-Compatible)',
    ],
  },
];

// Repeater config for vehicle_trims.key_features (array of { value: string })
const KEY_FEATURES_OPTIONS = {
  template: '{{ value }}',
  fields: [
    {
      field: 'value',
      name: 'Feature',
      type: 'string',
      interface: 'input',
      meta: {
        field: 'value',
        interface: 'input',
        type: 'string',
        width: 'full',
        note: 'Key feature',
      },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* phase 0 — preflight                                                 */
/* ------------------------------------------------------------------ */

async function preflight() {
  step(0, 'Preflight — Directus reachability & version');
  const ping = await get('/server/ping', { auth: false });
  log(`  ping: HTTP ${ping.status} (${ping.text.trim()})`);
  // note: /server/info only exposes `version` to authenticated requests
  const info = await get('/server/info');
  const version = info.json?.data?.version;
  log(`  directus version: ${version}`);
  if (!version) throw new Error('could not read server version');
  return version;
}

/* ------------------------------------------------------------------ */
/* phase 1 — schema                                                    */
/* ------------------------------------------------------------------ */

function buildPartialSnapshot(snap) {
  /**
   * Returns a PARTIAL snapshot (version 2) containing only the entities we
   * manage. In merge mode the API scopes the diff to these collections and
   * suppresses deletions, so untouched parts of the schema are safe.
   *
   * For entities that already exist we rebase on the live entry (so re-runs
   * produce an empty diff); for new entities we declare them from scratch.
   */
  const collections = [];
  const fields = [];
  const relations = [];

  const findField = (collection, field) =>
    snap.fields.find((f) => f.collection === collection && f.field === field);
  const findRelation = (collection, field) =>
    snap.relations.find((r) => r.collection === collection && r.field === field);
  const findCollection = (collection) =>
    snap.collections.find((c) => c.collection === collection);

  /* ---- vehicle_colors (new collection) ---- */

  const vcCol = findCollection('vehicle_colors');
  collections.push(
    vcCol
      ? { ...vcCol }
      : {
          collection: 'vehicle_colors',
          meta: {
            accountability: 'all',
            archive_app_filter: false,
            archive_field: null,
            archive_value: null,
            autosave_revision_interval: null,
            collapse: 'open',
            collection: 'vehicle_colors',
            color: null,
            display_template: '{{color_name}}',
            group: null,
            hidden: false,
            icon: 'palette',
            item_duplication_fields: null,
            note: 'Exterior paint options per vehicle model',
            preview_url: null,
            singleton: false,
            sort: 4,
            sort_field: 'sort',
            status: 'active',
            translations: null,
            unarchive_value: null,
            versioning: false,
          },
          schema: { name: 'vehicle_colors' },
        }
  );

  // vehicle_colors.id (int PK, auto-increment)
  const vcId = findField('vehicle_colors', 'id');
  fields.push(
    vcId
      ? { ...vcId }
      : {
          collection: 'vehicle_colors',
          field: 'id',
          type: 'integer',
          meta: fieldMeta('vehicle_colors', 'id', 1, { hidden: true, readonly: true }),
          schema: intSchema('vehicle_colors', 'id', {
            is_nullable: false,
            is_unique: true,
            is_primary_key: true,
            has_auto_increment: true,
          }),
        }
  );

  // vehicle_colors.sort
  const vcSort = findField('vehicle_colors', 'sort');
  fields.push(
    vcSort
      ? { ...vcSort }
      : {
          collection: 'vehicle_colors',
          field: 'sort',
          type: 'integer',
          meta: fieldMeta('vehicle_colors', 'sort', 2, { note: 'Display order within the vehicle' }),
          schema: intSchema('vehicle_colors', 'sort'),
        }
  );

  // vehicle_colors.vehicle_id (M2O -> vehicles)
  const vcVeh = findField('vehicle_colors', 'vehicle_id');
  fields.push(
    vcVeh
      ? { ...vcVeh }
      : {
          collection: 'vehicle_colors',
          field: 'vehicle_id',
          type: 'integer',
          meta: fieldMeta('vehicle_colors', 'vehicle_id', 3, {
            interface: 'select-dropdown-m2o',
            display: 'related-values',
            display_options: { template: '{{title}}' },
            options: { template: '{{title}}' },
            special: ['m2o'],
            note: 'Parent vehicle model',
          }),
          schema: intSchema('vehicle_colors', 'vehicle_id', {
            foreign_key_table: 'vehicles',
            foreign_key_column: 'id',
          }),
        }
  );

  // vehicle_colors.color_name
  const vcName = findField('vehicle_colors', 'color_name');
  fields.push(
    vcName
      ? { ...vcName }
      : {
          collection: 'vehicle_colors',
          field: 'color_name',
          type: 'string',
          meta: fieldMeta('vehicle_colors', 'color_name', 4, {
            required: true,
            validation: { required: true },
            note: 'Marketing name of the paint option',
          }),
          schema: fieldSchema('vehicle_colors', 'color_name', 'character varying', {
            max_length: 255,
          }),
        }
  );

  // vehicle_colors.hex_code
  const vcHex = findField('vehicle_colors', 'hex_code');
  fields.push(
    vcHex
      ? { ...vcHex }
      : {
          collection: 'vehicle_colors',
          field: 'hex_code',
          type: 'string',
          meta: fieldMeta('vehicle_colors', 'hex_code', 5, {
            note: 'Hex color code, e.g. #003399',
          }),
          schema: fieldSchema('vehicle_colors', 'hex_code', 'character varying', {
            max_length: 7,
          }),
        }
  );

  // vehicle_colors.image (M2O -> directus_files)
  const vcImg = findField('vehicle_colors', 'image');
  fields.push(
    vcImg
      ? { ...vcImg }
      : {
          collection: 'vehicle_colors',
          field: 'image',
          type: 'uuid',
          meta: fieldMeta('vehicle_colors', 'image', 6, {
            interface: 'file-image',
            options: { crop: false },
            special: ['file'],
            searchable: false,
            width: 'full',
            note: 'Paint swatch / exterior photo',
          }),
          schema: fieldSchema('vehicle_colors', 'image', 'uuid', {
            foreign_key_table: 'directus_files',
            foreign_key_column: 'id',
          }),
        }
  );

  // relation: vehicle_colors.vehicle_id -> vehicles (one_field = colors)
  const vcRel = findRelation('vehicle_colors', 'vehicle_id');
  relations.push(
    vcRel
      ? { ...vcRel }
      : {
          collection: 'vehicle_colors',
          field: 'vehicle_id',
          related_collection: 'vehicles',
          meta: m2oRelationMeta('vehicle_colors', 'vehicle_id', 'vehicles', 'colors', 'sort'),
          schema: {
            table: 'vehicle_colors',
            column: 'vehicle_id',
            foreign_key_table: 'vehicles',
            foreign_key_column: 'id',
            constraint_name: 'vehicle_colors_vehicle_id_foreign',
            on_update: 'NO ACTION',
            on_delete: 'SET NULL',
          },
        }
  );

  // relation: vehicle_colors.image -> directus_files
  const vcImgRel = findRelation('vehicle_colors', 'image');
  relations.push(
    vcImgRel
      ? { ...vcImgRel }
      : {
          collection: 'vehicle_colors',
          field: 'image',
          related_collection: 'directus_files',
          meta: m2oRelationMeta('vehicle_colors', 'image', 'directus_files', null, null),
          schema: {
            table: 'vehicle_colors',
            column: 'image',
            foreign_key_table: 'directus_files',
            foreign_key_column: 'id',
            constraint_name: 'vehicle_colors_image_foreign',
            on_update: 'NO ACTION',
            on_delete: 'SET NULL',
          },
        }
  );

  /* ---- vehicles.hero_block (M2O -> block_hero_custom) ---- */

  const vb = findField('vehicles', 'hero_block');
  fields.push(
    vb
      ? { ...vb }
      : {
          collection: 'vehicles',
          field: 'hero_block',
          type: 'uuid',
          meta: fieldMeta('vehicles', 'hero_block', 17, {
            interface: 'select-dropdown-m2o',
            display: 'related-values',
            display_options: { template: '{{headline}}' },
            options: { template: '{{headline}}' },
            special: ['m2o'],
            width: 'full',
            note: 'Hero block shown at the top of the vehicle detail page',
          }),
          schema: fieldSchema('vehicles', 'hero_block', 'uuid', {
            foreign_key_table: 'block_hero_custom',
            foreign_key_column: 'id',
          }),
        }
  );
  const vbRel = findRelation('vehicles', 'hero_block');
  relations.push(
    vbRel
      ? { ...vbRel }
      : {
          collection: 'vehicles',
          field: 'hero_block',
          related_collection: 'block_hero_custom',
          meta: m2oRelationMeta('vehicles', 'hero_block', 'block_hero_custom', null, null),
          schema: {
            table: 'vehicles',
            column: 'hero_block',
            foreign_key_table: 'block_hero_custom',
            foreign_key_column: 'id',
            constraint_name: 'vehicles_hero_block_foreign',
            on_update: 'NO ACTION',
            on_delete: 'SET NULL',
          },
        }
  );

  /* ---- vehicles.colors (O2M -> vehicle_colors) ---- */

  const vcO2m = findField('vehicles', 'colors');
  fields.push(
    vcO2m
      ? { ...vcO2m }
      : {
          collection: 'vehicles',
          field: 'colors',
          type: 'alias',
          meta: fieldMeta('vehicles', 'colors', 18, {
            interface: 'list-o2m',
            display: 'related-values',
            display_options: { template: '{{color_name}}' },
            options: { template: '{{color_name}}' },
            special: ['o2m'],
            width: 'full',
            note: 'Exterior colors available for this vehicle',
          }),
        }
  );

  /* ---- vehicles.highlights (O2M -> block_content_items) ---- */

  const vh = findField('vehicles', 'highlights');
  fields.push(
    vh
      ? { ...vh }
      : {
          collection: 'vehicles',
          field: 'highlights',
          type: 'alias',
          meta: fieldMeta('vehicles', 'highlights', 19, {
            interface: 'list-o2m',
            display: 'related-values',
            display_options: { template: '{{tagline}}' },
            options: { template: '{{tagline}}' },
            special: ['o2m'],
            width: 'full',
            note: 'Marketing highlight blocks (PERFORMANCE / DESIGN / INTERIOR)',
          }),
        }
  );

  // backing M2O on block_content_items -> vehicles (one_field = highlights)
  const bciVeh = findField('block_content_items', 'vehicle');
  fields.push(
    bciVeh
      ? { ...bciVeh }
      : {
          collection: 'block_content_items',
          field: 'vehicle',
          type: 'integer',
          meta: fieldMeta('block_content_items', 'vehicle', 11, {
            interface: 'select-dropdown-m2o',
            display: 'related-values',
            display_options: { template: '{{title}}' },
            options: { template: '{{title}}' },
            special: ['m2o'],
            note: 'Linked vehicle (drives the vehicle detail highlights)',
          }),
          schema: intSchema('block_content_items', 'vehicle', {
            foreign_key_table: 'vehicles',
            foreign_key_column: 'id',
          }),
        }
  );
  const bciVehRel = findRelation('block_content_items', 'vehicle');
  relations.push(
    bciVehRel
      ? { ...bciVehRel }
      : {
          collection: 'block_content_items',
          field: 'vehicle',
          related_collection: 'vehicles',
          meta: m2oRelationMeta('block_content_items', 'vehicle', 'vehicles', 'highlights', 'sort'),
          schema: {
            table: 'block_content_items',
            column: 'vehicle',
            foreign_key_table: 'vehicles',
            foreign_key_column: 'id',
            constraint_name: 'block_content_items_vehicle_foreign',
            on_update: 'NO ACTION',
            on_delete: 'SET NULL',
          },
        }
  );

  /* ---- vehicles.trims (O2M -> vehicle_trims) ---- */

  const vtO2m = findField('vehicles', 'trims');
  fields.push(
    vtO2m
      ? { ...vtO2m }
      : {
          collection: 'vehicles',
          field: 'trims',
          type: 'alias',
          meta: fieldMeta('vehicles', 'trims', 20, {
            interface: 'list-o2m',
            display: 'related-values',
            display_options: { template: '{{trim_name}}' },
            options: { template: '{{trim_name}}' },
            special: ['o2m'],
            width: 'full',
            note: 'Available trims for this vehicle',
          }),
        }
  );

  // relation vehicle_trims.vehicle -> vehicles: set one_field = 'trims'
  const vtRel = findRelation('vehicle_trims', 'vehicle');
  if (vtRel) {
    relations.push({
      ...vtRel,
      meta: { ...vtRel.meta, one_field: 'trims' },
    });
  } else {
    log('  WARNING: vehicle_trims.vehicle relation not found in snapshot — skipping trims O2M wiring');
  }

  /* ---- vehicle_trims.key_features: json -> list (repeater) ---- */

  const kf = findField('vehicle_trims', 'key_features');
  if (kf) {
    fields.push({
      ...kf,
      meta: {
        ...kf.meta,
        interface: 'list',
        options: KEY_FEATURES_OPTIONS,
        note: 'Repeater of key feature strings (array of { value })',
      },
    });
  } else {
    log('  WARNING: vehicle_trims.key_features field not found in snapshot — skipping interface change');
  }

  // NOTE: the diff endpoint (validateSnapshot) requires the directus version
  // string and the db vendor in the snapshot body; both are inherited from
  // the live snapshot so they always match this instance.
  return {
    version: 2, // SNAPSHOT_VERSION.PARTIAL — scopes the diff to the collections above
    directus: snap.directus,
    vendor: snap.vendor,
    collections,
    fields,
    relations,
  };
}

function diffIsEmpty(diff) {
  return (
    (!diff.collections || diff.collections.length === 0) &&
    (!diff.fields || diff.fields.length === 0) &&
    (!diff.relations || diff.relations.length === 0)
  );
}

async function describeDiff(diff) {
  const parts = [];
  (diff.collections || []).forEach((c) => {
    const kind = c.diff?.[0]?.kind === 'D' ? 'update' : c.diff?.[0]?.kind === 'N' ? 'create' : 'change';
    parts.push(`collection ${c.collection} (${kind})`);
  });
  (diff.fields || []).forEach((f) => {
    const kinds = (f.diff || []).map((d) => d.kind).join(',');
    parts.push(`field ${f.collection}.${f.field} [${kinds}]`);
  });
  (diff.relations || []).forEach((r) => {
    const kinds = (r.diff || []).map((d) => d.kind).join(',');
    parts.push(`relation ${r.collection}.${r.field} -> ${r.related_collection} [${kinds}]`);
  });
  return parts;
}

async function applySchema() {
  step(1, 'Schema — snapshot → diff (merge) → apply');

  for (let attempt = 1; attempt <= 3; attempt++) {
    const snapRes = await get('/schema/snapshot');
    const snap = snapRes.json.data;
    log(`  snapshot: ${snap.collections.length} collections, ${snap.fields.length} fields, ${snap.relations.length} relations`);

    const partial = buildPartialSnapshot(snap);
    log(`  partial target: ${partial.collections.length} collections, ${partial.fields.length} fields, ${partial.relations.length} relations`);

    const diffRes = await post('/schema/diff?mode=merge', partial);
    if (!diffRes.json?.data) {
      log('  schema already in target state — nothing to apply.');
      return;
    }
    const { hash, diff } = diffRes.json.data;
    log(`  diff hash: ${String(hash).slice(0, 24)}…`);

    if (diffIsEmpty(diff)) {
      log('  schema already in target state — nothing to apply.');
      return;
    }

    log(`  pending changes (${(diff.collections?.length || 0) + (diff.fields?.length || 0) + (diff.relations?.length || 0)}):`);
    (await describeDiff(diff)).forEach((p) => log(`    - ${p}`));

    try {
      // apply body = { hash, diff } exactly as returned by /schema/diff
      await post('/schema/apply', { hash, diff });
      log('  apply: OK — schema changes committed.');
      return;
    } catch (err) {
      if (attempt === 3) throw new Error(`schema apply failed after 3 attempts: ${err.message}`);
      log(`  apply failed (attempt ${attempt}): ${err.message} — re-snapshotting and retrying…`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* phase 2 — public read permissions                                   */
/* ------------------------------------------------------------------ */

// This instance uses policy-based public read permissions with per-collection
// field WHITELISTS (see directus/seeds/seed-permissions.py, which is kept in
// sync with this list). `fields` is a whitelist: null = nothing, ['*'] = all,
// explicit list = only those fields. `fields=*` in a query then returns only
// the whitelisted fields.
const PUBLIC_READ_WHITELISTS = {
  vehicles: [
    'id', 'title', 'slug', 'tagline', 'hero_headline', 'starting_price',
    'primary_color', 'brochure_url', 'status', 'model_year', 'category',
    'body_type', 'seating_capacity', 'fuel_type', 'warranty', 'overview',
    // hybrid vehicle schema (new):
    'hero_block', 'colors', 'highlights', 'trims',
  ],
  // new collection from the hybrid vehicle schema:
  vehicle_colors: ['id', 'sort', 'vehicle_id', 'color_name', 'hex_code', 'image'],
};

async function applyPublicReadPermissions() {
  step(2, 'Permissions — public read whitelists (policy-based)');

  const pol = await get('/policies?fields=id,name');
  const publicPolicy = pol.json.data.find(
    (p) => p.name === '$t:public_label' || /public/i.test(p.name || '')
  );
  if (!publicPolicy) throw new Error('public policy not found in /policies');
  log(`  public policy: ${publicPolicy.id} (${publicPolicy.name})`);

  // no `fields` param: restricted fields come back stripped, which is fine —
  // we only need id / collection / action / system.
  const perms = await get('/permissions?limit=-1');
  const existing = new Map();
  for (const p of perms.json.data || []) {
    if (p.id == null || p.system) continue;
    existing.set(`${p.collection}|${p.action}`, p.id);
  }

  for (const [collection, fields] of Object.entries(PUBLIC_READ_WHITELISTS)) {
    const key = `${collection}|read`;
    if (existing.has(key)) {
      const id = existing.get(key);
      await patch(`/permissions/${id}`, { permissions: {}, validation: {}, fields });
      log(`  ${collection}: updated public read permission ${id} (whitelist: ${fields.length} fields)`);
    } else {
      const created = await post('/permissions', {
        policy: publicPolicy.id,
        role: null, // public
        collection,
        action: 'read',
        permissions: {},
        validation: {},
        fields,
      });
      log(`  ${collection}: created public read permission ${created.json.data.id} (whitelist: ${fields.length} fields)`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* phase 3 — seed data                                                 */
/* ------------------------------------------------------------------ */

function generateHeroImage(outPath) {
  // Dark industrial 1600x900 hero with Mitsubishi Red accents.
  const args = [
    '-size', '1600x900', 'gradient:#0d0f14-#232936',
    '-fill', BRAND_RED, '-draw', 'polygon 0,900 560,900 0,470',
    '-fill', BRAND_RED, '-draw', 'rectangle 0,0 1600,10',
    '-fill', '#1a1e26', '-draw', 'rectangle 0,866 1600,900',
    '-font', 'DejaVu-Sans-Bold', '-pointsize', '88', '-fill', 'white',
    '-annotate', '+110+330', 'MITSUBISHI',
    '-font', 'DejaVu-Sans-Bold', '-pointsize', '58', '-fill', BRAND_RED,
    '-annotate', '+112+440', 'OUTLANDER SPORT',
    '-font', 'DejaVu-Sans', '-pointsize', '36', '-fill', '#c9ced8',
    '-annotate', '+112+545', 'Drive Your Ambition',
    outPath,
  ];
  execFileSync('convert', args, { stdio: 'pipe' });
  if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 1000) {
    throw new Error('hero image generation failed (ImageMagick output missing)');
  }
  log(`  generated hero image: ${outPath} (${fs.statSync(outPath).size} bytes)`);
}

async function ensureHeroFile() {
  // Reuse an existing upload if present.
  // NOTE: `filename` (virtual) and some file fields are field-permission-restricted
  // even for admins on this instance — match on filename_disk / title instead.
  const existing = await get('/files?limit=200');
  const found = (existing.json.data || []).find(
    (f) =>
      f.filename_disk === 'outlander-sport-hero.png' ||
      f.filename_download === 'outlander-sport-hero.png' ||
      f.title === 'Outlander Sport Hero'
  );
  if (found) {
    log(`  reusing existing hero file: ${found.id} (${found.filename_disk || found.title})`);
    return found.id;
  }

  const tmp = path.join(ROOT, 'scripts', '.outlander-sport-hero.tmp.png');
  try {
    generateHeroImage(tmp);
    const buf = fs.readFileSync(tmp);
    const form = new FormData();
    form.append('file', new Blob([buf], { type: 'image/png' }), 'outlander-sport-hero.png');
    form.append('title', 'Outlander Sport Hero');
    form.append('description', 'Generated hero media for the 2025 Mitsubishi Outlander Sport test record');
    const res = await post('/files', null, { form });
    const id = res.json.data.id;
    log(`  uploaded hero file: ${id} (outlander-sport-hero.png, ${buf.length} bytes)`);
    return id;
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

async function upsertItem(collection, matchFilter, payload, label, createAll = false) {
  const filter = Object.entries(matchFilter)
    .map(([k, v]) => `filter[${k}][_eq]=${encodeURIComponent(v)}`)
    .join('&');
  const found = await get(`/items/${collection}?limit=1&${filter}`);
  const existing = found.json.data?.[0];
  if (existing) {
    const changes = {};
    for (const [k, v] of Object.entries(payload)) {
      if (JSON.stringify(existing[k]) !== JSON.stringify(v)) changes[k] = v;
    }
    if (Object.keys(changes).length === 0) {
      log(`  ${label}: exists (${existing.id}) — no changes.`);
      return existing;
    }
    await patch(`/items/${collection}/${existing.id}`, changes);
    log(`  ${label}: updated ${existing.id} [${Object.keys(changes).join(', ')}]`);
    return { ...existing, ...changes };
  }
  const created = await post(`/items/${collection}`, createAll ? payload : { ...payload });
  log(`  ${label}: created ${created.json.data.id}`);
  return created.json.data;
}

async function findHeroFileId() {
  const filesRes = await get('/files?limit=200');
  const heroFile = (filesRes.json.data || []).find(
    (f) =>
      f.filename_disk === 'outlander-sport-hero.png' ||
      f.filename_download === 'outlander-sport-hero.png' ||
      f.title === 'Outlander Sport Hero'
  );
  return heroFile ? heroFile.id : null;
}

async function seedData() {
  step(3, 'Seed — Mitsubishi Outlander Sport (vehicle, hero, colors, highlights, trims)');

  let heroFileId = null;
  if (!SKIP_IMAGE) {
    log('  -- hero media --');
    heroFileId = await ensureHeroFile();
  } else {
    log('  -- hero media (SKIP_IMAGE=1 — reusing existing upload) --');
    heroFileId = await findHeroFileId();
  }

  // 3a. vehicle
  log('  -- vehicle --');
  const vehicle = await upsertItem(
    'vehicles',
    { slug: VEHICLE.slug },
    VEHICLE,
    `vehicle "${VEHICLE.title}"`
  );
  const vehicleId = vehicle.id;
  log(`  vehicle id: ${vehicleId}`);

  // 3b. hero block + link
  log('  -- hero block --');
  const heroPayload = { ...HERO_BLOCK };
  if (heroFileId) heroPayload.media = heroFileId;
  else log('  (no hero file available — leaving media null; run without SKIP_IMAGE to upload)');
  const hero = await upsertItem(
    'block_hero_custom',
    { headline: HERO_BLOCK.headline, highlight_keyword: HERO_BLOCK.highlight_keyword },
    heroPayload,
    'hero block'
  );
  await patch(`/items/vehicles/${vehicleId}`, { hero_block: hero.id });
  log(`  vehicles.hero_block -> block_hero_custom ${hero.id}`);

  // 3c. colors
  log('  -- colors --');
  for (const color of COLORS) {
    await upsertItem(
      'vehicle_colors',
      { vehicle_id: String(vehicleId), color_name: color.color_name },
      { ...color, vehicle_id: vehicleId, image: null },
      `color "${color.color_name}"`
    );
  }

  // 3d. highlights
  log('  -- highlights --');
  for (const h of HIGHLIGHTS) {
    await upsertItem(
      'block_content_items',
      { vehicle: String(vehicleId), tagline: h.tagline },
      { ...h, vehicle: vehicleId, status: 'published', item: null },
      `highlight "${h.tagline}"`
    );
  }

  // 3e. trims
  log('  -- trims --');
  for (const trim of TRIMS) {
    await upsertItem(
      'vehicle_trims',
      { vehicle: String(vehicleId), trim_name: trim.trim_name },
      {
        ...trim,
        vehicle: vehicleId,
        status: 'published',
        key_features: trim.key_features.map((s) => ({ value: s })),
      },
      `trim "${trim.trim_name}"`
    );
  }

  // 3f. key_features legacy data migration (plain strings -> { value } objects)
  log('  -- key_features data migration --');
  const allTrims = await get('/items/vehicle_trims?limit=100&fields=id,trim_name,key_features');
  let migrated = 0;
  for (const trim of allTrims.json.data || []) {
    const kf = trim.key_features;
    if (!Array.isArray(kf)) continue;
    const needsMigration = kf.some((row) => typeof row === 'string');
    if (!needsMigration) continue;
    const converted = kf.map((row) => (typeof row === 'string' ? { value: row } : row));
    await patch(`/items/vehicle_trims/${trim.id}`, { key_features: converted });
    migrated++;
    log(`    migrated trim ${trim.id} (${trim.trim_name}): ${converted.length} features`);
  }
  if (migrated === 0) log('    nothing to migrate (all key_features already in { value } shape).');
}

/* ------------------------------------------------------------------ */
/* phase 4 — verification                                              */
/* ------------------------------------------------------------------ */

const VERIFY_URL = '/items/vehicles?fields=*,hero_block.*,colors.*,highlights.*,trims.*';

async function verify() {
  step(4, 'Verify — public nested query (unauthenticated)');
  const res = await fetch(BASE + VERIFY_URL); // deliberately NO auth header
  const body = res.status === 200 ? await res.json() : await res.text().catch(() => '');
  log(`  GET ${VERIFY_URL}`);
  log(`  HTTP ${res.status}`);
  if (res.status !== 200) {
    throw new Error(`verification failed: expected 200, got ${res.status}: ${typeof body === 'string' ? body.slice(0, 400) : JSON.stringify(body).slice(0, 400)}`);
  }

  const rows = body.data || [];
  log(`  rows returned: ${rows.length}`);
  const row = rows.find((v) => v.slug === VEHICLE.slug);
  if (!row) throw new Error('verification failed: Outlander Sport row not present');

  const problems = [];
  const expect = (cond, label) => {
    if (!cond) problems.push(label);
    else log(`  ✓ ${label}`);
  };

  expect(row.hero_block && row.hero_block.headline === HERO_BLOCK.headline, `hero_block linked (headline "${HERO_BLOCK.headline}")`);
  expect(row.hero_block && !!row.hero_block.media, 'hero_block.media set');
  expect(Array.isArray(row.colors) && row.colors.length === COLORS.length, `colors nested array (${row.colors?.length ?? 0}/${COLORS.length})`);
  const hexes = (row.colors || []).map((c) => c.hex_code).sort();
  expect(JSON.stringify(hexes) === JSON.stringify(COLORS.map((c) => c.hex_code).sort()), 'color hex codes present');
  expect(Array.isArray(row.highlights) && row.highlights.length === HIGHLIGHTS.length, `highlights nested array (${row.highlights?.length ?? 0}/${HIGHLIGHTS.length})`);
  const tags = (row.highlights || []).map((h) => h.tagline).sort();
  expect(JSON.stringify(tags) === JSON.stringify(HIGHLIGHTS.map((h) => h.tagline).sort()), 'highlight taglines PERFORMANCE/DESIGN/INTERIOR present');
  expect(Array.isArray(row.trims) && row.trims.length === TRIMS.length, `trims nested array (${row.trims?.length ?? 0}/${TRIMS.length})`);
  const trimNames = (row.trims || []).map((t) => t.trim_name).sort();
  expect(JSON.stringify(trimNames) === JSON.stringify(TRIMS.map((t) => t.trim_name).sort()), 'trim names ES/LE/SEL present');
  expect(
    (row.trims || []).every((t) => Array.isArray(t.key_features) && t.key_features.every((f) => f && typeof f === 'object' && typeof f.value === 'string')),
    'trim key_features in repeater { value } shape'
  );

  if (problems.length) throw new Error(`verification failed: ${problems.join('; ')}`);
  log('\n  sample nested payload (Outlander Sport):');
  const sample = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    starting_price: row.starting_price,
    hero_block: row.hero_block && {
      id: row.hero_block.id,
      headline: row.hero_block.headline,
      highlight_keyword: row.hero_block.highlight_keyword,
      media: row.hero_block.media,
    },
    colors: (row.colors || []).map((c) => ({ id: c.id, color_name: c.color_name, hex_code: c.hex_code })),
    highlights: (row.highlights || []).map((h) => ({ id: h.id, tagline: h.tagline, headline: h.headline })),
    trims: (row.trims || []).map((t) => ({ id: t.id, trim_name: t.trim_name, price: t.price, key_features_count: t.key_features?.length })),
  };
  console.log(JSON.stringify(sample, null, 2));
  log('\n  VERIFICATION PASSED (HTTP 200, full nested payload).');
}

/* ------------------------------------------------------------------ */
/* phase 5 — manifest                                                  */
/* ------------------------------------------------------------------ */

async function updateManifest() {
  step(5, 'Manifest — updating project-manifest.json');

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  // fresh stats from the live snapshot
  const snapRes = await get('/schema/snapshot');
  const snap = snapRes.json.data;
  manifest.last_updated = new Date().toISOString();
  manifest.database_stats = {
    ...manifest.database_stats,
    total_collections: snap.collections.length,
    total_fields: snap.fields.length,
    total_relations: snap.relations.length,
    core_collections: Array.from(
      new Set([...(manifest.database_stats.core_collections || []), 'vehicle_colors'])
    ),
  };
  manifest.active_sprint = {
    phase: 'Hybrid Vehicle Schema Architecture — Complete',
    current_task:
      'Hybrid vehicle schema applied (vehicle_colors collection; vehicles.hero_block M2O + colors/highlights/trims O2M with list-o2m interfaces; vehicle_trims.key_features converted to list repeater of {value} strings; block_content_items.vehicle M2O). Outlander Sport seeded: hero block "Drive Your Ambition" with generated media, 3 paint colors, 3 highlight blocks, ES/LE/SEL trims. Next: render /showroom/[slug].vue against the nested vehicles payload.',
    reference_url: 'https://mitsubishi-motors.com.jm/vehicle/2025-outlander-sport/',
  };
  const gotchas = manifest.known_gotchas || [];
  const newGotchas = [
    "Directus 12.3 schema API: GET /schema/snapshot -> POST /schema/diff?mode=merge (partial snapshot with version:2) -> POST /schema/apply (diff body). /schema/state and GET /schema/diff do not exist in 12.x.",
    'vehicle_trims.key_features uses the list (repeater) interface over an array of {value} objects — legacy plain-string arrays were migrated in place; always write new trims in the {value} shape.',
    'Public reads are policy-based field WHITELISTS (directus/seeds/seed-permissions.py keeps them in sync): vehicles exposes hero_block/colors/highlights/trims and vehicle_colors has its own read row; `fields=*` returns only whitelisted fields.',
  ];
  for (const g of newGotchas) {
    if (!gotchas.includes(g)) gotchas.push(g);
  }
  manifest.known_gotchas = gotchas;

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  log(`  manifest updated: ${manifest.database_stats.total_collections} collections, ${manifest.database_stats.total_fields} fields, ${manifest.database_stats.total_relations} relations`);
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

(async () => {
  const started = Date.now();
  log('ANSA Mitsubishi 2026 — Hybrid Vehicle Schema Architecture');
  log(`Directus: ${BASE}`);

  await preflight();
  await applySchema();
  await applyPublicReadPermissions();
  await seedData();
  await verify();
  await updateManifest();

  log(`\nDONE in ${((Date.now() - started) / 1000).toFixed(1)}s — all phases complete.`);
})().catch((err) => {
  console.error(`\nFAILED: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
