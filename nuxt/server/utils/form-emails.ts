import type { Form } from '#shared/types/schema';

export type FormEmailTemplate = NonNullable<Form['emails']>[number];

export interface RenderedFormEmail {
	to: string[];
	subject: string;
	message: string;
}

/** Matches Directus form merge tags such as `{# email #}` or `{#first_name#}`. */
const MERGE_TAG_PATTERN = /\{#\s*([\w-]+)\s*#\}/g;

/** Field names are slugs, so `inquiry-type` and `inquiry_type` refer to the same field. */
const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/-/g, '_');

/**
 * Replaces every `{# field_name #}` tag with the matching submission value.
 * Unknown tags resolve to an empty string so raw tags never reach a recipient.
 */
export function parseMergeTags(template: string, values: Record<string, string>): string {
	const lookup = new Map(Object.entries(values).map(([key, value]) => [normalizeKey(key), value]));

	return template.replace(MERGE_TAG_PATTERN, (_, key: string) => lookup.get(normalizeKey(key)) ?? '');
}

export function renderFormEmails(
	templates: Form['emails'] | undefined,
	values: Record<string, string>,
): RenderedFormEmail[] {
	if (!Array.isArray(templates)) return [];

	return templates
		.map((template) => ({
			// `to` entries may themselves be merge tags (e.g. `{# email #}` for a confirmation receipt).
			to: (template.to ?? [])
				.flatMap((recipient) => parseMergeTags(recipient, values).split(','))
				.map((recipient) => recipient.trim())
				.filter((recipient) => recipient.includes('@')),
			subject: parseMergeTags(template.subject ?? '', values),
			message: parseMergeTags(template.message ?? '', values),
		}))
		.filter((email) => email.to.length > 0);
}

/**
 * Hands rendered emails to the configured delivery webhook (e.g. a Directus Flow
 * with a Webhook trigger + Send Email operation). Without one configured the
 * emails are only logged, so submissions still succeed in local development.
 */
export async function dispatchFormEmails(
	emails: RenderedFormEmail[],
	context: { formId: string; formTitle?: string | null; submissionId?: string | null },
): Promise<void> {
	if (!emails.length) return;

	const { formsEmailWebhookUrl } = useRuntimeConfig();

	if (!formsEmailWebhookUrl) {
		console.warn(
			`[forms] ${emails.length} email(s) rendered for form "${context.formTitle ?? context.formId}" but FORMS_EMAIL_WEBHOOK_URL is not set; skipping delivery.`,
		);
		return;
	}

	await $fetch(formsEmailWebhookUrl as string, {
		method: 'POST',
		body: { ...context, emails },
	});
}
