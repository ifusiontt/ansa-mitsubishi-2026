#!/usr/bin/env node
/**
 * upload-lifestyle-assets.mjs
 *
 * Lifestyle photography for /showroom/[slug]: replaces the letterboxed white-studio highlight images
 * with full-bleed press / video-frame photography and fills the vehicle gallery strip
 * (nuxt/app/components/showroom/VehicleGalleryStrip.vue).
 *
 *   1. Schema: `vehicles.gallery` — a sortable files (M2M → directus_files) field through the
 *      `vehicles_gallery` junction — with public read on both. seed-permissions.py and
 *      apply-hybrid-vehicle-schema.js list them too, so a permissions reseed keeps them.
 *   2. Uploads every image in ASSETS from the content library (deduplicated by filename_download:
 *      an existing upload of the same name is reused) into the model's Directus folder.
 *   3. Points the listed highlights (matched by vehicle + sort, checked against tagline) at their
 *      new image. Highlights not listed keep their image — e.g. the Xpander Cross story rows,
 *      which already show matching 2026 cabin photography.
 *   4. Sets each vehicle's gallery to its remaining frames, in order — no image appears twice on
 *      a page (highlights + gallery).
 *   5. Clears the Directus data cache.
 *
 * Curation rules: Xpander Cross uses genuine Xpander Cross imagery only (cladding / roof rails —
 * the standard-Xpander glamour and grille shots are excluded); Outlander Sport uses regional Xforce
 * imagery only (the Xpander Cross "SlippyCorner" frame filed under Outlander_Sport_HEV is excluded),
 * and duplicate exports of one photo are used once. Pillars are tall portrait crops, so they take
 * frames whose subject sits near the centre.
 *
 * Idempotent: every step checks current state first.
 *
 * Usage:  node scripts/upload-lifestyle-assets.mjs
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
const CONTENT_DIR =
	process.env.CONTENT_DIR || path.join(os.homedir(), 'Documents/PERSONAL WORK/2026/Ansa/Mitsubishi/Content/Mitsubishi 2026');
const MODELS_DIR = path.join(CONTENT_DIR, '02_Showroom_Models');

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
/**
 * Per model: its content-library folder, Directus folder, the highlights to re-image
 * (sort → { tagline, file }) and the gallery frames in display order. Paths are relative
 * to the model's content-library folder.
 */
const ASSETS = {
	'xpander-cross': {
		dir: 'Xpander_Cross',
		folder: 'Xpander Cross',
		highlights: {
			4: { tagline: 'COMFORT', file: 'Extracted from video/xpander_hero_forest.png' },
			5: { tagline: 'SAFETY', file: 'Extracted from video/xpander_front_shield.png' },
			6: { tagline: 'CAPABILITY', file: 'Extracted from video/xpander_ground_clearance.png' },
		},
		gallery: [
			'22MY_XS_RHD_MV_SlippyCorner-1536x1024 (1).jpg',
			'Extracted from video/xpander_headlight_led.png',
			'3-column/2023-xpander-cross-glamour2-1024x682.jpg',
			'Extracted from video/xpander_taillight_led.png',
		],
	},
	'outlander-sport': {
		dir: 'Outlander_Sport_HEV',
		folder: 'Outlander Sport',
		highlights: {
			// Story rows: the HYBRID badge close-up and the white-background rear cutout
			1: { tagline: 'PERFORMANCE', file: 'Extracted from video/outlander_hero_banner.png' },
			2: { tagline: 'DESIGN', file: '2025-outlander-sport-glamour-1-2048x1447.webp' },
			4: { tagline: 'TECHNOLOGY', file: 'Extracted from video/outlander_drive_mode_macro.png' },
			5: { tagline: 'COMFORT', file: '3-column/2025-outlander-sport-glamour-4-1024x640.webp' },
			6: { tagline: 'HANDLING', file: 'features/2025-outlander-sport-glamour-5.webp' },
		},
		gallery: [
			// Aerial frame with the car off-centre: keeps it in view on the wide 16:10 gallery crop
			'Extracted from video/outlander_asc_curve_clean.png',
			'features/2025-outlander-sport-glamour-3.webp',
			'Extracted from video/outlander_steering_badge.png',
			'3-column/2025-outlander-sport-glamour-2-1024x640.webp',
			'Extracted from video/outlander_rear_taillights.png',
		],
	},
	triton: {
		dir: 'Triton',
		folder: 'Triton',
		// All-new (24MY+) imagery only: the 2023-l200-* frames in features/ are the previous generation.
		// The 3-column/ press shots are WebP files with a .png name (see sniffMime).
		highlights: {
			1: { tagline: 'PERFORMANCE', file: 'Extracted from video/triton_mud_headon.png' },
			2: { tagline: 'POWER', file: 'Extracted from video/triton_dune_drift.png' },
			4: { tagline: 'CAPABILITY', file: '3-column/24MY_TR_ALL-NEW_RHD_MV_Cockpit_proxy.png' },
			5: { tagline: 'COMFORT', file: '3-column/24MY_TR_ALL-NEW_RHD_FT_Seatcomfort_proxy.png' },
			6: { tagline: 'UTILITY', file: '3-column/24MY_TR_ALL-NEW_RHD_MV_Cargo_proxy-1.png' },
		},
		gallery: [
			'Extracted from video/triton_water_splash.png',
			'features/24MY_TR_ALL-NEW_LHD_FT_Selector_proxy.webp',
			'3-column/24MY_TR_ALL-NEW_RHD_MV_Hill_proxy.png',
			'Extracted from video/triton_red_ridge.png',
			'Extracted from video/triton_sunset_flats.png',
		],
	},
};

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
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
/** Content type from the file's magic bytes — some library exports carry the wrong extension. */
function sniffMime(buf, name) {
	if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
	if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'image/png';
	if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
	return MIME[path.extname(name).toLowerCase()] ?? 'application/octet-stream';
}
const { data: folders } = await api('GET', '/folders?fields=id,name&limit=-1');

/** Directus file id for a content-library image — reuses an existing upload with the same filename. */
async function ensureFile(dir, relPath, folderName) {
	const abs = path.join(MODELS_DIR, dir, relPath);
	const name = path.basename(abs);
	const found = await api('SEARCH', '/files', {
		query: { filter: { filename_download: { _eq: name } }, fields: ['id'], sort: ['uploaded_on'], limit: 1 },
	});
	if (found.data[0]) return found.data[0].id;

	const buf = fs.readFileSync(abs);
	const form = new FormData();
	form.append('title', path.basename(name, path.extname(name)));
	form.append('file', new Blob([buf], { type: sniffMime(buf, name) }), name);
	const res = await fetch(`${BASE}/files`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: form });
	const text = await res.text();
	if (!res.ok) throw new Error(`upload ${name} → ${res.status} ${text.slice(0, 300)}`);
	const id = JSON.parse(text).data.id;
	// This build ignores `folder` in the upload form — set it with a follow-up PATCH (as seed-outlander-vehicle.mjs does).
	const folder = folders.find((f) => f.name === folderName);
	if (folder) await api('PATCH', `/files/${id}`, { folder: folder.id });
	console.log(`+ ${name} uploaded`);
	changed = true;
	return id;
}

const { data: vehicles } = await api('SEARCH', '/items/vehicles', { query: { fields: ['id', 'slug'], limit: -1 } });

for (const [slug, spec] of Object.entries(ASSETS)) {
	const vehicle = vehicles.find((v) => v.slug === slug);
	if (!vehicle) throw new Error(`vehicle not found: ${slug}`);

	// --- 3. highlight images ----------------------------------------------------
	const rows = await search('block_content_items', {
		filter: { vehicle: { _eq: vehicle.id } },
		fields: ['id', 'sort', 'tagline'],
		limit: -1,
	});
	for (const [sort, { tagline, file }] of Object.entries(spec.highlights)) {
		const row = rows.find((r) => r.sort === Number(sort));
		if (!row || row.tagline !== tagline) {
			throw new Error(`${slug}: highlight #${sort} is "${row?.tagline}", expected "${tagline}" — check vehicle-content-blocks.mjs`);
		}
		const fileId = await ensureFile(spec.dir, file, spec.folder);
		const junctions = await search('block_content_items_files', {
			filter: { block_content_items_id: { _eq: row.id } },
			fields: ['id', 'directus_files_id'],
			limit: -1,
		});
		if (junctions.length === 1 && junctions[0].directus_files_id === fileId) {
			console.log(`= ${slug} highlight #${sort} ${tagline}: ${path.basename(file)}`);
			continue;
		}
		// M2M writes through the parent are unreliable on this build — manage the junction rows directly.
		for (const j of junctions) await api('DELETE', `/items/block_content_items_files/${j.id}`);
		await api('POST', '/items/block_content_items_files', { block_content_items_id: row.id, directus_files_id: fileId });
		console.log(`+ ${slug} highlight #${sort} ${tagline} → ${path.basename(file)}`);
		changed = true;
	}

	// --- 4. gallery ---------------------------------------------------------------
	const wanted = [];
	for (const file of spec.gallery) wanted.push(await ensureFile(spec.dir, file, spec.folder));
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

// --- 5. cache ---------------------------------------------------------------------
// This instance serves stale GET reads after writes (see contact-form.mjs); the Nuxt API reads via GET.
if (changed) {
	await api('POST', '/utils/cache/clear');
	console.log('~ Directus data cache cleared');
}
