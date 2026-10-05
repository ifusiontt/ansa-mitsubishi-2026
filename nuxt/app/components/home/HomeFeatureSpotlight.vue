<script setup lang="ts">
import type { BlockContentBlock, BlockContentItem } from '#shared/types/schema';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Technology spotlight: a floating dark card over full-width driving photography.
 * Reads the first published item of the "TECHNOLOGY" block_content_block; falls back
 * to the default ASC copy (and `fallbackImage`) when the CMS block is missing.
 */
const props = withDefaults(
	defineProps<{
		block?: BlockContentBlock | null;
		/** Directus file id used when the CMS item has no image. */
		fallbackImage?: string;
		ctaTo?: string;
	}>(),
	{ block: null, fallbackImage: '', ctaTo: '#models' },
);

const DEFAULT_COPY = {
	tagline: 'TECHNOLOGY',
	headline: 'Introducing Active Stability Control (ASC)',
	description:
		'AYC reads your inputs and adjusts engine output and brake force to spinning wheels, sharpening cornering stability.',
};

const { setAttr } = useVisualEditing();

const item = computed(() =>
	(props.block?.items ?? []).find((entry): entry is BlockContentItem => typeof entry === 'object' && entry.status === 'published'),
);

const eyebrow = computed(() => props.block?.tagline || DEFAULT_COPY.tagline);
const headline = computed(() => item.value?.headline || DEFAULT_COPY.headline);
const description = computed(() => item.value?.description || DEFAULT_COPY.description);

const imageUrl = computed(() => {
	const first = item.value?.images?.[0];
	const id = (typeof first === 'object' ? directusFileId(first.directus_files_id) : '') || props.fallbackImage;
	return id ? `${getDirectusAssetURL(id)}?width=2400&quality=82&format=webp` : '';
});
</script>

<template>
	<section class="relative isolate w-full overflow-hidden bg-black text-white" aria-labelledby="home-spotlight-heading">
		<img v-if="imageUrl" :src="imageUrl" alt="" loading="lazy" class="absolute inset-0 -z-10 h-full w-full object-cover" />
		<div v-else class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_50%,#1f1f1f_0%,#000_70%)]" aria-hidden="true" />
		<div class="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/30 to-transparent" aria-hidden="true" />

		<div class="mx-auto flex min-h-[560px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-16">
			<article
				class="max-w-md rounded-xl border border-neutral-800 bg-black/90 p-8 backdrop-blur-md"
				:data-directus="item ? setAttr({ collection: 'block_content_items', item: item.id, fields: ['headline', 'description', 'images'], mode: 'drawer' }) : undefined"
			>
				<p class="text-xs font-bold uppercase tracking-[0.3em] text-[#C3002F]">{{ eyebrow }}</p>
				<h2 id="home-spotlight-heading" class="mt-4 text-3xl font-black leading-tight tracking-tight text-white">{{ headline }}</h2>
				<p class="mt-4 leading-relaxed text-neutral-400">{{ description }}</p>
				<NuxtLink
					:to="ctaTo"
					class="mt-8 inline-block rounded-md bg-[#C3002F] px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#a30027] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
				>
					Explore safety
				</NuxtLink>
			</article>
		</div>
	</section>
</template>
