import type { VehiclePage } from '#shared/types/vehicle';

/**
 * Vehicle API handler — fetches a single vehicle by slug with its full nested relations.
 *
 * Server-side equivalent of the public Directus endpoint:
 *   GET /items/vehicles?filter[slug][_eq]=:slug&fields=*,hero_block.*,colors.*,highlights.*,trims.*
 *
 * Uses the public read policy (field whitelist on vehicles + vehicle_colors),
 * so no static token is required. Nested relations are deep-sorted for stable
 * render order (colors/highlights by `sort`, trims by `trim_name`).
 */
export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');

	if (!slug) {
		throw createError({ statusCode: 400, statusMessage: 'Vehicle slug is required' });
	}

	const vehicles = (await directusServer.request(
		readItems('vehicles' as any, {
			filter: { slug: { _eq: slug } },
			limit: 1,
			fields: ['*', { hero_block: ['*'] }, { colors: ['*'] }, { highlights: ['*'] }, { trims: ['*'] }] as any,
			// 'vehicles' is not in the generated Schema yet, so the Deep type
			// parameter falls back — cast the deep-sort object explicitly.
			deep: {
				colors: { _sort: ['sort'] },
				highlights: { _sort: ['sort'] },
				trims: { _sort: ['trim_name'] },
			} as any,
		}),
	)) as VehiclePage[];

	if (!vehicles.length) {
		throw createError({ statusCode: 404, statusMessage: 'Vehicle not found' });
	}

	return vehicles[0];
});
