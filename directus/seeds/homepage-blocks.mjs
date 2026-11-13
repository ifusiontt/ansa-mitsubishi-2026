#!/usr/bin/env node
/**
 * homepage-blocks.mjs
 *
 * Page-builder content for the pitch-black homepage (nuxt/app/pages/index.vue):
 *
 *   1. `pages` record for permalink "/" ("Home", published) — created if missing.
 *   2. block_hero_custom — "Smarter. Smoother. Sassier." (hero_immersive, dark_industrial,
 *      full width). `media_gallery` holds the hero media HomeHero plays, in slide order: the
 *      family still, then each brand film followed by its poster (Triton, Outlander Sport HEV,
 *      Xpander Cross); `media` is the family still. Masters: scripts/optimize-hero-media.sh.
 *      (HomeHero serves the same files from nuxt/public; the CMS copies keep the library complete.)
 *   3. block_content_block "TECHNOLOGY" (template content_block_template_one) — one
 *      ASC feature-spotlight item over the Xpander Cross EX BACK lifestyle cut.
 *   4. block_content_block "THE ANSA DIFFERENCE" (template features_grid) — three
 *      value-proposition items.
 *   5. page_blocks junction rows linking all three blocks to the Home page (dark background).
 *   6. Prunes the retired starter blocks (RETIRED_BLOCKS) from the Home page.
 *
 * The homepage picks blocks by collection + template, so keep those two templates
 * if the content is edited in the CMS.
 *
 * Images are uploaded from the client content library (CONTENT_DIR) — or, for lifestyle
 * masters, nuxt/public/images/models — once, matched by filename_download afterwards. Override with explicit file ids:
 *   HOME_ASC_FILE=<uuid> node directus/seeds/homepage-blocks.mjs
 *
 * Idempotent. Blocks are matched on the Home page by headline / tagline and missing child
 * items by headline. Existing content is left alone except for: the hero gallery + media
 * and the ASC item's image (always re-pointed at the files above), the ASC description
 * (rewritten only while it still holds the retired AYC copy), value-card images that still
 * show a retired pre-2026-shoot still (`replaces`), and the retired blocks.
 *
 * Usage:  node directus/seeds/homepage-blocks.mjs
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

const CONTENT_DIR =
	process.env.CONTENT_DIR || path.join(os.homedir(), 'Documents/PERSONAL WORK/2026/Ansa/Mitsubishi/Content/Mitsubishi 2026');
const MODELS = path.join(CONTENT_DIR, '02_Showroom_Models');
/** Optimised lifestyle masters (scripts/optimize-lifestyle-images.py) ship in the repo, not the content library. */
const LIFESTYLE = path.join(HERE, '..', '..', 'nuxt', 'public', 'images', 'models');
/** Homepage hero masters (scripts/optimize-hero-media.sh) also ship in the repo. */
const PUBLIC = path.join(HERE, '..', '..', 'nuxt', 'public');

// --- content ----------------------------------------------------------------
/**
 * Hero media in slide order (HomeHero.vue SLIDES): the family still, then each brand film + its
 * first-frame poster. Titles double as alt text.
 */
const HERO_MEDIA = [
	{
		file: path.join(PUBLIC, 'images/hero/mitsubishi-family-hero.webp'),
		title: 'The 2026 Mitsubishi Xpander Cross, Triton and Outlander Sport HEV on a coastal highway at sunset',
	},
	{ file: path.join(PUBLIC, 'videos/hero/triton-hero.mp4'), title: 'Mitsubishi Triton — homepage hero film' },
	{ file: path.join(PUBLIC, 'videos/hero/triton-hero-poster.webp'), title: 'Mitsubishi Triton — homepage hero film poster' },
	{ file: path.join(PUBLIC, 'videos/hero/outlander-sport-hev-hero.mp4'), title: 'Mitsubishi Outlander Sport HEV — homepage hero film' },
	{
		file: path.join(PUBLIC, 'videos/hero/outlander-sport-hev-hero-poster.webp'),
		title: 'Mitsubishi Outlander Sport HEV — homepage hero film poster',
	},
	{ file: path.join(PUBLIC, 'videos/hero/xpander-cross-hero.mp4'), title: 'Mitsubishi Xpander Cross — homepage hero film' },
	{ file: path.join(PUBLIC, 'videos/hero/xpander-cross-hero-poster.webp'), title: 'Mitsubishi Xpander Cross — homepage hero film poster' },
];
// Same file, title and focal point as scripts/upload-lifestyle-assets.mjs, so the two never fight.
const ASC_IMAGE = {
	file: path.join(LIFESTYLE, 'xpander-cross/lifestyle/xpander-cross-ex-back.webp'),
	title: 'Mitsubishi Xpander Cross on a coastal road, rear three-quarter',
	focal: [840, 660],
};

const HERO = {
	title: 'Home Hero',
	headline: 'Smarter. Smoother. Sassier.',
	highlight_keyword: 'Sassier.',
	body: 'Drive your ambition with the 2026 Mitsubishi lineup at ANSA Motors.',
	template: 'hero_immersive',
	variant: 'dark_industrial',
	container_width: 'full',
};

const ASC_BLOCK = {
	tagline: 'TECHNOLOGY',
	template: 'content_block_template_one',
	container_width: 'full',
};

const ASC_ITEMS = [
	{
		status: 'published',
		tagline: 'ASC',
		headline: 'Introducing Active Stability Control (ASC)',
		description:
			'ASC monitors wheel slip and your steering input, then trims engine power and brakes individual wheels to keep the car stable and on your chosen line — on wet roads, loose gravel and sudden swerves alike.',
		withImage: true,
	},
];
/** Spotlight copy from before the ASC rewrite — replaced when found unedited. */
const RETIRED_ASC_DESCRIPTION =
	'AYC reads your inputs and adjusts engine output and brake force to spinning wheels, sharpening cornering stability.';

/** Starter-kit blocks whose copy predates the 2026 fleet — unlinked from Home and deleted. */
const RETIRED_BLOCKS = [
	{ collection: 'block_hero', headline: 'Mitsubishi 2026 — Built for Trinidad & Tobago' },
	{ collection: 'block_richtext', headline: 'Five Models. Every Kind of Drive.' },
];

const VALUE_BLOCK = {
	tagline: 'THE ANSA DIFFERENCE',
	template: 'features_grid',
	container_width: 'contained',
};

const VALUE_ITEMS = [
	{
		status: 'published',
		tagline: 'Heritage',
		headline: 'Brand Philosophy',
		description: 'Built on Japanese engineering precision backed by ANSA McAL heritage.',
		// Same file, title and focal point as scripts/upload-lifestyle-assets.mjs, which also swaps
		// existing installs off the original headlight close-up (xpander_front_shield.png).
		image: {
			file: path.join(LIFESTYLE, 'outlander-sport/lifestyle/outlander-sport-ex-front.webp'),
			title: 'Mitsubishi Outlander Sport HEV on a city street at night, front three-quarter',
			focal: [1000, 640],
		},
	},
	{
		status: 'published',
		tagline: 'Safety',
		headline: 'All-Round Advanced Safety Technology',
		description: 'RISE body construction and active collision mitigation.',
		// 2026-shoot lifestyle cuts; titles / focal points match upload-lifestyle-assets.mjs.
		image: {
			file: path.join(LIFESTYLE, 'triton/lifestyle/triton-ex-back.webp'),
			title: 'Mitsubishi Triton on a forest trail, rear three-quarter',
			focal: [1080, 640],
		},
		replaces: 'xpander_taillight_led.png',
	},
	{
		status: 'published',
		tagline: 'Financing',
		headline: 'In-House ANSA Financing',
		description: 'Tailored automotive loans and flexible payment structures.',
		image: {
			file: path.join(LIFESTYLE, 'xpander-cross/lifestyle/xpander-cross-interior-1.webp'),
			title: 'Mitsubishi Xpander Cross cockpit and horizontal dashboard',
			focal: [1200, 580],
		},
		replaces: 'triton_sunset_flats.png',
	},
];

// --- 1. Home page -----------------------------------------------------------
let [home] = await search('pages', { filter: { permalink: { _eq: '/' } }, fields: ['id', 'title', 'status'], limit: 1 });
if (home) {
	console.log(`= Home page exists (${home.id}, ${home.status})`);
	if (home.status !== 'published') console.log('  ! Home page is not published — the public homepage only reads published pages');
} else {
	home = (await api('POST', '/items/pages', { title: 'Home', permalink: '/', status: 'published', sort: 1 })).data;
	console.log(`+ Home page created (${home.id})`);
}

// --- 2. media ---------------------------------------------------------------
const MIME = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4' };

/**
 * Directus file id for a content-library image — reuses a same-name, same-size upload and keeps its title current.
 * `focal` ([x, y] in source pixels) steers Directus `fit=cover` crops, e.g. 16:9 stills in the 3:4 value cards.
 */
async function ensureFile({ file: relPath, title, focal }) {
	const abs = path.isAbsolute(relPath) ? relPath : path.join(MODELS, relPath);
	const name = path.basename(abs);
	const size = fs.statSync(abs).size;
	// SEARCH, not GET: a GET list read straight after an upload can come back stale here.
	const { data: found } = await api('SEARCH', '/files', {
		query: {
			filter: { filename_download: { _eq: name } },
			fields: ['id', 'filesize', 'title', 'focal_point_x', 'focal_point_y'],
			sort: ['uploaded_on'],
			limit: -1,
		},
	});
	const existing = found.find((f) => Number(f.filesize) === size);
	if (existing) {
		const patch = {};
		if (existing.title !== title) patch.title = title;
		if (focal && (existing.focal_point_x !== focal[0] || existing.focal_point_y !== focal[1])) {
			[patch.focal_point_x, patch.focal_point_y] = focal;
		}
		if (Object.keys(patch).length) await api('PATCH', `/files/${existing.id}`, patch);
		console.log(`= file ${name} (${existing.id})${Object.keys(patch).length ? ` — ${Object.keys(patch).join(', ')} updated` : ''}`);
		return existing.id;
	}
	const form = new FormData();
	form.append('title', title);
	if (focal) {
		form.append('focal_point_x', String(focal[0]));
		form.append('focal_point_y', String(focal[1]));
	}
	form.append('file', new Blob([fs.readFileSync(abs)], { type: MIME[path.extname(name).toLowerCase()] }), name);
	const res = await fetch(`${BASE}/files`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: form });
	const text = await res.text();
	if (!res.ok) throw new Error(`upload ${name} → ${res.status} ${text.slice(0, 300)}`);
	const id = JSON.parse(text).data.id;
	console.log(`+ file ${name} uploaded (${id})`);
	return id;
}

const heroStillIds = [];
for (const media of HERO_MEDIA) heroStillIds.push(await ensureFile(media));
const ascMediaId = process.env.HOME_ASC_FILE || (await ensureFile(ASC_IMAGE));
const valueImageIds = new Map();
for (const { headline, image } of VALUE_ITEMS) valueImageIds.set(headline, await ensureFile(image));

// --- 3. blocks on the Home page -----------------------------------------------
const homeBlocks = await search('page_blocks', {
	filter: { page: { _eq: home.id } },
	fields: ['id', 'collection', 'item', 'sort'],
	limit: -1,
});
let nextSort = Math.max(0, ...homeBlocks.map((b) => b.sort ?? 0)) + 1;

async function linkBlock(collection, itemId) {
	await api('POST', '/items/page_blocks', {
		page: home.id,
		collection,
		item: String(itemId),
		sort: nextSort++,
		background: 'dark',
		hide_block: false,
	});
}

const idsOn = (collection) => homeBlocks.filter((b) => b.collection === collection).map((b) => b.item);

// Hero
const heroIds = idsOn('block_hero_custom');
const [existingHero] = heroIds.length
	? await search('block_hero_custom', { filter: { id: { _in: heroIds }, headline: { _eq: HERO.headline } }, fields: ['id'], limit: 1 })
	: [];
let heroId = existingHero?.id;
if (heroId) {
	console.log(`= hero block exists on Home (${heroId})`);
} else {
	heroId = (await api('POST', '/items/block_hero_custom', { ...HERO, media: heroStillIds[0] })).data.id;
	await linkBlock('block_hero_custom', heroId);
	console.log(`+ hero block created and linked (${heroId})`);
}

// Gallery junction rows are rewritten with explicit FKs (in slide order) whenever they drift —
// this build misreads nested M2M file payloads (see seed-outlander-vehicle.mjs).
const galleryRows = await search('block_hero_custom_files', {
	filter: { block_hero_custom_id: { _eq: heroId } },
	fields: ['id', 'directus_files_id'],
	sort: ['id'],
	limit: -1,
});
if (JSON.stringify(galleryRows.map((r) => r.directus_files_id)) === JSON.stringify(heroStillIds)) {
	console.log(`  = hero gallery already holds the ${heroStillIds.length} hero files`);
} else {
	for (const row of galleryRows) await api('DELETE', `/items/block_hero_custom_files/${row.id}`);
	for (const fileId of heroStillIds) {
		await api('POST', '/items/block_hero_custom_files', { block_hero_custom_id: heroId, directus_files_id: fileId });
	}
	console.log(`  ~ hero gallery set to ${heroStillIds.length} hero files`);
}
await api('PATCH', `/items/block_hero_custom/${heroId}`, { media: heroStillIds[0] });

// Content blocks
const contentIds = idsOn('block_content_block');

async function ensureContentBlock(block, items, imageId) {
	const [existing] = contentIds.length
		? await search('block_content_block', {
				filter: { id: { _in: contentIds }, tagline: { _eq: block.tagline } },
				fields: ['id', 'items.headline'],
				limit: 1,
			})
		: [];

	// Items are created first, then the image is linked as a junction row with explicit
	// FKs — this build misreads nested M2M file payloads (see seed-outlander-vehicle.mjs).
	async function createItem({ withImage, image: _image, ...item }, sort, blockId) {
		const row = (await api('POST', '/items/block_content_items', { ...item, sort, item: blockId })).data;
		if (withImage && imageId) {
			await api('PATCH', `/items/block_content_items/${row.id}`, {
				images: [{ block_content_items_id: row.id, directus_files_id: imageId }],
			});
		}
		console.log(`  + item "${item.headline}" created (#${row.id})`);
	}

	if (!existing) {
		const created = (await api('POST', '/items/block_content_block', block)).data;
		for (const [i, item] of items.entries()) await createItem(item, i + 1, created.id);
		await linkBlock('block_content_block', created.id);
		console.log(`+ "${block.tagline}" content block created and linked (${created.id})`);
		return;
	}

	console.log(`= "${block.tagline}" content block exists on Home (${existing.id})`);
	const have = new Set((existing.items ?? []).map((i) => i.headline));
	let sort = have.size;
	for (const item of items) {
		if (!have.has(item.headline)) await createItem(item, ++sort, existing.id);
	}
	return existing.id;
}

const ascBlockId = await ensureContentBlock(ASC_BLOCK, ASC_ITEMS, ascMediaId);
await ensureContentBlock(VALUE_BLOCK, VALUE_ITEMS, null);

// Value cards: photograph each pillar that has no image yet, and swap off a retired pre-2026-shoot
// still (`replaces`) — any other image picked in Directus is kept.
const [valueBlock] = await search('block_content_block', {
	filter: { tagline: { _eq: VALUE_BLOCK.tagline }, template: { _eq: VALUE_BLOCK.template } },
	fields: ['id'],
	limit: 1,
});
if (valueBlock) {
	const valueItems = await search('block_content_items', {
		filter: { item: { _eq: valueBlock.id }, headline: { _in: [...valueImageIds.keys()] } },
		fields: ['id', 'headline', 'images.id', 'images.directus_files_id.id', 'images.directus_files_id.filename_download'],
		limit: -1,
	});
	for (const item of valueItems) {
		const fileId = valueImageIds.get(item.headline);
		const { replaces } = VALUE_ITEMS.find((v) => v.headline === item.headline) ?? {};
		const current = item.images ?? [];
		if (current.length === 1 && current[0].directus_files_id?.id === fileId) {
			console.log(`  = "${item.headline}" image current`);
			continue;
		}
		if (current.length && !(replaces && current.some((j) => j.directus_files_id?.filename_download === replaces))) {
			console.log(`  = "${item.headline}" keeps its Directus-picked image`);
			continue;
		}
		for (const j of current) await api('DELETE', `/items/block_content_items_files/${j.id}`);
		await api('POST', '/items/block_content_items_files', { block_content_items_id: item.id, directus_files_id: fileId });
		console.log(`  ${current.length ? '~' : '+'} "${item.headline}" image set to ${fileId}`);
	}
}

// ASC item on an existing block: re-point the image, retire the AYC copy.
if (ascBlockId) {
	const [ascSpec] = ASC_ITEMS;
	const [ascItem] = await search('block_content_items', {
		filter: { item: { _eq: ascBlockId }, headline: { _eq: ascSpec.headline } },
		fields: ['id', 'description'],
		limit: 1,
	});
	if (ascItem) {
		if (ascItem.description === RETIRED_ASC_DESCRIPTION) {
			await api('PATCH', `/items/block_content_items/${ascItem.id}`, { description: ascSpec.description });
			console.log('  ~ ASC description rewritten (AYC → ASC copy)');
		}
		const imageRows = await search('block_content_items_files', {
			filter: { block_content_items_id: { _eq: ascItem.id } },
			fields: ['id', 'directus_files_id'],
			limit: -1,
		});
		if (imageRows.length === 1 && imageRows[0].directus_files_id === ascMediaId) {
			console.log('  = ASC image already linked');
		} else {
			for (const row of imageRows) await api('DELETE', `/items/block_content_items_files/${row.id}`);
			await api('POST', '/items/block_content_items_files', { block_content_items_id: ascItem.id, directus_files_id: ascMediaId });
			console.log(`  ~ ASC image set to ${ascMediaId}`);
		}
	}
}

// --- 4. retired blocks --------------------------------------------------------
for (const { collection, headline } of RETIRED_BLOCKS) {
	const ids = idsOn(collection);
	const matches = ids.length
		? await search(collection, { filter: { id: { _in: ids }, headline: { _eq: headline } }, fields: ['id'], limit: -1 })
		: [];
	for (const { id } of matches) {
		for (const link of homeBlocks.filter((b) => b.collection === collection && b.item === id)) {
			await api('DELETE', `/items/page_blocks/${link.id}`);
		}
		// only delete the block itself when no other page still uses it
		const elsewhere = await search('page_blocks', { filter: { collection: { _eq: collection }, item: { _eq: id } }, fields: ['id'], limit: 1 });
		if (!elsewhere.length) await api('DELETE', `/items/${collection}/${id}`);
		console.log(`- retired ${collection} "${headline}" removed from Home${elsewhere.length ? ' (still used elsewhere — kept)' : ' and deleted'}`);
	}
}

console.log('\nDone. Homepage blocks are linked to pages.blocks for "/".');
