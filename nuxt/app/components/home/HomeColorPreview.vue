<script setup lang="ts">
import type { VehiclePage, VehicleSummary } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';
import VehicleColorStage from '~/components/showroom/VehicleColorStage.vue';

/**
 * Homepage colour switcher: pick a model, then a vehicle_colors swatch. Hovering a swatch previews
 * it on the stage instantly; clicking locks it in, and leaving the palette returns to the locked colour.
 * OEM split stage — copy, segmented model switcher and CTA on the light side; the render,
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
/** Swatch under the pointer — drives the stage while set; the click selection is what sticks. */
const previewColorIdx = ref<number | null>(null);
const shownColorIdx = computed(() => previewColorIdx.value ?? selectedColorIdx.value);
const shownColor = computed(() => colors.value[shownColorIdx.value] ?? null);
// From the already-loaded fleet list, so the tabs and CTA update on click, before the colour fetch lands.
const selectedModel = computed(() => props.vehicles.find((model) => model.slug === selectedSlug.value));
const shortName = (title: string) => title.replace(/^Mitsubishi\s+/, '');

watch(selectedSlug, () => {
	selectedColorIdx.value = 0;
	previewColorIdx.value = null;
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

				<div class="mt-8 flex flex-wrap gap-2" role="group" aria-label="Choose a model">
					<button
						v-for="model in vehicles"
						:key="model.slug"
						type="button"
						:aria-pressed="model.slug === selectedSlug"
						class="rounded-full px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
						:class="
							model.slug === selectedSlug
								? 'flex items-center gap-1.5 bg-neutral-900 font-semibold text-white shadow-sm ring-1 ring-black dark:bg-white dark:text-neutral-950 dark:ring-white'
								: 'bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
						"
						@click="selectedSlug = model.slug"
					>
						<span v-if="model.slug === selectedSlug" class="h-1.5 w-1.5 rounded-full bg-brand-red" aria-hidden="true" />
						{{ shortName(model.title) }}
					</button>
				</div>

				<NuxtLink
					v-if="selectedModel"
					:to="`/showroom/${selectedModel.slug}#colors`"
					class="mt-10 inline-flex items-center gap-2 rounded-md bg-brand-red px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-red-dark hover:text-white"
				>
					Explore the {{ shortName(selectedModel.title) }}
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
					:style="{ color: shownColor?.hex_code || '#0A0A0A' }"
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
						:src="colorRenderUrl(shownColorIdx)"
						:alt="`${vehicle?.title ?? ''} in ${shownColor?.color_name ?? ''}`"
						:preload="renderUrls"
						img-class="drop-shadow-[0_24px_30px_rgba(0,0,0,0.75)]"
					/>
					<div
						class="mx-auto -mt-6 h-8 w-4/5 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.4)_45%,transparent_72%)] blur-sm"
						aria-hidden="true"
					/>
				</div>

				<div v-if="colors.length" class="mt-8 flex flex-col items-center text-center">
					<div class="flex flex-wrap items-center justify-center gap-4" role="radiogroup" aria-label="Exterior colours" @mouseleave="previewColorIdx = null">
						<button
							v-for="(color, index) in colors"
							:key="color.id"
							type="button"
							role="radio"
							:aria-checked="index === selectedColorIdx"
							:aria-label="color.color_name"
							class="h-8 w-8 rounded-full border border-white/10 shadow-md transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
							:class="
								index === selectedColorIdx
									? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-neutral-950'
									: index === previewColorIdx
										? 'scale-110 ring-1 ring-white/60 ring-offset-2 ring-offset-neutral-950'
										: 'hover:scale-110'
							"
							:style="{ background: color.hex_code }"
							@mouseenter="previewColorIdx = index"
							@click="selectedColorIdx = index"
						/>
					</div>
					<!-- Visual label follows the preview; only the locked selection is announced -->
					<p v-if="shownColor" class="mt-6 text-lg font-bold uppercase tracking-widest" aria-hidden="true">
						{{ shownColor.color_name }}
						<span v-if="shownColor.color_code" class="ml-2 text-sm text-neutral-400">{{ shownColor.color_code }}</span>
					</p>
					<p v-if="selectedColor" class="sr-only" aria-live="polite">
						{{ selectedColor.color_name }}<template v-if="selectedColor.color_code">, paint code {{ selectedColor.color_code }}</template>
					</p>
				</div>
			</div>
		</div>
	</section>
</template>
