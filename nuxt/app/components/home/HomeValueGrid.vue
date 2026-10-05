<script setup lang="ts">
import type { BlockContentBlock, BlockContentItem } from '#shared/types/schema';

/**
 * "The ANSA Difference" — 3-column card grid from the CMS block's published items,
 * falling back to the default copy when the block is missing or empty.
 */
const props = withDefaults(defineProps<{ block?: BlockContentBlock | null }>(), { block: null });

const DEFAULT_ITEMS = [
	{ headline: 'Brand Philosophy', description: 'Built on Japanese engineering precision backed by ANSA McAL heritage.' },
	{ headline: 'All-Round Advanced Safety Technology', description: 'RISE body construction and active collision mitigation.' },
	{ headline: 'In-House ANSA Financing', description: 'Tailored automotive loans and flexible payment structures.' },
];

const ICONS = ['lucide:gem', 'lucide:shield-check', 'lucide:landmark'];

const { setAttr } = useVisualEditing();

const cards = computed(() => {
	const published = (props.block?.items ?? []).filter(
		(entry): entry is BlockContentItem => typeof entry === 'object' && entry.status === 'published',
	);
	if (!published.length) return DEFAULT_ITEMS.map((item, index) => ({ key: `default-${index}`, id: null, ...item }));
	return published.map((item) => ({ key: String(item.id), id: item.id, headline: item.headline ?? '', description: item.description ?? '' }));
});
</script>

<template>
	<section class="bg-black text-white" aria-labelledby="home-value-heading">
		<h2 id="home-value-heading" class="sr-only">{{ block?.tagline || 'The ANSA Difference' }}</h2>
		<ul class="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-16 md:grid-cols-3">
			<li
				v-for="(card, index) in cards"
				:key="card.key"
				class="rounded-xl border border-neutral-800/80 bg-neutral-950 p-8 transition-colors hover:border-[#C3002F]/50"
				:data-directus="card.id ? setAttr({ collection: 'block_content_items', item: card.id, fields: ['headline', 'description'], mode: 'popover' }) : undefined"
			>
				<span class="grid h-12 w-12 place-items-center rounded-lg border border-neutral-800 bg-black text-[#C3002F]">
					<Icon :name="ICONS[index % ICONS.length]!" class="h-6 w-6" />
				</span>
				<h3 class="mt-6 text-xl font-black tracking-tight">{{ card.headline }}</h3>
				<p class="mt-3 leading-relaxed text-neutral-400">{{ card.description }}</p>
			</li>
		</ul>
	</section>
</template>
