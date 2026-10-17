#!/usr/bin/env node
/**
 * add-spec-fields.mjs
 *
 * Adds the technical-spec text fields shown by the homepage Quick Specs modal
 * (nuxt/app/components/showroom/QuickSpecsModal.vue) to `vehicles`, grants the
 * public policy read access to them and fills them in for the active fleet.
 *
 *   1. Creates `ground_clearance`, `dimensions`, `torque` and `suspension`
 *      (nullable string, input interface) if missing.
 *   2. Appends them to the public `vehicles` read whitelist.
 *      seed-permissions.py and apply-hybrid-vehicle-schema.js list them too,
 *      so a permissions reseed keeps them.
 *   3. Writes SPECS per slug (only fields whose value differs).
 *   4. Clears the Directus data cache.
 *
 * Idempotent: every step checks current state first.
 *
 * Usage:  node scripts/add-spec-fields.mjs
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function loadToken() {
	const envTok = process.env.DIRECTUS_TOKEN;
	if (envTok) return envTok;
	const envFile = path.join(HERE, '..', 'directus', '.env');
	const m = fs.existsSync(envFile) && fs.readFileSync(envFile, 'utf8').match(/^ADMIN_TOKEN=(.*)$/m);
	if (!m) {
		console.error('ERROR: no token — set DIRECTUS_TOKEN or ADMIN_TOKEN in directus/.env');
		process.exit(1);
	}
	return m[1].trim();
}

const TOKEN = loadToken();
const BASE = process.env.DIRECTUS_URL || 'http://localhost:8055';

async function api(method, urlPath, body, { allowMissing = false } = {}) {
	const res = await fetch(BASE + urlPath, {
		method,
		headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (allowMissing && (res.status === 404 || res.status === 403)) return null;
	const text = await res.text();
	if (!res.ok) throw new Error(`${method} ${urlPath} → ${res.status} ${text.slice(0, 300)}`);
	return text ? JSON.parse(text) : null;
}

const FIELDS = [
	{ field: 'ground_clearance', note: 'Minimum ground clearance, e.g. "222 mm".' },
	{ field: 'dimensions', note: 'Overall length × width × height, e.g. "4,390 × 1,810 × 1,660 mm".' },
	{ field: 'torque', note: 'Peak torque, e.g. "141 Nm @ 4,000 rpm". Power stays in the trim engine text.' },
	{ field: 'suspension', note: 'Front / rear suspension, e.g. "MacPherson Strut / Torsion Beam".' },
];

const SPECS = {
	'outlander-sport': {
		ground_clearance: '222 mm',
		dimensions: '4,390 × 1,810 × 1,660 mm',
		torque: '141 Nm @ 4,000 rpm',
		suspension: 'MacPherson Strut / Torsion Beam',
	},
	triton: {
		ground_clearance: '222 mm',
		dimensions: '5,320 × 1,865 × 1,795 mm',
		torque: '430 Nm @ 2,250–2,500 rpm',
		suspension: 'Independent Double Wishbone / Rigid Leaf Spring',
	},
	'xpander-cross': {
		ground_clearance: '225 mm',
		dimensions: '4,595 × 1,790 × 1,750 mm',
		torque: '141 Nm @ 4,000 rpm',
		suspension: 'MacPherson Strut / Torsion Beam',
	},
};

let changed = false;

// --- 1. fields --------------------------------------------------------------
for (const { field, note } of FIELDS) {
	if (await api('GET', `/fields/vehicles/${field}`, undefined, { allowMissing: true })) {
		console.log(`= vehicles.${field} field exists`);
		continue;
	}
	await api('POST', '/fields/vehicles', {
		field,
		type: 'string',
		meta: { interface: 'input', width: 'half', group: null, note },
		schema: { is_nullable: true },
	});
	console.log(`+ vehicles.${field} field created`);
	changed = true;
}

// --- 2. public read ---------------------------------------------------------
const { data: policies } = await api('GET', '/policies?fields=id,name&limit=-1');
const publicPolicy = policies.find((p) => p.name === '$t:public_label' || /public/i.test(p.name ?? ''));
if (!publicPolicy) throw new Error('public policy not found');

const { data: perms } = await api('SEARCH', '/permissions', {
	query: {
		filter: { policy: { _eq: publicPolicy.id }, collection: { _eq: 'vehicles' }, action: { _eq: 'read' } },
		fields: ['id', 'fields'],
		limit: 1,
	},
});
const perm = perms[0];
if (!perm) throw new Error('public vehicles read permission not found — run seed-permissions.py first');

const granted = perm.fields ?? [];
const missing = granted.includes('*') ? [] : FIELDS.map((f) => f.field).filter((field) => !granted.includes(field));
if (missing.length) {
	await api('PATCH', `/permissions/${perm.id}`, { fields: [...granted, ...missing] });
	console.log(`+ public read granted on vehicles.${missing.join(', vehicles.')}`);
	changed = true;
} else {
	console.log('= public read on spec fields already granted');
}

// --- 3. values --------------------------------------------------------------
const { data: vehicles } = await api('SEARCH', '/items/vehicles', {
	query: { fields: ['id', 'slug', ...FIELDS.map((f) => f.field)], limit: -1 },
});
for (const [slug, specs] of Object.entries(SPECS)) {
	const vehicle = vehicles.find((v) => v.slug === slug);
	if (!vehicle) throw new Error(`vehicle not found: ${slug}`);
	const patch = Object.fromEntries(Object.entries(specs).filter(([field, value]) => vehicle[field] !== value));
	if (!Object.keys(patch).length) {
		console.log(`= ${slug}: specs up to date`);
		continue;
	}
	await api('PATCH', `/items/vehicles/${vehicle.id}`, patch);
	console.log(`+ ${slug}: ${Object.keys(patch).join(', ')}`);
	changed = true;
}

// This instance serves stale GET reads after writes (see contact-form.mjs); the Nuxt API reads via GET.
if (changed) {
	await api('POST', '/utils/cache/clear');
	console.log('~ Directus data cache cleared');
}
