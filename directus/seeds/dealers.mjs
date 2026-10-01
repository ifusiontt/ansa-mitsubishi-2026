#!/usr/bin/env node
/**
 * dealers.mjs
 *
 * Ensures the ANSA Motors Mitsubishi branches shown by the Contact page's
 * DealershipMap exist in the Directus `dealers` collection.
 *
 * Create-only: branches are matched by `slug`, and existing rows are left
 * untouched so CMS edits (and the richer rows from seed-mitsubishi-data.py)
 * are never overwritten. Other dealers (e.g. Chaguanas) are not affected.
 *
 * Usage:  node directus/seeds/dealers.mjs
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
const search = (collection, query) => api('SEARCH', `/items/${collection}`, { query });

const WEEKDAYS_430 = {
	monday: '8:00 AM - 4:30 PM',
	tuesday: '8:00 AM - 4:30 PM',
	wednesday: '8:00 AM - 4:30 PM',
	thursday: '8:00 AM - 4:30 PM',
	friday: '8:00 AM - 4:30 PM',
	saturday: '8:30 AM - 12:30 PM',
	sunday: 'Closed',
};

const CORE_SERVICES = [
	'New Vehicle Showroom Sales',
	'Authorized Service & Maintenance Facility',
	'Genuine Mitsubishi OEM Spare Parts Counter',
];

const DEALERS = [
	{
		name: 'ANSA Motors - Port of Spain',
		slug: 'port-of-spain',
		address: 'Corner Richmond & Duke Streets',
		city: 'Port of Spain',
		country: 'Trinidad and Tobago',
		latitude: 10.6548,
		longitude: -61.5136,
		phone: '+1 (868) 625-7231',
		email: 'mitsubishi.pos@ansamcl.com',
		is_headquarters: true,
		google_maps_url: 'https://maps.google.com/?q=ANSA+Motors+Port+of+Spain+Trinidad',
		opening_hours: WEEKDAYS_430,
		services: [
			...CORE_SERVICES,
			'Commercial Fleet Sales & Solutions',
			'Trade-In Valuations & Appraisals',
			'Automotive Financing & Insurance Desk',
		],
	},
	{
		name: 'ANSA Motors - San Fernando',
		slug: 'san-fernando',
		address: 'Royal Road',
		city: 'San Fernando',
		country: 'Trinidad and Tobago',
		latitude: 10.2789,
		longitude: -61.4589,
		phone: '+1 (868) 652-3211',
		email: 'mitsubishi.sfo@ansamcl.com',
		is_headquarters: false,
		google_maps_url: 'https://maps.google.com/?q=ANSA+Motors+San+Fernando+Trinidad',
		opening_hours: WEEKDAYS_430,
		services: CORE_SERVICES,
	},
	{
		name: 'ANSA Motors - Tobago Branch',
		slug: 'tobago',
		address: 'Milford Road',
		city: 'Scarborough',
		state_region: 'Tobago',
		country: 'Trinidad and Tobago',
		latitude: 11.1812,
		longitude: -60.7362,
		phone: '+1 (868) 639-2421',
		email: 'mitsubishi.tobago@ansamcl.com',
		is_headquarters: false,
		google_maps_url: 'https://maps.google.com/?q=ANSA+Motors+Milford+Road+Scarborough+Tobago',
		opening_hours: {
			monday: '8:00 AM - 4:00 PM',
			tuesday: '8:00 AM - 4:00 PM',
			wednesday: '8:00 AM - 4:00 PM',
			thursday: '8:00 AM - 4:00 PM',
			friday: '8:00 AM - 4:00 PM',
			saturday: 'Closed',
			sunday: 'Closed',
		},
		services: CORE_SERVICES,
	},
];

const existing = await search('dealers', { fields: ['id', 'slug'], limit: -1 });
const existingSlugs = new Map(existing.data.map((d) => [d.slug, d.id]));

for (const dealer of DEALERS) {
	if (existingSlugs.has(dealer.slug)) {
		console.log(`= ${dealer.slug} exists (id ${existingSlugs.get(dealer.slug)}); left unchanged`);
		continue;
	}
	const created = await api('POST', '/items/dealers?fields=id,slug', { status: 'published', ...dealer });
	console.log(`+ ${created.data.slug} created (id ${created.data.id})`);
}
