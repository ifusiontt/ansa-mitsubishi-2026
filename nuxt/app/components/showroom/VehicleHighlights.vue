<script setup lang="ts">
import type { VehicleHighlight } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Wide editorial highlights: alternating 50/50 photo/copy splits, then a three-pillar photo strip
 * in the HomeValueGrid language (bottom-up scrim over full-bleed photography).
 *
 * Every published `vehicles.highlights` item renders, in sort order: the last three form the
 * pillar strip and everything before them becomes a split row (5 items → 2 splits + 3 pillars,
 * 6 → 3 + 3). With three or fewer items they are all splits. The white canvas lets studio renders
 * on white backgrounds sit flush instead of reading as pasted-on cards.
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

const PILLAR_COUNT = 3;

const { setAttr } = useVisualEditing();

const assetUrl = (id: string, width: number) => `${getDirectusAssetURL(id)}?width=${width}&quality=82&format=webp`;

const rows = computed(() =>
	props.items
		.filter((item) => item.status === 'published')
		.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
		.map((item) => ({ ...item, imageId: directusFileId(item.images?.[0]?.directus_files_id) || props.fallbackImage })),
);

const pillars = computed(() => (rows.value.length > PILLAR_COUNT ? rows.value.slice(-PILLAR_COUNT) : []));
const splits = computed(() => (pillars.value.length ? rows.value.slice(0, -PILLAR_COUNT) : rows.value));

const editAttr = (id: number) =>
	setAttr({ collection: 'block_content_items', item: id, fields: ['tagline', 'headline', 'description', 'images'], mode: 'drawer' });
</script>

<template>
	<section v-if="rows.length" id="highlights" class="scroll-mt-20 bg-white text-neutral-950" aria-labelledby="highlights-heading">
		<div class="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
			<p class="text-xs font-bold uppercase tracking-[0.3em] text-brand-red">Highlights</p>
			<h2 id="highlights-heading" class="mt-3 text-3xl font-black uppercase tracking-tight md:text-5xl">Inside the {{ vehicleTitle }}</h2>

			<!-- 50/50 splits: row 1 text left / image right, row 2 mirrored, and so on -->
			<div class="mt-16 space-y-20 md:space-y-28">
				<article
					v-for="(row, index) in splits"
					:key="row.id"
					class="grid items-center gap-10 md:grid-cols-2 lg:gap-16"
					:data-directus="editAttr(row.id)"
				>
					<!-- Image comes first in the DOM so it leads on mobile; even rows push it right on desktop -->
					<div class="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100 shadow-2xl lg:aspect-[16/10]" :class="{ 'md:order-2': index % 2 === 0 }">
						<img
							v-if="row.imageId"
							:src="assetUrl(row.imageId, 1600)"
							:srcset="`${assetUrl(row.imageId, 800)} 800w, ${assetUrl(row.imageId, 1280)} 1280w, ${assetUrl(row.imageId, 1600)} 1600w`"
							sizes="(min-width: 768px) 50vw, 100vw"
							:alt="row.headline || vehicleTitle"
							loading="lazy"
							class="absolute inset-0 h-full w-full object-cover"
						/>
					</div>

					<div class="max-w-xl">
						<p v-if="row.tagline" class="text-xs font-bold uppercase tracking-[0.3em] text-brand-red">{{ row.tagline }}</p>
						<h3 v-if="row.headline" class="mt-4 text-3xl font-bold tracking-tight md:text-4xl">{{ row.headline }}</h3>
						<p v-if="row.description" class="mt-5 text-lg leading-relaxed text-neutral-600">{{ row.description }}</p>
					</div>
				</article>
			</div>

			<!-- Cinematic pillar strip -->
			<ul v-if="pillars.length" class="mt-20 grid gap-6 md:mt-28 md:grid-cols-3">
				<li
					v-for="pillar in pillars"
					:key="pillar.id"
					class="group relative isolate flex min-h-[420px] flex-col justify-end overflow-hidden rounded-2xl bg-neutral-900 text-white"
					:data-directus="editAttr(pillar.id)"
				>
					<img
						v-if="pillar.imageId"
						:src="assetUrl(pillar.imageId, 1000)"
						:srcset="`${assetUrl(pillar.imageId, 640)} 640w, ${assetUrl(pillar.imageId, 1000)} 1000w`"
						sizes="(min-width: 768px) 33vw, 100vw"
						alt=""
						loading="lazy"
						class="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
					/>
					<div class="absolute inset-x-0 bottom-0 -z-10 h-[70%] bg-gradient-to-t from-black/95 via-black/50 to-transparent" aria-hidden="true" />

					<div class="p-8">
						<p v-if="pillar.tagline" class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-white">
							<span class="h-1.5 w-1.5 rounded-full bg-brand-red" aria-hidden="true" />
							{{ pillar.tagline }}
						</p>
						<h3 v-if="pillar.headline" class="mt-2 text-2xl font-bold tracking-tight">{{ pillar.headline }}</h3>
						<p v-if="pillar.description" class="mt-3 text-sm leading-relaxed text-neutral-200">{{ pillar.description }}</p>
					</div>
				</li>
			</ul>
		</div>
	</section>
</template>
