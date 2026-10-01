#!/usr/bin/env node
/**
 * vehicle-colors.mjs
 *
 * Merges the official paint palette (with manufacturer paint codes) into the
 * `vehicle_colors` rows of the Triton and Xpander Cross.
 *
 *   1. Ensures a nullable `vehicle_colors.color_code` string field exists.
 *   2. Per vehicle, matches each palette entry to an existing row — first by
 *      `color_code`, then by name ignoring a trailing "Metallic" (so
 *      "Graphite Gray" matches "Graphite Gray Metallic") — and updates its
 *      name / hex / code. The row's render `image` and `sort` are kept.
 *   3. Creates palette entries with no match, appended after existing colors.
 *
 * Colors not in the palette (e.g. Triton "Deep Bronze Metallic") are left as-is.
 * Idempotent: a rerun matches every entry by code and changes nothing.
 *
 * scripts/seed-remaining-vehicles.mjs carries the same names / hexes / codes and
 * upserts by color_code first, so the two scripts can be rerun in either order.
 *
 * Usage:  node directus/seeds/vehicle-colors.mjs
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

async function api(method, urlPath, body, { allow404 = false } = {}) {
	const res = await fetch(BASE + urlPath, {
		method,
		headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (allow404 && (res.status === 404 || res.status === 403)) return null;
	const text = await res.text();
	if (!res.ok) throw new Error(`${method} ${urlPath} → ${res.status} ${text.slice(0, 300)}`);
	return text ? JSON.parse(text) : null;
}

// SEARCH (query in the body) bypasses the stale GET cache seen on this instance (see contact-form.mjs).
const search = (collection, query) => api('SEARCH', `/items/${collection}`, { query });

const PALETTE = {
	triton: [
		{ color_name: 'Graphite Gray', hex_code: '#4A4D52', color_code: 'U28' },
		{ color_name: 'Blade Silver', hex_code: '#B3B7BB', color_code: 'U33' },
		{ color_name: 'Jet Black Mica', hex_code: '#1C1D21', color_code: 'X37' },
		{ color_name: 'White Diamond', hex_code: '#F2F4F5', color_code: 'W81' },
	],
	'xpander-cross': [
		{ color_name: 'Sunrise Orange', hex_code: '#C8501E', color_code: 'M38' },
		{ color_name: 'Blade Silver Metallic', hex_code: '#B2B6BA', color_code: 'U33' },
		{ color_name: 'Quartz White Pearl', hex_code: '#F0F2F3', color_code: 'W81' },
		{ color_name: 'Jet Black Mica', hex_code: '#18191B', color_code: 'X37' },
	],
};

const normalizeName = (name) =>
	(name ?? '')
		.toLowerCase()
		.replace(/\bmetallic\b/g, '')
		.replace(/[^a-z0-9]+/g, '');

// --- 1. color_code field ----------------------------------------------------
const field = await api('GET', '/fields/vehicle_colors/color_code', undefined, { allow404: true });
if (field) {
	console.log('= vehicle_colors.color_code field exists');
} else {
	await api('POST', '/fields/vehicle_colors', {
		field: 'color_code',
		type: 'string',
		meta: {
			interface: 'input',
			width: 'half',
			note: 'Manufacturer paint code, e.g. U28',
			options: { placeholder: 'U28', trim: true },
		},
		schema: { is_nullable: true, max_length: 16 },
	});
	console.log('+ vehicle_colors.color_code field created');
}

// --- 2/3. merge palettes ------------------------------------------------------
const vehicles = await search('vehicles', {
	filter: { slug: { _in: Object.keys(PALETTE) } },
	fields: ['id', 'slug'],
	limit: -1,
});

for (const [slug, palette] of Object.entries(PALETTE)) {
	const vehicle = vehicles.data.find((v) => v.slug === slug);
	if (!vehicle) {
		console.warn(`!! vehicle "${slug}" not found; skipped`);
		continue;
	}

	const { data: rows } = await search('vehicle_colors', {
		filter: { vehicle_id: { _eq: vehicle.id } },
		fields: ['id', 'sort', 'color_name', 'hex_code', 'color_code'],
		sort: ['sort'],
		limit: -1,
	});
	let nextSort = Math.max(0, ...rows.map((r) => r.sort ?? 0)) + 1;
	const claimed = new Set();

	for (const color of palette) {
		const match =
			rows.find((r) => !claimed.has(r.id) && r.color_code === color.color_code) ??
			rows.find((r) => !claimed.has(r.id) && normalizeName(r.color_name) === normalizeName(color.color_name));

		if (match) {
			claimed.add(match.id);
			const changed = Object.keys(color).filter((k) => match[k] !== color[k]);
			if (!changed.length) {
				console.log(`= ${slug} ${color.color_code} ${color.color_name} (id ${match.id}) up to date`);
				continue;
			}
			await api('PATCH', `/items/vehicle_colors/${match.id}`, color);
			console.log(`~ ${slug} ${color.color_code} ${match.color_name} → ${color.color_name} (id ${match.id}; ${changed.join(', ')})`);
		} else {
			const created = await api('POST', '/items/vehicle_colors?fields=id', {
				vehicle_id: vehicle.id,
				sort: nextSort++,
				...color,
			});
			console.log(`+ ${slug} ${color.color_code} ${color.color_name} (id ${created.data.id})`);
		}
	}
}
