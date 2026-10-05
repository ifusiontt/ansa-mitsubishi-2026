<script setup lang="ts">
import type { Dealer } from '#shared/types/schema';

/**
 * Closing CTA with quick branch links. Phone / map details come from the
 * published `dealers` collection (matched by slug); a branch without a dealer
 * record links to /contact instead.
 */
const BRANCHES = [
	{ slug: 'port-of-spain', label: 'Port of Spain' },
	{ slug: 'san-fernando', label: 'San Fernando' },
	{ slug: 'chaguanas', label: 'Chaguanas' },
	{ slug: 'tobago', label: 'Tobago' },
];

// Supplementary data: a failed fetch just leaves the plain /contact links.
const { data: dealers } = useFetch<Dealer[]>('/api/dealers', { key: 'dealers', default: () => [], lazy: true });

const branches = computed(() =>
	BRANCHES.map((branch) => {
		const dealer = dealers.value?.find((d) => d.slug === branch.slug);
		return {
			...branch,
			phone: dealer?.phone ?? null,
			href: dealer?.google_maps_url || '/contact',
			external: !!dealer?.google_maps_url,
		};
	}),
);
</script>

<template>
	<section class="bg-black pb-20 pt-8 text-white lg:pb-28" aria-labelledby="home-contact-heading">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16">
			<div class="relative overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-950 p-8 md:p-14">
				<div class="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#C3002F]/20 blur-3xl" aria-hidden="true" />

				<div class="relative grid gap-10 lg:grid-cols-2 lg:items-center">
					<div>
						<h2 id="home-contact-heading" class="text-3xl font-black uppercase tracking-tight md:text-4xl">Ready when you are</h2>
						<p class="mt-4 max-w-md text-neutral-400">Book a test drive, talk financing or schedule a service at your nearest ANSA Motors branch.</p>
						<div class="mt-8 flex flex-wrap gap-4">
							<NuxtLink
								:to="{ path: '/contact', query: { intent: 'sales' } }"
								class="inline-block rounded-md bg-[#C3002F] px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#a30027] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
							>
								Contact us
							</NuxtLink>
							<NuxtLink
								to="/service"
								class="inline-block rounded-md border border-white/40 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-white hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
							>
								Book a service
							</NuxtLink>
						</div>
					</div>

					<ul class="grid gap-3 sm:grid-cols-2">
						<li v-for="branch in branches" :key="branch.slug">
							<NuxtLink
								:to="branch.href"
								:external="branch.external"
								:target="branch.external ? '_blank' : undefined"
								:rel="branch.external ? 'noopener' : undefined"
								class="group flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-black px-5 py-4 transition-colors hover:border-[#C3002F]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C3002F]"
							>
								<span>
									<span class="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
										<Icon name="lucide:map-pin" class="h-4 w-4 text-[#C3002F]" />
										{{ branch.label }}
									</span>
									<span v-if="branch.phone" class="mt-1 block text-xs text-neutral-500">{{ branch.phone }}</span>
								</span>
								<Icon name="lucide:arrow-up-right" class="h-4 w-4 text-neutral-600 transition-colors group-hover:text-white" />
							</NuxtLink>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</section>
</template>
