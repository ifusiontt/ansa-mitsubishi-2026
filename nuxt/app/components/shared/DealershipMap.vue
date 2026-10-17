<script setup lang="ts">
import type { Map as LeafletMap, Marker, TileLayer } from 'leaflet';
import type { Dealer } from '#shared/types/schema';
import { Clock, Mail, MapPin, Navigation, Phone } from 'lucide-vue-next';
import 'leaflet/dist/leaflet.css';

/**
 * Branch locator on a light card (zinc in dark mode): filterable location cards (left)
 * synced with an Esri Light Gray / Dark Gray Leaflet map (right) that follows the colour
 * mode. Selecting a card flies the
 * map to that branch; clicking a marker selects (and scrolls to) its card.
 * Leaflet touches `window`, so it is imported lazily on mount (client only).
 */
const props = defineProps<{ dealers: Dealer[] }>();

type Island = 'trinidad' | 'tobago';
type IslandFilter = 'all' | Island;

const BRAND_RED = '#ED0008';
const BRANCH_ZOOM = 15; // Esri Gray Base tiles stop at zoom 16
const TILE_URL = {
	light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
	dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
} as const;
const TIMEZONE = 'America/Port_of_Spain';
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const FILTERS: { value: IslandFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'trinidad', label: 'Trinidad' },
	{ value: 'tobago', label: 'Tobago' },
];

interface Branch {
	id: number;
	name: string;
	address: string;
	phone: string | null;
	email: string | null;
	isHeadquarters: boolean;
	lat: number;
	lng: number;
	directionsUrl: string;
	hours: Record<string, string>;
	services: string[];
	island: Island;
}

/** Tobago if any location field mentions it (the country name always does, so it is excluded), else by longitude. */
function islandOf(dealer: Dealer): Island {
	const text = [dealer.name, dealer.address, dealer.city, dealer.state_region].join(' ').toLowerCase();
	if (text.includes('tobago')) return 'tobago';
	return (dealer.longitude ?? -61.5) > -61.0 ? 'tobago' : 'trinidad';
}

const branches = computed<Branch[]>(() =>
	props.dealers
		.filter((d) => typeof d.latitude === 'number' && typeof d.longitude === 'number')
		.map((d) => {
			const address = [d.address, d.city].filter(Boolean).join(', ');
			return {
				id: d.id,
				name: d.name,
				address,
				phone: d.phone ?? null,
				email: d.email ?? null,
				isHeadquarters: Boolean(d.is_headquarters),
				lat: d.latitude as number,
				lng: d.longitude as number,
				directionsUrl:
					d.google_maps_url ||
					`https://www.google.com/maps/dir/?api=1&destination=${d.latitude},${d.longitude}`,
				// Directus types JSON columns as the literal 'json'; the stored values are an object / array.
				hours: ((d.opening_hours as unknown) ?? {}) as Record<string, string>,
				services: Array.isArray(d.services) ? (d.services as string[]) : [],
				island: islandOf(d),
			};
		}),
);

const activeFilter = ref<IslandFilter>('all');
const selectedId = ref<number | null>(null);

const visibleBranches = computed(() =>
	activeFilter.value === 'all' ? branches.value : branches.value.filter((b) => b.island === activeFilter.value),
);

// Weekday in Trinidad & Tobago time, so server render and visitor's browser agree.
const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: TIMEZONE }).format(new Date()).toLowerCase();

function todaysHours(branch: Branch): string {
	const key = DAYS.find((day) => day === today) ?? 'monday';
	return branch.hours[key] || 'Hours unavailable';
}

const isClosed = (hours: string) => /closed/i.test(hours);
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/* ------------------------------------------------------------------ */
/* Leaflet                                                             */
/* ------------------------------------------------------------------ */

const mapEl = ref<HTMLElement | null>(null);
const listEl = ref<HTMLElement | null>(null);
let map: LeafletMap | null = null;
let L: typeof import('leaflet') | null = null;
let tiles: TileLayer | null = null;

const colorMode = useColorMode();
const tileTheme = computed<keyof typeof TILE_URL>(() => (colorMode.value === 'dark' ? 'dark' : 'light'));
const markers = new Map<number, Marker>();

function pinIcon(active: boolean) {
	const size = active ? 44 : 34;
	return L!.divIcon({
		className: 'dealer-pin',
		iconSize: [size, size],
		iconAnchor: [size / 2, size],
		html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">
			<path d="M12 2C7.6 2 4 5.6 4 10c0 5.6 8 12 8 12s8-6.4 8-12c0-4.4-3.6-8-8-8z" fill="${BRAND_RED}" stroke="#fff" stroke-width="${active ? 1.5 : 1}"/>
			<circle cx="12" cy="10" r="3" fill="#fff"/>
		</svg>`,
	});
}

function syncMarkers() {
	if (!map || !L) return;
	const visibleIds = new Set(visibleBranches.value.map((b) => b.id));

	for (const [id, marker] of markers) {
		const active = id === selectedId.value;
		marker.setIcon(pinIcon(active));
		marker.setZIndexOffset(active ? 1000 : 0);
		if (visibleIds.has(id)) marker.addTo(map);
		else marker.remove();
	}
}

function fitVisible() {
	if (!map || !L || !visibleBranches.value.length) return;
	const bounds = L.latLngBounds(visibleBranches.value.map((b) => [b.lat, b.lng] as [number, number]));
	map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 12, duration: 0.8 });
}

function selectBranch(branch: Branch, { fly = true, scroll = false } = {}) {
	selectedId.value = branch.id;
	syncMarkers();
	if (fly) map?.flyTo([branch.lat, branch.lng], BRANCH_ZOOM, { duration: 0.9 });
	if (scroll) {
		listEl.value
			?.querySelector(`[data-branch-id="${branch.id}"]`)
			?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}
}

watch(activeFilter, () => {
	if (selectedId.value !== null && !visibleBranches.value.some((b) => b.id === selectedId.value)) {
		selectedId.value = null;
	}
	syncMarkers();
	fitVisible();
});

onMounted(async () => {
	if (!mapEl.value || !branches.value.length) return;

	L = await import('leaflet');
	map = L.map(mapEl.value, { zoomControl: true, scrollWheelZoom: false, attributionControl: true });

	// Esri World Light/Dark Gray Base (major place names baked in), swapped with the colour mode. Esri requires this attribution.
	tiles = L.tileLayer(TILE_URL[tileTheme.value], {
		maxZoom: 16,
		attribution: '&copy; Esri, HERE, Garmin, USGS, NGA, EPA',
	}).addTo(map);

	for (const branch of branches.value) {
		const marker = L.marker([branch.lat, branch.lng], { icon: pinIcon(false), title: branch.name, keyboard: true });
		marker.bindTooltip(branch.name, { direction: 'top', offset: [0, -36], className: 'dealer-tooltip' });
		marker.on('click', () => selectBranch(branch, { scroll: true }));
		markers.set(branch.id, marker);
	}

	syncMarkers();
	const bounds = L.latLngBounds(branches.value.map((b) => [b.lat, b.lng] as [number, number]));
	map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
});

watch(tileTheme, (theme) => tiles?.setUrl(TILE_URL[theme]));

onBeforeUnmount(() => {
	map?.remove();
	tiles = null;
	map = null;
	markers.clear();
});
</script>

<template>
	<section
		v-if="branches.length"
		class="dealer-map rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-6 text-zinc-900 shadow-sm md:p-8 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-100"
		aria-labelledby="dealership-map-heading"
	>
		<div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
			<div>
				<p class="mb-4">
					<span class="inline-flex items-center gap-2 border-l-2 border-brand-red pl-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
						Find a branch
					</span>
				</p>
				<h2 id="dealership-map-heading" class="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-white">
					ANSA Motors Locations
				</h2>
			</div>

			<div role="tablist" aria-label="Filter branches by island" class="inline-flex rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950">
				<button
					v-for="filter in FILTERS"
					:key="filter.value"
					type="button"
					role="tab"
					:aria-selected="activeFilter === filter.value"
					:class="[
						'px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-colors',
						activeFilter === filter.value
							? 'bg-brand-red text-white'
							: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
					]"
					@click="activeFilter = filter.value"
				>
					{{ filter.label }}
				</button>
			</div>
		</div>

		<div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
			<!-- Location cards -->
			<div ref="listEl" class="space-y-4 lg:max-h-[560px] lg:overflow-y-auto lg:pr-2 dealer-list">
				<article
					v-for="branch in visibleBranches"
					:key="branch.id"
					:data-branch-id="branch.id"
					:class="[
						'rounded-xl border p-5 transition-colors cursor-pointer',
						selectedId === branch.id
							? 'border-brand-red bg-white shadow-md dark:bg-zinc-950'
							: 'border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600',
					]"
					@click="selectBranch(branch)"
				>
					<div class="flex items-start justify-between gap-3">
						<button
							type="button"
							class="text-left font-semibold text-lg leading-snug focus-visible:outline-none focus-visible:underline"
							:aria-pressed="selectedId === branch.id"
							@click.stop="selectBranch(branch)"
						>
							{{ branch.name }}
						</button>
						<span
							v-if="branch.isHeadquarters"
							class="shrink-0 rounded-full bg-brand-red px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white"
						>
							HQ
						</span>
					</div>

					<p class="mt-2 flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
						<MapPin class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
						{{ branch.address }}
					</p>

					<dl class="mt-4 space-y-2 text-sm">
						<div class="flex items-center gap-2">
							<dt class="sr-only">Today's hours</dt>
							<Clock class="size-4 shrink-0 text-neutral-500" aria-hidden="true" />
							<dd>
								<span class="text-zinc-500">Today:</span>
								<span :class="isClosed(todaysHours(branch)) ? 'text-red-600 dark:text-[#ff4d6d]' : 'text-zinc-900 dark:text-white'">
									{{ todaysHours(branch) }}
								</span>
							</dd>
						</div>
						<div v-if="branch.phone" class="flex items-center gap-2">
							<dt class="sr-only">Phone</dt>
							<Phone class="size-4 shrink-0 text-neutral-500" aria-hidden="true" />
							<dd>
								<a :href="telHref(branch.phone)" class="hover:text-brand-red" @click.stop>{{ branch.phone }}</a>
							</dd>
						</div>
						<div v-if="branch.email" class="flex items-center gap-2">
							<dt class="sr-only">Email</dt>
							<Mail class="size-4 shrink-0 text-neutral-500" aria-hidden="true" />
							<dd class="min-w-0 truncate">
								<a :href="`mailto:${branch.email}`" class="hover:text-brand-red" @click.stop>{{ branch.email }}</a>
							</dd>
						</div>
					</dl>

					<ul v-if="branch.services.length" class="mt-4 flex flex-wrap gap-1.5" aria-label="Services">
						<li
							v-for="service in branch.services"
							:key="service"
							class="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"
						>
							{{ service }}
						</li>
					</ul>

					<div class="mt-5 flex flex-wrap gap-2">
						<a
							:href="branch.directionsUrl"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 rounded-full bg-brand-red px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-md transition-all hover:bg-red-700"
							@click.stop
						>
							<Navigation class="size-3.5" aria-hidden="true" />
							Get Directions
						</a>
						<a
							v-if="branch.phone"
							:href="telHref(branch.phone)"
							class="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-900 hover:border-zinc-900 dark:border-zinc-700 dark:text-white dark:hover:border-white"
							@click.stop
						>
							<Phone class="size-3.5" aria-hidden="true" />
							Call Branch
						</a>
					</div>
				</article>
			</div>

			<!-- Map: `isolate` keeps Leaflet's high z-index panes beneath the sticky navigation. -->
			<div class="relative isolate min-h-[360px] lg:min-h-[560px] overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
				<div ref="mapEl" class="absolute inset-0 bg-zinc-100 dark:bg-zinc-950" role="region" aria-label="Map of ANSA Motors branches" />
			</div>
		</div>
	</section>
</template>

<style scoped>
/* Light defaults; `.dark .dealer-map` (html class from @nuxtjs/color-mode) restores the charcoal map chrome. */
.dealer-list {
	scrollbar-width: thin;
	scrollbar-color: #d4d4d8 transparent;
}
.dark .dealer-list {
	scrollbar-color: #3f3f46 transparent;
}

/* Pull Esri's charcoal canvas down toward zinc-950 while keeping land outlines legible.
   Only the tile pane is filtered, so the red markers keep their full brightness. */
.dark .dealer-map :deep(.leaflet-tile-pane) {
	filter: brightness(0.6) contrast(1.25) grayscale(0.2);
}

:deep(.dealer-pin) {
	background: transparent;
	border: 0;
	cursor: pointer;
	filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.45));
}

:deep(.dealer-tooltip) {
	background: #fff;
	color: #18181b;
	border: 1px solid #e4e4e7;
	box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
	font-weight: 600;
}
:deep(.dealer-tooltip::before) {
	border-top-color: #e4e4e7;
}
.dark .dealer-map :deep(.dealer-tooltip) {
	background: #09090b;
	color: #fff;
	border-color: #27272a;
}
.dark .dealer-map :deep(.dealer-tooltip::before) {
	border-top-color: #27272a;
}

.dark .dealer-map :deep(.leaflet-control-attribution) {
	background: rgb(0 0 0 / 0.7);
	color: #a1a1aa;
}
.dark .dealer-map :deep(.leaflet-control-attribution a) {
	color: #d4d4d8;
}
.dark .dealer-map :deep(.leaflet-bar a) {
	background: #09090b;
	color: #fff;
	border-color: #27272a;
}
</style>
