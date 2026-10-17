<script setup lang="ts">
/**
 * Editorial hero for secondary pages (About, Service, Parts): soft zinc-to-white wash,
 * left-anchored red-ruled eyebrow, executive title and lead copy. No imagery, so the
 * page content below carries the visuals. Pair with PillTabs for in-page sub-navigation.
 */
withDefaults(
	defineProps<{
		title: string;
		eyebrow?: string;
		description?: string;
	}>(),
	{ eyebrow: 'ANSA Motors T&T', description: undefined },
);
</script>

<template>
	<section class="bg-gradient-to-b from-zinc-100/60 to-white py-16 md:py-24 dark:from-zinc-900/40 dark:to-zinc-950">
		<div class="mx-auto max-w-7xl px-4 md:px-8">
			<p>
				<span
					class="inline-flex items-center gap-2 border-l-2 border-brand-red pl-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400"
				>
					{{ eyebrow }}
				</span>
			</p>
			<h1 class="mt-3 text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl dark:text-white">{{ title }}</h1>
			<p v-if="description" class="mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 md:text-lg dark:text-zinc-300">
				{{ description }}
			</p>
			<slot />
		</div>
	</section>
</template>
