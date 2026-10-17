<script setup lang="ts">
import { VEHICLE_MODEL_OPTIONS, testDriveSchema, type TestDriveInput } from '#shared/types/contact';
import type { Dealer } from '#shared/types/schema';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Dealership hub: quick test-drive request (left) + branch directory (right).
 *
 * - The form posts `{ type: 'test_drive' }` to /api/forms/parts-service, stored in Directus
 *   `form_submissions` under the "Test Drive Request" form (directus/seeds/parts-service-forms.mjs).
 * - Branch phone, hours and map links come from the published `dealers` collection (matched by
 *   slug); a branch without a dealer record still renders and links to /contact.
 * - The left panel's photo is its own static asset (CONSOLE_IMAGE) — deliberately not tied to any
 *   vehicle's hero block, so re-pointing a hero never repaints this panel. `image` (a Directus file
 *   id) overrides it once a dedicated dealership/showroom shot is in the library.
 */
const props = withDefaults(defineProps<{ image?: string | null }>(), { image: null });

/** Xpander Cross studio render, pre-cropped 1000x1400 for the portrait panel. */
const CONSOLE_IMAGE = '/images/contact/dealership-console-xpander-cross.webp';

const BRANCHES = [
	{ slug: 'port-of-spain', label: 'Port of Spain', role: 'Head Office & Showroom' },
	{ slug: 'san-fernando', label: 'San Fernando', role: 'South Sales & Service' },
	{ slug: 'chaguanas', label: 'Chaguanas', role: 'Central Showroom' },
	{ slug: 'tobago', label: 'Tobago', role: 'Sales & Service Facility' },
];

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// Supplementary data: a failed fetch just leaves the branch names with /contact links.
const { data: dealers } = useFetch<Dealer[]>('/api/dealers', { key: 'dealers', default: () => [], lazy: true });

/** "Mon – Fri: 8:00 AM – 4:30 PM" / "Sat: 8:30 AM – 12:30 PM" lines from dealers.opening_hours. */
function hoursLines(hours: unknown): string[] {
	if (!hours || typeof hours !== 'object') return [];
	const byDay = hours as Record<string, string | undefined>;
	const dash = (value: string) => value.replace(/\s*-\s*/, ' – ');
	const lines: string[] = [];
	const weekday = byDay.monday;
	if (weekday && WEEKDAYS.every((day) => byDay[day] === weekday)) lines.push(`Mon – Fri: ${dash(weekday)}`);
	if (byDay.saturday) lines.push(`Sat: ${dash(byDay.saturday)}`);
	return lines;
}

const branches = computed(() =>
	BRANCHES.map((branch) => {
		const dealer = dealers.value?.find((d) => d.slug === branch.slug);
		return {
			...branch,
			address: addressLine(dealer),
			phone: dealer?.phone ?? null,
			hours: hoursLines(dealer?.opening_hours),
			mapsUrl: dealer?.google_maps_url ?? null,
		};
	}),
);

/** "Royal Road, San Fernando" — street plus city, unless the street already names the city. */
function addressLine(dealer?: Dealer): string | null {
	const street = dealer?.address?.trim();
	const city = dealer?.city?.trim();
	if (!street) return city || null;
	return city && !street.includes(city) ? `${street}, ${city}` : street;
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

const imageUrl = computed(() =>
	props.image ? `${getDirectusAssetURL(props.image)}?width=1000&height=1400&fit=cover&quality=78&format=webp` : CONSOLE_IMAGE,
);

/**
 * Dark-glass inputs over the photo. Ring offset and stacking are explicit so the global
 * `input:focus` rule in main.css (ring-2 + offset) can't override them.
 */
const inputClass =
	'relative z-10 block w-full rounded-md border border-white/25 bg-black/50 px-3 py-2.5 text-sm text-white caret-brand-red ' +
	'placeholder-neutral-400 backdrop-blur-sm transition-colors hover:border-white/40 focus:border-brand-red focus:outline-none ' +
	'focus:ring-1 focus:ring-brand-red focus:ring-offset-0 aria-[invalid=true]:border-brand-red/80 [color-scheme:dark]';

/** Field labels sit over the brightest part of the photo — pure white, bold, with a shadow. */
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]';

const initial = (): TestDriveInput => ({
	full_name: '',
	phone: '',
	vehicle_model: '' as TestDriveInput['vehicle_model'],
});

const { values, errors, loading, status, serverError, touch, submit } = useInquiryForm('test_drive', testDriveSchema, initial);
</script>

<template>
	<section class="bg-white px-4 py-12 text-neutral-950 dark:bg-black dark:text-white sm:px-6 md:py-24 lg:py-32" aria-labelledby="home-contact-heading">
		<div
			class="mx-auto grid max-w-6xl grid-cols-1 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900 lg:grid-cols-12"
		>
			<!-- Left: quick test-drive request over the showroom photo -->
			<div class="relative isolate p-8 text-white md:p-10 lg:col-span-5">
				<!-- Gradient sits under the photo, so a failed image load still leaves a dark panel -->
				<div class="absolute inset-0 -z-30 bg-gradient-to-br from-neutral-800 to-neutral-950" aria-hidden="true" />
				<img :src="imageUrl" alt="" loading="lazy" class="absolute inset-0 -z-20 h-full w-full object-cover brightness-125" />
				<!-- Deep scrim: the photo reads as texture only, so car lines never cross the form fields -->
				<div class="absolute inset-0 -z-10 bg-gradient-to-b from-black/90 via-black/80 to-black/95" aria-hidden="true" />

				<p class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em]">
					<span class="h-1.5 w-1.5 rounded-full bg-brand-red" aria-hidden="true" />
					Experience the lineup
				</p>
				<h2 id="home-contact-heading" class="mt-4 text-3xl font-black uppercase tracking-tight md:text-4xl">Ready when you are</h2>
				<p class="mt-3 text-neutral-300">Schedule a personalized test drive or visit our showroom.</p>

				<form class="mt-8 space-y-4" data-inquiry-form novalidate @submit.prevent="submit">
					<!-- Frosted panel keeps fields and submit on one clean surface -->
					<div class="space-y-4 rounded-xl border border-white/10 bg-black/55 p-5 backdrop-blur-md">
						<InquiryField v-slot="attrs" name="full_name" label="Name" required :label-class="labelClass" error-class="text-[#ff4d6d]" :error="errors.full_name">
							<input v-bind="attrs" v-model="values.full_name" type="text" autocomplete="name" :class="inputClass" @blur="touch('full_name')" />
						</InquiryField>
						<InquiryField v-slot="attrs" name="phone" label="Phone Number" required :label-class="labelClass" error-class="text-[#ff4d6d]" :error="errors.phone">
							<input
								v-bind="attrs"
								v-model="values.phone"
								type="tel"
								autocomplete="tel"
								placeholder="+1 (868) 000-0000"
								:class="inputClass"
								@blur="touch('phone')"
							/>
						</InquiryField>
						<InquiryField v-slot="attrs" name="vehicle_model" label="Model" required :label-class="labelClass" error-class="text-[#ff4d6d]" :error="errors.vehicle_model">
							<select v-bind="attrs" v-model="values.vehicle_model" :class="inputClass" @blur="touch('vehicle_model')">
								<option value="" disabled>Select a model</option>
								<option v-for="model in VEHICLE_MODEL_OPTIONS" :key="model" :value="model">{{ model }}</option>
							</select>
						</InquiryField>

						<button
							type="submit"
							:disabled="loading"
							class="w-full rounded-md bg-brand-red px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-70"
						>
							{{ loading ? 'Sending…' : 'Request Test Drive' }}
						</button>
					</div>

					<p v-if="status === 'success'" role="status" class="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
						Thank you! A sales consultant will call you to arrange your test drive.
					</p>
					<p v-else-if="status === 'error'" role="alert" class="rounded-md border border-brand-red/50 bg-brand-red/15 px-4 py-3 text-sm text-white">
						{{ serverError }}
					</p>
				</form>
			</div>

			<!-- Right: branch directory -->
			<div class="bg-white p-8 dark:bg-neutral-900 md:p-10 lg:col-span-7">
				<h3 class="text-xl font-black uppercase tracking-tight md:text-2xl">Authorized Locations Across Trinidad &amp; Tobago</h3>
				<p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
					Sales and servicing at every branch. Call ahead or drop in during opening hours.
				</p>

				<ul class="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2">
					<li
						v-for="branch in branches"
						:key="branch.slug"
						class="group flex flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 transition-all sm:p-4 hover:border-brand-red dark:border-neutral-700 dark:bg-neutral-800"
					>
						<p class="flex items-center gap-2 font-bold text-neutral-950 dark:text-white">
							<Icon name="lucide:map-pin" class="h-4 w-4 shrink-0 text-brand-red" aria-hidden="true" />
							{{ branch.label }}
						</p>
						<p class="mt-0.5 pl-6 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{{ branch.role }}</p>

						<div class="mt-2 space-y-0.5 pl-6 text-sm leading-snug sm:mt-3 sm:space-y-1 sm:leading-normal">
							<p v-if="branch.address" class="text-neutral-700 dark:text-neutral-300">{{ branch.address }}</p>
							<a
								v-if="branch.phone"
								:href="telHref(branch.phone)"
								class="block font-semibold text-neutral-800 transition-colors hover:text-brand-red dark:text-neutral-200"
							>
								{{ branch.phone }}
							</a>
							<p v-for="line in branch.hours" :key="line" class="text-neutral-600 dark:text-neutral-400">{{ line }}</p>
						</div>

						<NuxtLink
							:to="branch.mapsUrl || '/contact'"
							:external="!!branch.mapsUrl"
							:target="branch.mapsUrl ? '_blank' : undefined"
							:rel="branch.mapsUrl ? 'noopener' : undefined"
							class="mt-auto inline-flex items-center gap-1.5 pl-6 pt-3 text-xs sm:pt-4 font-bold uppercase tracking-widest text-neutral-950 transition-colors hover:text-brand-red dark:text-white"
						>
							{{ branch.mapsUrl ? 'View Map' : 'Contact branch' }}
							<Icon
								name="lucide:arrow-up-right"
								class="h-4 w-4 text-neutral-400 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-red"
								aria-hidden="true"
							/>
						</NuxtLink>
					</li>
				</ul>
			</div>
		</div>
	</section>
</template>
