#!/usr/bin/env node
/**
 * upload-brochures.mjs — official 2026 spec sheets / brochures → Directus → showroom "Download Brochure".
 *
 *   1. Schema: `vehicles.brochure`, a single-file field (M2O → directus_files) with public read.
 *      seed-permissions.py and apply-hybrid-vehicle-schema.js list it too, so a permissions reseed keeps it.
 *   2. Uploads the PDFs compressed by scripts/optimize-brochures.sh (.tmp/brochures/) into each
 *      model's Directus folder, as "Mitsubishi-<Model>-2026-….pdf". An existing upload of the same
 *      name is reused; when the local PDF differs in size (re-compressed), its content is replaced
 *      in place so the file id — and every link to it — stays the same.
 *   3. Sets each vehicle's `brochure` to its file and `brochure_url` to the public asset URL
 *      (<DIRECTUS_URL>/assets/<id>), replacing the dead ansamitsubishi.com/brochures/ links. The
 *      frontend prefers `brochure`; `brochure_url` keeps any client that only reads the URL working.
 *   4. Checks each brochure downloads anonymously as application/pdf, then clears the data cache.
 *
 * Idempotent: a second run reports "=" for everything.
 *
 * Usage:  scripts/optimize-brochures.sh && node scripts/upload-brochures.mjs
 *         DRY_RUN=1 node scripts/upload-brochures.mjs     (print the changes, write nothing)
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env, localhost:8055).
 *         DIRECTUS_URL must be the PUBLIC Directus origin: it is written into brochure_url.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PDF_DIR = path.join(HERE, '..', '.tmp', 'brochures');

/** vehicle slug → compressed PDF (scripts/optimize-brochures.sh), download name, title, Directus folder */
const BROCHURES = {
	triton: {
		source: 'triton-spec-sheet-2026.pdf',
		name: 'Mitsubishi-Triton-2026-Spec-Sheet.pdf',
		title: 'Mitsubishi Triton 2026 Spec Sheet',
		folder: 'Triton',
	},
	'outlander-sport': {
		source: 'outlander-sport-hev-brochure-2026.pdf',
		name: 'Mitsubishi-Outlander-Sport-HEV-2026-Brochure.pdf',
		title: 'Mitsubishi Outlander Sport HEV 2026 Brochure',
		folder: 'Outlander Sport',
	},
	'xpander-cross': {
		source: 'xpander-cross-spec-sheet-2026.pdf',
		name: 'Mitsubishi-Xpander-Cross-2026-Spec-Sheet.pdf',
		title: 'Mitsubishi Xpander Cross 2026 Spec Sheet',
		folder: 'Xpander Cross',
	},
};

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

/** multipart upload (POST /files) or in-place content replacement (PATCH /files/:id) */
async function sendFile(method, urlPath, title, buffer, name) {
	const form = new FormData();
	form.append('title', title);
	form.append('file', new Blob([buffer], { type: 'application/pdf' }), name);
	const res = await fetch(BASE + urlPath, { method, headers: { Authorization: `Bearer ${TOKEN}` }, body: form });
	const text = await res.text();
	if (!res.ok) throw new Error(`${method} ${urlPath} (${name}) → ${res.status} ${text.slice(0, 300)}`);
	return JSON.parse(text).data;
}

let changes = 0;
async function write(label, action) {
	changes++;
	if (DRY) return console.log(`~ [dry] ${label}`);
	const result = await action();
	console.log(`~ ${label}`);
	return result;
}

console.log(`Directus: ${BASE}${DRY ? '  (DRY RUN — nothing is written)' : ''}\n`);

// every compressed PDF must exist before anything is written
for (const spec of Object.values(BROCHURES)) {
	const abs = path.join(PDF_DIR, spec.source);
	if (!fs.existsSync(abs)) {
		console.error(`ERROR: ${abs} missing — run scripts/optimize-brochures.sh first`);
		process.exit(1);
	}
}

// --- 1. schema + public read -------------------------------------------------------
// GET /fields/vehicles/<missing> answers 500 (not 404) on this Directus build, so check the field list.
const hasBrochureField = async () => (await api('GET', '/fields/vehicles')).data.some((f) => f.field === 'brochure');
if (await hasBrochureField()) {
	console.log('= vehicles.brochure field exists');
} else {
	await write('vehicles.brochure file field + relation created', async () => {
		await api('POST', '/fields/vehicles', {
			field: 'brochure',
			type: 'uuid',
			meta: {
				interface: 'file',
				special: ['file'],
				display: 'file',
				width: 'half',
				note: 'Spec sheet / brochure PDF behind the showroom "Download Brochure" buttons.',
			},
			schema: {},
		});
		await api('POST', '/relations', {
			collection: 'vehicles',
			field: 'brochure',
			related_collection: 'directus_files',
			schema: { on_delete: 'SET NULL' },
		});
	});
}

const { data: policies } = await api('GET', '/policies?fields=id,name&limit=-1');
const publicPolicy = policies.find((p) => p.name === '$t:public_label' || /public/i.test(p.name ?? ''));
if (!publicPolicy) throw new Error('public policy not found');
const vehiclesPerm = (
	await api('SEARCH', '/permissions', {
		query: {
			filter: { policy: { _eq: publicPolicy.id }, collection: { _eq: 'vehicles' }, action: { _eq: 'read' } },
			fields: ['id', 'fields'],
			limit: 1,
		},
	})
).data[0];
if (!vehiclesPerm) throw new Error('public vehicles read permission not found — run seed-permissions.py first');
const granted = vehiclesPerm.fields ?? [];
if (granted.includes('*') || granted.includes('brochure')) console.log('= public read on vehicles.brochure already granted');
else await write('public read granted on vehicles.brochure', () => api('PATCH', `/permissions/${vehiclesPerm.id}`, { fields: [...granted, 'brochure'] }));

// --- 2. uploads ------------------------------------------------------------------
const { data: folders } = await api('GET', '/folders?fields=id,name&limit=-1');

async function ensureFile(spec) {
	const buffer = fs.readFileSync(path.join(PDF_DIR, spec.source));
	const folderId = folders.find((f) => f.name === spec.folder)?.id ?? null;
	const wanted = { title: spec.title, ...(folderId && { folder: folderId }) };
	const kb = `${Math.round(buffer.length / 1024)} KB`;

	const existing = (
		await api('SEARCH', '/files', {
			query: { filter: { filename_download: { _eq: spec.name } }, fields: ['id', 'filesize', 'title', 'folder'], sort: ['uploaded_on'], limit: 1 },
		})
	).data[0];

	if (!existing) {
		if (DRY) {
			await write(`${spec.name} uploaded (${kb})`, () => {});
			return null;
		}
		const file = await write(`${spec.name} uploaded (${kb})`, () => sendFile('POST', '/files', spec.title, buffer, spec.name));
		// This build ignores `folder` in the upload form — set it with a follow-up PATCH.
		await api('PATCH', `/files/${file.id}`, wanted);
		return file.id;
	}

	if (Number(existing.filesize) !== buffer.length) {
		await write(`${spec.name} content replaced (${existing.filesize} → ${buffer.length} bytes, id kept)`, () =>
			sendFile('PATCH', `/files/${existing.id}`, spec.title, buffer, spec.name),
		);
	} else {
		console.log(`= ${spec.name} (${existing.id}, ${kb})`);
	}
	const patch = Object.fromEntries(Object.entries(wanted).filter(([key, value]) => existing[key] !== value));
	if (Object.keys(patch).length) await write(`${spec.name}: ${Object.keys(patch).join(', ')} updated`, () => api('PATCH', `/files/${existing.id}`, patch));
	return existing.id;
}

// --- 3. link vehicles ----------------------------------------------------------------
const brochureFieldExists = await hasBrochureField();
const { data: vehicles } = await api('SEARCH', '/items/vehicles', {
	query: { fields: ['id', 'slug', 'title', 'brochure_url', ...(brochureFieldExists ? ['brochure'] : [])], limit: -1 },
});

const linked = [];
for (const [slug, spec] of Object.entries(BROCHURES)) {
	const vehicle = vehicles.find((v) => v.slug === slug);
	if (!vehicle) {
		console.log(`! vehicle "${slug}" not found — skipped`);
		continue;
	}
	const fileId = await ensureFile(spec);
	if (!fileId) {
		console.log(`~ [dry] ${slug}: brochure → (new upload), brochure_url → ${BASE}/assets/<new id>`);
		continue;
	}
	const url = `${BASE}/assets/${fileId}`;
	const data = {};
	if (vehicle.brochure !== fileId) data.brochure = fileId;
	if (vehicle.brochure_url !== url) data.brochure_url = url;
	if (!Object.keys(data).length) console.log(`= ${slug} brochure linked`);
	else
		await write(`${slug}: ${Object.keys(data).join(' + ')} → ${fileId} (was ${vehicle.brochure_url ?? 'none'})`, () =>
			api('PATCH', `/items/vehicles/${vehicle.id}`, data),
		);
	linked.push({ slug, url });
}

// --- 4. verify + cache ---------------------------------------------------------------
if (!DRY) {
	if (changes) {
		await api('POST', '/utils/cache/clear');
		console.log('\n~ Directus data cache cleared');
	}
	console.log('\nAnonymous download check:');
	let failed = 0;
	for (const { slug, url } of linked) {
		const res = await fetch(url, { headers: { Range: 'bytes=0-4' } });
		const type = res.headers.get('content-type') ?? '';
		const head = res.ok ? await res.text() : '';
		const ok = res.ok && type.startsWith('application/pdf') && head.startsWith('%PDF');
		if (!ok) failed++;
		console.log(`  ${ok ? 'PASS' : 'FAIL'} ${slug} ${res.status} ${type} ${url}`);
	}
	if (failed) process.exitCode = 1;
}
console.log(`\n${DRY ? 'Would apply' : 'Applied'} ${changes} change(s).`);
