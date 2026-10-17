<script setup lang="ts">
import PageHero from '~/components/shared/PageHero.vue';
import PillTabs, { type PillTab } from '~/components/shared/PillTabs.vue';

/**
 * Editorial hero shared by /service and /parts, followed by sticky pill tabs that switch
 * between the two routes ("Service Centre" / "Genuine Parts").
 */
export type PartsServiceTab = 'service' | 'parts';

withDefaults(
	defineProps<{
		active: PartsServiceTab;
		eyebrow?: string;
		title: string;
		description?: string;
	}>(),
	{ eyebrow: 'ANSA Motors T&T', description: undefined },
);

const tabs: PillTab[] = [
	{ key: 'service', label: 'Service Centre', to: '/service', icon: 'lucide:wrench' },
	{ key: 'parts', label: 'Genuine Parts', to: '/parts', icon: 'lucide:package' },
];
</script>

<template>
	<PageHero :eyebrow="eyebrow" :title="title" :description="description" />
	<PillTabs :tabs="tabs" :active="active" label="Parts and service" />
</template>
