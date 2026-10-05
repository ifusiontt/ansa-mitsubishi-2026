<script setup lang="ts">
import type { BlockHeroCustom } from '#shared/types/schema';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/** Full-bleed pitch-black hero rendered from the Home page's block_hero_custom. */
const props = defineProps<{ hero: BlockHeroCustom }>();

const { setAttr } = useVisualEditing();

const mediaId = computed(() => directusFileId(props.hero.media));
const mediaUrl = computed(() => (mediaId.value ? `${getDirectusAssetURL(mediaId.value)}?width=2400&quality=85&format=webp` : ''));
const isSplit = computed(() => props.hero.template === 'hero_split_screen');

/** Headline split around the highlight keyword so it can be painted Mitsubishi Red without v-html. */
const headlineParts = computed(() => {
	const text = props.hero.headline || props.hero.title || '';
	const keyword = props.hero.highlight_keyword || '';
	const at = keyword ? text.toLowerCase().indexOf(keyword.toLowerCase()) : -1;
	if (at < 0) return { before: text, keyword: '', after: '' };
	return { before: text.slice(0, at), keyword: text.slice(at, at + keyword.length), after: text.slice(at + keyword.length) };
});
</script>

<template>
	<section
		class="relative isolate overflow-hidden bg-black text-white"
		:class="isSplit ? '' : 'min-h-[calc(100svh-4rem)] flex items-end'"
		:data-directus="setAttr({ collection: 'block_hero_custom', item: hero.id, fields: ['headline', 'highlight_keyword', 'body', 'media', 'template'], mode: 'drawer' })"
	>
		<!-- Immersive: full-bleed image under a bottom-weighted fade -->
		<template v-if="!isSplit">
			<img
				v-if="mediaUrl"
				:src="mediaUrl"
				:alt="hero.title || 'The 2026 Mitsubishi lineup'"
				class="absolute inset-0 -z-10 h-full w-full object-cover"
				fetchpriority="high"
			/>
			<div class="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/60 to-black/10" aria-hidden="true" />
			<div class="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-transparent to-transparent" aria-hidden="true" />
		</template>

		<div
			class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-16"
			:class="isSplit ? 'grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28' : 'pb-20 pt-40 lg:pb-28'"
		>
			<div class="max-w-2xl">
				<p class="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-neutral-400">
					<span class="h-px w-10 bg-[#C3002F]" aria-hidden="true" />
					ANSA Motors · 2026 Lineup
				</p>
				<h1 class="text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
					{{ headlineParts.before }}<span v-if="headlineParts.keyword" class="text-[#C3002F]">{{ headlineParts.keyword }}</span>{{ headlineParts.after }}
				</h1>
				<p v-if="hero.body" class="mt-6 max-w-xl text-lg text-neutral-300 lg:text-xl">{{ hero.body }}</p>

				<div class="mt-10 flex flex-wrap gap-4">
					<NuxtLink
						to="#models"
						class="inline-block rounded-md bg-[#C3002F] px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-red-950/50 transition-colors hover:bg-[#a30027] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
					>
						Explore models
					</NuxtLink>
					<NuxtLink
						:to="{ path: '/contact', query: { intent: 'sales' } }"
						class="inline-block rounded-md border border-white/40 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-white hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
					>
						Book a test drive
					</NuxtLink>
				</div>
			</div>

			<!-- Split screen: framed image beside the copy -->
			<div v-if="isSplit && mediaUrl" class="relative">
				<div class="absolute -inset-4 -z-10 rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(195,0,47,0.25),transparent_70%)]" aria-hidden="true" />
				<img :src="mediaUrl" :alt="hero.title || 'The 2026 Mitsubishi lineup'" class="w-full rounded-xl object-cover" fetchpriority="high" />
			</div>
		</div>
	</section>
</template>
