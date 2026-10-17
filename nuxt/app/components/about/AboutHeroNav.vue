<script setup lang="ts">
import PageHero from '~/components/shared/PageHero.vue';
import PillTabs, { type PillTab } from '~/components/shared/PillTabs.vue';

/**
 * Editorial hero for /about followed by sticky pill tabs (About Us / FAQ). The active
 * tab is driven by the parent (the page owns which section is shown).
 */
export type AboutHeroLink = PillTab;

withDefaults(
	defineProps<{
		links: AboutHeroLink[];
		active: string;
		eyebrow?: string;
		title?: string;
		description?: string;
	}>(),
	{
		eyebrow: 'ANSA Motors T&T',
		title: 'Driven by Mitsubishi',
		description:
			'The authorised Mitsubishi distributor in Trinidad and Tobago: new-vehicle sales, factory-trained service and genuine parts, backed by the ANSA McAL Group.',
	},
);
</script>

<template>
	<PageHero :eyebrow="eyebrow" :title="title" :description="description" />
	<PillTabs :tabs="links" :active="active" label="About sections" />
</template>
