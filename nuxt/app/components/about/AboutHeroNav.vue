<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

/**
 * Diagonal hero for /about on the light showroom canvas (zinc in dark mode). The vehicle
 * cutout sits on the white field (left); a sloped zinc panel (right), edged with a thin
 * Mitsubishi Red stripe, holds the sub-navigation. The active link is driven by the parent
 * (the page owns which section is shown).
 */
export interface AboutHeroLink {
	key: string;
	label: string;
	to: RouteLocationRaw;
}

withDefaults(
	defineProps<{
		links: AboutHeroLink[];
		active: string;
		eyebrow?: string;
		title?: string;
		imageSrc?: string;
		imageAlt?: string;
	}>(),
	{
		eyebrow: 'ANSA Motors T&T',
		title: 'Driven by Mitsubishi',
		imageSrc: '/images/about/triton-blade-silver-cutout.webp',
		imageAlt: 'Mitsubishi Triton double cab in Blade Silver',
	},
);
</script>

<template>
	<section class="relative isolate overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
		<!-- Sloped panel: a red copy of the slope, nudged toward the dark field, peeks out as a thin stripe along the diagonal. -->
		<div
			aria-hidden="true"
			class="about-hero-slope absolute inset-0 -z-10 -translate-y-1 bg-brand-red md:-translate-x-1.5 md:translate-y-0"
		/>
		<div aria-hidden="true" class="about-hero-slope absolute inset-0 -z-10 bg-zinc-100 dark:bg-zinc-900" />

		<div class="mx-auto grid max-w-7xl md:min-h-[540px] md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
			<!-- Left: title + vehicle cutout -->
			<div class="flex flex-col justify-between gap-8 px-4 pt-12 md:px-8 md:pt-16 lg:pt-20">
				<div>
					<p class="mb-4">
						<span class="inline-flex items-center gap-2 border-l-2 border-brand-red pl-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
							{{ eyebrow }}
						</span>
					</p>
					<h1 class="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl lg:text-5xl dark:text-white">{{ title }}</h1>
				</div>
				<img
					:src="imageSrc"
					:alt="imageAlt"
					width="1741"
					height="828"
					fetchpriority="high"
					decoding="async"
					class="relative z-10 mb-6 w-full max-w-[720px] select-none object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,0.25)] md:mb-10 dark:drop-shadow-[0_30px_40px_rgba(0,0,0,0.75)] md:w-[112%] md:max-w-none"
				/>
			</div>

			<!-- Right: sub-navigation on the sloped panel -->
			<nav aria-label="About sections" class="flex items-center px-4 pb-12 pt-14 md:justify-end md:px-8 md:py-16 lg:pr-12">
				<ul class="w-full space-y-1 md:max-w-xs">
					<li v-for="(link, index) in links" :key="link.key">
						<NuxtLink
							:to="link.to"
							:aria-current="link.key === active ? 'true' : undefined"
							:class="[
								'group relative flex items-baseline gap-4 border-l-2 py-3 pl-5 transition-colors duration-200',
								'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100 dark:focus-visible:ring-offset-zinc-900',
								link.key === active
									? 'border-brand-red text-brand-red'
									: 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-white',
							]"
						>
							<span class="text-xs font-semibold tabular-nums tracking-widest opacity-70">
								{{ String(index + 1).padStart(2, '0') }}
							</span>
							<span class="text-xl font-bold uppercase tracking-tight md:text-2xl">{{ link.label }}</span>
						</NuxtLink>
					</li>
				</ul>
			</nav>
		</div>
	</section>
</template>

<style scoped>
/* Mobile: panel fills the lower part with a sloped top edge (under the stacked nav). */
.about-hero-slope {
	clip-path: polygon(0 64%, 100% 54%, 100% 100%, 0 100%);
}

/* Desktop: panel fills the right column, sloping in from top to bottom. */
@media (min-width: 768px) {
	.about-hero-slope {
		clip-path: polygon(68% 0, 100% 0, 100% 100%, 52% 100%);
	}
}
</style>
