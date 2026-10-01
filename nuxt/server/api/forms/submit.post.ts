import { multipartToFormData, validateFormSubmission } from '@@/app/lib/directus/validateFormSubmission';
import type { Form, FormField } from '@@/shared/types/schema';

interface SubmissionValue {
	field: string;
	value?: string;
	file?: string;
}

/** Prefer the human-readable choice label (e.g. "Outlander Sport") over its stored value in emails. */
function displayValue(field: FormField, value: string): string {
	const choice = field.choices?.find((option) => option.value === value);
	return choice?.text ?? value;
}

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	const formData = await readMultipartFormData(event);

	if (!formData) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid form submission',
		});
	}

	const TOKEN = config.directusServerToken as string;

	if (!TOKEN) {
		throw createError({
			statusCode: 500,
			statusMessage: 'DIRECTUS_SERVER_TOKEN is not defined. Check your .env file.',
		});
	}

	let formId = '';

	for (const field of formData) {
		if (field.name === 'formId') {
			formId = field.data.toString();
		}
	}

	if (!formId.trim()) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Missing or invalid formId',
		});
	}

	// Fetch the authoritative form field definitions from Directus server-side.
	// This ensures validation rules (required, validation patterns) come from the
	// source of truth rather than client-provided data.
	let form: Form;
	let fields: FormField[];

	try {
		form = (await directusServer.request(
			withToken(
				TOKEN,
				readItem('forms', formId.trim(), {
					fields: [
						'id',
						'title',
						'is_active',
						'emails',
						{ fields: ['id', 'name', 'type', 'label', 'required', 'validation', 'choices'] },
					],
				} as any),
			),
		)) as unknown as Form;

		if (!form.is_active || !Array.isArray(form.fields)) {
			throw new Error('Invalid form');
		}

		fields = form.fields.filter((field): field is FormField => typeof field !== 'string');
	} catch {
		throw createError({
			statusCode: 400,
			statusMessage: 'Missing or invalid form',
		});
	}

	const bodyFormData = multipartToFormData(formData);
	const validation = validateFormSubmission(fields, bodyFormData);

	if (!validation.success) {
		throw createError({
			statusCode: 400,
			statusMessage: validation.error,
		});
	}

	try {
		const submissionValues: SubmissionValue[] = [];
		// Plain-text values keyed by field name, used to resolve `{# field_name #}` email merge tags.
		const mergeValues: Record<string, string> = {};

		for (const field of fields) {
			if (!field.name) continue;
			const value = validation.data[field.name];
			if (value === undefined || value === null) continue;

			if (field.type === 'file' && value instanceof File) {
				const uploadFormData = new FormData();
				uploadFormData.append('file', value);

				const uploadedFile = (await directusServer.request(withToken(TOKEN, uploadFiles(uploadFormData)))) as {
					id?: string;
				};

				if (uploadedFile?.id) {
					submissionValues.push({
						field: field.id,
						file: uploadedFile.id,
					});
					mergeValues[field.name] = value.name;
				}
			} else {
				submissionValues.push({
					field: field.id,
					value: String(value),
				});
				mergeValues[field.name] = Array.isArray(value)
					? value.map((item) => displayValue(field, String(item))).join(', ')
					: displayValue(field, String(value));
			}
		}

		const payload = {
			form: formId.trim(),
			values: submissionValues,
		};

		const submission = (await directusServer.request(
			withToken(TOKEN, createItem('form_submissions', payload, { fields: ['id'] })),
		)) as { id?: string } | null;

		// Email delivery is best-effort: the submission is already stored, so a mail
		// failure must not surface as a failed submission to the visitor.
		try {
			await dispatchFormEmails(renderFormEmails(form.emails, mergeValues), {
				formId: formId.trim(),
				formTitle: form.title,
				submissionId: submission?.id ?? null,
			});
		} catch (error) {
			console.error('[forms] Failed to dispatch form emails', error);
		}

		return { success: true };
	} catch {
		throw createError({
			statusCode: 500,
			statusMessage: 'Internal Server Error',
		});
	}
});
