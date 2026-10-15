<script setup lang="ts">
import type { VehicleSummary } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Fleet strip: side-profile cutouts (menu_image, falling back to hero media), prices and showroom links.
 *
 * Cutouts share one studio framing (4000x2800 canvas, car ~69% wide between ~24% and ~74% of the
 * height — directus/seeds/add-vehicle-menu-image.mjs normalises any that differ), so the stage
 * sizes the image by that framing: every car fills ~90% of the fixed-height stage, tyres on the
 * ground shadow, at the same scale.
 */
defineProps<{ vehicles: VehicleSummary[] }>();

/** Body-style tag above each model name. Keyed by slug; vehicles have no body-type field in Directus yet. */
const CATEGORIES: Record<string, string> = {
	'2025-outlander-sport': 'Hybrid Compact SUV',
	'outlander-sport': 'Hybrid Compact SUV',
	triton: 'Double Cab Pickup',
	'xpander-cross': '7-Seat Crossover MPV',
	xpander: '7-Seat MPV',
};

const cutoutUrl = (vehicle: VehicleSummary) => {
	const id = directusFileId(vehicle.menu_image) || directusFileId(vehicle.hero_block?.media);
	return id ? `${getDirectusAssetURL(id)}?width=960&quality=82&format=webp` : '';
};
</script>

<template>
	<section
		id="models"
		class="scroll-mt-20 bg-[#F4F5F7] py-24 text-neutral-950 dark:bg-black dark:text-white md:py-32"
		aria-labelledby="home-models-heading"
	>
		<div class="mx-auto max-w-6xl px-4 sm:px-6">
			<p class="text-xs font-bold uppercase tracking-[0.3em] text-brand-red">The Lineup</p>
			<h2 id="home-models-heading" class="mt-3 text-3xl font-black uppercase tracking-tight md:text-5xl">Find your Mitsubishi</h2>

			<ul class="mt-12 flex flex-wrap justify-center gap-6">
				<li v-for="vehicle in vehicles" :key="vehicle.id" class="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc((100%-3rem)/3)]">
					<NuxtLink
						:to="`/showroom/${vehicle.slug}`"
						class="group flex h-full flex-col rounded-lg border border-t-2 border-neutral-200 border-t-brand-red bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red dark:border-neutral-800 dark:border-t-brand-red dark:bg-neutral-900 dark:shadow-black/40"
					>
						<!-- Vehicle stage -->
						<div class="rounded-t-lg bg-neutral-50/70 p-4 dark:bg-neutral-800/40">
							<div class="relative h-36">
								<div class="absolute inset-x-0 bottom-[3%] mx-auto h-3 w-3/5 rounded-full bg-black/15 blur-md dark:bg-black/60" aria-hidden="true" />
								<img
									v-if="cutoutUrl(vehicle)"
									:src="cutoutUrl(vehicle)"
									:alt="vehicle.title"
									loading="lazy"
									class="absolute left-1/2 top-[-38%] h-[180%] w-auto max-w-none -translate-x-1/2 origin-[50%_74%] transition-transform duration-500 group-hover:scale-105"
								/>
							</div>
						</div>

						<div class="flex flex-1 flex-col p-6">
							<p class="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
								{{ CATEGORIES[vehicle.slug] ?? '' }}<span v-if="CATEGORIES[vehicle.slug] && vehicle.model_year"> · </span>{{ vehicle.model_year ?? '' }}
							</p>
							<h3 class="mt-1.5 text-xl font-black uppercase tracking-tight">{{ vehicle.title }}</h3>
							<p v-if="vehicle.starting_price" class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
								From <span class="font-bold text-neutral-950 dark:text-white">{{ formatTtdPrice(vehicle.starting_price) }}</span>
							</p>
							<span
								class="mt-auto inline-flex items-center gap-2 pt-6 text-xs font-bold uppercase tracking-widest text-neutral-950 transition-colors group-hover:text-brand-red dark:text-white"
							>
								Explore
								<Icon name="lucide:arrow-right" class="h-4 w-4 text-brand-red transition-transform group-hover:translate-x-1" />
							</span>
						</div>
					</NuxtLink>
				</li>
			</ul>
		</div>
	</section>
</template>
