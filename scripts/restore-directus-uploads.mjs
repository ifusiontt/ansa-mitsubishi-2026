#!/usr/bin/env node
/**
 * restore-directus-uploads.mjs
 *
 * Re-populates missing Directus file binaries IN PLACE (same file ids), for when
 * `directus_files` rows survive in Postgres but the uploads storage was lost —
 * e.g. the CMS container was recreated before ./uploads was bind-mounted.
 * Keeping the ids means every existing reference (vehicles.hero_block.media,
 * vehicle_colors.image, menu_image, globals.logo, …) keeps working.
 *
 * Source resolution, per file id:
 *   1. the seed state files, which record "<local path> → file id":
 *        scripts/.seed-remaining-assets.json  (seed-remaining-vehicles.mjs)
 *        scripts/.seed-outlander-assets.json  (seed-outlander-vehicle.mjs)
 *   2. otherwise a unique filename match under content-raw/ (preferring an
 *      exact filesize match when several files share the name).
 *
 * For each file whose /assets/:id does not load, the binary is replaced via
 * PATCH /files/:id (multipart); title/folder are re-applied if Directus changes them.
 * Files that already load are skipped, so the script is safe to re-run.
 *
 * Usage:  node scripts/restore-directus-uploads.mjs [--dry-run]
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

function loadToken() {
	const envTok = process.env.DIRECTUS_TOKEN;
	if (envTok) return envTok;
	const envFile = path.join(ROOT, 'directus', '.env');
	const m = fs.existsSync(envFile) && fs.readFileSync(envFile, 'utf8').match(/^ADMIN_TOKEN=(.*)$/m);
	if (!m) {
		console.error('ERROR: no token — set DIRECTUS_TOKEN or ADMIN_TOKEN in directus/.env');
		process.exit(1);
	}
	return m[1].trim();
}

const TOKEN = loadToken();
const BASE = process.env.DIRECTUS_URL || 'http://localhost:8055';
const H = { Authorization: `Bearer ${TOKEN}` };

const RAW_ROOT = path.join(ROOT, 'content-raw');
const MODELS_ROOT = path.join(RAW_ROOT, 'optimized/02_Showroom_Models');

/** State file → how its keys map onto local paths (mirrors each seed script's config). */
const STATE_SOURCES = [
	{
		file: path.join(__dirname, '.seed-remaining-assets.json'),
		// keys are "<vehicle key>/<path relative to that vehicle's assetRoot>"
		resolve: (key) => {
			const [vehicleKey, ...rest] = key.split('/');
			const assetRoot = { triton: 'Triton', 'xpander-cross': 'Xpander_Cross' }[vehicleKey];
			return assetRoot ? path.join(MODELS_ROOT, assetRoot, ...rest) : null;
		},
	},
	{
		file: path.join(__dirname, '.seed-outlander-assets.json'),
		// keys are paths relative to the Outlander Sport asset root
		resolve: (key) => path.join(MODELS_ROOT, 'Outlander_Sport_HEV', key),
	},
];

const MIME = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.gif': 'image/gif',
	'.avif': 'image/avif',
};

async function api(method, urlPath, body) {
	const res = await fetch(BASE + urlPath, {
		method,
		headers: { ...H, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`${method} ${urlPath} → ${res.status} ${text.slice(0, 300)}`);
	return text ? JSON.parse(text) : null;
}

// --- 1. id → local source ------------------------------------------------------
const sourceById = new Map();
for (const { file, resolve } of STATE_SOURCES) {
	if (!fs.existsSync(file)) continue;
	for (const [key, value] of Object.entries(JSON.parse(fs.readFileSync(file, 'utf8')))) {
		const id = typeof value === 'string' ? value : value?.id;
		const abs = resolve(key);
		if (id && abs) sourceById.set(id, abs);
	}
}

let nameIndex = null; // basename → [abs paths] under content-raw, built lazily
function* walk(dir) {
	let entries = [];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		const abs = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(abs);
		else if (entry.isFile()) yield abs;
	}
}
function findByName(filename, filesize) {
	if (!nameIndex) {
		nameIndex = new Map();
		for (const abs of walk(RAW_ROOT)) {
			const name = path.basename(abs);
			nameIndex.set(name, [...(nameIndex.get(name) ?? []), abs]);
		}
	}
	const candidates = nameIndex.get(filename) ?? [];
	if (candidates.length <= 1) return { abs: candidates[0] ?? null, candidates };
	const sameSize = candidates.filter((abs) => fs.statSync(abs).size === Number(filesize));
	if (sameSize.length === 1) return { abs: sameSize[0], candidates };
	// Byte-identical copies (e.g. the same logo in two export folders) are interchangeable.
	const [first, ...rest] = candidates.map((abs) => fs.readFileSync(abs));
	const identical = rest.every((buf) => buf.equals(first));
	return { abs: identical ? candidates[0] : null, candidates };
}

// --- 2. restore ----------------------------------------------------------------
const { data: files } = await api('SEARCH', '/files', {
	query: { fields: ['id', 'filename_download', 'filesize', 'title', 'folder', 'type'], limit: -1 },
});

const summary = { ok: 0, restored: 0, unresolved: [], failed: [] };

for (const file of files) {
	const head = await fetch(`${BASE}/assets/${file.id}`, { method: 'HEAD', headers: H });
	if (head.ok) {
		summary.ok++;
		continue;
	}

	let abs = sourceById.get(file.id);
	let via = 'state';
	if (!abs || !fs.existsSync(abs)) {
		const found = findByName(file.filename_download, file.filesize);
		abs = found.abs;
		via = 'name';
		if (!abs) {
			summary.unresolved.push(
				`${file.id} ${file.filename_download} (${found.candidates.length ? `${found.candidates.length} ambiguous matches` : 'no local source'})`,
			);
			continue;
		}
	}

	const size = fs.statSync(abs).size;
	const sizeNote = file.filesize && size !== Number(file.filesize) ? ` [size ${size} ≠ recorded ${file.filesize}]` : '';
	const label = `${file.id} ← ${path.relative(ROOT, abs)} (${via})${sizeNote}`;

	if (DRY_RUN) {
		console.log(`would restore ${label}`);
		summary.restored++;
		continue;
	}

	try {
		const ext = path.extname(abs).toLowerCase();
		const fd = new FormData();
		fd.append('file', new Blob([fs.readFileSync(abs)], { type: MIME[ext] || file.type || 'application/octet-stream' }), file.filename_download);
		const res = await fetch(`${BASE}/files/${file.id}`, { method: 'PATCH', headers: H, body: fd });
		if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);

		// A binary replace can re-derive metadata from the upload; keep the CMS-curated values.
		const after = (await res.json()).data ?? {};
		const keep = {};
		if (after.title !== file.title) keep.title = file.title;
		if ((after.folder ?? null) !== (file.folder ?? null)) keep.folder = file.folder;
		if (Object.keys(keep).length) await api('PATCH', `/files/${file.id}`, keep);

		const check = await fetch(`${BASE}/assets/${file.id}`, { method: 'HEAD', headers: H });
		if (!check.ok) throw new Error(`asset still ${check.status} after upload`);
		console.log(`restored ${label}`);
		summary.restored++;
	} catch (error) {
		summary.failed.push(`${file.id} ${file.filename_download}: ${error.message}`);
	}
}

console.log(
	`\n${DRY_RUN ? '[dry run] ' : ''}files: ${files.length} | already loading: ${summary.ok} | ${DRY_RUN ? 'would restore' : 'restored'}: ${summary.restored} | unresolved: ${summary.unresolved.length} | failed: ${summary.failed.length}`,
);
for (const line of summary.unresolved) console.log(`  unresolved: ${line}`);
for (const line of summary.failed) console.log(`  FAILED: ${line}`);
if (summary.failed.length) process.exitCode = 1;
