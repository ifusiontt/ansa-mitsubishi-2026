<script setup lang="ts">
export interface SocialLink {
	service: string;
	url: string;
}

export interface NavigationItem {
	id: string;
	title: string;
	url?: string | null;
	page?: {
		permalink?: string | null;
	};
}

export interface FooterProps {
	/** Still passed by the layout (it gates rendering); the footer columns below are a fixed sitemap. */
	navigation: {
		items: NavigationItem[];
	};
	globals: {
		logo?: string | null;
		logo_dark_mode?: string | null;
		description?: string | null;
		social_links?: SocialLink[] | null;
	};
}

const props = defineProps<FooterProps>();
const runtimeConfig = useRuntimeConfig();
const { open: openTestDrive } = useTestDriveModal();

// Using template ref to expose the footer to the layout for visual editing
const footerRef = useTemplateRef('footerRef');
defineExpose({ footerRef });

const lightLogoUrl = computed(() =>
	props.globals.logo ? `${runtimeConfig.public.directusUrl}/assets/${props.globals.logo}` : '/images/logo.svg',
);

const darkLogoUrl = computed(() =>
	props.globals.logo_dark_mode ? `${runtimeConfig.public.directusUrl}/assets/${props.globals.logo_dark_mode}` : '',
);

// The footer is always pitch-black: prefer the dark-mode logo, else force the default white.
const footerLogoUrl = computed(() => darkLogoUrl.value || lightLogoUrl.value);
const forceWhiteLogo = computed(() => !darkLogoUrl.value);

const distributorStatement = computed(
	() => props.globals.description || 'ANSA Motors is the authorised distributor of Mitsubishi Motors vehicles in Trinidad & Tobago.',
);

/** Footer socials, in this order, from globals.social_links. */
const SOCIAL_SERVICES = ['facebook', 'instagram', 'x'];
const SOCIAL_LABELS: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', x: 'X' };
const socials = computed(() =>
	SOCIAL_SERVICES.map((service) => props.globals.social_links?.find((link) => link.service === service)).filter(
		(link): link is SocialLink => !!link?.url,
	),
);

const MODEL_LINKS = [
	{ label: 'All-New Triton', to: '/showroom/triton' },
	{ label: 'Outlander Sport', to: '/showroom/outlander-sport' },
	{ label: 'Xpander Cross', to: '/showroom/xpander-cross' },
];

const CARE_LINKS = [
	{ label: 'Book a Service', to: '/service' },
	{ label: 'Genuine Parts Counter', to: '/parts' },
	{ label: '5-Year Warranty', to: '/service' },
	{ label: 'Factory Diagnostics', to: '/service' },
	{ label: 'FAQs', to: '/about#faq' },
];

/** Branch addresses as held in the Directus `dealers` collection (directus/seeds/). */
const LOCATIONS = [
	{ name: 'Port of Spain', address: 'Corner Richmond & Duke Streets' },
	{ name: 'San Fernando', address: 'Royal Road' },
	{ name: 'Chaguanas', address: 'Brentwood Commercial Center, Chaguanas Main Road' },
	{ name: 'Tobago', address: 'Milford Road, Scarborough' },
];

const headingClass = 'text-xs font-bold uppercase tracking-widest text-white';
const linkClass = 'text-sm text-zinc-400 transition-colors hover:text-brand-red focus-visible:text-brand-red focus-visible:outline-none';
</script>

<template>
	<footer v-if="globals" ref="footerRef" class="border-t border-neutral-900 bg-black py-16 text-white">
		<Container class="text-white">
			<div class="grid grid-cols-1 gap-12 pt-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr] lg:gap-10">
				<!-- Brand -->
				<div>
					<NuxtLink to="/" class="inline-block transition-opacity hover:opacity-70" aria-label="ANSA Mitsubishi home">
						<img
							:src="footerLogoUrl"
							alt="Mitsubishi Motors — Drive your Ambition"
							class="h-auto w-[120px]"
							:class="{ 'brightness-0 invert': forceWhiteLogo }"
						/>
					</NuxtLink>
					<!-- The logo artwork carries the "Drive your Ambition" strapline, so it is not repeated as text. -->
					<p class="mt-5 max-w-xs text-sm leading-relaxed text-zinc-400">{{ distributorStatement }}</p>

					<div class="mt-6 flex items-center gap-3">
						<a
							v-for="social in socials"
							:key="social.service"
							:href="social.url"
							target="_blank"
							rel="noopener noreferrer"
							:aria-label="`ANSA Mitsubishi on ${SOCIAL_LABELS[social.service]}`"
							class="inline-flex size-9 items-center justify-center rounded-full border border-neutral-800 transition-colors hover:border-brand-red"
						>
							<img :src="`/icons/social/${social.service}.svg`" alt="" class="size-4 invert" />
						</a>
						<ThemeToggle class-name="!border-neutral-700 !bg-transparent text-white hover:text-brand-red" />
					</div>
				</div>

				<!-- Showroom Models -->
				<nav aria-labelledby="footer-models">
					<h2 id="footer-models" :class="headingClass">Showroom Models</h2>
					<ul class="mt-5 space-y-3">
						<li v-for="link in MODEL_LINKS" :key="link.to">
							<NuxtLink :to="link.to" :class="linkClass">{{ link.label }}</NuxtLink>
						</li>
						<li>
							<button type="button" :class="linkClass" @click="openTestDrive()">Book a Test Drive</button>
						</li>
					</ul>
				</nav>

				<!-- Care & Ownership -->
				<nav aria-labelledby="footer-care">
					<h2 id="footer-care" :class="headingClass">Care &amp; Ownership</h2>
					<ul class="mt-5 space-y-3">
						<li v-for="link in CARE_LINKS" :key="link.label">
							<NuxtLink :to="link.to" :class="linkClass">{{ link.label }}</NuxtLink>
						</li>
					</ul>
				</nav>

				<!-- Locations & Hours -->
				<div>
					<h2 :class="headingClass">Locations &amp; Hours</h2>
					<address class="mt-5 space-y-3 text-sm not-italic leading-relaxed text-zinc-400">
						<ul class="space-y-3">
							<li v-for="location in LOCATIONS" :key="location.name">
								<span class="block font-semibold text-white">{{ location.name }}</span>
								{{ location.address }}
							</li>
						</ul>
						<p class="border-t border-neutral-900 pt-3">
							<span class="block text-xs font-bold uppercase tracking-widest text-white">Direct Line</span>
							<a href="tel:+18686257231" class="text-white transition-colors hover:text-brand-red">+1 (868) 625-7231</a>
						</p>
						<p>
							<span class="block">Mon–Fri 8:00 AM – 4:30 PM</span>
							<span class="block">Sat 8:30 AM – 12:30 PM</span>
						</p>
					</address>
				</div>
			</div>

			<!-- Copyright bar -->
			<div class="mt-12 flex flex-col justify-between gap-4 border-t border-neutral-900 pt-8 md:flex-row md:items-center">
				<p class="text-xs text-zinc-500">&copy; 2026 ANSA Motors Trinidad &amp; Tobago. All rights reserved.</p>
				<ul class="flex flex-wrap gap-x-6 gap-y-2 text-xs">
					<li><NuxtLink to="/contact" class="text-zinc-500 transition-colors hover:text-brand-red">Contact</NuxtLink></li>
					<li><a href="mailto:mitsubishi.pos@ansamcl.com" class="text-zinc-500 transition-colors hover:text-brand-red">mitsubishi.pos@ansamcl.com</a></li>
				</ul>
			</div>
		</Container>
	</footer>
</template>
