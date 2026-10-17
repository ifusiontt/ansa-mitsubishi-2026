<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'radix-vue';
import type { VehiclePageTrim } from '#shared/types/vehicle';

/**
 * Global Compare Trims modal, mounted once in layouts/default.vue and opened from the showroom
 * Trims section via useCompareTrims().open(vehicle). A side-by-side matrix: one column per published
 * trim (cheapest first, as on the page) separated by vertical rules, rows for price, engine,
 * transmission, drivetrain, seating and each trim's key features. The top trim's column is tinted.
 *
 * Features are diffed against the base (cheapest) trim by exact text (case/whitespace-insensitive):
 * items the base trim also lists are muted, anything else gets an UPGRADE badge and is listed first.
 * Each column can hand off to the test-drive modal with that trim.
 * Overlay sits at z-[70] so it covers the z-[60] sticky site header (as BookTestDriveModal does).
 */
const { isOpen, vehicleData, close } = useCompareTrims();
const { open: openTestDrive } = useTestDriveModal();

const title = computed(() => {
	const vehicle = vehicleData.value;
	return vehicle ? [vehicle.model_year, vehicle.title].filter(Boolean).join(' ') : '';
});

const trims = computed<VehiclePageTrim[]>(() =>
	[...(vehicleData.value?.trims ?? [])]
		.filter((trim) => trim.status === 'published')
		.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || a.trim_name.localeCompare(b.trim_name)),
);

const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
const baseFeatures = computed(() => new Set((trims.value[0]?.key_features ?? []).map((feature) => normalise(feature.value))));

type FeatureKind = 'base' | 'shared' | 'upgrade';

/** The base trim's own list renders plainly; higher trims list upgrades first, then shared items. */
function featuresFor(trim: VehiclePageTrim, index: number): { value: string; kind: FeatureKind }[] {
	const features = (trim.key_features ?? []).map((feature) => ({
		value: feature.value,
		kind: (index === 0 ? 'base' : baseFeatures.value.has(normalise(feature.value)) ? 'shared' : 'upgrade') as FeatureKind,
	}));
	return index === 0 ? features : [...features.filter((f) => f.kind === 'upgrade'), ...features.filter((f) => f.kind === 'shared')];
}

const isTop = (index: number) => trims.value.length > 1 && index === trims.value.length - 1;

/** Vertical rule between trim columns, plus the top trim's tint. */
const colClass = (index: number) => [
	'px-6',
	index < trims.value.length - 1 ? 'border-r border-zinc-200 dark:border-zinc-800' : '',
	isTop(index) ? 'bg-zinc-50/60 dark:bg-zinc-900/40' : '',
];

const seats = computed(() => (vehicleData.value?.seating_capacity ? `${vehicleData.value.seating_capacity} Seats` : ''));

const SPEC_ROWS = [
	{ label: 'Price', value: (trim: VehiclePageTrim) => formatTtdPrice(trim.price) },
	{ label: 'Engine', value: (trim: VehiclePageTrim) => trim.engine ?? '' },
	{ label: 'Transmission', value: (trim: VehiclePageTrim) => trim.transmission ?? '' },
	{ label: 'Drivetrain', value: (trim: VehiclePageTrim) => trim.drivetrain ?? '' },
	{ label: 'Seats', value: () => seats.value },
];

function onOpenChange(open: boolean) {
	if (!open) close();
}

// Focus the dialog itself rather than radix's default (the close button), so no ring flashes on X.
function focusDialog(event: Event) {
	event.preventDefault();
	(event.target as HTMLElement | null)?.focus();
}

function bookTrim(trim: VehiclePageTrim) {
	const vehicle = vehicleData.value;
	close();
	openTestDrive({ slug: vehicle?.slug, title: vehicle?.title, trim: trim.trim_name });
}
</script>

<template>
	<DialogRoot :open="isOpen" @update:open="onOpenChange">
		<DialogPortal>
			<DialogOverlay
				class="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
			/>
			<div class="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4">
				<DialogContent
					class="pointer-events-auto relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl duration-200 focus:outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
					@open-auto-focus="focusDialog"
				>
					<header class="flex items-start justify-between gap-6 border-b border-zinc-200 p-6 md:px-8 dark:border-zinc-800">
						<div>
							<p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">Find Your Fit</p>
							<DialogTitle class="mt-2 text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-white">Compare Trims</DialogTitle>
							<DialogDescription class="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{{ title }} · {{ trims.length }} trims side by side</DialogDescription>
						</div>
						<DialogClose
							class="grid size-9 shrink-0 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red dark:hover:bg-zinc-800 dark:hover:text-white"
							aria-label="Close"
						>
							<Icon name="lucide:x" class="size-5" />
						</DialogClose>
					</header>

					<!-- Both axes scroll: wide on phones (fixed min column width), tall when feature lists are long -->
					<div class="min-h-0 flex-1 overflow-auto">
						<table class="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
							<caption class="sr-only">{{ title }} trim comparison</caption>
							<thead class="sticky top-0 z-10">
								<tr>
									<th scope="col" class="w-40 border-b border-zinc-200 bg-white p-4 md:pl-8 dark:border-zinc-800 dark:bg-zinc-900">
										<span class="sr-only">Specification</span>
									</th>
									<!-- Opaque backgrounds: the header row is sticky over scrolling content -->
									<th
										v-for="(trim, index) in trims"
										:key="trim.id"
										scope="col"
										:class="[
											colClass(index),
											isTop(index) ? 'rounded-t-2xl bg-zinc-50 dark:bg-zinc-900' : 'bg-white dark:bg-zinc-900',
											'border-b border-zinc-200 py-4 align-bottom dark:border-zinc-800',
										]"
									>
										<span v-if="isTop(index)" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brand-red">Top of the range</span>
										<span class="text-base font-bold uppercase tracking-wider text-zinc-900 dark:text-white">{{ trim.trim_name }}</span>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="row in SPEC_ROWS" :key="row.label">
									<th scope="row" class="border-b border-zinc-100 p-4 align-top text-[11px] font-bold uppercase tracking-wider text-zinc-500 md:pl-8 dark:border-zinc-800/70 dark:text-zinc-400">
										{{ row.label }}
									</th>
									<td
										v-for="(trim, index) in trims"
										:key="trim.id"
										:class="[
											colClass(index),
											'border-b border-b-zinc-100 py-4 align-top leading-snug dark:border-b-zinc-800/70',
											row.label === 'Price' ? 'text-base font-bold text-brand-red' : 'text-zinc-800 dark:text-zinc-200',
										]"
									>
										{{ row.value(trim) || '—' }}
									</td>
								</tr>
								<tr>
									<th scope="row" class="p-4 align-top text-[11px] font-bold uppercase tracking-wider text-zinc-500 md:pl-8 dark:text-zinc-400">
										Key Features
										<span v-if="trims.length > 1" class="mt-2 block text-[10px] font-medium normal-case tracking-normal text-zinc-400">
											Upgrades are features not listed on the {{ trims[0]?.trim_name }}.
										</span>
									</th>
									<td v-for="(trim, index) in trims" :key="trim.id" :class="[colClass(index), 'py-4 align-top']">
										<ul v-if="trim.key_features?.length" class="space-y-2.5">
											<li v-for="feature in featuresFor(trim, index)" :key="feature.value" class="flex gap-2 leading-snug">
												<svg
													class="mt-0.5 size-4 shrink-0"
													:class="feature.kind === 'shared' ? 'text-zinc-300 dark:text-zinc-600' : 'text-brand-red'"
													viewBox="0 0 20 20"
													fill="none"
													stroke="currentColor"
													stroke-width="2.5"
													aria-hidden="true"
												>
													<path d="M4 10.5l4 4 8-9" stroke-linecap="round" stroke-linejoin="round" />
												</svg>
												<span
													:class="{
														'text-xs text-zinc-400 dark:text-zinc-500': feature.kind === 'shared',
														'text-sm font-semibold text-zinc-900 dark:text-white': feature.kind === 'upgrade',
														'text-sm text-zinc-700 dark:text-zinc-300': feature.kind === 'base',
													}"
												>
													{{ feature.value }}
													<span
														v-if="feature.kind === 'upgrade'"
														class="ml-1.5 inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-brand-red dark:bg-red-950/60"
													>
														Upgrade
													</span>
												</span>
											</li>
										</ul>
										<span v-else class="text-zinc-400">—</span>
									</td>
								</tr>
								<tr>
									<td class="md:pl-8" />
									<td
										v-for="(trim, index) in trims"
										:key="trim.id"
										:class="[colClass(index), isTop(index) ? 'rounded-b-2xl' : '', 'pb-6 pt-2']"
									>
										<button
											type="button"
											class="w-full rounded-md bg-brand-red px-4 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
											@click="bookTrim(trim)"
										>
											Book Test Drive
										</button>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</DialogContent>
			</div>
		</DialogPortal>
	</DialogRoot>
</template>
