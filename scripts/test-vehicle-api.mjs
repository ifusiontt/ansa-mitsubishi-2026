#!/usr/bin/env node
/**
 * test-vehicle-api.mjs
 *
 * API contract verification for the Outlander vehicle page.
 *
 * Queries the PUBLIC Directus API (no token — the exact contract the site runs
 * on) for the Outlander by slug with deep relational resolution, plus the Nuxt
 * server API and the SSR page, and asserts the seeded content is complete:
 *
 *   fields (task spec):
 *     ['*', 'colors.*', 'colors.image.*', 'highlights.*',
 *      'highlights.images.directus_files_id.*', 'trims.*', 'hero_block.*']
 *
 * Build notes baked into the assertions (this Directus 12 hybrid build):
 *   - M2M fields expand to JUNCTION ROWS, so the spec path
 *     `highlights.images.directus_files_id.*` is the CORRECT deep path — the
 *     nested file object hangs off the junction FK column.
 *   - `colors.*` / `hero_block.*` return plain uuid strings for O2M file FKs
 *     (the frontend DirectusImage handles both strings and objects).
 *   - A single deep items query must stay well under ~15KB (HTTP 431 guard).
 *
 * Usage:  node scripts/test-vehicle-api.mjs
 * Env:    DIRECTUS_URL (default http://localhost:8055)
 *         NUXT_URL     (default: tries localhost:3000, [::1]:3000, 127.0.0.1:3000)
 *
 * Exit code: 0 = all checks pass, 1 = at least one failure.
 */

const BASE = process.env.DIRECTUS_URL || 'http://localhost:8055';
const VEHICLE_SLUG = '2025-outlander-sport';

// ---------------------------------------------------------------------------
// expected content (must match scripts/seed-outlander-vehicle.mjs)
// ---------------------------------------------------------------------------

const EXPECTED_COLORS = [
	{ sort: 1, name: 'Octane Blue', hex: '#003399' },
	{ sort: 2, name: 'Energetic Yellow', hex: '#E5C100' },
	{ sort: 3, name: 'Diamond White', hex: '#FFFFFF' },
	{ sort: 4, name: 'Black Two-Tone', hex: '#1A1A1A' },
];

const EXPECTED_HIGHLIGHTS = [
	{
		sort: 1,
		tagline: 'PERFORMANCE',
		headline: 'Outdrive The Limits With Prevailing Performance',
		description:
			'A refined MIVEC engine and smooth CVT deliver confident, efficient performance in every drive mode.',
	},
	{
		sort: 2,
		tagline: 'DESIGN',
		headline: 'Outpace The Norms With DazZling Design',
		description:
			'Dynamic Shield design language with sculpted body lines, LED lighting, and bold alloy wheels.',
	},
	{
		sort: 3,
		tagline: 'INTERIOR',
		headline: 'Outstand With Comfort With Uncompromising Safety & Luxury',
		description:
			'A driver-focused cabin with premium materials, Smartphone-link audio, and Mitsubishi Safety Sensing.',
	},
];

const EXPECTED_TRIMS = ['ES', 'SE S-AWC', 'SEL Premium S-AWC'];

// ---------------------------------------------------------------------------
// harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

function check(name, ok, detail = '') {
	if (ok) {
		passed++;
		console.log(`  PASS  ${name}`);
	} else {
		failed++;
		failures.push(name);
		console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
	}
}

const eq = (a, b) => String(a) === String(b);
const eqi = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Extract a file uuid from an O2M (string|object) or M2M junction row value */
function fileUuidFrom(value) {
	if (!value) return null;
	if (typeof value === 'string') return isUuid(value) ? value : null;
	if (typeof value === 'object') {
		if (isUuid(value.id)) return value.id;
		const nested = value.directus_files_id;
		if (nested) return fileUuidFrom(nested);
	}
	return null;
}

async function checkAsset(label, uuid) {
	if (!uuid) {
		check(label, false, 'no file uuid resolved');
		return;
	}
	try {
		const r = await fetch(`${BASE}/assets/${uuid}`);
		const ct = r.headers.get('content-type') || '';
		check(label, r.status === 200 && ct.startsWith('image/'), `status ${r.status}, content-type ${ct || '<none>'}`);
	} catch (e) {
		check(label, false, String(e));
	}
}

// ---------------------------------------------------------------------------
// 1. public deep query — task spec fields list
// ---------------------------------------------------------------------------

console.log('\n── 1. public Directus deep query (task spec fields) ──────────────');
const SPEC_FIELDS = [
	'*',
	'colors.*',
	'colors.image.*',
	'highlights.*',
	'highlights.images.directus_files_id.*',
	'trims.*',
	'hero_block.*',
];
const deepUrl =
	`${BASE}/items/vehicles?filter[slug][_eq]=${encodeURIComponent(VEHICLE_SLUG)}` +
	`&fields=${SPEC_FIELDS.map(encodeURIComponent).join(',')}`;

check('deep query URL under 15KB (HTTP 431 guard)', deepUrl.length < 15000, `len=${deepUrl.length}`);

let res = await fetch(deepUrl);
check('spec fields query → 200 (anonymous)', res.status === 200, `status ${res.status}`);
const vehicle = res.status === 200 ? (await res.json()).data?.[0] : null;
check('vehicle found by slug', !!vehicle, `slug=${VEHICLE_SLUG}`);
if (!vehicle) {
	console.log('\nFATAL: vehicle not found — cannot continue');
	process.exit(1);
}

// scalar contract
const scalars = [
	['title', 'Mitsubishi Outlander Sport'],
	['slug', VEHICLE_SLUG],
	['model_year', '2025'],
	['status', 'published'],
	['category', null],
	['body_type', null],
	['fuel_type', null],
	['seating_capacity', null],
	['starting_price', null],
	['warranty', null],
	['overview', null],
	['brochure_url', null],
	['tagline', null],
	['hero_headline', null],
	['primary_color', '#003399'],
];
for (const [field, expected] of scalars) {
	if (expected == null) {
		check(`scalar ${field} present`, vehicle[field] != null && vehicle[field] !== '');
	} else {
		check(`scalar ${field} = ${expected}`, eqi(vehicle[field], expected), `got ${JSON.stringify(vehicle[field])}`);
	}
}

// ---------------------------------------------------------------------------
// 2. hero_block
// ---------------------------------------------------------------------------

console.log('\n── 2. hero_block ─────────────────────────────────────────────────');
const hero = vehicle.hero_block;
check('hero_block resolved (object)', !!hero && typeof hero === 'object', JSON.stringify(hero)?.slice(0, 80));
for (const f of ['title', 'headline', 'highlight_keyword', 'body']) {
	check(`hero_block.${f} non-empty`, !!(hero?.[f] ?? ''), JSON.stringify(hero?.[f])?.slice(0, 60));
}
check('hero_block.media is a file ref', fileUuidFrom(hero?.media) != null, JSON.stringify(hero?.media)?.slice(0, 60));
await checkAsset('hero asset serves as image (anonymous)', fileUuidFrom(hero?.media));

// ---------------------------------------------------------------------------
// 3. colors
// ---------------------------------------------------------------------------

console.log('\n── 3. colors ─────────────────────────────────────────────────────');
const colors = [...(vehicle.colors ?? [])].sort((a, b) => a.sort - b.sort);
check(`colors: ${EXPECTED_COLORS.length} swatches`, colors.length === EXPECTED_COLORS.length, `got ${colors.length}`);
EXPECTED_COLORS.forEach((exp, i) => {
	const c = colors[i];
	check(`color #${exp.sort} name = ${exp.name}`, c && eqi(c.color_name, exp.name), `got ${c?.color_name}`);
	check(`color #${exp.sort} hex = ${exp.hex}`, c && eqi(c.hex_code, exp.hex), `got ${c?.hex_code}`);
	check(`color #${exp.sort} has image`, fileUuidFrom(c?.image) != null, JSON.stringify(c?.image)?.slice(0, 60));
	void exp;
});
for (const c of colors) {
	await checkAsset(`color image "${c?.color_name}" serves (anonymous)`, fileUuidFrom(c?.image));
}

// ---------------------------------------------------------------------------
// 4. highlights
// ---------------------------------------------------------------------------

console.log('\n── 4. highlights ─────────────────────────────────────────────────');
const highlights = [...(vehicle.highlights ?? [])].sort((a, b) => a.sort - b.sort);
check(`highlights: ${EXPECTED_HIGHLIGHTS.length} blocks`, highlights.length === EXPECTED_HIGHLIGHTS.length, `got ${highlights.length}`);
EXPECTED_HIGHLIGHTS.forEach((exp, i) => {
	const h = highlights[i];
	check(`highlight #${exp.sort} tagline = ${exp.tagline}`, h && eqi(h.tagline, exp.tagline), `got ${h?.tagline}`);
	check(`highlight #${exp.sort} headline matches`, h && eqi(h.headline, exp.headline), `got ${h?.headline}`);
	check(`highlight #${exp.sort} description matches`, h && eqi(h.description, exp.description), `got ${(h?.description || '').slice(0, 60)}…`);
	check(`highlight #${exp.sort} status = published`, h && eqi(h.status, 'published'), `got ${h?.status}`);
	const imgUuid = h?.images?.[0] ? fileUuidFrom(h.images[0]) : null;
	check(`highlight #${exp.sort} image resolves via images.directus_files_id.*`, imgUuid != null, JSON.stringify(h?.images)?.slice(0, 80));
	void exp;
});
for (const h of highlights) {
	const imgUuid = h?.images?.[0] ? fileUuidFrom(h.images[0]) : null;
	await checkAsset(`highlight #${h?.sort} image "${h?.tagline}" serves (anonymous)`, imgUuid);
}

// ---------------------------------------------------------------------------
// 5. trims
// ---------------------------------------------------------------------------

console.log('\n── 5. trims ──────────────────────────────────────────────────────');
const trims = [...(vehicle.trims ?? [])].sort((a, b) => a.trim_name.localeCompare(b.trim_name));
check(`trims: ${EXPECTED_TRIMS.length} linked`, trims.length === EXPECTED_TRIMS.length, `got ${trims.length}`);
const trimNames = trims.map((t) => t.trim_name).sort();
check(
	'trim names = ES / SE S-AWC / SEL Premium S-AWC',
	JSON.stringify(trimNames) === JSON.stringify([...EXPECTED_TRIMS].sort()),
	`got ${JSON.stringify(trimNames)}`,
);
for (const t of trims) {
	check(`trim "${t?.trim_name}" specs present`, !!(t?.engine && t?.transmission && t?.drivetrain), JSON.stringify(t?.engine));
	const feats = Array.isArray(t?.key_features) ? t.key_features : [];
	check(`trim "${t?.trim_name}" key_features ≥ 3 {value}`, feats.length >= 3 && feats.every((f) => f && typeof f.value === 'string'), `got ${feats.length}`);
}

// ---------------------------------------------------------------------------
// 6. Nuxt server API + SSR page
// ---------------------------------------------------------------------------

console.log('\n── 6. Nuxt server API + SSR page ─────────────────────────────────');

async function nuxtFetch(pathname) {
	const candidates = process.env.NUXT_URL
		? [process.env.NUXT_URL]
		: ['http://localhost:3000', 'http://[::1]:3000', 'http://127.0.0.1:3000'];
	let lastErr;
	for (const base of candidates) {
		try {
			const r = await fetch(base + pathname);
			return { base, r };
		} catch (e) {
			lastErr = e;
		}
	}
	throw lastErr ?? new Error('no Nuxt candidate reachable');
}

try {
	const { r } = await nuxtFetch(`/api/vehicles/${encodeURIComponent(VEHICLE_SLUG)}`);
	const body = r.status === 200 ? await r.json() : null;
	check('Nuxt /api/vehicles/:slug → 200', r.status === 200, `status ${r.status}`);
	if (body) {
		check('Nuxt api: hero_block + colors + highlights + trims present', !!(body.hero_block && body.colors?.length && body.highlights?.length && body.trims?.length));
		const nuxtImg = body.highlights?.[0]?.images?.[0];
		check(
			'Nuxt api: highlight images resolve to file objects (server field fix)',
			fileUuidFrom(nuxtImg) != null,
			JSON.stringify(nuxtImg)?.slice(0, 80),
		);
	}
} catch (e) {
	check('Nuxt /api/vehicles/:slug → 200', false, String(e));
}

try {
	const { r } = await nuxtFetch(`/showroom/${encodeURIComponent(VEHICLE_SLUG)}`);
	const html = r.status === 200 ? await r.text() : '';
	check('Nuxt SSR page /showroom/:slug → 200', r.status === 200, `status ${r.status}`);
	check('SSR page renders vehicle title', html.includes('Mitsubishi Outlander Sport'));
	check('SSR page renders highlights section', html.includes('OUTDRIVE THE LIMITS WITH PREVAILING PERFORMANCE') || html.includes('Outdrive The Limits With Prevailing Performance'));
} catch (e) {
	check('Nuxt SSR page /showroom/:slug → 200', false, String(e));
}

// ---------------------------------------------------------------------------
// summary
// ---------------------------------------------------------------------------

console.log('\n── summary ───────────────────────────────────────────────────────');
console.log(`  ${passed} passed, ${failed} failed`);
if (failures.length) {
	console.log('  failed checks:');
	for (const f of failures) console.log(`    - ${f}`);
	process.exit(1);
}
console.log('  ALL CHECKS PASSED');
