<script setup lang="ts">
interface TemplateYoutubeProps {
	tagline?: string;
	variant?: string;
	items: any[];
}

const props = defineProps<TemplateYoutubeProps>();

// Extract YouTube video ID from URL
const getYouTubeId = (url: string): string | null => {
	if (!url) return null;
	
	const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
	const match = url.match(regExp);
	const id = match?.[2];

	return id && id.length === 11 ? id : null;
};

// Get video data from content items
const videos = computed(() => {
	if (!props.items || props.items.length === 0) return [];
	
	return props.items
		.filter(item => item.status === 'published')
		.map(item => {
			// Extract YouTube URL from description field
			const youtubeUrl = item.description || '';
			const videoId = getYouTubeId(youtubeUrl);
			
			return {
				id: item.id,
				sort: item.sort || 0,
				title: item.headline || 'Video',
				videoId,
				url: youtubeUrl,
				// Optional: use text_blocks for additional description
				description: item.tagline || ''
			};
		})
		.filter(video => video.videoId) // Only include videos with valid IDs
		.sort((a, b) => (a.sort || 0) - (b.sort || 0));
});
</script>

<template>
	<div class="content-block-template-youtube">
		<!-- Section Tagline -->
		<div v-if="tagline" class="text-center mb-12">
			<Tagline>{{ tagline }}</Tagline>
		</div>

		<!-- Videos Grid -->
		<div v-if="videos.length > 0" class="space-y-8">
			<!-- Single video layout -->
			<div v-if="videos.length === 1" class="max-w-4xl mx-auto">
				<div class="aspect-video rounded-2xl overflow-hidden shadow-lg">
					<iframe
						:src="`https://www.youtube.com/embed/${videos[0]?.videoId}?rel=0&modestbranding=1`"
						:title="videos[0]?.title"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
						class="w-full h-full"
					></iframe>
				</div>
				<div v-if="videos[0]?.title || videos[0]?.description" class="mt-4 text-center">
					<h3 v-if="videos[0]?.title" class="text-2xl font-bold text-gray-900 mb-2">
						{{ videos[0]?.title }}
					</h3>
					<p v-if="videos[0]?.description" class="text-gray-600">
						{{ videos[0]?.description }}
					</p>
				</div>
			</div>

			<!-- Multiple videos grid layout -->
			<div v-else class="grid gap-8 md:grid-cols-2">
				<div v-for="video in videos" :key="video.id" class="group">
					<div class="aspect-video rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow duration-300">
						<iframe
							:src="`https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1`"
							:title="video.title"
							frameborder="0"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							referrerpolicy="strict-origin-when-cross-origin"
							allowfullscreen
							class="w-full h-full"
						></iframe>
					</div>
					<div v-if="video.title || video.description" class="mt-3">
						<h4 v-if="video.title" class="text-lg font-semibold text-gray-900 mb-1">
							{{ video.title }}
						</h4>
						<p v-if="video.description" class="text-sm text-gray-600">
							{{ video.description }}
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- No videos state -->
		<div v-else class="text-center text-gray-500 py-12">
			<p>No videos available.</p>
		</div>
	</div>
</template>

<style scoped>
.content-block-template-youtube {
	/* Template specific styles */
}

/* Ensure responsive iframe */
iframe {
	border: none;
}

/* Hover effects for multiple videos */
.group:hover .aspect-video {
	transform: translateY(-2px);
}
</style>
