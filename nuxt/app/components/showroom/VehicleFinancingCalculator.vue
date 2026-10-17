<script setup lang="ts">
import {
	FINANCE_APR,
	FINANCE_DEFAULT_DEPOSIT_PERCENT,
	FINANCE_DEFAULT_TERM_MONTHS,
	FINANCE_TERMS,
	estimateMonthlyPayment,
} from '#shared/types/contact';

/**
 * Financing estimator for /showroom/[slug]: deposit and term sliders against a fixed illustrative
 * APR, with the standard amortisation formula M = P·r(1+r)^n / ((1+r)^n − 1), r = APR / 12.
 * `basePrice` follows the trim selected on the page (falling back to the starting price), so the
 * estimate updates as the customer picks a trim. "Apply for Pre-Approval" opens the global lead
 * modal in financing mode, carrying the current estimate into the `financing_inquiry` submission.
 */
const props = defineProps<{
	basePrice: number;
	vehicleSlug: string;
	vehicleTitle: string;
	/** Trim the price belongs to, shown under the estimate and passed to the modal. */
	trimName?: string;
}>();

const INTEREST_RATE = FINANCE_APR; // % APR, ANSA Merchant Bank (illustrative)
const TERMS = FINANCE_TERMS;

const depositPercent = ref(FINANCE_DEFAULT_DEPOSIT_PERCENT);
const termMonths = ref<number>(FINANCE_DEFAULT_TERM_MONTHS);

const deposit = computed(() => Math.round((props.basePrice * depositPercent.value) / 100));
const principal = computed(() => props.basePrice - deposit.value);

const monthlyPayment = computed(() => estimateMonthlyPayment(props.basePrice, depositPercent.value, termMonths.value, INTEREST_RATE));

const totalInterest = computed(() => monthlyPayment.value * termMonths.value - principal.value);

const ttd = (value: number) => `TTD $${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value))}`;

const { open: openLeadModal } = useTestDriveModal();

function applyForPreApproval() {
	openLeadModal({
		mode: 'financing',
		slug: props.vehicleSlug,
		title: props.vehicleTitle,
		trim: props.trimName,
		financing: {
			price: props.basePrice,
			depositPercent: depositPercent.value,
			termMonths: termMonths.value,
			monthlyPayment: monthlyPayment.value,
		},
	});
}
</script>

<template>
	<div class="rounded-3xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900/60">
		<div class="grid gap-10 lg:grid-cols-2 lg:gap-16">
			<!-- Inputs -->
			<div class="space-y-10">
				<div>
					<div class="flex items-baseline justify-between gap-4">
						<label for="finance-deposit" class="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Deposit</label>
						<p class="text-sm font-bold text-zinc-900 dark:text-white">
							{{ depositPercent }}% <span class="font-medium text-zinc-500 dark:text-zinc-400">· {{ ttd(deposit) }}</span>
						</p>
					</div>
					<input
						id="finance-deposit"
						v-model.number="depositPercent"
						type="range"
						min="10"
						max="50"
						step="5"
						class="mt-4 w-full cursor-pointer accent-brand-red"
						:aria-valuetext="`${depositPercent}% deposit, ${ttd(deposit)}`"
					/>
					<div class="mt-1 flex justify-between text-[11px] font-medium text-zinc-400" aria-hidden="true">
						<span>10%</span>
						<span>50%</span>
					</div>
				</div>

				<div>
					<div class="flex items-baseline justify-between gap-4">
						<label for="finance-term" class="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Loan Term</label>
						<p class="text-sm font-bold text-zinc-900 dark:text-white">
							{{ termMonths }} months <span class="font-medium text-zinc-500 dark:text-zinc-400">· {{ termMonths / 12 }} years</span>
						</p>
					</div>
					<input
						id="finance-term"
						v-model.number="termMonths"
						type="range"
						:min="TERMS[0]"
						:max="TERMS.at(-1)"
						step="12"
						class="mt-4 w-full cursor-pointer accent-brand-red"
						:aria-valuetext="`${termMonths} months`"
					/>
					<div class="mt-1 flex justify-between text-[11px] font-medium text-zinc-400" aria-hidden="true">
						<span v-for="term in TERMS" :key="term">{{ term }}</span>
					</div>
				</div>

				<p class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
					<Icon name="lucide:landmark" class="size-4 text-brand-red" aria-hidden="true" />
					Fixed <strong class="font-bold text-zinc-900 dark:text-white">{{ INTEREST_RATE }}% APR</strong> with ANSA Merchant Bank
				</p>
			</div>

			<!-- Result -->
			<div class="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8 dark:border-zinc-800 dark:bg-zinc-900">
				<p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Estimated Monthly Payment</p>
				<p class="mt-2 text-4xl font-black tracking-tight text-zinc-900 md:text-5xl dark:text-white" aria-live="polite">
					{{ ttd(monthlyPayment) }}<span class="text-base font-semibold text-zinc-500 dark:text-zinc-400">/mo</span>
				</p>
				<p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
					Based on {{ trimName ? `the ${trimName} at` : '' }} {{ ttd(basePrice) }}
				</p>

				<dl class="mt-6 divide-y divide-zinc-100 border-y border-zinc-100 text-sm dark:divide-zinc-800 dark:border-zinc-800">
					<div class="flex justify-between py-3">
						<dt class="text-zinc-600 dark:text-zinc-400">Amount financed (principal)</dt>
						<dd class="font-bold text-zinc-900 dark:text-white">{{ ttd(principal) }}</dd>
					</div>
					<div class="flex justify-between py-3">
						<dt class="text-zinc-600 dark:text-zinc-400">Total interest</dt>
						<dd class="font-bold text-zinc-900 dark:text-white">{{ ttd(totalInterest) }}</dd>
					</div>
					<div class="flex justify-between py-3">
						<dt class="text-zinc-600 dark:text-zinc-400">Total cost of loan</dt>
						<dd class="font-bold text-zinc-900 dark:text-white">{{ ttd(principal + totalInterest) }}</dd>
					</div>
				</dl>

				<button
					type="button"
					class="mt-6 w-full rounded-md bg-brand-red px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
					@click="applyForPreApproval"
				>
					Apply for Pre-Approval
				</button>
				<p class="mt-4 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
					Estimate only. Excludes fees and insurance; final rate, terms and approval are subject to the lender's credit assessment.
				</p>
			</div>
		</div>
	</div>
</template>
