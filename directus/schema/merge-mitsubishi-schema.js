#!/usr/bin/env node
/**
 * merge-mitsubishi-schema.js
 *
 * Non-destructive schema merge for the ANSA Mitsubishi 2026 Directus instance.
 *
 * Compares the ANSA commercial starter snapshot
 *   (directus/schema/ansa-commercial-directus-snapshot.json — Directus 11.16, keyed format)
 * against the CURRENT live Mitsubishi schema
 *   (default: /tmp/current-json-snapshot.json — `directus schema snapshot --format json`,
 *    or pass --current <path>; the Sept 25 export is also accepted via --current.
 *    NOTE: always export with --format json — the YAML round-trip re-parses layout-ratio
 *    strings like "50_50" as YAML 1.1 integers and would corrupt block_layout_wrapper.layout_ratio.)
 * and extracts ONLY the missing page-builder collections, fields, and junction relations:
 *
 *   - block_hero_custom & block_hero_custom_files
 *   - block_cta_simple & block_cta_simple_buttons
 *   - block_content_block, block_content_block_files, block_content_items,
 *     block_content_items_buttons, block_content_items_files
 *   - block_layout_wrapper & block_layout_wrapper_sections
 *   - block_button & block_button_group
 *
 * It then updates the M2A allowed choices on `pages.blocks` (stored on the
 * `page_blocks.item` junction relation meta.one_allowed_collections) to include the
 * four custom page-level blocks.
 *
 * Safety guarantees (abort on violation):
 *   1. Purely additive: every collection/field/relation present in the current
 *      snapshot is preserved verbatim in the target — nothing is deleted or
 *      rewritten except the M2A allowed-collections list.
 *   2. T&T vehicle collections (vehicles, vehicle_trims, dealers, vehicle_colors)
 *      are asserted present and byte-identical.
 *   3. Every resulting change is printed before the file is written.
 *
 * Output: directus/schema/merged-mitsubishi-schema.json (array format, version 1 —
 * consumable by `directus schema apply <file> --yes`).
 *
 * Apply (run inside the CMS container so DB env is available; Postgres port is
 * not exposed on the host):
 *   docker cp directus/schema/merged-mitsubishi-schema.json directus-mitsubishi-cms:/tmp/
 *   docker exec directus-mitsubishi-cms node /directus/cli.js schema apply /tmp/merged-mitsubishi-schema.json --yes
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_DIR = __dirname;

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argVal = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
};
const currentPath = argVal('--current') || '/tmp/current-json-snapshot.json';
const outputRel = path.join(SCHEMA_DIR, 'merged-mitsubishi-schema.json');

// ── Loaders ─────────────────────────────────────────────────────────────────
/** Load a snapshot in EITHER keyed format ({data:{collections:{name:{...}}}}) or CLI array format. */
function loadSnapshot(p, label) {
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  const d = raw.data && raw.data.collections ? raw.data : raw;
  const toArray = (v) => (Array.isArray(v) ? v : Object.values(v || {}));
  return {
    version: d.version,
    directus: d.directus,
    vendor: d.vendor,
    collections: toArray(d.collections),
    fields: toArray(d.fields),
    systemFields: toArray(d.systemFields || []),
    relations: toArray(d.relations),
    _label: label,
  };
}

const ansa = loadSnapshot(path.join(SCHEMA_DIR, 'ansa-commercial-directus-snapshot.json'), 'ansa');
let current = loadSnapshot(currentPath, 'current');

// If --current pointed at a keyed/wrapped file, fine. If it was CLI-format YAML, the user must
// have converted it; detect and warn.
if (!Array.isArray(current.collections)) throw new Error('current snapshot has unexpected shape');

// ── Index helpers ───────────────────────────────────────────────────────────
const idx = (arr, keyFn) => new Map(arr.map((x) => [keyFn(x), x]));
const collIdx = (s) => idx(s.collections, (c) => c.collection);
const fieldIdx = (s) => idx(s.fields, (f) => `${f.collection}.${f.field}`);
const relIdx = (s) => idx(s.relations, (r) => `${r.collection}.${r.field}`);

// ── Merge plan ──────────────────────────────────────────────────────────────
const REQUIRED_BLOCK_COLLECTIONS = [
  'block_hero_custom',
  'block_hero_custom_files',
  'block_cta_simple',
  'block_cta_simple_buttons',
  'block_content_block',
  'block_content_block_files',
  'block_content_items',
  'block_content_items_buttons',
  'block_content_items_files',
  'block_layout_wrapper',
  'block_layout_wrapper_sections',
  'block_button',
  'block_button_group',
];

// Page-level blocks that must be creatable via the pages.blocks M2A field.
const M2A_CUSTOM_BLOCKS = [
  'block_hero_custom',
  'block_cta_simple',
  'block_content_block',
  'block_layout_wrapper',
];

const PROTECTED_VEHICLE_COLLECTIONS = ['vehicles', 'vehicle_trims', 'dealers', 'vehicle_colors'];

// Deep clone current → target
const target = JSON.parse(JSON.stringify(current));

const addedCollections = [];
const addedFields = [];
const addedRelations = [];

const tColls = collIdx(target);
const tFields = fieldIdx(target);
const tRels = relIdx(target);
const aColls = collIdx(ansa);
const aFields = fieldIdx(ansa);
const aRels = relIdx(ansa);

for (const name of REQUIRED_BLOCK_COLLECTIONS) {
  const inAnsa = !!aColls.get(name);
  const inCurrent = !!tColls.get(name);
  if (!inCurrent) {
    if (!inAnsa) throw new Error(`Required collection ${name} missing from BOTH snapshots — cannot merge.`);
    target.collections.push(aColls.get(name));
    addedCollections.push(name);
  }
  // Fields
  for (const [key, f] of aFields) {
    if (f.collection === name && !tFields.has(key)) {
      target.fields.push(f);
      addedFields.push(key);
    }
  }
  // Relations (junction + M2A + parent/child)
  for (const [key, r] of aRels) {
    if (r.collection === name && !tRels.has(key)) {
      target.relations.push(r);
      addedRelations.push(key + (r.related_collection ? ` → ${r.related_collection}` : ''));
    }
  }
  // Re-index as we add
  tColls.set(name, target.collections.find((c) => c.collection === name));
  for (const f of target.fields) if (!tFields.has(`${f.collection}.${f.field}`)) tFields.set(`${f.collection}.${f.field}`, f);
  for (const r of target.relations) if (!tRels.has(`${r.collection}.${r.field}`)) tRels.set(`${r.collection}.${r.field}`, r);
}

// ── M2A allowed choices on pages.blocks (junction relation page_blocks.item) ─
const m2aRel = target.relations.find((r) => r.collection === 'page_blocks' && r.field === 'item');
if (!m2aRel) throw new Error('page_blocks.item junction relation not found in current schema');
const existingChoices = Array.isArray(m2aRel.meta?.one_allowed_collections) ? [...m2aRel.meta.one_allowed_collections] : [];
const mergedChoices = [...existingChoices];
for (const c of M2A_CUSTOM_BLOCKS) {
  if (!mergedChoices.includes(c)) mergedChoices.push(c);
}
const m2aAdded = mergedChoices.filter((c) => !existingChoices.includes(c));
m2aRel.meta.one_allowed_collections = mergedChoices;

// ── Safety audit ────────────────────────────────────────────────────────────
// 1) Nothing from current may be missing in target.
const missingFromTarget = [];
for (const c of current.collections) if (!tColls.has(c.collection)) missingFromTarget.push(`collection ${c.collection}`);
for (const f of current.fields) if (!tFields.has(`${f.collection}.${f.field}`)) missingFromTarget.push(`field ${f.collection}.${f.field}`);
for (const r of current.relations) if (!tRels.has(`${r.collection}.${r.field}`)) missingFromTarget.push(`relation ${r.collection}.${r.field}`);
if (missingFromTarget.length) {
  console.error('ABORT — items present in current but missing from target (would be DELETED):');
  missingFromTarget.forEach((m) => console.error('  - ' + m));
  process.exit(1);
}

// 2) Vehicle collections must be present and unchanged.
const curColls = collIdx(current);
const curFields = fieldIdx(current);
const curRels = relIdx(current);
for (const name of PROTECTED_VEHICLE_COLLECTIONS) {
  if (!curColls.has(name)) throw new Error(`Vehicle collection ${name} not found in current schema — aborting to avoid hiding data loss.`);
  const a = JSON.stringify(curColls.get(name));
  const b = JSON.stringify(tColls.get(name));
  if (a !== b) throw new Error(`Vehicle collection ${name} collection-meta differs — aborting.`);
  for (const [key, f] of curFields) {
    if (f.collection === name) {
      const g = tFields.get(key);
      if (!g || JSON.stringify(f) !== JSON.stringify(g)) throw new Error(`Vehicle field ${key} changed — aborting.`);
    }
  }
  for (const [key, r] of curRels) {
    if (r.collection === name) {
      const g = tRels.get(key);
      if (!g || JSON.stringify(r) !== JSON.stringify(g)) throw new Error(`Vehicle relation ${key} changed — aborting.`);
    }
  }
}

// 3) Enumerate every difference current → target (sanitized, mirroring Directus's diff pick-list).
function pick(obj, paths) {
  const out = {};
  for (const p of paths) {
    const parts = p.split('.');
    let v = obj;
    for (const part of parts) {
      if (v == null) { v = undefined; break; }
      v = v[part];
    }
    if (v !== undefined) {
      if (parts.length === 1) out[parts[0]] = v;
      else {
        let o = out;
        for (let i = 0; i < parts.length - 1; i++) {
          o[parts[i]] = o[parts[i]] || {};
          o = o[parts[i]];
        }
        o[parts[parts.length - 1]] = v;
      }
    }
  }
  return out;
}
const COLL_PATHS = ['collection', 'fields', 'meta', 'schema.name'];
const FIELD_PATHS = [
  'collection', 'field', 'type', 'meta', 'name', 'children',
  'schema.name', 'schema.table', 'schema.data_type', 'schema.default_value', 'schema.max_length',
  'schema.numeric_precision', 'schema.numeric_scale', 'schema.is_nullable', 'schema.is_unique',
  'schema.is_indexed', 'schema.is_primary_key', 'schema.is_generated', 'schema.generation_expression',
  'schema.has_auto_increment', 'schema.foreign_key_table', 'schema.foreign_key_column',
];
const REL_PATHS = [
  'collection', 'field', 'related_collection', 'meta',
  'schema.table', 'schema.column', 'schema.foreign_key_table', 'schema.foreign_key_column',
  'schema.constraint_name', 'schema.on_update', 'schema.on_delete',
];

const changes = [];
for (const c of current.collections) {
  const t = tColls.get(c.collection);
  const a = JSON.stringify(pick(c, COLL_PATHS));
  const b = JSON.stringify(pick(t, COLL_PATHS));
  if (a !== b) changes.push({ kind: 'collection-edit', what: c.collection, from: a, to: b });
}
for (const f of current.fields) {
  const t = tFields.get(`${f.collection}.${f.field}`);
  const a = JSON.stringify(pick(f, FIELD_PATHS));
  const b = JSON.stringify(pick(t, FIELD_PATHS));
  if (a !== b) changes.push({ kind: 'field-edit', what: `${f.collection}.${f.field}`, from: a, to: b });
}
for (const r of current.relations) {
  const t = tRels.get(`${r.collection}.${r.field}`);
  const a = JSON.stringify(pick(r, REL_PATHS));
  const b = JSON.stringify(pick(t, REL_PATHS));
  if (a !== b) changes.push({ kind: 'relation-edit', what: `${r.collection}.${r.field}`, from: a, to: b });
}

// Only allowed change: page_blocks.item meta.one_allowed_collections
for (const ch of changes) {
  if (!(ch.kind === 'relation-edit' && ch.what === 'page_blocks.item')) {
    console.error('ABORT — unexpected change detected:');
    console.error(JSON.stringify(ch, null, 2));
    process.exit(1);
  }
}
// And it must be a pure addition to the allowed list
const expectedM2a = {
  ...pick(curRels.get('page_blocks.item'), REL_PATHS),
  meta: { ...curRels.get('page_blocks.item').meta, one_allowed_collections: mergedChoices },
};
if (JSON.stringify(pick(tRels.get('page_blocks.item'), REL_PATHS)) !== JSON.stringify(expectedM2a)) {
  console.error('ABORT — page_blocks.item change is not a pure one_allowed_collections addition.');
  process.exit(1);
}

// ── Report + write ──────────────────────────────────────────────────────────
console.log('═'.repeat(72));
console.log('ANSA Mitsubishi schema merge — audit report');
console.log('═'.repeat(72));
console.log(`Source (reference): ${ansa._label}  [directus ${ansa.directus}]`);
console.log(`Base (live):        ${current._label}  [directus ${current.directus}]`);
console.log(`\nRequired block collections: ${REQUIRED_BLOCK_COLLECTIONS.length}`);
console.log(`  already present in live schema: ${REQUIRED_BLOCK_COLLECTIONS.length - addedCollections.length}`);
console.log(`  added (missing):                ${addedCollections.length ? addedCollections.join(', ') : '(none)'}`);
console.log(`  fields added:                   ${addedFields.length ? addedFields.join(', ') : '(none)'}`);
console.log(`  relations added:                ${addedRelations.length ? addedRelations.join('; ') : '(none)'}`);
console.log(`\nM2A pages.blocks allowed choices (page_blocks.item):`);
console.log(`  before: ${existingChoices.join(', ')}`);
console.log(`  after:  ${mergedChoices.join(', ')}`);
console.log(`  added:  ${m2aAdded.length ? m2aAdded.join(', ') : '(none — already allowed)'}`);
console.log(`\nProtected T&T vehicle collections: ${PROTECTED_VEHICLE_COLLECTIONS.join(', ')} — present & unchanged ✓`);
console.log(`Safety audit: no deletions, no unrelated edits ✓`);
console.log(`\nChanges to apply: ${changes.length} (relation meta edit only)`);

const out = {
  version: 1,
  directus: current.directus,
  vendor: current.vendor,
  collections: target.collections,
  fields: target.fields,
  systemFields: target.systemFields,
  relations: target.relations,
};
fs.writeFileSync(outputRel, JSON.stringify(out, null, 2));
console.log(`\nWrote ${outputRel}`);
console.log(`  collections: ${out.collections.length} | fields: ${out.fields.length} | systemFields: ${out.systemFields.length} | relations: ${out.relations.length}`);
console.log('\nApply with:');
console.log('  docker cp directus/schema/merged-mitsubishi-schema.json directus-mitsubishi-cms:/tmp/merged-mitsubishi-schema.json');
console.log('  docker exec directus-mitsubishi-cms node /directus/cli.js schema apply /tmp/merged-mitsubishi-schema.json --yes');
