/**
 * Types for the hybrid vehicle schema (see scripts/apply-hybrid-vehicle-schema.js).
 *
 * These describe the nested /showroom payload, not raw collection rows, so they use
 * `VehiclePage*` names: the generated `schema.ts` already exports `VehicleColor` /
 * `VehicleTrim`, and Nuxt auto-imports (and warns on) duplicate `shared/types` exports.
 *
 * Payload shape as returned by:
 *   GET /items/vehicles?filter[slug][_eq]=:slug&fields=*,hero_block.*,colors.*,highlights.*,trims.*
 */

/** A Directus file reference — either a raw UUID (string) or a resolved object. */
export type VehicleFileRef =
	| string
	| {
			id?: string;
			filename?: string;
			title?: string;
			[key: string]: unknown;
	  };

/** M2O -> block_hero_custom (vehicles.hero_block) */
export interface VehicleHeroBlock {
	id: string;
	title: string | null;
	headline: string | null;
	body: string | null;
	highlight_keyword: string | null;
	template: string | null;
	variant: string | null;
	container_width: string | null;
	media: VehicleFileRef | null;
	media_gallery: VehicleFileRef[];
}

/** O2M -> vehicle_colors (vehicles.colors) */
export interface VehiclePageColor {
	id: number;
	sort: number;
	vehicle_id: number | null;
	color_name: string;
	hex_code: string;
	/** Manufacturer paint code, e.g. U28 */
	color_code?: string | null;
	image: VehicleFileRef | null;
}

/** O2M -> block_content_items (vehicles.highlights) */
export interface VehicleHighlight {
	id: number;
	sort: number;
	tagline: string | null;
	headline: string | null;
	description: string | null;
	status: string;
	vehicle: number;
	/** M2M junction rows; `directus_files_id` is expanded by /api/vehicles/:slug. */
	images?: Array<{ id: number; directus_files_id: VehicleFileRef | null }>;
}

/** O2M -> vehicle_trims (vehicles.trims) — key_features is a repeater of { value } objects */
export interface VehiclePageTrim {
	id: number;
	trim_name: string;
	status: string;
	engine: string | null;
	transmission: string | null;
	drivetrain: string | null;
	price: number | null;
	key_features: Array<{ value: string }>;
}

/** Full nested vehicle payload for /showroom/[slug] */
export interface VehiclePage {
	id: number;
	title: string;
	slug: string;
	tagline: string | null;
	hero_headline: string | null;
	starting_price: number | null;
	primary_color: string | null;
	brochure_url: string | null;
	status: string;
	model_year: number | null;
	category: string | null;
	body_type: string | null;
	seating_capacity: number | null;
	fuel_type: string | null;
	warranty: string | null;
	/** Technical specs (scripts/add-spec-fields.mjs), e.g. "222 mm", "4,390 × 1,810 × 1,660 mm". */
	ground_clearance: string | null;
	dimensions: string | null;
	torque: string | null;
	suspension: string | null;
	overview: string | null;
	/** Optional looping hero background video (full URL). Not yet a Directus field. */
	hero_video_url?: string | null;
	/** M2O -> directus_files: header mega menu card image (falls back to hero_block.media). */
	menu_image: VehicleFileRef | null;
	hero_block: VehicleHeroBlock | null;
	colors: VehiclePageColor[];
	highlights: VehicleHighlight[];
	trims: VehiclePageTrim[];
}

/** Lightweight published-vehicle index row (GET /api/vehicles) — used by the header mega menu and the homepage fleet cards. */
export type VehicleSummary = Pick<
	VehiclePage,
	| 'id'
	| 'slug'
	| 'title'
	| 'model_year'
	| 'starting_price'
	| 'menu_image'
	| 'category'
	| 'seating_capacity'
	| 'fuel_type'
	| 'body_type'
	| 'warranty'
	| 'brochure_url'
	| 'ground_clearance'
	| 'dimensions'
	| 'torque'
	| 'suspension'
> & {
	hero_block: Pick<VehicleHeroBlock, 'media'> | null;
	/** Swatches for the homepage cards; each image is a render on the same studio framing as menu_image. */
	colors: Pick<VehiclePageColor, 'sort' | 'color_name' | 'hex_code' | 'image'>[];
	/** Spec slice for the homepage cards' quick-spec reveal and the Quick Specs modal. */
	trims: Pick<VehiclePageTrim, 'status' | 'price' | 'engine' | 'transmission' | 'drivetrain'>[];
};
