<script setup lang="ts">
import { useEventListener } from '@vueuse/core';
import { Search } from 'lucide-vue-next';

/**
 * Header Quick Jump: a client-side command palette over a curated, in-memory index — no network
 * round-trip, so results update on every keystroke. Empty query shows Quick Links; otherwise every
 * whitespace-separated term must match an item's title, description or keywords, and matches are
 * grouped by category.
 *
 * The list is plain ARIA listbox markup driven by `activeIndex` — not radix's Combobox, whose own
 * filtering and highlight tracking raced this computed list (fast typing could leave nothing highlighted,
 * so Enter did nothing). The radix Dialog still provides the focus trap, Escape and the overlay.
 * Keys: ArrowUp/ArrowDown move, Enter opens, Escape closes; Ctrl/Cmd+K toggles from anywhere but the input.
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
		// "expander" catches the common spoken spelling of the name
		keywords: ['xpander', 'expander', 'crossover', '7 seater', 'family', 'mpv'],
		icon: 'lucide:car-front',
		to: '/showroom/xpander-cross',
	},
	// Services & actions
	{
		id: 'service',
		category: 'Ownership',
		title: 'Book a Service',
		description: 'Factory-certified technicians and Mitsubishi diagnostics',
		keywords: ['book', 'booking', 'service', 'maintenance', 'lube', 'oil change', 'repair', 'diagnostics'],
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
const activeIndex = ref(0);
const input = useTemplateRef<HTMLInputElement>('input');
const router = useRouter();
const { open: openTestDrive } = useTestDriveModal();

const haystack = (item: QuickJumpItem) => [item.title, item.description, ...item.keywords].join(' ').toLowerCase();

/** Title hits rank above description/keyword hits; ties keep index order. */
const score = (item: QuickJumpItem, terms: string[]) => {
	const title = item.title.toLowerCase();
	return terms.reduce((sum, term) => sum + (title.startsWith(term) ? 3 : title.includes(term) ? 2 : 1), 0);
};

const groups = computed<{ heading: string; items: QuickJumpItem[] }[]>(() => {
	const terms = searchTerm.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
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

/** Results in display order — what ArrowUp/ArrowDown walk through. */
const flat = computed(() => groups.value.flatMap((group) => group.items));
const optionId = (item: QuickJumpItem) => `quick-jump-${item.id}`;
const activeItem = computed(() => flat.value[activeIndex.value]);

// Every new query highlights the top result.
watch(searchTerm, () => {
	activeIndex.value = 0;
});

// Keep the highlighted row visible when arrowing through a scrolled list.
watch(activeItem, async (item) => {
	if (!item) return;
	await nextTick();
	document.getElementById(optionId(item))?.scrollIntoView({ block: 'nearest' });
});

function move(step: 1 | -1) {
	const count = flat.value.length;
	if (count) activeIndex.value = (activeIndex.value + step + count) % count;
}

function onInputKeydown(event: KeyboardEvent) {
	if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
		event.preventDefault(); // keep the caret where it is
		move(event.key === 'ArrowDown' ? 1 : -1);
	} else if (event.key === 'Enter' && activeItem.value) {
		event.preventDefault();
		select(activeItem.value);
	}
}

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
	if (!((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) return;
	event.preventDefault(); // also stops the browser's own Ctrl/Cmd+K (address-bar search)
	if (event.target === input.value) return; // typing in the palette never toggles it
	open.value = !open.value;
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

		<Dialog v-model:open="open">
			<DialogContent class="gap-0 overflow-hidden p-0 shadow-lg">
				<DialogTitle class="sr-only">Quick Jump</DialogTitle>
				<DialogDescription class="sr-only">Search vehicles, services and branch locations</DialogDescription>

				<!-- First focusable element, so the dialog auto-focuses it on open. -->
				<div class="flex items-center border-b border-input px-4">
					<Search class="size-5 shrink-0 opacity-50" aria-hidden="true" />
					<input
						ref="input"
						v-model="searchTerm"
						type="text"
						role="combobox"
						aria-expanded="true"
						aria-controls="quick-jump-list"
						aria-autocomplete="list"
						:aria-activedescendant="activeItem ? optionId(activeItem) : undefined"
						aria-label="Search models, services or branches"
						placeholder="Search models, services or branches…"
						autocomplete="off"
						spellcheck="false"
						class="h-14 w-full bg-transparent px-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:ring-0"
						style="box-shadow: none"
						@keydown="onInputKeydown"
					/>
				</div>

				<div
					id="quick-jump-list"
					role="listbox"
					aria-label="Results"
					class="max-h-[min(460px,60vh)] overflow-y-auto p-2 text-foreground"
				>
					<p v-if="!groups.length" role="status" class="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
						No matches for “{{ searchTerm }}”. Try a model, service or town.
					</p>
					<div
						v-for="group in groups"
						:key="group.heading"
						role="group"
						:aria-labelledby="`quick-jump-group-${group.heading}`"
						class="pt-1"
					>
						<p
							:id="`quick-jump-group-${group.heading}`"
							class="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400"
						>
							{{ group.heading }}
						</p>
						<!-- Options are not focusable: focus stays in the input, aria-activedescendant names the active one. -->
						<div
							v-for="item in group.items"
							:id="optionId(item)"
							:key="item.id"
							role="option"
							:aria-selected="item === activeItem"
							class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5"
							:class="item === activeItem ? 'bg-background-muted' : ''"
							@mousemove="activeIndex = flat.indexOf(item)"
							@mousedown.prevent
							@click="select(item)"
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
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	</div>
</template>
