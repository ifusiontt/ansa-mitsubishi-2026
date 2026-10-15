<script setup lang="ts">
import type { BlockContentBlock, BlockContentItem } from '#shared/types/schema';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * "The ANSA Difference" — 3 vertical image pillars from the CMS block's published items,
 * falling back to the default copy when the block is missing or empty.
 * Photography comes from each item's first `images` file (block_content_items.images M2M), cropped
 * to the 3:4 card around the file's Directus focal point; until one is attached the card shows a
 * plain dark gradient.
 * Seeded by directus/seeds/homepage-blocks.mjs.
 */
const props = withDefaults(defineProps<{ block?: BlockContentBlock | null }>(), { block: null });

const DEFAULT_ITEMS = [
	{ tagline: 'Heritage', headline: 'Brand Philosophy', description: 'Built on Japanese engineering precision backed by ANSA McAL heritage.' },
	{ tagline: 'Safety', headline: 'All-Round Advanced Safety Technology', description: 'RISE body construction and active collision mitigation.' },
	{ tagline: 'Financing', headline: 'In-House ANSA Financing', description: 'Tailored automotive loans and flexible payment structures.' },
];

const { setAttr } = useVisualEditing();

const imageUrl = (item: BlockContentItem) => {
	const first = item.images?.[0];
	const id = typeof first === 'object' ? directusFileId(first.directus_files_id) : '';
	return id ? `${getDirectusAssetURL(id)}?width=900&height=1200&fit=cover&quality=80&format=webp` : '';
};

const cards = computed(() => {
	const published = (props.block?.items ?? []).filter(
		(entry): entry is BlockContentItem => typeof entry === 'object' && entry.status === 'published',
	);
	if (!published.length) return DEFAULT_ITEMS.map((item, index) => ({ key: `default-${index}`, id: null, image: '', ...item }));
	return published.map((item) => ({
		key: String(item.id),
		id: item.id,
		tagline: item.tagline ?? '',
		headline: item.headline ?? '',
		description: item.description ?? '',
		image: imageUrl(item),
	}));
});
</script>

<template>
	<section class="bg-white text-neutral-950 dark:bg-black dark:text-white" aria-labelledby="home-value-heading">
		<h2 id="home-value-heading" class="sr-only">{{ block?.tagline || 'The ANSA Difference' }}</h2>
		<ul class="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-16">
			<li
				v-for="card in cards"
				:key="card.key"
				class="group relative isolate flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-xl bg-neutral-900 text-white"
				:data-directus="card.id ? setAttr({ collection: 'block_content_items', item: card.id, fields: ['tagline', 'headline', 'description', 'images'], mode: 'drawer' }) : undefined"
			>
				<img
					v-if="card.image"
					:src="card.image"
					alt=""
					loading="lazy"
					class="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
				/>
				<!-- Fallback until photography is attached in Directus -->
				<div v-else class="absolute inset-0 -z-20 bg-gradient-to-br from-neutral-700 via-neutral-800 to-neutral-950" aria-hidden="true" />
				<div class="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent" aria-hidden="true" />

				<div class="p-8">
					<p v-if="card.tagline" class="text-xs font-bold uppercase tracking-[0.3em] text-[#C3002F]">{{ card.tagline }}</p>
					<h3 class="mt-2 text-2xl font-black tracking-tight">{{ card.headline }}</h3>
					<p class="mt-3 leading-relaxed text-neutral-200">{{ card.description }}</p>
				</div>
			</li>
		</ul>
	</section>
</template>
