#!/usr/bin/env node
/**
 * verify-parts-service-submissions.mjs — read-only check that the latest
 * service / parts submissions in Directus carry every metadata field
 * (written by nuxt/server/api/forms/parts-service.post.ts).
 *
 * Usage:  node scripts/verify-parts-service-submissions.mjs
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(ROOT, 'directus', '.env');
const TOKEN =
	process.env.DIRECTUS_TOKEN ||
	(fs.existsSync(envFile) && fs.readFileSync(envFile, 'utf8').match(/^ADMIN_TOKEN=(.*)$/m)?.[1].trim());
if (!TOKEN) {
	console.error('ERROR: no token — set DIRECTUS_TOKEN or ADMIN_TOKEN in directus/.env');
	process.exit(1);
}
const BASE = process.env.DIRECTUS_URL || 'http://localhost:8055';

const KEYS = {
	common: ['first_name', 'last_name', 'phone', 'email', 'vehicle_model', 'registration_number', 'dealer_id'],
	service: ['service_type', 'vehicle_mileage', 'request_date'],
	parts: ['vehicle_year', 'chassis_number', 'part_number', 'part_description'],
};
const ALL = [...KEYS.common, ...KEYS.service, ...KEYS.parts];

let failed = false;
for (const type of ['service', 'parts']) {
	const res = await fetch(`${BASE}/items/form_submissions`, {
		method: 'SEARCH',
		headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: {
				filter: { submission_type: { _eq: type } },
				fields: ['id', 'timestamp', 'submission_type', 'metadata', 'form.title'],
				sort: ['-timestamp'],
				limit: 1,
			},
		}),
	});
	if (!res.ok) throw new Error(`SEARCH form_submissions → ${res.status} ${(await res.text()).slice(0, 200)}`);
	const row = (await res.json()).data[0];
	if (!row) {
		console.log(`✗ ${type}: no submissions found`);
		failed = true;
		continue;
	}
	const meta = row.metadata ?? {};
	const missingKeys = ALL.filter((k) => !(k in meta));
	const emptyRequired = [...KEYS.common, ...KEYS[type]].filter((k) => k !== 'part_number' && (meta[k] === null || meta[k] === ''));
	const ok = !missingKeys.length && !emptyRequired.length;
	failed ||= !ok;
	console.log(`${ok ? '✓' : '✗'} ${type}: ${row.id} · form "${row.form?.title}" · ${row.timestamp}`);
	if (missingKeys.length) console.log(`   missing keys: ${missingKeys.join(', ')}`);
	if (emptyRequired.length) console.log(`   empty values: ${emptyRequired.join(', ')}`);
	console.log(JSON.stringify(meta, null, 2).replace(/^/gm, '   '));
}
process.exit(failed ? 1 : 0);
