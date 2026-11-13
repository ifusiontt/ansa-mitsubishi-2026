<script setup lang="ts">
import type { BlockHeroCustom } from '#shared/types/schema';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Full-bleed pitch-black hero for the Home page.
 *
 * Immersive template — four crossfading slides from the official 2026 shoot:
 *   1. family still (Xpander Cross · Triton · Outlander Sport HEV at sunset) — the LCP image:
 *      SSR'd, preloaded and fetchpriority=high;
 *   2–4. Triton / Outlander Sport HEV / Xpander Cross brand films (muted, playsinline).
 * Video elements are only created after hydration (client-only, `videosReady`), so the first paint
 * downloads nothing but slide 1. The active and next video preload; the rest stay at preload=none.
 *
 * Autoplay: image slides hold SLIDE_INTERVAL_MS; a video slide plays its film from the top and
 * advances on `ended` (each cut closes on the Mitsubishi end card). While autoplay is paused
 * (hover / focus / hidden tab) the active film loops instead. If a film can't play, its poster
 * holds for SLIDE_INTERVAL_MS. prefers-reduced-motion: no autoplay, and video slides show the poster.
 *
 * Copy sits top-left in the open sky above the vehicles' roofline (the family still keeps its upper
 * ~40% clear): compact type and a top-left scrim instead of a full-height side scrim.
 * Height: 16:9 on md+ (the family still uncropped), capped to the viewport below the sticky header
 * (149px: NavigationBar's p-4 + 120px-wide logo), so the whole hero, indicators included, sits
 * above the fold. Mobile fills the viewport below the header.
 * Masters: scripts/optimize-hero-media.sh → /public/images/hero, /public/videos/hero.
 * Split template keeps the CMS-driven copy and the block_hero_custom `media` still.
 */
const props = defineProps<{ hero: BlockHeroCustom }>();

const SLIDE_INTERVAL_MS = 5000;

const { setAttr } = useVisualEditing();

const isSplit = computed(() => props.hero.template === 'hero_split_screen');

interface Slide {
	key: string;
	/** Short name for the slide picker's aria-label. */
	label: string;
	kind: 'image' | 'video';
	/**
	 * Image URL, or the .mp4 for a video slide. For video slides this is the bundled fallback; the
	 * film is served from the Directus file of the same name in the hero `media_gallery` when present.
	 */
	src: string;
	/** Video slides: first-frame still shown until (or instead of) playback (same CMS-first rule). */
	poster?: string;
	/** Literal Tailwind object-position classes (kept whole so the JIT scanner picks them up). */
	focal?: string;
	alt: string;
	eyebrow: string;
	/** Headline lead-in; `highlight` is painted Mitsubishi Red after it. */
	headline: string;
	highlight: string;
	cta: { label: string; to: string };
}

const SLIDES: Slide[] = [
	{
		key: 'family',
		label: '2026 lineup',
		kind: 'image',
		src: '/images/hero/mitsubishi-family-hero.webp',
		// Desktop: crop from the bottom (road) so the sky above the roofline stays for the copy.
		// Mobile: portrait crop centred on the Triton, with the Xpander Cross and Outlander Sport HEV either side.
		focal: 'object-[55%_50%] md:object-top',
		alt: 'The 2026 Mitsubishi Xpander Cross, Triton and Outlander Sport HEV on a coastal highway at sunset',
		eyebrow: 'ANSA Motors · 2026 Lineup',
		headline: 'Drive your ',
		highlight: 'ambition.',
		cta: { label: 'Explore models', to: '#models' },
	},
	{
		key: 'triton',
		label: 'Triton',
		kind: 'video',
		src: '/videos/hero/triton-hero.mp4',
		poster: '/videos/hero/triton-hero-poster.webp',
		alt: 'Mitsubishi Triton driving across sand dunes and mountain trails',
		eyebrow: 'All-New Triton',
		headline: 'Engineered beyond ',
		highlight: 'tough.',
		cta: { label: 'Explore Triton', to: '/showroom/triton' },
	},
	{
		key: 'outlander-sport',
		label: 'Outlander Sport HEV',
		kind: 'video',
		src: '/videos/hero/outlander-sport-hev-hero.mp4',
		poster: '/videos/hero/outlander-sport-hev-hero-poster.webp',
		alt: 'Mitsubishi Outlander Sport HEV driving on forest roads, wet crossings and gravel',
		eyebrow: 'All-New 2026 Hybrid',
		headline: 'Smarter. Smoother. ',
		highlight: 'Sassier.',
		cta: { label: 'Explore Outlander Sport HEV', to: '/showroom/outlander-sport' },
	},
	{
		key: 'xpander-cross',
		label: 'Xpander Cross',
		kind: 'video',
		src: '/videos/hero/xpander-cross-hero.mp4',
		poster: '/videos/hero/xpander-cross-hero-poster.webp',
		alt: 'Mitsubishi Xpander Cross in a misty pine forest',
		eyebrow: '7-Seater Adventure',
		headline: 'Expand your ',
		highlight: 'horizons.',
		cta: { label: 'Explore Xpander Cross', to: '/showroom/xpander-cross' },
	},
];

const LCP_IMAGE = SLIDES[0]!.src;

/**
 * Hero `media_gallery` files keyed by filename (seeded by directus/seeds/homepage-blocks.mjs:
 * family still, then each film and its poster). Films and posters play from the Directus asset URL;
 * the bundled /videos/hero file is only the fallback when the CMS has no file of that name.
 * The family still stays bundled so it can be preloaded from the HTML as the LCP image.
 */
const galleryIds = computed(() => {
	const ids = new Map<string, string>();
	for (const entry of props.hero.media_gallery ?? []) {
		const file = typeof entry === 'object' ? entry?.directus_files_id : null;
		if (file && typeof file === 'object' && file.filename_download) ids.set(file.filename_download, file.id);
	}
	return ids;
});
function mediaUrl(bundled: string | undefined) {
	if (!bundled) return undefined;
	const id = galleryIds.value.get(bundled.split('/').pop()!);
	return id ? getDirectusAssetURL(id) : bundled;
}

// Preload the LCP still (immersive template only) so it starts downloading with the HTML.
useHead(() => (isSplit.value ? {} : { link: [{ rel: 'preload', as: 'image', href: LCP_IMAGE, fetchpriority: 'high', type: 'image/webp' }] }));

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
const nextIndex = computed(() => (active.value + 1) % SLIDES.length);
const motionOk = computed(() => reducedMotion.value !== 'reduce');

const autoplay = computed(
	() => !isSplit.value && !hovered.value && !focused.value && visibility.value === 'visible' && motionOk.value,
);

/** Video elements are client-only and created after mount, so slide 1 paints with nothing else in flight. */
const videosReady = ref(false);
const videoEls = new Map<number, HTMLVideoElement>();
function bindVideo(index: number, el: unknown) {
	if (el instanceof HTMLVideoElement) videoEls.set(index, el);
	else videoEls.delete(index);
}

const advance = () => (active.value = nextIndex.value);

let holdTimer: ReturnType<typeof setTimeout> | undefined;
function clearHold() {
	if (holdTimer) clearTimeout(holdTimer);
	holdTimer = undefined;
}
/** Image slide (or a film that can't play): advance after the standard interval. */
function hold() {
	clearHold();
	if (autoplay.value) holdTimer = setTimeout(advance, SLIDE_INTERVAL_MS);
}

function warm(index: number) {
	const el = videoEls.get(index);
	if (!el || el.preload === 'auto') return;
	el.preload = 'auto';
	if (el.readyState === 0) el.load();
}

/** Start the active slide: pause other films, play this one from the top (or hold a still). */
function startSlide(fromTop: boolean) {
	clearHold();
	if (import.meta.server) return;
	for (const [index, el] of videoEls) if (index !== active.value && !el.paused) el.pause();

	const slide = activeSlide.value;
	if (slide.kind === 'video' && videosReady.value && motionOk.value) {
		const el = videoEls.get(active.value);
		if (el) {
			warm(active.value);
			if (fromTop) el.currentTime = 0;
			el.play().catch(hold);
			warm(nextIndex.value);
			return;
		}
	}
	hold();
	warm(nextIndex.value);
}

function onEnded(index: number) {
	if (index === active.value && autoplay.value) advance();
}

watch(active, () => startSlide(true));

// Pausing autoplay keeps the active film running (it loops via :loop="!autoplay"); resuming
// restarts the still-slide countdown, or lets the film run on to `ended`.
watch(autoplay, (on) => {
	if (!on) return clearHold();
	if (activeSlide.value.kind === 'image') hold();
	else startSlide(false);
});

watch(visibility, (state) => {
	const el = videoEls.get(active.value);
	if (state === 'hidden') el?.pause();
	else if (activeSlide.value.kind === 'video' && motionOk.value) el?.play().catch(() => {});
});

onMounted(() => {
	if (isSplit.value) return;
	// Hold slide 1 (the LCP still) immediately; create the video elements once the browser is idle.
	hold();
	const ready = () => {
		videosReady.value = true;
		nextTick(() => warm(nextIndex.value));
	};
	if ('requestIdleCallback' in window) window.requestIdleCallback(ready, { timeout: 2000 });
	else setTimeout(ready, 200);
});

onBeforeUnmount(clearHold);

/**
 * Pause on real mouse hover only: a tap fires pointerenter with no matching leave, which would
 * stall autoplay on touch screens. Likewise only keyboard focus (:focus-visible) pauses — a mouse
 * click on an indicator focuses it too, and must not stop the carousel.
 */
function onPointerEnter(event: PointerEvent) {
	if (event.pointerType === 'mouse') hovered.value = true;
}
function onFocusIn(event: FocusEvent) {
	focused.value = event.target instanceof HTMLElement && event.target.matches(':focus-visible');
}

/** Manual pick — restarts the slide so the chosen one gets its full time. */
function goTo(index: number) {
	if (index === active.value) return startSlide(true);
	active.value = index;
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
		:class="
			isSplit
				? ''
				: 'h-[calc(100svh-149px)] max-h-[860px] min-h-[520px] w-full md:aspect-video md:h-auto md:max-h-[calc(100svh-149px)] md:min-h-[520px]'
		"
		:aria-roledescription="isSplit ? undefined : 'carousel'"
		:aria-label="isSplit ? undefined : 'Featured models'"
		:data-directus="
			setAttr({ collection: 'block_hero_custom', item: hero.id, fields: ['headline', 'highlight_keyword', 'body', 'media_gallery', 'media', 'template'], mode: 'drawer' })
		"
		@pointerenter="onPointerEnter"
		@pointerleave="hovered = false"
		@focusin="onFocusIn"
		@focusout="focused = false"
	>
		<!-- Immersive: crossfading full-bleed media under a top-left scrim -->
		<template v-if="!isSplit">
			<div
				v-for="(slide, index) in SLIDES"
				:key="slide.key"
				class="absolute inset-0 -z-10 transition-opacity duration-1000 ease-in-out motion-reduce:transition-none"
				:class="index === active ? 'opacity-100' : 'opacity-0'"
				:aria-hidden="index !== active"
			>
				<img
					v-if="slide.kind === 'image'"
					:src="slide.src"
					:alt="slide.alt"
					:fetchpriority="index === 0 ? 'high' : 'low'"
					:loading="index === 0 ? 'eager' : 'lazy'"
					decoding="async"
					class="h-full w-full object-cover"
					:class="slide.focal"
				/>
				<!-- Client-only, created after hydration: the server and first paint ship no video bytes -->
				<video
					v-else-if="videosReady"
					:ref="(el) => bindVideo(index, el)"
					:src="mediaUrl(slide.src)"
					:poster="mediaUrl(slide.poster)"
					:aria-label="slide.alt"
					:loop="!autoplay"
					preload="none"
					muted
					playsinline
					disablepictureinpicture
					disableremoteplayback
					tabindex="-1"
					class="h-full w-full object-cover"
					:class="slide.focal"
					@ended="onEnded(index)"
				/>
			</div>

			<!-- Top-left scrim behind the copy; the vehicles in the lower two-thirds stay unshaded -->
			<div class="absolute inset-0 -z-10 bg-gradient-to-br from-black/75 via-black/30 to-transparent" aria-hidden="true" />
			<!-- Floor fade keeps the indicators legible over bright pavement -->
			<div class="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />

			<div class="mx-auto w-full max-w-7xl px-4 pt-28 sm:px-6 md:pt-32 lg:px-16">
				<Transition
					mode="out-in"
					enter-active-class="transition duration-500 ease-out motion-reduce:transition-none"
					enter-from-class="translate-y-3 opacity-0"
					leave-active-class="transition duration-300 ease-in motion-reduce:transition-none"
					leave-to-class="opacity-0"
				>
					<div :key="activeSlide.key" class="flex max-w-2xl flex-col items-start">
						<p class="mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-200">
							<span class="h-px w-8 bg-brand-red" aria-hidden="true" />
							{{ activeSlide.eyebrow }}
						</p>
						<h1 class="text-3xl font-black uppercase leading-none tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-4xl lg:text-5xl">
							{{ activeSlide.headline }}<span class="text-brand-red">{{ activeSlide.highlight }}</span>
						</h1>

						<div class="mt-5 flex flex-wrap gap-3 md:mt-6">
							<NuxtLink
								:to="activeSlide.cta.to"
								class="inline-block rounded-md bg-brand-red px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:px-6 sm:text-xs"
							>
								{{ activeSlide.cta.label }}
							</NuxtLink>
							<NuxtLink
								:to="{ path: '/contact', query: { intent: 'sales' } }"
								class="inline-block rounded-md border border-white/40 bg-black/20 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:px-6 sm:text-xs"
							>
								Book a test drive
							</NuxtLink>
						</div>
					</div>
				</Transition>
			</div>

			<!-- Slide indicators -->
			<div class="absolute bottom-6 right-4 flex items-center gap-2 sm:right-6 md:bottom-8 lg:right-16" role="group" aria-label="Choose slide">
				<button
					v-for="(slide, index) in SLIDES"
					:key="slide.key"
					type="button"
					class="group flex h-6 items-center focus:outline-none"
					:aria-label="`Show slide ${index + 1} of ${SLIDES.length}: ${slide.label}`"
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
