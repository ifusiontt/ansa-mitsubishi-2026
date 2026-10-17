import type { VehicleSummary } from '#shared/types/vehicle';

/**
 * Active 2026 fleet, in display order. Slugs must match `vehicles.slug` in
 * Directus (Outlander Sport is seeded as `outlander-sport`).
 */
const FLEET_SLUGS = ['outlander-sport', 'triton', 'xpander-cross', 'xpander'];

/**
 * Vehicle list handler — published fleet index for the header mega menu and the homepage fleet
 * cards (colour swatches, quick specs modal).
 * Archived fleet models (currently the Xpander) are excluded.
 *
 * Server-side equivalent of:
 *   GET /items/vehicles?filter[slug][_in]=<FLEET_SLUGS>&filter[status][_eq]=published
 *     &fields=id,slug,title,model_year,starting_price,menu_image,category,seating_capacity,fuel_type,
 *       body_type,warranty,brochure_url,hero_block.media,colors.sort,colors.color_name,colors.hex_code,colors.image,
 *       trims.status,trims.price,trims.engine,trims.transmission,trims.drivetrain
 */
export default defineEventHandler(async () => {
	const vehicles = (await directusServer.request(
		readItems('vehicles' as any, {
			filter: { slug: { _in: FLEET_SLUGS }, status: { _eq: 'published' } } as any,
			fields: [
				'id',
				'slug',
				'title',
				'model_year',
				'starting_price',
				'menu_image',
				'category',
				'seating_capacity',
				'fuel_type',
				'body_type',
				'warranty',
				'brochure_url',
				{ hero_block: ['media'] },
				{ colors: ['sort', 'color_name', 'hex_code', 'image'] },
				{ trims: ['status', 'price', 'engine', 'transmission', 'drivetrain'] },
			] as any,
			limit: -1,
		}),
	)) as VehicleSummary[];

	return vehicles.sort((a, b) => FLEET_SLUGS.indexOf(a.slug) - FLEET_SLUGS.indexOf(b.slug));
});
