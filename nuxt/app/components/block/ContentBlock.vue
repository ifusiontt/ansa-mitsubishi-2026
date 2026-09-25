<script setup lang="ts">
import ContentBlockFallback from '~/components/block/ContentBlockFallback.vue';
// Direct imports for SSR compatibility — resolveComponent with promise=true fails during SSR
import ContentBlockTemplate from '~/components/block/templates/ContentBlockTemplate.vue';
import ContentBlockTemplateCarousel from '~/components/block/templates/ContentBlockTemplateCarousel.vue';
import ContentBlockTemplateTestimonials from '~/components/block/templates/ContentBlockTemplateTestimonials.vue';
import ContentBlockTemplateYoutube from '~/components/block/templates/ContentBlockTemplateYoutube.vue';
import ContentBlockTemplateMediaCarousel from '~/components/block/templates/ContentBlockTemplateMediaCarousel.vue';
import ContentBlockTemplateHeroSlider from '~/components/block/templates/ContentBlockTemplateHeroSlider.vue';
import ContentBlockFeaturesGrid from '~/components/block/ContentBlockTemplateFeaturesGrid.vue';
import ContentBlockServicesList from '~/components/block/ContentBlockTemplateServicesList.vue';
// Updated semantic layout-agnostic import target
import ContentBlockTemplateContactInfo from '~/components/block/templates/ContentBlockTemplateContactInfo.vue';
import type { BlockContentBlock, BlockContentItems } from '#shared/types/content-block';

interface ContentBlockProps {
	data?: BlockContentBlock;
}

const props = withDefaults(defineProps<ContentBlockProps>(), {
	data: undefined,
});

// Filter published items and sort by sort field
const publishedItems = computed(() => {
	if (!props.data?.items) return [];

	return (props.data.items as BlockContentItems[])
		.filter((item) => typeof item === 'object' && item.status === 'published')
		.sort((a, b) => (a.sort || 0) - (b.sort || 0));
});

// Template resolution map — direct imports for SSR compatibility
const templateMap: Record<string, any> = {
	content_block: ContentBlockTemplate,
	carousel: ContentBlockTemplateCarousel,
	content_block_template_carousel: ContentBlockTemplateCarousel,
	testimonials: ContentBlockTemplateTestimonials,
	content_block_template_testimonials: ContentBlockTemplateTestimonials,
	youtube: ContentBlockTemplateYoutube,
	content_block_template_youtube: ContentBlockTemplateYoutube,
	media_carousel: ContentBlockTemplateMediaCarousel,
	content_block_template_media_carousel: ContentBlockTemplateMediaCarousel,
	hero_slider: ContentBlockTemplateHeroSlider,
	content_block_hero_slider: ContentBlockTemplateHeroSlider,
	features_grid: ContentBlockFeaturesGrid,
	services_list: ContentBlockServicesList,
	// Decoupled key mappings
	contact_info: ContentBlockTemplateContactInfo,
	contact_split: ContentBlockTemplateContactInfo, // Fallback alias safeguard
};

const TemplateComponent = computed(() => {
	if (!props.data) return null;
	const template = props.data.template;
	if (!template) return null;

	const component = templateMap[template];
	if (!component) {
		console.warn(`[ContentBlock] Template not mapped: "${template}"`);
		return null;
	}
	return component;
});
</script>

<template>
	<div class="content-block">
		<component
			:is="TemplateComponent"
			v-if="TemplateComponent && data"
			:tagline="data.tagline"
			:variant="data.variant"
			:items="publishedItems"
			:container-width="data.container_width"
		/>

		<ContentBlockFallback
			v-else-if="data"
			:tagline="data.tagline"
			:variant="data.variant"
			:template="data.template"
			:items="data.items as any[]"
		/>
	</div>
</template>

<style scoped></style>