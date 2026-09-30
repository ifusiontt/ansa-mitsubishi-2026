import type { VehicleSummary } from '#shared/types/vehicle';

/**
 * Active 2026 fleet, in display order. Slugs must match `vehicles.slug` in
 * Directus (Outlander Sport is seeded as `2025-outlander-sport`).
 */
const FLEET_SLUGS = ['2025-outlander-sport', 'triton', 'xpander-cross', 'xpander'];

/**
 * Vehicle list handler — lightweight slug/title index for vehicle pickers
 * (e.g. the showroom colour configurator's "Choose your vehicle" dropdown).
 *
 * Server-side equivalent of:
 *   GET /items/vehicles?filter[slug][_in]=<FLEET_SLUGS>&fields=id,slug,title,model_year
 */
export default defineEventHandler(async () => {
	const vehicles = (await directusServer.request(
		readItems('vehicles' as any, {
			filter: { slug: { _in: FLEET_SLUGS } } as any,
			fields: ['id', 'slug', 'title', 'model_year'] as any,
			limit: -1,
		}),
	)) as VehicleSummary[];

	return vehicles.sort((a, b) => FLEET_SLUGS.indexOf(a.slug) - FLEET_SLUGS.indexOf(b.slug));
});
