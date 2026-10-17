<script setup lang="ts">
import type { BlockRichtext, Page, PageBlock } from '#shared/types/schema';
import PartsServiceHeroNav, { type PartsServiceTab } from '~/components/layout/PartsServiceHeroNav.vue';
import EditorialRichText from '~/components/shared/EditorialRichText.vue';
import { provideVisualEditingPageContext } from '~/utils/visualEditing';

/**
 * Shared shell for /service and /parts: hero + tab bar, then a 60/40 grid —
 * CMS rich-text blocks from the Directus page at `permalink` on the left, the
 * inquiry form (default slot) in a sticky sidebar on the right. Stacks on mobile.
 * Light showroom canvas with `dark:` variants; rich-text blocks use the editorial
 * type scale (EditorialRichText), other block types fall back to BaseBlock.
 * Content blocks are seeded by directus/seeds/parts-service-forms.mjs.
 */
const props = defineProps<{
	tab: PartsServiceTab;
	permalink: '/service' | '/parts';
	title: string;
	description: string;
}>();

const { enabled: previewEnabled } = useLivePreview();

const { data: page } = await useFetch<Page>('/api/pages/one', {
	key: `pages-${props.permalink}`,
	query: { permalink: props.permalink, preview: previewEnabled.value ? true : undefined },
});

const blocks = computed(() =>
	((page.value?.blocks as PageBlock[] | undefined) ?? []).filter(
		(block): block is PageBlock & { collection: string; item: object } =>
			!block.hide_block && typeof block.collection === 'string' && !!block.item && typeof block.item === 'object',
	),
);

const asRichText = (item: object) => item as BlockRichtext;

provideVisualEditingPageContext({
	pageId: computed(() => page.value?.id ?? ''),
	contentVersion: computed(() => undefined),
});

const seoTitle = page.value?.seo?.title || props.title;
const seoDescription = page.value?.seo?.meta_description || props.description;

useSeoMeta({
	title: seoTitle,
	description: seoDescription,
	ogTitle: seoTitle,
	ogDescription: seoDescription,
});
</script>

<template>
	<div class="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
		<PartsServiceHeroNav :active="tab" :title="title" :description="description" />

		<div class="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[3fr_2fr] lg:gap-12">
			<div class="ps-content min-w-0 space-y-6">
				<template v-if="blocks.length">
					<article
						v-for="(block, index) in blocks"
						:key="block.id"
						:class="index === 0 ? 'pb-2' : 'rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-6 shadow-sm md:p-8 dark:border-zinc-800 dark:bg-zinc-900/70'"
					>
						<EditorialRichText v-if="block.collection === 'block_richtext'" :data="asRichText(block.item)" :variant="index === 0 ? 'section' : 'card'" />
						<BaseBlock v-else :block="block" />
					</article>
				</template>
				<p
					v-else
					role="status"
					class="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-8 text-sm text-zinc-600 shadow-sm md:text-base dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300"
				>
					Visit or call your nearest ANSA Motors branch — our team is ready to help.
				</p>
			</div>

			<aside class="relative z-10 min-w-0">
				<!--
					Capped to the viewport and scrollable: the parts form is taller than most
					screens, and an uncapped sticky box would leave its lower fields and submit
					button stuck below the fold until the left column finished scrolling.
					The negative-margin gutter keeps the form card's shadow-xl from being clipped by the scroller.
				-->
				<div class="lg:sticky lg:top-24 lg:-mx-6 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:px-6 lg:pb-8">
					<slot />
				</div>
			</aside>
		</div>
	</div>
</template>

<style scoped>
/* RichText centres a 600px column for full-width pages; let it fill the 60% column instead. */
.ps-content :deep(.max-w-\[600px\]) {
	max-width: none;
	margin-inline: 0;
}
</style>
