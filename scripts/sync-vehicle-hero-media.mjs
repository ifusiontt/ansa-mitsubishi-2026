#!/usr/bin/env node
/**
 * Binds each fleet vehicle's hero block (block_hero_custom.media) to its lifestyle
 * still from nuxt/public/images/main-hero, uploading the stills to the Directus
 * file library first. Mapping lives in scripts/lib/hero-media.mjs.
 *
 * Idempotent: reuses already-uploaded files and skips blocks that already point
 * at the right file. Clears the Directus cache when anything changed.
 *
 * Usage:  node scripts/sync-vehicle-hero-media.mjs
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HERO_MEDIA, ensureHeroMedia } from './lib/hero-media.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadToken() {
	if (process.env.DIRECTUS_TOKEN) return process.env.DIRECTUS_TOKEN;
	const m = fs.readFileSync(path.join(ROOT, 'directus', '.env'), 'utf8').match(/^ADMIN_TOKEN=(.*)$/m);
	if (!m) {
		console.error('ERROR: no token — set DIRECTUS_TOKEN or ADMIN_TOKEN in directus/.env');
		process.exit(1);
	}
	return m[1].trim();
}

const BASE = process.env.DIRECTUS_URL || 'http://localhost:8055';
const H = { Authorization: `Bearer ${loadToken()}` };

async function api(method, p, body) {
	const res = await fetch(BASE + p, {
		method,
		headers: body ? { ...H, 'Content-Type': 'application/json' } : H,
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const data = await res.json().catch(() => null);
	if (!res.ok) throw new Error(`${method} ${p} → ${res.status}: ${JSON.stringify(data)?.slice(0, 300)}`);
	return data;
}

let changed = 0;
for (const slug of Object.keys(HERO_MEDIA)) {
	// SEARCH, not GET: GET reads on this instance can be served stale right after a write.
	const { data } = await api('SEARCH', '/items/vehicles', { query: { filter: { slug: { _eq: slug } }, fields: ['id', 'hero_block'], limit: 1 } });
	const blockId = data?.[0]?.hero_block;
	if (!blockId) {
		console.warn(`${slug}: no vehicle / hero block — skipped`);
		continue;
	}

	const fileId = await ensureHeroMedia({ base: BASE, headers: H, root: ROOT, slug });
	const block = await api('SEARCH', '/items/block_hero_custom', { query: { filter: { id: { _eq: blockId } }, fields: ['media'], limit: 1 } });
	if (block.data?.[0]?.media === fileId) {
		console.log(`${slug}: hero ${blockId.slice(0, 8)}.. already → ${fileId.slice(0, 8)}..`);
		continue;
	}

	await api('PATCH', `/items/block_hero_custom/${blockId}`, { media: fileId });
	console.log(`${slug}: hero ${blockId.slice(0, 8)}.. media → ${fileId.slice(0, 8)}.. (${path.basename(HERO_MEDIA[slug].file)})`);
	changed++;
}

if (changed) {
	await api('POST', '/utils/cache/clear');
	console.log('directus cache cleared');
}
console.log(`done — ${changed} hero block(s) updated`);
