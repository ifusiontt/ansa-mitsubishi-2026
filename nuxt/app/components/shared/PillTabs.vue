<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

/**
 * Pill-style sub-navigation bar shown under a PageHero. Sticky beneath the site header
 * from `md` up (NavigationBar is a fixed 148px tall); static on phones so it doesn't
 * eat the viewport. The parent owns which tab is active.
 */
export interface PillTab {
	key: string;
	label: string;
	to: RouteLocationRaw;
	icon?: string;
}

defineProps<{
	tabs: PillTab[];
	active: string;
	label: string;
}>();
</script>

<template>
	<nav
		:aria-label="label"
		class="z-40 border-y border-zinc-200/80 bg-white/85 backdrop-blur-md md:sticky md:top-[148px] dark:border-zinc-800 dark:bg-zinc-950/85"
	>
		<ul class="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 md:px-8">
			<li v-for="tab in tabs" :key="tab.key" class="shrink-0">
				<NuxtLink
					:to="tab.to"
					:aria-current="tab.key === active ? 'page' : undefined"
					:class="[
						'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
						'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950',
						tab.key === active
							? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900'
							: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white',
					]"
				>
					<Icon v-if="tab.icon" :name="tab.icon" class="size-4" :class="tab.key === active ? 'text-brand-red' : ''" />
					{{ tab.label }}
				</NuxtLink>
			</li>
		</ul>
	</nav>
</template>
