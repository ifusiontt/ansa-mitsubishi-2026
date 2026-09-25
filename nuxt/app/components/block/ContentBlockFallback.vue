<script setup lang="ts">
import type { BlockContentItems } from '#shared/types/content-block';

interface ContentBlockFallbackProps {
	tagline?: string | null;
	variant?: string | null;
	items?: any[];
	template?: string | null;
}

const props = withDefaults(defineProps<ContentBlockFallbackProps>(), {
	items: () => [],
});

const publishedItems = computed(() =>
	props.items
		.filter((item) => typeof item === 'object' && item.status === 'published')
		.sort((a, b) => (a.sort || 0) - (b.sort || 0)),
);
</script>

<template>
	<div class="content-block-fallback space-y-8">
		<div v-if="tagline" class="text-center mb-12">
			<Tagline>{{ tagline }}</Tagline>
		</div>

		<!-- Warning banner for missing template -->
		<div v-if="template" class="bg-slate-900/5 border border-slate-900/10 rounded-lg p-4 text-sm text-[#d69e07]">
			<strong>Dev Note:</strong> Template component for "{{ template }}" not found. Showing fallback.
		</div>

		<!-- Fallback content cards -->
		<div v-for="item in publishedItems" :key="item.id" class="border rounded-lg p-6">
			<h3 v-if="item.headline" class="text-2xl font-bold mb-4">
				{{ item.headline }}
			</h3>
			<p v-if="item.description" class="text-gray-600 mb-4">
				{{ item.description }}
			</p>
			<div v-if="item.text_blocks" v-html="item.text_blocks"></div>
		</div>

		<!-- Empty state -->
		<div v-if="publishedItems.length === 0" class="text-center text-gray-500 py-12">
			<p>No content items available for this block.</p>
		</div>
	</div>
</template>
