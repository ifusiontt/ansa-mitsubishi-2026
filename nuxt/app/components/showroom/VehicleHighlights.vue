<script setup lang="ts">
import type { VehicleHighlight } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Wide editorial highlights, no boxed wrappers: true full-bleed alternating 50/50 photo/copy splits
 * (text left / image right, then mirrored; photos run edge-to-edge with no rounding), then a pillar
 * strip in the HomeValueGrid language (bottom-up scrim over full-bleed photography).
 *
 * Every published `vehicles.highlights` item renders, in sort order: the first three are splits
 * and the rest form the pillar strip (6 items → 3 + 3, 5 → 3 + 2). The pillar grid uses as many
 * columns as it has pillars (max 3) so a short strip never leaves an empty slot. The heading and
 * pillars sit in the showroom's shared 1440px container; the splits are unconstrained.
 * Content and images are seeded by directus/seeds/vehicle-content-blocks.mjs.
 */
const props = withDefaults(
	defineProps<{
		items: VehicleHighlight[];
		vehicleTitle: string;
		/** Directus file id shown when an item has no image (normally the hero render). */
		fallbackImage?: string;
	}>(),
	{ fallbackImage: '' },
);

const SPLIT_COUNT = 3;

const { setAttr } = useVisualEditing();

const assetUrl = (id: string, width: number) => `${getDirectusAssetURL(id)}?width=${width}&quality=82&format=webp`;

const rows = computed(() =>
	props.items
		.filter((item) => item.status === 'published')
		.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
		.map((item) => ({ ...item, imageId: directusFileId(item.images?.[0]?.directus_files_id) || props.fallbackImage })),
);

const splits = computed(() => rows.value.slice(0, SPLIT_COUNT));
const pillars = computed(() => rows.value.slice(SPLIT_COUNT));
const pillarCols = computed(() => (pillars.value.length === 1 ? '' : pillars.value.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'));

const editAttr = (id: number) =>
	setAttr({ collection: 'block_content_items', item: id, fields: ['tagline', 'headline', 'description', 'images'], mode: 'drawer' });
</script>

<template>
	<section
		v-if="rows.length"
		id="highlights"
		class="w-full scroll-mt-[13.5rem] bg-white pt-16 pb-20 text-zinc-900 lg:pt-20 dark:bg-zinc-950 dark:text-zinc-100"
		aria-labelledby="highlights-heading"
	>
		<header class="mx-auto mb-12 w-full max-w-[1440px] px-4 sm:px-6 lg:mb-16 lg:px-8">
			<p>
				<span class="inline-flex items-center gap-2 border-l-2 border-brand-red pl-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
					Highlights
				</span>
			</p>
			<h2 id="highlights-heading" class="mt-3 text-3xl font-bold tracking-tight text-zinc-900 lg:text-5xl dark:text-white">Inside the {{ vehicleTitle }}</h2>
		</header>

		<!-- Part A · true full-bleed 50/50 editorial splits -->
		<div class="w-full">
			<article
				v-for="(row, index) in splits"
				:key="row.id"
				class="grid w-full grid-cols-1 lg:grid-cols-2"
				:data-directus="editAttr(row.id)"
			>
				<!-- Image leads in the DOM (first on mobile); rows 1 and 3 push it right on desktop -->
				<div class="relative h-[50vh] w-full overflow-hidden bg-zinc-100 lg:h-[70vh] dark:bg-zinc-900" :class="{ 'lg:order-last': index % 2 === 0 }">
					<img
						v-if="row.imageId"
						:src="assetUrl(row.imageId, 1600)"
						:srcset="`${assetUrl(row.imageId, 800)} 800w, ${assetUrl(row.imageId, 1280)} 1280w, ${assetUrl(row.imageId, 1600)} 1600w, ${assetUrl(row.imageId, 2000)} 2000w`"
						sizes="(min-width: 1024px) 50vw, 100vw"
						:alt="row.headline || vehicleTitle"
						loading="lazy"
						class="h-full w-full object-cover"
					/>
				</div>

				<div class="flex flex-col justify-center px-8 py-16 sm:px-12 lg:px-24 lg:py-24 xl:px-32">
					<div class="max-w-xl">
						<p v-if="row.tagline">
							<span class="inline-flex items-center gap-2 border-l-2 border-brand-red pl-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
								{{ row.tagline }}
							</span>
						</p>
						<h3 v-if="row.headline" class="mt-4 text-3xl font-bold tracking-tight text-zinc-900 lg:text-4xl dark:text-white">{{ row.headline }}</h3>
						<p v-if="row.description" class="mt-6 text-base leading-relaxed text-zinc-600 md:text-lg dark:text-zinc-300">{{ row.description }}</p>
					</div>
				</div>
			</article>
		</div>

		<!-- Part B · cinematic pillar strip -->
		<div v-if="pillars.length" class="mx-auto mt-16 w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
			<ul class="grid grid-cols-1 gap-6 lg:gap-8" :class="pillarCols">
				<li
					v-for="pillar in pillars"
					:key="pillar.id"
					class="group relative min-h-[500px] overflow-hidden rounded-3xl bg-zinc-900 shadow-xl lg:min-h-[560px]"
					:data-directus="editAttr(pillar.id)"
				>
					<img
						v-if="pillar.imageId"
						:src="assetUrl(pillar.imageId, 1000)"
						:srcset="`${assetUrl(pillar.imageId, 640)} 640w, ${assetUrl(pillar.imageId, 1000)} 1000w, ${assetUrl(pillar.imageId, 1400)} 1400w`"
						sizes="(min-width: 768px) 33vw, 100vw"
						alt=""
						loading="lazy"
						class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
					/>
					<div class="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/40 to-transparent p-8 text-white">
						<p v-if="pillar.tagline">
							<span class="inline-flex items-center gap-2 border-l-2 border-brand-red pl-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200">
								{{ pillar.tagline }}
							</span>
						</p>
						<h3 v-if="pillar.headline" class="mt-3 text-2xl font-bold tracking-tight text-white">{{ pillar.headline }}</h3>
						<p v-if="pillar.description" class="mt-3 text-sm leading-relaxed text-zinc-200">{{ pillar.description }}</p>
					</div>
				</li>
			</ul>
		</div>
	</section>
</template>
