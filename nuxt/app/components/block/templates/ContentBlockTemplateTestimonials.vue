<script setup lang="ts">
interface TemplateTestimonialProps {
	tagline?: string;
	variant?: string;
	items: any[];
}

const props = defineProps<TemplateTestimonialProps>();

// Current testimonial index
const currentIndex = ref(0);

// Get the first image UUID from an item's images array (customer photo or company logo)
const getImageUuid = (item: any) => {
	if (!item.images || !Array.isArray(item.images) || item.images.length === 0) {
		return null;
	}
	const firstImage = item.images[0]?.directus_files_id;
	// Handle both string ID and full file object
	if (typeof firstImage === 'string') {
		return firstImage;
	}
	if (firstImage && typeof firstImage === 'object' && firstImage.id) {
		return firstImage.id;
	}
	return null;
};

// Extract testimonial quote from JSON text_blocks field
const getTestimonialQuote = (textBlocks: any): string => {
	if (!textBlocks) return '';
	
	// Handle different possible structures
	let blocks;
	if (typeof textBlocks === 'string') {
		try {
			blocks = JSON.parse(textBlocks);
		} catch {
			return textBlocks; // If parsing fails, return as-is
		}
	} else if (Array.isArray(textBlocks)) {
		blocks = textBlocks;
	} else if (typeof textBlocks === 'object') {
		blocks = [textBlocks]; // Single block object
	} else {
		return '';
	}

	// Find the first block with a description (the quote)
	const quoteBlock = Array.isArray(blocks) ? blocks.find(block => block?.description) : blocks;
	return quoteBlock?.description || '';
};

// Extract star rating from JSON text_blocks field
const getStarRating = (textBlocks: any): number => {
	if (!textBlocks) return 5; // Default to 5 stars
	
	// Handle different possible structures
	let blocks;
	if (typeof textBlocks === 'string') {
		try {
			blocks = JSON.parse(textBlocks);
		} catch {
			return 5;
		}
	} else if (Array.isArray(textBlocks)) {
		blocks = textBlocks;
	} else if (typeof textBlocks === 'object') {
		blocks = [textBlocks];
	} else {
		return 5;
	}

	// Find the first block with a rating number (1-5)
	const ratingBlock = Array.isArray(blocks) ? blocks.find(block => block?.rating || block?.stars) : blocks;
	const rating = ratingBlock?.rating || ratingBlock?.stars;
	
	// Validate rating is between 1-5
	if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
		return rating;
	}
	
	// Try to parse as string number
	if (typeof rating === 'string') {
		const parsed = parseInt(rating);
		if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
			return parsed;
		}
	}
	
	return 5; // Default to 5 stars
};

// Get current testimonial
const currentTestimonial = computed(() => {
	if (!props.items || props.items.length === 0) return null;
	return props.items[currentIndex.value] || null;
});

// Navigation functions
const goToPrevious = () => {
	if (props.items && props.items.length > 0) {
		currentIndex.value = currentIndex.value === 0 ? props.items.length - 1 : currentIndex.value - 1;
	}
};

const goToNext = () => {
	if (props.items && props.items.length > 0) {
		currentIndex.value = (currentIndex.value + 1) % props.items.length;
	}
};

// Get headline from parent record tagline
const sectionHeadline = computed(() => {
	return props.tagline || 'What Our Customers Are Saying';
});
</script>

<template>
	<div class="content-block-template-testimonial">
		<!-- Two Column Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-[2fr_3fr] min-h-[500px] overflow-hidden">
			<!-- Left Side: Dark Industrial Slate Background with Headline and Navigation -->
			<div class="bg-slate-950 p-12 flex flex-col justify-center items-start text-white">
				<!-- Section Headline -->
				<h2 class="text-3xl font-bold mb-8 leading-tight max-w-sm">
					{{ sectionHeadline }}
				</h2>

				<!-- Navigation Controls -->
				<div v-if="items && items.length > 1" class="flex gap-4 mb-8" style="width: 162px;">
					<!-- Previous Button -->
					<button
						@click="goToPrevious"
						class="w-14 h-14 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50"
						aria-label="Previous testimonial"
					>
						<Icon name="mdi:chevron-left" class="w-6 h-6 text-white" />
					</button>

					<!-- Next Button -->
					<button
						@click="goToNext"
						class="w-14 h-14 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50"
						aria-label="Next testimonial"
					>
						<Icon name="mdi:chevron-right" class="w-6 h-6 text-white" />
					</button>
				</div>

				<!-- Testimonial Indicators -->
				<div v-if="items && items.length > 1" class="flex gap-2">
					<div
						v-for="(_, index) in items"
						:key="index"
						class="w-2 h-2 rounded-full transition-all duration-300"
						:class="index === currentIndex ? 'bg-white' : 'bg-white/40'"
					></div>
				</div>
			</div>

			<!-- Right Side: Testimonial Content -->
			<div class="p-12 flex flex-col justify-center" style="background-color: #EEEEEE;">
				<div v-if="currentTestimonial" class="space-y-8">
					<!-- Testimonial Quote -->
					<blockquote class="italic font-normal" style="color: #58595B; font-size: 26px; line-height: 150%; letter-spacing: 0%; max-width: 634px;">
						"{{ getTestimonialQuote(currentTestimonial.text_blocks) }}"
					</blockquote>

					<!-- White Rounded Rectangle with Customer Info and Stars -->
					<div class="bg-white rounded-2xl p-6">
						<div class="flex items-center justify-between gap-6">
							<!-- Customer Info -->
							<div class="flex items-center gap-4 flex-1">
								<!-- Customer Photo -->
								<div v-if="getImageUuid(currentTestimonial)" class="flex-shrink-0">
									<DirectusImage
										:uuid="getImageUuid(currentTestimonial)"
										:alt="currentTestimonial.headline || 'Customer'"
										class="w-14 h-14 rounded-full object-cover ring-3 ring-gray-200"
									/>
								</div>
								<div v-else class="flex-shrink-0">
									<!-- Default avatar if no photo -->
									<div class="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center ring-3 ring-gray-200">
										<svg class="w-7 h-7 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
											<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
										</svg>
									</div>
								</div>

								<!-- Customer Details -->
								<div class="flex-1">
									<!-- Customer Name -->
									<h4 class="font-semibold text-gray-900 text-base">
										{{ currentTestimonial.headline }}
									</h4>
									<!-- Title and Company -->
									<p v-if="currentTestimonial.tagline || currentTestimonial.description" class="text-gray-600 text-sm">
										<template v-if="currentTestimonial.tagline && currentTestimonial.description">
											{{ currentTestimonial.tagline }} - {{ currentTestimonial.description }}
										</template>
										<template v-else>
											{{ currentTestimonial.tagline || currentTestimonial.description }}
										</template>
									</p>
								</div>
							</div>

							<!-- Star Rating -->
							<div class="flex items-center gap-1 ml-4">
								<Icon 
									v-for="star in getStarRating(currentTestimonial.text_blocks)" 
									:key="star"
									name="mdi:star" 
									class="w-5 h-5 text-[#d69e07]" 
								/>
							</div>
						</div>
					</div>
				</div>

				<!-- No testimonials state -->
				<div v-else class="text-center text-gray-500">
					<p>No testimonials available.</p>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.content-block-template-testimonial {
	/* Template specific styles */
}

/* Custom quote styling */
blockquote {
	position: relative;
}

/* Ensure consistent card heights */
.content-block-template-testimonial .group {
	display: flex;
	flex-direction: column;
}

/* Testimonial quote takes up available space */
blockquote {
	flex-grow: 1;
}
</style>
