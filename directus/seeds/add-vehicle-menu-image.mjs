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
 *   4. Uploads the transparent (RGBA PNG) model cutouts from the content library and
 *      assigns them as `menu_image` — used by the homepage "Find your Mitsubishi" cards
 *      and the header mega menu, so they float on the dark cards without a white box.
 *
 * Idempotent: every step checks current state first (cutouts are matched by filename + size).
 *
 * Usage:  node directus/seeds/add-vehicle-menu-image.mjs
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 *         CONTENT_DIR (default ~/Documents/PERSONAL WORK/2026/Ansa/Mitsubishi/Content/Mitsubishi 2026)
 */
import fs from 'node:fs';
import os from 'node:os';
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

// --- 4. cutouts ---------------------------------------------------------------
const CONTENT_DIR =
	process.env.CONTENT_DIR || path.join(os.homedir(), 'Documents/PERSONAL WORK/2026/Ansa/Mitsubishi/Content/Mitsubishi 2026');
const CUTOUTS = {
	'2025-outlander-sport': 'Outlander_Sport_HEV/outlander_menu_cutout.png',
	triton: 'Triton/triton_menu_cutout.png',
	'xpander-cross': 'Xpander_Cross/xpander_menu_cutout.png',
};

/** Directus file id for a cutout — reuses a same-name, same-size upload. */
async function ensureCutout(relPath) {
	const abs = path.join(CONTENT_DIR, '02_Showroom_Models', relPath);
	const buf = fs.readFileSync(abs);
	// PNG IHDR colour type 6 = RGBA; anything else would bring the white box back
	if (buf[25] !== 6) throw new Error(`${relPath} is not an RGBA PNG (colour type ${buf[25]})`);
	const name = path.basename(abs);
	// SEARCH, not GET: a GET list read straight after an upload can come back stale here.
	const { data: found } = await api('SEARCH', '/files', {
		query: { filter: { filename_download: { _eq: name } }, fields: ['id', 'filesize'], sort: ['uploaded_on'], limit: -1 },
	});
	const existing = found.find((f) => Number(f.filesize) === buf.length);
	if (existing) return existing.id;
	const form = new FormData();
	form.append('title', path.basename(name, '.png'));
	form.append('file', new Blob([buf], { type: 'image/png' }), name);
	const res = await fetch(`${BASE}/files`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: form });
	const text = await res.text();
	if (!res.ok) throw new Error(`upload ${name} → ${res.status} ${text.slice(0, 300)}`);
	console.log(`+ ${name} uploaded`);
	return JSON.parse(text).data.id;
}

const { data: vehicles } = await api('SEARCH', '/items/vehicles', { query: { fields: ['id', 'slug', 'menu_image'], limit: -1 } });
for (const [slug, relPath] of Object.entries(CUTOUTS)) {
	const vehicle = vehicles.find((v) => v.slug === slug);
	if (!vehicle) throw new Error(`vehicle not found: ${slug}`);
	const fileId = await ensureCutout(relPath);
	if (vehicle.menu_image === fileId) {
		console.log(`= ${slug}: menu_image already ${path.basename(relPath)}`);
	} else {
		await api('PATCH', `/items/vehicles/${vehicle.id}`, { menu_image: fileId });
		console.log(`+ ${slug}: menu_image → ${path.basename(relPath)} (${fileId})`);
	}
}
