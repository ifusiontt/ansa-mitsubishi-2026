/**
 * Types for the hybrid vehicle schema (see scripts/apply-hybrid-vehicle-schema.js).
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
export interface VehicleColor {
	id: number;
	sort: number;
	vehicle_id: number | null;
	color_name: string;
	hex_code: string;
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
}

/** O2M -> vehicle_trims (vehicles.trims) — key_features is a repeater of { value } objects */
export interface VehicleTrim {
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
	overview: string | null;
	hero_block: VehicleHeroBlock | null;
	colors: VehicleColor[];
	highlights: VehicleHighlight[];
	trims: VehicleTrim[];
}
