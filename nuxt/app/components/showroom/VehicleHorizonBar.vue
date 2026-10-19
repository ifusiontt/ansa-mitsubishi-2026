<script setup lang="ts">
/**
 * Sticky showroom sub-nav docked under the site header (NavigationBar is a fixed 148px tall),
 * from `md` up; static on phones like PillTabs. Model + starting price on the left, jump links
 * to the page sections in the centre (lg+), and a "Book Test Drive" CTA that opens the global
 * test-drive modal with this vehicle and the currently selected trim.
 * The link for the section currently under the bar is highlighted via IntersectionObserver.
 * Target sections carry `scroll-mt-[13.5rem]` so smooth scrolling clears header + bar.
 * "Gallery" only shows for a vehicle with gallery photos (the section isn't rendered otherwise).
 */
const props = defineProps<{
	slug: string;
	title: string;
	/** Trim selected in the page's Trims section, passed through to the test-drive modal. */
	trim?: string;
	/** Pre-formatted starting price (e.g. "TTD $189,000"); hidden when empty. */
	price?: string;
	/** Whether the page renders the #gallery section. */
	hasGallery?: boolean;
}>();

const ALL_LINKS = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'highlights', label: 'Highlights' },
	{ id: 'gallery', label: 'Gallery' },
	{ id: 'colors', label: 'Colours' },
	{ id: 'trims', label: 'Trims' },
	{ id: 'financing', label: 'Finance' },
	{ id: 'specs', label: 'Specs' },
] as const;

const LINKS = computed(() => ALL_LINKS.filter((link) => link.id !== 'gallery' || props.hasGallery));

const activeId = ref<string>('');

const { open: openTestDrive } = useTestDriveModal();

function scrollToSection(id: string) {
	document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

let observer: IntersectionObserver | null = null;

onMounted(() => {
	// A section counts as active once its top passes the bar and until its bottom leaves the upper third.
	observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) activeId.value = entry.target.id;
			}
		},
		{ rootMargin: '-220px 0px -60% 0px' },
	);
	for (const link of LINKS.value) {
		const el = document.getElementById(link.id);
		if (el) observer.observe(el);
	}
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
	<nav
		aria-label="Vehicle sections"
		class="z-30 w-full border-b border-zinc-200/80 bg-white/80 py-3.5 backdrop-blur-md md:sticky md:top-[148px] dark:border-zinc-800 dark:bg-zinc-950/80"
	>
		<div class="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
			<div class="min-w-0">
				<p class="truncate text-sm font-bold uppercase tracking-wider text-zinc-900 md:text-base dark:text-white">2026 {{ props.title }}</p>
				<p v-if="props.price" class="text-xs text-zinc-500 dark:text-zinc-400">
					Starting at <span class="font-semibold text-zinc-900 dark:text-white">{{ props.price }}</span>
				</p>
			</div>

			<ul class="hidden items-center gap-1 lg:flex">
				<li v-for="link in LINKS" :key="link.id">
					<a
						:href="`#${link.id}`"
						:aria-current="activeId === link.id ? 'location' : undefined"
						class="relative px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
						:class="activeId === link.id ? 'text-brand-red' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'"
						@click.prevent="scrollToSection(link.id)"
					>
						{{ link.label }}
					</a>
				</li>
			</ul>

			<button
				type="button"
				class="shrink-0 rounded-md bg-brand-red px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
				@click="openTestDrive({ slug: props.slug, title: props.title, trim: props.trim })"
			>
				Book Test Drive
			</button>
		</div>
	</nav>
</template>
