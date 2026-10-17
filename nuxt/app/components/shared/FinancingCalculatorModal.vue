<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'radix-vue';
import {
	DEALER_OPTIONS,
	FINANCE_APR,
	FINANCE_DEFAULT_DEPOSIT_PERCENT,
	FINANCE_DEFAULT_TERM_MONTHS,
	FINANCE_TERMS,
	estimateMonthlyPayment,
	financingInquirySchema,
	type FinancingInquiryInput,
} from '#shared/types/contact';
import { inquiryInputClass as inputClass, vehicleModelFrom } from '~/composables/useInquiryForm';

/**
 * Global two-step financing modal, mounted once in layouts/default.vue and opened from the homepage
 * fleet cards via useFinancingModal().open({ slug, title, price }).
 *
 *  1. Estimator: deposit (10–50%, 5% steps) and term (FINANCE_TERMS) sliders against the fixed APR,
 *     with the live monthly payment, principal and total interest.
 *  2. Lead form: the chosen terms stay pinned as a badge (with a way back to adjust them) above
 *     name, phone, email and branch; posts a `financing_inquiry` to /api/forms/parts-service
 *     carrying the estimate figures, like the showroom estimator's pre-approval flow.
 *
 * Every open starts on step 1 at the standard terms (10% down, 60 months).
 * Overlay sits at z-[70] so it covers the z-[60] sticky site header.
 */
const { isOpen, target, close } = useFinancingModal();

const step = ref<1 | 2>(1);
const depositPercent = ref(FINANCE_DEFAULT_DEPOSIT_PERCENT);
const termMonths = ref<number>(FINANCE_DEFAULT_TERM_MONTHS);

const price = computed(() => target.value?.price ?? 0);
const deposit = computed(() => Math.round((price.value * depositPercent.value) / 100));
const principal = computed(() => price.value - deposit.value);
const monthlyPayment = computed(() => estimateMonthlyPayment(price.value, depositPercent.value, termMonths.value));
const totalInterest = computed(() => monthlyPayment.value * termMonths.value - principal.value);

const ttd = (value: number) => `TTD $${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value))}`;

const model = computed(() => vehicleModelFrom(target.value?.slug) ?? vehicleModelFrom(target.value?.title));
// "2026 Triton · Leather 4WD"
const contextLabel = computed(() => (model.value ? [`2026 ${model.value}`, target.value?.trim].filter(Boolean).join(' · ') : ''));

const initial = (): FinancingInquiryInput => ({
	full_name: '',
	phone: '',
	email: '',
	dealer_id: '' as FinancingInquiryInput['dealer_id'],
	vehicle_model: (model.value ?? '') as FinancingInquiryInput['vehicle_model'],
	trim: target.value?.trim ?? '',
	vehicle_price: price.value,
	deposit_percent: depositPercent.value,
	term_months: termMonths.value,
	monthly_payment: monthlyPayment.value,
});

const { values, errors, loading, status, serverError, touch, submit, reset } = useInquiryForm('financing_inquiry', financingInquirySchema, initial);

// Each open starts clean on the estimator at the standard terms.
watch(isOpen, (open) => {
	if (!open) return;
	step.value = 1;
	depositPercent.value = FINANCE_DEFAULT_DEPOSIT_PERCENT;
	termMonths.value = FINANCE_DEFAULT_TERM_MONTHS;
	reset();
	status.value = 'idle';
});

/** Step 1 → 2: carries the estimate into the form, keeping anything already typed. */
async function applyWithEstimate() {
	Object.assign(values, {
		vehicle_price: price.value,
		deposit_percent: depositPercent.value,
		term_months: termMonths.value,
		monthly_payment: monthlyPayment.value,
	});
	step.value = 2;
	await nextTick();
	document.getElementById('financing-full_name')?.focus();
}

function onOpenChange(open: boolean) {
	if (!open) close();
}

// Focus the dialog itself rather than radix's default (the close button), so no ring flashes on X.
function focusDialog(event: Event) {
	event.preventDefault();
	(event.target as HTMLElement | null)?.focus();
}
</script>

<template>
	<DialogRoot :open="isOpen" @update:open="onOpenChange">
		<DialogPortal>
			<DialogOverlay
				class="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
			/>
			<div class="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
				<DialogContent
					v-if="target"
					class="pointer-events-auto relative my-auto w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl duration-200 focus:outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 md:p-8 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
					@open-auto-focus="focusDialog"
				>
					<DialogClose
						class="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red md:right-6 md:top-6 dark:hover:bg-zinc-800 dark:hover:text-white"
						aria-label="Close"
					>
						<Icon name="lucide:x" class="size-5" />
					</DialogClose>

					<p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
						{{ step === 1 ? 'Financing Estimator' : 'Financing & Pre-Approval' }}
						<span class="ml-2 font-semibold tracking-wider text-zinc-400">Step {{ step }} of 2</span>
					</p>
					<DialogTitle class="mt-2 pr-10 text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-white">
						{{ step === 1 ? 'Estimate Your Monthly Payment' : 'Apply for Pre-Approval' }}
					</DialogTitle>
					<DialogDescription class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
						<template v-if="step === 1">
							{{ contextLabel || target.title }} from {{ ttd(price) }}. Adjust the deposit and term to see your payment.
						</template>
						<template v-else>Share your details and a finance specialist will review your estimate and contact you about pre-approval.</template>
					</DialogDescription>

					<!-- STEP 1 · Estimator -->
					<div v-if="step === 1" class="mt-6">
						<div class="space-y-8">
							<div>
								<div class="flex items-baseline justify-between gap-4">
									<label for="finance-modal-deposit" class="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Deposit</label>
									<p class="text-sm font-bold text-zinc-900 dark:text-white">
										{{ depositPercent }}% <span class="font-medium text-zinc-500 dark:text-zinc-400">· {{ ttd(deposit) }}</span>
									</p>
								</div>
								<input
									id="finance-modal-deposit"
									v-model.number="depositPercent"
									type="range"
									min="10"
									max="50"
									step="5"
									class="mt-3 w-full cursor-pointer accent-brand-red"
									:aria-valuetext="`${depositPercent}% deposit, ${ttd(deposit)}`"
								/>
								<div class="mt-1 flex justify-between text-[11px] font-medium text-zinc-400" aria-hidden="true">
									<span>10%</span>
									<span>50%</span>
								</div>
							</div>

							<div>
								<div class="flex items-baseline justify-between gap-4">
									<label for="finance-modal-term" class="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Loan Term</label>
									<p class="text-sm font-bold text-zinc-900 dark:text-white">
										{{ termMonths }} months <span class="font-medium text-zinc-500 dark:text-zinc-400">· {{ termMonths / 12 }} years</span>
									</p>
								</div>
								<input
									id="finance-modal-term"
									v-model.number="termMonths"
									type="range"
									:min="FINANCE_TERMS[0]"
									:max="FINANCE_TERMS.at(-1)"
									step="12"
									class="mt-3 w-full cursor-pointer accent-brand-red"
									:aria-valuetext="`${termMonths} months`"
								/>
								<div class="mt-1 flex justify-between text-[11px] font-medium text-zinc-400" aria-hidden="true">
									<span v-for="term in FINANCE_TERMS" :key="term">{{ term }}</span>
								</div>
							</div>
						</div>

						<div class="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 md:p-6 dark:border-zinc-800 dark:bg-zinc-800/50">
							<p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Estimated Monthly Payment</p>
							<p class="mt-1 text-4xl font-black tracking-tight text-zinc-900 dark:text-white" aria-live="polite">
								{{ ttd(monthlyPayment) }}<span class="text-base font-semibold text-zinc-500 dark:text-zinc-400">/mo</span>
							</p>
							<p class="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
								<Icon name="lucide:landmark" class="size-3.5 text-brand-red" aria-hidden="true" />
								Fixed {{ FINANCE_APR }}% APR with ANSA Merchant Bank
							</p>
							<dl class="mt-4 divide-y divide-zinc-200 border-t border-zinc-200 text-sm dark:divide-zinc-700 dark:border-zinc-700">
								<div class="flex justify-between py-2.5">
									<dt class="text-zinc-600 dark:text-zinc-400">Amount financed (principal)</dt>
									<dd class="font-bold text-zinc-900 dark:text-white">{{ ttd(principal) }}</dd>
								</div>
								<div class="flex justify-between pt-2.5">
									<dt class="text-zinc-600 dark:text-zinc-400">Total interest</dt>
									<dd class="font-bold text-zinc-900 dark:text-white">{{ ttd(totalInterest) }}</dd>
								</div>
							</dl>
						</div>

						<button
							type="button"
							class="mt-6 w-full rounded-lg bg-brand-red px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-brand-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 active:scale-[0.99] dark:focus-visible:ring-offset-zinc-900"
							@click="applyWithEstimate"
						>
							Apply for Pre-Approval with this Estimate
						</button>
						<p class="mt-3 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
							Estimate only. Excludes fees and insurance; final rate, terms and approval are subject to the lender's credit assessment.
						</p>
					</div>

					<!-- STEP 2 · Lead form -->
					<template v-else>
						<div class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/60">
							<div>
								<p v-if="contextLabel" class="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{{ contextLabel }}</p>
								<p class="text-sm font-bold text-zinc-900 dark:text-white">
									{{ ttd(monthlyPayment) }}/mo · {{ depositPercent }}% Down · {{ termMonths }} Mos
								</p>
							</div>
							<button
								v-if="status !== 'success'"
								type="button"
								class="inline-flex items-center gap-1 text-xs font-semibold text-brand-red hover:underline focus:outline-none focus-visible:underline"
								@click="step = 1"
							>
								<Icon name="lucide:sliders-horizontal" class="size-3.5" aria-hidden="true" />
								Adjust
							</button>
						</div>

						<div aria-live="polite">
							<div
								v-if="status === 'success'"
								role="status"
								class="mt-6 flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-100"
							>
								<Icon name="lucide:circle-check" class="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
								<p>Thank you! Your pre-approval request has been received. A finance specialist will contact you shortly.</p>
							</div>
							<div
								v-else-if="status === 'error'"
								role="alert"
								class="mt-6 flex items-start gap-3 rounded-lg border border-brand-red/40 bg-brand-red/5 p-4 text-sm text-red-900 dark:border-brand-red/60 dark:bg-brand-red/10 dark:text-red-100"
							>
								<Icon name="lucide:circle-alert" class="mt-0.5 size-5 shrink-0 text-brand-red dark:text-[#ff4d6d]" />
								<p>{{ serverError }}</p>
							</div>
						</div>

						<form v-if="status !== 'success'" data-inquiry-form novalidate class="mt-6" @submit.prevent="submit">
							<fieldset :disabled="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<InquiryField v-slot="attrs" id-prefix="financing" name="full_name" label="Full Name" required :error="errors.full_name" class="sm:col-span-2">
									<input v-bind="attrs" v-model="values.full_name" type="text" autocomplete="name" :class="inputClass" @blur="touch('full_name')" />
								</InquiryField>
								<InquiryField v-slot="attrs" id-prefix="financing" name="phone" label="Phone Number" required :error="errors.phone">
									<input
										v-bind="attrs"
										v-model="values.phone"
										type="tel"
										autocomplete="tel"
										placeholder="+1 (868) 000-0000"
										:class="inputClass"
										@blur="touch('phone')"
									/>
								</InquiryField>
								<InquiryField v-slot="attrs" id-prefix="financing" name="email" label="Email Address" required :error="errors.email">
									<input
										v-bind="attrs"
										v-model="values.email"
										type="email"
										autocomplete="email"
										placeholder="you@example.com"
										:class="inputClass"
										@blur="touch('email')"
									/>
								</InquiryField>
								<InquiryField v-slot="attrs" id-prefix="financing" name="dealer_id" label="Preferred Dealer Branch" required :error="errors.dealer_id" class="sm:col-span-2">
									<select v-bind="attrs" v-model="values.dealer_id" :class="inputClass" @blur="touch('dealer_id')">
										<option value="" disabled>Select a branch</option>
										<option v-for="option in DEALER_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
									</select>
								</InquiryField>
							</fieldset>

							<button
								type="submit"
								:disabled="loading"
								:aria-busy="loading"
								class="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-brand-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 dark:focus-visible:ring-offset-zinc-900"
							>
								<Icon v-if="loading" name="lucide:loader-circle" class="size-4 animate-spin" />
								{{ loading ? 'Sending…' : 'Submit Pre-Approval Request' }}
							</button>
						</form>
					</template>
				</DialogContent>
			</div>
		</DialogPortal>
	</DialogRoot>
</template>
