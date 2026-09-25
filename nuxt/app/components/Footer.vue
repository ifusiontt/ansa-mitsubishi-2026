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

// Using template ref to expose the footer to the layout for visual editing
const footerRef = useTemplateRef('footerRef');
defineExpose({ footerRef });

const lightLogoUrl = computed(() =>
	props.globals.logo ? `${runtimeConfig.public.directusUrl}/assets/${props.globals.logo}` : '/images/logo.svg',
);

const darkLogoUrl = computed(() =>
	props.globals.logo_dark_mode ? `${runtimeConfig.public.directusUrl}/assets/${props.globals.logo_dark_mode}` : '',
);
</script>

<template>
	<footer v-if="globals" ref="footerRef" class="bg-gray dark:bg-[var(--background-variant-color)] py-16">
		<Container class="text-foreground dark:text-white">
			<div class="flex flex-col md:flex-row justify-between items-start gap-8 pt-8">
				<div class="flex-1">
					<NuxtLink to="/" class="inline-block transition-opacity hover:opacity-70">
						<img
							v-if="lightLogoUrl"
							:src="lightLogoUrl"
							alt="Logo"
							:class="['w-[120px] h-auto', darkLogoUrl ? 'dark:hidden' : '']"
						/>
						<img
							v-if="darkLogoUrl"
							:src="darkLogoUrl"
							alt="Logo (Dark Mode)"
							class="w-[120px] h-auto hidden dark:block"
						/>
					</NuxtLink>

					<p v-if="props.globals.description" class="text-description mt-2">
						{{ props.globals.description }}
					</p>

					<!-- Social Links -->
					<div v-if="props.globals.social_links?.length" class="mt-4 flex space-x-4">
						<a
							v-for="social in props.globals.social_links"
							:key="social.service"
							:href="social.url"
							target="_blank"
							rel="noopener noreferrer"
							class="size-8 rounded bg-transparent inline-flex items-center justify-center transition-colors hover:opacity-70"
						>
							<img
								:src="`/icons/social/${social.service}.svg`"
								:alt="`${social.service} icon`"
								class="size-6 dark:invert"
							/>
						</a>
					</div>
				</div>

				<div class="flex flex-col items-start md:items-end flex-1">
					<nav v-if="props.navigation.items?.length" class="w-full md:w-auto text-left">
						<ul class="space-y-4">
							<li v-for="item in props.navigation.items" :key="item.id">
								<NuxtLink
									v-if="item.page?.permalink"
									:to="item.page.permalink"
									class="text-nav font-medium hover:underline"
								>
									{{ item.title }}
								</NuxtLink>
								<a v-else :href="item.url || '#'" class="text-nav font-medium hover:underline">
									{{ item.title }}
								</a>
							</li>
						</ul>
						<ThemeToggle class="dark:text-white mt-4" />
					</nav>
				</div>
			</div>

				<!-- Dealer contact + copyright -->
				<div
					class="mt-12 pt-8 border-t border-gray-muted/40 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
				>
					<address class="not-italic text-sm leading-relaxed text-gray-dark dark:text-gray-muted">
						<span
							class="block font-heading font-semibold tracking-wider uppercase text-xs text-foreground dark:text-white mb-1"
						>
							ANSA Motors Trinidad &amp; Tobago
						</span>
						Corner Richmond &amp; Duke Streets, Port of Spain, Trinidad &amp; Tobago
						<span class="block">
							<a href="tel:+18686257231" class="hover:text-accent">+1 (868) 625-7231</a>
							<span aria-hidden="true" class="mx-2">·</span>
							<a href="mailto:mitsubishi.pos@ansamcl.com" class="hover:text-accent">mitsubishi.pos@ansamcl.com</a>
						</span>
						<span class="block">Mon–Fri 8:00 AM – 4:30 PM · Sat 8:30 AM – 12:30 PM</span>
					</address>

					<p class="text-xs text-gray-dark/80 dark:text-gray-muted md:text-right">
						&copy; 2026 ANSA Motors Trinidad &amp; Tobago. All rights reserved.
					</p>
				</div>
		</Container>
	</footer>
</template>
