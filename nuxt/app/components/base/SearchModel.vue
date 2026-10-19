<script setup lang="ts">
import { useEventListener } from '@vueuse/core';
import { Search } from 'lucide-vue-next';
import { ComboboxLabel, type ComboboxRootProps } from 'radix-vue';

/**
 * Header Quick Jump: a client-side command palette over a curated, in-memory index — no network
 * round-trip, so results update on every keystroke. Empty query shows Quick Links; otherwise every
 * whitespace-separated term must match an item's title, description or keywords, and matches are
 * grouped by category. radix-vue's Combobox (shadcn Command) supplies the keyboard model: input
 * auto-focus, ArrowUp/ArrowDown highlight, Enter to select, Escape to close. Ctrl/Cmd+K toggles it.
 */
type Category = 'Vehicles' | 'Ownership' | 'Locations';

interface QuickJumpItem {
	id: string;
	category: Category;
	title: string;
	description: string;
	keywords: string[];
	icon: string;
	/** Route to open, or `test-drive` to open the test-drive modal instead. */
	to?: string;
	action?: 'test-drive';
}

const ITEMS: QuickJumpItem[] = [
	// Vehicles
	{
		id: 'triton',
		category: 'Vehicles',
		title: 'All-New Triton',
		description: '2.4L turbo diesel pickup with Super Select 4WD-II',
		keywords: ['pickup', 'van', '4x4', '4wd', 'diesel', 'l200', 'double cab'],
		icon: 'lucide:truck',
		to: '/showroom/triton',
	},
	{
		id: 'outlander-sport',
		category: 'Vehicles',
		title: 'Outlander Sport',
		description: 'Compact SUV built on the regional Xforce platform',
		keywords: ['compact suv', 'crossover', '5 seater'],
		icon: 'lucide:car',
		to: '/showroom/outlander-sport',
	},
	{
		id: 'xpander-cross',
		category: 'Vehicles',
		title: 'Xpander Cross',
		description: '7-seat crossover MPV for the whole family',
		keywords: ['7 seater', 'family', 'mpv', 'crossover'],
		icon: 'lucide:car-front',
		to: '/showroom/xpander-cross',
	},
	// Services & actions
	{
		id: 'service',
		category: 'Ownership',
		title: 'Book a Service',
		description: 'Factory-certified technicians and Mitsubishi diagnostics',
		keywords: ['maintenance', 'oil change', 'repair', 'diagnostics'],
		icon: 'lucide:wrench',
		to: '/service',
	},
	{
		id: 'parts',
		category: 'Ownership',
		title: 'Request Genuine Parts',
		description: 'OEM parts, VIN-verified at every branch counter',
		keywords: ['oem', 'filters', 'brakes', 'tyres', 'parts quote'],
		icon: 'lucide:package',
		to: '/parts',
	},
	{
		id: 'warranty',
		category: 'Ownership',
		title: '5-Year / 100,000 km Warranty',
		description: 'What your manufacturer coverage includes',
		keywords: ['guarantee', 'factory warranty', 'coverage'],
		icon: 'lucide:shield-check',
		to: '/about#faq',
	},
	{
		id: 'test-drive',
		category: 'Ownership',
		title: 'Book a Test Drive',
		description: 'Pick a model and a date — we confirm by phone',
		keywords: ['schedule drive', 'demo'],
		icon: 'lucide:key-round',
		action: 'test-drive',
	},
	// Locations
	{
		id: 'port-of-spain',
		category: 'Locations',
		title: 'Port of Spain Showroom & Service',
		description: 'Corner Richmond & Duke Streets',
		keywords: ['pos', 'headquarters', 'north'],
		icon: 'lucide:map-pin',
		to: '/contact',
	},
	{
		id: 'san-fernando',
		category: 'Locations',
		title: 'San Fernando Branch',
		description: 'Royal Road',
		keywords: ['south', 'royal road'],
		icon: 'lucide:map-pin',
		to: '/contact',
	},
	{
		id: 'chaguanas',
		category: 'Locations',
		title: 'Chaguanas Branch',
		description: 'Brentwood Commercial Center',
		keywords: ['central', 'brentwood'],
		icon: 'lucide:map-pin',
		to: '/contact',
	},
	{
		id: 'tobago',
		category: 'Locations',
		title: 'Tobago Branch',
		description: 'Milford Road, Scarborough',
		keywords: ['scarborough', 'sister isle'],
		icon: 'lucide:map-pin',
		to: '/contact',
	},
];

const QUICK_LINK_IDS = ['triton', 'service', 'parts', 'warranty'];
const CATEGORY_ORDER: Category[] = ['Vehicles', 'Ownership', 'Locations'];

const open = ref(false);
const searchTerm = ref('');
const router = useRouter();
const { open: openTestDrive } = useTestDriveModal();

const haystack = (item: QuickJumpItem) => [item.title, item.description, ...item.keywords].join(' ').toLowerCase();

/** Title hits rank above description/keyword hits; ties keep index order. */
const score = (item: QuickJumpItem, terms: string[]) => {
	const title = item.title.toLowerCase();
	return terms.reduce((sum, term) => sum + (title.startsWith(term) ? 3 : title.includes(term) ? 2 : 1), 0);
};

const groups = computed<{ heading: string; items: QuickJumpItem[] }[]>(() => {
	const terms = searchTerm.value.toLowerCase().split(/\s+/).filter(Boolean);
	if (!terms.length) {
		return [{ heading: 'Quick Links', items: QUICK_LINK_IDS.map((id) => ITEMS.find((item) => item.id === id)!) }];
	}

	const matches = ITEMS.filter((item) => terms.every((term) => haystack(item).includes(term)))
		.map((item) => ({ item, score: score(item, terms) }))
		.sort((a, b) => b.score - a.score)
		.map(({ item }) => item);

	return CATEGORY_ORDER.map((category) => ({
		heading: category,
		items: matches.filter((item) => item.category === category),
	})).filter((group) => group.items.length);
});

/**
 * radix keeps the highlighted option across a filter change while its value survives, so the value is
 * scoped to the query: every keystroke then highlights the top result. Selection goes through @select.
 */
const optionValue = (item: QuickJumpItem) => `${searchTerm.value}::${item.id}`;

// Filtering happens in `groups`; radix only handles highlight + selection over what is rendered.
const keepAll: NonNullable<ComboboxRootProps['filterFunction']> = (list) => list;

async function select(item: QuickJumpItem) {
	open.value = false;
	if (item.action === 'test-drive') {
		// Let the search dialog release its focus trap before the test-drive dialog takes over.
		await nextTick();
		openTestDrive();
		return;
	}
	if (item.to) await router.push(item.to);
}

useEventListener('keydown', (event: KeyboardEvent) => {
	if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
		event.preventDefault();
		open.value = !open.value;
	}
});

watch(open, (isOpen) => {
	if (!isOpen) searchTerm.value = '';
});
</script>

<template>
	<div class="sm:max-w-[540px] max-w-full">
		<Button variant="ghost" size="icon" aria-label="Search" @click="open = true">
			<Search class="size-5" />
		</Button>

		<CommandDialog v-model:open="open">
			<Command v-model:search-term="searchTerm" :filter-function="keepAll">
				<DialogTitle class="sr-only">Quick Jump</DialogTitle>
				<DialogDescription class="sr-only">Search vehicles, services and branch locations</DialogDescription>

				<CommandInput
					placeholder="Search models, services or branches…"
					class="m-2 p-4 text-base leading-normal focus:outline-none"
				/>

				<CommandList class="max-h-[min(460px,60vh)] overflow-auto p-2 text-foreground">
					<p v-if="!groups.length" role="status" class="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
						No matches for “{{ searchTerm }}”. Try a model, service or town.
					</p>
					<CommandGroup v-for="group in groups" :key="group.heading" class="pt-1">
						<ComboboxLabel
							class="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400"
						>
							{{ group.heading }}
						</ComboboxLabel>
						<CommandItem
							v-for="item in group.items"
							:key="item.id"
							:value="optionValue(item)"
							class="flex cursor-pointer items-center gap-3 px-2 py-2.5"
							@select="select(item)"
						>
							<span
								class="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-red/10 text-brand-red"
								aria-hidden="true"
							>
								<Icon :name="item.icon" class="size-4" />
							</span>
							<span class="min-w-0">
								<span class="block truncate text-sm font-semibold">{{ item.title }}</span>
								<span class="block truncate text-xs text-zinc-500 dark:text-zinc-400">{{ item.description }}</span>
							</span>
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</Command>
		</CommandDialog>
	</div>
</template>
