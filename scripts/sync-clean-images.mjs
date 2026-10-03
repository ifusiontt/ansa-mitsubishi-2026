#!/usr/bin/env node
/**
 * sync-clean-images.mjs
 *
 * Pushes locally re-processed images (e.g. renders cleaned of red warning
 * banners in content-raw/optimized/) into Directus, IN PLACE on their existing
 * file ids, so every reference (highlights, colour renders, heroes) picks them up.
 *
 * Source resolution matches restore-directus-uploads.mjs: the seed state files
 * (scripts/.seed-remaining-assets.json, scripts/.seed-outlander-assets.json) map
 * each local path to its file id.
 *
 * A file is synced only when the local source's SHA-256 differs from the binary
 * Directus currently stores in directus/uploads/<filename_disk>, so unchanged
 * files are never touched and the script is idempotent.
 *
 * Why the API (PATCH /files/:id multipart) instead of copying into
 * directus/uploads/ directly: Directus also stores resized variants
 * (<id>__<transform-hash>.<ext>) for every ?width=/format= request (the mega menu,
 * admin thumbnails). A raw copy would leave those serving the old image and leave
 * filesize/metadata stale; a replace through the API deletes the variants and
 * rewrites the original — into the same bind-mounted directus/uploads/ folder.
 *
 * Usage:  node scripts/sync-clean-images.mjs [--dry-run]
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UPLOADS = path.join(ROOT, 'directus', 'uploads');
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

const MODELS_ROOT = path.join(ROOT, 'content-raw/optimized/02_Showroom_Models');
const STATE_SOURCES = [
	{
		file: path.join(__dirname, '.seed-remaining-assets.json'),
		resolve: (key) => {
			const [vehicleKey, ...rest] = key.split('/');
			const assetRoot = { triton: 'Triton', 'xpander-cross': 'Xpander_Cross' }[vehicleKey];
			return assetRoot ? path.join(MODELS_ROOT, assetRoot, ...rest) : null;
		},
	},
	{
		file: path.join(__dirname, '.seed-outlander-assets.json'),
		resolve: (key) => path.join(MODELS_ROOT, 'Outlander_Sport_HEV', key),
	},
];

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

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

/** Stored variants for a file id: the original plus any resized/transcoded copies. */
const variantsOf = (id) => fs.readdirSync(UPLOADS).filter((name) => name.startsWith(id));

// --- id → local source --------------------------------------------------------
const sourceById = new Map();
for (const { file, resolve } of STATE_SOURCES) {
	if (!fs.existsSync(file)) continue;
	for (const [key, value] of Object.entries(JSON.parse(fs.readFileSync(file, 'utf8')))) {
		const id = typeof value === 'string' ? value : value?.id;
		const abs = resolve(key);
		if (id && abs) sourceById.set(id, abs);
	}
}

const { data: files } = await api('SEARCH', '/files', {
	query: {
		filter: { id: { _in: [...sourceById.keys()] } },
		fields: ['id', 'filename_disk', 'filename_download', 'title', 'folder', 'type'],
		limit: -1,
	},
});

const summary = { unchanged: 0, synced: [], skipped: [], failed: [] };

for (const file of files) {
	const src = sourceById.get(file.id);
	const stored = path.join(UPLOADS, file.filename_disk ?? '');
	if (!fs.existsSync(src)) {
		summary.skipped.push(`${file.id} source missing: ${path.relative(ROOT, src)}`);
		continue;
	}
	if (!file.filename_disk || !fs.existsSync(stored)) {
		summary.skipped.push(`${file.id} not in uploads yet (run restore-directus-uploads.mjs)`);
		continue;
	}

	const srcBuf = fs.readFileSync(src);
	if (sha256(srcBuf) === sha256(fs.readFileSync(stored))) {
		summary.unchanged++;
		continue;
	}

	const label = `${file.id} ← ${path.relative(ROOT, src)}`;
	if (DRY_RUN) {
		summary.synced.push(label);
		continue;
	}

	try {
		const ext = path.extname(src).toLowerCase();
		const fd = new FormData();
		fd.append('file', new Blob([srcBuf], { type: MIME[ext] || file.type }), file.filename_download);
		const res = await fetch(`${BASE}/files/${file.id}`, { method: 'PATCH', headers: H, body: fd });
		if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);

		// Keep CMS-curated metadata that a binary replace may re-derive.
		const after = (await res.json()).data ?? {};
		const keep = {};
		if (after.title !== file.title) keep.title = file.title;
		if ((after.folder ?? null) !== (file.folder ?? null)) keep.folder = file.folder;
		if (Object.keys(keep).length) await api('PATCH', `/files/${file.id}`, keep);

		const nowStored = path.join(UPLOADS, after.filename_disk ?? file.filename_disk);
		if (sha256(fs.readFileSync(nowStored)) !== sha256(srcBuf)) throw new Error('stored binary does not match source');
		summary.synced.push(label);
	} catch (error) {
		summary.failed.push(`${file.id}: ${error.message}`);
	}
}

console.log(
	`${DRY_RUN ? '[dry run] ' : ''}tracked files: ${files.length} | unchanged: ${summary.unchanged} | ${DRY_RUN ? 'would sync' : 'synced'}: ${summary.synced.length} | skipped: ${summary.skipped.length} | failed: ${summary.failed.length}`,
);
for (const line of summary.synced) console.log(`  ${DRY_RUN ? 'would sync' : 'synced'} ${line}`);
for (const line of summary.skipped) console.log(`  skipped ${line}`);
for (const line of summary.failed) console.log(`  FAILED ${line}`);
if (summary.failed.length) process.exitCode = 1;

export { variantsOf };
