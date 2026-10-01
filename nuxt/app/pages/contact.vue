<script setup lang="ts">
import type { Form, FormField } from '#shared/types/schema';
import FormBuilder from '~/components/forms/FormBuilder.vue';

/**
 * /contact — renders the active "Contact" form from the Directus `forms` collection.
 *
 * Showroom CTAs link here as `/contact?vehicle=<slug>&trim=<trim_name>&intent=<intent>`;
 * those values pre-fill the matching `vehicle`, `trim` and `inquiry_type` fields.
 */
const CONTACT_FORM_TITLE = 'Contact';

/** Query-string key → form field name it pre-fills. */
const PREFILL_MAP = {
	vehicle: 'vehicle',
	trim: 'trim',
	intent: 'inquiry_type',
} as const;

const route = useRoute();

const { data: form } = await useFetch<Form>('/api/forms/one', {
	key: 'form-contact',
	query: { title: CONTACT_FORM_TITLE },
});

const fields = computed(() => (form.value?.fields ?? []).filter((field): field is FormField => typeof field !== 'string'));

/** Slug-style comparison so `outlander-sport`, `Outlander Sport` and `outlander_sport` all match. */
const toSlug = (value: string) =>
	value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const normalizeName = (name: string) => name.toLowerCase().replace(/-/g, '_');

/**
 * Select/radio fields need one of their stored choice values, so the raw query
 * value is matched against each choice's value or label; free-text fields take it as-is.
 */
function resolvePrefillValue(field: FormField, raw: string): string | undefined {
	if (!['select', 'radio'].includes(field.type ?? '')) return raw;

	const target = toSlug(raw);
	const choice = field.choices?.find(
		(option) =>
			toSlug(option.value) === target ||
			toSlug(option.text) === target ||
			toSlug(option.text).endsWith(`-${target}`), // e.g. "Mitsubishi Triton" ← "triton"
	);

	return choice?.value;
}

const prefill = computed<Record<string, string>>(() => {
	const values: Record<string, string> = {};

	for (const [queryKey, fieldName] of Object.entries(PREFILL_MAP)) {
		const queryValue = route.query[queryKey];
		const raw = Array.isArray(queryValue) ? queryValue[0] : queryValue;
		if (!raw) continue;

		const field = fields.value.find((f) => f.name && normalizeName(f.name) === fieldName);
		if (!field?.name) continue;

		const value = resolvePrefillValue(field, raw);
		if (value) values[field.name] = value;
	}

	return values;
});

const contactForm = computed(() =>
	form.value
		? {
				...form.value,
				fields: fields.value,
			}
		: null,
);

useSeoMeta({
	title: 'Contact Us',
	description: 'Contact ANSA Mitsubishi about sales, test drives, service and parts.',
	ogTitle: 'Contact Us',
	ogDescription: 'Contact ANSA Mitsubishi about sales, test drives, service and parts.',
});
</script>

<template>
	<section class="bg-black text-white min-h-[70vh] py-16 md:py-24">
		<Container>
			<div class="max-w-3xl mx-auto">
				<p class="text-xs font-semibold uppercase tracking-[0.2em] text-[#C3002F]">ANSA Mitsubishi</p>
				<h1 class="mt-3 text-4xl md:text-5xl font-bold tracking-tight">Contact Us</h1>
				<p class="mt-4 text-neutral-400 max-w-xl">
					Questions about a vehicle, a test drive, or service? Send us a message and our team will get back to you.
				</p>

				<div class="mt-10">
					<!-- The query-derived prefill is part of the key so client-side navigation re-seeds the form. -->
					<FormBuilder
						v-if="contactForm && contactForm.fields.length"
						:key="JSON.stringify(prefill)"
						:form="contactForm"
						:prefill="prefill"
						theme="dark"
					/>
					<div v-else role="status" class="border border-neutral-800 rounded-lg p-8 text-neutral-400">
						The contact form is currently unavailable. Please call or visit your nearest ANSA Mitsubishi dealership.
					</div>
				</div>
			</div>
		</Container>
	</section>
</template>
