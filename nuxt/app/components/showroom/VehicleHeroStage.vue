<script setup lang="ts">
import type { VehicleFileRef, VehiclePage } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Full-bleed vehicle hero for /showroom/[slug].
 *
 * Background is the optional `hero_video_url` loop, else `heroImage` — the vehicle's
 * `hero_block.media` Directus file (UUID or expanded file object), delivered through the
 * Directus asset endpoint as responsive WebP. Framing defaults to `center 60%` so front fascias
 * sit under the copy scrim; `focalPoint` (any CSS object-position) overrides it per model.
 * CTAs smooth-scroll to the page's `#trims` and `#cta` sections.
 */
const props = withDefaults(
	defineProps<{
		vehicle: Pick<VehiclePage, 'title' | 'tagline' | 'starting_price' | 'model_year' | 'category' | 'hero_video_url' | 'hero_block'>;
		heroImage?: VehicleFileRef | null;
		focalPoint?: string;
	}>(),
	{ heroImage: null, focalPoint: undefined },
);

const HERO_WIDTHS = [960, 1440, 1920, 2560];
const assetUrl = (id: string, width: number) => `${getDirectusAssetURL(id)}?width=${width}&quality=82&format=webp`;

const imageId = computed(() => directusFileId(props.heroImage));
const imageSrc = computed(() => (imageId.value ? assetUrl(imageId.value, 1920) : ''));
const imageSrcset = computed(() => (imageId.value ? HERO_WIDTHS.map((w) => `${assetUrl(imageId.value, w)} ${w}w`).join(', ') : undefined));
const focalStyle = computed(() => (props.focalPoint ? { objectPosition: props.focalPoint } : undefined));

// "Mitsubishi Triton" → "Triton" for the headline.
const displayTitle = computed(() => props.vehicle.title.replace(/^mitsubishi\s+/i, ''));
const eyebrow = computed(() => [props.vehicle.model_year, props.vehicle.category].filter(Boolean).join(' '));
const subhead = computed(() => props.vehicle.hero_block?.headline || props.vehicle.tagline || '');
const startingPrice = computed(() => formatTtdPrice(props.vehicle.starting_price));

function scrollTo(id: string) {
	document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
	<section id="hero" class="relative isolate flex min-h-[75vh] items-end overflow-hidden bg-black text-white md:min-h-[85vh] md:items-center" aria-labelledby="hero-heading">
		<video
			v-if="vehicle.hero_video_url"
			:src="vehicle.hero_video_url"
			:poster="imageSrc || undefined"
			autoplay
			loop
			muted
			playsinline
			class="absolute inset-0 -z-10 h-full w-full object-cover object-[center_60%]"
			:style="focalStyle"
			aria-hidden="true"
		/>
		<img
			v-else-if="imageSrc"
			:src="imageSrc"
			:srcset="imageSrcset"
			sizes="100vw"
			alt=""
			fetchpriority="high"
			decoding="async"
			class="absolute inset-0 -z-10 h-full w-full object-cover object-[center_60%]"
			:style="focalStyle"
		/>

		<!-- Bottom-up fade for the fold, plus a side scrim behind the copy -->
		<div class="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/40 to-transparent" aria-hidden="true" />
		<div class="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/30 to-transparent" aria-hidden="true" />

		<!-- Same steps as the page's scoped .vp-container (not reachable from a child component) -->
		<div class="relative mx-auto w-full px-8 py-24 sm:max-w-[640px] md:max-w-[768px] md:py-32 lg:max-w-[1024px] xl:max-w-[1280px] 2xl:max-w-[1536px]">
			<div class="max-w-2xl">
				<p v-if="eyebrow" class="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-brand-red">
					<span class="h-px w-10 bg-brand-red" aria-hidden="true" />
					{{ eyebrow }}
				</p>
				<h1 id="hero-heading" class="text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-7xl">{{ displayTitle }}</h1>
				<p v-if="subhead" class="mt-5 text-lg font-bold uppercase tracking-wider text-neutral-200 md:text-xl">{{ subhead }}</p>
				<p v-if="startingPrice" class="mt-3 text-sm text-neutral-300">
					Starting from <span class="font-bold text-white">{{ startingPrice }}</span>
				</p>

				<div class="mt-10 flex flex-wrap gap-4">
					<a
						href="#trims"
						class="inline-block rounded-md bg-brand-red px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
						@click.prevent="scrollTo('trims')"
					>
						Explore Trims &amp; Specs
					</a>
					<a
						href="#cta"
						class="inline-block rounded-md border border-white/40 bg-white/10 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md transition-colors hover:border-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
						@click.prevent="scrollTo('cta')"
					>
						Book a Test Drive
					</a>
				</div>
			</div>
		</div>
	</section>
</template>
