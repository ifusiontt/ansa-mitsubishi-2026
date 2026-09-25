<script setup lang="ts">
interface ContentItem {
	id: string;
	headline?: string;
	description?: string;
	tagline?: string;
	text_blocks?: string;
	images?: Array<{ directus_files_id?: { id?: string } }>;
}

const props = withDefaults(defineProps<{
	tagline?: string;
	variant?: string;
	items?: ContentItem[];
}>(), {
	items: () => [],
});

const { setAttr } = useVisualEditing();

const isGridWhiteCards = computed(() => props.variant === 'grid_white_cards');
</script>

<template>
	<section
		:class="[
			'py-16 px-6',
			isGridWhiteCards ? 'bg-white' : 'bg-slate-50',
		]"
	>
		<div class="max-w-7xl mx-auto">
			<div v-if="tagline" class="text-center mb-12">
				<Tagline
					:tagline="tagline"
					:data-directus="setAttr({ collection: 'block_content_block', item: '', fields: 'tagline', mode: 'popover' })"
				/>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
				<div
					v-for="item in items"
					:key="item.id"
					:data-directus="setAttr({ collection: 'block_content_block', item: item.id, fields: 'headline,description,images', mode: 'modal' })"
					:class="[
						'rounded-xl p-6 transition-shadow',
						isGridWhiteCards
							? 'bg-white border border-slate-200 shadow-sm hover:shadow-md'
							: 'bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md',
					]"
				>
					<div
						v-if="item.images?.[0]?.directus_files_id?.id"
						class="w-12 h-12 flex items-center justify-center rounded-lg bg-slate-900/10 mb-4"
					>
						<DirectusImage
							:uuid="item.images[0].directus_files_id.id"
							:alt="item.headline || 'Feature icon'"
							class="w-8 h-8 object-contain"
						/>
					</div>

					<h3
						v-if="item.headline"
						:data-directus="setAttr({ collection: 'block_content_block', item: item.id, fields: 'headline', mode: 'popover' })"
						:class="[
							'mb-2',
							isGridWhiteCards
								? 'text-lg font-semibold text-slate-900'
								: 'text-lg font-semibold text-slate-900 mb-2',
						]"
					>
						{{ item.headline }}
					</h3>

					<p
						v-if="item.description"
						:data-directus="setAttr({ collection: 'block_content_block', item: item.id, fields: 'description', mode: 'popover' })"
						class="text-sm text-slate-600 leading-relaxed"
						v-html="item.description"
					/>
				</div>
			</div>
		</div>
	</section>
</template>
