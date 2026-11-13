<script setup lang="ts">
import type { BlockContentBlock, BlockContentItem } from '#shared/types/schema';

/**
 * Technology spotlight: a floating glass card over full-width photography from the official 2026
 * shoot (Xpander Cross EX BACK on a coastal road). The car fills the lower half of the frame, centre
 * left, so the card is pinned top-right over the sky, hills and sea and clears the car at every
 * width. Copy comes from the first published item of the "TECHNOLOGY" block_content_block,
 * falling back to the default ASC copy when the block is missing.
 */
const props = withDefaults(
	defineProps<{
		block?: BlockContentBlock | null;
		ctaTo?: string;
	}>(),
	{ block: null, ctaTo: '#models' },
);

const IMAGE = '/images/models/xpander-cross/lifestyle/xpander-cross-ex-back.webp';

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
const description = computed(() => item.value?.description || DEFAULT_COPY.description);</script>

<template>
	<section class="relative isolate h-[720px] w-full overflow-hidden bg-black text-white md:h-[720px] xl:h-[820px] 2xl:h-[900px]" aria-labelledby="home-spotlight-heading">
		<img :src="IMAGE" alt="" loading="lazy" class="absolute inset-0 -z-10 h-full w-full object-cover object-[40%_center] md:object-[center_70%]" />
		<!-- Shade sits under the card in the top-right corner; the car in the lower half stays unshaded.
		     The card row is viewport-anchored (no max-w container) so it never drifts onto the car. -->
		<div class="absolute inset-0 -z-10 bg-gradient-to-b from-black/75 via-black/25 to-transparent md:bg-gradient-to-bl" aria-hidden="true" />

		<div class="flex h-full w-full items-start justify-end px-4 pt-10 sm:px-6 md:pr-12 md:pt-14 lg:pr-16 xl:pr-24">
			<article
				class="max-w-md rounded-xl border border-white/10 bg-neutral-900/60 p-8 shadow-2xl shadow-black/50 backdrop-blur-md"
				:data-directus="item ? setAttr({ collection: 'block_content_items', item: item.id, fields: ['headline', 'description'], mode: 'drawer' }) : undefined"
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
