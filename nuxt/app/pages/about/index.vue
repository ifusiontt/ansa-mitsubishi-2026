<script setup lang="ts">
import type { BlockRichtext, Faq, Page, PageBlock } from '#shared/types/schema';
import AboutHeroNav, { type AboutHeroLink } from '~/components/about/AboutHeroNav.vue';
import FaqAccordion from '~/components/about/FaqAccordion.vue';
import EditorialRichText from '~/components/shared/EditorialRichText.vue';
import { provideVisualEditingPageContext } from '~/utils/visualEditing';

/**
 * /about — "About Us" and "FAQ" tabs under a shared diagonal hero.
 *
 * The URL hash is the source of truth for the active tab (`/about#faq` opens the
 * FAQ), so tabs are linkable. Clicking a hero link updates the hash; the router's
 * hash scroll then smooth-scrolls to the panel (`scroll-mt-*` clears the sticky header).
 * Both panels are server-rendered and toggled with v-show, so all content is indexable.
 * Deep links (`/about#faq`) render "About" on the server and switch on mount.
 *
 * Content: About rich-text blocks come from the Directus `/about` page and render as a
 * responsive card grid (Who We Are / What We Do / Our Network); any other block types
 * fall through to PageBuilder below it. FAQs come from the `faqs` collection. Seeded by
 * directus/seeds/about-and-faqs.mjs.
 */
type AboutTab = 'about' | 'faq';

const route = useRoute();
const { enabled: previewEnabled } = useLivePreview();

// The hash never reaches the server, so SSR and hydration always render "about";
// the real tab is applied after mount (a hydration-time switch would leave stale classes).
const activeTab = ref<AboutTab>('about');
const syncTab = () => {
	activeTab.value = route.hash === '#faq' ? 'faq' : 'about';
};
onMounted(async () => {
	syncTab();
	// The router's initial hash scroll ran while #faq was still hidden; redo it now.
	if (activeTab.value === 'faq') {
		await nextTick();
		document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
	}
});
watch(() => route.hash, syncTab);

const links: AboutHeroLink[] = [
	{ key: 'about', label: 'About Us', to: { hash: '#about' } },
	{ key: 'faq', label: 'FAQ', to: { hash: '#faq' } },
];

// Each source degrades independently: a missing page or FAQ list only empties its own tab.
const [{ data: page }, { data: faqs }] = await Promise.all([
	useFetch<Page>('/api/pages/one', {
		key: 'pages-/about',
		query: { permalink: '/about', preview: previewEnabled.value ? true : undefined },
	}),
	useFetch<Faq[]>('/api/faqs', { key: 'faqs', default: () => [] }),
]);

const aboutBlocks = computed(() => ((page.value?.blocks as PageBlock[] | undefined) ?? []).filter((block) => !block.hide_block));

type RichTextBlock = PageBlock & { collection: 'block_richtext'; item: BlockRichtext };
const isRichText = (block: PageBlock): block is RichTextBlock =>
	block.collection === 'block_richtext' && !!block.item && typeof block.item === 'object';

const aboutCards = computed(() => aboutBlocks.value.filter(isRichText));
const otherBlocks = computed(() => aboutBlocks.value.filter((block) => !isRichText(block)));

// Block components read this for their visual-editing attributes (as on the catch-all route).
provideVisualEditingPageContext({
	pageId: computed(() => page.value?.id ?? ''),
	contentVersion: computed(() => undefined),
});

const description =
	page.value?.seo?.meta_description ||
	'ANSA Motors is the authorised Mitsubishi distributor in Trinidad and Tobago: sales, factory-trained service, and genuine parts.';

useSeoMeta({
	title: page.value?.seo?.title || 'About Us',
	description,
	ogTitle: page.value?.seo?.title || 'About Us',
	ogDescription: description,
});

// FAQPage structured data for search results.
useHead(() => ({
	script: faqs.value?.length
		? [
				{
					key: 'faq-jsonld',
					type: 'application/ld+json',
					innerHTML: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'FAQPage',
						mainEntity: faqs.value.map((faq) => ({
							'@type': 'Question',
							name: faq.question,
							acceptedAnswer: { '@type': 'Answer', text: faq.answer },
						})),
					}),
				},
			]
		: [],
}));
</script>

<template>
	<div class="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
		<AboutHeroNav :links="links" :active="activeTab" />

		<section v-show="activeTab === 'about'" id="about" class="scroll-mt-24 py-12 md:py-20">
			<Container v-if="aboutCards.length">
				<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
					<article
						v-for="block in aboutCards"
						:key="block.id"
						class="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-6 shadow-sm md:p-8 dark:border-zinc-800 dark:bg-zinc-900/70"
					>
						<EditorialRichText :data="block.item" variant="card" />
					</article>
				</div>
			</Container>
			<PageBuilder v-if="otherBlocks.length" :sections="otherBlocks" />
			<Container v-if="!aboutBlocks.length">
				<p
					role="status"
					class="mx-auto max-w-2xl rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-8 text-sm text-zinc-600 shadow-sm md:text-base dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300"
				>
					Our story is on its way. In the meantime, visit or call your nearest ANSA Motors branch.
				</p>
			</Container>
		</section>

		<section v-show="activeTab === 'faq'" id="faq" class="scroll-mt-24 py-12 md:py-20">
			<Container>
				<div class="mx-auto max-w-3xl">
					<p class="mb-4">
						<span class="inline-flex items-center gap-2 border-l-2 border-brand-red pl-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
							Support
						</span>
					</p>
					<h2 class="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-white">Frequently Asked Questions</h2>
					<p class="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600 md:text-base dark:text-zinc-300">
						Warranty, parts, service and financing at ANSA Motors T&amp;T. Can't find your answer?
						<NuxtLink to="/contact" class="text-brand-red underline-offset-4 hover:underline">Contact us</NuxtLink>.
					</p>

					<div class="mt-10">
						<FaqAccordion v-if="faqs?.length" :items="faqs" />
						<p
							v-else
							role="status"
							class="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-8 text-sm text-zinc-600 shadow-sm md:text-base dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300"
						>
							FAQs are currently unavailable. Please call or visit your nearest ANSA Motors branch.
						</p>
					</div>
				</div>
			</Container>
		</section>
	</div>
</template>
