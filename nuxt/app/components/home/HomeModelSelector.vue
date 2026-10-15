<script setup lang="ts">
import type { VehicleSummary } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Fleet strip: side-profile cutouts (menu_image, falling back to hero media), prices and showroom links.
 *
 * Cutouts share one studio framing (4000x2800 canvas, car ~69% wide between ~24% and ~74% of the
 * height — directus/seeds/add-vehicle-menu-image.mjs normalises any that differ), so the stage
 * sizes the image by that framing: every car fills ~90% of the fixed-height stage, tyres on the
 * contact shadow, at the same scale.
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
		class="scroll-mt-20 bg-[#F6F7F9] py-24 text-neutral-950 dark:bg-black dark:text-white md:py-32"
		aria-labelledby="home-models-heading"
	>
		<div class="mx-auto max-w-6xl px-4 sm:px-6">
			<p class="text-xs font-bold uppercase tracking-[0.3em] text-brand-red">The Lineup</p>
			<h2 id="home-models-heading" class="mt-3 text-3xl font-black uppercase tracking-tight md:text-5xl">Find your Mitsubishi</h2>
			<p class="mt-4 max-w-2xl text-base leading-relaxed tracking-wide text-neutral-600 dark:text-neutral-400 md:text-lg">
				Engineered for performance, capability, and reliability across Trinidad &amp; Tobago.
			</p>

			<ul class="mt-14 flex flex-wrap justify-center gap-6">
				<li v-for="vehicle in vehicles" :key="vehicle.id" class="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc((100%-3rem)/3)]">
					<NuxtLink
						:to="`/showroom/${vehicle.slug}`"
						class="group flex h-full min-h-[480px] flex-col justify-between overflow-hidden rounded-xl border border-t-2 border-neutral-200/80 border-t-brand-red bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red dark:border-neutral-800 dark:border-t-brand-red dark:bg-neutral-900"
					>
						<!-- Studio stage -->
						<div class="relative flex h-52 items-center justify-center bg-gradient-to-b from-neutral-100/70 to-transparent p-6 dark:from-neutral-800/50">
							<div class="relative h-full w-full">
								<div
									class="absolute inset-x-0 bottom-[-2%] mx-auto h-5 w-[85%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.1)_45%,transparent_72%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.8)_0%,transparent_72%)]"
									aria-hidden="true"
								/>
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
							<span
								v-if="CATEGORIES[vehicle.slug]"
								class="mb-3 w-fit rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
							>
								{{ CATEGORIES[vehicle.slug] }}
							</span>
							<h3 class="text-xl font-bold text-neutral-950 dark:text-white">{{ vehicle.title }}</h3>
							<p v-if="vehicle.model_year" class="mt-1 text-xs uppercase tracking-widest text-neutral-400">{{ vehicle.model_year }} model</p>
							<p v-if="vehicle.starting_price" class="mb-4 mt-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
								From {{ formatTtdPrice(vehicle.starting_price) }}
							</p>

							<!-- The whole card is the link; this is its visual button -->
							<span
								class="mt-auto w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-center text-sm font-medium text-neutral-800 transition-colors group-hover:border-brand-red group-hover:text-brand-red dark:border-neutral-700 dark:text-white"
							>
								Explore {{ vehicle.title.replace(/^Mitsubishi\s+/, '') }}
							</span>
						</div>
					</NuxtLink>
				</li>
			</ul>
		</div>
	</section>
</template>
