<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

/**
 * Pitch-black diagonal hero for /about. The vehicle cutout sits on the #080808
 * field (left); a sloped #121212 panel (right), edged with a thin Mitsubishi Red
 * stripe, holds the sub-navigation. The active link is driven by the parent
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
	<section class="relative isolate overflow-hidden bg-[#080808] text-white">
		<!-- Sloped panel: a red copy of the slope, nudged toward the dark field, peeks out as a thin stripe along the diagonal. -->
		<div
			aria-hidden="true"
			class="about-hero-slope absolute inset-0 -z-10 -translate-y-1 bg-brand-red md:-translate-x-1.5 md:translate-y-0"
		/>
		<div aria-hidden="true" class="about-hero-slope absolute inset-0 -z-10 bg-[#121212]" />

		<div class="mx-auto grid max-w-7xl md:min-h-[540px] md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
			<!-- Left: title + vehicle cutout -->
			<div class="flex flex-col justify-between gap-8 px-4 pt-12 md:px-8 md:pt-16 lg:pt-20">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.25em] text-brand-red">{{ eyebrow }}</p>
					<h1 class="mt-3 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">{{ title }}</h1>
				</div>
				<img
					:src="imageSrc"
					:alt="imageAlt"
					width="1741"
					height="828"
					fetchpriority="high"
					decoding="async"
					class="relative z-10 mb-6 w-full max-w-[720px] select-none object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.75)] md:mb-10 md:w-[112%] md:max-w-none"
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
								'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]',
								link.key === active
									? 'border-brand-red text-brand-red'
									: 'border-transparent text-neutral-400 hover:border-neutral-600 hover:text-white',
							]"
						>
							<span class="text-xs font-semibold tabular-nums tracking-widest opacity-70">
								{{ String(index + 1).padStart(2, '0') }}
							</span>
							<span class="text-2xl font-bold uppercase tracking-tight md:text-3xl">{{ link.label }}</span>
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
