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
 * Also covers the homepage media contract (sections 7–8): the transparent
 * menu_image cutouts on every published fleet vehicle, the 3-still hero
 * gallery, the ASC spotlight image, and the absence of the retired blocks.
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

// 2026 2-tone palette — each swatch shows its own Front-Left 2-tone render
const EXPECTED_COLORS = [
	{ sort: 1, code: 'X4Y', name: 'Energetic Yellow', hex: '#C9A332' },
	{ sort: 2, code: 'X5P', name: 'Red Metallic', hex: '#B92428' },
	{ sort: 3, code: 'X8W', name: 'White Solid', hex: '#E8E9EC' },
	{ sort: 4, code: 'JH3', name: 'Gray Metallic', hex: '#4A4E52' },
	{ sort: 5, code: 'XEU', name: 'Silver Metallic', hex: '#A3A5AE' },
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
	// 4–6: added by directus/seeds/vehicle-content-blocks.mjs
	{
		sort: 4,
		tagline: 'TECHNOLOGY',
		headline: 'Driver-Focused Digital Cockpit',
		description: '8-inch SDA touchscreen with Apple CarPlay & Android Auto integration.',
	},
	{
		sort: 5,
		tagline: 'COMFORT',
		headline: 'Ergonomic Seating & Space',
		description: 'Heat Guard synthetic leather seats engineered for tropical climate comfort.',
	},
	{
		sort: 6,
		tagline: 'HANDLING',
		headline: 'Active Yaw Control (AYC)',
		description: 'Monitors cornering force and applies brake vectoring for optimal road traction.',
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

/**
 * The colour-stage rendition (the exact transform HomeColorPreview / the showroom request)
 * serves anonymously as a WebP that carries alpha (VP8X alpha flag, or the VP8L alpha bit).
 */
async function checkTransparentWebp(label, uuid) {
	if (!uuid) {
		check(label, false, 'no file uuid resolved');
		return;
	}
	try {
		// mirrors VEHICLE_RENDER_QUERY in nuxt/app/utils/directus-file.ts
		const r = await fetch(`${BASE}/assets/${uuid}?width=1536&quality=82&format=webp`);
		const buf = Buffer.from(await r.arrayBuffer());
		const isWebp = buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
		const chunk = buf.subarray(12, 16).toString('latin1');
		const alpha = (chunk === 'VP8X' && (buf[20] & 0x10) !== 0) || (chunk === 'VP8L' && ((buf.readUInt32LE(21) >>> 28) & 1) === 1);
		check(label, r.status === 200 && isWebp && alpha, `status ${r.status}, webp=${isWebp}, chunk ${chunk}, alpha=${alpha}`);
	} catch (e) {
		check(label, false, String(e));
	}
}

/** Serves anonymously as a PNG whose IHDR colour type carries alpha (4 = grey+alpha, 6 = RGBA). */
async function checkTransparentPng(label, uuid) {
	if (!uuid) {
		check(label, false, 'no file uuid resolved');
		return;
	}
	try {
		const r = await fetch(`${BASE}/assets/${uuid}`);
		const buf = Buffer.from(await r.arrayBuffer());
		const isPng = buf.subarray(1, 4).toString('latin1') === 'PNG';
		check(label, r.status === 200 && isPng && [4, 6].includes(buf[25]), `status ${r.status}, png=${isPng}, colour type ${buf[25]}`);
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
	['primary_color', EXPECTED_COLORS[0].hex],
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
	check(`color #${exp.sort} code = ${exp.code}`, c && eq(c.color_code, exp.code), `got ${c?.color_code}`);
	check(
		`color #${exp.sort} image is the ${exp.code} transparent 2-tone render`,
		c?.image?.filename_download === `outlander_front_left_${exp.code}.webp`,
		`got ${c?.image?.filename_download}`,
	);
	void exp;
});
for (const c of colors) {
	await checkTransparentWebp(`color image "${c?.color_name}" serves as transparent WebP (anonymous)`, fileUuidFrom(c?.image));
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
// 7. fleet menu cutouts ("Find Your Mitsubishi" + header mega menu)
// ---------------------------------------------------------------------------

console.log('\n── 7. fleet menu cutouts ─────────────────────────────────────────');
const EXPECTED_CUTOUTS = {
	'2025-outlander-sport': 'outlander_menu_cutout.png',
	triton: 'triton_menu_cutout.png',
	'xpander-cross': 'xpander_menu_cutout.png',
};
res = await fetch(`${BASE}/items/vehicles?filter[status][_eq]=published&fields=slug,menu_image.id,menu_image.filename_download&limit=-1`);
check('published fleet query → 200 (anonymous)', res.status === 200, `status ${res.status}`);
const fleet = res.status === 200 ? (await res.json()).data : [];
for (const [slug, filename] of Object.entries(EXPECTED_CUTOUTS)) {
	const v = fleet.find((row) => row.slug === slug);
	check(`${slug}: menu_image = ${filename}`, v?.menu_image?.filename_download === filename, `got ${v?.menu_image?.filename_download}`);
	await checkTransparentPng(`${slug}: cutout serves as transparent PNG (anonymous)`, fileUuidFrom(v?.menu_image));
}

// Showroom palettes: one transparent front-left WebP per paint (a single camera angle per vehicle)
const EXPECTED_PALETTES = {
	// only the two Triton paints with renders
	triton: [
		{ code: 'U28', name: 'Graphite Gray', file: 'triton_front_left_U28.webp' },
		{ code: 'U33', name: 'Blade Silver', file: 'triton_front_left_U33.webp' },
	],
	'xpander-cross': ['X3M', 'X3N', 'X4C', 'U28', 'U33', 'W81', 'X37'].map((code) => ({
		code,
		name: {
			X3M: 'Sunrise Orange Metallic',
			X3N: 'Quartz White Pearl / Black Roof',
			X4C: 'Green Bronze Metallic',
			U28: 'Graphite Gray Metallic',
			U33: 'Blade Silver Metallic',
			W81: 'Quartz White Pearl',
			X37: 'Jet Black Mica',
		}[code],
		file: `xpander_front_left_${code}.webp`,
	})),
};
for (const [slug, palette] of Object.entries(EXPECTED_PALETTES)) {
	res = await fetch(
		`${BASE}/items/vehicles?filter[slug][_eq]=${slug}&fields=colors.sort,colors.color_code,colors.color_name,colors.image.id,colors.image.filename_download`,
	);
	const rows = res.status === 200 ? [...((await res.json()).data?.[0]?.colors ?? [])].sort((a, b) => a.sort - b.sort) : [];
	check(
		`${slug}: palette = ${palette.map((c) => c.code).join(' / ')} only`,
		JSON.stringify(rows.map((c) => c.color_code)) === JSON.stringify(palette.map((c) => c.code)),
		`got ${JSON.stringify(rows.map((c) => `${c.color_code ?? '-'} ${c.color_name}`))}`,
	);
	for (const [i, exp] of palette.entries()) {
		const c = rows[i];
		check(`${slug} ${exp.code}: name = ${exp.name}`, c && eqi(c.color_name, exp.name), `got ${c?.color_name}`);
		check(`${slug} ${exp.code}: image = ${exp.file}`, c?.image?.filename_download === exp.file, `got ${c?.image?.filename_download}`);
		await checkTransparentWebp(`${slug} ${exp.code}: render serves as transparent WebP (anonymous)`, fileUuidFrom(c?.image));
	}
}

// ---------------------------------------------------------------------------
// 8. homepage media (hero gallery, ASC spotlight, retired blocks)
// ---------------------------------------------------------------------------

console.log('\n── 8. homepage media ─────────────────────────────────────────────');
const EXPECTED_HERO_STILLS = ['outlander_hero_banner.png', 'triton_hero_banner.png', 'xpander_hero_forest.png'];
const EXPECTED_ASC_IMAGE = 'outlander_asc_curve_clean.png';
const RETIRED_HEADLINES = ['Mitsubishi 2026 — Built for Trinidad & Tobago', 'Five Models. Every Kind of Drive.'];

const homeFields = [
	'blocks.collection',
	'blocks.item:block_hero_custom.media_gallery.directus_files_id.id',
	'blocks.item:block_hero_custom.media_gallery.directus_files_id.filename_download',
	'blocks.item:block_hero_custom.media_gallery.directus_files_id.width',
	'blocks.item:block_hero_custom.media_gallery.directus_files_id.height',
	'blocks.item:block_content_block.tagline',
	'blocks.item:block_content_block.items.headline',
	'blocks.item:block_content_block.items.description',
	'blocks.item:block_content_block.items.images.directus_files_id.id',
	'blocks.item:block_content_block.items.images.directus_files_id.filename_download',
	'blocks.item:block_hero.headline',
	'blocks.item:block_richtext.headline',
];
res = await fetch(`${BASE}/items/pages?filter[permalink][_eq]=/&fields=${homeFields.map(encodeURIComponent).join(',')}&limit=1`);
check('Home page query → 200 (anonymous)', res.status === 200, `status ${res.status}`);
const homeBlocks = res.status === 200 ? ((await res.json()).data?.[0]?.blocks ?? []) : [];

const heroItem = homeBlocks.find((b) => b.collection === 'block_hero_custom')?.item;
const stills = (heroItem?.media_gallery ?? []).map((j) => j?.directus_files_id).filter(Boolean);
check(
	'hero gallery = outlander / triton / xpander stills (in order)',
	JSON.stringify(stills.map((f) => f.filename_download)) === JSON.stringify(EXPECTED_HERO_STILLS),
	`got ${JSON.stringify(stills.map((f) => f.filename_download))}`,
);
for (const f of stills) {
	check(`hero still ${f.filename_download} is 1920x800`, f.width === 1920 && f.height === 800, `got ${f.width}x${f.height}`);
	await checkAsset(`hero still ${f.filename_download} serves (anonymous)`, f.id);
}

const ascItem = homeBlocks
	.filter((b) => b.collection === 'block_content_block' && b.item?.tagline === 'TECHNOLOGY')
	.flatMap((b) => b.item.items ?? [])
	.find((i) => i?.headline === 'Introducing Active Stability Control (ASC)');
check('ASC spotlight item on Home', !!ascItem);
const ascFile = ascItem?.images?.[0]?.directus_files_id;
check(`ASC image = ${EXPECTED_ASC_IMAGE}`, ascFile?.filename_download === EXPECTED_ASC_IMAGE, `got ${ascFile?.filename_download}`);
await checkAsset('ASC image serves (anonymous)', ascFile?.id);
check(
	'ASC copy describes ASC, not AYC',
	/\bstab(le|ility)\b/i.test(ascItem?.description ?? '') && !/\bAYC\b/.test(ascItem?.description ?? ''),
	(ascItem?.description ?? '').slice(0, 80),
);

const headlinesOnHome = homeBlocks.map((b) => b.item?.headline).filter(Boolean);
for (const headline of RETIRED_HEADLINES) {
	check(`retired block "${headline}" not on Home`, !headlinesOnHome.includes(headline));
}

const HERO_SLIDE_IMAGES = [
	'/images/main-hero/2025-outlander-sport-glamour-1-2048x1447.webp',
	'/images/main-hero/24MY_TRITON_ALL-NEW_LHD_MV_Intro_P_proxy.png',
	'/images/main-hero/2023-xpander-cross-glamour3-1536x1025.jpg',
];
// Only the active slide's CTA is server-rendered; the rest swap in client-side.
const HERO_SLIDE_LINKS = ['/showroom/outlander-sport'];
const ASC_SPOTLIGHT_IMAGE = '/images/features/22MY_XS_RHD_MV_SlippyCorner-1536x1024.jpg';

try {
	const { r } = await nuxtFetch('/');
	const html = r.status === 200 ? await r.text() : '';
	check('Nuxt SSR homepage / → 200', r.status === 200, `status ${r.status}`);
	// Hero slides and the ASC spotlight still ship from nuxt/public, not Directus.
	for (const still of HERO_SLIDE_IMAGES) check(`SSR homepage renders hero slide ${still}`, html.includes(still));
	for (const to of HERO_SLIDE_LINKS) check(`SSR homepage links hero CTA ${to}`, html.includes(`href="${to}"`));
	check('SSR homepage renders ASC spotlight image', html.includes(ASC_SPOTLIGHT_IMAGE));
	check('SSR homepage drops retired blocks', !RETIRED_HEADLINES.some((h) => html.includes(h)));
} catch (e) {
	check('Nuxt SSR homepage / → 200', false, String(e));
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
