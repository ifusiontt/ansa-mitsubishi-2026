#!/usr/bin/env node
/**
 * add-vehicle-menu-image.mjs
 *
 * Adds `vehicles.menu_image` — a nullable single-file (M2O → directus_files)
 * field used by the header mega menu cards — and grants the public policy
 * read access to it.
 *
 *   1. Creates the `menu_image` uuid field (file-image interface) if missing.
 *   2. Creates the vehicles.menu_image → directus_files relation if missing
 *      (ON DELETE SET NULL, so deleting the file just clears the field).
 *   3. Appends `menu_image` to the public `vehicles` read whitelist.
 *      seed-permissions.py lists it too, so a permissions reseed keeps it.
 *
 * Idempotent: every step checks current state first.
 *
 * Usage:  node directus/seeds/add-vehicle-menu-image.mjs
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function loadToken() {
	const envTok = process.env.DIRECTUS_TOKEN;
	if (envTok) return envTok;
	const envFile = path.join(HERE, '..', '.env');
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

// --- 1. field ---------------------------------------------------------------
if (await api('GET', '/fields/vehicles/menu_image', undefined, { allowMissing: true })) {
	console.log('= vehicles.menu_image field exists');
} else {
	await api('POST', '/fields/vehicles', {
		field: 'menu_image',
		type: 'uuid',
		meta: {
			interface: 'file-image',
			special: ['file'],
			display: 'image',
			width: 'half',
			note: 'Cut-out / beauty shot shown on the header mega menu card. Falls back to the hero image.',
		},
		schema: { is_nullable: true },
	});
	console.log('+ vehicles.menu_image field created');
}

// --- 2. relation ------------------------------------------------------------
if (await api('GET', '/relations/vehicles/menu_image', undefined, { allowMissing: true })) {
	console.log('= vehicles.menu_image → directus_files relation exists');
} else {
	await api('POST', '/relations', {
		collection: 'vehicles',
		field: 'menu_image',
		related_collection: 'directus_files',
		schema: { on_delete: 'SET NULL' },
	});
	console.log('+ vehicles.menu_image → directus_files relation created');
}

// --- 3. public read ---------------------------------------------------------
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

const fields = perm.fields ?? [];
if (fields.includes('*') || fields.includes('menu_image')) {
	console.log('= public read on vehicles.menu_image already granted');
} else {
	await api('PATCH', `/permissions/${perm.id}`, { fields: [...fields, 'menu_image'] });
	console.log('+ public read granted on vehicles.menu_image');
}
