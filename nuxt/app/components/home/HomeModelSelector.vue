<script setup lang="ts">
import type { VehicleSummary } from '#shared/types/vehicle';
import { estimateMonthlyPayment } from '#shared/types/contact';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/**
 * Fleet strip: side-profile cutouts (menu_image, falling back to hero media), prices and showroom links.
 *
 * Cutouts share one studio framing (4000x2800 canvas, car ~69% wide between ~24% and ~74% of the
 * height — directus/seeds/add-vehicle-menu-image.mjs normalises any that differ), so the stage
 * sizes the image by that framing: every car fills ~90% of the fixed-height stage, tyres on the
 * contact shadow, at the same scale.
 *
 * The vehicle_colors renders share that framing, so the swatch row under the stage swaps the
 * image in place; each card keeps its own selection (first swatch by default). The render does not
 * scale on hover, so the car stays put while a swatch is picked.
 *
 * Under the swatches, a permanent quick-spec bar built from the vehicle's Directus data: seats,
 * drivetrain and engine across its published trims. Each card is a stretched link to the
 * showroom page; controls above it (relative z-10) stay clickable: the swatches, an estimated monthly
 * payment whose "Calculate" opens the two-step financing modal, a steering-wheel quick action that
 * opens the test-drive modal, and "+ Full Specs", which opens the global Quick Specs modal.
 */
defineProps<{ vehicles: VehicleSummary[] }>();

const imageUrl = (id: string) => (id ? `${getDirectusAssetURL(id)}?width=960&quality=82&format=webp` : '');
const cutoutUrl = (vehicle: VehicleSummary) => imageUrl(directusFileId(vehicle.menu_image) || directusFileId(vehicle.hero_block?.media));

const swatches = (vehicle: VehicleSummary) => [...(vehicle.colors ?? [])].sort((a, b) => a.sort - b.sort);

/** Selected swatch index per vehicle slug. */
const activeColor = reactive<Record<string, number>>({});
const activeIndex = (vehicle: VehicleSummary) => activeColor[vehicle.slug] ?? 0;

/** The selected colour's render, falling back to the cutout when the colour has none. */
const stageUrl = (vehicle: VehicleSummary) => imageUrl(directusFileId(swatches(vehicle)[activeIndex(vehicle)]?.image)) || cutoutUrl(vehicle);

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

/** Standard terms (10% down, 60 months, fixed APR) on the starting price. */
const estimatedMonthly = (vehicle: VehicleSummary) => (vehicle.starting_price ? estimateMonthlyPayment(vehicle.starting_price) : 0);

const { open: openLeadModal } = useTestDriveModal();
const { open: openQuickSpecs } = useQuickSpecsModal();
const { open: openFinancingModal } = useFinancingModal();

const openTestDrive = (vehicle: VehicleSummary) => openLeadModal({ slug: vehicle.slug, title: vehicle.title });

function openFinancing(vehicle: VehicleSummary) {
	if (!vehicle.starting_price) return;
	openFinancingModal({ slug: vehicle.slug, title: vehicle.title, price: vehicle.starting_price });
}
</script>

<template>
	<section
		id="models"
		class="scroll-mt-20 bg-[#F6F7F9] py-12 text-neutral-950 dark:bg-black dark:text-white md:py-24 lg:py-32"
		aria-labelledby="home-models-heading"
	>
		<div class="mx-auto max-w-6xl px-4 sm:px-6">
			<p class="text-xs font-bold uppercase tracking-[0.3em] text-brand-red">The Lineup</p>
			<h2 id="home-models-heading" class="mt-3 text-3xl font-black uppercase tracking-tight md:text-5xl">Find your Mitsubishi</h2>
			<p class="mt-4 max-w-2xl text-base leading-relaxed tracking-wide text-neutral-600 dark:text-neutral-400 md:text-lg">
				Engineered for performance, capability, and reliability across Trinidad &amp; Tobago.
			</p>

			<ul class="mt-10 flex flex-wrap justify-center gap-6 md:mt-14">
				<li v-for="vehicle in vehicles" :key="vehicle.id" class="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc((100%-3rem)/3)]">
					<article
						class="group relative flex h-full min-h-[420px] md:min-h-[480px] flex-col justify-between overflow-hidden rounded-xl border border-t-2 border-neutral-200/80 border-t-brand-red bg-white shadow-sm transition-all duration-300 focus-within:ring-2 focus-within:ring-brand-red hover:-translate-y-1.5 hover:shadow-xl dark:border-neutral-800 dark:border-t-brand-red dark:bg-neutral-900"
					>
						<!-- Studio stage -->
						<div class="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-b from-neutral-100/70 to-transparent p-4 md:h-52 md:p-6 dark:from-neutral-800/50">
							<div class="relative h-full w-full">
								<div
									class="absolute inset-x-0 bottom-[-2%] mx-auto h-5 w-[85%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.1)_45%,transparent_72%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.8)_0%,transparent_72%)]"
									aria-hidden="true"
								/>
								<img
									v-if="stageUrl(vehicle)"
									:src="stageUrl(vehicle)"
									:alt="[vehicle.title, swatches(vehicle)[activeIndex(vehicle)]?.color_name].filter(Boolean).join(' in ')"
									loading="lazy"
									class="absolute left-1/2 top-[-38%] h-[180%] w-auto max-w-none -translate-x-1/2"
								/>
							</div>
						</div>

						<!-- Colour swatches: above the stretched link, swap the stage render in place -->
						<div
							v-if="swatches(vehicle).length > 1"
							class="relative z-10 flex justify-center gap-2.5 px-4 pt-4"
							role="group"
							:aria-label="`${shortName(vehicle.title)} colours`"
						>
							<button
								v-for="(color, index) in swatches(vehicle)"
								:key="color.color_name"
								type="button"
								class="h-3.5 w-3.5 rounded-full border border-black/15 shadow-inner transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
								:class="index === activeIndex(vehicle) ? 'scale-110 ring-2 ring-brand-red ring-offset-2 ring-offset-white dark:ring-offset-neutral-900' : ''"
								:style="{ backgroundColor: color.hex_code }"
								:title="color.color_name"
								:aria-label="color.color_name"
								:aria-pressed="index === activeIndex(vehicle)"
								@click="activeColor[vehicle.slug] = index"
							/>
						</div>

						<!-- Quick specs: a permanent, muted bar under the swatches -->
						<dl
							v-if="quickSpecs(vehicle).length"
							class="mx-4 mt-3 flex items-center justify-center gap-3 border-y border-zinc-100 py-1.5 text-xs text-zinc-500 md:mx-6 dark:border-zinc-800 dark:text-zinc-400"
							data-quick-specs
						>
							<div v-for="spec in quickSpecs(vehicle)" :key="spec.term" class="flex items-center gap-1.5 whitespace-nowrap">
								<dt class="sr-only">{{ spec.term }}</dt>
								<Icon :name="spec.icon" class="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
								<dd>{{ spec.label }}</dd>
							</div>
						</dl>

						<div class="flex flex-1 flex-col p-4 md:p-6">
							<span
								v-if="vehicle.category"
								class="mb-3 w-fit rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
							>
								{{ vehicle.category }}
							</span>
							<h3 class="text-xl font-bold text-neutral-950 dark:text-white">{{ vehicle.title }}</h3>
							<p v-if="vehicle.model_year" class="mt-1 text-xs uppercase tracking-widest text-neutral-400">{{ vehicle.model_year }} model</p>
							<template v-if="vehicle.starting_price">
								<p class="mt-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">From {{ formatTtdPrice(vehicle.starting_price) }}</p>
								<!-- Financing hook: standard-terms estimate; "Calculate" (above the stretched link) opens the financing modal -->
								<p class="mb-4 mt-1 flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
									Est. {{ formatTtdPrice(Math.round(estimatedMonthly(vehicle))) }}/mo
									<button
										type="button"
										class="relative z-10 inline-flex cursor-pointer items-center gap-1 font-semibold text-brand-red hover:underline focus:outline-none focus-visible:underline"
										:aria-label="`Calculate financing for the ${vehicle.title}`"
										@click="openFinancing(vehicle)"
									>
										<Icon name="lucide:calculator" class="size-3.5" aria-hidden="true" />
										Calculate
									</button>
								</p>
							</template>

							<div class="mt-auto">
								<div class="flex items-center gap-2">
									<!-- Stretched link: its ::after covers the card, so the whole card opens the showroom page -->
									<NuxtLink
										:to="`/showroom/${vehicle.slug}`"
										class="block min-w-0 flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-center text-sm font-medium text-neutral-800 transition-colors after:absolute after:inset-0 after:content-[''] hover:text-brand-red focus:outline-none group-hover:border-brand-red group-hover:text-brand-red dark:border-neutral-700 dark:text-white"
									>
										Explore {{ shortName(vehicle.title) }}
									</NuxtLink>
									<!-- Quick action above the stretched link (relative z-10): book a test drive without leaving the page -->
									<TooltipProvider :delay-duration="150">
										<Tooltip>
											<TooltipTrigger as-child>
												<button
													type="button"
													class="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-brand-red/30 bg-red-50/60 text-brand-red shadow-sm transition-all duration-200 hover:border-brand-red hover:bg-brand-red hover:text-white hover:shadow-md focus:outline-none focus-visible:border-brand-red focus-visible:bg-brand-red focus-visible:text-white focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 dark:bg-brand-red/10 dark:text-red-400 dark:hover:text-white dark:focus-visible:ring-offset-neutral-900"
													:aria-label="`Book Test Drive for ${shortName(vehicle.title)}`"
													@click="openTestDrive(vehicle)"
												>
													<!-- Steering wheel: rim, hub and three spokes -->
													<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
														<circle cx="12" cy="12" r="9" />
														<circle cx="12" cy="12" r="2" />
														<path d="M3.5 10.5 10 12M20.5 10.5 14 12M12 14v7" />
													</svg>
												</button>
											</TooltipTrigger>
											<TooltipContent side="top" class="border-zinc-800 bg-zinc-900 text-xs font-semibold text-white">
												Book a test drive
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
								<!-- Sits above the stretched link (relative z-10); opens the Quick Specs modal -->
								<button
									type="button"
									class="relative z-10 mt-3 block w-full text-center text-xs font-semibold text-neutral-500 transition-colors hover:text-black focus:outline-none focus-visible:underline dark:hover:text-white"
									:aria-label="`Quick specifications for the ${vehicle.title}`"
									@click="openQuickSpecs(vehicle)"
								>
									+ Full Specs
								</button>
							</div>
						</div>
					</article>
				</li>
			</ul>
		</div>
	</section>
</template>
