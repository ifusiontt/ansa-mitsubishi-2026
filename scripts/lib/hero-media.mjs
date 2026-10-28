/**
 * Vehicle hero photography — the single source of truth for which still each
 * vehicle's `block_hero_custom.media` points at.
 *
 * Shared by scripts/sync-vehicle-hero-media.mjs (one-off bind) and the vehicle
 * seeds (seed-outlander-vehicle.mjs, seed-remaining-vehicles.mjs), so a reseed
 * re-binds the same files instead of reverting to the studio renders.
 *
 * Files are the client's EX FRONT lifestyle cuts, optimised by
 * scripts/optimize-lifestyle-images.py into nuxt/public/images/models/<slug>/lifestyle
 * (scripts/upload-lifestyle-assets.mjs uploads the same files and sets their focal
 * points). Uploads are idempotent: an existing Directus file with the same filename
 * and size is reused.
 */

import fs from 'node:fs';
import path from 'node:path';

/** vehicle slug → hero still (repo-relative) + Directus folder name. */
export const HERO_MEDIA = {
	'outlander-sport': { file: 'nuxt/public/images/models/outlander-sport/lifestyle/outlander-sport-ex-front.webp', folder: 'Outlander Sport' },
	triton: { file: 'nuxt/public/images/models/triton/lifestyle/triton-ex-front.webp', folder: 'Triton' },
	'xpander-cross': { file: 'nuxt/public/images/models/xpander-cross/lifestyle/xpander-cross-ex-front.webp', folder: 'Xpander Cross' },
};

/** MIME from the file's magic bytes — older stills carried WebP data behind a .png name. */
function sniffMime(buf) {
	if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
	if (buf[0] === 0x89 && buf.subarray(1, 4).toString('ascii') === 'PNG') return 'image/png';
	if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
	return 'application/octet-stream';
}

async function request(base, headers, method, p, body) {
	const res = await fetch(base + p, {
		method,
		headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers,
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const data = await res.json().catch(() => null);
	if (!res.ok) throw new Error(`${method} ${p} → ${res.status}: ${JSON.stringify(data)?.slice(0, 300)}`);
	return data;
}

/**
 * Directus file id of `slug`'s hero still, uploading it (into the vehicle's folder) when no
 * same-name, same-size file exists. Returns null for slugs without a mapped still.
 *
 * @param {{ base: string, headers: Record<string, string>, root: string, slug: string }} opts
 */
export async function ensureHeroMedia({ base, headers, root, slug }) {
	const entry = HERO_MEDIA[slug];
	if (!entry) return null;

	const absPath = path.join(root, entry.file);
	const name = path.basename(absPath);
	const buf = fs.readFileSync(absPath);

	const found = await request(base, headers, 'SEARCH', '/files', {
		query: { filter: { filename_download: { _eq: name } }, fields: ['id', 'filesize'], sort: ['uploaded_on'], limit: -1 },
	});
	const existing = found.data.find((f) => Number(f.filesize) === buf.length);
	if (existing) return existing.id;

	const fd = new FormData();
	fd.append('file', new Blob([buf], { type: sniffMime(buf) }), name);
	fd.append('title', path.basename(name, path.extname(name)));
	const res = await fetch(`${base}/files`, { method: 'POST', headers, body: fd });
	const data = await res.json();
	if (!res.ok) throw new Error(`upload ${name} → ${res.status}: ${JSON.stringify(data)?.slice(0, 300)}`);
	const id = data.data?.id ?? data.id;

	// This build ignores the `folder` form field on upload, so file it with a follow-up PATCH.
	const folders = await request(base, headers, 'GET', `/folders?filter[name][_eq]=${encodeURIComponent(entry.folder)}&fields=id&limit=1`);
	const folderId = folders.data?.[0]?.id;
	if (folderId) await request(base, headers, 'PATCH', `/files/${id}`, { folder: folderId });

	console.log(`hero media: uploaded ${name} (${id})`);
	return id;
}
