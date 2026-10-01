<script setup lang="ts">
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';
import type { VehicleColor, VehicleHighlight, VehiclePage, VehicleTrim } from '#shared/types/vehicle';

/**
 * /showroom/[slug] — 8-part vehicle page.
 *
 * Design tokens and spacing metrics are extracted live from the reference site
 * (https://mitsubishi-motors.com.jm/vehicle/2025-outlander-sport/) via
 * `extract_local_direct.py` + the theme stylesheet (mitsubishi-2), and applied
 * directly in the `.vehicle-page` token block below.
 *
 * Data source: GET /items/vehicles?filter[slug][_eq]=:slug
 *   &fields=*,hero_block.*,colors.*,highlights.*,trims.*
 * (proxied through server/api/vehicles/[slug].get.ts)
 */
const route = useRoute();
const slug = route.params.slug as string;

const {
	data: vehicleData,
	error,
} = await useFetch<VehiclePage>(() => `/api/vehicles/${encodeURIComponent(slug)}`, {
	key: `vehicle-${slug}`,
});

if (!vehicleData.value || error.value) {
	throw createError({ statusCode: 404, statusMessage: 'Vehicle not found', fatal: true });
}

const vehicle = vehicleData.value;

// Model name without the brand prefix ("Mitsubishi Triton" → "Triton") for headlines.
const displayTitle = vehicle.title.replace(/^mitsubishi\s+/i, '');

/* ------------------------------------------------------------------ */
/* derived state                                                       */
/* ------------------------------------------------------------------ */

const heroBlock = computed(() => vehicle.hero_block ?? null);
const heroMedia = computed(() => {
	const media = heroBlock.value?.media;
	if (!media) return '';
	return typeof media === 'string' ? media : media.id ?? '';
});

// Optional background video (vehicles.hero_video_url); falls back to heroMedia.
const heroVideoUrl = computed(() => vehicle.hero_video_url || '');
const heroKicker = computed(() => [vehicle.model_year, vehicle.category].filter(Boolean).join(' '));

const colors = computed<VehicleColor[]>(() => [...(vehicle.colors ?? [])].sort((a, b) => a.sort - b.sort));
// Part 3 is a strict 3-up panel row: show only the top 3 highlights by sort order.
const MAX_HIGHLIGHTS = 3;
const highlights = computed<VehicleHighlight[]>(() =>
	[...(vehicle.highlights ?? [])].sort((a, b) => a.sort - b.sort).slice(0, MAX_HIGHLIGHTS),
);
const trims = computed<VehicleTrim[]>(() => [...(vehicle.trims ?? [])].sort((a, b) => a.trim_name.localeCompare(b.trim_name)));

const selectedColorIdx = ref(0);
const selectedColor = computed<VehicleColor | null>(() => colors.value[selectedColorIdx.value] ?? null);

const activeColorImageUuid = computed(() => {
	const color = selectedColor.value;

	if (color?.image) {
		return typeof color.image === 'string' ? color.image : color.image.id ?? '';
	}

	return heroMedia.value;
});

function stepColor(delta: number) {
	const count = colors.value.length;
	if (!count) return;
	selectedColorIdx.value = (selectedColorIdx.value + delta + count) % count;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const selectedTrimIdx = ref(0);
const selectedTrim = computed<VehicleTrim | null>(() => trims.value[selectedTrimIdx.value] ?? null);

// Contact links pre-filled with the vehicle, intent and (once chosen) trim.
function contactHref(intent: 'dealer' | 'sales'): string {
	const params = new URLSearchParams({ vehicle: vehicle.slug, intent });
	if (selectedTrim.value) params.set('trim', selectedTrim.value.trim_name);
	return `/contact?${params}`;
}

function scrollToSection(id: string) {
	document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectTrim(index: number) {
	selectedTrimIdx.value = index;
	scrollToSection('cta');
}

function formatPrice(price: number | null | undefined): string {
	if (price == null) return '';
	return `TTD $${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price)}`;
}

type SpecRow = { label: string; value: string };
const compactRows = (rows: Array<{ label: string; value: string | number | null | undefined }>): SpecRow[] =>
	rows.filter((row) => row.value != null && row.value !== '').map((row) => ({ label: row.label, value: String(row.value) }));

// Part 2 quick specs bar.
const quickSpecs = computed(() =>
	compactRows([
		{ label: 'Model Year', value: vehicle.model_year },
		{ label: 'Category', value: vehicle.category },
		{ label: 'Body Type', value: vehicle.body_type },
		{ label: 'Fuel Type', value: vehicle.fuel_type },
		{ label: 'Seating', value: vehicle.seating_capacity ? `${vehicle.seating_capacity} Seats` : null },
		{ label: 'Starting At', value: vehicle.starting_price ? formatPrice(vehicle.starting_price) : null },
	]),
);

// Part 6 — re-derives whenever the Part 5 trim selection changes.
const keySpecs = computed(() =>
	compactRows([
		{ label: 'Engine', value: selectedTrim.value?.engine },
		{ label: 'Transmission', value: selectedTrim.value?.transmission },
		{ label: 'Drivetrain', value: selectedTrim.value?.drivetrain },
		{ label: 'Seating Capacity', value: vehicle.seating_capacity ? `${vehicle.seating_capacity} Passengers` : null },
		{ label: 'Fuel Type', value: vehicle.fuel_type },
		{ label: 'Warranty', value: vehicle.warranty },
	]),
);

const glanceRows = computed(() =>
	compactRows([
		{ label: 'Model Year', value: vehicle.model_year },
		{ label: 'Category', value: vehicle.category },
		{ label: 'Starting Price', value: vehicle.starting_price ? formatPrice(vehicle.starting_price) : null },
		{ label: 'Warranty', value: vehicle.warranty },
	]),
);

function highlightImageUuid(highlight: VehicleHighlight | any): string {
	if (highlight.image) {
		return typeof highlight.image === 'string' ? highlight.image : highlight.image.id ?? '';
	}

	if (Array.isArray(highlight.images) && highlight.images[0]) {
		const img = highlight.images[0].directus_files_id || highlight.images[0];
		return typeof img === 'string' ? img : img.id ?? '';
	}

	return heroMedia.value;
}

useSeoMeta({
	title: vehicle.model_year ? `${vehicle.model_year} ${vehicle.title}` : vehicle.title,
	description: vehicle.overview ?? vehicle.tagline ?? '',
	ogTitle: vehicle.title,
	ogDescription: vehicle.overview ?? vehicle.tagline ?? '',
});
</script>

<template>
	<div class="vehicle-page">
		<!-- ════════════════════════════════════════════════════════════
		     PART 1 · HERO — immersive dark hero (hero_block)
	     ════════════════════════════════════════════════════════════ -->
		<section
			id="hero"
			class="relative flex items-end md:items-center min-h-[min(92svh,860px)] overflow-hidden bg-slate-950"
			aria-labelledby="hero-heading"
		>
			<!-- Background: looping video when provided, else the hero image -->
			<video
				v-if="heroVideoUrl"
				:src="heroVideoUrl"
				:poster="heroMedia ? getDirectusAssetURL(heroMedia) : undefined"
				autoplay
				loop
				muted
				playsinline
				class="absolute inset-0 w-full h-full object-cover"
				aria-hidden="true"
			/>
			<DirectusImage
				v-else-if="heroMedia"
				:uuid="heroMedia"
				alt=""
				loading="eager"
				class="absolute inset-0 w-full h-full object-cover"
				aria-hidden="true"
			/>

			<!-- Legibility scrims: left-to-right for the copy, bottom-up for the fold -->
			<div class="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent" aria-hidden="true" />
			<div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30" aria-hidden="true" />

			<div class="vp-container relative z-10 py-24 md:py-32">
				<div class="max-w-2xl text-left z-10 relative">
					<p v-if="heroKicker" class="text-xs font-bold tracking-widest text-red-500 uppercase mb-2">{{ heroKicker }}</p>
					<h1 id="hero-heading" class="text-4xl md:text-6xl font-extrabold uppercase tracking-tight text-white mb-3">
						{{ displayTitle }}
					</h1>
					<p v-if="heroBlock?.headline" class="text-lg md:text-xl font-bold uppercase tracking-wider text-slate-200 mb-4">
						{{ heroBlock.headline }}
					</p>
					<p v-if="heroBlock?.body" class="text-sm text-slate-300 max-w-lg mb-8 leading-relaxed">{{ heroBlock.body }}</p>
					<div class="flex flex-wrap gap-4 justify-start">
						<a
							href="#trims"
							class="inline-block bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-md transition-colors shadow-lg shadow-red-950/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
							@click.prevent="scrollToSection('trims')"
						>
							View Trims &amp; Pricing
						</a>
						<a
							v-if="vehicle.brochure_url"
							:href="vehicle.brochure_url"
							target="_blank"
							rel="noopener"
							class="inline-block border border-white/40 hover:border-white text-white font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-md transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
						>
							Download Brochure
						</a>
					</div>
				</div>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════
		     PART 2 · OVERVIEW — tagline, headline, copy + facts strip
	     ════════════════════════════════════════════════════════════ -->
		<section id="overview" class="vp-section vp-section--white" aria-labelledby="overview-heading">
			<div class="vp-container">
				<div class="grid gap-6 md:grid-cols-2 md:gap-12 md:items-end">
					<div>
						<p v-if="vehicle.tagline" class="text-xs font-bold tracking-widest text-red-500 uppercase mb-2">{{ vehicle.tagline }}</p>
						<h2 id="overview-heading" class="text-2xl md:text-4xl font-bold uppercase tracking-wider text-slate-900">
							{{ vehicle.hero_headline || vehicle.title }}
						</h2>
					</div>
					<p v-if="vehicle.overview" class="text-slate-600 text-sm md:text-base leading-relaxed max-w-xl">{{ vehicle.overview }}</p>
				</div>

				<dl class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 pt-8 border-t border-slate-200 mt-8">
					<div v-for="fact in quickSpecs" :key="fact.label">
						<dt class="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">{{ fact.label }}</dt>
						<dd class="text-sm md:text-base font-bold text-slate-900">{{ fact.value }}</dd>
					</div>
				</dl>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════
		     PART 3 · HIGHLIGHTS — full-bleed 3-up expandable panels
	     ════════════════════════════════════════════════════════════ -->
		<section id="highlights" class="bg-white pb-16 md:pb-20" aria-labelledby="highlights-heading">
			<h2 id="highlights-heading" class="sr-only">{{ vehicle.title }} highlights</h2>
			<div class="flex w-full flex-col gap-3 rounded-xl bg-slate-950 p-2 md:flex-row md:gap-2 md:min-h-[560px] lg:min-h-[620px]">
				<article
					v-for="(highlight, index) in highlights"
					:key="highlight.id"
					class="group relative w-full flex-none h-[240px] md:h-auto md:flex-1 overflow-hidden bg-slate-950 transition-all duration-500 ease-out md:hover:flex-[1.35]"
				>
					<DirectusImage
						v-if="highlightImageUuid(highlight)"
						:uuid="highlightImageUuid(highlight)"
						:alt="highlight.headline || highlight.tagline || vehicle.title"
						class="absolute inset-0 object-cover w-full h-full transform scale-100 group-hover:scale-105 transition-transform duration-700"
					/>
					<div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" aria-hidden="true" />

					<span
						class="absolute right-5 top-5 z-10 rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1 text-xs font-bold tracking-widest text-white"
						aria-hidden="true"
					>
						{{ pad2(index + 1) }}
					</span>

					<div class="relative z-10 p-6 lg:p-8 flex flex-col justify-end h-full">
						<p v-if="highlight.tagline" class="text-xs font-bold tracking-widest text-red-500 uppercase mb-2">
							{{ highlight.tagline }}
						</p>
						<h3 v-if="highlight.headline" class="text-xl lg:text-2xl font-bold uppercase tracking-wider text-white mb-3">
							{{ highlight.headline }}
						</h3>
						<p v-if="highlight.description" class="text-slate-300 text-sm leading-relaxed max-w-md opacity-90 transition-opacity duration-300">
							{{ highlight.description }}
						</p>
						<NuxtLink
							to="#specs"
							class="inline-flex w-fit items-center text-xs font-bold tracking-widest uppercase text-white mt-4 border-b border-white/30 pb-1 group-hover:border-red-500 transition-colors focus:outline-none focus-visible:border-red-500"
						>
							Learn more <span class="ml-2" aria-hidden="true">→</span>
						</NuxtLink>
					</div>
				</article>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════
		     PART 4 · COLORS — 2-column slanted mini-configurator
	     ════════════════════════════════════════════════════════════ -->
		<section id="colors" class="relative isolate overflow-hidden bg-white pt-8 md:pt-12" aria-label="Exterior colours">
			<div class="grid lg:grid-cols-12 lg:min-h-[600px]">
				<!-- Left · copy, vehicle picker, CTA -->
				<div class="flex flex-col justify-center px-6 py-16 sm:px-10 lg:col-span-5 lg:py-24 lg:pl-[max(2.5rem,calc((100vw-1280px)/2+2.5rem))] lg:pr-10">
					<h2 class="text-3xl md:text-4xl font-bold uppercase tracking-wider text-slate-900">Explore colour options</h2>
					<p class="text-slate-600 mt-2">Choose the perfect colour for your personality.</p>

					<NuxtLink
						:to="{ path: '/contact', query: { vehicle: vehicle.slug } }"
						class="mt-10 inline-block w-fit px-8 py-3.5 border-2 border-slate-900 text-slate-900 font-bold tracking-widest text-xs uppercase hover:bg-slate-900 hover:text-white transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C3002F] focus-visible:ring-offset-2"
					>
						Book a test drive
					</NuxtLink>
				</div>

				<!-- Right · dark slanted visualizer canvas -->
				<div class="relative flex flex-col items-center justify-center px-6 pb-12 pt-10 lg:col-span-7 lg:py-16 lg:pl-[12%] lg:pr-10">
					<!-- Slanted backdrop, tinted toward the active colour. The tint layer
					     paints its gradient from `currentColor` so the 500ms colour transition
					     actually animates (gradients themselves aren't transitionable). -->
					<div
						class="absolute inset-0 bg-[#121316] lg:[clip-path:polygon(20%_0,100%_0,100%_100%,0%_100%)]"
						aria-hidden="true"
					>
						<div
							class="absolute inset-0 bg-[linear-gradient(135deg,currentColor_0%,transparent_75%)] opacity-[0.16] transition-colors duration-500"
							:style="{ color: selectedColor?.hex_code || '#121316' }"
						/>
					</div>

					<!-- Vehicle render + ground shadow -->
					<div class="relative z-10 w-full max-w-3xl">
						<DirectusImage
							v-if="activeColorImageUuid"
							:key="activeColorImageUuid"
							:uuid="activeColorImageUuid"
							:alt="`${vehicle.title} in ${selectedColor?.color_name ?? ''}`"
							class="relative z-10 mx-auto max-h-[360px] w-full object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,0.55)]"
						/>
						<div
							class="mx-auto -mt-6 h-8 w-4/5 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0.3)_45%,transparent_72%)] blur-sm"
							aria-hidden="true"
						/>
					</div>

					<!-- Controls -->
					<div v-if="colors.length" class="relative z-10 mt-8 flex flex-col items-center text-center text-white">
						<div class="flex items-center gap-4 text-sm font-bold tracking-widest">
							<button
								type="button"
								class="grid h-8 w-8 place-items-center rounded-full text-white/70 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
								aria-label="Previous colour"
								@click="stepColor(-1)"
							>
								<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
									<path d="M12.5 5l-5 5 5 5" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</button>
							<span aria-live="polite">
								{{ pad2(selectedColorIdx + 1) }}<span class="text-white/50">/{{ pad2(colors.length) }}</span>
							</span>
							<button
								type="button"
								class="grid h-8 w-8 place-items-center rounded-full text-white/70 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
								aria-label="Next colour"
								@click="stepColor(1)"
							>
								<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
									<path d="M7.5 5l5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</button>
						</div>

						<div class="mt-5 flex flex-wrap items-center justify-center gap-4" role="radiogroup" aria-label="Exterior colours">
							<button
								v-for="(color, index) in colors"
								:key="color.id"
								type="button"
								role="radio"
								:aria-checked="index === selectedColorIdx"
								:aria-label="color.color_name"
								class="h-7 w-7 rounded-full shadow-md transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C3002F] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
								:class="index === selectedColorIdx ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-950' : 'hover:scale-110'"
								:style="{ background: color.hex_code }"
								@click="selectedColorIdx = index"
							>
								<span class="sr-only">{{ color.color_name }}</span>
							</button>
						</div>

						<p v-if="selectedColor" class="mt-6 text-lg font-bold uppercase tracking-widest md:text-xl">
							{{ selectedColor.color_name }}
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════
		     PART 5 · TRIMS — selectable trim cards with key features
	     ════════════════════════════════════════════════════════════ -->
		<section id="trims" class="vp-section vp-section--mist" aria-label="Trims and pricing">
			<div class="vp-container">
				<header class="vp-section-head">
					<p class="vp-tagline tracking-wider uppercase">Find Your Fit</p>
					<h2 class="vp-h2 tracking-wider uppercase">Trims &amp; Pricing</h2>
				</header>
				<div class="vp-trims">
					<article
						v-for="(trim, index) in trims"
						:key="trim.id"
						class="vp-trim"
						:class="{ 'vp-trim--selected': index === selectedTrimIdx }"
						@click="selectedTrimIdx = index"
					>
						<span v-if="index === selectedTrimIdx" class="vp-trim__badge tracking-wider uppercase">Selected</span>
						<h3 class="vp-trim__name tracking-wider uppercase">{{ trim.trim_name }}</h3>
						<p v-if="trim.price != null" class="vp-trim__price">
							<span class="vp-trim__from tracking-wider uppercase">from</span>
							<span class="vp-trim__amount">{{ formatPrice(trim.price) }}</span>
						</p>

						<dl class="vp-trim__specs">
							<div v-if="trim.engine" class="vp-trim__spec">
								<dt class="tracking-wider uppercase">Engine</dt>
								<dd>{{ trim.engine }}</dd>
							</div>
							<div v-if="trim.transmission" class="vp-trim__spec">
								<dt class="tracking-wider uppercase">Transmission</dt>
								<dd>{{ trim.transmission }}</dd>
							</div>
							<div v-if="trim.drivetrain" class="vp-trim__spec">
								<dt class="tracking-wider uppercase">Drivetrain</dt>
								<dd>{{ trim.drivetrain }}</dd>
							</div>
						</dl>

						<ul v-if="trim.key_features?.length" class="vp-trim__features">
							<li v-for="(feature, featureIndex) in trim.key_features" :key="featureIndex">
								<svg
									class="w-4 h-4 text-red-600 shrink-0 mr-2 mt-0.5"
									viewBox="0 0 20 20"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									aria-hidden="true"
								>
									<path d="M4 10.5l4 4 8-9" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
								<span>{{ feature.value }}</span>
							</li>
						</ul>

						<button
							type="button"
							class="vp-btn vp-btn--outline vp-trim__cta tracking-wider uppercase"
							:class="{ 'vp-trim__cta--selected': index === selectedTrimIdx }"
							@click.stop="selectTrim(index)"
						>
							{{ index === selectedTrimIdx ? `${trim.trim_name} Selected` : `Select ${trim.trim_name}` }}
						</button>
						<a
							v-if="vehicle.brochure_url"
							:href="vehicle.brochure_url"
							target="_blank"
							rel="noopener"
							class="text-[11px] font-bold tracking-wider text-slate-500 hover:text-slate-900 uppercase text-center block mt-3 transition-colors"
							@click.stop
						>
							Download brochure <span aria-hidden="true">↓</span>
						</a>
					</article>
				</div>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════
		     PART 6 · KEY SPECS — dark industrial spec grid
	     ════════════════════════════════════════════════════════════ -->
		<section id="specs" class="vp-section vp-section--dark" aria-labelledby="specs-heading">
			<div class="vp-container">
				<header>
					<p class="text-xs font-bold tracking-widest text-red-500 uppercase mb-2">Under the Hood</p>
					<h2 id="specs-heading" class="text-3xl md:text-4xl font-bold uppercase tracking-wider text-white mb-8">Key Specifications</h2>
				</header>
				<!-- Engine / transmission / drivetrain come from the selected trim (Part 5);
				     seating, fuel and warranty are vehicle-level fields shared by all trims. -->
				<dl class="vp-specs">
					<div v-for="spec in keySpecs" :key="spec.label">
						<dt class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 border-t border-slate-800 pt-3">{{ spec.label }}</dt>
						<dd class="text-base md:text-lg font-bold text-white leading-snug">{{ spec.value }}</dd>
					</div>
				</dl>
				<p v-if="selectedTrim" class="mt-8 text-sm text-slate-400" aria-live="polite">
					Showing <strong class="font-bold text-white">{{ selectedTrim.trim_name }}</strong> trim — select a trim above to compare.
				</p>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════
		     PART 7 · BROCHURE — download CTA + at-a-glance card
	     ════════════════════════════════════════════════════════════ -->
		<section id="brochure" class="vp-section vp-section--white" aria-labelledby="brochure-heading">
			<div class="vp-container vp-brochure">
				<div>
					<p class="text-xs font-bold tracking-widest text-red-500 uppercase mb-2">Learn More</p>
					<h2 id="brochure-heading" class="text-3xl md:text-4xl font-bold uppercase tracking-wider text-slate-900 mb-4">Brochure</h2>
					<p class="max-w-lg text-slate-600 leading-relaxed">
						Explore the full feature list, dimensions, and technical specifications for the
						{{ vehicle.model_year }} {{ vehicle.title }}.
					</p>
					<a
						v-if="vehicle.brochure_url"
						:href="vehicle.brochure_url"
						target="_blank"
						rel="noopener"
						class="bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-md transition-colors inline-block mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
					>
						Download Brochure
					</a>
				</div>
				<aside class="bg-white border border-slate-200/90 rounded-xl p-6 md:p-8 shadow-sm" aria-labelledby="glance-heading">
					<h3 id="glance-heading" class="text-xs font-bold tracking-widest text-slate-900 uppercase pb-4 border-b border-slate-100 mb-2">At a Glance</h3>
					<dl>
						<div
							v-for="row in glanceRows"
							:key="row.label"
							class="flex justify-between items-start gap-4 py-3 border-b border-slate-100 last:border-none"
						>
							<dt class="shrink-0 pt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">{{ row.label }}</dt>
							<dd class="text-right font-bold text-sm text-slate-900 break-words max-w-[60%]">{{ row.value }}</dd>
						</div>
					</dl>
				</aside>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════
		     PART 8 · CTA — dealer / contact call to action
	     ════════════════════════════════════════════════════════════ -->
		<section id="cta" class="bg-slate-950 text-white py-20 md:py-24 px-4 text-center border-t border-slate-900" aria-labelledby="cta-heading">
			<p class="text-xs font-bold tracking-widest text-red-500 uppercase mb-3">Next Step</p>
			<h2 id="cta-heading" class="text-3xl md:text-5xl font-bold uppercase tracking-wider text-white mb-4">
				Ready to <span class="text-red-600">{{ displayTitle }}</span>?
			</h2>
			<p class="text-slate-300 text-sm md:text-base max-w-xl mx-auto mb-8 leading-relaxed">
				Visit a dealer to take a test drive, or talk to our sales team about the {{ vehicle.model_year }} {{ vehicle.title }}.
			</p>
			<div class="flex flex-wrap justify-center gap-4">
				<NuxtLink
					:to="contactHref('dealer')"
					class="inline-block bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-md transition-colors shadow-lg shadow-red-950/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
				>
					Visit a Dealer
				</NuxtLink>
				<NuxtLink
					:to="contactHref('sales')"
					class="inline-block border border-white/40 hover:border-white text-white font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-md transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
				>
					Contact Sales
				</NuxtLink>
			</div>
		</section>
	</div>
</template>

<style scoped>
/* ════════════════════════════════════════════════════════════════════
   EXTRACTED DESIGN TOKENS
   Source: mitsubishi-motors.com.jm/vehicle/2025-outlander-sport/
   · typography + spacing + shadows: extract_local_direct.py JSON output
     (computed body/h1/h2 + --wp--preset--font-size / --spacing / --shadow)
   · container / padding / gap / colors: live theme stylesheet
     (wp-content/themes/mitsubishi-2/components/assets/index.css)
   · primary red: project brand token #C3002F (AGENTS.md); the reference
     site's own accent (#ED0000) is superseded per project branding rules.
   · font stacks: display headings on the brand display face Montserrat
     (700/800 via @nuxt/fonts, Poppins fallback); body Inter; the reference
     site's proprietary 'mmc' face and the extractor's 'Times New Roman'
     fallback (a sampling artifact) are intentionally not adopted.
   ════════════════════════════════════════════════════════════════════ */
.vehicle-page {
	/* — Typography (extracted: computed 16px/400 body, 32px/700 h1, 24px/700 h2; WP presets) — */
	--vp-fs-small: 13px; /* --wp--preset--font-size--small · theme label size */
	--vp-fs-base: 16px; /* --wp--preset--font-size--normal · computed body */
	--vp-fs-medium: 20px; /* --wp--preset--font-size--medium · theme spec values */
	--vp-fs-large: 36px; /* --wp--preset--font-size--large · theme h2 @xl */
	--vp-fs-xlarge: 42px; /* --wp--preset--font-size--x-large / --huge (hero cap) */
	--vp-fw-regular: 400; /* computed body weight */
	--vp-fw-bold: 700; /* computed heading weight */
	--vp-lh: 1.5; /* theme body line-height (1rem → 1.5rem) */
	--vp-label-track: 0.125em; /* theme .vehicle-select__label letter-spacing */

	/* — Colour (extracted from live theme CSS) — */
	--vp-red: #c3002f; /* project brand red (AGENTS.md) */
	--vp-red-bright: color-mix(in srgb, #c3002f 70%, white); /* brand red on dark bgs (contrast) */
	--vp-black: #000000;
	--vp-white: #ffffff;
	--vp-ink: #1a1a1a; /* body ink (computed page text: #000, softened) */
	--vp-grey: #686d71; /* theme .text-dark-grey / .fill-dark-grey */
	--vp-grey-light: #bfc2c4; /* theme .border-cold-grey */
	--vp-mist: #f5f5f5; /* theme background-slant gradient stop */
	--vp-mist-deep: #e3e5e6; /* theme background-slant gradient stop */
	--vp-card-hover: #f6f6f6; /* theme .car-list-item__bg hover */

	/* — Spacing (extracted: --wp--preset--spacing-20…80) — */
	--vp-sp-1: 0.44rem;
	--vp-sp-2: 0.67rem;
	--vp-sp-3: 1rem;
	--vp-sp-4: 1.5rem;
	--vp-sp-5: 2.25rem;
	--vp-sp-6: 3.38rem;
	--vp-sp-7: 5.06rem;

	/* — Layout (expanded section vertical padding: py-16 / py-20 luxury feel) — */
	--vp-container: 1536px; /* theme .container @2xl (640/768/1024/1280/1536) */
	--vp-section-py: 5.5rem; /* ~88px padding-block (py-20/22 feel) */
	--vp-gutter: 2rem; /* theme #top-nav horizontal padding */
	--vp-gap-xs: 0.25rem; /* theme gap-1 */
	--vp-gap-md: 1rem; /* theme .vehicle-colour-selector__colours gap */
	--vp-gap-lg: 1.75rem; /* theme gap-7 */
	--vp-gap-xl: 2rem; /* theme gap-8 */
	--vp-radius: 0.5rem; /* modern card radius */
	--vp-radius-sm: 0.25rem; /* theme .car-list-item__top-badge radius */

	/* — Shadows (extracted: WP shadow presets + theme card shadow) — */
	--vp-shadow-natural: 0 4px 20px rgba(0, 0, 0, 0.08);
	--vp-shadow-deep: 12px 12px 50px rgba(0, 0, 0, 0.4);
	--vp-shadow-card: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);

	/* — Aspect ratios (extracted: --wp--preset--aspect-ratio-*) — */
	--vp-ar-16-9: 16 / 9;
	--vp-ar-3-2: 3 / 2;
	--vp-ar-4-3: 4 / 3;

	--vp-font-heading: 'Montserrat', 'Poppins', sans-serif; /* brand display face (font-display) */
	--vp-font-body: 'Inter', sans-serif;
}

/* — Page base — */
.vehicle-page {
	background: var(--vp-white);
	color: var(--vp-ink);
	font-family: var(--vp-font-body);
	font-size: var(--vp-fs-base);
	font-weight: var(--vp-fw-regular);
	line-height: var(--vp-lh);
}

/* — Container: extracted theme .container scale (width 100% → 1536px) — */
.vp-container {
	width: 100%;
	margin-inline: auto;
	padding-inline: var(--vp-gutter);
}
@media (min-width: 640px) {
	.vp-container {
		max-width: 640px;
	}
}
@media (min-width: 768px) {
	.vp-container {
		max-width: 768px;
	}
}
@media (min-width: 1024px) {
	.vp-container {
		max-width: 1024px;
	}
}
@media (min-width: 1280px) {
	.vp-container {
		max-width: 1280px;
	}
}
@media (min-width: 1536px) {
	.vp-container {
		max-width: var(--vp-container);
	}
}

/* — Shared type utilities — */
.vp-tagline {
	margin: 0 0 var(--vp-sp-2);
	font-size: var(--vp-fs-small);
	font-weight: 700;
	letter-spacing: var(--vp-label-track);
	text-transform: uppercase;
	color: var(--vp-red);
}
.vp-tagline--on-dark {
	color: var(--vp-red-bright);
}
.vp-h2 {
	margin: 0 0 var(--vp-sp-3);
	font-family: var(--vp-font-heading);
	font-size: clamp(1.5rem, 1.25rem + 1.125vw, 2.25rem); /* 24px → 36px (extracted h2 scale) */
	font-weight: var(--vp-fw-bold);
	letter-spacing: 0.05em;
	text-transform: uppercase;
	line-height: 1.2;
	color: var(--vp-ink);
}
.vp-h2--on-dark {
	color: var(--vp-white);
}
.vp-body {
	margin: 0;
	max-width: 42rem;
	font-size: var(--vp-fs-base);
	line-height: var(--vp-lh);
	color: var(--vp-grey);
}
.vp-body--on-dark {
	color: rgba(255, 255, 255, 0.76);
}

/* — Section padding: luxury open feel (py-16 / py-20) — */
.vp-section {
	padding-block: var(--vp-section-py);
}
@media (max-width: 640px) {
	.vp-section {
		padding-block: 3.75rem;
	}
}
.vp-section--white {
	background: var(--vp-white);
}
.vp-section--mist {
	background: var(--vp-mist);
}
.vp-section--dark {
	background: var(--vp-black);
}
.vp-section-head {
	margin-bottom: var(--vp-sp-6);
}
.vp-section-head--center {
	text-align: center;
}

/* — Buttons (shadcn Button, restyled with extracted tokens) — */
.vp-btn {
	height: auto;
	padding: 0.875rem 1.75rem;
	font-family: var(--vp-font-heading);
	font-size: var(--vp-fs-small);
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	border-radius: var(--vp-radius-sm);
	transition:
		background-color 0.25s ease,
		border-color 0.25s ease,
		color 0.25s ease;
}
.vp-btn--outline {
	background: var(--vp-white);
	border: 1px solid var(--vp-grey-light);
	color: var(--vp-ink);
	width: 100%;
}
.vp-btn--outline:hover {
	border-color: var(--vp-red);
	color: var(--vp-red);
	background: var(--vp-white);
}

/* ════════════════ PART 5 · TRIMS ════════════════ */
.vp-trims {
	display: grid;
	gap: var(--vp-gap-xl);
	align-items: stretch;
}
@media (min-width: 768px) {
	.vp-trims {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
@media (min-width: 1024px) {
	.vp-trims {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}
.vp-trim {
	display: flex;
	flex-direction: column;
	justify-content: space-between; /* full-height cards; CTA pinned to bottom (margin-top:auto enforces it) */
	position: relative;
	background: var(--vp-white);
	border: 1px solid var(--vp-grey-light);
	border-radius: var(--vp-radius);
	padding: var(--vp-sp-5);
	cursor: pointer;
	transition:
		border-color 0.25s ease,
		box-shadow 0.25s ease,
		transform 0.25s ease;
}
.vp-trim:hover {
	border-color: var(--vp-grey);
	box-shadow: var(--vp-shadow-card);
	transform: translateY(-2px);
}
.vp-trim--selected {
	border-color: var(--vp-red);
	box-shadow:
		inset 0 0 0 1px var(--vp-red),
		var(--vp-shadow-card);
}
.vp-trim__badge {
	display: inline-block;
	align-self: flex-start;
	margin-bottom: var(--vp-sp-2);
	padding: 0.375rem 1rem;
	border-radius: var(--vp-radius-sm);
	background: var(--vp-red);
	font-size: 12px;
	font-weight: 500;
	letter-spacing: var(--vp-label-track);
	text-transform: uppercase;
	color: var(--vp-white);
}
.vp-trim__name {
	margin: 0;
	font-family: var(--vp-font-heading);
	font-size: 1.5rem;
	font-weight: var(--vp-fw-bold);
	letter-spacing: 0.05em;
	text-transform: uppercase;
	color: var(--vp-ink);
}
.vp-trim__price {
	display: flex;
	align-items: baseline;
	gap: var(--vp-gap-xs);
	margin: var(--vp-sp-1) 0 0;
}
.vp-trim__from {
	font-size: 12px;
	font-weight: 500;
	letter-spacing: var(--vp-label-track);
	text-transform: uppercase;
	color: var(--vp-grey);
}
.vp-trim__amount {
	font-size: var(--vp-fs-medium);
	font-weight: 700;
	color: var(--vp-red);
}
.vp-trim__specs {
	margin: var(--vp-sp-4) 0 0;
	border-top: 1px solid color-mix(in srgb, var(--vp-grey-light) 50%, white);
}
.vp-trim__spec {
	padding-block: var(--vp-sp-2);
	border-bottom: 1px solid color-mix(in srgb, var(--vp-grey-light) 50%, white);
}
.vp-trim__spec dt {
	margin-bottom: 4px;
	font-size: 12px;
	font-weight: 500;
	letter-spacing: var(--vp-label-track);
	text-transform: uppercase;
	color: var(--vp-grey);
}
.vp-trim__spec dd {
	margin: 0;
	font-size: 15px;
	line-height: 1.4;
	color: var(--vp-ink);
}
.vp-trim__features {
	display: flex;
	flex-direction: column;
	gap: var(--vp-sp-1);
	margin: var(--vp-sp-4) 0 0;
	padding: 0;
	list-style: none;
}
.vp-trim__features li {
	display: flex;
	font-size: 15px;
	line-height: 1.4;
	color: var(--vp-ink);
}
.vp-trim__cta {
	margin-top: auto;
	padding-top: var(--vp-sp-4);
}
.vp-trim__cta--selected {
	background: var(--vp-red);
	border-color: var(--vp-red);
	color: var(--vp-white);
}
.vp-trim__cta--selected:hover {
	background: color-mix(in srgb, var(--vp-red) 85%, black);
	border-color: color-mix(in srgb, var(--vp-red) 85%, black);
	color: var(--vp-white);
}

/* ════════════════ PART 6 · KEY SPECS ════════════════ */
.vp-specs {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--vp-gap-xl) var(--vp-gap-xl);
	margin: 0;
}
@media (min-width: 1024px) {
	.vp-specs {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}

/* ════════════════ PART 7 · BROCHURE ════════════════ */
.vp-brochure {
	display: grid;
	gap: var(--vp-sp-6);
	align-items: start;
}
@media (min-width: 1024px) {
	.vp-brochure {
		grid-template-columns: 1.2fr 1fr;
		gap: var(--vp-sp-7);
	}
}
</style>
