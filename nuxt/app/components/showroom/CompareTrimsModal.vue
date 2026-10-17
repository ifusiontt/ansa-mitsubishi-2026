<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'radix-vue';
import type { VehiclePageTrim } from '#shared/types/vehicle';

/**
 * Global Compare Trims modal, mounted once in layouts/default.vue and opened from the showroom
 * Trims section via useCompareTrims().open(vehicle). A side-by-side matrix: one column per published
 * trim (cheapest first, as on the page), rows for price, engine, transmission, drivetrain, seating
 * and each trim's key features. Each column can hand off to the test-drive modal with that trim.
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
						<table class="w-full min-w-[640px] border-collapse text-left text-sm">
							<caption class="sr-only">{{ title }} trim comparison</caption>
							<thead class="sticky top-0 z-10 bg-white dark:bg-zinc-900">
								<tr>
									<th scope="col" class="w-40 border-b border-zinc-200 p-4 md:pl-8 dark:border-zinc-800"><span class="sr-only">Specification</span></th>
									<th
										v-for="trim in trims"
										:key="trim.id"
										scope="col"
										class="border-b border-zinc-200 p-4 align-bottom text-base font-bold uppercase tracking-wider text-zinc-900 md:last:pr-8 dark:border-zinc-800 dark:text-white"
									>
										{{ trim.trim_name }}
									</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="row in SPEC_ROWS" :key="row.label" class="even:bg-zinc-50/70 dark:even:bg-zinc-800/30">
									<th scope="row" class="p-4 align-top text-[11px] font-bold uppercase tracking-wider text-zinc-500 md:pl-8 dark:text-zinc-400">{{ row.label }}</th>
									<td
										v-for="trim in trims"
										:key="trim.id"
										class="p-4 align-top leading-snug md:last:pr-8"
										:class="row.label === 'Price' ? 'text-base font-bold text-brand-red' : 'text-zinc-800 dark:text-zinc-200'"
									>
										{{ row.value(trim) || '—' }}
									</td>
								</tr>
								<tr>
									<th scope="row" class="p-4 align-top text-[11px] font-bold uppercase tracking-wider text-zinc-500 md:pl-8 dark:text-zinc-400">Key Features</th>
									<td v-for="trim in trims" :key="trim.id" class="p-4 align-top md:last:pr-8">
										<ul v-if="trim.key_features?.length" class="space-y-2">
											<li v-for="(feature, index) in trim.key_features" :key="index" class="flex gap-2 leading-snug text-zinc-700 dark:text-zinc-300">
												<svg class="mt-0.5 size-4 shrink-0 text-brand-red" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
													<path d="M4 10.5l4 4 8-9" stroke-linecap="round" stroke-linejoin="round" />
												</svg>
												<span>{{ feature.value }}</span>
											</li>
										</ul>
										<span v-else class="text-zinc-400">—</span>
									</td>
								</tr>
								<tr>
									<td class="md:pl-8" />
									<td v-for="trim in trims" :key="trim.id" class="px-4 pb-6 pt-2 md:last:pr-8">
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
