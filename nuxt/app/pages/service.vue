<script setup lang="ts">
import PartsServicePage from '~/components/layout/PartsServicePage.vue';
import ServiceBookingForm from '~/components/forms/ServiceBookingForm.vue';

/**
 * /service — Service Centre tab: trust badge strip above the content, and a roadside-assistance
 * hotline card above the booking form. `?vehicle=<model>` pre-selects the vehicle (e.g. from showroom CTAs).
 */
const vehicleModel = useInquiryVehicleQuery();

const TRUST_BADGES = [
	{ icon: 'lucide:scan-line', title: 'Factory Diagnostics', detail: 'Mitsubishi diagnostic tooling' },
	{ icon: 'lucide:shield-check', title: '100% Genuine Parts', detail: 'OEM parts on every job' },
	{ icon: 'lucide:badge-check', title: 'Certified Techs', detail: 'Factory-trained technicians' },
	{ icon: 'lucide:award', title: '5-Year Warranty', detail: '5 years / 100,000 km' },
];
</script>

<template>
	<PartsServicePage
		tab="service"
		permalink="/service"
		title="Service Centre"
		description="Factory-trained technicians, Mitsubishi diagnostics and genuine parts — book your next service with ANSA Motors."
	>
		<template #lead>
			<ul class="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Why service with ANSA Motors">
				<li
					v-for="badge in TRUST_BADGES"
					:key="badge.title"
					class="flex items-center gap-4 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm md:p-5 dark:border-zinc-800 dark:bg-zinc-900/80"
				>
					<span class="grid size-11 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red" aria-hidden="true">
						<Icon :name="badge.icon" class="size-5" />
					</span>
					<span class="min-w-0">
						<span class="block text-sm font-bold text-zinc-900 dark:text-white">{{ badge.title }}</span>
						<span class="block text-xs text-zinc-500 dark:text-zinc-400">{{ badge.detail }}</span>
					</span>
				</li>
			</ul>
		</template>

		<aside class="mb-6 overflow-hidden rounded-2xl bg-zinc-950 p-6 text-white shadow-xl ring-1 ring-zinc-800" aria-labelledby="roadside-heading">
			<div class="flex items-start gap-4">
				<span class="relative grid size-11 shrink-0 place-items-center rounded-full bg-brand-red" aria-hidden="true">
					<span class="absolute inset-0 animate-ping rounded-full bg-brand-red/40 motion-reduce:hidden" />
					<Icon name="lucide:siren" class="relative size-5" />
				</span>
				<div class="min-w-0">
					<h2 id="roadside-heading" class="text-base font-bold leading-snug md:text-lg">Need Immediate Roadside Assistance?</h2>
					<p class="mt-1 text-sm text-zinc-400">Breakdown, flat tyre or lockout — call our hotline now.</p>
					<a
						href="tel:+18686257231"
						class="mt-4 inline-flex items-center gap-2 rounded-md bg-brand-red px-5 py-3 text-sm font-bold tracking-wide text-white transition-colors hover:bg-brand-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
					>
						<Icon name="lucide:phone" class="size-4" aria-hidden="true" />
						+1 (868) 625-7231
					</a>
				</div>
			</div>
		</aside>

		<ServiceBookingForm :vehicle-model="vehicleModel" />
	</PartsServicePage>
</template>
