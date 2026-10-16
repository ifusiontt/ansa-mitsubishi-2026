<script setup lang="ts">
import type { VehiclePage, VehicleSummary } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';
import VehicleColorStage from '~/components/showroom/VehicleColorStage.vue';

/**
 * Homepage colour switcher: pick a model, then click a vehicle_colors swatch. Hovering an inactive
 * model pill (pointer devices, md+) floats a sneak-peek card above it: cutout, title, starting price.
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
/** Inactive model pill under a mouse pointer — shows its sneak-peek card. */
const peekSlug = ref<string | null>(null);
// From the already-loaded fleet list, so the tabs and CTA update on click, before the colour fetch lands.
const selectedModel = computed(() => props.vehicles.find((model) => model.slug === selectedSlug.value));
const shortName = (title: string) => title.replace(/^Mitsubishi\s+/, '');
/** Side-profile cutout for the sneak peek; the box crops it by the shared studio framing (as on the model cards). */
const peekThumbUrl = (model: VehicleSummary) => {
	const id = directusFileId(model.menu_image) || directusFileId(model.hero_block?.media);
	return id ? `${getDirectusAssetURL(id)}?width=480&quality=80&format=webp` : '';
};

watch(selectedSlug, () => {
	selectedColorIdx.value = 0;
	peekSlug.value = null;
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
			<div class="py-12 md:py-24 lg:col-span-4 lg:py-32">
				<p class="text-xs font-bold uppercase tracking-[0.3em] text-brand-red">Colour Studio</p>
				<h2 id="home-colors-heading" class="mt-3 text-3xl font-black uppercase tracking-tight md:text-5xl">Explore colour options</h2>
				<p class="mt-4 text-neutral-600 dark:text-neutral-400">Preview factory paint options across the 2026 lineup.</p>

				<div class="mt-8 flex flex-wrap gap-2" role="group" aria-label="Choose a model">
					<div v-for="model in vehicles" :key="model.slug" class="relative">
						<button
							type="button"
							:aria-pressed="model.slug === selectedSlug"
							class="rounded-full px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
							:class="
								model.slug === selectedSlug
									? 'flex items-center gap-1.5 bg-neutral-900 font-semibold text-white shadow-sm ring-1 ring-black dark:bg-white dark:text-neutral-950 dark:ring-white'
									: 'bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
							"
							@pointerenter="(event: PointerEvent) => event.pointerType === 'mouse' && model.slug !== selectedSlug && (peekSlug = model.slug)"
							@pointerleave="peekSlug = null"
							@click="selectedSlug = model.slug"
						>
							<span v-if="model.slug === selectedSlug" class="h-1.5 w-1.5 rounded-full bg-brand-red" aria-hidden="true" />
							{{ shortName(model.title) }}
						</button>

						<!-- Sneak peek: mouse hover on an inactive pill, md+ only; decorative (the pill itself is the control) -->
						<Transition
							enter-active-class="transition duration-200 ease-out"
							enter-from-class="opacity-0 translate-y-1"
							leave-active-class="transition duration-150 ease-in"
							leave-to-class="opacity-0 translate-y-1"
						>
							<div
								v-if="peekSlug === model.slug"
								class="pointer-events-none absolute bottom-full left-1/2 z-30 mb-3 hidden w-48 -translate-x-1/2 flex-col items-center rounded-xl border border-neutral-200 bg-white p-2.5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 md:flex"
								aria-hidden="true"
								data-model-peek
							>
								<div class="relative h-20 w-full overflow-hidden rounded-lg bg-gradient-to-b from-neutral-100 to-transparent dark:from-neutral-800">
									<img
										v-if="peekThumbUrl(model)"
										:src="peekThumbUrl(model)"
										alt=""
										class="absolute left-1/2 top-[-38%] h-[180%] w-auto max-w-none -translate-x-1/2"
									/>
								</div>
								<p class="mt-2 text-sm font-bold text-neutral-950 dark:text-white">{{ shortName(model.title) }}</p>
								<p v-if="model.starting_price" class="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
									From {{ formatTtdPrice(model.starting_price) }}
								</p>
								<!-- Pointer arrow -->
								<span
									class="absolute left-1/2 top-full -mt-1.5 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
								/>
							</div>
						</Transition>
					</div>
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
				class="relative isolate -mx-4 overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-950 to-[#0b1630] px-4 py-12 text-white sm:-mx-6 sm:px-6 md:py-24 lg:col-span-8 lg:mx-0 lg:overflow-visible lg:bg-none lg:py-32 lg:pl-20 lg:pr-0"
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
