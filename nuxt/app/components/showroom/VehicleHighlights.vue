<script setup lang="ts">
import type { VehicleHighlight } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Vehicle highlights as alternating rows (image left / text right, then mirrored).
 * Renders every published `vehicles.highlights` item in sort order — no cap.
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

const { setAttr } = useVisualEditing();

const rows = computed(() =>
	props.items
		.filter((item) => item.status === 'published')
		.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
		.map((item) => {
			const id = directusFileId(item.images?.[0]?.directus_files_id) || props.fallbackImage;
			return { ...item, imageUrl: id ? `${getDirectusAssetURL(id)}?width=1400&quality=82&format=webp` : '' };
		}),
);
</script>

<template>
	<section v-if="rows.length" id="highlights" class="scroll-mt-20 bg-black py-20 text-white md:py-28" aria-labelledby="highlights-heading">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16">
			<p class="text-xs font-bold uppercase tracking-[0.3em] text-brand-red">Highlights</p>
			<h2 id="highlights-heading" class="mt-3 text-3xl font-black uppercase tracking-tight md:text-5xl">Inside the {{ vehicleTitle }}</h2>

			<div class="mt-14 space-y-10 md:space-y-16">
				<article
					v-for="(row, index) in rows"
					:key="row.id"
					class="grid items-center gap-6 md:grid-cols-2 md:gap-12"
					:data-directus="setAttr({ collection: 'block_content_items', item: row.id, fields: ['tagline', 'headline', 'description', 'images'], mode: 'drawer' })"
				>
					<!-- Odd rows mirror: text left, image right -->
					<div class="overflow-hidden rounded-xl border border-neutral-900 bg-neutral-950" :class="index % 2 === 1 ? 'md:order-2' : ''">
						<img
							v-if="row.imageUrl"
							:src="row.imageUrl"
							:alt="row.headline || vehicleTitle"
							loading="lazy"
							class="aspect-[4/3] w-full object-cover"
						/>
						<div v-else class="grid aspect-[4/3] place-items-center text-neutral-800" aria-hidden="true">
							<Icon name="lucide:image" class="h-10 w-10" />
						</div>
					</div>

					<div class="rounded-xl border border-neutral-900 bg-neutral-950/80 p-8 backdrop-blur-sm md:p-10" :class="index % 2 === 1 ? 'md:order-1' : ''">
						<p v-if="row.tagline" class="text-xs font-bold uppercase tracking-[0.3em] text-brand-red">{{ row.tagline }}</p>
						<h3 v-if="row.headline" class="mt-3 text-2xl font-black tracking-tight text-white md:text-3xl">{{ row.headline }}</h3>
						<p v-if="row.description" class="mt-4 leading-relaxed text-neutral-400">{{ row.description }}</p>
					</div>
				</article>
			</div>
		</div>
	</section>
</template>
