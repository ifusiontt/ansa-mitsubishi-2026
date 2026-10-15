import type { VehicleSummary } from '#shared/types/vehicle';

/**
 * Active 2026 fleet, in display order. Slugs must match `vehicles.slug` in
 * Directus (Outlander Sport is seeded as `2025-outlander-sport`).
 */
const FLEET_SLUGS = ['2025-outlander-sport', 'triton', 'xpander-cross', 'xpander'];

/**
 * Vehicle list handler — published fleet index for the header mega menu.
 * Archived fleet models (currently the Xpander) are excluded.
 *
 * Server-side equivalent of:
 *   GET /items/vehicles?filter[slug][_in]=<FLEET_SLUGS>&filter[status][_eq]=published
 *     &fields=id,slug,title,model_year,starting_price,menu_image,category,seating_capacity,fuel_type,
 *       hero_block.media,trims.status,trims.price,trims.engine,trims.drivetrain
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
				{ hero_block: ['media'] },
				{ trims: ['status', 'price', 'engine', 'drivetrain'] },
			] as any,
			limit: -1,
		}),
	)) as VehicleSummary[];

	return vehicles.sort((a, b) => FLEET_SLUGS.indexOf(a.slug) - FLEET_SLUGS.indexOf(b.slug));
});
