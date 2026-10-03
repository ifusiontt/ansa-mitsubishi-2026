#!/usr/bin/env node
/**
 * _reconcile-colors.mjs — one-off reconciliation (re-runnable).
 *
 * This Directus build serves stale/empty cached LIST reads intermittently,
 * and a parallel seeding race produced duplicate vehicle_colors rows
 * (95-110) next to the canonical rows. Canonical rule: for each
 * (vehicle_id, color_name) keep the LOWEST id; delete the rest; refresh the
 * vehicles.colors M2A junction (row deletion does NOT cascade to it here).
 * Identity is always confirmed with a fresh single-item read.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.DIRECTUS_URL || 'http://localhost:8055';
const env = fs.readFileSync(path.join(HERE, '..', '.env'), 'utf8');
const TOKEN = env.match(/^ADMIN_TOKEN=(.*)$/m)[1].trim();
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const VEHICLES = [7, 8]; // triton, xpander-cross
// canonical rows (lowest id per colour): spec palette + pre-existing non-spec rows
const EXPECTED = {
	7: [59, 60, 77, 78, 56, 57, 58], // triton
	8: [62, 63, 65, 66, 61, 64], // xpander-cross
};

async function api(method, urlPath, body) {
	const res = await fetch(BASE + urlPath, { method, headers: H, body: body === undefined ? undefined : JSON.stringify(body) });
	const text = await res.text();
	if (!res.ok) throw new Error(`${method} ${urlPath} → ${res.status} ${text.slice(0, 300)}`);
	return text ? JSON.parse(text) : null;
}
const freshRow = (id) =>
	api('GET', `/items/vehicle_colors/${id}?fields=id%2Cvehicle_id%2Ccolor_name%2Chex_code%2Csort%2Cimage&x=${Date.now()}`);

// discover ids via list read (may lag, but ids persist), then confirm each fresh
const list = await api('GET', `/items/vehicle_colors?fields=id&limit=-1&x=${Date.now()}`);
// group by (vehicle, name) using fresh reads
const byGroup = new Map();
for (const id of list.data.map((r) => r.id)) {
	let row;
	try {
		row = (await freshRow(id)).data;
	} catch {
		continue; // 404 — already gone
	}
	if (!row || !VEHICLES.includes(row.vehicle_id)) continue;
	const key = `${row.vehicle_id}:${row.color_name}`;
	if (!byGroup.has(key)) byGroup.set(key, []);
	byGroup.get(key).push(row);
}

let deleted = 0;
for (const [key, rows] of byGroup.entries()) {
	if (rows.length < 2) continue;
	rows.sort((a, b) => a.id - b.id);
	const keep = rows[0];
	for (const dup of rows.slice(1)) {
		let fresh;
		try {
			fresh = (await freshRow(dup.id)).data;
		} catch {
			continue;
		}
		if (fresh && fresh.vehicle_id === keep.vehicle_id && fresh.color_name === keep.color_name) {
			await api('DELETE', `/items/vehicle_colors/${dup.id}`);
			console.log(`- deleted duplicate ${dup.id} "${dup.color_name}" (veh ${dup.vehicle_id}) — keeping ${keep.id}`);
			deleted++;
		}
	}
}

// junction refresh — deterministic canonical set, each id verified fresh
for (const vid of VEHICLES) {
	const ids = [];
	for (const id of EXPECTED[vid]) {
		let row;
		try {
			row = (await freshRow(id)).data;
		} catch {
			row = null;
		}
		if (row && row.vehicle_id === vid) ids.push(id);
		else console.log(`  ! expected row ${id} not found / not veh ${vid} — excluded from junction`);
	}
	await api('PATCH', `/items/vehicles/${vid}`, { colors: ids });
	console.log(`  # vehicles/${vid}.colors junction set to (${ids.length} ids: ${ids.join(',')})`);
}

// final state — fresh read of the canonical rows
const final = [];
for (const vid of VEHICLES) {
	for (const id of EXPECTED[vid]) {
		let row;
		try {
			row = (await freshRow(id)).data;
		} catch {
			continue;
		}
		if (row && row.vehicle_id === vid) final.push(row);
	}
}
final.sort((a, b) => a.vehicle_id - b.vehicle_id || (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id);
console.log(`\ndeleted ${deleted} duplicates. Final rows for triton (7) + xpander-cross (8):`);
for (const r of final) {
	console.log(`  veh=${r.vehicle_id} sort=${String(r.sort).padStart(2)} id=${String(r.id).padStart(3)} ${r.hex_code}  ${r.image ? 'img=' + r.image : 'img=—'}  ${r.color_name}`);
}
