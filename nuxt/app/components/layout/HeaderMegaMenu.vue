<script setup lang="ts">
import type { VehicleFileRef, VehicleSummary } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Pitch-black vehicle mega menu, rendered inside the sticky header and shown
 * beneath it. Open/close state (hover + click on the "Showroom" nav item) is
 * owned by NavigationBar; this component only renders the published fleet.
 */
defineProps<{ open: boolean; id: string }>();
const emit = defineEmits<{ close: [] }>();

// Client-side and non-blocking: the menu is hover-revealed, so it must never delay page SSR.
const { data: vehicles, status } = useFetch<VehicleSummary[]>('/api/vehicles', {
	key: 'vehicles-menu',
	server: false,
	lazy: true,
	default: () => [],
});

const fileId = (ref: VehicleFileRef | null | undefined) => (typeof ref === 'string' ? ref : (ref?.id ?? ''));

/** `menu_image`, falling back to the hero image; resized by Directus for the card. */
function cardImage(vehicle: VehicleSummary): string {
	const id = fileId(vehicle.menu_image) || fileId(vehicle.hero_block?.media);
	return id ? `${getDirectusAssetURL(id)}?width=720&quality=80&format=webp` : '';
}

const displayTitle = (vehicle: VehicleSummary) =>
	[vehicle.model_year, vehicle.title.replace(/^mitsubishi\s+/i, '')].filter(Boolean).join(' ');

// Cards whose image failed to load fall back to the plain dark panel instead of a broken-image icon.
const failedImages = ref(new Set<number>());

const priceFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
</script>

<template>
	<Transition
		enter-active-class="transition duration-200 ease-out"
		enter-from-class="opacity-0 -translate-y-2"
		leave-active-class="transition duration-150 ease-in"
		leave-to-class="opacity-0 -translate-y-2"
	>
		<div
			v-show="open"
			:id="id"
			class="absolute inset-x-0 top-full bg-black/95 backdrop-blur-md border-b border-neutral-900 text-white p-8"
		>
			<Container>
				<p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">2026 Lineup</p>

				<ul
					v-if="vehicles.length"
					class="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
				>
					<li v-for="vehicle in vehicles" :key="vehicle.id">
						<NuxtLink
							:to="`/showroom/${vehicle.slug}`"
							class="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-4 focus-visible:ring-offset-black"
							@click="emit('close')"
						>
							<div class="aspect-[16/10] overflow-hidden rounded-xl bg-neutral-950 border border-neutral-900">
								<img
									v-if="cardImage(vehicle) && !failedImages.has(vehicle.id)"
									:src="cardImage(vehicle)"
									:alt="displayTitle(vehicle)"
									loading="lazy"
									class="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
									@error="failedImages = new Set(failedImages).add(vehicle.id)"
								/>
							</div>
							<p
								class="mt-4 text-sm font-bold uppercase tracking-widest transition-colors group-hover:text-brand-red"
							>
								{{ displayTitle(vehicle) }}
							</p>
							<p v-if="vehicle.starting_price" class="mt-1 text-sm text-neutral-400">
								From TT${{ priceFormatter.format(vehicle.starting_price) }}
							</p>
						</NuxtLink>
					</li>
				</ul>

				<ul
					v-else-if="status === 'pending' || status === 'idle'"
					class="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
					aria-hidden="true"
				>
					<li v-for="n in 3" :key="n">
						<div class="aspect-[16/10] rounded-xl bg-neutral-900 animate-pulse" />
						<div class="mt-4 h-4 w-2/3 rounded bg-neutral-900 animate-pulse" />
					</li>
				</ul>

				<p v-else class="mt-6 text-sm text-neutral-400">Vehicles are unavailable right now.</p>
			</Container>
		</div>
	</Transition>
</template>
