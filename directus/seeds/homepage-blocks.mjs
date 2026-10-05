#!/usr/bin/env node
/**
 * homepage-blocks.mjs
 *
 * Page-builder content for the pitch-black homepage (nuxt/app/pages/index.vue):
 *
 *   1. `pages` record for permalink "/" ("Home", published) — created if missing.
 *   2. block_hero_custom — "Smarter. Smoother. Sassier." (hero_immersive, dark_industrial,
 *      full width) with the fleet lineup banner as `media`.
 *   3. block_content_block "TECHNOLOGY" (template content_block_template_one) — one
 *      ASC feature-spotlight item with a driving render.
 *   4. block_content_block "THE ANSA DIFFERENCE" (template features_grid) — three
 *      value-proposition items.
 *   5. page_blocks junction rows linking all three blocks to the Home page (dark background).
 *
 * The homepage picks blocks by collection + template, so keep those two templates
 * if the content is edited in the CMS.
 *
 * Images are NOT uploaded here — existing Directus files are matched by whole words in
 * the filename (lineup for the hero; asc/driving/drive for the spotlight), falling back
 * to the Triton / Outlander Sport hero media. Override with explicit file ids:
 *   HOME_HERO_FILE=<uuid> HOME_ASC_FILE=<uuid> node directus/seeds/homepage-blocks.mjs
 *
 * HOME_HERO_FILE also re-points an already-seeded hero (the only update this script makes).
 *
 * Idempotent and create-only: blocks are matched on the Home page by headline / tagline,
 * missing child items are matched by headline, and existing (possibly CMS-edited)
 * content is never overwritten.
 *
 * Usage:  node directus/seeds/homepage-blocks.mjs
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
const getFiles = async (params) => (await api('GET', `/files?${params}&cache=false&x=${Date.now()}`)).data;

// --- content ----------------------------------------------------------------
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
			'AYC reads your inputs and adjusts engine output and brake force to spinning wheels, sharpening cornering stability.',
		withImage: true,
	},
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
	},
	{
		status: 'published',
		tagline: 'Safety',
		headline: 'All-Round Advanced Safety Technology',
		description: 'RISE body construction and active collision mitigation.',
	},
	{
		status: 'published',
		tagline: 'Financing',
		headline: 'In-House ANSA Financing',
		description: 'Tailored automotive loans and flexible payment structures.',
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
/** "SeatArrange_4.jpg" → "seatarrange 4 jpg" — terms then match whole words only. */
const normalize = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * First image whose download filename contains any of `terms` as whole words
 * (in priority order) — so "range" never matches "SeatArrange".
 */
async function findImage(terms) {
	for (const term of terms) {
		const filter = JSON.stringify({ filename_download: { _icontains: term.split(' ')[0] }, type: { _starts_with: 'image/' } });
		const files = await getFiles(`filter=${encodeURIComponent(filter)}&fields=id,filename_download&sort=-width&limit=-1`);
		const wanted = ` ${normalize(term)} `;
		const file = files.find((f) => ` ${normalize(f.filename_download)} `.includes(wanted));
		if (file) return file;
	}
	return null;
}

/** hero_block.media of the first fleet vehicle (by slug order) that has one. */
async function vehicleHeroMedia(slugs) {
	const vehicles = await search('vehicles', {
		filter: { slug: { _in: slugs } },
		fields: ['slug', 'hero_block.media'],
		limit: -1,
	});
	for (const slug of slugs) {
		const media = vehicles.find((v) => v.slug === slug)?.hero_block?.media;
		if (media) return { id: typeof media === 'string' ? media : media.id, filename_download: `${slug} hero media` };
	}
	return null;
}

async function resolveMedia(label, envKey, terms, fallbackSlugs) {
	const file =
		(process.env[envKey] && { id: process.env[envKey], filename_download: `${envKey} override` }) ||
		(await findImage(terms)) ||
		(await vehicleHeroMedia(fallbackSlugs));
	console.log(file ? `= ${label} image: ${file.filename_download} (${file.id})` : `  ! ${label} image: none found — block created without media`);
	return file?.id ?? null;
}

const heroMediaId = await resolveMedia('hero', 'HOME_HERO_FILE', ['lineup', 'line up'], ['triton', '2025-outlander-sport']);
const ascMediaId = await resolveMedia('ASC', 'HOME_ASC_FILE', ['asc', 'driving', 'drive'], ['2025-outlander-sport', 'triton']);

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
if (existingHero) {
	console.log(`= hero block exists on Home (${existingHero.id})`);
	// An explicit override is the one case where existing CMS content is updated.
	if (process.env.HOME_HERO_FILE) {
		await api('PATCH', `/items/block_hero_custom/${existingHero.id}`, { media: process.env.HOME_HERO_FILE });
		console.log(`  ~ hero media set to HOME_HERO_FILE (${process.env.HOME_HERO_FILE})`);
	}
} else {
	const hero = (await api('POST', '/items/block_hero_custom', { ...HERO, media: heroMediaId })).data;
	await linkBlock('block_hero_custom', hero.id);
	console.log(`+ hero block created and linked (${hero.id})`);
}

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
	async function createItem({ withImage, ...item }, sort, blockId) {
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
}

await ensureContentBlock(ASC_BLOCK, ASC_ITEMS, ascMediaId);
await ensureContentBlock(VALUE_BLOCK, VALUE_ITEMS, null);

console.log('\nDone. Homepage blocks are linked to pages.blocks for "/".');
