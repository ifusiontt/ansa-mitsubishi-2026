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
 * Content: the About tab leads with three stat-anchored value cards (VALUE_CARDS, static:
 * the stats are brand facts, not CMS copy). The Directus `/about` page's rich-text blocks
 * carried the same story and are superseded by the cards; any other block types still render
 * through PageBuilder below them. FAQs come from the `faqs` collection. Seeded by
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

const otherBlocks = computed(() => aboutBlocks.value.filter((block) => block.collection !== 'block_richtext'));

interface ValueCard {
	eyebrow: string;
	stat: string;
	label: string;
	body: string;
	points?: { name: string; detail: string }[];
	link: { label: string; to: string };
}

const VALUE_CARDS: ValueCard[] = [
	{
		eyebrow: 'ANSA McAL Group',
		stat: '100+',
		label: 'Years of Commercial Excellence',
		body: 'ANSA Motors is the authorised distributor of Mitsubishi Motors in Trinidad and Tobago and a member of the ANSA McAL Group, bringing Japanese engineering to local roads with a team that sells, services and supports every Mitsubishi we put on them.',
		link: { label: 'Explore the 2026 lineup', to: '/#models' },
	},
	{
		eyebrow: 'Manufacturer Backed',
		stat: '5-Year',
		label: '100,000 km Warranty',
		body: 'Every new Mitsubishi is covered for 5 years or 100,000 km. Factory-trained technicians use Mitsubishi diagnostic tooling for scheduled maintenance, repairs and warranty work, fitted with genuine OEM parts so your coverage stays intact.',
		link: { label: 'Book a service', to: '/service' },
	},
	{
		eyebrow: 'Nationwide Coverage',
		stat: '4',
		label: 'Authorised Locations Across T&T',
		body: 'Sales, service and parts within reach on both islands.',
		points: [
			{ name: 'Port of Spain', detail: 'HQ, Richmond & Duke Streets' },
			{ name: 'San Fernando', detail: 'Royal Road' },
			{ name: 'Chaguanas', detail: 'Brentwood Commercial Center' },
			{ name: 'Tobago', detail: 'Milford Road, Scarborough' },
		],
		link: { label: 'Find a branch', to: '/contact' },
	},
];

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

		<section v-show="activeTab === 'about'" id="about" class="scroll-mt-[13rem] py-12 md:py-20">
			<!-- Editorial brand banner: photo under a left-weighted dark scrim carrying the headline -->
			<div class="mx-auto mb-16 w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
				<div class="relative h-[360px] w-full overflow-hidden rounded-3xl bg-zinc-900 shadow-xl md:h-[440px]">
					<img
						src="/images/main-hero/2025-outlander-sport-glamour-1-2048x1447.webp"
						alt="Mitsubishi SUV driving through a tree-lined city street"
						class="absolute inset-0 h-full w-full object-cover object-[60%_65%]"
						width="2048"
						height="1447"
					/>
					<div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/10" aria-hidden="true" />
					<div class="relative flex h-full max-w-2xl flex-col justify-end p-8 md:p-14">
						<p>
							<span class="inline-flex items-center gap-2 border-l-2 border-brand-red pl-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200">
								ANSA Motors · Mitsubishi
							</span>
						</p>
						<p class="mt-4 text-3xl font-black uppercase leading-tight tracking-tight text-white md:text-5xl">
							Engineered for the roads of <span class="text-brand-red">Trinidad &amp; Tobago</span>
						</p>
					</div>
				</div>
			</div>

			<Container>
				<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
					<article
						v-for="card in VALUE_CARDS"
						:key="card.eyebrow"
						class="flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80"
					>
						<p>
							<span
								class="inline-flex items-center gap-2 border-l-2 border-brand-red pl-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400"
							>
								{{ card.eyebrow }}
							</span>
						</p>
						<p class="mt-6 text-5xl font-black tracking-tight text-zinc-900 md:text-6xl dark:text-white">{{ card.stat }}</p>
						<h2 class="mt-2 text-sm font-semibold uppercase tracking-wider text-brand-red">{{ card.label }}</h2>
						<div class="my-6 h-px bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
						<p class="text-sm leading-relaxed text-zinc-600 md:text-base dark:text-zinc-300">{{ card.body }}</p>
						<ul v-if="card.points" class="mt-4 space-y-2.5">
							<li v-for="point in card.points" :key="point.name" class="flex gap-3 text-sm">
								<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-red" aria-hidden="true" />
								<span>
									<span class="font-semibold text-zinc-900 dark:text-white">{{ point.name }}</span>
									<span class="text-zinc-500 dark:text-zinc-400"> · {{ point.detail }}</span>
								</span>
							</li>
						</ul>
						<NuxtLink
							:to="card.link.to"
							class="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-zinc-900 transition-colors hover:text-brand-red dark:text-white"
						>
							{{ card.link.label }}
							<Icon name="lucide:arrow-right" class="size-4" />
						</NuxtLink>
					</article>
				</div>
			</Container>
			<PageBuilder v-if="otherBlocks.length" :sections="otherBlocks" class="mt-12 md:mt-20" />
		</section>

		<section v-show="activeTab === 'faq'" id="faq" class="scroll-mt-[13rem] py-12 md:py-20">
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
