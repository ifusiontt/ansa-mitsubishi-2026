<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'radix-vue';
import {
	DEALER_OPTIONS,
	VEHICLE_MODEL_OPTIONS,
	testDriveBookingSchema,
	todayInTT,
	type TestDriveBookingInput,
} from '#shared/types/contact';
import { inquiryInputClass as inputClass, vehicleModelFrom } from '~/composables/useInquiryForm';

/**
 * Global Book a Test Drive modal, mounted once in layouts/default.vue and opened from any CTA via
 * useTestDriveModal().open({ slug, title, trim }). radix-vue's Dialog portals it to <body> and
 * handles the focus trap, Esc and scroll lock.
 *
 * Posts a `test_drive` inquiry to /api/forms/parts-service (the same lead pipeline as the homepage
 * quick form), with email, branch, date and the trim being viewed. When the CTA names a fleet model
 * the vehicle is fixed and shown as a context pill; otherwise the customer picks one.
 * Overlay sits at z-[70] so it covers the z-[60] sticky site header.
 */
const { isOpen, vehicleSlug, vehicleTitle, selectedTrim, close } = useTestDriveModal();

const presetModel = computed(() => vehicleModelFrom(vehicleSlug.value) ?? vehicleModelFrom(vehicleTitle.value));

// "2026 Xpander Cross · GLX"
const contextLabel = computed(() => {
	if (!presetModel.value) return '';
	return [`2026 ${presetModel.value}`, selectedTrim.value].filter(Boolean).join(' · ');
});

const initial = (): TestDriveBookingInput => ({
	full_name: '',
	phone: '',
	email: '',
	dealer_id: '' as TestDriveBookingInput['dealer_id'],
	request_date: '',
	vehicle_model: (presetModel.value ?? '') as TestDriveBookingInput['vehicle_model'],
	trim: selectedTrim.value,
});

const { values, errors, loading, status, serverError, touch, submit, reset } = useInquiryForm('test_drive', testDriveBookingSchema, initial);

// Each open starts clean, pre-populated with the vehicle + trim the CTA passed.
watch(isOpen, (open) => {
	if (!open) return;
	reset();
	status.value = 'idle';
	minDate.value = todayInTT();
});

const minDate = ref<string>();

function onOpenChange(open: boolean) {
	if (!open) close();
}

// Start in the first field rather than radix's default (the close button).
function focusFirstField(event: Event) {
	event.preventDefault();
	document.getElementById('test-drive-full_name')?.focus();
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
					class="pointer-events-auto relative my-auto w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl duration-200 focus:outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 md:p-8 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
					@open-auto-focus="focusFirstField"
				>
					<DialogClose
						class="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red md:right-6 md:top-6 dark:hover:bg-zinc-800 dark:hover:text-white"
						aria-label="Close"
					>
						<Icon name="lucide:x" class="size-5" />
					</DialogClose>

					<p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">Schedule an Experience</p>
					<DialogTitle class="mt-2 text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-white">Book a Test Drive</DialogTitle>
					<DialogDescription class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
						Pick a branch and date — our sales team will call to confirm your drive.
					</DialogDescription>

					<p
						v-if="contextLabel"
						class="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
					>
						<Icon name="lucide:car-front" class="size-4 text-brand-red" aria-hidden="true" />
						{{ contextLabel }}
					</p>

					<div aria-live="polite">
						<div
							v-if="status === 'success'"
							role="status"
							class="mt-6 flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-100"
						>
							<Icon name="lucide:circle-check" class="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
							<p>Thank you! Your test-drive request has been received. Our sales team will contact you shortly to confirm.</p>
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
							<InquiryField v-slot="attrs" id-prefix="test-drive" name="full_name" label="Full Name" required :error="errors.full_name" class="sm:col-span-2">
								<input v-bind="attrs" v-model="values.full_name" type="text" autocomplete="name" :class="inputClass" @blur="touch('full_name')" />
							</InquiryField>
							<InquiryField v-slot="attrs" id-prefix="test-drive" name="phone" label="Phone Number" required :error="errors.phone">
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
							<InquiryField v-slot="attrs" id-prefix="test-drive" name="email" label="Email Address" required :error="errors.email">
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
							<InquiryField
								v-if="!presetModel"
								v-slot="attrs"
								id-prefix="test-drive"
								name="vehicle_model"
								label="Model"
								required
								:error="errors.vehicle_model"
								class="sm:col-span-2"
							>
								<select v-bind="attrs" v-model="values.vehicle_model" :class="inputClass" @blur="touch('vehicle_model')">
									<option value="" disabled>Select a model</option>
									<option v-for="option in VEHICLE_MODEL_OPTIONS" :key="option" :value="option">{{ option }}</option>
								</select>
							</InquiryField>
							<InquiryField v-slot="attrs" id-prefix="test-drive" name="dealer_id" label="Preferred ANSA Location" required :error="errors.dealer_id">
								<select v-bind="attrs" v-model="values.dealer_id" :class="inputClass" @blur="touch('dealer_id')">
									<option value="" disabled>Select a branch</option>
									<option v-for="option in DEALER_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
								</select>
							</InquiryField>
							<InquiryField v-slot="attrs" id-prefix="test-drive" name="request_date" label="Preferred Date" required :error="errors.request_date">
								<input v-bind="attrs" v-model="values.request_date" type="date" :min="minDate" :class="inputClass" @blur="touch('request_date')" />
							</InquiryField>
						</fieldset>

						<button
							type="submit"
							:disabled="loading"
							:aria-busy="loading"
							class="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-brand-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 dark:focus-visible:ring-offset-zinc-900"
						>
							<Icon v-if="loading" name="lucide:loader-circle" class="size-4 animate-spin" />
							{{ loading ? 'Sending…' : 'Confirm Test Drive Request' }}
						</button>
					</form>
				</DialogContent>
			</div>
		</DialogPortal>
	</DialogRoot>
</template>
