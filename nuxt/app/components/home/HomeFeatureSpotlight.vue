<script setup lang="ts">
import type { BlockContentBlock, BlockContentItem } from '#shared/types/schema';

/**
 * Technology spotlight: a floating glass card over full-width driving photography. The card sits
 * on the left over the tunnel-rock shadow so the Xpander Cross, wet pavement and road spray on the
 * centre-right of the ASC still stay clear. Copy comes from the first published item of the
 * "TECHNOLOGY" block_content_block, falling back to the default ASC copy when the block is missing.
 */
const props = withDefaults(
	defineProps<{
		block?: BlockContentBlock | null;
		ctaTo?: string;
	}>(),
	{ block: null, ctaTo: '#models' },
);

const IMAGE = '/images/features/22MY_XS_RHD_MV_SlippyCorner-1536x1024.jpg';

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
	<section class="relative isolate w-full overflow-hidden bg-black text-white" aria-labelledby="home-spotlight-heading">
		<img :src="IMAGE" alt="" loading="lazy" class="absolute inset-0 -z-10 h-full w-full object-cover" />
		<!-- Shade sits under the card: bottom-up on mobile, left-to-right on desktop -->
		<div class="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent lg:bg-gradient-to-r" aria-hidden="true" />

		<div class="mx-auto flex min-h-[560px] max-w-7xl items-center justify-start py-12 pl-8 pr-4 sm:pr-6 md:py-24 md:pl-16 lg:py-32 lg:pl-24">
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
