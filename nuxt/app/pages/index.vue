<script setup lang="ts">
import type { BlockContentBlock, BlockHeroCustom, Page, PageBlock } from '#shared/types/schema';
import type { VehicleSummary } from '#shared/types/vehicle';
import HomeColorPreview from '~/components/home/HomeColorPreview.vue';
import HomeContactBanner from '~/components/home/HomeContactBanner.vue';
import HomeFeatureSpotlight from '~/components/home/HomeFeatureSpotlight.vue';
import HomeHero from '~/components/home/HomeHero.vue';
import HomeModelSelector from '~/components/home/HomeModelSelector.vue';
import HomeValueGrid from '~/components/home/HomeValueGrid.vue';

/**
 * OEM light homepage (dark via the colour-mode toggle). Takes precedence over [...permalink].vue for "/".
 *
 * Section order: Hero → Model selector → Feature spotlight → Value grid →
 * Colour preview → Contact banner.
 *
 * CMS blocks on the "/" page (seeded by directus/seeds/homepage-blocks.mjs) are
 * picked by collection + template; hero, spotlight and value grid fall back to
 * default copy when their block is missing:
 *   block_hero_custom                                   → HomeHero
 *   block_content_block · content_block_template_one    → HomeFeatureSpotlight
 *   block_content_block · features_grid                 → HomeValueGrid
 * Any other block on the page still renders through PageBuilder.
 * Model selector and colour preview are driven by the published fleet.
 */
const pageUrl = useRequestURL();

// A missing Home page must not take the site down — the fleet sections still render.
const [{ data: page }, { data: vehicles }] = await Promise.all([
	useFetch<Page>('/api/pages/one', { key: 'home-page', query: { permalink: '/' } }),
	useFetch<VehicleSummary[]>('/api/vehicles', { key: 'vehicles', default: () => [] }),
]);

const blocks = computed(() =>
	((page.value?.blocks ?? []) as PageBlock[]).filter(
		(block): block is PageBlock & { collection: string; item: Exclude<PageBlock['item'], string | null | undefined> } =>
			typeof block.collection === 'string' && !!block.item && typeof block.item === 'object',
	),
);

const findBlock = (collection: string, template?: string) =>
	blocks.value.find(
		(block) => block.collection === collection && (!template || (block.item as { template?: string | null }).template === template),
	);

const heroBlock = computed(() => findBlock('block_hero_custom'));
const spotlightBlock = computed(() => findBlock('block_content_block', 'content_block_template_one'));
const valueBlock = computed(() => findBlock('block_content_block', 'features_grid'));

const otherBlocks = computed(() => {
	const used = new Set([heroBlock.value?.id, spotlightBlock.value?.id, valueBlock.value?.id]);
	return blocks.value.filter((block) => !used.has(block.id));
});

// Lead vehicle (Outlander Sport) — its hero render backs the hero / spotlight when the CMS has no media.
const leadVehicle = computed(() => vehicles.value?.[0]);
const leadMedia = computed(() => directusFileId(leadVehicle.value?.hero_block?.media));

const hero = computed<BlockHeroCustom>(
	() =>
		(heroBlock.value?.item as BlockHeroCustom | undefined) ?? {
			id: '',
			headline: 'Smarter. Smoother. Sassier.',
			highlight_keyword: 'Sassier.',
			body: 'Drive your ambition with the 2026 Mitsubishi lineup at ANSA Motors.',
			template: 'hero_immersive',
			media: leadMedia.value || null,
		},
);
const spotlight = computed(() => spotlightBlock.value?.item as BlockContentBlock | undefined);
const valueGrid = computed(() => valueBlock.value?.item as BlockContentBlock | undefined);

const title = computed(() => page.value?.seo?.title || 'ANSA Motors · Mitsubishi Trinidad & Tobago');
const description = computed(
	() => page.value?.seo?.meta_description || hero.value?.body || 'Explore the 2026 Mitsubishi lineup at ANSA Motors.',
);

useSeoMeta({
	title,
	description,
	ogTitle: title,
	ogDescription: description,
	ogUrl: pageUrl.toString(),
});
</script>

<template>
	<div class="bg-white text-neutral-950 dark:bg-black dark:text-white">
		<HomeHero :hero="hero" />
		<HomeModelSelector v-if="vehicles?.length" :vehicles="vehicles" />
		<HomeFeatureSpotlight
			:block="spotlight"
			:cta-to="leadVehicle ? `/showroom/${leadVehicle.slug}` : '#models'"
		/>
		<HomeValueGrid :block="valueGrid" />
		<HomeColorPreview v-if="vehicles?.length" :vehicles="vehicles" />
		<PageBuilder v-if="otherBlocks.length" :sections="otherBlocks" />
		<HomeContactBanner />
	</div>
</template>
