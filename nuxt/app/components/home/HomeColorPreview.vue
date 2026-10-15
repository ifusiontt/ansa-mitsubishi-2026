<script setup lang="ts">
import type { VehiclePage, VehicleSummary } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';
import VehicleColorStage from '~/components/showroom/VehicleColorStage.vue';

/**
 * Homepage colour switcher: pick a model, then a vehicle_colors swatch.
 * OEM split stage — copy, model dropdown and CTA on the light side; the render,
 * floor shadow and swatches framed by a dark wedge with a slanted left edge
 * (full-bleed dark panel when stacked on mobile).
 * The selected model's colours come from /api/vehicles/:slug (the index endpoint
 * does not carry them); the first model is fetched during SSR.
 */
const props = defineProps<{ vehicles: VehicleSummary[] }>();

const selectedSlug = ref(props.vehicles[0]?.slug ?? '');
const selectedColorIdx = ref(0);

const { data: vehicle } = await useFetch<VehiclePage>(() => `/api/vehicles/${selectedSlug.value}`, {
	key: computed(() => `home-colors-${selectedSlug.value}`),
	immediate: !!selectedSlug.value,
});

const colors = computed(() => [...(vehicle.value?.colors ?? [])].sort((a, b) => a.sort - b.sort));
const selectedColor = computed(() => colors.value[selectedColorIdx.value] ?? null);

watch(selectedSlug, () => {
	selectedColorIdx.value = 0;
});

const renderUrl = (uuid: string) => (uuid ? `${getDirectusAssetURL(uuid)}?${VEHICLE_RENDER_QUERY}` : '');
const fallbackId = computed(() => directusFileId(vehicle.value?.hero_block?.media) || directusFileId(vehicle.value?.menu_image));
const colorRenderUrl = (index: number) => renderUrl(directusFileId(colors.value[index]?.image) || fallbackId.value);
const renderUrls = computed(() => colors.value.map((_, index) => colorRenderUrl(index)));
</script>

<template>
	<section
		v-if="vehicles.length"
		class="relative isolate overflow-hidden bg-white text-neutral-950 dark:bg-black dark:text-white"
		aria-labelledby="home-colors-heading"
	>
		<!-- Dark angled wedge (desktop): slanted left edge frames the stage. -->
		<div
			class="absolute inset-y-0 right-0 -z-10 hidden w-[58%] bg-gradient-to-br from-neutral-900 via-neutral-950 to-[#0b1630] [clip-path:polygon(16%_0,100%_0,100%_100%,0_100%)] lg:block"
			aria-hidden="true"
		/>

		<div class="mx-auto grid max-w-7xl items-center px-4 sm:px-6 lg:grid-cols-12 lg:px-16">
			<div class="py-24 md:py-32 lg:col-span-4">
				<p class="text-xs font-bold uppercase tracking-[0.3em] text-brand-red">Colour Studio</p>
				<h2 id="home-colors-heading" class="mt-3 text-3xl font-black uppercase tracking-tight md:text-5xl">Explore colour options</h2>
				<p class="mt-4 text-neutral-600 dark:text-neutral-400">Preview factory paint options across the 2026 lineup.</p>

				<label for="home-colors-model" class="mt-8 block text-xs font-bold uppercase tracking-widest text-neutral-500">Model</label>
				<div class="relative mt-2 max-w-xs">
					<select
						id="home-colors-model"
						v-model="selectedSlug"
						class="w-full appearance-none rounded-md border border-neutral-300 bg-white py-3 pl-4 pr-10 text-sm font-bold uppercase tracking-widest text-neutral-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
					>
						<option v-for="model in vehicles" :key="model.slug" :value="model.slug">{{ model.title }}</option>
					</select>
					<Icon
						name="lucide:chevron-down"
						class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
						aria-hidden="true"
					/>
				</div>

				<NuxtLink
					v-if="vehicle"
					:to="`/showroom/${vehicle.slug}#colors`"
					class="mt-10 inline-flex items-center gap-2 rounded-md bg-brand-red px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-red-dark hover:text-white"
				>
					Explore the {{ vehicle.title }}
					<Icon name="lucide:arrow-right" class="h-4 w-4" />
				</NuxtLink>
			</div>

			<!-- Mobile: full-bleed dark panel; desktop: transparent over the wedge. -->
			<div
				class="relative isolate -mx-4 overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-950 to-[#0b1630] px-4 py-16 text-white sm:-mx-6 sm:px-6 md:py-24 lg:col-span-8 lg:mx-0 lg:overflow-visible lg:bg-none lg:py-32 lg:pl-20 lg:pr-0"
			>
				<!-- Glow tinted toward the active paint; `currentColor` lets the colour change animate. -->
				<div
					class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_55%_55%,currentColor_0%,transparent_60%)] opacity-25 transition-colors duration-700"
					:style="{ color: selectedColor?.hex_code || '#0A0A0A' }"
					aria-hidden="true"
				/>

				<div class="relative mx-auto w-full max-w-3xl">
					<!-- Neutral ambient light so the render doesn't float on flat black -->
					<div
						class="pointer-events-none absolute -inset-x-16 -inset-y-12 bg-[radial-gradient(ellipse_65%_45%_at_50%_60%,rgba(255,255,255,0.07),transparent)]"
						aria-hidden="true"
					/>
					<VehicleColorStage
						class="relative z-10"
						:src="colorRenderUrl(selectedColorIdx)"
						:alt="`${vehicle?.title ?? ''} in ${selectedColor?.color_name ?? ''}`"
						:preload="renderUrls"
						img-class="drop-shadow-[0_24px_30px_rgba(0,0,0,0.75)]"
					/>
					<div
						class="mx-auto -mt-6 h-8 w-4/5 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.4)_45%,transparent_72%)] blur-sm"
						aria-hidden="true"
					/>
				</div>

				<div v-if="colors.length" class="mt-8 flex flex-col items-center text-center">
					<div class="flex flex-wrap items-center justify-center gap-4" role="radiogroup" aria-label="Exterior colours">
						<button
							v-for="(color, index) in colors"
							:key="color.id"
							type="button"
							role="radio"
							:aria-checked="index === selectedColorIdx"
							:aria-label="color.color_name"
							class="h-8 w-8 rounded-full border border-white/10 shadow-md transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
							:class="index === selectedColorIdx ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-neutral-950' : 'hover:scale-110'"
							:style="{ background: color.hex_code }"
							@click="selectedColorIdx = index"
						/>
					</div>
					<p v-if="selectedColor" class="mt-6 text-lg font-bold uppercase tracking-widest" aria-live="polite">
						{{ selectedColor.color_name }}
						<span v-if="selectedColor.color_code" class="ml-2 text-sm text-neutral-400">{{ selectedColor.color_code }}</span>
					</p>
				</div>
			</div>
		</div>
	</section>
</template>
