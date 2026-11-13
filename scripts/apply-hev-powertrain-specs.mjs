#!/usr/bin/env node
/**
 * apply-hev-powertrain-specs.mjs — Outlander Sport HEV: replace the 1.5L MIVEC / CVT gasoline
 * specs (from the earlier Xforce petrol seed) with the 1.6L self-charging full hybrid.
 *
 * Source: "Outlander Sport HEV_Brouchure FAW 20.08.2026.pdf" (client NAS, MITSUBISHI Spec Sheet/) —
 *   p.13 Technical Specifications: engine 1.6L, 79 kW, 134 Nm; electric motor 85 kW, 255 Nm;
 *        hybrid type "Self-charging Full-hybrid"; ground clearance 212 mm; Active Yaw Control.
 *   p.4  System: motor/generator hybrid drive — EV Drive, Hybrid Drive Series (motor),
 *        Hybrid Drive Parallel (engine), regenerative braking. There is no CVT.
 * The brochure does not state the drivetrain or overall dimensions, so those are left as they are.
 *
 *   vehicles (slug outlander-sport): fuel_type, torque, ground_clearance, overview powertrain sentence
 *   vehicle_trims (all of its trims, drafts included): engine, transmission
 *   its PERFORMANCE highlight (block_content_items): description
 *   model year in copy: "The 2025 Mitsubishi Outlander Sport HEV" → 2026 (overview + hero block body)
 * Then clears the Directus data cache. Idempotent ("=" when already current).
 *
 * Seeds carrying the same values (keep in sync): apply-hybrid-vehicle-schema.js,
 * seed-outlander-vehicle.mjs, add-spec-fields.mjs, directus/seeds/vehicle-content-blocks.mjs.
 *
 * Usage:  DRY_RUN=1 node scripts/apply-hev-powertrain-specs.mjs   (print the changes, write nothing)
 *         node scripts/apply-hev-powertrain-specs.mjs
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env, localhost:8055)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SLUG = 'outlander-sport';

export const HEV_VEHICLE = {
	fuel_type: 'Hybrid (HEV)',
	torque: '255 Nm (electric motor) / 134 Nm (1.6L engine)',
	ground_clearance: '212 mm',
};
export const HEV_TRIM = {
	engine: '1.6L HEV Self-Charging Full Hybrid (engine 79 kW / 134 Nm, electric motor 85 kW / 255 Nm)',
	transmission: 'Hybrid Drive System (EV, Series & Parallel modes)',
};
/** Overview: only the powertrain clause changes. */
const OVERVIEW_OLD = 'refined MIVEC 2.0L/2.4L powertrains with smooth CVT';
const OVERVIEW_NEW = 'a 1.6L self-charging full-hybrid powertrain with an 85 kW electric motor';
/** The vehicle is model_year 2026; the seeded copy still said 2025. */
const year2026 = (text) => (text ?? '').replace(/\bThe 2025 Mitsubishi Outlander Sport\b/g, 'The 2026 Mitsubishi Outlander Sport');
const PERFORMANCE_OLD = 'A refined MIVEC engine and smooth CVT deliver confident, efficient performance in every drive mode.';
export const HEV_PERFORMANCE =
	'A 1.6L self-charging full hybrid pairs its engine with an 85 kW electric motor for 255 Nm of instant torque and efficient performance in every drive mode.';

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

// Only run when executed directly (the constants above are importable).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

async function main() {
	const TOKEN = loadToken();
	const BASE = (process.env.DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '');
	const DRY = !!process.env.DRY_RUN;

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
	const search = async (collection, query) => (await api('SEARCH', `/items/${collection}`, { query })).data;

	let changes = 0;
	/** PATCH only the fields that differ, logging old → new. */
	async function sync(collection, row, wanted, label) {
		const data = Object.fromEntries(Object.entries(wanted).filter(([k, v]) => row[k] !== v));
		if (!Object.keys(data).length) return console.log(`= ${label}`);
		changes++;
		for (const [k, v] of Object.entries(data)) console.log(`~ ${DRY ? '[dry] ' : ''}${label}.${k}: ${JSON.stringify(row[k])} → ${JSON.stringify(v)}`);
		if (!DRY) await api('PATCH', `/items/${collection}/${row.id}`, data);
	}

	console.log(`Directus: ${BASE}${DRY ? '  (DRY RUN — nothing is written)' : ''}\n`);

	const [vehicle] = await search('vehicles', {
		filter: { slug: { _eq: SLUG } },
		fields: ['id', 'title', 'overview', 'highlights', 'hero_block', ...Object.keys(HEV_VEHICLE)],
		limit: 1,
	});
	if (!vehicle) throw new Error(`vehicle "${SLUG}" not found`);

	const overview = year2026(vehicle.overview).replace(OVERVIEW_OLD, OVERVIEW_NEW);
	if (/MIVEC|CVT|1\.5L|2\.0L|2\.4L/i.test(overview)) console.log(`! overview still mentions an old powertrain after the rewrite — review it in Directus`);
	await sync('vehicles', vehicle, { ...HEV_VEHICLE, overview }, `vehicles ${SLUG}`);

	const heroId = typeof vehicle.hero_block === 'object' ? vehicle.hero_block?.id : vehicle.hero_block;
	if (heroId) {
		const [hero] = await search('block_hero_custom', { filter: { id: { _eq: heroId } }, fields: ['id', 'body'], limit: 1 });
		if (hero) await sync('block_hero_custom', hero, { body: year2026(hero.body) }, 'hero block');
	}

	const trims = await search('vehicle_trims', { filter: { vehicle: { _eq: vehicle.id } }, fields: ['id', 'trim_name', 'status', ...Object.keys(HEV_TRIM)], limit: -1 });
	for (const trim of trims) await sync('vehicle_trims', trim, HEV_TRIM, `trim "${trim.trim_name}" (${trim.status})`);

	const highlightIds = (vehicle.highlights ?? []).map((h) => (typeof h === 'object' ? h.id : h));
	const highlights = highlightIds.length
		? await search('block_content_items', { filter: { id: { _in: highlightIds } }, fields: ['id', 'tagline', 'description'], limit: -1 })
		: [];
	const performance = highlights.find((h) => h.tagline === 'PERFORMANCE');
	if (!performance) console.log('! PERFORMANCE highlight not found — skipped');
	else if (performance.description !== PERFORMANCE_OLD && performance.description !== HEV_PERFORMANCE)
		console.log(`! PERFORMANCE highlight was edited in Directus — left as is: ${JSON.stringify(performance.description)}`);
	else await sync('block_content_items', performance, { description: HEV_PERFORMANCE }, 'highlight PERFORMANCE');

	if (changes && !DRY) {
		await api('POST', '/utils/cache/clear');
		console.log('\n~ Directus data cache cleared');
	}
	console.log(`\n${DRY ? 'Would update' : 'Updated'} ${changes} record(s).`);
}
