#!/usr/bin/env node
/**
 * upload-lifestyle-assets.mjs
 *
 * Client lifestyle photography for /showroom/[slug]: five official cuts per model (EX FRONT, EX BACK,
 * INTERIOR 1–3), optimised to WebP masters by scripts/optimize-lifestyle-images.py into
 * nuxt/public/images/models/<slug>/lifestyle/. The EX FRONT cut is also the showroom hero
 * (scripts/lib/hero-media.mjs → sync-vehicle-hero-media.mjs).
 *
 *   1. Schema: `vehicles.gallery` — a sortable files (M2M → directus_files) field through the
 *      `vehicles_gallery` junction — with public read on both. seed-permissions.py and
 *      apply-hybrid-vehicle-schema.js list them too, so a permissions reseed keeps them.
 *   2. Uploads every master into the model's Directus folder (deduplicated by filename_download:
 *      an existing upload of the same name is reused) and keeps its title + focal point current.
 *      Focal points ([x, y] in master pixels) sit on the vehicle / subject; the hero, highlight and
 *      gallery crops (object-position) and Directus `fit=cover` crops centre on them.
 *   3. Points the listed highlights (matched by vehicle + sort, checked against tagline) at their
 *      cut. Highlights not listed keep their image.
 *   4. Sets each vehicle's gallery to all five cuts, in CUTS order.
 *   5. Homepage "Brand Philosophy" value card → the Outlander Sport night-city EX FRONT, but only
 *      while it still shows the seeded headlight close-up (an image picked in Directus is kept).
 *   6. Clears the Directus data cache.
 *
 * Idempotent: every step checks current state first.
 *
 * Usage:  python3 scripts/optimize-lifestyle-images.py && node scripts/upload-lifestyle-assets.mjs
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MASTERS_DIR = path.join(HERE, '..', 'nuxt', 'public', 'images', 'models');

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

// SEARCH (query in the body) bypasses the stale GET cache seen on this instance (see contact-form.mjs).
const search = async (collection, query) => (await api('SEARCH', `/items/${collection}`, { query })).data;

// --- content ----------------------------------------------------------------
/** Gallery order; each master is nuxt/public/images/models/<slug>/lifestyle/<slug>-<cut>.webp. */
const CUTS = ['ex-front', 'ex-back', 'interior-1', 'interior-2', 'interior-3'];

/**
 * Per model: Directus folder, display name, each cut's title + focal point (master pixels,
 * 2047×1156) and the highlights to re-image (sort → { tagline, cut }).
 * Story-row mapping: exterior stance / utility → ex-back, cockpit & dash → interior-1,
 * infotainment → interior-2, seating & space → interior-3. Outlander Sport's interior-2 is a
 * shifter / auto-hold console close-up rather than the touchscreen, so its touchscreen row
 * (TECHNOLOGY, "Driver-Focused Digital Cockpit") takes interior-1, which shows the screen, and
 * interior-2 illustrates the "premium materials" INTERIOR row.
 */
const ASSETS = {
	'xpander-cross': {
		folder: 'Xpander Cross',
		name: 'Mitsubishi Xpander Cross',
		cuts: {
			'ex-front': { title: 'on a coastal road, front three-quarter', focal: [1120, 640] },
			'ex-back': { title: 'on a coastal road, rear three-quarter', focal: [840, 660] },
			'interior-1': { title: 'cockpit and horizontal dashboard', focal: [1200, 580] },
			'interior-2': { title: 'Smartphone-link Display Audio touchscreen', focal: [960, 480] },
			'interior-3': { title: 'three-row seating', focal: [1150, 680] },
		},
		highlights: {
			1: { tagline: 'VERSATILITY', cut: 'interior-3' },
			2: { tagline: 'INTERIOR', cut: 'interior-1' },
			3: { tagline: 'TECHNOLOGY', cut: 'interior-2' },
			6: { tagline: 'CAPABILITY', cut: 'ex-back' },
		},
	},
	triton: {
		folder: 'Triton',
		name: 'Mitsubishi Triton',
		cuts: {
			'ex-front': { title: 'on a forest trail, front three-quarter', focal: [1060, 640] },
			'ex-back': { title: 'on a forest trail, rear three-quarter', focal: [1080, 640] },
			'interior-1': { title: 'cockpit and dashboard', focal: [1230, 600] },
			'interior-2': { title: '9-inch Smartphone-link Display Audio touchscreen', focal: [1000, 500] },
			'interior-3': { title: 'double-cab seating', focal: [1100, 650] },
		},
		highlights: {
			3: { tagline: 'TECHNOLOGY', cut: 'interior-2' },
			4: { tagline: 'CAPABILITY', cut: 'interior-1' },
			5: { tagline: 'COMFORT', cut: 'interior-3' },
			6: { tagline: 'UTILITY', cut: 'ex-back' },
		},
	},
	'outlander-sport': {
		folder: 'Outlander Sport',
		name: 'Mitsubishi Outlander Sport HEV',
		cuts: {
			'ex-front': { title: 'on a city street at night, front three-quarter', focal: [1000, 640] },
			'ex-back': { title: 'on a city street at night, rear three-quarter', focal: [965, 620] },
			'interior-1': { title: 'digital cockpit and touchscreen', focal: [1500, 620] },
			'interior-2': { title: 'shift selector and electronic parking brake', focal: [870, 560] },
			'interior-3': { title: 'front and rear seating', focal: [1300, 640] },
		},
		highlights: {
			2: { tagline: 'DESIGN', cut: 'ex-back' },
			3: { tagline: 'INTERIOR', cut: 'interior-2' },
			4: { tagline: 'TECHNOLOGY', cut: 'interior-1' },
			5: { tagline: 'COMFORT', cut: 'interior-3' },
		},
	},
};

/** Homepage value card swapped to a lifestyle cut — only while it still shows `replaces`. */
const HOME_VALUE_SWAP = { headline: 'Brand Philosophy', replaces: 'xpander_front_shield.png', slug: 'outlander-sport', cut: 'ex-front' };

let changed = false;

// --- 1. schema --------------------------------------------------------------
if (await api('GET', '/collections/vehicles_gallery', undefined, { allowMissing: true })) {
	console.log('= vehicles_gallery junction exists');
} else {
	await api('POST', '/collections', {
		collection: 'vehicles_gallery',
		meta: { hidden: true, icon: 'import_export' },
		schema: {},
		fields: [{ field: 'id', type: 'integer', meta: { hidden: true }, schema: { is_primary_key: true, has_auto_increment: true } }],
	});
	for (const field of [
		{ field: 'vehicles_id', type: 'integer' },
		{ field: 'directus_files_id', type: 'uuid' },
		{ field: 'sort', type: 'integer' },
	]) {
		await api('POST', '/fields/vehicles_gallery', { ...field, meta: { hidden: true }, schema: {} });
	}
	console.log('+ vehicles_gallery junction created');
	changed = true;
}

if (await api('GET', '/fields/vehicles/gallery', undefined, { allowMissing: true })) {
	console.log('= vehicles.gallery field exists');
} else {
	await api('POST', '/fields/vehicles', {
		field: 'gallery',
		type: 'alias',
		meta: {
			interface: 'files',
			special: ['files'],
			width: 'full',
			note: 'Lifestyle photography for the showroom gallery strip, in display order (drag to reorder).',
		},
	});
	await api('POST', '/relations', {
		collection: 'vehicles_gallery',
		field: 'directus_files_id',
		related_collection: 'directus_files',
		meta: { junction_field: 'vehicles_id', one_deselect_action: 'nullify' },
		schema: { on_delete: 'SET NULL' },
	});
	await api('POST', '/relations', {
		collection: 'vehicles_gallery',
		field: 'vehicles_id',
		related_collection: 'vehicles',
		meta: { one_field: 'gallery', junction_field: 'directus_files_id', sort_field: 'sort', one_deselect_action: 'delete' },
		schema: { on_delete: 'SET NULL' },
	});
	console.log('+ vehicles.gallery field + relations created');
	changed = true;
}

// --- public read --------------------------------------------------------------
const { data: policies } = await api('GET', '/policies?fields=id,name&limit=-1');
const publicPolicy = policies.find((p) => p.name === '$t:public_label' || /public/i.test(p.name ?? ''));
if (!publicPolicy) throw new Error('public policy not found');

const publicRead = async (collection) =>
	(
		await api('SEARCH', '/permissions', {
			query: {
				filter: { policy: { _eq: publicPolicy.id }, collection: { _eq: collection }, action: { _eq: 'read' } },
				fields: ['id', 'fields'],
				limit: 1,
			},
		})
	).data[0];

const vehiclesPerm = await publicRead('vehicles');
if (!vehiclesPerm) throw new Error('public vehicles read permission not found — run seed-permissions.py first');
const granted = vehiclesPerm.fields ?? [];
if (granted.includes('*') || granted.includes('gallery')) {
	console.log('= public read on vehicles.gallery already granted');
} else {
	await api('PATCH', `/permissions/${vehiclesPerm.id}`, { fields: [...granted, 'gallery'] });
	console.log('+ public read granted on vehicles.gallery');
	changed = true;
}
if (await publicRead('vehicles_gallery')) {
	console.log('= public read on vehicles_gallery already granted');
} else {
	await api('POST', '/permissions', { policy: publicPolicy.id, collection: 'vehicles_gallery', action: 'read', fields: ['*'], permissions: {} });
	console.log('+ public read granted on vehicles_gallery');
	changed = true;
}

// --- 2. uploads ---------------------------------------------------------------
const { data: folders } = await api('GET', '/folders?fields=id,name&limit=-1');

/**
 * Directus file id for a lifestyle master — reuses an existing upload with the same filename and
 * keeps its title, folder and focal point current.
 */
async function ensureFile(slug, cut) {
	const spec = ASSETS[slug];
	const { title: caption, focal } = spec.cuts[cut];
	const name = `${slug}-${cut}.webp`;
	const abs = path.join(MASTERS_DIR, slug, 'lifestyle', name);
	const title = `${spec.name} ${caption}`;
	const folderId = folders.find((f) => f.name === spec.folder)?.id ?? null;
	const wanted = { title, focal_point_x: focal[0], focal_point_y: focal[1], ...(folderId && { folder: folderId }) };

	const found = await api('SEARCH', '/files', {
		query: { filter: { filename_download: { _eq: name } }, fields: ['id', ...Object.keys(wanted)], sort: ['uploaded_on'], limit: 1 },
	});
	const existing = found.data[0];
	if (existing) {
		const patch = Object.fromEntries(Object.entries(wanted).filter(([key, value]) => existing[key] !== value));
		if (Object.keys(patch).length) {
			await api('PATCH', `/files/${existing.id}`, patch);
			console.log(`~ ${name}: ${Object.keys(patch).join(', ')} updated`);
			changed = true;
		}
		return existing.id;
	}

	if (!fs.existsSync(abs)) throw new Error(`${abs} missing — run scripts/optimize-lifestyle-images.py first`);
	const form = new FormData();
	form.append('title', title);
	form.append('file', new Blob([fs.readFileSync(abs)], { type: 'image/webp' }), name);
	const res = await fetch(`${BASE}/files`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: form });
	const text = await res.text();
	if (!res.ok) throw new Error(`upload ${name} → ${res.status} ${text.slice(0, 300)}`);
	const id = JSON.parse(text).data.id;
	// This build ignores `folder` (and focal points) in the upload form — set them with a follow-up PATCH.
	await api('PATCH', `/files/${id}`, wanted);
	console.log(`+ ${name} uploaded`);
	changed = true;
	return id;
}

const { data: vehicles } = await api('SEARCH', '/items/vehicles', { query: { fields: ['id', 'slug'], limit: -1 } });

for (const [slug, spec] of Object.entries(ASSETS)) {
	const vehicle = vehicles.find((v) => v.slug === slug);
	if (!vehicle) throw new Error(`vehicle not found: ${slug}`);

	const fileIds = {};
	for (const cut of CUTS) fileIds[cut] = await ensureFile(slug, cut);

	// --- 3. highlight images ----------------------------------------------------
	const rows = await search('block_content_items', {
		filter: { vehicle: { _eq: vehicle.id } },
		fields: ['id', 'sort', 'tagline'],
		limit: -1,
	});
	for (const [sort, { tagline, cut }] of Object.entries(spec.highlights)) {
		const row = rows.find((r) => r.sort === Number(sort));
		if (!row || row.tagline !== tagline) {
			throw new Error(`${slug}: highlight #${sort} is "${row?.tagline}", expected "${tagline}" — check vehicle-content-blocks.mjs`);
		}
		const fileId = fileIds[cut];
		const junctions = await search('block_content_items_files', {
			filter: { block_content_items_id: { _eq: row.id } },
			fields: ['id', 'directus_files_id'],
			limit: -1,
		});
		if (junctions.length === 1 && junctions[0].directus_files_id === fileId) {
			console.log(`= ${slug} highlight #${sort} ${tagline}: ${cut}`);
			continue;
		}
		// M2M writes through the parent are unreliable on this build — manage the junction rows directly.
		for (const j of junctions) await api('DELETE', `/items/block_content_items_files/${j.id}`);
		await api('POST', '/items/block_content_items_files', { block_content_items_id: row.id, directus_files_id: fileId });
		console.log(`+ ${slug} highlight #${sort} ${tagline} → ${cut}`);
		changed = true;
	}

	// --- 4. gallery ---------------------------------------------------------------
	const wanted = CUTS.map((cut) => fileIds[cut]);
	const current = await search('vehicles_gallery', {
		filter: { vehicles_id: { _eq: vehicle.id } },
		fields: ['id', 'directus_files_id', 'sort'],
		sort: ['sort'],
		limit: -1,
	});
	if (JSON.stringify(current.map((j) => j.directus_files_id)) === JSON.stringify(wanted)) {
		console.log(`= ${slug} gallery: ${wanted.length} images`);
		continue;
	}
	for (const j of current) await api('DELETE', `/items/vehicles_gallery/${j.id}`);
	await api(
		'POST',
		'/items/vehicles_gallery',
		wanted.map((fileId, index) => ({ vehicles_id: vehicle.id, directus_files_id: fileId, sort: index + 1 })),
	);
	console.log(`+ ${slug} gallery → ${wanted.length} images`);
	changed = true;
}

// --- 5. homepage value card -------------------------------------------------------
{
	const { headline, replaces, slug, cut } = HOME_VALUE_SWAP;
	const [card] = await search('block_content_items', {
		filter: { headline: { _eq: headline }, vehicle: { _null: true } },
		fields: ['id', 'images.id', 'images.directus_files_id.id', 'images.directus_files_id.filename_download'],
		limit: 1,
	});
	const fileId = await ensureFile(slug, cut);
	const current = card?.images ?? [];
	if (!card) {
		console.log(`! homepage "${headline}" card not found — run directus/seeds/homepage-blocks.mjs`);
	} else if (current.length === 1 && current[0].directus_files_id?.id === fileId) {
		console.log(`= homepage "${headline}": ${slug}-${cut}`);
	} else if (current.length && !current.some((j) => j.directus_files_id?.filename_download === replaces)) {
		console.log(`= homepage "${headline}": keeps its Directus-picked image`);
	} else {
		for (const j of current) await api('DELETE', `/items/block_content_items_files/${j.id}`);
		await api('POST', '/items/block_content_items_files', { block_content_items_id: card.id, directus_files_id: fileId });
		console.log(`+ homepage "${headline}" → ${slug}-${cut}`);
		changed = true;
	}
}

// --- 6. cache ---------------------------------------------------------------------
// This instance serves stale GET reads after writes (see contact-form.mjs); the Nuxt API reads via GET.
if (changed) {
	await api('POST', '/utils/cache/clear');
	console.log('~ Directus data cache cleared');
}
