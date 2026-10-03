import type { Faq } from '#shared/types/schema';

/** Published FAQs for the /about FAQ tab, in CMS sort order. */
export default defineEventHandler(async () => {
	try {
		return (await directusServer.request(
			readItems('faqs', {
				filter: { is_published: { _eq: true } },
				fields: ['id', 'sort', 'question', 'answer', 'category'],
				sort: ['sort', 'id'],
				limit: -1,
			}),
		)) as Faq[];
	} catch {
		throw createError({ statusCode: 500, statusMessage: 'Failed to load FAQs' });
	}
});
