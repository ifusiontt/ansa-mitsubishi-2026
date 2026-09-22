#!/usr/bin/env node
/**
 * patch-mitsubishi-collections.js
 *
 * Merges the Mitsubishi content collections (vehicles, vehicle_trims, dealers)
 * into the prepared target snapshot (mitsubishi-target-schema.json).
 *
 * Field definitions are derived from directus/seeds/mitsubishi-initial-data.json
 * (the canonical seed payload) so that every seeded key maps to a real field.
 *
 * Usage: node patch-mitsubishi-collections.js
 * - Backs up the current file to mitsubishi-target-schema.json.orig (once)
 * - Idempotent: re-running does not duplicate entries
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'mitsubishi-target-schema.json');
const BACKUP = FILE + '.orig';

if (!fs.existsSync(BACKUP)) fs.copyFileSync(FILE, BACKUP);

const snapshot = JSON.parse(fs.readFileSync(FILE, 'utf8')).data;

/* ------------------------------------------------------------------ */
/* helpers to build snapshot-format entries                            */
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

const varchar = (n = 255) => 'character varying';

const idField = (collection) => ({
  collection,
  field: 'id',
  type: 'integer',
  meta: fieldMeta(collection, 'id', 1, { hidden: true, readonly: true }),
  schema: fieldSchema(collection, 'id', 'integer', {
    numeric_precision: 32,
    numeric_scale: 0,
    is_nullable: false,
    is_unique: true,
    is_primary_key: true,
    has_auto_increment: true,
  }),
});

const statusField = (collection, sort) => ({
  collection,
  field: 'status',
  type: 'string',
  meta: fieldMeta(collection, 'status', sort, {
    interface: 'select-options',
    options: {
      options: [
        { text: 'Published', value: 'published' },
        { text: 'Draft', value: 'draft' },
        { text: 'Archived', value: 'archived' },
      ],
    },
  }),
  schema: fieldSchema(collection, 'status', varchar(25), {
    max_length: 25,
    default_value: 'published',
  }),
});

/* ------------------------------------------------------------------ */
/* vehicles                                                            */
/* ------------------------------------------------------------------ */

const vehiclesFields = [
  idField('vehicles'),
  {
    collection: 'vehicles', field: 'title', type: 'string',
    meta: fieldMeta('vehicles', 'title', 2, { required: true, note: 'Model name shown across the site' }),
    schema: fieldSchema('vehicles', 'title', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'vehicles', field: 'slug', type: 'string',
    meta: fieldMeta('vehicles', 'slug', 3, { required: true, note: 'URL-safe identifier' }),
    schema: fieldSchema('vehicles', 'slug', varchar(255), { max_length: 255, is_unique: true }),
  },
  {
    collection: 'vehicles', field: 'tagline', type: 'string',
    meta: fieldMeta('vehicles', 'tagline', 4),
    schema: fieldSchema('vehicles', 'tagline', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'vehicles', field: 'hero_headline', type: 'string',
    meta: fieldMeta('vehicles', 'hero_headline', 5),
    schema: fieldSchema('vehicles', 'hero_headline', varchar(500), { max_length: 500 }),
  },
  {
    collection: 'vehicles', field: 'starting_price', type: 'integer',
    meta: fieldMeta('vehicles', 'starting_price', 6, { note: 'Starting price in TTD' }),
    schema: fieldSchema('vehicles', 'starting_price', 'integer', { numeric_precision: 32, numeric_scale: 0 }),
  },
  {
    collection: 'vehicles', field: 'primary_color', type: 'string',
    meta: fieldMeta('vehicles', 'primary_color', 7, { interface: 'input', note: 'Brand accent color (hex)' }),
    schema: fieldSchema('vehicles', 'primary_color', varchar(7), { max_length: 7 }),
  },
  {
    collection: 'vehicles', field: 'brochure_url', type: 'string',
    meta: fieldMeta('vehicles', 'brochure_url', 8),
    schema: fieldSchema('vehicles', 'brochure_url', varchar(255), { max_length: 255 }),
  },
  statusField('vehicles', 9),
  {
    collection: 'vehicles', field: 'model_year', type: 'integer',
    meta: fieldMeta('vehicles', 'model_year', 10),
    schema: fieldSchema('vehicles', 'model_year', 'integer', { numeric_precision: 32, numeric_scale: 0 }),
  },
  {
    collection: 'vehicles', field: 'category', type: 'string',
    meta: fieldMeta('vehicles', 'category', 11),
    schema: fieldSchema('vehicles', 'category', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'vehicles', field: 'body_type', type: 'string',
    meta: fieldMeta('vehicles', 'body_type', 12),
    schema: fieldSchema('vehicles', 'body_type', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'vehicles', field: 'seating_capacity', type: 'integer',
    meta: fieldMeta('vehicles', 'seating_capacity', 13),
    schema: fieldSchema('vehicles', 'seating_capacity', 'integer', { numeric_precision: 32, numeric_scale: 0 }),
  },
  {
    collection: 'vehicles', field: 'fuel_type', type: 'string',
    meta: fieldMeta('vehicles', 'fuel_type', 14),
    schema: fieldSchema('vehicles', 'fuel_type', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'vehicles', field: 'warranty', type: 'string',
    meta: fieldMeta('vehicles', 'warranty', 15),
    schema: fieldSchema('vehicles', 'warranty', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'vehicles', field: 'overview', type: 'text',
    meta: fieldMeta('vehicles', 'overview', 16, { interface: 'input-multiline', width: 'full', note: 'Long-form model overview' }),
    schema: fieldSchema('vehicles', 'overview', 'text'),
  },
];

/* ------------------------------------------------------------------ */
/* vehicle_trims                                                       */
/* ------------------------------------------------------------------ */

const trimsFields = [
  idField('vehicle_trims'),
  {
    collection: 'vehicle_trims', field: 'vehicle', type: 'integer',
    meta: fieldMeta('vehicle_trims', 'vehicle', 2, {
      interface: 'select-dropdown-m2o',
      display: 'related-values',
      display_options: { template: '{{title}}' },
      options: { template: '{{title}}' },
      special: ['m2o'],
      note: 'Parent vehicle model',
    }),
    schema: fieldSchema('vehicle_trims', 'vehicle', 'integer', {
      numeric_precision: 32,
      numeric_scale: 0,
      foreign_key_table: 'vehicles',
      foreign_key_column: 'id',
    }),
  },
  {
    collection: 'vehicle_trims', field: 'vehicle_id', type: 'integer',
    meta: fieldMeta('vehicle_trims', 'vehicle_id', 3, { readonly: true, note: 'Denormalized parent vehicle id' }),
    schema: fieldSchema('vehicle_trims', 'vehicle_id', 'integer', { numeric_precision: 32, numeric_scale: 0 }),
  },
  {
    collection: 'vehicle_trims', field: 'vehicle_slug', type: 'string',
    meta: fieldMeta('vehicle_trims', 'vehicle_slug', 4, { readonly: true, note: 'Denormalized parent vehicle slug' }),
    schema: fieldSchema('vehicle_trims', 'vehicle_slug', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'vehicle_trims', field: 'trim_name', type: 'string',
    meta: fieldMeta('vehicle_trims', 'trim_name', 5, { required: true }),
    schema: fieldSchema('vehicle_trims', 'trim_name', varchar(255), { max_length: 255 }),
  },
  statusField('vehicle_trims', 6),
  {
    collection: 'vehicle_trims', field: 'engine', type: 'string',
    meta: fieldMeta('vehicle_trims', 'engine', 7),
    schema: fieldSchema('vehicle_trims', 'engine', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'vehicle_trims', field: 'transmission', type: 'string',
    meta: fieldMeta('vehicle_trims', 'transmission', 8),
    schema: fieldSchema('vehicle_trims', 'transmission', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'vehicle_trims', field: 'drivetrain', type: 'string',
    meta: fieldMeta('vehicle_trims', 'drivetrain', 9),
    schema: fieldSchema('vehicle_trims', 'drivetrain', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'vehicle_trims', field: 'price', type: 'integer',
    meta: fieldMeta('vehicle_trims', 'price', 10, { note: 'Trim price in TTD' }),
    schema: fieldSchema('vehicle_trims', 'price', 'integer', { numeric_precision: 32, numeric_scale: 0 }),
  },
  {
    collection: 'vehicle_trims', field: 'key_features', type: 'json',
    meta: fieldMeta('vehicle_trims', 'key_features', 11, { interface: 'json', width: 'full', note: 'JSON array of feature strings' }),
    schema: fieldSchema('vehicle_trims', 'key_features', 'json'),
  },
];

/* ------------------------------------------------------------------ */
/* dealers                                                             */
/* ------------------------------------------------------------------ */

const dealersFields = [
  idField('dealers'),
  {
    collection: 'dealers', field: 'name', type: 'string',
    meta: fieldMeta('dealers', 'name', 2, { required: true }),
    schema: fieldSchema('dealers', 'name', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'dealers', field: 'slug', type: 'string',
    meta: fieldMeta('dealers', 'slug', 3, { required: true }),
    schema: fieldSchema('dealers', 'slug', varchar(255), { max_length: 255, is_unique: true }),
  },
  statusField('dealers', 4),
  {
    collection: 'dealers', field: 'address', type: 'string',
    meta: fieldMeta('dealers', 'address', 5),
    schema: fieldSchema('dealers', 'address', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'dealers', field: 'city', type: 'string',
    meta: fieldMeta('dealers', 'city', 6),
    schema: fieldSchema('dealers', 'city', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'dealers', field: 'state_region', type: 'string',
    meta: fieldMeta('dealers', 'state_region', 7),
    schema: fieldSchema('dealers', 'state_region', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'dealers', field: 'postal_code', type: 'string',
    meta: fieldMeta('dealers', 'postal_code', 8),
    schema: fieldSchema('dealers', 'postal_code', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'dealers', field: 'country', type: 'string',
    meta: fieldMeta('dealers', 'country', 9),
    schema: fieldSchema('dealers', 'country', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'dealers', field: 'phone', type: 'string',
    meta: fieldMeta('dealers', 'phone', 10),
    schema: fieldSchema('dealers', 'phone', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'dealers', field: 'secondary_phone', type: 'string',
    meta: fieldMeta('dealers', 'secondary_phone', 11),
    schema: fieldSchema('dealers', 'secondary_phone', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'dealers', field: 'email', type: 'string',
    meta: fieldMeta('dealers', 'email', 12, { interface: 'input' }),
    schema: fieldSchema('dealers', 'email', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'dealers', field: 'is_headquarters', type: 'boolean',
    meta: fieldMeta('dealers', 'is_headquarters', 13, { interface: 'boolean' }),
    schema: fieldSchema('dealers', 'is_headquarters', 'boolean', { default_value: false }),
  },
  {
    collection: 'dealers', field: 'latitude', type: 'float',
    meta: fieldMeta('dealers', 'latitude', 14),
    schema: fieldSchema('dealers', 'latitude', 'double precision'),
  },
  {
    collection: 'dealers', field: 'longitude', type: 'float',
    meta: fieldMeta('dealers', 'longitude', 15),
    schema: fieldSchema('dealers', 'longitude', 'double precision'),
  },
  {
    collection: 'dealers', field: 'google_maps_url', type: 'string',
    meta: fieldMeta('dealers', 'google_maps_url', 16),
    schema: fieldSchema('dealers', 'google_maps_url', varchar(255), { max_length: 255 }),
  },
  {
    collection: 'dealers', field: 'opening_hours', type: 'json',
    meta: fieldMeta('dealers', 'opening_hours', 17, { interface: 'json', note: 'JSON object: day -> hours' }),
    schema: fieldSchema('dealers', 'opening_hours', 'json'),
  },
  {
    collection: 'dealers', field: 'services', type: 'json',
    meta: fieldMeta('dealers', 'services', 18, { interface: 'json', width: 'full', note: 'JSON array of service strings' }),
    schema: fieldSchema('dealers', 'services', 'json'),
  },
];

/* ------------------------------------------------------------------ */
/* collection meta entries                                             */
/* ------------------------------------------------------------------ */

const collectionMeta = (collection, icon, displayTemplate, note, sort) => ({
  collection,
  meta: {
    accountability: 'all',
    archive_app_filter: true,
    archive_field: 'status',
    archive_value: 'archived',
    autosave_revision_interval: null,
    collapse: 'open',
    collection,
    color: null,
    display_template: displayTemplate,
    group: null,
    hidden: false,
    icon,
    item_duplication_fields: null,
    note,
    preview_url: null,
    singleton: false,
    sort,
    sort_field: null,
    status: 'active',
    translations: null,
    unarchive_value: 'draft',
    versioning: false,
  },
  schema: { name: collection },
});

const mitsubishiCollections = [
  collectionMeta('vehicles', 'directions_car', '{{title}}', 'Mitsubishi vehicle models (2026 lineup)', 1),
  collectionMeta('vehicle_trims', 'tune', '{{vehicle}} {{trim_name}}', 'Available trims per vehicle model', 2),
  collectionMeta('dealers', 'store', '{{name}}', 'ANSA Mitsubishi dealership locations', 3),
];

const mitsubishiRelations = [
  {
    collection: 'vehicle_trims',
    field: 'vehicle',
    related_collection: 'vehicles',
    meta: {
      junction_field: null,
      many_collection: 'vehicle_trims',
      many_field: 'vehicle',
      one_allowed_collections: null,
      one_collection: 'vehicles',
      one_collection_field: null,
      one_deselect_action: 'nullify',
      one_field: null,
      sort_field: null,
    },
    schema: {
      table: 'vehicle_trims',
      column: 'vehicle',
      foreign_key_table: 'vehicles',
      foreign_key_column: 'id',
      constraint_name: 'vehicle_trims_vehicle_foreign',
      on_update: 'NO ACTION',
      on_delete: 'SET NULL',
    },
  },
];

/* ------------------------------------------------------------------ */
/* merge (idempotent)                                                  */
/* ------------------------------------------------------------------ */

const addIfMissing = (arr, item, key) => {
  if (!arr.some((x) => x[key] === item[key])) arr.push(item);
};

for (const c of mitsubishiCollections) addIfMissing(snapshot.collections, c, 'collection');

const mitsubishiFieldSet = new Set(
  [...vehiclesFields, ...trimsFields, ...dealersFields].map((f) => `${f.collection}.${f.field}`),
);
snapshot.fields = snapshot.fields.filter((f) => !mitsubishiFieldSet.has(`${f.collection}.${f.field}`));
for (const f of [...vehiclesFields, ...trimsFields, ...dealersFields]) snapshot.fields.push(f);

for (const r of mitsubishiRelations) {
  if (!snapshot.relations.some((x) => x.collection === r.collection && x.field === r.field)) {
    snapshot.relations.push(r);
  }
}

fs.writeFileSync(FILE, JSON.stringify({ data: snapshot }, null, 2) + '\n');

const d2 = JSON.parse(fs.readFileSync(FILE, 'utf8')).data;
console.log(`collections: ${d2.collections.length} (was 35)`);
console.log(`fields:      ${d2.fields.length} (+${vehiclesFields.length + trimsFields.length + dealersFields.length})`);
console.log(`relations:   ${d2.relations.length} (+1)`);
const mb = d2.collections.filter((c) => ['vehicles', 'vehicle_trims', 'dealers'].includes(c.collection));
console.log('mitsubishi collections:', mb.map((c) => c.collection).join(', '));
