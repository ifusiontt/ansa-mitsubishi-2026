<script setup lang="ts">
import type { VehiclePage, VehicleSummary } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';
import VehicleColorStage from '~/components/showroom/VehicleColorStage.vue';

/**
 * Homepage colour switcher: pick a model, then a vehicle_colors swatch.
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

const renderUrl = (uuid: string) => (uuid ? `${getDirectusAssetURL(uuid)}?width=1536&quality=82&format=webp` : '');
const fallbackId = computed(() => directusFileId(vehicle.value?.hero_block?.media) || directusFileId(vehicle.value?.menu_image));
const colorRenderUrl = (index: number) => renderUrl(directusFileId(colors.value[index]?.image) || fallbackId.value);
const renderUrls = computed(() => colors.value.map((_, index) => colorRenderUrl(index)));
</script>

<template>
	<section v-if="vehicles.length" class="relative isolate overflow-hidden bg-black py-20 text-white lg:py-28" aria-labelledby="home-colors-heading">
		<!-- Glow tinted toward the active paint; `currentColor` lets the colour change animate. -->
		<div
			class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_60%_55%,currentColor_0%,transparent_60%)] opacity-20 transition-colors duration-700"
			:style="{ color: selectedColor?.hex_code || '#0A0A0A' }"
			aria-hidden="true"
		/>

		<div class="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-16">
			<div class="lg:col-span-4">
				<p class="text-xs font-bold uppercase tracking-[0.3em] text-[#C3002F]">Colour Studio</p>
				<h2 id="home-colors-heading" class="mt-3 text-3xl font-black uppercase tracking-tight md:text-5xl">Make it yours</h2>
				<p class="mt-4 text-neutral-400">Preview factory paint options across the lineup.</p>

				<div class="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Model">
					<button
						v-for="model in vehicles"
						:key="model.slug"
						type="button"
						role="tab"
						:aria-selected="model.slug === selectedSlug"
						class="rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C3002F]"
						:class="model.slug === selectedSlug ? 'border-[#C3002F] bg-[#C3002F] text-white' : 'border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'"
						@click="selectedSlug = model.slug"
					>
						{{ model.title }}
					</button>
				</div>

				<NuxtLink
					v-if="vehicle"
					:to="`/showroom/${vehicle.slug}#colors`"
					class="mt-10 inline-flex items-center gap-2 border-b border-white/30 pb-1 text-xs font-bold uppercase tracking-widest transition-colors hover:border-[#C3002F]"
				>
					Explore the {{ vehicle.title }}
					<Icon name="lucide:arrow-right" class="h-4 w-4 text-[#C3002F]" />
				</NuxtLink>
			</div>

			<div class="lg:col-span-8">
				<div class="relative mx-auto w-full max-w-3xl">
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
							class="h-8 w-8 rounded-full border border-white/10 shadow-md transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C3002F] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
							:class="index === selectedColorIdx ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black' : 'hover:scale-110'"
							:style="{ background: color.hex_code }"
							@click="selectedColorIdx = index"
						/>
					</div>
					<p v-if="selectedColor" class="mt-6 text-lg font-bold uppercase tracking-widest" aria-live="polite">
						{{ selectedColor.color_name }}
						<span v-if="selectedColor.color_code" class="ml-2 text-sm text-neutral-500">{{ selectedColor.color_code }}</span>
					</p>
				</div>
			</div>
		</div>
	</section>
</template>
