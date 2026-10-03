<script setup lang="ts">
import { Menu, ChevronDown } from 'lucide-vue-next';
import { onClickOutside, useEventListener } from '@vueuse/core';
import SearchModal from '~/components/base/SearchModel.vue';
import HeaderMegaMenu from '~/components/layout/HeaderMegaMenu.vue';

interface NavigationItem {
	id: string;
	title: string;
	url?: string;
	page?: { permalink: string };
	children?: NavigationItem[];
}

// Using template ref to expose the navigation bar to the layout for visual editing
const navigationRef = useTemplateRef('navigationRef');
defineExpose({ navigationRef });

interface Navigation {
	id: string;
	items: NavigationItem[];
}

interface Globals {
	logo?: string | null;
	logo_dark_mode?: string | null;
}

const props = defineProps<{
	navigation: Navigation;
	globals: Globals;
}>();

const menuOpen = ref(false);
const runtimeConfig = useRuntimeConfig();
const { setAttr } = useVisualEditing();

const lightLogoUrl = computed(() =>
	props.globals?.logo ? `${runtimeConfig.public.directusUrl}/assets/${props.globals.logo}` : '/images/logo.svg',
);

const darkLogoUrl = computed(() =>
	props.globals?.logo_dark_mode ? `${runtimeConfig.public.directusUrl}/assets/${props.globals.logo_dark_mode}` : '',
);

// The header is always pitch-black, so prefer the dark-mode (light-on-dark) logo;
// if none is configured, force the default logo to white with a CSS filter.
const headerLogoUrl = computed(() => darkLogoUrl.value || lightLogoUrl.value);
const forceWhiteLogo = computed(() => !darkLogoUrl.value);

const handleLinkClick = () => {
	menuOpen.value = false;
};

/* ------------------------------------------------------------------ */
/* Vehicles mega menu (desktop)                                        */
/* ------------------------------------------------------------------ */

const MEGA_MENU_ID = 'vehicles-mega-menu';
const megaOpen = ref(false);
let closeTimer: ReturnType<typeof setTimeout> | undefined;

/** The top-level "Vehicles" / "Showroom" item (no CMS children) opens the mega menu instead of linking. */
const isVehiclesItem = (item: NavigationItem) =>
	!item.children?.length &&
	(/^(vehicles|showroom)$/i.test(item.title.trim()) || (item.page?.permalink || item.url || '').startsWith('/showroom'));

function openMega() {
	clearTimeout(closeTimer);
	megaOpen.value = true;
}

// Short grace period so the pointer can travel from the nav item down into the panel.
function scheduleCloseMega() {
	clearTimeout(closeTimer);
	closeTimer = setTimeout(() => (megaOpen.value = false), 150);
}

function closeMega() {
	clearTimeout(closeTimer);
	megaOpen.value = false;
}

onClickOutside(navigationRef, closeMega);
useEventListener('keydown', (event: KeyboardEvent) => {
	if (event.key === 'Escape') closeMega();
});

const route = useRoute();
watch(() => route.fullPath, closeMega);
onBeforeUnmount(() => clearTimeout(closeTimer));
</script>

<template>
	<header ref="navigationRef" class="sticky top-0 z-[60] w-full bg-black text-white border-b border-neutral-900/80">
		<Container class="flex items-center justify-between p-4">
			<NuxtLink to="/" class="flex-shrink-0">
				<img
					:src="headerLogoUrl"
					alt="Logo"
					class="w-[120px] h-auto"
					:class="{ 'brightness-0 invert': forceWhiteLogo }"
					width="150"
					height="100"
				/>
			</NuxtLink>

			<nav class="flex items-center gap-4">
				<SearchModal class="text-white [&_button]:text-white [&_button:hover]:bg-transparent [&_button:hover]:text-red-500" />
				<NavigationMenu
					class="hidden md:flex [&_.origin-top-center]:border-neutral-800 [&_.origin-top-center]:bg-black [&_.origin-top-center]:shadow-2xl"
					:data-directus="
						setAttr({ collection: 'navigation', item: props.navigation.id, fields: ['items'], mode: 'modal' })
					"
				>
					<NavigationMenuList class="flex gap-6">
						<NavigationMenuItem v-for="section in props.navigation.items" :key="section.id">
							<template v-if="section.children?.length">
								<NavigationMenuTrigger
									class="bg-transparent hover:bg-transparent focus:bg-transparent focus:outline-none focus:text-red-600 data-[state=open]:bg-transparent data-[state=open]:text-red-600 text-xs font-bold tracking-widest uppercase text-slate-200 hover:text-red-600 transition-colors"
								>
									{{ section.title }}
								</NavigationMenuTrigger>
								<NavigationMenuContent class="min-w-[220px] rounded-md bg-black text-white border border-neutral-800 shadow-2xl p-4">
									<ul class="min-h-[100px] flex flex-col gap-2">
										<li v-for="child in section.children" :key="child.id">
											<NavigationMenuLink as-child>
												<NuxtLink :to="child.page?.permalink || child.url || '#'" class="block py-1 text-xs font-bold tracking-widest uppercase text-slate-200 hover:text-red-600 transition-colors">
													{{ child.title }}
												</NuxtLink>
											</NavigationMenuLink>
										</li>
									</ul>
								</NavigationMenuContent>
							</template>

							<button
								v-else-if="isVehiclesItem(section)"
								type="button"
								:aria-expanded="megaOpen"
								:aria-controls="MEGA_MENU_ID"
								:class="[
									'flex items-center gap-1 p-2 text-xs font-bold tracking-widest uppercase transition-colors hover:text-red-600',
									megaOpen ? 'text-red-600' : 'text-slate-200',
								]"
								@mouseenter="openMega"
								@mouseleave="scheduleCloseMega"
								@click="megaOpen ? closeMega() : openMega()"
							>
								{{ section.title }}
								<ChevronDown :class="['size-3.5 transition-transform', { 'rotate-180': megaOpen }]" aria-hidden="true" />
							</button>

							<NavigationMenuLink v-else as-child>
								<NuxtLink :to="section.page?.permalink || section.url || '#'" class="p-2 text-xs font-bold tracking-widest uppercase text-slate-200 hover:text-red-600 transition-colors">
									{{ section.title }}
								</NuxtLink>
							</NavigationMenuLink>
						</NavigationMenuItem>
					</NavigationMenuList>
				</NavigationMenu>

				<div class="flex md:hidden">
					<DropdownMenu v-model:open="menuOpen">
						<DropdownMenuTrigger as-child>
							<Button
								variant="link"
								size="icon"
								aria-label="Open menu"
								class="text-white hover:text-red-500"
							>
								<Menu />
							</Button>
						</DropdownMenuTrigger>

						<DropdownMenuContent
							align="start"
							class="top-full w-screen p-6 max-w-full overflow-hidden rounded-none bg-black text-white border border-neutral-800 shadow-2xl"
						>
							<div class="flex flex-col gap-4">
								<div v-for="section in props.navigation.items" :key="section.id">
									<Collapsible v-if="section.children?.length">
										<CollapsibleTrigger
											class="w-full text-left flex items-center focus:outline-none text-xs font-bold tracking-widest uppercase text-slate-200 hover:text-red-600 transition-colors"
										>
											<span>{{ section.title }}</span>
											<ChevronDown class="size-4 ml-1 hover:rotate-180 active:rotate-180 focus:rotate-180" />
										</CollapsibleTrigger>
										<CollapsibleContent class="ml-4 mt-2 flex flex-col gap-2">
											<NuxtLink
												v-for="child in section.children"
												:key="child.id"
												:to="child.page?.permalink || child.url || '#'"
												class="text-xs font-bold tracking-widest uppercase text-slate-200 hover:text-red-600 transition-colors"
												@click="handleLinkClick"
											>
												{{ child.title }}
											</NuxtLink>
										</CollapsibleContent>
									</Collapsible>

									<NuxtLink
										v-else
										:to="section.page?.permalink || section.url || '#'"
										class="text-xs font-bold tracking-widest uppercase text-slate-200 hover:text-red-600 transition-colors"
										@click="handleLinkClick"
									>
										{{ section.title }}
									</NuxtLink>
								</div>
							</div>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<ThemeToggle class-name="!border-neutral-700 !bg-transparent text-white hover:text-red-500" />
			</nav>
		</Container>

		<!-- Desktop only: on mobile the Showroom item stays a plain link in the dropdown. -->
		<div class="hidden md:block" @mouseenter="megaOpen && openMega()" @mouseleave="scheduleCloseMega">
			<HeaderMegaMenu :id="MEGA_MENU_ID" :open="megaOpen" @close="closeMega" />
		</div>
	</header>
</template>
