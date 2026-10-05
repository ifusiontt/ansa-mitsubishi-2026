<script setup lang="ts">
import type { VehicleSummary } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/** Fleet strip: side-profile cutouts (menu_image, falling back to hero media), prices and showroom links. */
defineProps<{ vehicles: VehicleSummary[] }>();

const cutoutUrl = (vehicle: VehicleSummary) => {
	const id = directusFileId(vehicle.menu_image) || directusFileId(vehicle.hero_block?.media);
	return id ? `${getDirectusAssetURL(id)}?width=960&quality=82&format=webp` : '';
};
</script>

<template>
	<section id="models" class="scroll-mt-20 bg-black py-20 text-white lg:py-28" aria-labelledby="home-models-heading">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16">
			<p class="text-xs font-bold uppercase tracking-[0.3em] text-[#C3002F]">The Lineup</p>
			<h2 id="home-models-heading" class="mt-3 text-3xl font-black uppercase tracking-tight md:text-5xl">Find your Mitsubishi</h2>

			<ul class="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
				<li v-for="vehicle in vehicles" :key="vehicle.id">
					<NuxtLink
						:to="`/showroom/${vehicle.slug}`"
						class="group flex h-full flex-col rounded-xl border border-neutral-900 bg-neutral-950 p-6 transition-colors hover:border-[#C3002F]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C3002F]"
					>
						<div class="relative aspect-[16/9]">
							<div class="absolute inset-x-6 bottom-1 h-4 rounded-[50%] bg-black/80 blur-md" aria-hidden="true" />
							<img
								v-if="cutoutUrl(vehicle)"
								:src="cutoutUrl(vehicle)"
								:alt="vehicle.title"
								loading="lazy"
								class="relative h-full w-full object-contain transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105"
							/>
						</div>
						<p v-if="vehicle.model_year" class="mt-6 text-xs font-bold uppercase tracking-widest text-neutral-500">{{ vehicle.model_year }}</p>
						<h3 class="mt-1 text-xl font-black uppercase tracking-tight">{{ vehicle.title }}</h3>
						<p v-if="vehicle.starting_price" class="mt-2 text-sm text-neutral-400">
							From <span class="font-bold text-white">{{ formatTtdPrice(vehicle.starting_price) }}</span>
						</p>
						<span class="mt-auto inline-flex items-center gap-2 pt-6 text-xs font-bold uppercase tracking-widest text-white">
							Explore
							<Icon name="lucide:arrow-right" class="h-4 w-4 text-[#C3002F] transition-transform group-hover:translate-x-1" />
						</span>
					</NuxtLink>
				</li>
			</ul>
		</div>
	</section>
</template>
