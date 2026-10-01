import type { Dealer } from '#shared/types/schema';

/** Published dealer branches for the Contact page map, headquarters first. */
export default defineEventHandler(async () => {
	try {
		return (await directusServer.request(
			readItems('dealers', {
				filter: { status: { _eq: 'published' } },
				fields: [
					'id',
					'name',
					'slug',
					'address',
					'city',
					'state_region',
					'country',
					'phone',
					'email',
					'is_headquarters',
					'latitude',
					'longitude',
					'google_maps_url',
					'opening_hours',
					'services',
				],
				sort: ['-is_headquarters', 'name'],
				limit: -1,
			}),
		)) as Dealer[];
	} catch {
		throw createError({ statusCode: 500, statusMessage: 'Failed to load dealers' });
	}
});
