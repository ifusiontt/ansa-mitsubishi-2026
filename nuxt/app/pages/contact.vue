<script setup lang="ts">
import type { Dealer, Form, FormField } from '#shared/types/schema';
import FormBuilder from '~/components/forms/FormBuilder.vue';
import DealershipMap from '~/components/shared/DealershipMap.vue';

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

// Branch locations are supplementary: a failed fetch just hides the map.
const { data: dealers } = await useFetch<Dealer[]>('/api/dealers', { key: 'dealers', default: () => [] });

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
	<section class="min-h-[70vh] bg-white py-16 text-zinc-900 md:py-24 dark:bg-zinc-950 dark:text-zinc-100">
		<Container>
			<div class="mx-auto max-w-3xl">
				<p class="mb-4">
					<span class="inline-flex items-center gap-2 border-l-2 border-brand-red pl-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
						ANSA Mitsubishi
					</span>
				</p>
				<h1 class="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl lg:text-5xl dark:text-white">Contact Us</h1>
				<p class="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600 md:text-base dark:text-zinc-300">
					Questions about a vehicle, a test drive, or service? Send us a message and our team will get back to you.
				</p>

				<div class="mt-10">
					<!-- The query-derived prefill is part of the key so client-side navigation re-seeds the form. -->
					<FormBuilder
						v-if="contactForm && contactForm.fields.length"
						:key="JSON.stringify(prefill)"
						:form="contactForm"
						:prefill="prefill"
						theme="console"
					/>
					<div
						v-else
						role="status"
						class="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-8 text-sm text-zinc-600 shadow-sm md:text-base dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300"
					>
						The contact form is currently unavailable. Please call or visit your nearest ANSA Mitsubishi dealership.
					</div>
				</div>
			</div>

			<div v-if="dealers?.length" class="mt-16 md:mt-24">
				<DealershipMap :dealers="dealers" />
			</div>
		</Container>
	</section>
</template>
