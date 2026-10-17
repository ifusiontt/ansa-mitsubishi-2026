import {
	INQUIRY_FORM_TITLES,
	dealerLabel,
	financingInquirySchema,
	partsRequestSchema,
	serviceBookingSchema,
	testDriveSchema,
	toInquiryMetadata,
	type InquiryType,
} from '#shared/types/contact';
import type { Form } from '#shared/types/schema';

/**
 * Service booking / parts request / test-drive / financing pre-approval handler for /service,
 * /parts, the homepage and the showroom modals.
 *
 * Body: `{ type: 'service' | 'parts' | 'test_drive' | 'financing_inquiry', data: {...} }` (InquiryPayload). The data is
 * re-validated with the same zod schema the form uses, then stored as one
 * `form_submissions` row: `form` → the matching INQUIRY_FORM_TITLES form,
 * `submission_type`, and the structured `metadata` JSON. The form's email
 * templates are rendered with the metadata as `{# field #}` merge values.
 */
export default defineEventHandler(async (event) => {
	const TOKEN = useRuntimeConfig().directusServerToken as string;

	if (!TOKEN) {
		throw createError({ statusCode: 500, statusMessage: 'DIRECTUS_SERVER_TOKEN is not defined. Check your .env file.' });
	}

	const body = await readBody<{ type?: unknown; data?: unknown }>(event);
	const type = body?.type as InquiryType;

	const schemas = {
		service: serviceBookingSchema,
		parts: partsRequestSchema,
		test_drive: testDriveSchema,
		financing_inquiry: financingInquirySchema,
	};
	// Own-key check so prototype keys ("constructor", "__proto__") are rejected rather than looked up.
	const schema = typeof type === 'string' && Object.hasOwn(schemas, type) ? schemas[type] : undefined;

	if (!schema) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid inquiry type' });
	}

	const parsed = schema.safeParse(body.data);

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: parsed.error.issues[0]?.message ?? 'Invalid submission',
			data: { fieldErrors: parsed.error.flatten().fieldErrors },
		});
	}

	const metadata =
		type === 'service'
			? toInquiryMetadata({ type, data: parsed.data as typeof serviceBookingSchema._output })
			: type === 'parts'
				? toInquiryMetadata({ type, data: parsed.data as typeof partsRequestSchema._output })
				: type === 'test_drive'
					? toInquiryMetadata({ type, data: parsed.data as typeof testDriveSchema._output })
					: toInquiryMetadata({ type, data: parsed.data as typeof financingInquirySchema._output });

	let form: Pick<Form, 'id' | 'title' | 'emails'> | undefined;

	try {
		const forms = (await directusServer.request(
			withToken(
				TOKEN,
				readItems('forms', {
					filter: { title: { _eq: INQUIRY_FORM_TITLES[type] }, is_active: { _eq: true } },
					fields: ['id', 'title', 'emails'],
					limit: 1,
				}),
			),
		)) as Pick<Form, 'id' | 'title' | 'emails'>[];
		form = forms[0];
	} catch (error) {
		console.error('[forms] Failed to load inquiry form', error);
	}

	if (!form) {
		throw createError({ statusCode: 503, statusMessage: 'This form is currently unavailable' });
	}

	let submissionId: string | null = null;

	try {
		const submission = (await directusServer.request(
			withToken(
				TOKEN,
				createItem('form_submissions', { form: form.id, submission_type: type, metadata } as any, { fields: ['id'] }),
			),
		)) as { id?: string } | null;
		submissionId = submission?.id ?? null;
	} catch (error) {
		console.error('[forms] Failed to store inquiry submission', error);
		throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' });
	}

	// Best-effort, as in /api/forms/submit: the submission is already stored.
	try {
		const mergeValues = Object.fromEntries(
			Object.entries({ ...metadata, dealer: metadata.dealer_id ? dealerLabel(metadata.dealer_id) : '' }).map(([key, value]) => [key, value == null ? '' : String(value)]),
		);
		await dispatchFormEmails(renderFormEmails(form.emails, mergeValues), {
			formId: form.id,
			formTitle: form.title,
			submissionId,
		});
	} catch (error) {
		console.error('[forms] Failed to dispatch inquiry emails', error);
	}

	return { success: true };
});
