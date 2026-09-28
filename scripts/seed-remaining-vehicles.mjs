#!/usr/bin/env node
/**
 * seed-remaining-vehicles.mjs
 *
 * Seeds the three remaining showroom vehicles in Directus with complete
 * model specs, colours, highlights, and trim data sourced from the official
 * 2026 PDF spec sheets (content-raw/MITSUBISHI Spec Sheet/):
 *
 *   - Mitsubishi Triton        (slug: triton)          [4-page spec sheet]
 *   - Mitsubishi Xpander Cross (slug: xpander-cross)   [2-page spec + 8-page brochure]
 *   - Mitsubishi Xpander       (slug: xpander)         [1-page spec, existing vehicle id 5]
 *
 * The PDFs are image-only (no text layer); the spec data was extracted by
 * rendering pages and OCR (RapidOCR) on 2026-09-27. Task-specified copy
 * (overviews, colour names/hexes, highlight headlines, trim names) is
 * authoritative and used verbatim; supporting detail (engine figures,
 * dimensions, equipment) comes from the OCR'd sheets.
 *
 * What this script does per vehicle:
 *   1. Ensures the vehicles row (creates Triton + Xpander Cross, updates Xpander).
 *   2. Uploads the model's optimised renders to a same-named Directus folder
 *      (Triton, Xpander Cross) — web formats only (jpg/jpeg/webp, no .psd/.tif).
 *   3. Creates/links a hero block (block_hero_custom, hero_immersive/dark_industrial).
 *   4. Upserts vehicle_colors (idempotent by vehicle + color_name), linking
 *      exterior renders where a matching paint-code render exists.
 *   5. Creates a "Key Highlights" parent block (block_content_block) plus one
 *      block_content_items row per highlight, each linked to an image through
 *      the block_content_items_files junction (this Directus build expands M2M
 *      to JUNCTION rows — see AGENTS.md known gotchas).
 *   6. Upserts vehicle_trims with engine / transmission / drivetrain / price /
 *      key_features (in the {value} repeater shape).
 *
 * Paint-code → render mapping (verified against the brochure VARIATIONS page
 * and HSV sampling of the renders):
 *   C31 = Green Bronze Metallic   W81 = Quartz White Pearl
 *   U33 = Blade Silver Metallic   U28 = Graphite Gray Metallic
 *   X37 = Jet Black Mica          M13 = Sunrise Orange Metallic
 *   Triton renders only exist for U28 + U33 (other colours fall back to the
 *   hero image on the frontend, which handles null color images).
 *
 * Idempotent: safe to re-run. Files are tracked in scripts/.seed-remaining-assets.json
 * (this build 403s GET /items/directus_files, so the state file is the source
 * of truth for "already uploaded"); colors by (vehicle, color_name); highlights
 * by (vehicle, sort); trims by (vehicle, trim_name); hero blocks and content
 * blocks are looked up before creating.
 *
 * Usage:  node scripts/seed-remaining-vehicles.mjs
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------

function loadToken() {
	const envTok = process.env.DIRECTUS_TOKEN;
	if (envTok) return envTok;
	const envFile = path.join(ROOT, 'directus', '.env');
	const m = fs.readFileSync(envFile, 'utf8').match(/^ADMIN_TOKEN=(.*)$/m);
	if (!m) {
		console.error('ERROR: no token — set DIRECTUS_TOKEN or ADMIN_TOKEN in directus/.env');
		process.exit(1);
	}
	return m[1].trim();
}

const TOKEN = loadToken();
const BASE = process.env.DIRECTUS_URL || 'http://localhost:8055';
const H = { Authorization: `Bearer ${TOKEN}` };

const OPT_ROOT = path.join(ROOT, 'content-raw/optimized/02_Showroom_Models');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MIME = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
};

// ---------------------------------------------------------------------------
// vehicle data (task spec + OCR'd PDF spec sheets)
// ---------------------------------------------------------------------------

const VEHICLES = [
	{
		key: 'triton',
		slug: 'triton',
		title: 'Mitsubishi Triton',
		status: 'published',
		model_year: 2026,
		category: 'Double Cab 4x4 Pickup',
		body_type: 'Pickup Truck',
		fuel_type: 'Turbo Diesel',
		seating_capacity: 5,
		starting_price: 295000,
		warranty: '5-Year / 100,000 km Manufacturer Warranty',
		primary_color: '#4A3B32',
		brochure_url: 'https://ansamitsubishi.com/brochures/2026-mitsubishi-triton.pdf',
		tagline: 'The All-New 4x4 Legend',
		hero_headline: 'Built For The Toughest Terrain',
		overview:
			'The all-new 2026 Mitsubishi Triton is an All-New 2.4L Turbo Diesel pickup with Super Select 4WD-II and 3,500 kg towing capacity. Its 2,442 cc intercooled turbo diesel delivers 135 kW at 3,500 rpm and 430 N-m of torque through a 6-speed automatic, with 265/60R18 all-season tyres on 18-inch alloy wheels and a 75-litre tank for work and adventure. Inside, the 9-inch Smartphone-link Display Audio system with Apple CarPlay & Android Auto, available 360° camera, and leather or fabric seating make every journey as capable as it is comfortable.',
		folder: 'Triton',
		assetRoot: 'Triton',
		hero: {
			title: 'Triton — Hero',
			highlight_keyword: 'Triton',
			headline: 'Drive Your Ambition',
			body: 'All-New 2.4L Turbo Diesel pickup with Super Select 4WD-II and 3,500 kg towing capacity.',
			media: 'Triton_Front_Left/26MY_TR_THA_DCAB_Prime_2WD_AT_front-left_U28_Mid-Resolution-JPEG-rev-1.jpeg',
		},
		colors: [
			{ sort: 1, color_name: 'Deep Bronze Metallic', hex_code: '#4A3B32' },
			{ sort: 2, color_name: 'Impuls Blue', hex_code: '#0047AB' },
			{ sort: 3, color_name: 'Yamabuki Orange Metallic', hex_code: '#D86B27' },
			{ sort: 4, color_name: 'Graphite Gray Metallic', hex_code: '#4A4D4E', image: 'Triton_Front_Left/26MY_TR_THA_DCAB_Prime_2WD_AT_front-left_U28_Mid-Resolution-JPEG-rev-1.jpeg' },
			{ sort: 5, color_name: 'Blade Silver Metallic', hex_code: '#C0C0C0', image: 'Triton_Front_Left/26MY_TR_THA_DCAB_Prime_2WD_AT_front-left_U33_Mid-Resolution-JPEG-rev-1.jpeg' },
		],
		blockTagline: 'Triton Key Highlights',
		highlights: [
			{
				sort: 1,
				tagline: 'PERFORMANCE',
				headline: 'Super Select 4WD-II',
				description:
					'Exceptional all-terrain capability with four selectable modes — including 4H full-time 4WD for stability on wet surfaces and outstanding cornering on dry pavement — plus a rear differential lock.',
				image: 'Triton_Interior/26MY_TR_THA_DCAB_Prime_4WD_MT_instrument-panel_Mid-Resolution-JPEG-rev-1.jpeg',
			},
			{
				sort: 2,
				tagline: 'POWER',
				headline: '2.4L MIVEC Turbo Diesel (135 kW / 430 Nm)',
				description:
					'Experience powerful acceleration and responsive performance from the new 2.4L intercooled turbo diesel, paired with a 6-speed automatic and a 75-litre fuel tank.',
				image: 'Triton_Rear_Left/26MY_TR_THA_DCAB_Prime_2WD_AT_rear-left_U28_Mid-Resolution-JPEG-rev-1.jpeg',
			},
			{
				sort: 3,
				tagline: 'TECHNOLOGY',
				headline: '9-Inch Infotainment with Apple CarPlay & 360 Camera',
				description:
					'An intuitive 9-inch Smartphone-link Display Audio system with smartphone connectivity, Apple CarPlay & Android Auto, and a 360° camera and wireless charging on the leather grade.',
				image: 'Triton_Interior/26MY_TR_THA_DCAB_Prime_4WD_MT_seat_Mid-Resolution-JPEG-rev-1.jpeg',
			},
		],
		trims: [
			{
				trim_name: 'Fabric 4WD',
				engine: '2.4L MIVEC Intercooled Turbo Diesel (135 kW @ 3,500 rpm, 430 Nm)',
				transmission: '6-Speed Automatic Transmission',
				drivetrain: '4WD (Super Select 4WD-II)',
				price: 295000,
				key_features: [
					'Super Select 4WD-II with Rear Differential Lock',
					'265/60R18 All-Season Tyres on 18-inch Alloy Wheels',
					'Hill Start Assist (HSA) & Hill Descent Control (HDC)',
					'Active Stability & Traction Control (ASTC) with Active Yaw Control',
					'9-inch Smartphone-link Display Audio with Apple CarPlay & Android Auto',
					'Fabric Seats with Stitching',
					'Front & Rear Parking Sensors with Rear Camera',
					'Driver, Front & Rear Passenger Airbags with ABS, EBD & Brake Assist',
				],
			},
			{
				trim_name: 'Leather 4WD',
				engine: '2.4L MIVEC Intercooled Turbo Diesel (135 kW @ 3,500 rpm, 430 Nm)',
				transmission: '6-Speed Automatic Transmission',
				drivetrain: '4WD (Super Select 4WD-II)',
				price: 295000,
				key_features: [
					'Leather Seats with Stitching',
					'Power Driver Seat',
					'360° Camera',
					'Wireless Charging',
					'Super Select 4WD-II with Rear Differential Lock',
					'265/60R18 All-Season Tyres on 18-inch Alloy Wheels',
					'9-inch Smartphone-link Display Audio with Apple CarPlay & Android Auto',
					'Lane Change Assist & Blind Spot Detection',
				],
			},
		],
	},
	{
		key: 'xpander-cross',
		slug: 'xpander-cross',
		title: 'Mitsubishi Xpander Cross',
		status: 'published',
		model_year: 2026,
		category: '7-Seater Crossover',
		body_type: 'Crossover',
		fuel_type: 'Gasoline',
		seating_capacity: 7,
		starting_price: 195000,
		warranty: '5-Year / 100,000 km Manufacturer Warranty',
		primary_color: '#4B5320',
		brochure_url: 'https://ansamitsubishi.com/brochures/2026-mitsubishi-xpander-cross.pdf',
		tagline: 'Confidence For Every Adventure',
		hero_headline: 'The All-New Xpander Cross',
		overview:
			'The all-new 2026 Mitsubishi Xpander Cross is a robust 7-seater crossover with top-tier 225 mm ground clearance and Active Yaw Control. A 1.5L MIVEC engine producing 104.5 PS and 141 N-m drives the front wheels through a 4-speed automatic, while a reinforced suspension, T-shaped LED lighting, roof rails and 17-inch two-tone alloy wheels give it a rugged, elevated presence. Inside, an 8-inch full digital LCD cluster, 7-inch SDA touchscreen with Apple CarPlay & Android Auto, digital climate control and Heat Guard synthetic leather seats keep every adventure in total control.',
		folder: 'Xpander Cross',
		assetRoot: 'Xpander_Cross',
		hero: {
			title: 'Xpander Cross — Hero',
			highlight_keyword: 'Xpander Cross',
			headline: 'Confidence For Every Adventure',
			body: 'A robust 7-seater crossover with top-tier 225 mm ground clearance and Active Yaw Control.',
			media: 'Xpander Cross_RHD_Front_Left/26MY_XS_Exterior_front-left_RHD_W81_Mid-Resolution-JPEG-rev-1 (1).jpeg',
		},
		colors: [
			{ sort: 1, color_name: 'Green Bronze Metallic', hex_code: '#4B5320', image: 'Xpander Cross_RHD_Front_Right/26MY_XS_Exterior_front-right_RHD_C31_Mid-Resolution-JPEG-rev-1.jpeg' },
			{ sort: 2, color_name: 'Quartz White Pearl', hex_code: '#F5F5F5', image: 'Xpander Cross_RHD_Front_Left/26MY_XS_Exterior_front-left_RHD_W81_Mid-Resolution-JPEG-rev-1 (1).jpeg' },
			{ sort: 3, color_name: 'Blade Silver Metallic', hex_code: '#C0C0C0', image: 'Xpander Cross_RHD_Front_Left/26MY_XS_Exterior_front-left_RHD_U33_Mid-Resolution-JPEG-rev-1 (1).jpeg' },
			{ sort: 4, color_name: 'Graphite Gray Metallic', hex_code: '#4A4D4E', image: 'Xpander Cross_RHD_Front_Left/26MY_XS_Exterior_front-left_RHD_U28_Mid-Resolution-JPEG-rev-1.jpeg' },
			{ sort: 5, color_name: 'Jet Black Mica', hex_code: '#1A1A1A', image: 'Xpander Cross_RHD_Front_Left/26MY_XS_Exterior_front-left_RHD_X37_Mid-Resolution-JPEG-rev-1.jpeg' },
			{ sort: 6, color_name: 'Sunrise Orange Metallic', hex_code: '#E65100', image: 'Xpander Cross_RHD_Rear_Right/26MY_XS_Exterior_rear-right_RHD_M13_Mid-Resolution-JPEG-rev-1.jpeg' },
		],
		blockTagline: 'Xpander Cross Key Highlights',
		highlights: [
			{
				sort: 1,
				tagline: 'CAPABILITY',
				headline: '225mm Ground Clearance',
				description:
					'Top-level 225 mm ground clearance and a high 1,340 mm eye point give confident, comfortable driving on bumpy or uneven roads — with a reinforced suspension for stable handling.',
				image: 'Xpander Cross_RHD_Side/26MY_XS_Exterior_side_RHD_U28_Mid-Resolution-JPEG-rev-1.jpeg',
			},
			{
				sort: 2,
				tagline: 'CONTROL',
				headline: 'Active Yaw Control (AYC)',
				description:
					'AYC reads your inputs and adjusts engine output and brake force to spinning wheels, sharpening cornering stability — with the brake control visible in real time on the LCD meter.',
				image: 'Xpander Cross_RHD_Front_Left/26MY_XS_Exterior_front-left_RHD_X37_Mid-Resolution-JPEG-rev-1.jpeg',
			},
			{
				sort: 3,
				tagline: 'TECHNOLOGY',
				headline: '8-Inch Full Digital LCD Cluster',
				description:
					'A driver-focused 8-inch full digital LCD instrument cluster with a customisable screen layout, paired with a 7-inch SDA touchscreen, Apple CarPlay & Android Auto and cruise control.',
				image: 'Xpander Cross_Interior/26MY_XS_LHD_FT_Steering&Meter_Mid-Resolution-JPEG-rev-1.jpeg',
			},
			{
				sort: 4,
				tagline: 'COMFORT',
				headline: 'Heat Guard Synthetic Leather',
				description:
					'Heat Guard synthetic leather seats stay cooler in the sun, with digital climate control and rear vents, an electronic parking brake with auto hold, and USB Type A & C charging in the 2nd row.',
				image: 'Xpander Cross_Interior/26MY_XS_LHD_FT_SeatArrange_5_Passenger_Mid-Resolution-JPEG-rev-1.jpeg',
			},
		],
		trims: [
			{
				trim_name: 'PX 2WD 1.5L 4AT',
				engine: '1.5L 16-Valve DOHC MIVEC 4-Cylinder (4A91, 104.5 PS @ 6,000 rpm, 141 Nm @ 4,000 rpm)',
				transmission: '4-Speed Automatic Transmission',
				drivetrain: '2WD (Front-Wheel Drive)',
				price: 195000,
				key_features: [
					'225 mm Ground Clearance with Reinforced Suspension',
					'Active Yaw Control (AYC) with Active Stability Control (ASC)',
					'8-inch Full Digital LCD Instrument Cluster',
					'7-inch Touchscreen SDA with Apple CarPlay & Android Auto',
					'T-Shaped LED Headlights & LED Fog Lights',
					'17-inch Two-Tone Alloy Wheels with 205/55R17 Tyres',
					'Heat Guard Synthetic Leather Seats',
					'Electronic Parking Brake with Auto Hold',
					'Keyless Operation System (2 Transmitters) with Push-Button Start',
					'6 SRS Airbags, ABS, EBD & Brake Assist',
				],
			},
		],
	},
	{
		// Existing vehicle (id 5) — update overview/hero, add colors + highlights.
		// Trims (GLX, Cross) are already fully populated and are left untouched.
		key: 'xpander',
		slug: 'xpander',
		title: 'Mitsubishi Xpander',
		status: 'published',
		model_year: 2026,
		// scalars below that differ from the live row are patched
		category: '7-Seater Crossover MPV',
		body_type: 'Multi-Purpose Vehicle (MPV) / Crossover',
		fuel_type: 'Gasoline',
		seating_capacity: 7,
		starting_price: 175000,
		warranty: '5-Year / 100,000 km Manufacturer Warranty',
		primary_color: '#6B7280',
		brochure_url: 'https://ansamitsubishi.com/brochures/2026-mitsubishi-xpander.pdf',
		overview:
			'The 2026 Mitsubishi Xpander is a versatile 7-seater MPV designed for modern families with flexible seating and 19 smart storage spaces. A responsive 1.5L MIVEC engine (104.5 PS, 141 N-m) and 4-speed automatic pair with high-grade fabric seating, a 7-inch Smartphone-link Display Audio touchscreen, digital climate control with rear vents, and a RISE safety body protected by six SRS airbags — car-like driving dynamics with room for everyone.',
		// tagline + hero_headline already exist on the live row — preserved.
		folder: null, // reuses the "Xpander Cross" folder (shared renders, same paint codes)
		assetRoot: null,
		hero: {
			title: 'Xpander — Hero',
			highlight_keyword: 'Xpander',
			headline: 'Room For Everything',
			body: 'The versatile 7-seater MPV with flexible seating and 19 smart storage spaces.',
			media: 'Xpander Cross_RHD_Front_Right/26MY_XS_Exterior_front-right_RHD_C31_Mid-Resolution-JPEG-rev-1.jpeg',
		},
		// Same palette as the Xpander Cross (shared spec sheet lists the same 6 colours).
		colors: [
			{ sort: 1, color_name: 'Green Bronze Metallic', hex_code: '#4B5320', image: 'Xpander Cross_RHD_Front_Right/26MY_XS_Exterior_front-right_RHD_C31_Mid-Resolution-JPEG-rev-1.jpeg' },
			{ sort: 2, color_name: 'Quartz White Pearl', hex_code: '#F5F5F5', image: 'Xpander Cross_RHD_Front_Left/26MY_XS_Exterior_front-left_RHD_W81_Mid-Resolution-JPEG-rev-1 (1).jpeg' },
			{ sort: 3, color_name: 'Blade Silver Metallic', hex_code: '#C0C0C0', image: 'Xpander Cross_RHD_Front_Left/26MY_XS_Exterior_front-left_RHD_U33_Mid-Resolution-JPEG-rev-1 (1).jpeg' },
			{ sort: 4, color_name: 'Graphite Gray Metallic', hex_code: '#4A4D4E', image: 'Xpander Cross_RHD_Front_Left/26MY_XS_Exterior_front-left_RHD_U28_Mid-Resolution-JPEG-rev-1.jpeg' },
			{ sort: 5, color_name: 'Jet Black Mica', hex_code: '#1A1A1A', image: 'Xpander Cross_RHD_Front_Left/26MY_XS_Exterior_front-left_RHD_X37_Mid-Resolution-JPEG-rev-1.jpeg' },
			{ sort: 6, color_name: 'Sunrise Orange Metallic', hex_code: '#E65100', image: 'Xpander Cross_RHD_Rear_Right/26MY_XS_Exterior_rear-right_RHD_M13_Mid-Resolution-JPEG-rev-1.jpeg' },
		],
		blockTagline: 'Xpander Key Highlights',
		highlights: [
			{
				sort: 1,
				tagline: 'SAFETY',
				headline: 'RISE Body Safety',
				description:
					'The RISE (Reinforced Impact Safety Evolution) body uses 440 MPa-class high-tensile steel to absorb and disperse impact, protected by six SRS airbags and seat-belt pretensioners.',
				image: 'Xpander Cross_Interior/26MY_XS_LHD_FT_SRS-Airbags_Mid-Resolution-JPEG-rev-1.jpeg',
			},
			{
				sort: 2,
				tagline: 'TECHNOLOGY',
				headline: '7-Inch Touchscreen SDA',
				description:
					'A 7-inch Smartphone-link Display Audio touchscreen with Apple CarPlay & Android Auto, Bluetooth, and a 6-speaker audio system keeps the whole family connected.',
				image: 'Xpander Cross_Interior/26MY_XS_LHD_FT_Navi_Audio_with_MGDA_Mid-Resolution-JPEG-rev-1.jpeg',
			},
			{
				sort: 3,
				tagline: 'COMFORT',
				headline: 'Digital Climate Control',
				description:
					'An intuitive digital climate control panel with rear air vents, electric folding body-coloured door mirrors, and push-button start make every journey effortless.',
				image: 'Xpander Cross_Interior/26MY_XS_LHD_FT_Steering_Mid-Resolution-JPEG-rev-1.jpeg',
			},
			{
				sort: 4,
				tagline: 'VERSATILITY',
				headline: '19 Smart Storage Spaces',
				description:
					'19 unique storage spaces, fold-flat 2nd and 3rd rows, retractable assist grips and a flexible 7-seat layout adapt to anything a modern family throws at it.',
				image: 'Xpander Cross_Interior/26MY_XS_RHD_FT_Cargo_with_MGDA_Mid-Resolution-JPEG-rev-1.jpeg',
			},
		],
		trims: [], // existing GLX + Cross trims stay as-is
	},
];

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** All query params go through URLSearchParams (proper bracket/comma encoding). */
async function api(method, p, body, params) {
	const url = new URL(BASE + p);
	if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	const res = await fetch(url, {
		method,
		headers: body ? { ...H, 'Content-Type': 'application/json' } : { ...H },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	let data = null;
	try {
		data = await res.json();
	} catch {}
	if (!res.ok) {
		throw new Error(`${method} ${p} → ${res.status}: ${JSON.stringify(data)?.slice(0, 300)}`);
	}
	return data;
}

async function uploadFile(absPath, title) {
	const name = path.basename(absPath);
	const ext = path.extname(name).toLowerCase();
	const buf = fs.readFileSync(absPath);
	const fd = new FormData();
	fd.append('file', new Blob([buf], { type: MIME[ext] }), name);
	fd.append('title', title);
	const res = await fetch(`${BASE}/files`, { method: 'POST', headers: H, body: fd });
	const data = await res.json();
	if (!res.ok) throw new Error(`upload ${name} → ${res.status}: ${JSON.stringify(data)?.slice(0, 300)}`);
	return data.data?.id ?? data.id;
}

// this build ignores the `folder` form field on upload (and 403s
// PATCH /items/directus_files), so the folder is set via PATCH /files/:id
async function assignFolder(fileId, folderId) {
	await api('PATCH', `/files/${fileId}`, { folder: folderId });
}

function* walkImages(dir, base = dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
		const abs = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* walkImages(abs, base);
		else if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) {
			yield { abs, rel: path.relative(base, abs) };
		}
	}
}

// ---------------------------------------------------------------------------
// local asset state (this build 403s GET /items/directus_files for every role)
// ---------------------------------------------------------------------------

const STATE_FILE = path.join(__dirname, '.seed-remaining-assets.json');
// state shape: { "<key>/<relpath>": { id, folderPatched } }
let assetState = {};
try {
	const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
	for (const [k, v] of Object.entries(raw)) {
		assetState[k] = typeof v === 'string' ? { id: v, folderPatched: false } : v;
	}
} catch {}
function saveState() {
	fs.writeFileSync(STATE_FILE, JSON.stringify(assetState, null, '\t'));
}

// ---------------------------------------------------------------------------
// step 0 — folders
// ---------------------------------------------------------------------------

const folderIds = {}; // folder name -> id
async function ensureFolder(name) {
	if (folderIds[name]) return folderIds[name];
	const existing = await api('GET', '/folders', undefined, {
		'filter[name][_eq]': name,
		fields: 'id,name',
	});
	let folder = existing.data?.[0];
	if (!folder) {
		const created = await api('POST', '/folders', { name });
		folder = created.data;
		console.log(`  folder: created "${name}" (${folder.id})`);
	} else {
		console.log(`  folder: reusing "${name}" (${folder.id})`);
	}
	folderIds[name] = folder.id;
	return folder.id;
}

// ---------------------------------------------------------------------------
// step 1 — upload model assets
// ---------------------------------------------------------------------------

const filesByRel = new Map(); // "<key>/<rel>" -> file id
let uploadedCount = 0;
let reusedCount = 0;

async function ensureAssets(vehicle) {
	if (!vehicle.assetRoot) return; // Xpander reuses the Xpander Cross folder
	const root = path.join(OPT_ROOT, vehicle.assetRoot);
	const folderId = await ensureFolder(vehicle.folder);
	let count = 0;
	for (const { abs, rel } of walkImages(root)) {
		count++;
		const stateKey = `${vehicle.key}/${rel}`;
		let known = assetState[stateKey];
		if (!known) {
			// best-effort dedupe via filename (403 on this build → treated as miss)
			try {
				const existing = await api('GET', '/items/directus_files', undefined, {
					'filter[filename_download][_eq]': path.basename(abs),
					'filter[folder][_eq]': folderId,
					fields: 'id',
				});
				if (existing.data?.length) {
					known = { id: existing.data[0].id, folderPatched: false };
					assetState[stateKey] = known;
					saveState();
				}
			} catch {}
		}
		if (known) {
			filesByRel.set(stateKey, known.id);
			reusedCount++;
			if (!known.folderPatched) {
				await assignFolder(known.id, folderId);
				known.folderPatched = true;
				saveState();
			}
			continue;
		}
		const id = await uploadFile(abs, path.basename(abs, path.extname(abs)).replace(' (1)', ''));
		await assignFolder(id, folderId);
		assetState[stateKey] = { id, folderPatched: true };
		saveState();
		filesByRel.set(stateKey, id);
		uploadedCount++;
	}
	console.log(`  assets: ${count} in "${vehicle.folder}" (${uploadedCount} uploaded so far)`);
}

/** Resolve a picked render to a file id (uploads live under the model that owns the folder). */
function fileByRel(vehicle, relPath) {
	// Xpander has no assets of its own — its picks live in the Xpander Cross folder.
	const owner = vehicle.assetRoot ? vehicle.key : 'xpander-cross';
	const stateKey = `${owner}/${relPath}`;
	const id = filesByRel.get(stateKey);
	if (!id) throw new Error(`selected asset missing from upload set: ${stateKey}`);
	return id;
}

// ---------------------------------------------------------------------------
// step 2 — vehicle rows
// ---------------------------------------------------------------------------

async function ensureVehicle(vehicle) {
	const existing = await api('GET', '/items/vehicles', undefined, {
		'filter[slug][_eq]': vehicle.slug,
		fields: 'id,title,slug,tagline,hero_headline,category,body_type,fuel_type,seating_capacity,starting_price,warranty,primary_color,brochure_url,status,model_year,overview,hero_block',
	});
	let row = existing.data?.[0];
	if (!row) {
		const created = await api('POST', '/items/vehicles', {
			title: vehicle.title,
			slug: vehicle.slug,
			status: vehicle.status,
			model_year: vehicle.model_year,
			category: vehicle.category,
			body_type: vehicle.body_type,
			fuel_type: vehicle.fuel_type,
			seating_capacity: vehicle.seating_capacity,
			starting_price: vehicle.starting_price,
			warranty: vehicle.warranty,
			primary_color: vehicle.primary_color,
			brochure_url: vehicle.brochure_url,
			tagline: vehicle.tagline,
			hero_headline: vehicle.hero_headline,
			overview: vehicle.overview,
		});
		row = created.data;
		console.log(`  vehicle: created "${vehicle.title}" (id ${row.id})`);
		return row;
	}
	// patch scalars that changed (tagline/hero_headline preserved for xpander)
	const patch = { overview: vehicle.overview };
	for (const f of ['category', 'body_type', 'fuel_type', 'seating_capacity', 'starting_price', 'warranty', 'model_year', 'status']) {
		if (row[f] !== vehicle[f]) patch[f] = vehicle[f];
	}
	if (Object.keys(patch).length) {
		await api('PATCH', `/items/vehicles/${row.id}`, patch);
		console.log(`  vehicle: updated #${row.id} (${Object.keys(patch).join(', ')})`);
	} else {
		console.log(`  vehicle: ok #${row.id} "${vehicle.title}"`);
	}
	row.hero_block = row.hero_block ?? null;
	return row;
}

// ---------------------------------------------------------------------------
// step 3 — hero block
// ---------------------------------------------------------------------------

async function ensureHero(vehicle, row) {
	let heroId = row.hero_block;
	if (heroId) {
		// update hero copy + media
		const mediaId = fileByRel(vehicle, vehicle.hero.media);
		const patch = {
			title: vehicle.hero.title,
			highlight_keyword: vehicle.hero.highlight_keyword,
			headline: vehicle.hero.headline,
			body: vehicle.hero.body,
			media: mediaId,
		};
		await api('PATCH', `/items/block_hero_custom/${heroId}`, patch);
		console.log(`  hero: updated ${heroId.slice(0, 8)}.. → media ${mediaId.slice(0, 8)}..`);
		return heroId;
	}
	const mediaId = fileByRel(vehicle, vehicle.hero.media);
	const created = await api('POST', '/items/block_hero_custom', {
		title: vehicle.hero.title,
		highlight_keyword: vehicle.hero.highlight_keyword,
		headline: vehicle.hero.headline,
		body: vehicle.hero.body,
		media: mediaId,
		template: 'hero_immersive',
		variant: 'dark_industrial',
		container_width: 'contained',
	});
	heroId = created.data?.id ?? created.id;
	await api('PATCH', `/items/vehicles/${row.id}`, { hero_block: heroId });
	console.log(`  hero: created ${heroId.slice(0, 8)}.. → media ${mediaId.slice(0, 8)}..`);
	return heroId;
}

// ---------------------------------------------------------------------------
// step 4 — colors (upsert by vehicle + name)
// ---------------------------------------------------------------------------

async function ensureColors(vehicle, row) {
	const existing = await api('GET', '/items/vehicle_colors', undefined, {
		'filter[vehicle_id][_eq]': row.id,
		fields: 'id,sort,color_name,hex_code,image',
	});
	const byName = new Map((existing.data ?? []).map((c) => [c.color_name, c]));
	for (const spec of vehicle.colors) {
		const imgId = spec.image ? fileByRel(vehicle, spec.image) : null;
		const current = byName.get(spec.color_name);
		const payload = {
			vehicle_id: row.id,
			sort: spec.sort,
			color_name: spec.color_name,
			hex_code: spec.hex_code,
			...(imgId ? { image: imgId } : {}),
		};
		if (current) {
			const changed =
				current.sort !== spec.sort ||
				current.hex_code !== spec.hex_code ||
				String(current.image ?? null) !== String(imgId ?? null);
			if (changed) {
				await api('PATCH', `/items/vehicle_colors/${current.id}`, payload);
				console.log(`  color: updated "${spec.color_name}" (#${current.id})${imgId ? ` → ${imgId.slice(0, 8)}..` : ''}`);
			} else {
				console.log(`  color: ok "${spec.color_name}" (#${current.id})`);
			}
		} else {
			const created = await api('POST', '/items/vehicle_colors', payload);
			console.log(`  color: created "${spec.color_name}" (#${created.data?.id ?? created.id})${imgId ? ` → ${imgId.slice(0, 8)}..` : ''}`);
		}
	}
}

// ---------------------------------------------------------------------------
// step 5 — highlights (parent block + items + M2M junction images)
// ---------------------------------------------------------------------------

async function ensureHighlights(vehicle, row) {
	// parent content block
	let blocks = await api('GET', '/items/block_content_block', undefined, {
		'filter[tagline][_eq]': vehicle.blockTagline,
		fields: 'id',
	});
	let block = blocks.data?.[0];
	if (!block) {
		const created = await api('POST', '/items/block_content_block', {
			tagline: vehicle.blockTagline,
			template: 'content_block',
			variant: 'one_long',
			container_width: 'contained',
		});
		block = created.data;
		console.log(`  block: created "${vehicle.blockTagline}" (${block.id})`);
	} else {
		console.log(`  block: reusing "${vehicle.blockTagline}" (${block.id})`);
	}

	const items = await api('GET', '/items/block_content_items', undefined, {
		'filter[vehicle][_eq]': row.id,
		fields: 'id,sort,tagline,headline,description,item',
		sort: 'sort',
	});
	const bySort = new Map((items.data ?? []).map((r) => [r.sort, r]));

	// NOTE (this Directus build): M2M fields expand to JUNCTION ROWS, not related
	// items. `images: [fileUuid]` is misread as a junction PK (500), and the
	// replace-semantics are unreliable (stray rows with NULL FKs survive).
	// Strategy: manage the junction explicitly — compare via
	// `images.directus_files_id.*`, delete stale rows via
	// /items/block_content_items_files, then PATCH content (without images)
	// and link the file as a junction object with explicit FKs.
	for (const spec of vehicle.highlights) {
		const imgId = fileByRel(vehicle, spec.image);
		let r = bySort.get(spec.sort);
		if (!r) {
			const created = await api('POST', '/items/block_content_items', {
				vehicle: row.id,
				item: block.id,
				sort: spec.sort,
				status: 'published',
				tagline: spec.tagline,
				headline: spec.headline,
				description: spec.description,
			});
			r = created.data;
			console.log(`  highlight: created #${spec.sort} "${spec.tagline}" (id ${r.id})`);
		}

		const junctions = await api('GET', '/items/block_content_items_files', undefined, {
			'filter[block_content_items_id][_eq]': r.id,
			fields: 'id,directus_files_id',
		});
		const currentFileIds = new Set((junctions.data ?? []).map((j) => j.directus_files_id));
		const wantOnly = currentFileIds.size === 1 && currentFileIds.has(imgId);

		const contentChanged =
			r.tagline !== spec.tagline ||
			r.headline !== spec.headline ||
			r.description !== spec.description ||
			String(r.item ?? '') !== block.id;

		if (wantOnly && !contentChanged) {
			console.log(`  highlight: ok #${spec.sort} "${spec.tagline}"`);
			continue;
		}

		if (!wantOnly) {
			for (const j of junctions.data ?? []) {
				await api('DELETE', `/items/block_content_items_files/${j.id}`);
			}
		}
		await api('PATCH', `/items/block_content_items/${r.id}`, {
			vehicle: row.id,
			item: block.id,
			sort: spec.sort,
			status: 'published',
			tagline: spec.tagline,
			headline: spec.headline,
			description: spec.description,
		});
		if (!wantOnly) {
			await api('PATCH', `/items/block_content_items/${r.id}`, {
				images: [{ block_content_items_id: r.id, directus_files_id: imgId }],
			});
		}
		console.log(`  highlight: updated #${spec.sort} "${spec.tagline}"${wantOnly ? '' : ` → image ${imgId.slice(0, 8)}..`}`);
	}
}

// ---------------------------------------------------------------------------
// step 6 — trims (upsert by vehicle + trim_name)
// ---------------------------------------------------------------------------

async function ensureTrims(vehicle, row) {
	if (!vehicle.trims?.length) {
		const existing = await api('GET', '/items/vehicle_trims', undefined, {
			'filter[vehicle][_eq]': row.id,
			fields: 'id,trim_name',
		});
		const names = (existing.data ?? []).map((t) => t.trim_name).join(', ');
		console.log(`  trims: ${existing.data?.length ?? 0} existing (${names}) — unchanged`);
		return;
	}
	const existing = await api('GET', '/items/vehicle_trims', undefined, {
		'filter[vehicle][_eq]': row.id,
		fields: 'id,trim_name,engine,transmission,drivetrain,price,status,key_features',
	});
	const byName = new Map((existing.data ?? []).map((t) => [t.trim_name, t]));
	for (const spec of vehicle.trims) {
		const current = byName.get(spec.trim_name);
		const payload = {
			vehicle: row.id,
			vehicle_id: row.id,
			vehicle_slug: row.slug,
			trim_name: spec.trim_name,
			status: 'published',
			engine: spec.engine,
			transmission: spec.transmission,
			drivetrain: spec.drivetrain,
			price: spec.price,
			key_features: spec.key_features.map((value) => ({ value })),
		};
		if (current) {
			const changed =
				current.engine !== spec.engine ||
				current.transmission !== spec.transmission ||
				current.drivetrain !== spec.drivetrain ||
				current.price !== spec.price ||
				JSON.stringify(current.key_features) !== JSON.stringify(payload.key_features);
			if (changed) {
				await api('PATCH', `/items/vehicle_trims/${current.id}`, payload);
				console.log(`  trim: updated "${spec.trim_name}" (#${current.id})`);
			} else {
				console.log(`  trim: ok "${spec.trim_name}" (#${current.id})`);
			}
		} else {
			const created = await api('POST', '/items/vehicle_trims', payload);
			console.log(`  trim: created "${spec.trim_name}" (#${created.data?.id ?? created.id})`);
		}
	}
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

console.log('── seed-remaining-vehicles ─────────────────────────────────────');
for (const vehicle of VEHICLES) {
	console.log(`\n● ${vehicle.title} (${vehicle.slug})`);
	const row = await ensureVehicle(vehicle);
	if (vehicle.assetRoot) await ensureAssets(vehicle);
	await ensureHero(vehicle, row);
	await ensureColors(vehicle, row);
	await ensureHighlights(vehicle, row);
	await ensureTrims(vehicle, row);
}

console.log('\n── summary ─────────────────────────────────────────────────────');
console.log(`files: ${uploadedCount} uploaded, ${reusedCount} reused from state`);
for (const v of VEHICLES) {
	console.log(
		`  ${v.slug.padEnd(14)} colors=${v.colors.length} highlights=${v.highlights.length} trims=${v.trims?.length ?? 'existing'}`,
	);
}
console.log('DONE');
