<script setup lang="ts">
/**
 * Pitch-black hero shared by /service and /parts, with a tab bar that switches
 * between the two routes ("Service Centre" / "Genuine Parts"). Mirrors the
 * diagonal red-edged panel of AboutHeroNav.
 */
export type PartsServiceTab = 'service' | 'parts';

const props = withDefaults(
	defineProps<{
		active: PartsServiceTab;
		eyebrow?: string;
		title: string;
		description?: string;
		imageSrc?: string;
		imageAlt?: string;
	}>(),
	{
		eyebrow: 'ANSA Motors T&T',
		imageSrc: '/images/about/triton-blade-silver-cutout.webp',
		imageAlt: 'Mitsubishi Triton double cab in Blade Silver',
	},
);

const tabs: { key: PartsServiceTab; label: string; to: string; icon: string }[] = [
	{ key: 'service', label: 'Service Centre', to: '/service', icon: 'lucide:wrench' },
	{ key: 'parts', label: 'Genuine Parts', to: '/parts', icon: 'lucide:package' },
];
</script>

<template>
	<section class="relative isolate overflow-hidden bg-[#080808] text-white">
		<div aria-hidden="true" class="ps-hero-slope absolute inset-0 -z-10 bg-brand-red md:-translate-x-1.5" />
		<div aria-hidden="true" class="ps-hero-slope absolute inset-0 -z-10 bg-[#121212]" />

		<div class="mx-auto grid max-w-7xl items-end gap-6 px-4 pt-12 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:px-8 md:pt-16">
			<div class="pb-8 md:pb-12">
				<p class="text-xs font-semibold uppercase tracking-[0.25em] text-brand-red">{{ eyebrow }}</p>
				<h1 class="mt-3 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">{{ title }}</h1>
				<p v-if="description" class="mt-4 max-w-xl text-neutral-400">{{ description }}</p>
			</div>
			<img
				:src="props.imageSrc"
				:alt="props.imageAlt"
				width="1741"
				height="828"
				fetchpriority="high"
				decoding="async"
				class="hidden w-full max-w-[560px] select-none justify-self-end object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.75)] md:block"
			/>
		</div>

		<nav aria-label="Parts and service" class="relative border-t border-neutral-800 bg-black/60 backdrop-blur">
			<ul class="mx-auto flex max-w-7xl px-4 md:px-8">
				<li v-for="tab in tabs" :key="tab.key" class="flex-1 md:flex-none">
					<NuxtLink
						:to="tab.to"
						:aria-current="tab.key === active ? 'page' : undefined"
						:class="[
							'flex items-center justify-center gap-2 border-b-2 px-4 py-4 text-sm font-bold uppercase tracking-wider transition-colors md:justify-start md:px-6',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-red',
							tab.key === active
								? 'border-brand-red text-white'
								: 'border-transparent text-neutral-400 hover:border-neutral-600 hover:text-white',
						]"
					>
						<Icon :name="tab.icon" class="size-4" :class="tab.key === active ? 'text-brand-red' : ''" />
						{{ tab.label }}
					</NuxtLink>
				</li>
			</ul>
		</nav>
	</section>
</template>

<style scoped>
.ps-hero-slope {
	clip-path: polygon(0 78%, 100% 64%, 100% 100%, 0 100%);
}

@media (min-width: 768px) {
	.ps-hero-slope {
		clip-path: polygon(72% 0, 100% 0, 100% 100%, 50% 100%);
	}
}
</style>
