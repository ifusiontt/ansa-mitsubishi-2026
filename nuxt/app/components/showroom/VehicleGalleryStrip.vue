<script setup lang="ts">
import type { VehicleGalleryItem } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'radix-vue';

/**
 * Lifestyle filmstrip between the highlight pillars and the colour stage: a centred header in the
 * showroom's 1440px container over a full-bleed, scroll-snapping row of 16:10 photo cards.
 * Touch and trackpads scroll it natively (with momentum); from `lg` up, prev/next buttons page it
 * by one card for mouse users and disable at either end. Nothing auto-advances.
 * Cards load the thumbnail tier (600px, 1200px on high-DPI) cropped around each file's focal point;
 * clicking one opens it full-frame at the hero tier in a lightbox that steps through the set with
 * its arrows or the ← / → keys.
 * Images come from `vehicles.gallery` (scripts/upload-lifestyle-assets.mjs), in sort order; each
 * file's Directus title is its alt text.
 */
const props = defineProps<{
	items: VehicleGalleryItem[];
	vehicleTitle: string;
}>();

const assetUrl = (id: string, { width, quality }: { width: number; quality: number }) =>
	`${getDirectusAssetURL(id)}?width=${width}&quality=${quality}&format=webp`;

const images = computed(() =>
	[...props.items]
		.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
		.map((item, index, all) => {
			const file = item.directus_files_id;
			const title = file && typeof file === 'object' && typeof file.title === 'string' ? file.title : '';
			return {
				id: directusFileId(file),
				alt: title || `${props.vehicleTitle}, photo ${index + 1} of ${all.length}`,
				focal: focalPosition(file),
			};
		})
		.filter((image) => !!image.id),
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

// Lightbox: index of the expanded photo, null when closed. Stepping wraps around the set.
const openIndex = ref<number | null>(null);
const expanded = computed(() => (openIndex.value === null ? null : images.value[openIndex.value] ?? null));

function step(delta: number) {
	const count = images.value.length;
	if (openIndex.value === null || !count) return;
	openIndex.value = (openIndex.value + delta + count) % count;
}

function onLightboxKey(event: KeyboardEvent) {
	if (event.key === 'ArrowLeft') step(-1);
	else if (event.key === 'ArrowRight') step(1);
}

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
				v-for="(image, index) in images"
				:key="image.id"
				class="group relative aspect-[16/10] w-[360px] max-w-[85vw] shrink-0 snap-center overflow-hidden rounded-3xl bg-zinc-900 shadow-lg sm:w-[480px] lg:w-[560px]"
			>
				<button
					type="button"
					class="absolute inset-0 h-full w-full cursor-zoom-in focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-red"
					:aria-label="`Expand photo ${index + 1} of ${images.length}: ${image.alt}`"
					@click="openIndex = index"
				>
					<img
						:src="assetUrl(image.id, LIFESTYLE_TIERS.thumb)"
						:srcset="`${assetUrl(image.id, LIFESTYLE_TIERS.thumb)} ${LIFESTYLE_TIERS.thumb.width}w, ${assetUrl(image.id, LIFESTYLE_TIERS.story)} ${LIFESTYLE_TIERS.story.width}w`"
						sizes="(min-width: 1024px) 560px, (min-width: 640px) 480px, 360px"
						:alt="image.alt"
						loading="lazy"
						draggable="false"
						class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
						:style="{ objectPosition: image.focal }"
					/>
					<span
						class="absolute bottom-4 right-4 grid size-10 place-items-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
						aria-hidden="true"
					>
						<Icon name="lucide:expand" class="size-4" />
					</span>
				</button>
			</li>
		</ul>

		<DialogRoot :open="openIndex !== null" @update:open="(open: boolean) => !open && (openIndex = null)">
			<DialogPortal>
				<DialogOverlay
					class="fixed inset-0 z-[70] bg-black/95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
				/>
				<DialogContent
					class="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 p-4 text-white focus:outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 sm:p-8"
					@keydown="onLightboxKey"
				>
					<DialogTitle class="sr-only">{{ vehicleTitle }} gallery</DialogTitle>
					<DialogDescription class="sr-only">Use the arrow keys to move between photos.</DialogDescription>

					<DialogClose
						class="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red sm:right-6 sm:top-6"
						aria-label="Close gallery"
					>
						<Icon name="lucide:x" class="size-5" />
					</DialogClose>

					<img
						v-if="expanded"
						:key="expanded.id"
						:src="assetUrl(expanded.id, LIFESTYLE_TIERS.hero)"
						:srcset="`${assetUrl(expanded.id, LIFESTYLE_TIERS.story)} ${LIFESTYLE_TIERS.story.width}w, ${assetUrl(expanded.id, LIFESTYLE_TIERS.hero)} ${LIFESTYLE_TIERS.hero.width}w`"
						sizes="100vw"
						:alt="expanded.alt"
						class="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
					/>

					<div v-if="expanded" class="flex w-full max-w-5xl items-center justify-between gap-4">
						<button
							v-if="images.length > 1"
							type="button"
							class="grid size-11 shrink-0 place-items-center rounded-full border border-white/30 text-white transition-colors hover:border-brand-red hover:text-brand-red focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
							aria-label="Previous photo"
							@click="step(-1)"
						>
							<Icon name="lucide:arrow-left" class="size-5" aria-hidden="true" />
						</button>
						<p class="min-w-0 flex-1 text-center text-sm text-zinc-300" aria-live="polite">
							<span class="font-bold text-white">{{ (openIndex ?? 0) + 1 }} / {{ images.length }}</span>
							<span class="mx-2 text-zinc-500" aria-hidden="true">·</span>
							{{ expanded.alt }}
						</p>
						<button
							v-if="images.length > 1"
							type="button"
							class="grid size-11 shrink-0 place-items-center rounded-full border border-white/30 text-white transition-colors hover:border-brand-red hover:text-brand-red focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
							aria-label="Next photo"
							@click="step(1)"
						>
							<Icon name="lucide:arrow-right" class="size-5" aria-hidden="true" />
						</button>
					</div>
				</DialogContent>
			</DialogPortal>
		</DialogRoot>
	</section>
</template>
