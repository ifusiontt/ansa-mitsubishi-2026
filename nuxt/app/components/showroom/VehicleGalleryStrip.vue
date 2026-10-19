<script setup lang="ts">
import type { VehicleGalleryItem } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Lifestyle filmstrip between the highlight pillars and the colour stage: a centred header in the
 * showroom's 1440px container over a full-bleed, scroll-snapping row of 16:10 photo cards.
 * Touch and trackpads scroll it natively (with momentum); from `lg` up, prev/next buttons page it
 * by one card for mouse users and disable at either end.
 * Images come from `vehicles.gallery` (scripts/upload-lifestyle-assets.mjs), in sort order.
 */
const props = defineProps<{
	items: VehicleGalleryItem[];
	vehicleTitle: string;
}>();

const assetUrl = (id: string, width: number) => `${getDirectusAssetURL(id)}?width=${width}&quality=82&format=webp`;

const images = computed(() =>
	[...props.items]
		.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
		.map((item) => directusFileId(item.directus_files_id))
		.filter((id): id is string => !!id),
);

const track = useTemplateRef<HTMLUListElement>('track');
const atStart = ref(true);
const atEnd = ref(false);

function updateEnds() {
	const el = track.value;
	if (!el) return;
	atStart.value = el.scrollLeft <= 4;
	atEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
}

/** One card (plus the gap) per click; snapping settles it on the next card's centre. */
function page(direction: 1 | -1) {
	const el = track.value;
	const card = el?.querySelector('li');
	if (!el || !card) return;
	el.scrollBy({ left: direction * (card.getBoundingClientRect().width + 24), behavior: 'smooth' });
}

onMounted(updateEnds);

// The header, then the whole filmstrip, fade and glide up when the section is reached.
const section = useTemplateRef<HTMLElement>('section');
const reveal = useScrollReveal(section);
</script>

<template>
	<section
		v-if="images.length"
		id="gallery"
		ref="section"
		:data-reveal="reveal"
		class="w-full scroll-mt-[13.5rem] bg-white pb-2 pt-4 lg:pb-4 dark:bg-zinc-950"
		aria-labelledby="gallery-heading"
	>
		<header class="reveal-item relative mx-auto mb-10 w-full max-w-[1440px] px-4 text-center sm:px-6 lg:px-8" style="--reveal-i: 0">
			<p>
				<span class="inline-flex items-center gap-2 border-l-2 border-brand-red pl-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
					Gallery
				</span>
			</p>
			<h2 id="gallery-heading" class="mt-3 text-3xl font-bold tracking-tight text-zinc-900 lg:text-5xl dark:text-white">Engineered in Motion</h2>

			<div class="absolute bottom-0 right-4 hidden gap-2 sm:right-6 lg:right-8 lg:flex">
				<button
					v-for="direction in [-1, 1] as const"
					:key="direction"
					type="button"
					class="grid size-11 place-items-center rounded-full border border-zinc-300 text-zinc-700 transition-colors hover:border-brand-red hover:text-brand-red focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red disabled:cursor-default disabled:opacity-30 disabled:hover:border-zinc-300 disabled:hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
					:disabled="direction === -1 ? atStart : atEnd"
					:aria-label="direction === -1 ? 'Previous photo' : 'Next photo'"
					@click="page(direction)"
				>
					<Icon :name="direction === -1 ? 'lucide:arrow-left' : 'lucide:arrow-right'" class="size-5" aria-hidden="true" />
				</button>
			</div>
		</header>

		<ul
			ref="track"
			style="--reveal-i: 1"
			class="reveal-item no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pb-8 sm:px-8"
			:aria-label="`${vehicleTitle} photo gallery`"
			@scroll.passive="updateEnds"
		>
			<li
				v-for="(id, index) in images"
				:key="id"
				class="group relative aspect-[16/10] w-[360px] max-w-[85vw] shrink-0 snap-center overflow-hidden rounded-3xl bg-zinc-900 shadow-lg sm:w-[480px] lg:w-[560px]"
			>
				<img
					:src="assetUrl(id, 1120)"
					:srcset="`${assetUrl(id, 720)} 720w, ${assetUrl(id, 1120)} 1120w, ${assetUrl(id, 1600)} 1600w`"
					sizes="(min-width: 1024px) 560px, (min-width: 640px) 480px, 360px"
					:alt="`${vehicleTitle}, photo ${index + 1} of ${images.length}`"
					loading="lazy"
					draggable="false"
					class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
				/>
			</li>
		</ul>
	</section>
</template>
