<script setup lang="ts">
import type { BlockHeroCustom } from '#shared/types/schema';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Full-bleed pitch-black hero for the Home page.
 *
 * Immersive template: a crossfading three-model slider (Outlander Sport, Triton, Xpander Cross),
 * each slide carrying its own eyebrow, headline and showroom CTA over a left-to-right scrim.
 * Auto-advances every 5s with indicator buttons; autoplay pauses while hovered / focused or the
 * tab is hidden, and is off for prefers-reduced-motion. Slide stills ship from /public/images/main-hero.
 * Split template keeps the CMS-driven copy and the block_hero_custom `media` still.
 */
const props = defineProps<{ hero: BlockHeroCustom }>();

const SLIDE_INTERVAL_MS = 5000;

const { setAttr } = useVisualEditing();

const isSplit = computed(() => props.hero.template === 'hero_split_screen');

interface Slide {
	model: string;
	image: string;
	alt: string;
	eyebrow: string;
	/** Headline lead-in; `highlight` is painted Mitsubishi Red after it. */
	headline: string;
	highlight: string;
	cta: { label: string; to: string };
}

const SLIDES: Slide[] = [
	{
		model: 'outlander-sport',
		image: '/images/main-hero/2025-outlander-sport-glamour-1-2048x1447.webp',
		alt: 'Mitsubishi Outlander Sport driving through a tree-lined city street',
		eyebrow: 'All-New 2026',
		headline: 'Smarter. Smoother. ',
		highlight: 'Sassier.',
		cta: { label: 'Explore Outlander Sport', to: '/showroom/outlander-sport' },
	},
	{
		model: 'triton',
		image: '/images/main-hero/24MY_TRITON_ALL-NEW_LHD_MV_Intro_P_proxy.png',
		alt: 'All-new Mitsubishi Triton pickup',
		eyebrow: 'The Workhorse',
		headline: 'Engineered beyond ',
		highlight: 'tough.',
		cta: { label: 'Explore Triton', to: '/showroom/triton' },
	},
	{
		model: 'xpander-cross',
		image: '/images/main-hero/2023-xpander-glamour1.jpg',
		alt: 'Mitsubishi Xpander parked on a sunlit brick driveway',
		eyebrow: '7-Seater Adventure',
		headline: 'Expand your ',
		highlight: 'horizons.',
		cta: { label: 'Explore Xpander Cross', to: '/showroom/xpander-cross' },
	},
];

const splitImageId = computed(() => directusFileId(props.hero.media));
const assetUrl = (id: string, width: number) => `${getDirectusAssetURL(id)}?width=${width}&quality=85&format=webp`;
const srcset = (id: string) => `${assetUrl(id, 960)} 960w, ${assetUrl(id, 1920)} 1920w`;

// --- slider -------------------------------------------------------------------
const active = ref(0);
const hovered = ref(false);
const focused = ref(false);
const visibility = useDocumentVisibility();
const reducedMotion = usePreferredReducedMotion();

const activeSlide = computed(() => SLIDES[active.value] ?? SLIDES[0]!);

const autoplay = computed(
	() => !isSplit.value && !hovered.value && !focused.value && visibility.value === 'visible' && reducedMotion.value !== 'reduce',
);

const { pause, resume } = useIntervalFn(() => (active.value = (active.value + 1) % SLIDES.length), SLIDE_INTERVAL_MS, {
	immediate: false,
});

// Client only — the server renders slide 0 and never ticks.
watch(autoplay, (on) => (on ? resume() : pause()), { immediate: import.meta.client });

/** Manual pick — restarts the 5s countdown so the chosen slide gets its full time. */
function goTo(index: number) {
	active.value = index;
	if (autoplay.value) {
		pause();
		resume();
	}
}

/** Split template: CMS headline split around the highlight keyword so it can be painted red without v-html. */
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
		:class="isSplit ? '' : 'flex aspect-[12/5] min-h-[600px] w-full items-center'"
		:aria-roledescription="isSplit ? undefined : 'carousel'"
		:aria-label="isSplit ? undefined : 'Featured models'"
		:data-directus="
			setAttr({ collection: 'block_hero_custom', item: hero.id, fields: ['headline', 'highlight_keyword', 'body', 'media_gallery', 'media', 'template'], mode: 'drawer' })
		"
		@mouseenter="hovered = true"
		@mouseleave="hovered = false"
		@focusin="focused = true"
		@focusout="focused = false"
	>
		<!-- Immersive: crossfading full-bleed stills under a left-weighted scrim -->
		<template v-if="!isSplit">
			<img
				v-for="(slide, index) in SLIDES"
				:key="slide.model"
				:src="slide.image"
				:alt="slide.alt"
				:aria-hidden="index !== active"
				:fetchpriority="index === 0 ? 'high' : 'low'"
				decoding="async"
				class="absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-1000 ease-in-out motion-reduce:transition-none"
				:class="index === active ? 'opacity-100' : 'opacity-0'"
			/>
			<div class="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/45 to-transparent" aria-hidden="true" />
			<!-- Floor fade keeps the indicators legible over bright pavement -->
			<div class="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-black/70 to-transparent" aria-hidden="true" />

			<div class="mx-auto w-full max-w-7xl px-4 pb-24 pt-28 sm:px-6 lg:px-16">
				<Transition
					mode="out-in"
					enter-active-class="transition duration-500 ease-out motion-reduce:transition-none"
					enter-from-class="translate-y-3 opacity-0"
					leave-active-class="transition duration-300 ease-in motion-reduce:transition-none"
					leave-to-class="opacity-0"
				>
					<div :key="activeSlide.model" class="max-w-2xl">
						<p class="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-neutral-300">
							<span class="h-px w-10 bg-brand-red" aria-hidden="true" />
							{{ activeSlide.eyebrow }}
						</p>
						<h1 class="text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
							{{ activeSlide.headline }}<span class="text-brand-red">{{ activeSlide.highlight }}</span>
						</h1>

						<div class="mt-10 flex flex-wrap gap-4">
							<NuxtLink
								:to="activeSlide.cta.to"
								class="inline-block rounded-md bg-brand-red px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
							>
								{{ activeSlide.cta.label }}
							</NuxtLink>
							<NuxtLink
								:to="{ path: '/contact', query: { intent: 'sales' } }"
								class="inline-block rounded-md border border-white/40 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-white hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
							>
								Book a test drive
							</NuxtLink>
						</div>
					</div>
				</Transition>
			</div>

			<!-- Slide indicators -->
			<div class="absolute bottom-8 right-4 flex items-center gap-2 sm:right-6 lg:right-16" role="group" aria-label="Choose slide">
				<button
					v-for="(slide, index) in SLIDES"
					:key="slide.model"
					type="button"
					class="group flex h-6 items-center focus:outline-none"
					:aria-label="`Show slide ${index + 1} of ${SLIDES.length}: ${slide.cta.label.replace('Explore ', '')}`"
					:aria-current="index === active ? 'true' : undefined"
					@click="goTo(index)"
				>
					<span
						class="block h-1 rounded-full transition-all duration-500 group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-black"
						:class="index === active ? 'w-10 bg-brand-red' : 'w-5 bg-white/40 group-hover:bg-white/70'"
					/>
				</button>
			</div>
		</template>

		<!-- Split screen: CMS copy beside the framed block still -->
		<div v-else class="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-16 lg:py-28">
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
				</div>
			</div>
			<div v-if="splitImageId" class="relative">
				<div class="absolute -inset-4 -z-10 rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(195,0,47,0.25),transparent_70%)]" aria-hidden="true" />
				<img
					:src="assetUrl(splitImageId, 1920)"
					:srcset="srcset(splitImageId)"
					sizes="(min-width: 1024px) 50vw, 100vw"
					:alt="hero.title || 'The 2026 Mitsubishi lineup'"
					class="w-full rounded-xl object-cover"
					fetchpriority="high"
				/>
			</div>
		</div>
	</section>
</template>
