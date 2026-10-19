<script setup lang="ts">
import type { BlockRichtext } from '#shared/types/schema';

/**
 * `block_richtext` item rendered in the secondary-page type scale (About, Service, Parts):
 * brand-red eyebrow, bold zinc text-2xl heading, relaxed zinc body copy.
 * Replaces the RichText block's display-size Tagline/Headline where content sits in cards
 * or narrow columns. Keeps the Directus visual-editing attributes.
 */
const props = withDefaults(
	defineProps<{
		data: Pick<BlockRichtext, 'id' | 'tagline' | 'headline' | 'content'>;
		/** `section` = page-level h2 scale; `card` = smaller h3 for grid cards. */
		variant?: 'section' | 'card';
	}>(),
	{ variant: 'section' },
);

const { setBlockAttr } = useVisualEditingAttrs();
const attr = (fields: string, mode: 'popover' | 'drawer' = 'popover') =>
	setBlockAttr({ blockCollection: 'block_richtext', blockItemId: props.data.id, fields, mode });
</script>

<template>
	<div>
		<p v-if="data.tagline" class="mb-3 text-xs font-bold uppercase tracking-widest text-brand-red" :data-directus="attr('tagline')">
			{{ data.tagline }}
		</p>
		<!-- One heading size for both variants, matching the form cards in the sidebar; the variant only sets the level. -->
		<component
			:is="variant === 'card' ? 'h3' : 'h2'"
			v-if="data.headline"
			class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white"
			:data-directus="attr('headline')"
		>
			{{ data.headline }}
		</component>
		<!-- CMS-authored rich text (same trust level as block_richtext). -->
		<div
			v-if="data.content"
			class="editorial-body mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400 [&_strong]:text-zinc-900 dark:[&_strong]:text-white"
			:data-directus="attr('content', 'drawer')"
			v-html="data.content"
		/>
	</div>
</template>

<style scoped>
.editorial-body :deep(p + p),
.editorial-body :deep(p + ul),
.editorial-body :deep(ul + p) {
	margin-top: 0.75rem;
}
.editorial-body :deep(ul) {
	list-style: none;
	padding: 0;
}
.editorial-body :deep(li) {
	position: relative;
	padding-left: 1.125rem;
}
.editorial-body :deep(li + li) {
	margin-top: 0.375rem;
}
.editorial-body :deep(li)::before {
	content: '';
	position: absolute;
	left: 0;
	top: 0.65em;
	width: 0.375rem;
	height: 0.375rem;
	border-radius: 9999px;
	background: #ed0008;
}
.editorial-body :deep(strong) {
	font-weight: 600;
}
.editorial-body :deep(a) {
	color: #ed0008;
	text-underline-offset: 4px;
}
.editorial-body :deep(a:hover) {
	text-decoration: underline;
}
</style>
