<script setup lang="ts">
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

/* ------------------------------------------------------------------ */
/* derived state                                                       */
/* ------------------------------------------------------------------ */

const heroBlock = computed(() => vehicle.hero_block ?? null);
const heroMedia = computed(() => {
	const media = heroBlock.value?.media;
	if (!media) return '';
	return typeof media === 'string' ? media : media.id ?? '';
});

const colors = computed<VehicleColor[]>(() => [...(vehicle.colors ?? [])].sort((a, b) => a.sort - b.sort));
const highlights = computed<VehicleHighlight[]>(() => [...(vehicle.highlights ?? [])].sort((a, b) => a.sort - b.sort));
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

const selectedTrimIdx = ref(0);
const selectedTrim = computed<VehicleTrim | null>(() => trims.value[selectedTrimIdx.value] ?? null);

function formatPrice(price: number | null | undefined): string {
	if (price == null) return '';
	return `TTD ${new Intl.NumberFormat('en-US').format(price)}`;
}

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
		<section id="hero" class="vp-hero" aria-label="Vehicle hero">
			<div v-if="heroMedia" class="vp-hero__media" aria-hidden="true">
				<DirectusImage :uuid="heroMedia" :alt="heroBlock?.headline || vehicle.title" loading="eager" />
			</div>
			<div class="vp-hero__scrim" aria-hidden="true" />
			<div class="vp-container vp-hero__content">
				<p class="vp-kicker tracking-wider uppercase">
					<span v-if="vehicle.model_year">{{ vehicle.model_year }}</span>
					<span v-if="vehicle.model_year && vehicle.category" class="vp-kicker__dot" aria-hidden="true">·</span>
					<span v-if="vehicle.category">{{ vehicle.category }}</span>
				</p>
				<h1 class="vp-hero__headline tracking-wider uppercase">
					<span v-if="heroBlock?.highlight_keyword" class="vp-hero__keyword">{{
						heroBlock.highlight_keyword
					}}</span><template v-if="heroBlock?.headline">
						<br />{{ heroBlock.headline }}</template>
				</h1>
				<p v-if="heroBlock?.body" class="vp-hero__body">{{ heroBlock.body }}</p>
				<div class="vp-hero__actions">
					<Button as="a" href="#trims" class="vp-btn vp-btn--primary tracking-wider uppercase">View Trims &amp; Pricing</Button>
					<Button
						v-if="vehicle.brochure_url"
						as="a"
						:href="vehicle.brochure_url"
						target="_blank"
						rel="noopener"
						class="vp-btn vp-btn--ghost tracking-wider uppercase"
					>
						Download Brochure
					</Button>
				</div>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════
		     PART 2 · OVERVIEW — tagline, headline, copy + facts strip
	     ════════════════════════════════════════════════════════════ -->
		<section id="overview" class="vp-section vp-section--white" aria-label="Vehicle overview">
			<div class="vp-container">
				<div class="vp-overview">
					<div class="vp-overview__intro">
						<p v-if="vehicle.tagline" class="vp-tagline tracking-wider uppercase">{{ vehicle.tagline }}</p>
						<h2 v-if="vehicle.hero_headline" class="vp-h2 tracking-wider uppercase">{{ vehicle.hero_headline }}</h2>
					</div>
					<p v-if="vehicle.overview" class="vp-overview__copy">{{ vehicle.overview }}</p>
				</div>

				<dl class="vp-facts">
					<div v-if="vehicle.model_year" class="vp-fact">
						<dt class="tracking-wider uppercase">Model Year</dt>
						<dd>{{ vehicle.model_year }}</dd>
					</div>
					<div v-if="vehicle.category" class="vp-fact">
						<dt class="tracking-wider uppercase">Category</dt>
						<dd>{{ vehicle.category }}</dd>
					</div>
					<div v-if="vehicle.body_type" class="vp-fact">
						<dt class="tracking-wider uppercase">Body Type</dt>
						<dd>{{ vehicle.body_type }}</dd>
					</div>
					<div v-if="vehicle.fuel_type" class="vp-fact">
						<dt class="tracking-wider uppercase">Fuel Type</dt>
						<dd>{{ vehicle.fuel_type }}</dd>
					</div>
					<div v-if="vehicle.seating_capacity" class="vp-fact">
						<dt class="tracking-wider uppercase">Seating</dt>
						<dd>{{ vehicle.seating_capacity }} Seats</dd>
					</div>
					<div v-if="vehicle.starting_price" class="vp-fact">
						<dt class="tracking-wider uppercase">Starting At</dt>
						<dd>{{ formatPrice(vehicle.starting_price) }}</dd>
					</div>
				</dl>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════
		     PART 3 · HIGHLIGHTS — 3-column visual highlights grid
	     ════════════════════════════════════════════════════════════ -->
		<section id="highlights" class="vp-section vp-section--mist" aria-label="Vehicle highlights">
			<div class="vp-container">
				<header class="vp-section-head">
					<p class="vp-tagline tracking-wider uppercase">Key Highlights</p>
					<h2 class="vp-h2 tracking-wider uppercase">Engineered to Excel</h2>
				</header>
				<div class="vp-highlights-grid">
					<article
						v-for="(highlight, index) in highlights"
						:key="highlight.id"
						class="vp-highlight-card group"
					>
						<div class="vp-highlight-card__bg-wrap">
							<DirectusImage
								v-if="highlightImageUuid(highlight)"
								:uuid="highlightImageUuid(highlight)"
								:alt="highlight.headline || highlight.tagline || vehicle.title"
								class="vp-highlight-card__img"
							/>
							<div v-else class="vp-highlight-card__fallback-bg" />
						</div>
						<div class="vp-highlight-card__overlay" aria-hidden="true" />
						<div class="vp-highlight-card__top-badge" aria-hidden="true">
							<span class="vp-highlight-card__index tracking-wider uppercase">{{ String(index + 1).padStart(2, '0') }}</span>
						</div>
						<div class="vp-highlight-card__content">
							<p v-if="highlight.tagline" class="vp-tagline vp-tagline--on-dark tracking-wider uppercase">
								{{ highlight.tagline }}
							</p>
							<h3 v-if="highlight.headline" class="vp-highlight-card__headline tracking-wider uppercase">
								{{ highlight.headline }}
							</h3>
							<p v-if="highlight.description" class="vp-body vp-body--on-dark vp-highlight-card__desc">
								{{ highlight.description }}
							</p>
						</div>
					</article>
				</div>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════
		     PART 4 · COLORS — interactive exterior colour selector
	     ════════════════════════════════════════════════════════════ -->
		<section id="colors" class="vp-section vp-section--white" aria-label="Exterior colours">
			<div class="vp-container">
				<header class="vp-section-head vp-section-head--center">
					<p class="vp-tagline tracking-wider uppercase">Exterior Palette</p>
					<h2 class="vp-h2 tracking-wider uppercase">Colours</h2>
				</header>

				<div class="vp-color-showcase">
					<!-- Angled background slash container stage -->
					<div class="vp-color-showcase__stage">
						<div class="vp-color-showcase__slash-backdrop" aria-hidden="true">
							<div class="vp-color-showcase__slash-shape" />
							<div class="vp-color-showcase__slash-accent" />
						</div>

						<!-- Centered active color variant car image -->
						<div class="vp-color-showcase__car-wrap">
							<DirectusImage
								v-if="activeColorImageUuid"
								:uuid="activeColorImageUuid"
								:alt="`${vehicle.title} in ${selectedColor?.color_name ?? ''}`"
								class="vp-color-showcase__car-img"
							/>
							<div class="vp-color-showcase__car-shadow" aria-hidden="true" />
						</div>
					</div>

					<!-- Color details and swatches centered below car -->
					<div class="vp-color-showcase__controls">
						<div class="vp-color-showcase__info">
							<p v-if="selectedColor" class="vp-swatch-name tracking-wider uppercase">
								{{ selectedColor.color_name }}
							</p>
							<p v-if="selectedColor" class="vp-swatch-hex tracking-widest uppercase">
								{{ selectedColor.hex_code }}
							</p>
						</div>

						<div
							v-if="colors.length"
							class="vp-swatch-row"
							role="radiogroup"
							aria-label="Exterior colours"
						>
							<button
								v-for="(color, index) in colors"
								:key="color.id"
								type="button"
								role="radio"
								:aria-checked="index === selectedColorIdx"
								:aria-label="color.color_name"
								class="vp-swatch"
								:class="{
									'vp-swatch--selected': index === selectedColorIdx,
									'vp-swatch--light': /^#(fff|FFF|f{6}|F{6})$/.test(color.hex_code),
								}"
								:style="{ background: color.hex_code }"
								@click="selectedColorIdx = index"
							>
								<span class="sr-only">{{ color.color_name }}</span>
							</button>
						</div>
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
								<span class="vp-trim__tick" aria-hidden="true"></span>
								{{ feature.value }}
							</li>
						</ul>

						<button
							type="button"
							class="vp-btn vp-btn--outline vp-trim__cta tracking-wider uppercase"
							:class="{ 'vp-trim__cta--selected': index === selectedTrimIdx }"
							@click.stop="selectedTrimIdx = index"
						>
							{{ index === selectedTrimIdx ? `${trim.trim_name} Selected` : `Select ${trim.trim_name}` }}
						</button>
					</article>
				</div>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════
		     PART 6 · KEY SPECS — dark industrial spec grid
	     ════════════════════════════════════════════════════════════ -->
		<section id="specs" class="vp-section vp-section--dark" aria-label="Key specifications">
			<div class="vp-container">
				<header class="vp-section-head">
					<p class="vp-tagline vp-tagline--on-dark tracking-wider uppercase">Under the Hood</p>
					<h2 class="vp-h2 vp-h2--on-dark tracking-wider uppercase">Key Specifications</h2>
				</header>
				<dl class="vp-specs">
					<div v-if="selectedTrim?.engine" class="vp-spec">
						<dt class="tracking-wider uppercase">Engine</dt>
						<dd>{{ selectedTrim.engine }}</dd>
					</div>
					<div v-if="selectedTrim?.transmission" class="vp-spec">
						<dt class="tracking-wider uppercase">Transmission</dt>
						<dd>{{ selectedTrim.transmission }}</dd>
					</div>
					<div v-if="selectedTrim?.drivetrain" class="vp-spec">
						<dt class="tracking-wider uppercase">Drivetrain</dt>
						<dd>{{ selectedTrim.drivetrain }}</dd>
					</div>
					<div v-if="vehicle.seating_capacity" class="vp-spec">
						<dt class="tracking-wider uppercase">Seating Capacity</dt>
						<dd>{{ vehicle.seating_capacity }} Passengers</dd>
					</div>
					<div v-if="vehicle.fuel_type" class="vp-spec">
						<dt class="tracking-wider uppercase">Fuel Type</dt>
						<dd>{{ vehicle.fuel_type }}</dd>
					</div>
					<div v-if="vehicle.warranty" class="vp-spec">
						<dt class="tracking-wider uppercase">Warranty</dt>
						<dd>{{ vehicle.warranty }}</dd>
					</div>
				</dl>
				<p v-if="selectedTrim" class="vp-specs-note">
					Showing <strong>{{ selectedTrim.trim_name }}</strong> trim — select a trim above to compare.
				</p>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════
		     PART 7 · BROCHURE — download CTA + at-a-glance card
	     ════════════════════════════════════════════════════════════ -->
		<section id="brochure" class="vp-section vp-section--white" aria-label="Brochure">
			<div class="vp-container vp-brochure">
				<div class="vp-brochure__copy">
					<p class="vp-tagline tracking-wider uppercase">Learn More</p>
					<h2 class="vp-h2 tracking-wider uppercase">Brochure</h2>
					<p class="vp-body">
						Explore the full feature list, dimensions, and technical specifications for the
						{{ vehicle.model_year }} {{ vehicle.title }}.
					</p>
					<div v-if="vehicle.brochure_url" class="vp-brochure__actions">
						<Button
							as="a"
							:href="vehicle.brochure_url"
							target="_blank"
							rel="noopener"
							class="vp-btn vp-btn--primary tracking-wider uppercase"
						>
							Download Brochure
						</Button>
					</div>
				</div>
				<aside class="vp-glance" aria-label="Vehicle at a glance">
					<h3 class="vp-glance__title tracking-wider uppercase">At a Glance</h3>
					<dl class="vp-glance__list">
						<div v-if="vehicle.model_year" class="vp-glance__row">
							<dt class="tracking-wider uppercase">Model Year</dt>
							<dd>{{ vehicle.model_year }}</dd>
						</div>
						<div v-if="vehicle.category" class="vp-glance__row">
							<dt class="tracking-wider uppercase">Category</dt>
							<dd>{{ vehicle.category }}</dd>
						</div>
						<div v-if="vehicle.starting_price" class="vp-glance__row">
							<dt class="tracking-wider uppercase">Starting Price</dt>
							<dd>{{ formatPrice(vehicle.starting_price) }}</dd>
						</div>
						<div v-if="vehicle.warranty" class="vp-glance__row">
							<dt class="tracking-wider uppercase">Warranty</dt>
							<dd>{{ vehicle.warranty }}</dd>
						</div>
					</dl>
				</aside>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════
		     PART 8 · CTA — dealer / contact call to action
	     ════════════════════════════════════════════════════════════ -->
		<section id="cta" class="vp-section vp-section--dark vp-cta" aria-label="Next steps">
			<div class="vp-container">
				<p class="vp-tagline vp-tagline--on-dark tracking-wider uppercase">Next Step</p>
				<h2 class="vp-h2 vp-h2--on-dark vp-cta__headline tracking-wider uppercase">
					Ready to <span class="vp-cta__keyword">{{ heroBlock?.highlight_keyword ?? 'Drive' }}</span>?
				</h2>
				<p class="vp-body vp-body--on-dark vp-cta__copy">
					Visit a dealer to take a test drive, or talk to our sales team about the
					{{ vehicle.model_year }} {{ vehicle.title }}.
				</p>
				<div class="vp-cta__actions">
					<Button as="NuxtLink" href="/dealers" class="vp-btn vp-btn--primary tracking-wider uppercase">Visit a Dealer</Button>
					<Button as="NuxtLink" href="/contact" class="vp-btn vp-btn--ghost tracking-wider uppercase">Contact Sales</Button>
				</div>
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
.vp-btn--primary {
	background: var(--vp-red);
	border-color: var(--vp-red);
	color: var(--vp-white);
}
.vp-btn--primary:hover {
	background: color-mix(in srgb, var(--vp-red) 85%, black);
	border-color: color-mix(in srgb, var(--vp-red) 85%, black);
	color: var(--vp-white);
}
.vp-btn--ghost {
	background: transparent;
	border: 1px solid rgba(255, 255, 255, 0.4);
	color: var(--vp-white);
}
.vp-btn--ghost:hover {
	background: rgba(255, 255, 255, 0.1);
	border-color: rgba(255, 255, 255, 0.7);
	color: var(--vp-white);
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

/* ════════════════ PART 1 · HERO ════════════════ */
.vp-hero {
	position: relative;
	display: flex;
	align-items: flex-end;
	min-height: min(92svh, 860px);
	background: var(--vp-black);
	overflow: hidden;
}
.vp-hero__media {
	position: absolute;
	inset: 0;
}
.vp-hero__media :deep(img) {
	width: 100%;
	height: 100%;
	object-fit: cover;
	object-position: center;
	opacity: 0.92;
}
.vp-hero__scrim {
	position: absolute;
	inset: 0;
	background: linear-gradient(180deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.25) 45%, rgba(0, 0, 0, 0.85) 100%);
}
.vp-hero__content {
	position: relative;
	z-index: 1;
	max-width: 48rem;
	padding-top: var(--vp-section-py);
	padding-bottom: var(--vp-section-py);
}
.vp-kicker {
	display: flex;
	align-items: center;
	gap: var(--vp-gap-xs);
	margin: 0 0 var(--vp-sp-3);
	font-size: var(--vp-fs-small);
	font-weight: 700;
	letter-spacing: var(--vp-label-track);
	text-transform: uppercase;
	color: var(--vp-grey-light);
}
.vp-kicker__dot {
	color: var(--vp-red-bright);
}
.vp-hero__headline {
	margin: 0 0 var(--vp-sp-4);
	font-family: var(--vp-font-heading);
	font-size: clamp(2rem, 1.375rem + 3vw, 2.625rem); /* 32px → 42px (extracted h1/huge) */
	font-weight: var(--vp-fw-bold);
	letter-spacing: 0.04em;
	text-transform: uppercase;
	line-height: 1.15;
	color: var(--vp-white);
}
.vp-hero__keyword {
	color: var(--vp-red-bright);
}
.vp-hero__body {
	margin: 0 0 var(--vp-sp-5);
	max-width: 36rem;
	font-size: var(--vp-fs-base);
	line-height: var(--vp-lh);
	color: rgba(255, 255, 255, 0.85);
}
.vp-hero__actions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--vp-gap-md);
}

/* ════════════════ PART 2 · OVERVIEW ════════════════ */
.vp-overview {
	display: grid;
	gap: var(--vp-sp-5);
}
@media (min-width: 768px) {
	.vp-overview {
		grid-template-columns: 1fr 1.5fr;
		align-items: end;
	}
}
.vp-overview__intro {
	display: flex;
	flex-direction: column;
}
.vp-overview__intro .vp-h2 {
	margin-bottom: 0;
}
.vp-overview__copy {
	margin: 0;
	font-size: var(--vp-fs-base);
	line-height: var(--vp-lh);
	color: var(--vp-grey);
}
.vp-facts {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0 var(--vp-gap-xl);
	margin: var(--vp-sp-6) 0 0;
	border-top: 1px solid var(--vp-grey-light);
}
@media (min-width: 1024px) {
	.vp-facts {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}
@media (min-width: 1280px) {
	.vp-facts {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}
}
.vp-fact {
	padding-block: var(--vp-sp-3);
	border-bottom: 1px solid var(--vp-grey-light);
}
.vp-fact dt {
	margin-bottom: var(--vp-sp-1);
	font-size: 12px;
	font-weight: 500;
	letter-spacing: var(--vp-label-track);
	text-transform: uppercase;
	color: var(--vp-grey);
}
.vp-fact dd {
	margin: 0;
	font-size: var(--vp-fs-base);
	font-weight: 700;
	color: var(--vp-ink);
}

/* ════════════════ PART 3 · HIGHLIGHTS (3-Column Visual Grid) ════════════════ */
.vp-highlights-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: var(--vp-gap-xl);
}
@media (min-width: 768px) {
	.vp-highlights-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}

.vp-highlight-card {
	position: relative;
	min-height: 480px;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	overflow: hidden;
	border-radius: var(--vp-radius);
	background: #0d0f12;
	box-shadow: var(--vp-shadow-natural);
	transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease;
}
.vp-highlight-card:hover {
	transform: translateY(-4px);
	box-shadow: var(--vp-shadow-card), 0 20px 30px -10px rgba(0, 0, 0, 0.35);
}

.vp-highlight-card__bg-wrap {
	position: absolute;
	inset: 0;
	z-index: 0;
	overflow: hidden;
}

.vp-highlight-card__img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	object-position: center;
	transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.vp-highlight-card:hover .vp-highlight-card__img {
	transform: scale(1.06);
}

.vp-highlight-card__fallback-bg {
	width: 100%;
	height: 100%;
	background: radial-gradient(circle at 50% 30%, #1e242c 0%, #0b0d10 100%);
}

.vp-highlight-card__overlay {
	position: absolute;
	inset: 0;
	z-index: 1;
	background: linear-gradient(
		to top,
		rgba(0, 0, 0, 0.92) 0%,
		rgba(0, 0, 0, 0.55) 45%,
		rgba(0, 0, 0, 0.15) 75%,
		transparent 100%
	);
	pointer-events: none;
}

.vp-highlight-card__top-badge {
	position: absolute;
	top: 1.25rem;
	right: 1.25rem;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.25rem;
	height: 2.25rem;
	border-radius: var(--vp-radius-sm);
	background: rgba(0, 0, 0, 0.55);
	backdrop-filter: blur(8px);
	border: 1px solid rgba(255, 255, 255, 0.15);
}

.vp-highlight-card__index {
	font-family: var(--vp-font-heading);
	font-size: 12px;
	font-weight: 700;
	letter-spacing: var(--vp-label-track);
	color: rgba(255, 255, 255, 0.85);
}

.vp-highlight-card__content {
	position: relative;
	z-index: 2;
	padding: 2.25rem 1.75rem 2rem;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
}

.vp-highlight-card__content .vp-tagline {
	margin-bottom: 0.5rem;
}

.vp-highlight-card__headline {
	margin: 0 0 0.75rem;
	font-family: var(--vp-font-heading);
	font-size: 1.25rem;
	font-weight: var(--vp-fw-bold);
	line-height: 1.25;
	letter-spacing: 0.05em;
	text-transform: uppercase;
	color: var(--vp-white);
}

.vp-highlight-card__desc {
	font-size: 0.875rem;
	line-height: 1.55;
	color: rgba(255, 255, 255, 0.82);
	margin: 0;
}

/* ════════════════ PART 4 · COLORS (Angled Slash Stage) ════════════════ */
.vp-color-showcase {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
}

.vp-color-showcase__stage {
	position: relative;
	width: 100%;
	min-height: 380px;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 3rem 1.5rem 2.5rem;
	overflow: hidden;
	border-radius: var(--vp-radius);
}
@media (min-width: 768px) {
	.vp-color-showcase__stage {
		min-height: 480px;
		padding: 4.5rem 3rem 3.5rem;
	}
}

.vp-color-showcase__slash-backdrop {
	position: absolute;
	inset: 0;
	z-index: 0;
	pointer-events: none;
	overflow: hidden;
}

.vp-color-showcase__slash-shape {
	position: absolute;
	inset: 0;
	background: linear-gradient(125deg, #f8f9fa 0%, #edf0f4 45%, #e2e6eb 100%);
	clip-path: polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%);
	border-radius: var(--vp-radius);
	box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.03);
}
@media (max-width: 640px) {
	.vp-color-showcase__slash-shape {
		clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
	}
}

.vp-color-showcase__slash-accent {
	position: absolute;
	top: 0;
	bottom: 0;
	right: 6%;
	width: 6px;
	background: var(--vp-red);
	transform: skewX(-14deg);
	opacity: 0.85;
}
@media (max-width: 640px) {
	.vp-color-showcase__slash-accent {
		display: none;
	}
}

.vp-color-showcase__car-wrap {
	position: relative;
	z-index: 1;
	width: 100%;
	max-width: 820px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.vp-color-showcase__car-img {
	width: 100%;
	max-height: 380px;
	object-fit: contain;
	filter: drop-shadow(0 18px 30px rgba(0, 0, 0, 0.2));
	transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}

.vp-color-showcase__car-shadow {
	width: 85%;
	height: 28px;
	margin-top: -12px;
	background: radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.32) 0%, rgba(0, 0, 0, 0.12) 45%, transparent 70%);
	border-radius: 50%;
	filter: blur(4px);
}

.vp-color-showcase__controls {
	position: relative;
	z-index: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	margin-top: 2rem;
}

.vp-color-showcase__info {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 1.25rem;
}

.vp-swatch-name {
	margin: 0;
	font-family: var(--vp-font-heading);
	font-size: 1rem;
	font-weight: 700;
	letter-spacing: var(--vp-label-track);
	text-transform: uppercase;
	color: var(--vp-ink);
}

.vp-swatch-hex {
	margin: 0.25rem 0 0;
	font-size: 12px;
	font-weight: 500;
	letter-spacing: 0.1em;
	color: var(--vp-grey);
}

.vp-swatch-row {
	display: flex;
	align-items: center;
	gap: 1.25rem;
}

.vp-swatch {
	width: 34px;
	height: 34px;
	padding: 0;
	border: 2px solid var(--vp-white);
	border-radius: 100%;
	cursor: pointer;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(0, 0, 0, 0.2);
	outline: 2px solid transparent;
	outline-offset: 2px;
	transition:
		transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
		outline-color 0.25s ease,
		box-shadow 0.25s ease;
}

.vp-swatch--light {
	border-color: var(--vp-grey-light);
}

.vp-swatch:hover {
	transform: scale(1.18);
	box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
}

.vp-swatch--selected {
	transform: scale(1.25);
	outline-color: var(--vp-red);
	box-shadow: 0 6px 14px rgba(195, 0, 47, 0.35);
}

.vp-swatch:focus-visible {
	outline-color: var(--vp-red);
	outline-offset: 3px;
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
	gap: var(--vp-sp-2);
	font-size: 15px;
	line-height: 1.4;
	color: var(--vp-ink);
}
.vp-trim__tick {
	flex: none;
	width: 0.5rem;
	height: 0.5rem;
	margin-top: 0.5rem;
	background: var(--vp-red);
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
.vp-spec {
	padding-top: var(--vp-sp-3);
	border-top: 1px solid rgba(191, 194, 196, 0.3);
}
.vp-spec dt {
	font-size: 12px;
	font-weight: 500;
	letter-spacing: var(--vp-label-track);
	text-transform: uppercase;
	color: var(--vp-grey-light);
}
.vp-spec dd {
	margin: var(--vp-sp-2) 0 0;
	font-size: var(--vp-fs-medium);
	font-weight: 700;
	line-height: 1.3;
	color: var(--vp-white);
}
.vp-specs-note {
	margin: var(--vp-sp-4) 0 0;
	font-size: var(--vp-fs-small);
	color: var(--vp-grey-light);
}
.vp-specs-note strong {
	color: var(--vp-white);
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
.vp-brochure__copy .vp-h2 {
	margin-bottom: var(--vp-sp-3);
}
.vp-brochure__copy .vp-body {
	max-width: 32rem;
}
.vp-brochure__actions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--vp-gap-md);
	margin-top: var(--vp-sp-4);
}
.vp-glance {
	background: var(--vp-white);
	border: 1px solid var(--vp-grey-light);
	border-radius: var(--vp-radius);
	box-shadow: var(--vp-shadow-natural);
	padding: var(--vp-sp-5);
}
.vp-glance__title {
	margin: 0 0 var(--vp-sp-3);
	font-size: var(--vp-fs-small);
	font-weight: 700;
	letter-spacing: var(--vp-label-track);
	text-transform: uppercase;
	color: var(--vp-ink);
}
.vp-glance__row {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: var(--vp-gap-md);
	padding-block: var(--vp-sp-2);
	border-bottom: 1px solid color-mix(in srgb, var(--vp-grey-light) 50%, white);
}
.vp-glance__row:last-child {
	border-bottom: none;
}
.vp-glance__row dt {
	font-size: 12px;
	font-weight: 500;
	letter-spacing: var(--vp-label-track);
	text-transform: uppercase;
	color: var(--vp-grey);
}
.vp-glance__row dd {
	margin: 0;
	font-size: var(--vp-fs-base);
	font-weight: 700;
	text-align: right;
	color: var(--vp-ink);
}

/* ════════════════ PART 8 · CTA ════════════════ */
.vp-cta {
	text-align: center;
}
.vp-cta .vp-container {
	display: flex;
	flex-direction: column;
	align-items: center;
}
.vp-cta .vp-tagline {
	margin-bottom: var(--vp-sp-2);
}
.vp-cta__headline {
	margin-bottom: var(--vp-sp-3);
}
.vp-cta__keyword {
	color: var(--vp-red-bright);
}
.vp-cta__copy {
	margin-inline: auto;
}
.vp-cta__actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--vp-gap-md);
	margin-top: var(--vp-sp-5);
}
</style>
