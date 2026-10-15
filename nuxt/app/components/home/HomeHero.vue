<script setup lang="ts">
import type { BlockHeroCustom } from '#shared/types/schema';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Full-bleed pitch-black hero rendered from the Home page's block_hero_custom.
 *
 * Immersive template: a 1920x800 (12:5) crossfading slider over `media_gallery`, auto-advancing
 * every 5s with indicator buttons. Autoplay pauses while hovered / focused or the tab is hidden,
 * and is off for prefers-reduced-motion. Falls back to the single `media` file without a gallery.
 */
const props = defineProps<{ hero: BlockHeroCustom }>();

const SLIDE_INTERVAL_MS = 5000;

const { setAttr } = useVisualEditing();

const isSplit = computed(() => props.hero.template === 'hero_split_screen');

interface Slide {
	id: string;
	alt: string;
}

const slides = computed<Slide[]>(() => {
	const fallbackAlt = props.hero.title || 'The 2026 Mitsubishi lineup';
	const gallery = (props.hero.media_gallery ?? [])
		.map((entry) => (typeof entry === 'object' ? entry.directus_files_id : null))
		.map((file) => ({
			id: directusFileId(file),
			alt: (typeof file === 'object' && file?.title) || fallbackAlt,
		}))
		.filter((slide) => slide.id);
	if (gallery.length) return gallery;
	const mediaId = directusFileId(props.hero.media);
	return mediaId ? [{ id: mediaId, alt: fallbackAlt }] : [];
});

const assetUrl = (id: string, width: number) => `${getDirectusAssetURL(id)}?width=${width}&quality=85&format=webp`;
const srcset = (id: string) => `${assetUrl(id, 960)} 960w, ${assetUrl(id, 1920)} 1920w`;

// --- slider -------------------------------------------------------------------
const active = ref(0);
const hovered = ref(false);
const focused = ref(false);
const visibility = useDocumentVisibility();
const reducedMotion = usePreferredReducedMotion();

const autoplay = computed(
	() => slides.value.length > 1 && !hovered.value && !focused.value && visibility.value === 'visible' && reducedMotion.value !== 'reduce',
);

const { pause, resume } = useIntervalFn(() => (active.value = (active.value + 1) % slides.value.length), SLIDE_INTERVAL_MS, {
	immediate: false,
});

// Client only — the server renders slide 0 and never ticks.
watch(autoplay, (on) => (on ? resume() : pause()), { immediate: import.meta.client });

watch(
	() => slides.value.length,
	(count) => {
		if (active.value >= count) active.value = 0;
	},
);

/** Manual pick — restarts the 5s countdown so the chosen slide gets its full time. */
function goTo(index: number) {
	active.value = index;
	if (autoplay.value) {
		pause();
		resume();
	}
}

/** Headline split around the highlight keyword so it can be painted Mitsubishi Red without v-html. */
const headlineParts = computed(() => {
	const text = props.hero.headline || props.hero.title || '';
	const keyword = props.hero.highlight_keyword || '';
	const at = keyword ? text.toLowerCase().indexOf(keyword.toLowerCase()) : -1;
	if (at < 0) return { before: text, keyword: '', after: '' };
	return { before: text.slice(0, at), keyword: text.slice(at, at + keyword.length), after: text.slice(at + keyword.length) };
});
</script>

<template>
	<section
		class="relative isolate overflow-hidden bg-black text-white"
		:class="isSplit ? '' : 'flex aspect-[12/5] min-h-[600px] w-full items-end'"
		:aria-roledescription="!isSplit && slides.length > 1 ? 'carousel' : undefined"
		:aria-label="!isSplit && slides.length > 1 ? 'Featured models' : undefined"
		:data-directus="
			setAttr({ collection: 'block_hero_custom', item: hero.id, fields: ['headline', 'highlight_keyword', 'body', 'media_gallery', 'media', 'template'], mode: 'drawer' })
		"
		@mouseenter="hovered = true"
		@mouseleave="hovered = false"
		@focusin="focused = true"
		@focusout="focused = false"
	>
		<!-- Immersive: crossfading full-bleed stills under a bottom-weighted fade -->
		<template v-if="!isSplit">
			<img
				v-for="(slide, index) in slides"
				:key="slide.id"
				:src="assetUrl(slide.id, 1920)"
				:srcset="srcset(slide.id)"
				sizes="100vw"
				width="1920"
				height="800"
				:alt="slide.alt"
				:aria-hidden="index !== active"
				:fetchpriority="index === 0 ? 'high' : 'low'"
				decoding="async"
				class="absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-1000 ease-in-out motion-reduce:transition-none"
				:class="index === active ? 'opacity-100' : 'opacity-0'"
			/>
			<div class="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/50 to-black/10" aria-hidden="true" />
			<div class="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-transparent to-transparent" aria-hidden="true" />
		</template>

		<div
			class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-16"
			:class="isSplit ? 'grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28' : 'pb-20 pt-28 lg:pb-24'"
		>
			<div class="max-w-2xl">
				<p class="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-neutral-400">
					<span class="h-px w-10 bg-brand-red" aria-hidden="true" />
					ANSA Motors · 2026 Lineup
				</p>
				<h1 class="text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
					{{ headlineParts.before }}<span v-if="headlineParts.keyword" class="text-brand-red">{{ headlineParts.keyword }}</span>{{ headlineParts.after }}
				</h1>
				<p v-if="hero.body" class="mt-6 max-w-xl text-lg text-neutral-300 lg:text-xl">{{ hero.body }}</p>

				<div class="mt-10 flex flex-wrap gap-4">
					<NuxtLink
						to="#models"
						class="inline-block rounded-md bg-brand-red px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
					>
						Explore models
					</NuxtLink>
					<NuxtLink
						:to="{ path: '/contact', query: { intent: 'sales' } }"
						class="inline-block rounded-md border border-white/40 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-white hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
					>
						Book a test drive
					</NuxtLink>
				</div>
			</div>

			<!-- Split screen: framed first still beside the copy -->
			<div v-if="isSplit && slides[0]" class="relative">
				<div class="absolute -inset-4 -z-10 rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(195,0,47,0.25),transparent_70%)]" aria-hidden="true" />
				<img
					:src="assetUrl(slides[0].id, 1920)"
					:srcset="srcset(slides[0].id)"
					sizes="(min-width: 1024px) 50vw, 100vw"
					:alt="slides[0].alt"
					class="w-full rounded-xl object-cover"
					fetchpriority="high"
				/>
			</div>
		</div>

		<!-- Slide indicators -->
		<div
			v-if="!isSplit && slides.length > 1"
			class="absolute bottom-8 right-4 flex items-center gap-2 sm:right-6 lg:right-16"
			role="group"
			aria-label="Choose slide"
		>
			<button
				v-for="(slide, index) in slides"
				:key="slide.id"
				type="button"
				class="group flex h-6 items-center focus:outline-none"
				:aria-label="`Show slide ${index + 1} of ${slides.length}: ${slide.alt}`"
				:aria-current="index === active ? 'true' : undefined"
				@click="goTo(index)"
			>
				<span
					class="block h-1 rounded-full transition-all duration-500 group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-black"
					:class="index === active ? 'w-10 bg-brand-red' : 'w-5 bg-white/40 group-hover:bg-white/70'"
				/>
			</button>
		</div>
	</section>
</template>
