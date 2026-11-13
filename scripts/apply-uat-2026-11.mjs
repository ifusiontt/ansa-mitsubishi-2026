#!/usr/bin/env node
/**
 * apply-uat-2026-11.mjs — ANSA Motors brand-management UAT feedback (Nov 2026), CMS side.
 *
 *   1. Rename: every "Outlander Sport" not already followed by "HEV" becomes "Outlander Sport HEV"
 *      in the content collections below — string fields and strings nested in JSON fields (SEO
 *      objects, form-field choices, key_features, …). Case is kept ("OUTLANDER SPORT HEV").
 *      Slugs, permalinks and URLs are never touched: /showroom/outlander-sport keeps working.
 *   2. TTD pricing: vehicles.starting_price and vehicle_trims.price per PRICING.
 *   3. Clears the Directus data cache.
 *
 * Homepage media (hero still + films + posters, value cards, ASC spotlight) is a separate,
 * already-idempotent seed: node directus/seeds/homepage-blocks.mjs
 *
 * Idempotent: a second run reports "= … unchanged" for everything.
 *
 * Usage:  DRY_RUN=1 node scripts/apply-uat-2026-11.mjs     (print the changes, write nothing)
 *         node scripts/apply-uat-2026-11.mjs
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env, localhost:8055)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function loadToken() {
	if (process.env.DIRECTUS_TOKEN) return process.env.DIRECTUS_TOKEN;
	const envFile = path.join(HERE, '..', 'directus', '.env');
	const m = fs.existsSync(envFile) && fs.readFileSync(envFile, 'utf8').match(/^ADMIN_TOKEN=(.*)$/m);
	if (!m) {
		console.error('ERROR: no token — set DIRECTUS_TOKEN or ADMIN_TOKEN in directus/.env');
		process.exit(1);
	}
	return m[1].trim();
}

const TOKEN = loadToken();
const BASE = (process.env.DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '');
const DRY = !!process.env.DRY_RUN;

async function api(method, urlPath, body, { allowMissing = false } = {}) {
	const res = await fetch(BASE + urlPath, {
		method,
		headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (allowMissing && (res.status === 403 || res.status === 404)) return null;
	const text = await res.text();
	if (!res.ok) throw new Error(`${method} ${urlPath} → ${res.status} ${text.slice(0, 300)}`);
	return text ? JSON.parse(text) : null;
}
// SEARCH (query in the body) bypasses the stale GET cache seen on this instance (see contact-form.mjs).
const search = async (collection, query) => (await api('SEARCH', `/items/${collection}`, { query })).data;

let changes = 0;
async function patch(collection, id, data, label) {
	changes++;
	if (DRY) return console.log(`  ~ [dry] ${label}`);
	if (collection === 'globals') await api('PATCH', '/items/globals', data);
	else await api('PATCH', `/items/${collection}/${encodeURIComponent(id)}`, data);
	console.log(`  ~ ${label}`);
}

console.log(`Directus: ${BASE}${DRY ? '  (DRY RUN — nothing is written)' : ''}\n`);

// --- 1. rename ------------------------------------------------------------------
/** Content collections that can carry the model name. Missing ones are skipped. */
const RENAME_COLLECTIONS = [
	'vehicles',
	'vehicle_trims',
	'vehicle_colors',
	'block_hero_custom',
	'block_hero',
	'block_content_block',
	'block_content_items',
	'block_richtext',
	'block_gallery',
	'block_button',
	'block_button_group',
	'block_posts',
	'block_pricing_cards',
	'pages',
	'posts',
	'navigation_items',
	'forms',
	'form_fields',
	'globals',
];
/** Identity / routing / system fields — never rewritten. */
const SKIP_FIELD = /^(id|slug|permalink|url|.*_url|status|sort|date_.*|user_.*|vehicle|item|page|collection)$/;

const OLD_NAME = /\b(Outlander Sport)\b(?![\s_-]*HEV)/gi;
const renameString = (value) => value.replace(OLD_NAME, '$1 HEV');

/** Returns the renamed value, or undefined when nothing in it changes. Walks JSON objects/arrays. */
function renamed(value) {
	if (typeof value === 'string') {
		const next = renameString(value);
		return next === value ? undefined : next;
	}
	if (Array.isArray(value)) {
		let hit = false;
		const next = value.map((v) => {
			const r = renamed(v);
			if (r !== undefined) hit = true;
			return r === undefined ? v : r;
		});
		return hit ? next : undefined;
	}
	if (value && typeof value === 'object') {
		let hit = false;
		const next = {};
		for (const [k, v] of Object.entries(value)) {
			const r = renamed(v);
			if (r !== undefined) hit = true;
			next[k] = r === undefined ? v : r;
		}
		return hit ? next : undefined;
	}
	return undefined;
}

const preview = (s) => (typeof s === 'string' ? s : JSON.stringify(s)).replace(/\s+/g, ' ').slice(0, 90);

console.log('1. Rename "Outlander Sport" → "Outlander Sport HEV"');
for (const collection of RENAME_COLLECTIONS) {
	let rows;
	if (collection === 'globals') {
		const g = await api('SEARCH', '/items/globals', { query: { fields: ['*'] } }, { allowMissing: true });
		rows = g?.data ? [Array.isArray(g.data) ? g.data[0] : g.data].filter(Boolean) : null;
	} else {
		rows = (await api('SEARCH', `/items/${collection}`, { query: { fields: ['*'], limit: -1 } }, { allowMissing: true }))?.data ?? null;
	}
	if (!rows) {
		console.log(`  - ${collection}: not present / not readable — skipped`);
		continue;
	}
	let hits = 0;
	for (const row of rows) {
		const data = {};
		for (const [field, value] of Object.entries(row)) {
			if (SKIP_FIELD.test(field) || value == null) continue;
			// secrets in globals (API keys) are never rewritten or echoed
			if (collection === 'globals' && /key|token|secret|password/i.test(field)) continue;
			const next = renamed(value);
			if (next !== undefined) data[field] = next;
		}
		if (!Object.keys(data).length) continue;
		hits++;
		const detail = Object.entries(data)
			.map(([f, v]) => `${f}: "${preview(v)}"`)
			.join('; ');
		await patch(collection, row.id, data, `${collection} #${row.id} — ${detail}`);
	}
	console.log(`  ${hits ? '~' : '='} ${collection}: ${hits ? `${hits} row(s) renamed` : `${rows.length} row(s) unchanged`}`);
}

// --- 2. pricing -----------------------------------------------------------------
/**
 * TTD prices from brand management (UAT, Nov 2026). Trims are matched by a case-insensitive
 * pattern on trim_name; `'*'` = every trim of the vehicle. A trim matching nothing is reported, not
 * changed — unless the vehicle sets `retireOthers`, which drafts it (hidden from the showroom).
 * Outlander Sport HEV is sold as a single grade at $259,000: ES carries the price, the legacy
 * SE FWD / SEL Premium FWD grades are set to draft (kept, not deleted, so they can be restored).
 */
const PRICING = {
	'outlander-sport': { starting: 259000, trims: [{ match: /^ES$/i, price: 259000 }], retireOthers: true },
	triton: {
		starting: 339000,
		trims: [
			{ match: /fabric/i, price: 339000 },
			{ match: /leather/i, price: 359000 },
		],
	},
	'xpander-cross': { starting: 229000, trims: [{ match: '*', price: 229000 }] },
};

console.log('\n2. TTD pricing');
const vehicles = await search('vehicles', { fields: ['id', 'slug', 'title', 'starting_price'], limit: -1 });
for (const [slug, spec] of Object.entries(PRICING)) {
	const vehicle = vehicles.find((v) => v.slug === slug);
	if (!vehicle) {
		console.log(`  ! vehicle "${slug}" not found — skipped`);
		continue;
	}
	if (Number(vehicle.starting_price) === spec.starting) console.log(`  = ${slug} starting_price ${spec.starting}`);
	else await patch('vehicles', vehicle.id, { starting_price: spec.starting }, `${slug} starting_price ${vehicle.starting_price} → ${spec.starting}`);

	const trims = await search('vehicle_trims', { filter: { vehicle: { _eq: vehicle.id } }, fields: ['id', 'trim_name', 'price', 'status'], limit: -1 });
	for (const trim of trims) {
		const rule = spec.trims.find((r) => r.match === '*' || r.match.test(trim.trim_name ?? ''));
		if (!rule) {
			if (!spec.retireOthers) {
				console.log(`  ! ${slug} trim "${trim.trim_name}" (${trim.price}) — no UAT price given, left unchanged`);
			} else if (trim.status === 'draft') {
				console.log(`  = ${slug} trim "${trim.trim_name}" draft (retired)`);
			} else {
				await patch('vehicle_trims', trim.id, { status: 'draft' }, `${slug} trim "${trim.trim_name}" ${trim.status} → draft (single-grade model)`);
			}
			continue;
		}
		const data = {};
		if (Number(trim.price) !== rule.price) data.price = rule.price;
		if (trim.status !== 'published') data.status = 'published';
		if (!Object.keys(data).length) console.log(`  = ${slug} trim "${trim.trim_name}" ${rule.price}`);
		else await patch('vehicle_trims', trim.id, data, `${slug} trim "${trim.trim_name}" ${trim.price} → ${rule.price}${data.status ? ' (published)' : ''}`);
	}
}

// --- 3. cache -------------------------------------------------------------------
if (changes && !DRY) {
	await api('POST', '/utils/cache/clear');
	console.log('\n~ Directus data cache cleared');
}
console.log(`\n${DRY ? 'Would apply' : 'Applied'} ${changes} change(s).`);
