<script setup lang="ts">
import type { Page, PageBlock } from '#shared/types/schema';
import PartsServiceHeroNav, { type PartsServiceTab } from '~/components/layout/PartsServiceHeroNav.vue';
import { provideVisualEditingPageContext } from '~/utils/visualEditing';

/**
 * Shared shell for /service and /parts: hero + tab bar, then a 60/40 grid —
 * CMS rich-text blocks from the Directus page at `permalink` on the left, the
 * inquiry form (default slot) in a sticky sidebar on the right. Stacks on mobile.
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
	<!-- `.dark` scopes the dark theme tokens so the CMS blocks render light-on-black. -->
	<div class="dark bg-[#0A0A0A] text-white">
		<PartsServiceHeroNav :active="tab" :title="title" :description="description" />

		<div class="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[3fr_2fr] lg:gap-12">
			<div class="ps-content min-w-0 space-y-6">
				<template v-if="blocks.length">
					<article
						v-for="(block, index) in blocks"
						:key="block.id"
						:class="index === 0 ? 'pb-2' : 'rounded-xl border border-neutral-800 bg-neutral-950/60 p-6 md:p-8'"
					>
						<BaseBlock :block="block" />
					</article>
				</template>
				<p v-else role="status" class="rounded-xl border border-neutral-800 p-8 text-neutral-400">
					Visit or call your nearest ANSA Motors branch — our team is ready to help.
				</p>
			</div>

			<aside class="relative z-10 min-w-0">
				<!--
					Capped to the viewport and scrollable: the parts form is taller than most
					screens, and an uncapped sticky box would leave its lower fields and submit
					button stuck below the fold until the left column finished scrolling.
				-->
				<div class="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:rounded-xl">
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
