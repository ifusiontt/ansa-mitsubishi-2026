<script setup lang="ts">
import type { Faq, Page, PageBlock } from '#shared/types/schema';
import AboutHeroNav, { type AboutHeroLink } from '~/components/about/AboutHeroNav.vue';
import FaqAccordion from '~/components/about/FaqAccordion.vue';
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
 * Content: About rich-text blocks come from the Directus `/about` page (rendered
 * by PageBuilder); FAQs from the `faqs` collection. Seeded by
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

const aboutBlocks = computed(() => (page.value?.blocks as PageBlock[] | undefined) ?? []);

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
	<!-- `.dark` scopes the dark theme tokens so the CMS blocks render light-on-black. -->
	<div class="dark bg-[#0A0A0A] text-white">
		<AboutHeroNav :links="links" :active="activeTab" />

		<section v-show="activeTab === 'about'" id="about" class="scroll-mt-24 py-12 md:py-20">
			<PageBuilder v-if="aboutBlocks.length" :sections="aboutBlocks" />
			<Container v-else>
				<p role="status" class="mx-auto max-w-[600px] rounded-lg border border-[#1F1F1F] p-8 text-neutral-400">
					Our story is on its way. In the meantime, visit or call your nearest ANSA Motors branch.
				</p>
			</Container>
		</section>

		<section v-show="activeTab === 'faq'" id="faq" class="scroll-mt-24 py-12 md:py-20">
			<Container>
				<div class="mx-auto max-w-3xl">
					<p class="text-xs font-semibold uppercase tracking-[0.25em] text-[#C3002F]">Support</p>
					<h2 class="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Frequently Asked Questions</h2>
					<p class="mt-4 text-neutral-400">
						Warranty, parts, service and financing at ANSA Motors T&amp;T. Can't find your answer?
						<NuxtLink to="/contact" class="text-[#C3002F] underline-offset-4 hover:underline">Contact us</NuxtLink>.
					</p>

					<div class="mt-10">
						<FaqAccordion v-if="faqs?.length" :items="faqs" />
						<p v-else role="status" class="rounded-lg border border-[#1F1F1F] p-8 text-neutral-400">
							FAQs are currently unavailable. Please call or visit your nearest ANSA Motors branch.
						</p>
					</div>
				</div>
			</Container>
		</section>
	</div>
</template>
