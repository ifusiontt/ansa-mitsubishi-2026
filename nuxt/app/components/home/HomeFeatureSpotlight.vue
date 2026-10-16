<script setup lang="ts">
import type { BlockContentBlock, BlockContentItem } from '#shared/types/schema';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Technology spotlight: a floating glass card over full-width driving photography. On desktop
 * the card sits on the right so the car (left lane of the ASC still) stays unobstructed.
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
		'ASC monitors wheel slip and your steering input, then trims engine power and brakes individual wheels to keep the car stable and on your chosen line — on wet roads, loose gravel and sudden swerves alike.',
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
	return id ? `${getDirectusAssetURL(id)}?width=1920&quality=82&format=webp` : '';
});
</script>

<template>
	<section class="relative isolate w-full overflow-hidden bg-black text-white" aria-labelledby="home-spotlight-heading">
		<img v-if="imageUrl" :src="imageUrl" alt="" loading="lazy" class="absolute inset-0 -z-10 h-full w-full object-cover" />
		<div v-else class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_50%,#1f1f1f_0%,#000_70%)]" aria-hidden="true" />
		<!-- Shade sits under the card: bottom-up on mobile, right-to-left on desktop -->
		<div class="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent lg:bg-gradient-to-l" aria-hidden="true" />

		<div class="mx-auto flex min-h-[560px] max-w-7xl items-center px-4 py-12 sm:px-6 md:py-24 lg:py-32 lg:justify-end lg:px-16">
			<article
				class="max-w-md rounded-xl border border-white/10 bg-neutral-900/60 p-8 shadow-2xl shadow-black/50 backdrop-blur-md"
				:data-directus="item ? setAttr({ collection: 'block_content_items', item: item.id, fields: ['headline', 'description', 'images'], mode: 'drawer' }) : undefined"
			>
				<p class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-white">
					<span class="h-1.5 w-1.5 rounded-full bg-brand-red" aria-hidden="true" />
					{{ eyebrow }}
				</p>
				<h2 id="home-spotlight-heading" class="mt-4 text-3xl font-black leading-tight tracking-tight text-white">{{ headline }}</h2>
				<p class="mt-4 leading-relaxed text-neutral-300">{{ description }}</p>
				<NuxtLink
					:to="ctaTo"
					class="mt-8 inline-block rounded-md bg-brand-red px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
				>
					Explore safety
				</NuxtLink>
			</article>
		</div>
	</section>
</template>
