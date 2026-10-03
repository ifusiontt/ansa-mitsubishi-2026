#!/usr/bin/env node
/**
 * vehicle-colors.mjs
 *
 * Seeds the `vehicle_colors` rows for the Mitsubishi Triton and Xpander Cross
 * showroom pages: exact paint names, hex codes, sort order and the banner-
 * cleaned WebP render for each colour (Triton front-left, Xpander Cross side).
 *
 * Behaviour (idempotent, re-runnable):
 *   1. Deletes orphan vehicle_colors rows (vehicle_id AND color_name null) —
 *      leftovers from the POST-search probe that this build misroutes to
 *      /items create — and dedupes any (vehicle, colour-name) collisions
 *      (keeps the lowest id, refreshes the vehicles.colors junction, since
 *      row deletion does not cascade to the M2A on this build).
 *   2. For each colour, ensures the WebP asset exists in Directus:
 *        - looks the file up by filename_download
 *        - if found, compares the served bytes (sha256) with the local,
 *          banner-cleaned file; re-uploads when they differ (i.e. the CMS
 *          still holds the old bannered copy)
 *        - assigns the vehicle folder via PATCH /files/:id (this build
 *          ignores the `folder` upload form field — see Outlander seed)
 *      Missing local assets (Triton X37 / W81 have no renders on disk)
 *      leave the row's image untouched.
 *   3. Upserts the colour row keyed by (vehicle_id, colour name):
 *        - existing row  -> PATCH hex_code / image / sort
 *        - missing row   -> POST create, then PATCH vehicle_id (this build
 *          IGNORES m2o fields in create payloads) + verify the link
 *   4. Renumber non-spec rows of the two vehicles to sort 5,6,7… so the
 *      spec palette (sort 1-4) stays collision-free.
 *   5. Prints a verification table and HEAD-checks every linked /assets URL.
 *
 * Usage:  node directus/seeds/vehicle-colors.mjs
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.DIRECTUS_URL || 'http://localhost:8055';

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
const H = { Authorization: `Bearer ${TOKEN}` };

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

async function api(method, urlPath, body, headers) {
	const res = await fetch(BASE + urlPath, {
		method,
		headers: headers || { ...H, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`${method} ${urlPath} → ${res.status} ${text.slice(0, 300)}`);
	return text ? JSON.parse(text) : null;
}

// GET-only reads (this build misroutes POST /items to create — no SEARCH use).
// NOTE: this instance's response cache is unreliable for LIST reads —
// filtered or unfiltered list GETs can be served stale even with buster
// params (it once handed back rows that had already been deleted). Single
// ITEM reads (/items/:collection/:id) have been consistently fresh. Rule:
//   - list reads only to discover row IDS (they lag, but ids persist)
//   - every identity decision goes through a single-item read
const items = (collection, params) => api('GET', `/items/${collection}${params}`);
const itemsAll = (collection, fields) =>
	items(collection, `?fields=${encodeURIComponent(fields.join(','))}&limit=-1&cache=false&x=${Date.now()}`);
const colorRow = (id, fields) =>
	api('GET', `/items/vehicle_colors/${id}?fields=${encodeURIComponent((fields || ['id', 'vehicle_id', 'color_name', 'hex_code', 'sort', 'image']).join(','))}&cache=false&x=${Date.now()}`);
const colorsByVehicle = async (vehicleId, fields) => { const all = await itemsAll('vehicle_colors', fields); return { data: all.data.filter((r) => r.vehicle_id === vehicleId) }; };

// ------------------------------------------------------------------ data

const V = 'content-raw/optimized/02_Showroom_Models';

const SPEC = {
	// vehicle slug -> ordered colour palette (task order = sort order)
	triton: [
		{ name: 'Graphite Gray', hex: '#4A4D52', image: `${V}/Triton/Triton_Front_Left/26MY_TR_THA_DCAB_Prime_2WD_AT_front-left_U28.webp` },
		{ name: 'Blade Silver', hex: '#B3B7BB', image: `${V}/Triton/Triton_Front_Left/26MY_TR_THA_DCAB_Prime_2WD_AT_front-left_U33.webp` },
		{ name: 'Jet Black Mica', hex: '#1C1D21', image: `${V}/Triton/Triton_Front_Left/26MY_TR_THA_DCAB_Prime_2WD_AT_front-left_X37.webp` },
		{ name: 'White Diamond', hex: '#F2F4F5', image: `${V}/Triton/Triton_Front_Left/26MY_TR_THA_DCAB_Prime_2WD_AT_front-left_W81.webp` },
	],
	'xpander-cross': [
		{ name: 'Sunrise Orange', hex: '#C8501E', image: `${V}/Xpander_Cross/Xpander Cross_RHD_Side/26MY_XS_Exterior_side_RHD_X3M_Mid-Resolution-JPEG-rev-1.webp` },
		{ name: 'Blade Silver Metallic', hex: '#B2B6BA', image: `${V}/Xpander_Cross/Xpander Cross_RHD_Side/26MY_XS_Exterior_side_RHD_U33_Mid-Resolution-JPEG-rev-1.webp` },
		{ name: 'Quartz White Pearl', hex: '#F0F2F3', image: `${V}/Xpander_Cross/Xpander Cross_RHD_Side/26MY_XS_Exterior_side_RHD_W81_Mid-Resolution-JPEG-rev-1.webp` },
		{ name: 'Jet Black Mica', hex: '#18191B', image: `${V}/Xpander_Cross/Xpander Cross_RHD_Side/26MY_XS_Exterior_side_RHD_X37_Mid-Resolution-JPEG-rev-1.webp` },
	],
};

const FOLDER_NAMES = { triton: 'Triton', 'xpander-cross': 'Xpander Cross' };
const ROOT = path.join(HERE, '..', '..');

// ------------------------------------------------------------------ steps

async function main() {
	// 0. resolve vehicle ids + folders (client-side slug match: string filters are unreliable here)
	const vehicles = await itemsAll('vehicles', ['id', 'slug']);
	const vehicleId = new Map(vehicles.data.map((v) => [v.slug, v.id]));
	for (const slug of Object.keys(SPEC)) {
		if (!vehicleId.has(slug)) throw new Error(`vehicle not found: ${slug}`);
	}
	const folders = await api('GET', '/folders?fields=id,name&limit=-1');
	const folderId = new Map(folders.data.map((f) => [f.name, f.id]));
	for (const slug of Object.keys(SPEC)) {
		if (!folderId.has(FOLDER_NAMES[slug])) throw new Error(`folder not found: ${FOLDER_NAMES[slug]}`);
	}
	console.log('vehicles:', [...vehicleId].map(([s, i]) => `${s}=${i}`).join(', '));

	// 1. delete orphan rows (vehicle_id null AND colour name null)
	const all = await itemsAll('vehicle_colors', ['id', 'vehicle_id', 'color_name', 'hex_code', 'sort', 'image']);
	const orphans = all.data.filter((r) => !r.vehicle_id && !r.color_name);
	for (const o of orphans) {
		await api('DELETE', `/items/vehicle_colors/${o.id}`);
		console.log(`- deleted orphan row id=${o.id}`);
	}

	// 1b. dedupe: one row per (vehicle_id, colour name). Keeps the LOWEST id
	//     (oldest — most likely referenced by vehicles.colors junctions) and
	//     re-attaches the surviving ids afterwards, because row deletion on
	//     this build does NOT cascade to the M2A junction.
	const groups = new Map();
	for (const r of all.data) {
		if (!r.vehicle_id || !r.color_name) continue;
		const key = `${r.vehicle_id}:${r.color_name}`;
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(r);
	}
	const dedupedVehicles = new Set();
	for (const rows of groups.values()) {
		if (rows.length < 2) continue;
		rows.sort((a, b) => a.id - b.id);
		for (const dup of rows.slice(1)) {
			// confirm via fresh single-item read before deleting (list read may lag)
			let fresh = null;
			try { fresh = await colorRow(dup.id); } catch { /* already gone */ }
			if (fresh && fresh.vehicle_id === rows[0].vehicle_id && fresh.color_name === rows[0].color_name) {
				await api('DELETE', `/items/vehicle_colors/${dup.id}`);
				console.log(`- deleted duplicate row id=${dup.id} "${dup.color_name}" (vehicle ${dup.vehicle_id})`);
				dedupedVehicles.add(rows[0].vehicle_id);
			}
		}
	}
	if (dedupedVehicles.size > 0) {
		for (const vid of dedupedVehicles) {
			// verify each id fresh — a stale list read must not put dead ids into the junction
			const ids = [];
			for (const r of (await itemsAll('vehicle_colors', ['id', 'vehicle_id'])).data) {
				if (r.vehicle_id !== vid) continue;
				try {
					const row = (await colorRow(r.id, ['id', 'vehicle_id'])).data;
					if (row && row.vehicle_id === vid) ids.push(row.id);
				} catch { /* gone */ }
			}
			if (ids.length === 0) {
				console.log(`  ! vehicles/${vid}: no verified rows (stale read?) — junction left alone`);
				continue;
			}
			await api('PATCH', `/items/vehicles/${vid}`, { colors: ids });
			console.log(`  # vehicles/${vid}.colors junction refreshed (${ids.length} ids)`);
		}
	}

	// 2+3. per-vehicle palette
	for (const [slug, palette] of Object.entries(SPEC)) {
		const vid = vehicleId.get(slug);
		const fid = folderId.get(FOLDER_NAMES[slug]);
		console.log(`\n=== ${slug} (vehicle ${vid}, folder ${fid}) ===`);

		for (let i = 0; i < palette.length; i++) {
			const spec = palette[i];
			const sort = i + 1;
			const localPath = path.join(ROOT, spec.image);
			let fileId = null;

			if (fs.existsSync(localPath)) {
				fileId = await ensureFile(spec.image, fid);
			} else {
				console.log(`  ! ${spec.name}: local asset missing (${spec.image}) — image left untouched`);
			}

			// upsert row keyed by (vehicle_id, colour name).
			// Candidate ids come from TWO fresh sources — the list read AND the
			// vehicle's own colors junction (single-item read, always fresh) —
			// because list reads on this instance go stale/empty after write
			// bursts. Every candidate is confirmed with a single-item read.
			const listCandidates = (await colorsByVehicle(vid, ['id', 'color_name'])).data;
			const junction = (await api('GET', `/items/vehicles/${vid}?fields=colors&x=${Date.now()}`)).data;
			const junctionIds = (junction.colors || []).map((r) => (typeof r === 'object' ? r.id : r)).filter(Boolean);
			const candidates = [...new Map([...listCandidates, ...junctionIds.map((id) => ({ id, color_name: null }))].map((r) => [r.id, r])).values()];

			let existing = null;
			for (const c of candidates) {
				try {
					const fresh = (await colorRow(c.id)).data;
					if (fresh && fresh.vehicle_id === vid && fresh.color_name === spec.name) existing = fresh;
				} catch { /* row vanished mid-race — try the next candidate */ }
				if (existing) break;
			}

			const patch = { hex_code: spec.hex, sort };
			if (fileId) patch.image = fileId;
			if (existing) {
				const row = existing;
				const changed = row.hex_code !== spec.hex || (fileId && row.image !== fileId) || row.sort !== sort;
				if (changed) await api('PATCH', `/items/vehicle_colors/${row.id}`, patch);
				console.log(`  ~ ${spec.name}: row ${row.id} ${changed ? 'updated' : 'ok (already at spec)'} → ${spec.hex} sort=${sort} image=${fileId || '(none)'}`);
			} else if (listCandidates.length === 0 && junctionIds.length === 0) {
				// both sources empty on a known-non-empty collection = stale-cache
				// signature; creating now would blind-duplicate — refuse instead.
				console.log(`  ! ${spec.name}: no trustworthy row view (list + junction both empty) — create skipped`);
			} else {
				// NOTE: this build IGNORES m2o fields in create payloads
				// (vehicle_id arrives null) — the link is established via a
				// follow-up PATCH and verified.
				const created = await api('POST', '/items/vehicle_colors?fields=id', { color_name: spec.name, ...patch });
				await api('PATCH', `/items/vehicle_colors/${created.data.id}`, { vehicle_id: vid, color_name: spec.name, ...patch });
				const linked = (await colorRow(created.data.id, ['id', 'vehicle_id', 'color_name'])).data;
				if (linked && linked.vehicle_id !== vid) {
					await api('DELETE', `/items/vehicle_colors/${created.data.id}`); // don't leave a null-vehicle orphan
					throw new Error(`could not link row ${created.data.id} to vehicle ${vid} (create+PATCH) — deleted the orphan; re-run after cache settles`);
				}
				console.log(`  + ${spec.name}: created row ${created.data.id} → ${spec.hex} sort=${sort} image=${fileId || '(none)'}`);
				// self-heal: if a same-name row materialised meanwhile, keep the lowest id
				const scan = candidates
					.map((c) => c.id)
					.filter((id) => id !== created.data.id);
				for (const id of scan) {
					try {
						const other = (await colorRow(id, ['id', 'vehicle_id', 'color_name'])).data;
						if (other && other.vehicle_id === vid && other.color_name === spec.name && id < created.data.id) {
							await api('PATCH', `/items/vehicle_colors/${id}`, { vehicle_id: vid, ...patch }); // move spec state to the kept row
							await api('DELETE', `/items/vehicle_colors/${created.data.id}`);
							console.log(`  ! ${spec.name}: duplicate race detected — dropped fresh row ${created.data.id}, kept ${id} with spec values`);
							break;
						}
					} catch { /* gone */ }
				}
			}
		}
	}

	// 4. renumber non-spec rows (sort 5,6,7… per vehicle, existing order)
	for (const [slug] of Object.entries(SPEC)) {
		const vid = vehicleId.get(slug);
		const specNames = new Set(SPEC[slug].map((c) => c.name));
		const rows = (await colorsByVehicle(vid, ['id', 'color_name', 'sort']))
			.data.filter((r) => !specNames.has(r.color_name))
			.sort((a, b) => (a.sort ?? 1e9) - (b.sort ?? 1e9) || a.id - b.id);
		for (let i = 0; i < rows.length; i++) {
			const want = 5 + i; // spec palette owns 1-4; the rest follows in existing order
			if (rows[i].sort !== want) {
				await api('PATCH', `/items/vehicle_colors/${rows[i].id}`, { sort: want });
				console.log(`  # ${slug}: "${rows[i].color_name}" sort ${rows[i].sort} → ${want}`);
			}
		}
	}

	// 5. verification — ids from list ∪ vehicle junction, values via single-item reads
	console.log('\n=== verification: /items/vehicle_colors ===');
	const final = { data: [] };
	for (const [slug] of Object.entries(SPEC)) {
		const vid = vehicleId.get(slug);
		const listIds = (await colorsByVehicle(vid, ['id'])).data.map((r) => r.id);
		const jn = (await api('GET', `/items/vehicles/${vid}?fields=colors&x=${Date.now()}`)).data;
		const junctionIds = (jn.colors || []).map((r) => (typeof r === 'object' ? r.id : r)).filter(Boolean);
		const ids = [...new Set([...listIds, ...junctionIds])];
		for (const id of ids) {
			try {
				const fresh = (await colorRow(id)).data;
				if (fresh) final.data.push(fresh);
			} catch { /* row vanished mid-race */ }
		}
	}
	final.data.sort((a, b) => a.vehicle_id - b.vehicle_id || (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id);
	let assetOk = 0;
	const assetTotal = new Set();
	for (const r of final.data) {
		const veh = [...vehicleId.entries()].find(([, id]) => id === r.vehicle_id)?.[0];
		console.log(
			`  veh=${veh.padEnd(14)} sort=${String(r.sort).padStart(2)} id=${String(r.id).padStart(3)} ${r.hex_code}  ${(r.image || '—').padEnd(36)}  ${r.color_name}`,
		);
		if (r.image) assetTotal.add(r.image);
	}
	for (const fileId of assetTotal) {
		const res = await fetch(`${BASE}/assets/${fileId}`, { method: 'HEAD' });
		const ct = res.headers.get('content-type') || '';
		const ok = res.status === 200 && ct.startsWith('image/');
		if (ok) assetOk++;
		console.log(`  asset ${fileId} → ${res.status} ${ct} ${ok ? 'OK' : 'FAIL'}`);
	}
	console.log(`\n${final.data.length} colour rows, ${assetOk}/${assetTotal.size} linked assets serving 200 image/*`);
	if (assetOk !== assetTotal.size) process.exit(1);
}

/** Ensure the local (cleaned) asset exists in Directus; returns the file id. */
async function ensureFile(relPath, folderId) {
	const localPath = path.join(ROOT, relPath);
	const fileName = path.basename(relPath);
	const localBuf = fs.readFileSync(localPath);
	const localHash = sha256(localBuf);

	// look up by download name (string `_eq` unreliable here → client-side match)
	const found = (await api('GET', `/files?fields=id%2Cfilename_download&limit=-1&cache=false&x=${Date.now()}`))
		.data.filter((f) => f.filename_download === fileName);

	if (found.length > 0) {
		for (const f of found) {
			const res = await fetch(`${BASE}/assets/${f.id}`, { headers: H });
			if (!res.ok) continue;
			const hash = sha256(Buffer.from(await res.arrayBuffer()));
			if (hash === localHash) {
				await api('PATCH', `/files/${f.id}`, { folder: folderId });
				console.log(`  = ${fileName}: already in CMS (id ${f.id}, bytes match) — folder set`);
				return f.id;
			}
		}
		console.log(`  ! ${fileName}: CMS copy differs from cleaned local file — uploading fresh bytes`);
	}

	const mime = fileName.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';
	const fd = new FormData();
	fd.append('file', new File([localBuf], fileName, { type: mime }));
	const up = await fetch(`${BASE}/files`, {
		method: 'POST',
		headers: { ...H }, // no Content-Type: boundary set by FormData
		body: fd,
	});
	const upText = await up.text();
	if (!up.ok) throw new Error(`upload ${fileName} → ${up.status} ${upText.slice(0, 300)}`);
	const fileId = JSON.parse(upText).data.id;
	await api('PATCH', `/files/${fileId}`, { folder: folderId });
	console.log(`  + ${fileName}: uploaded (id ${fileId}) — folder set`);
	return fileId;
}

main().catch((e) => {
	console.error(`FATAL: ${e.message}`);
	process.exit(1);
});
