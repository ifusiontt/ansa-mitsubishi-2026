#!/usr/bin/env node
/**
 * seed-outlander-vehicle.mjs
 *
 * Populates the "Mitsubishi Outlander Sport" vehicle entry (slug: 2025-outlander-sport)
 * in Directus with media, colors, highlights, and trim corrections.
 *
 * Source assets:
 *   content-raw/optimized/02_Showroom_Models/Outlander_Sport_HEV/
 *     ├── 2_Tone_Front_Left/   (5 paint variants × jpg/webp/mid-res)
 *     ├── Exterior/            (5 paint variants + 8 showroom DSC photos)
 *     ├── Interior/            (press interior + BKZ showroom shots)
 *     └── Mono_Tone_Front_Left/(6 paint variants × jpg/webp/mid-res)
 *
 * Paint-code mapping (verified via HSV dominant-color analysis of the renders):
 *   W85 = white (65% white px)   Y37 = yellow/gold (13% yellow px)
 *   U28/X37 = black/charcoal     JH3 = dark two-tone   X8W = white two-tone
 *   DSC showroom photos = the only imagery with genuine blue pixels
 *   (the vehicle's primary color is Octane Blue #003399)
 *
 * Idempotent: safe to re-run. Files are matched by (folder, filename_download),
 * colors by (vehicle, color_name), highlights by (vehicle, sort), the parent
 * content block by tagline, and trims are patched only when the name differs.
 *
 * Usage:  node scripts/seed-outlander-vehicle.mjs
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------

function loadToken() {
	const envTok = process.env.DIRECTUS_TOKEN;
	if (envTok) return envTok;
	const envFile = path.join(ROOT, 'directus', '.env');
	const m = fs.readFileSync(envFile, 'utf8').match(/^ADMIN_TOKEN=(.*)$/m);
	if (!m) {
		console.error('ERROR: no token — set DIRECTUS_TOKEN or ADMIN_TOKEN in directus/.env');
		process.exit(1);
	}
	return m[1].trim();
}

const TOKEN = loadToken();
const BASE = process.env.DIRECTUS_URL || 'http://localhost:8055';
const H = { Authorization: `Bearer ${TOKEN}` };

const VEHICLE_SLUG = '2025-outlander-sport';
const FOLDER_NAME = 'Outlander Sport';
const ASSET_ROOT = path.join(
	ROOT,
	'content-raw/optimized/02_Showroom_Models/Outlander_Sport_HEV',
);
const ASSET_FOLDERS = ['2_Tone_Front_Left', 'Exterior', 'Interior', 'Mono_Tone_Front_Left'];
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const MIME = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
};

/** rel paths (under Outlander_Sport_HEV/) of the images used for records */
const PICKS = {
	hero: 'Exterior/DSC04357_Mitsubishi Outlander Sport_Front_Level.webp',
	colors: {
		'Octane Blue': 'Exterior/DSC04370_Mitsubishi Outlander Sport_QTR Front_Low.webp',
		'Energetic Yellow': 'Mono_Tone_Front_Left/26MY_XFH_THA_P_front-left_Y37_v2_Mid-Resolution-JPEG-rev-1.jpeg',
		'Diamond White': 'Exterior/26MY_XFH_THA_P2_front-left_W85_Mid-Resolution-JPEG-rev-1.jpeg',
		'Black Two-Tone': '2_Tone_Front_Left/26MY_XFH_THA_P_2tone_front-left_JH3_v2_Mid-Resolution-JPEG-rev-1.jpeg',
	},
	highlights: {
		1: 'Exterior/DSC04390_Mitsubishi Outlander Sport_HEV_closeup.webp',
		2: 'Exterior/DSC04357_Mitsubishi Outlander Sport_Back Qtr_Level_1.webp',
		3: 'Interior/26MY_XFH_THA_H_MC21_black_instrument-panel_Mid-Resolution-JPEG-rev-1.jpeg',
	},
};

/** colors that must exist on the vehicle (idempotent by name) */
const COLORS = [
	{ sort: 1, color_name: 'Octane Blue', hex_code: '#003399' },
	{ sort: 2, color_name: 'Energetic Yellow', hex_code: '#E5C100' },
	{ sort: 3, color_name: 'Diamond White', hex_code: '#FFFFFF' },
	{ sort: 4, color_name: 'Black Two-Tone', hex_code: '#1A1A1A' },
];

/** highlight copy — exact task spec (headline rendered uppercase by the frontend CSS) */
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

/** trim renames: id → new name (ids are stable from mitsubishi-initial-data.json) */
const TRIM_RENAMES = { 15: 'SE S-AWC', 16: 'SEL Premium S-AWC' };

const BLOCK_TAGLINE = 'Outlander Key Highlights';

// Local state for uploaded file ids. Needed because this Directus build 403s
// GET /items/directus_files for every role (including admin), so file-existence
// checks via the items API are unreliable. The state file is the source of
// truth for "already uploaded"; the API check remains a best-effort fallback.
const STATE_FILE = path.join(__dirname, '.seed-outlander-assets.json');
// state shape: { "<relpath>": { id, folderPatched } } (legacy string values migrate)
let assetState = {};
try {
	const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
	for (const [k, v] of Object.entries(raw)) {
		assetState[k] = typeof v === 'string' ? { id: v, folderPatched: false } : v;
	}
} catch {}
function saveState() {
	fs.writeFileSync(STATE_FILE, JSON.stringify(assetState, null, '\t'));
}

// this build ignores the `folder` form field on upload, so the folder is set
// with a follow-up PATCH /files/:id (PATCH /items/directus_files 403s for all roles)
let FOLDER_ID = null;
async function assignFolder(fileId) {
	await api('PATCH', `/files/${fileId}`, { folder: FOLDER_ID });
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function api(method, p, body) {
	const res = await fetch(BASE + p, {
		method,
		headers: body ? { ...H, 'Content-Type': 'application/json' } : { ...H },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	let data = null;
	try {
		data = await res.json();
	} catch {}
	if (!res.ok) {
		throw new Error(`${method} ${p} → ${res.status}: ${JSON.stringify(data)?.slice(0, 300)}`);
	}
	return data;
}

async function uploadFile(absPath, folderId) {
	const name = path.basename(absPath);
	const ext = path.extname(name).toLowerCase();
	const buf = fs.readFileSync(absPath);
	const fd = new FormData();
	fd.append('file', new Blob([buf], { type: MIME[ext] }), name);
	fd.append('folder', folderId);
	fd.append('title', path.basename(name, ext));
	const res = await fetch(`${BASE}/files`, { method: 'POST', headers: H, body: fd });
	const data = await res.json();
	if (!res.ok) throw new Error(`upload ${name} → ${res.status}: ${JSON.stringify(data)?.slice(0, 300)}`);
	return data.data?.id ?? data.id;
}

// ---------------------------------------------------------------------------
// step 0 — resolve vehicle
// ---------------------------------------------------------------------------

const vehicles = await api('GET', `/items/vehicles?filter[slug][_eq]=${VEHICLE_SLUG}&fields=id,title,hero_block`);
const vehicle = vehicles.data?.[0];
if (!vehicle) {
	console.error(`ERROR: vehicle with slug ${VEHICLE_SLUG} not found`);
	process.exit(1);
}
console.log(`vehicle: #${vehicle.id} ${vehicle.title} (hero_block: ${vehicle.hero_block})`);

// ---------------------------------------------------------------------------
// step 1 — folder "Outlander Sport"
// ---------------------------------------------------------------------------

let folders = await api('GET', `/folders?filter[name][_eq]=${encodeURIComponent(FOLDER_NAME)}&fields=id,name`);
let folder = folders.data?.[0];
if (!folder) {
	const created = await api('POST', '/folders', { name: FOLDER_NAME });
	folder = created.data;
	console.log(`folder: created "${FOLDER_NAME}" (${folder.id})`);
} else {
	console.log(`folder: reusing "${FOLDER_NAME}" (${folder.id})`);
}
FOLDER_ID = folder.id;

// ---------------------------------------------------------------------------
// step 2 — upload assets (idempotent by folder + filename)
// ---------------------------------------------------------------------------

const files = []; // { rel, name, id }
for (const sub of ASSET_FOLDERS) {
	const dir = path.join(ASSET_ROOT, sub);
	for (const name of fs.readdirSync(dir).sort()) {
		if (!IMAGE_EXT.has(path.extname(name).toLowerCase())) continue;
		const relPath = path.join(sub, name);
		const known = assetState[relPath];
		if (known) {
			files.push({ rel: relPath, name, id: known.id, uploaded: false });
			if (!known.folderPatched) {
				await assignFolder(known.id);
				known.folderPatched = true;
				saveState();
			}
			continue;
		}
		// best-effort check (403 on this build → treated as "not found")
		try {
			const existing = await api(
				'GET',
				`/items/directus_files?filter[filename_download][_eq]=${encodeURIComponent(name)}&filter[folder][_eq]=${folder.id}&fields=id`,
				);
			if (existing.data?.length) {
				const prevId = existing.data[0].id;
				assetState[relPath] = { id: prevId, folderPatched: false };
				files.push({ rel: relPath, name, id: prevId, uploaded: false });
				await assignFolder(prevId);
				assetState[relPath].folderPatched = true;
				saveState();
				continue;
			}
		} catch {
			/* fall through to upload */
		}
		const id = await uploadFile(path.join(dir, name), folder.id);
		await assignFolder(id);
		assetState[relPath] = { id, folderPatched: true };
		saveState();
		files.push({ rel: relPath, name, id, uploaded: true });
	}
}
const uploadedCount = files.filter((f) => f.uploaded).length;
console.log(`files: ${files.length} total, ${uploadedCount} uploaded, ${files.length - uploadedCount} reused`);

const fileByRel = (relPath) => {
	const f = files.find((x) => x.rel === relPath);
	if (!f) throw new Error(`selected asset missing: ${relPath}`);
	return f.id;
};

// ---------------------------------------------------------------------------
// step 3 — colors (upsert by name, set sort + image)
// ---------------------------------------------------------------------------

const existingColors = await api('GET', `/items/vehicle_colors?filter[vehicle_id][_eq]=${vehicle.id}&fields=id,sort,color_name,hex_code,image`);
const colorByName = new Map(existingColors.data.map((c) => [c.color_name, c]));
for (const spec of COLORS) {
	const imgId = fileByRel(PICKS.colors[spec.color_name]);
	const current = colorByName.get(spec.color_name);
	const payload = {
		vehicle_id: vehicle.id,
		sort: spec.sort,
		color_name: spec.color_name,
		hex_code: spec.hex_code,
		image: imgId,
	};
	if (current) {
		const changed =
			current.sort !== spec.sort ||
			current.hex_code !== spec.hex_code ||
			(String(current.image ?? '') !== imgId);
		if (changed) {
			await api('PATCH', `/items/vehicle_colors/${current.id}`, payload);
			console.log(`color: updated "${spec.color_name}" (#${current.id}) → image ${imgId.slice(0, 8)}..`);
		} else {
			console.log(`color: ok "${spec.color_name}" (#${current.id})`);
		}
	} else {
		const created = await api('POST', '/items/vehicle_colors', payload);
		console.log(`color: created "${spec.color_name}" (#${created.data?.id ?? created.id})`);
	}
}

// ---------------------------------------------------------------------------
// step 4 — highlight parent block (block_content_block) + highlight items
// ---------------------------------------------------------------------------

let blocks = await api('GET', `/items/block_content_block?filter[tagline][_eq]=${encodeURIComponent(BLOCK_TAGLINE)}&fields=id`);
let block = blocks.data?.[0];
if (!block) {
	const created = await api('POST', '/items/block_content_block', {
		tagline: BLOCK_TAGLINE,
		template: 'content_block',
		variant: 'one_long',
		container_width: 'contained',
	});
	block = created.data;
	console.log(`block: created "${BLOCK_TAGLINE}" (${block.id})`);
} else {
	console.log(`block: reusing "${BLOCK_TAGLINE}" (${block.id})`);
}

const items = await api(
	'GET',
	`/items/block_content_items?filter[vehicle][_eq]=${vehicle.id}&fields=id,sort,tagline,headline,description,item&sort=sort`,
);
if (items.data.length !== HIGHLIGHTS.length) {
	console.error(`ERROR: expected ${HIGHLIGHTS.length} highlight rows for vehicle, found ${items.data.length}`);
	process.exit(1);
}
// NOTE (this Directus build): M2M fields expand to JUNCTION ROWS, not related
// items. `images: [fileUuid]` is misread as a junction PK (500), and the
// replace-semantics are unreliable (stray rows with NULL FKs survive).
// Strategy: manage the junction explicitly — compare via
// `images.directus_files_id.*`, delete stale rows via /items/block_content_items_files,
// then PATCH content (without images) and link the file as a junction object
// with explicit FKs. Deterministic and idempotent.
for (const spec of HIGHLIGHTS) {
	const row = items.data.find((r) => r.sort === spec.sort) ?? items.data[spec.sort - 1];
	const imgId = fileByRel(PICKS.highlights[spec.sort]);

	// current junction rows for this item (full objects incl. file FK)
	const junctions = await api(
		'GET',
		`/items/block_content_items_files?filter[block_content_items_id][_eq]=${row.id}&fields=id,directus_files_id`,
	);
	const currentFileIds = new Set((junctions.data ?? []).map((j) => j.directus_files_id));
	const wantOnly = currentFileIds.size === 1 && currentFileIds.has(imgId);

	const contentChanged =
		row.tagline !== spec.tagline ||
		row.headline !== spec.headline ||
		row.description !== spec.description ||
		String(row.item ?? '') !== block.id;

	if (wantOnly && !contentChanged) {
		console.log(`highlight: ok #${row.sort} "${spec.tagline}"`);
		continue;
	}

	if (!wantOnly) {
		// drop stale junction rows for this item
		for (const j of junctions.data ?? []) {
			await api('DELETE', `/items/block_content_items_files/${j.id}`);
		}
		// this build can leave junction rows with a NULL item FK — purge any that
		// reference one of this vehicle's highlight files
		const stray = await api(
			'GET',
			`/items/block_content_items_files?filter[block_content_items_id][_null]=true&fields=id,directus_files_id`,
		);
		const highlightFileIds = new Set(Object.values(PICKS.highlights).map((r) => fileByRel(r)));
		for (const j of stray.data ?? []) {
			if (highlightFileIds.has(j.directus_files_id)) {
				await api('DELETE', `/items/block_content_items_files/${j.id}`);
			}
		}
	}
	await api('PATCH', `/items/block_content_items/${row.id}`, {
		vehicle: vehicle.id,
		sort: spec.sort,
		status: 'published',
		tagline: spec.tagline,
		headline: spec.headline,
		description: spec.description,
		item: block.id,
	});
	if (!wantOnly) {
		await api('PATCH', `/items/block_content_items/${row.id}`, {
		images: [{ block_content_items_id: row.id, directus_files_id: imgId }],
	});
	}
	console.log(`highlight: updated #${row.sort} "${spec.tagline}"${wantOnly ? '' : ` → image ${imgId.slice(0, 8)}..`} + item ${block.id.slice(0, 8)}..`);
}

// ---------------------------------------------------------------------------
// step 5 — trim renames (ES stays; LE → SE S-AWC, SEL → SEL Premium S-AWC)
// ---------------------------------------------------------------------------

for (const [id, newName] of Object.entries(TRIM_RENAMES)) {
	const trims = await api('GET', `/items/vehicle_trims?filter[id][_eq]=${id}&fields=id,trim_name,vehicle`);
	const trim = trims.data?.[0];
	if (!trim) {
		console.error(`ERROR: trim #${id} not found`);
		process.exit(1);
	}
	if (trim.trim_name === newName) {
		console.log(`trim: ok #${id} "${trim.trim_name}"`);
	} else {
		await api('PATCH', `/items/vehicle_trims/${id}`, { trim_name: newName });
		console.log(`trim: renamed #${id} "${trim.trim_name}" → "${newName}"`);
	}
}

// ---------------------------------------------------------------------------
// step 6 — hero media (replace placeholder with real exterior photography)
// ---------------------------------------------------------------------------

if (vehicle.hero_block) {
	const heroImgId = fileByRel(PICKS.hero);
	await api('PATCH', `/items/block_hero_custom/${vehicle.hero_block}`, { media: heroImgId });
	console.log(`hero: media → ${heroImgId.slice(0, 8)}.. (${PICKS.hero})`);
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

console.log('\n── summary ─────────────────────────────────────────────');
console.log(`vehicle slug      : ${VEHICLE_SLUG} (id ${vehicle.id})`);
console.log(`folder            : ${FOLDER_NAME} (${folder.id})`);
console.log(`files             : ${files.length} in folder (${uploadedCount} new)`);
console.log(`colors            : ${COLORS.length} (with exterior images)`);
console.log(`highlights        : ${HIGHLIGHTS.length} (copy + images + parent block)`);
console.log(`trims             : ES / SE S-AWC / SEL Premium S-AWC`);
console.log(`hero media        : ${PICKS.hero}`);
console.log('sample asset URL  : ' + `${BASE}/assets/${files[0].id}`);
console.log('DONE');
