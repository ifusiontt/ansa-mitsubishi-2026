import type { Form } from '#shared/types/schema';

/**
 * Returns a single active form definition for client rendering, looked up by
 * `id` or (case-insensitive) `title`. `emails` is intentionally never selected:
 * notification recipients and templates stay server-side in /api/forms/submit.
 */
export default defineEventHandler(async (event) => {
	const { id, title } = getQuery(event) as { id?: string; title?: string };

	if (!id && !title) {
		throw createError({ statusCode: 400, statusMessage: 'Provide a form `id` or `title`' });
	}

	try {
		const forms = await directusServer.request(
			readItems('forms', {
				filter: {
					_and: [{ is_active: { _eq: true } }, id ? { id: { _eq: id } } : { title: { _icontains: title } }],
				},
				fields: [
					'id',
					'title',
					'is_active',
					'submit_label',
					'on_success',
					'success_message',
					'success_redirect_url',
					{
						fields: [
							'id',
							'name',
							'type',
							'label',
							'placeholder',
							'help',
							'required',
							'validation',
							'choices',
							'width',
							'sort',
						],
					},
				],
				deep: { fields: { _sort: ['sort'] } } as any,
				sort: ['sort'],
				limit: 1,
			}),
		);

		const form = forms[0] as Form | undefined;

		if (!form) {
			throw createError({ statusCode: 404, statusMessage: 'Form not found' });
		}

		return form;
	} catch (error) {
		if (isError(error)) throw error;

		throw createError({ statusCode: 500, statusMessage: 'Failed to load form' });
	}
});
