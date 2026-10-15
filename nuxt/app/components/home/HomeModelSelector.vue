<script setup lang="ts">
import type { VehicleSummary } from '#shared/types/vehicle';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Fleet strip: side-profile cutouts (menu_image, falling back to hero media), prices and showroom links.
 *
 * Cutouts share one studio framing (4000x2800 canvas, car ~69% wide between ~24% and ~74% of the
 * height — directus/seeds/add-vehicle-menu-image.mjs normalises any that differ), so the stage
 * sizes the image by that framing: every car fills ~90% of the fixed-height stage, tyres on the
 * contact shadow, at the same scale.
 *
 * Hover (or keyboard focus) slides up a quick-spec panel built from the vehicle's Directus data:
 * seats, drivetrain and engine across its published trims. Each card is a stretched link to the
 * showroom page, with a separate link to that page's Key Specifications section.
 */
defineProps<{ vehicles: VehicleSummary[] }>();

const cutoutUrl = (vehicle: VehicleSummary) => {
	const id = directusFileId(vehicle.menu_image) || directusFileId(vehicle.hero_block?.media);
	return id ? `${getDirectusAssetURL(id)}?width=960&quality=82&format=webp` : '';
};

const unique = (values: (string | null | undefined)[]) => [...new Set(values.filter((v): v is string => !!v))];

/** Up to three quick specs, e.g. "5 Seats" · "4WD" · "2.4L Turbo Diesel"; a spec without data is skipped. */
function quickSpecs(vehicle: VehicleSummary) {
	const trims = (vehicle.trims ?? []).filter((trim) => trim.status === 'published');
	// "4WD (Super Select 4WD-II)" → "4WD"
	const drivetrains = unique(trims.map((trim) => trim.drivetrain?.split(' (')[0]?.trim()));
	// "2.0L MIVEC 4-Cylinder (…)" → "2.0"
	const litres = unique(trims.map((trim) => trim.engine?.match(/(\d\.\d)\s*L/)?.[1])).sort();
	const engine = litres.length ? `${litres[0]}${litres.length > 1 ? `–${litres.at(-1)}` : ''}L ${vehicle.fuel_type ?? ''}`.trim() : '';

	return [
		vehicle.seating_capacity ? { term: 'Seating', icon: 'lucide:users', label: `${vehicle.seating_capacity} Seats` } : null,
		drivetrains.length ? { term: 'Drivetrain', icon: 'lucide:settings-2', label: drivetrains.join(' / ') } : null,
		engine ? { term: 'Engine', icon: 'lucide:fuel', label: engine } : null,
	].filter((spec): spec is { term: string; icon: string; label: string } => !!spec);
}

const shortName = (title: string) => title.replace(/^Mitsubishi\s+/, '');
</script>

<template>
	<section
		id="models"
		class="scroll-mt-20 bg-[#F6F7F9] py-24 text-neutral-950 dark:bg-black dark:text-white md:py-32"
		aria-labelledby="home-models-heading"
	>
		<div class="mx-auto max-w-6xl px-4 sm:px-6">
			<p class="text-xs font-bold uppercase tracking-[0.3em] text-brand-red">The Lineup</p>
			<h2 id="home-models-heading" class="mt-3 text-3xl font-black uppercase tracking-tight md:text-5xl">Find your Mitsubishi</h2>
			<p class="mt-4 max-w-2xl text-base leading-relaxed tracking-wide text-neutral-600 dark:text-neutral-400 md:text-lg">
				Engineered for performance, capability, and reliability across Trinidad &amp; Tobago.
			</p>

			<ul class="mt-14 flex flex-wrap justify-center gap-6">
				<li v-for="vehicle in vehicles" :key="vehicle.id" class="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc((100%-3rem)/3)]">
					<article
						class="group relative flex h-full min-h-[480px] flex-col justify-between overflow-hidden rounded-xl border border-t-2 border-neutral-200/80 border-t-brand-red bg-white shadow-sm transition-all duration-300 focus-within:ring-2 focus-within:ring-brand-red hover:-translate-y-1.5 hover:shadow-xl dark:border-neutral-800 dark:border-t-brand-red dark:bg-neutral-900"
					>
						<!-- Studio stage -->
						<div class="relative flex h-52 items-center justify-center overflow-hidden bg-gradient-to-b from-neutral-100/70 to-transparent p-6 dark:from-neutral-800/50">
							<div class="relative h-full w-full">
								<div
									class="absolute inset-x-0 bottom-[-2%] mx-auto h-5 w-[85%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.1)_45%,transparent_72%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.8)_0%,transparent_72%)]"
									aria-hidden="true"
								/>
								<img
									v-if="cutoutUrl(vehicle)"
									:src="cutoutUrl(vehicle)"
									:alt="vehicle.title"
									loading="lazy"
									class="absolute left-1/2 top-[-38%] h-[180%] w-auto max-w-none -translate-x-1/2 origin-[50%_74%] transition-transform duration-500 group-hover:scale-105"
								/>
							</div>

							<!-- Quick-spec reveal -->
							<dl
								v-if="quickSpecs(vehicle).length"
								class="absolute inset-x-0 bottom-0 flex translate-y-full justify-around gap-2 bg-black/75 p-3 text-xs font-medium text-white backdrop-blur-md transition-transform duration-300 ease-out group-focus-within:translate-y-0 group-hover:translate-y-0 motion-reduce:transition-none"
								data-quick-specs
							>
								<div v-for="spec in quickSpecs(vehicle)" :key="spec.term" class="flex items-center gap-1.5 text-center">
									<dt class="sr-only">{{ spec.term }}</dt>
									<Icon :name="spec.icon" class="h-3.5 w-3.5 shrink-0 text-brand-red" aria-hidden="true" />
									<dd>{{ spec.label }}</dd>
								</div>
							</dl>
						</div>

						<div class="flex flex-1 flex-col p-6">
							<span
								v-if="vehicle.category"
								class="mb-3 w-fit rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
							>
								{{ vehicle.category }}
							</span>
							<h3 class="text-xl font-bold text-neutral-950 dark:text-white">{{ vehicle.title }}</h3>
							<p v-if="vehicle.model_year" class="mt-1 text-xs uppercase tracking-widest text-neutral-400">{{ vehicle.model_year }} model</p>
							<p v-if="vehicle.starting_price" class="mb-4 mt-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
								From {{ formatTtdPrice(vehicle.starting_price) }}
							</p>

							<div class="mt-auto">
								<!-- Stretched link: its ::after covers the card, so the whole card opens the showroom page -->
								<NuxtLink
									:to="`/showroom/${vehicle.slug}`"
									class="block w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-center text-sm font-medium text-neutral-800 transition-colors after:absolute after:inset-0 after:content-[''] hover:text-brand-red focus:outline-none group-hover:border-brand-red group-hover:text-brand-red dark:border-neutral-700 dark:text-white"
								>
									Explore {{ shortName(vehicle.title) }}
								</NuxtLink>
								<!-- Sits above the stretched link (relative z-10) -->
								<NuxtLink
									:to="`/showroom/${vehicle.slug}#specs`"
									class="relative z-10 mt-3 block w-full text-center text-xs font-semibold text-neutral-500 transition-colors hover:text-black focus:outline-none focus-visible:underline dark:hover:text-white"
									:aria-label="`Full specifications for the ${vehicle.title}`"
								>
									+ Full Specs
								</NuxtLink>
							</div>
						</div>
					</article>
				</li>
			</ul>
		</div>
	</section>
</template>
