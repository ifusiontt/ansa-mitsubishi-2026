#!/usr/bin/env node
/**
 * vehicle-content-blocks.mjs
 *
 * Complete highlight content for /showroom/[slug] (VehicleHighlights.vue renders
 * every published item as an alternating image / text row):
 *
 *   1. VEHICLES below is the source of truth for each model's highlights — red
 *      eyebrow (tagline), headline, description, and display order (sort).
 *      Existing `vehicles.highlights` rows are matched by headline (or a former
 *      headline in `match`) and updated to the spec; missing ones are created
 *      under a "<Model> Features" block_content_block. Rows not in the spec are
 *      left untouched and reported.
 *   2. Every item ends up with an image:
 *        - an existing image is kept unless the item sets `replaceImage`;
 *        - otherwise the first file (by `terms` priority) among the model's
 *          Directus files — its folder, or filenames mentioning the model —
 *          not already used by another highlight of that model;
 *        - otherwise a fallback from the vehicle record: hero render, colour
 *          renders, then menu cutout (preferring one not yet used).
 *      The run fails if any published highlight is still imageless.
 *
 * Nothing is uploaded. Idempotent: a second run reports everything as ok.
 *
 * Usage:  node directus/seeds/vehicle-content-blocks.mjs [--dry-run] [--list]
 *           --dry-run  print the plan without writing
 *           --list     also print each model's candidate image filenames
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const LIST = process.argv.includes('--list');

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

/** Writes are skipped (and only described) under --dry-run. */
const write = (method, urlPath, body) => (DRY_RUN ? Promise.resolve({ data: { id: '(dry-run)' } }) : api(method, urlPath, body));

// SEARCH (query in the body) bypasses the stale GET cache seen on this instance (see contact-form.mjs).
const search = async (collection, query) => (await api('SEARCH', `/items/${collection}`, { query })).data;
// /files is read via GET with a cache-buster, as in vehicle-colors.mjs.
const getAll = async (urlPath) => (await api('GET', `${urlPath}&limit=-1&cache=false&x=${Date.now()}`)).data;

// --- content ----------------------------------------------------------------
// Items are listed in display order. `terms` pick an image by whole words in the
// file name (first term wins); `match` lists former headlines of an existing row.
const VEHICLES = [
	{
		slug: 'outlander-sport',
		label: 'Outlander Sport',
		keywords: ['outlander', 'xfh'],
		items: [
			{
				tagline: 'PERFORMANCE',
				headline: 'Outdrive The Limits With Prevailing Performance',
				description: 'A refined MIVEC engine and smooth CVT deliver confident, efficient performance in every drive mode.',
				terms: ['closeup', 'front level'],
			},
			{
				tagline: 'DESIGN',
				headline: 'Outpace The Norms With Dazzling Design',
				description: 'Dynamic Shield design language with sculpted body lines, LED lighting, and bold alloy wheels.',
				terms: ['back qtr', 'rear left', 'rear'],
			},
			{
				tagline: 'INTERIOR',
				headline: 'Outstand With Comfort With Uncompromising Safety & Luxury',
				description: 'A driver-focused cabin with premium materials, Smartphone-link audio, and Mitsubishi Safety Sensing.',
				terms: ['interior 1', 'interior'],
				replaceImage: true, // was the same instrument-panel photo as TECHNOLOGY (jpeg vs webp)
			},
			{
				tagline: 'TECHNOLOGY',
				headline: 'Driver-Focused Digital Cockpit',
				description: '8-inch SDA touchscreen with Apple CarPlay & Android Auto integration.',
				terms: ['navi', 'audio', 'display', 'instrument panel', 'meter'],
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
				terms: ['ayc', 'yaw', 'chassis', 'qtr front', 'front left'],
			},
		],
	},
	{
		slug: 'triton',
		label: 'Triton',
		keywords: ['triton'],
		items: [
			{
				tagline: 'PERFORMANCE',
				headline: 'Super Select 4WD-II',
				description:
					'Exceptional all-terrain capability with four selectable modes — including 4H full-time 4WD for stability on wet surfaces and outstanding cornering on dry pavement — plus a rear differential lock.',
				// lifestyle frame set by scripts/upload-lifestyle-assets.mjs — kept on re-runs
				terms: ['front right', 'front left'],
			},
			{
				tagline: 'POWER',
				headline: '2.4L MIVEC Turbo Diesel (135 kW / 430 Nm)',
				description:
					'Experience powerful acceleration and responsive performance from the new 2.4L intercooled turbo diesel, paired with a 6-speed automatic and a 75-litre fuel tank.',
				terms: ['rear left', 'engine'],
			},
			{
				tagline: 'TECHNOLOGY',
				headline: '9-Inch Infotainment with Apple CarPlay & 360 Camera',
				description:
					'An intuitive 9-inch Smartphone-link Display Audio system with smartphone connectivity, Apple CarPlay & Android Auto, and a 360° camera and wireless charging on the leather grade.',
				// No infotainment render exists for the Triton — falls back to the hero render.
				terms: ['navi', 'audio', 'display', 'infotainment', 'monitor', 'camera', 'dashboard'],
				replaceImage: true, // was a seat render
			},
			{
				tagline: 'CAPABILITY',
				headline: 'Heavy-Duty Cockpit',
				description: 'Driver-centric layout with high-visibility gauges and tactile 4WD mode selectors.',
				terms: ['4wd mt instrument panel', 'instrument panel', 'meter', 'cockpit'],
			},
			{
				tagline: 'COMFORT',
				headline: 'Premium Double Cab',
				description: 'Spacious seating built for both demanding job sites and comfortable highway cruising.',
				terms: ['dcab', 'double cab', 'rear seat', 'seat'],
			},
			{
				tagline: 'UTILITY',
				headline: 'Built for the Work Site',
				description: 'A practical cargo bed for materials and gear, backed by 3,500 kg of towing capacity.',
				terms: ['cargo', 'deck', 'tray'],
			},
		],
	},
	{
		slug: 'xpander-cross',
		label: 'Xpander Cross',
		keywords: ['xpander cross', 'xs'],
		items: [
			{
				tagline: 'VERSATILITY',
				headline: 'Flexible 7-Seater Cabin',
				description: 'Multi-position fold-flat seats providing versatile passenger and cargo space.',
				terms: ['seatarrange', 'seat arrangement', 'seating'],
			},
			{
				tagline: 'INTERIOR',
				headline: 'Spacious, Refined Interior',
				// Repurposes the duplicate "Digital Instrument Cluster" row (same content as the TECHNOLOGY item).
				match: ['Digital Instrument Cluster'],
				description:
					'A wide horizontal dashboard, premium trim and generous room across all three rows keep every passenger relaxed on long family drives.',
				terms: ['navi audio', 'dashboard', 'instrument panel', 'interior'],
				replaceImage: true, // was the same cluster render as TECHNOLOGY
			},
			{
				tagline: 'TECHNOLOGY',
				headline: '8-Inch Full Digital LCD Cluster',
				description:
					'A driver-focused 8-inch full digital LCD instrument cluster with a customisable screen layout, paired with a 7-inch SDA touchscreen, Apple CarPlay & Android Auto and cruise control.',
				terms: ['steering meter', 'meter', 'cluster'],
			},
			{
				tagline: 'COMFORT',
				headline: 'Heat Guard Synthetic Leather',
				description:
					'Heat Guard synthetic leather seats stay cooler in the sun, with digital climate control and rear vents, an electronic parking brake with auto hold, and USB Type A & C charging in the 2nd row.',
				terms: ['seatarrange', 'seat'],
			},
			{
				tagline: 'SAFETY',
				headline: 'Active Yaw Control (AYC)',
				description:
					'AYC reads your inputs and adjusts engine output and brake force to spinning wheels, sharpening cornering stability — with the brake control visible in real time on the LCD meter.',
				terms: ['ayc', 'yaw', 'front left'],
			},
			{
				tagline: 'CAPABILITY',
				headline: '225mm Ground Clearance',
				description:
					'Top-level 225 mm ground clearance and a high 1,340 mm eye point give confident, comfortable driving on bumpy or uneven roads — with a reinforced suspension for stable handling.',
				terms: ['side', 'exterior'],
			},
		],
	},
];

const BLOCK_TEMPLATE = 'services_list';
const BLOCK_VARIANT = 'services_alternating';

/** "Seat_Arrangement-v2.jpg" → "seat arrangement v2 jpg"; terms then match whole words only. */
const normalize = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hasWords = (haystack, needle) => ` ${normalize(haystack)} `.includes(` ${normalize(needle)} `);
const fileId = (ref) => (ref && typeof ref === 'object' ? ref.id : ref) || null;

// --- files ------------------------------------------------------------------
const folders = await getAll('/folders?fields=id,name');
const files = (await getAll('/files?fields=id,filename_download,title,folder,type')).filter((f) => f.type?.startsWith('image/'));
const fileName = (id) => files.find((f) => f.id === id)?.filename_download ?? id;

function candidateFiles(spec) {
	const folderIds = new Set(folders.filter((f) => spec.keywords.some((k) => hasWords(f.name, k))).map((f) => f.id));
	return files.filter((f) => folderIds.has(f.folder) || spec.keywords.some((k) => hasWords(`${f.filename_download} ${f.title}`, k)));
}

function pickByTerms(candidates, terms, used) {
	for (const term of terms) {
		const file = candidates.find((f) => !used.has(f.id) && hasWords(`${f.filename_download} ${f.title}`, term));
		if (file) return { id: file.id, why: `matched "${term}"` };
	}
	return null;
}

function pickFallback(fallbacks, used) {
	const fresh = fallbacks.find((f) => !used.has(f.id));
	return fresh ?? fallbacks[0] ?? null;
}

// --- seed -------------------------------------------------------------------
if (DRY_RUN) console.log('DRY RUN — no changes will be written\n');
let imageless = 0;

for (const spec of VEHICLES) {
	const [vehicle] = await search('vehicles', {
		filter: { slug: { _eq: spec.slug } },
		fields: ['id', 'title', 'menu_image', 'hero_block.media', 'colors.image', 'colors.sort'],
		limit: 1,
	});
	if (!vehicle) {
		console.log(`! ${spec.slug}: vehicle not found — skipped`);
		continue;
	}
	console.log(`\n## ${vehicle.title} (#${vehicle.id})`);

	const candidates = candidateFiles(spec);
	console.log(`  ${candidates.length} candidate image(s)`);
	if (LIST) for (const f of candidates) console.log(`    · ${f.filename_download}`);

	// Fallback renders from the vehicle record, in preference order.
	const fallbacks = [
		{ id: fileId(vehicle.hero_block?.media), why: 'fallback: hero render' },
		...[...(vehicle.colors ?? [])].sort((a, b) => a.sort - b.sort).map((c) => ({ id: fileId(c.image), why: 'fallback: colour render' })),
		{ id: fileId(vehicle.menu_image), why: 'fallback: menu cutout' },
	].filter((f) => f.id);

	const rows = await search('block_content_items', {
		filter: { vehicle: { _eq: vehicle.id } },
		fields: ['id', 'sort', 'status', 'tagline', 'headline', 'description', 'images.id', 'images.directus_files_id'],
		limit: -1,
	});

	// Feature block — parent for any item created here.
	const blockTagline = `${spec.label} Features`;
	let [block] = await search('block_content_block', { filter: { tagline: { _eq: blockTagline } }, fields: ['id'], limit: 1 });

	// Pair each spec item with its row first, so kept images are reserved before any picking.
	const plan = spec.items.map((item, index) => ({
		item,
		sort: index + 1,
		row: rows.find((r) => [item.headline, ...(item.match ?? [])].includes(r.headline)),
	}));
	const used = new Set(plan.filter((p) => p.row && !p.item.replaceImage).flatMap((p) => (p.row.images ?? []).map((j) => j.directus_files_id)));

	for (const { item, sort, row: existing } of plan) {
		const { terms, match, replaceImage, ...content } = item;
		const desired = { ...content, sort, status: 'published' };
		let row = existing;

		if (!row) {
			if (!block) {
				block = (
					await write('POST', '/items/block_content_block', {
						tagline: blockTagline,
						template: BLOCK_TEMPLATE,
						variant: BLOCK_VARIANT,
						container_width: 'full',
					})
				).data;
				console.log(`  + block "${blockTagline}" created`);
			}
			row = (await write('POST', '/items/block_content_items', { ...desired, vehicle: vehicle.id, item: block.id })).data;
			row.images = [];
			console.log(`  + [${content.tagline}] "${content.headline}" created`);
		} else {
			const changes = Object.fromEntries(Object.entries(desired).filter(([key, value]) => row[key] !== value));
			if (Object.keys(changes).length) {
				await write('PATCH', `/items/block_content_items/${row.id}`, changes);
				console.log(`  ~ [${content.tagline}] "${content.headline}" (#${row.id}) updated: ${Object.keys(changes).join(', ')}`);
			} else {
				console.log(`  = [${content.tagline}] "${content.headline}" (#${row.id}) ok`);
			}
		}

		// Image
		const current = (row.images ?? []).map((j) => j.directus_files_id).filter(Boolean);
		if (current.length && !replaceImage) continue;

		const pick = pickByTerms(candidates, terms, used) ?? pickFallback(fallbacks, used);
		if (!pick) {
			console.log(`      ! no image available`);
			imageless++;
			continue;
		}
		if (current.length === 1 && current[0] === pick.id) continue;
		used.add(pick.id);

		// Junction rows with explicit FKs — this build misreads bare file ids in
		// M2M payloads as junction PKs (see seed-outlander-vehicle.mjs).
		for (const junction of row.images ?? []) await write('DELETE', `/items/block_content_items_files/${junction.id}`);
		await write('PATCH', `/items/block_content_items/${row.id}`, {
			images: [{ block_content_items_id: row.id, directus_files_id: pick.id }],
		});
		console.log(`      → image ${fileName(pick.id)} (${pick.why})`);
	}

	const extra = rows.filter((r) => !plan.some((p) => p.row?.id === r.id));
	for (const r of extra) console.log(`  ? #${r.id} [${r.tagline}] "${r.headline}" is not in the spec — left as is`);
}

// --- verify -----------------------------------------------------------------
if (!DRY_RUN) {
	const slugs = VEHICLES.map((v) => v.slug);
	const missing = await search('block_content_items', {
		filter: { vehicle: { slug: { _in: slugs } }, status: { _eq: 'published' }, images: { _none: { directus_files_id: { _nnull: true } } } },
		fields: ['id', 'headline', 'vehicle.slug'],
		limit: -1,
	});
	imageless = missing.length;
	for (const m of missing) console.log(`! #${m.id} "${m.headline}" (${m.vehicle?.slug}) has no image`);
}

if (imageless) {
	console.error(`\nFAILED: ${imageless} highlight(s) without an image`);
	process.exit(1);
}
console.log(`\nDone${DRY_RUN ? ' (dry run)' : ''} — every published highlight has an image.`);
