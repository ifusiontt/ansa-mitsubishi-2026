<script setup lang="ts">
interface TemplateMediaCarouselProps {
	tagline?: string;
	variant?: string;
	items: any[];
}

const props = defineProps<TemplateMediaCarouselProps>();

// Swiper container reference
const containerRef = ref(null);

// Extract YouTube video ID from URL
const getYouTubeId = (url: string): string | null => {
	if (!url) return null;

	const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
	const match = url.match(regExp);
	const id = match?.[2];

	return id && id.length === 11 ? id : null;
};

// Process media items from content
const mediaItems = computed(() => {
	if (!props.items || props.items.length === 0) return [];

	const allMedia: any[] = [];

	props.items
		.filter((item) => item.status === 'published')
		.sort((a, b) => (a.sort || 0) - (b.sort || 0))
		.forEach((item) => {
			// Check for YouTube URL in description
			const youtubeUrl = item.description || '';
			const videoId = getYouTubeId(youtubeUrl);

			if (videoId) {
				// Add video slide
				allMedia.push({
					id: `${item.id}-video`,
					type: 'video',
					title: item.headline || 'Video',
					description: item.tagline || '',
					videoId,
					url: youtubeUrl,
				});
			}

			// Check for images
			if (item.images && Array.isArray(item.images)) {
				item.images.forEach((img: any, imgIndex: number) => {
					let imageData = null;

					if (typeof img.directus_files_id === 'string') {
						imageData = {
							uuid: img.directus_files_id,
							alt: item.headline || 'Media image',
						};
					} else if (img.directus_files_id && typeof img.directus_files_id === 'object') {
						const file = img.directus_files_id;
						imageData = {
							uuid: file.id,
							alt: file.title || file.filename_download || item.headline || 'Media image',
							title: file.title,
							description: file.description,
						};
					}

					if (imageData) {
						allMedia.push({
							id: `${item.id}-image-${imgIndex}`,
							type: 'image',
							title: item.headline || 'Image',
							description: item.tagline || '',
							...imageData,
						});
					}
				});
			}
		});

	return allMedia;
});

// Swiper configuration for full-width media
const swiper = useSwiper(containerRef, {
	loop: mediaItems.value.length > 1,
	autoplay: {
		delay: 6000, // Longer delay for video content
		disableOnInteraction: false,
		pauseOnMouseEnter: true,
	},
	slidesPerView: 1, // Always show one slide for full-width experience
	spaceBetween: 0, // No space between slides for seamless experience
	navigation: {
		nextEl: '.swiper-button-next',
		prevEl: '.swiper-button-prev',
	},
	pagination: {
		el: '.swiper-pagination',
		clickable: true,
		dynamicBullets: true,
	},
	effect: 'slide',
	speed: 800, // Smooth transition
	// Remove breakpoints to maintain consistent full-width behavior
});
</script>

<template>
	<div class="content-block-template-media-carousel">
		<!-- Section Tagline -->
		<div v-if="tagline" class="text-center mb-12">
			<Tagline>{{ tagline }}</Tagline>
		</div>

		<!-- Media Carousel -->
		<div v-if="mediaItems.length > 0" class="media-carousel-container relative">
			<ClientOnly>
				<swiper-container ref="containerRef" :init="false" class="!pb-16">
					<swiper-slide v-for="media in mediaItems" :key="media.id" class="!h-auto">
						<div class="media-slide-content relative overflow-hidden rounded-2xl group">
							<!-- Video Content -->
							<div v-if="media.type === 'video'" class="aspect-video">
								<iframe
									:src="`https://www.youtube.com/embed/${media.videoId}?rel=0&modestbranding=1&enablejsapi=1`"
									:title="media.title"
									frameborder="0"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
									referrerpolicy="strict-origin-when-cross-origin"
									allowfullscreen
									class="w-full h-full"
								></iframe>
							</div>

							<!-- Image Content -->
							<div v-else-if="media.type === 'image'" class="aspect-video">
								<DirectusImage
									:uuid="media.uuid"
									:alt="media.alt"
									class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
								/>
							</div>

							<!-- Media Info Overlay (only for images, not videos to avoid interference) -->
							<div v-if="media.type === 'image' && (media.title || media.description)" class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6 text-white">
								<h3 v-if="media.title" class="text-lg font-semibold mb-2">
									{{ media.title }}
								</h3>
								<p v-if="media.description" class="text-sm leading-relaxed opacity-90">
									{{ media.description }}
								</p>
							</div>
						</div>
					</swiper-slide>
				</swiper-container>

				<!-- Navigation Buttons - Only show if multiple slides -->
				<template v-if="mediaItems.length > 1">
					<div class="swiper-button-prev nav-button-prev">
						<Icon name="mdi:chevron-left" class="w-6 h-6" />
					</div>
					<div class="swiper-button-next nav-button-next">
						<Icon name="mdi:chevron-right" class="w-6 h-6" />
					</div>
				</template>

				<!-- Pagination -->
				<div class="swiper-pagination !relative !mt-6"></div>

				<template #fallback>
					<!-- Fallback for SSR - show a simple grid -->
					<div class="grid gap-8 md:grid-cols-2">
						<div
							v-for="media in mediaItems.slice(0, 4)"
							:key="media.id"
							class="bg-white rounded-2xl shadow-lg overflow-hidden"
						>
							<!-- Video fallback -->
							<div v-if="media.type === 'video'" class="aspect-video bg-gray-900 flex items-center justify-center">
								<div class="text-center text-white">
									<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-600 flex items-center justify-center">
										<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
											<path
												d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
											/>
										</svg>
									</div>
									<p class="text-sm">{{ media.title }}</p>
								</div>
							</div>

							<!-- Image fallback -->
							<div v-else-if="media.type === 'image'" class="aspect-video">
								<DirectusImage :uuid="media.uuid" :alt="media.alt" class="w-full h-full object-cover" />
							</div>

							<!-- Media info -->
							<div v-if="media.title || media.description" class="p-6">
								<h3 v-if="media.title" class="text-lg font-semibold text-gray-900 mb-2">
									{{ media.title }}
								</h3>
								<p v-if="media.description" class="text-gray-600 text-sm">
									{{ media.description }}
								</p>
							</div>
						</div>
					</div>
				</template>
			</ClientOnly>
		</div>

		<!-- No media state -->
		<div v-else class="text-center text-gray-500 py-12">
			<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
				<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<p>No media content available.</p>
		</div>
	</div>
</template>

<style scoped>
/* Swiper container styles */
swiper-container {
	display: block;
	width: 100%;
	height: auto;
}

swiper-slide {
	display: flex;
	flex-direction: column;
	height: auto;
}

.media-slide-content {
	height: 100%;
	transition:
		transform 0.3s ease,
		shadow 0.3s ease;
}

.media-slide-content:hover {
	transform: translateY(-4px);
	box-shadow:
		0 20px 25px -5px rgba(0, 0, 0, 0.1),
		0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Custom navigation button styles - Override Swiper defaults */
.media-carousel-container .swiper-button-prev,
.media-carousel-container .swiper-button-next {
	position: absolute !important;
	top: 50% !important;
	transform: translateY(-50%) !important;
	width: 56px !important;
	height: 56px !important;
	background: rgba(0, 0, 0, 0.3) !important;
	color: white !important;
	border-radius: 50% !important;
	border: 2px solid rgba(255, 255, 255, 0.2) !important;
	backdrop-filter: blur(4px) !important;
	transition: all 0.3s ease !important;
	z-index: 10 !important;
	margin-top: 0 !important;
}

.media-carousel-container .swiper-button-prev {
	left: 16px !important;
}

.media-carousel-container .swiper-button-next {
	right: 16px !important;
}

.media-carousel-container .swiper-button-prev:hover,
.media-carousel-container .swiper-button-next:hover {
	background: rgba(0, 0, 0, 0.5) !important;
	transform: translateY(-50%) scale(1.1) !important;
}

/* Hide default Swiper arrow content */
.media-carousel-container .swiper-button-prev::after,
.media-carousel-container .swiper-button-next::after {
	content: '' !important;
	font-size: 0 !important;
}

/* Center the custom icons */
.media-carousel-container .swiper-button-prev,
.media-carousel-container .swiper-button-next {
	display: flex !important;
	align-items: center !important;
	justify-content: center !important;
}

/* Icon styling */
.media-carousel-container .swiper-button-prev .icon,
.media-carousel-container .swiper-button-next .icon {
	color: white !important;
	width: 24px !important;
	height: 24px !important;
}

/* Custom pagination styles */
.swiper-pagination {
	position: relative !important;
	margin-top: 1rem;
}

/* Ensure videos don't overflow */
iframe {
	border: none;
	border-radius: 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.swiper-button-prev,
	.swiper-button-next {
		display: none;
	}
}
</style>
