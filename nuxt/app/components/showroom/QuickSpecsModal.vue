<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'radix-vue';

/**
 * Global Quick Specs modal, mounted once in layouts/default.vue and opened from the homepage fleet
 * cards via useQuickSpecsModal().open(vehicle). A 2-column at-a-glance grid: engine, power,
 * transmission and drivetrain summarised across the vehicle's published trims (a value that differs
 * per trim is listed once per variant), and the vehicle-level torque, suspension, seating, ground
 * clearance and dimensions fields (scripts/add-spec-fields.mjs). A spec without data is skipped.
 * The brochure and the full showroom page are the next steps.
 * Overlay sits at z-[70] over the z-[60] sticky header.
 */
const { isOpen, vehicle, close } = useQuickSpecsModal();

const unique = (values: (string | null | undefined)[]) => [...new Set(values.filter((v): v is string => !!v))];

const trims = computed(() => (vehicle.value?.trims ?? []).filter((trim) => trim.status === 'published'));

/** "Key specifications across all 3 trims · From TTD $255,000" */
const summary = computed(() =>
	[
		`Key specifications across ${trims.value.length === 1 ? 'the trim' : `all ${trims.value.length} trims`}`,
		vehicle.value?.starting_price ? `From ${formatTtdPrice(vehicle.value.starting_price)}` : '',
	]
		.filter(Boolean)
		.join(' · '),
);

/**
 * "2.4L MIVEC Intercooled Turbo Diesel (135 kW @ 3,500 rpm, 430 Nm)" → "135 kW";
 * "1.5L MIVEC … (77 kW / 105 PS, 141 Nm)" → "105 hp (77 kW)" — horsepower leads when both are given.
 */
function powerOf(engine: string) {
	const kw = engine.match(/([\d.,]+)\s*kW\b/i)?.[1];
	const hp = engine.match(/([\d.,]+)\s*(?:hp|PS)\b/i)?.[1];
	if (kw && hp) return `${hp} hp (${kw} kW)`;
	return engine.match(/([\d.,]+)\s*(hp|kW|PS)\b/i)?.slice(1, 3).join(' ');
}

const specs = computed(() => {
	const current = vehicle.value;
	if (!current) return [];
	const engines = unique(trims.value.map((trim) => trim.engine));
	const power = unique(engines.map(powerOf)).join(' / ');

	return [
		{ label: 'Engine / Displacement', icon: 'lucide:fuel', value: unique(engines.map((engine) => engine.split(' (')[0])).join(' / ') },
		{ label: 'Horsepower & Torque', icon: 'lucide:gauge', value: [power, current.torque].filter(Boolean).join(' · ') },
		{ label: 'Transmission', icon: 'lucide:cog', value: unique(trims.value.map((trim) => trim.transmission)).join(' / ') },
		{ label: 'Drivetrain', icon: 'lucide:settings-2', value: unique(trims.value.map((trim) => trim.drivetrain)).join(' / ') },
		{ label: 'Suspension', icon: 'lucide:move-vertical', value: current.suspension ?? '' },
		{ label: 'Seating Capacity', icon: 'lucide:users', value: current.seating_capacity ? `${current.seating_capacity} Passengers` : '' },
		{ label: 'Ground Clearance', icon: 'lucide:arrow-down-to-line', value: current.ground_clearance ?? '' },
		{ label: 'Dimensions (L × W × H)', icon: 'lucide:ruler', value: current.dimensions ?? '' },
	].filter((spec) => spec.value);
});

function onOpenChange(open: boolean) {
	if (!open) close();
}

// Focus the dialog itself rather than radix's default (the close button), so no ring flashes on X.
function focusDialog(event: Event) {
	event.preventDefault();
	(event.target as HTMLElement | null)?.focus();
}
</script>

<template>
	<DialogRoot :open="isOpen" @update:open="onOpenChange">
		<DialogPortal>
			<DialogOverlay
				class="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
			/>
			<div class="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
				<DialogContent
					v-if="vehicle"
					class="pointer-events-auto relative my-auto w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl duration-200 focus:outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 md:p-8 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
					@open-auto-focus="focusDialog"
				>
					<DialogClose
						class="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red md:right-6 md:top-6 dark:hover:bg-zinc-800 dark:hover:text-white"
						aria-label="Close"
					>
						<Icon name="lucide:x" class="size-5" />
					</DialogClose>

					<p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">At a Glance</p>
					<DialogTitle class="mt-2 pr-10 text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-white">2026 {{ vehicle.title }}</DialogTitle>
					<DialogDescription class="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{{ summary }}</DialogDescription>

					<dl class="mt-6 grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-800">
						<div v-for="spec in specs" :key="spec.label" class="flex gap-3 bg-white p-4 dark:bg-zinc-900">
							<Icon :name="spec.icon" class="mt-0.5 size-4 shrink-0 text-brand-red" aria-hidden="true" />
							<div class="min-w-0">
								<dt class="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{{ spec.label }}</dt>
								<dd class="mt-1 text-sm font-semibold leading-snug text-zinc-900 dark:text-white">{{ spec.value }}</dd>
							</div>
						</div>
					</dl>

					<div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
						<a
							v-if="vehicle.brochure_url"
							:href="vehicle.brochure_url"
							target="_blank"
							rel="noopener"
							class="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 px-6 py-3 text-xs font-bold uppercase tracking-widest text-zinc-800 transition-colors hover:border-brand-red hover:text-brand-red focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 dark:border-zinc-700 dark:text-white dark:focus-visible:ring-offset-zinc-900"
						>
							<Icon name="lucide:download" class="size-4" aria-hidden="true" />
							Download Brochure
						</a>
						<NuxtLink
							:to="`/showroom/${vehicle.slug}`"
							class="inline-flex items-center justify-center gap-2 rounded-md bg-brand-red px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 sm:ml-auto dark:focus-visible:ring-offset-zinc-900"
							@click="close"
						>
							Explore Full Model Page
							<Icon name="lucide:arrow-right" class="size-4" aria-hidden="true" />
						</NuxtLink>
					</div>
				</DialogContent>
			</div>
		</DialogPortal>
	</DialogRoot>
</template>
