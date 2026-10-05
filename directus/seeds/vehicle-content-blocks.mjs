#!/usr/bin/env node
/**
 * vehicle-content-blocks.mjs
 *
 * Alternating feature rows for /showroom/[slug] (VehicleHighlights.vue, rendered
 * below the colour configurator):
 *
 *   1. One block_content_block per vehicle — tagline "<Model> Features",
 *      template `services_list`, variant `services_alternating`. The variant is
 *      what the showroom page uses to tell these feature rows apart from the
 *      existing 3-up highlight panels (Part 3), which share `vehicles.highlights`.
 *   2. Child block_content_items with `item` → that block and `vehicle` → the vehicle,
 *      so they arrive through the existing `vehicles.highlights` O2M.
 *   3. One image per item, matched against files already in Directus (the vehicle's
 *      folder, or filenames mentioning the model) by keyword. Nothing is uploaded;
 *      the picked file is printed, and items without a match are left imageless.
 *
 * Idempotent and create-only: blocks are matched by tagline, items by
 * (vehicle, headline); an item that already has an image keeps it.
 *
 * Usage:  node directus/seeds/vehicle-content-blocks.mjs
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

async function api(method, urlPath, body) {
	const res = await fetch(BASE + urlPath, {
		method,
		headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`${method} ${urlPath} → ${res.status} ${text.slice(0, 300)}`);
	return text ? JSON.parse(text) : null;
}

// SEARCH (query in the body) bypasses the stale GET cache seen on this instance (see contact-form.mjs).
const search = async (collection, query) => (await api('SEARCH', `/items/${collection}`, { query })).data;
// /files is read via GET with a cache-buster, as in vehicle-colors.mjs.
const getAll = async (urlPath) => (await api('GET', `${urlPath}&limit=-1&cache=false&x=${Date.now()}`)).data;

// --- content ----------------------------------------------------------------
// `terms` pick the image: the first term (in order) found in a candidate file's
// name/title wins. `keywords` scope candidate files to the vehicle.
const VEHICLES = [
	{
		slug: '2025-outlander-sport',
		label: 'Outlander Sport',
		keywords: ['outlander', 'xfh'],
		items: [
			{
				tagline: 'TECHNOLOGY',
				headline: 'Driver-Focused Digital Cockpit',
				description: '8-inch SDA touchscreen with Apple CarPlay & Android Auto integration.',
				terms: ['navi', 'audio', 'instrument panel', 'dashboard', 'cockpit'],
			},
			{
				tagline: 'COMFORT',
				headline: 'Ergonomic Seating & Space',
				description: 'Heat Guard synthetic leather seats engineered for tropical climate comfort.',
				terms: ['seat arrangement', 'seat', 'seating'],
			},
			{
				tagline: 'HANDLING',
				headline: 'Active Yaw Control (AYC)',
				description: 'Monitors cornering force and applies brake vectoring for optimal road traction.',
				terms: ['ayc', 'yaw', 'chassis'],
			},
		],
	},
	{
		slug: 'triton',
		label: 'Triton',
		keywords: ['triton'],
		items: [
			{
				tagline: 'CAPABILITY',
				headline: 'Heavy-Duty Cockpit',
				description: 'Driver-centric layout with high-visibility gauges and tactile 4WD mode selectors.',
				terms: ['4wd mt instrument panel', 'instrument panel', '4wd', 'meter', 'cockpit', 'dashboard'],
			},
			{
				tagline: 'COMFORT',
				headline: 'Premium Double Cab',
				description: 'Spacious seating built for both demanding job sites and comfortable highway cruising.',
				terms: ['double cab', 'interior', 'rear seat', 'seat'],
			},
		],
	},
	{
		slug: 'xpander-cross',
		label: 'Xpander Cross',
		keywords: ['xpander cross'],
		items: [
			{
				tagline: 'VERSATILITY',
				headline: 'Flexible 7-Seater Cabin',
				description: 'Multi-position fold-flat seats providing versatile passenger and cargo space.',
				terms: ['seat arrangement', 'seating', 'seat'],
			},
			{
				tagline: 'TECHNOLOGY',
				headline: 'Digital Instrument Cluster',
				description: '8-inch full digital LCD instrument cluster with customizable layout options.',
				terms: ['meter cluster', 'meter', 'cluster', 'steering', 'instrument'],
			},
		],
	},
];

const BLOCK_TEMPLATE = 'services_list';
const BLOCK_VARIANT = 'services_alternating';

/** "Seat_Arrangement-v2.jpg" → "seat arrangement v2 jpg" so terms match any separator style. */
const normalize = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// --- files ------------------------------------------------------------------
const folders = await getAll('/folders?fields=id,name');
const files = (await getAll('/files?fields=id,filename_download,title,folder,type')).filter((f) => f.type?.startsWith('image/'));

function candidateFiles(vehicle) {
	const keys = vehicle.keywords.map(normalize);
	const folderIds = new Set(folders.filter((f) => keys.some((k) => normalize(f.name).includes(k))).map((f) => f.id));
	return files.filter((f) => folderIds.has(f.folder) || keys.some((k) => normalize(`${f.filename_download} ${f.title}`).includes(k)));
}

function pickImage(candidates, terms, used) {
	for (const term of terms.map(normalize)) {
		const file = candidates.find((f) => !used.has(f.id) && normalize(`${f.filename_download} ${f.title}`).includes(term));
		if (file) return file;
	}
	return null;
}

// --- seed -------------------------------------------------------------------
for (const spec of VEHICLES) {
	const [vehicle] = await search('vehicles', { filter: { slug: { _eq: spec.slug } }, fields: ['id', 'title'], limit: 1 });
	if (!vehicle) {
		console.log(`! ${spec.slug}: vehicle not found — skipped`);
		continue;
	}
	console.log(`\n## ${vehicle.title} (#${vehicle.id})`);

	// 1. parent block
	const tagline = `${spec.label} Features`;
	let [block] = await search('block_content_block', { filter: { tagline: { _eq: tagline } }, fields: ['id'], limit: 1 });
	if (block) {
		console.log(`= block "${tagline}" exists (${block.id})`);
	} else {
		block = (
			await api('POST', '/items/block_content_block', {
				tagline,
				template: BLOCK_TEMPLATE,
				variant: BLOCK_VARIANT,
				container_width: 'full',
			})
		).data;
		console.log(`+ block "${tagline}" created (${block.id})`);
	}

	// 2. items — sorted after the vehicle's existing highlights
	const existing = await search('block_content_items', {
		filter: { vehicle: { _eq: vehicle.id } },
		fields: ['id', 'sort', 'headline', 'images.id', 'images.directus_files_id'],
		limit: -1,
	});
	let sort = Math.max(0, ...existing.map((i) => i.sort ?? 0));

	const candidates = candidateFiles(spec);
	const used = new Set(existing.flatMap((i) => (i.images ?? []).map((j) => j.directus_files_id)));
	console.log(`  ${candidates.length} candidate image(s) for ${spec.label}`);

	for (const itemSpec of spec.items) {
		const { terms, ...content } = itemSpec;
		let row = existing.find((i) => i.headline === content.headline);

		if (row) {
			console.log(`  = item "${content.headline}" exists (#${row.id})`);
		} else {
			row = (
				await api('POST', '/items/block_content_items', {
					...content,
					status: 'published',
					sort: ++sort,
					vehicle: vehicle.id,
					item: block.id,
				})
			).data;
			row.images = [];
			console.log(`  + item "${content.headline}" created (#${row.id})`);
		}

		// 3. image — junction row with explicit FKs (see seed-outlander-vehicle.mjs:
		// this build misreads bare file ids in M2M payloads as junction PKs).
		if (row.images?.length) continue;
		const file = pickImage(candidates, terms, used);
		if (!file) {
			console.log(`    ! no image matched [${terms.join(', ')}] — attach one in the CMS`);
			continue;
		}
		used.add(file.id);
		await api('PATCH', `/items/block_content_items/${row.id}`, {
			images: [{ block_content_items_id: row.id, directus_files_id: file.id }],
		});
		console.log(`    + image ${file.filename_download} (${file.id})`);
	}
}

console.log('\nDone.');
