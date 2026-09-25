<script setup lang="ts">
interface TemplateCarouselProps {
	tagline?: string;
	variant?: string; // e.g. "carousel_long", "carousel_short"
	items: any[];
}

const props = defineProps<TemplateCarouselProps>();

// Parse variant: "carousel_long" → { template: "carousel", style: "long" }
const variantStyle = computed(() => {
	if (!props.variant) return 'long'; // default to long
	const parts = props.variant.split('_');
	return parts[parts.length - 1] || 'long';
});

const isShort = computed(() => variantStyle.value === 'short');
const isLong = computed(() => variantStyle.value === 'long');

// Swiper container reference
const containerRef = ref(null);

// Swiper configuration — adapts to variant
const swiper = useSwiper(containerRef, {
	loop: true,
	autoplay: {
		delay: isShort.value ? 2000 : 3000,
		disableOnInteraction: false,
	},
	slidesPerView: isShort.value ? 3 : 2,
	spaceBetween: isShort.value ? 15 : 20,
	breakpoints: {
		640: {
			slidesPerView: isShort.value ? 4 : 3,
			spaceBetween: isShort.value ? 20 : 30,
		},
		768: {
			slidesPerView: isShort.value ? 5 : 4,
			spaceBetween: isShort.value ? 25 : 40,
		},
		1024: {
			slidesPerView: isShort.value ? 6 : 4,
			spaceBetween: isShort.value ? 30 : 50,
		},
		1280: {
			slidesPerView: isShort.value ? 7 : 5,
			spaceBetween: isShort.value ? 35 : 60,
		},
	},
});

// Get all images from the first item's images array
const logoImages = computed(() => {
	if (!props.items || props.items.length === 0) return [];

	const firstItem = props.items[0];
	if (!firstItem.images || !Array.isArray(firstItem.images)) return [];

	return firstItem.images
		.map((img: any) => {
			// Handle the image reference structure
			if (typeof img.directus_files_id === 'string') {
				return {
					uuid: img.directus_files_id,
					alt: 'Brand logo',
				};
			}
			if (img.directus_files_id && typeof img.directus_files_id === 'object') {
				const file = img.directus_files_id;
				return {
					uuid: file.id,
					alt: file.title || file.filename_download || file.description || 'Brand logo',
					title: file.title,
					description: file.description,
				};
			}
			return null;
		})
		.filter(Boolean);
});
</script>

<template>
	<div class="content-block-template-carousel">
		<!-- Section Tagline (always visible) -->
		<div v-if="tagline" class="text-center mb-12">
			<Tagline>{{ tagline }}</Tagline>
		</div>

		<!-- Headline — visible in long variant, hidden in short -->
		<div
			v-if="isLong && items[0]?.headline"
			class="flex items-center justify-center mb-12"
		>
			<div class="flex-1 h-px bg-gray-300 max-w-24"></div>
			<h2 class="text-3xl font-bold text-center capitalize mx-8 text-gray-900">
				{{ items[0].headline }}
			</h2>
			<div class="flex-1 h-px bg-gray-300 max-w-24"></div>
		</div>

	<!-- Logo Carousel -->
	<div class="logo-carousel-container w-full max-w-5xl mx-auto px-6">
			<ClientOnly>
				<swiper-container ref="containerRef" :init="false">
			<swiper-slide v-for="(logo, index) in logoImages" :key="index">
					<div
						class="carousel-tile group cursor-pointer transition-all duration-300"
					>
						<template v-if="logo.uuid">
							<div class="carousel-logo-wrapper">
								<DirectusImage
									:uuid="logo.uuid"
									:alt="logo.alt"
									class="carousel-logo-img"
								/>
							</div>
						</template>
						<template v-else>
							<div class="carousel-placeholder">
								<span class="carousel-placeholder-text">
									{{ (logo.alt || 'Brand').charAt(0) }}
								</span>
							</div>
						</template>
					</div>
				</swiper-slide>
				</swiper-container>
				<template #fallback>
					<!-- Fallback for SSR — responsive grid adapts to variant -->
					<div
						class="grid gap-4"
						:class="isShort
							? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
							: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'"
					>
						<div
							v-for="(logo, index) in logoImages"
							:key="index"
							class="carousel-tile group cursor-pointer transition-all duration-300"
						>
							<template v-if="logo.uuid">
								<div class="carousel-logo-wrapper">
									<DirectusImage
										:uuid="logo.uuid"
										:alt="logo.alt"
										class="carousel-logo-img"
									/>
								</div>
							</template>
							<template v-else>
								<div class="carousel-placeholder">
									<span class="carousel-placeholder-text">
										{{ (logo.alt || 'Brand').charAt(0) }}
									</span>
								</div>
							</template>
						</div>
					</div>
				</template>
			</ClientOnly>
		</div>
	</div>
</template>

<style scoped>
.content-block-template-carousel {
	/* Template specific styles */
}

/* Swiper container styles */
swiper-container {
	display: block;
	width: 100%;
	height: auto;
}

swiper-slide {
	display: flex;
	justify-content: center;
	align-items: center;
	height: auto;
	width: auto;
}

/* === CAROUSEL TILE SYSTEM === */

/* Fixed-dimension container tiles — uniform grid for standardized assets */
/* Larger tiles with responsive sizing — bold inner logo scale */
.carousel-tile {
	@apply bg-white rounded-xl border border-slate-200 w-[130px] h-[85px] flex items-center justify-center;
}

/* Logo wrapper — zero-distortion containment */
.carousel-logo-wrapper {
	@apply w-full h-full p-1 flex items-center justify-center;
}

/* Logo images — confidently fill tile space with premium presence */
.carousel-logo-img {
	@apply w-full h-full object-contain max-h-12 md:max-h-14 transition-all duration-300;
}

/* Text-based placeholder for missing logos — Dark Industrial Slate theme */
.carousel-placeholder {
	@apply flex items-center justify-center;
}

.carousel-placeholder-text {
	@apply text-3xl font-black text-slate-900 leading-none;
}

/* Custom focus styles for logo containers */
.group:focus-visible {
	transform: translateY(-2px);
}
</style>
