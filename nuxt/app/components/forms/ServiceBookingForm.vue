<script setup lang="ts">
import {
	DEALER_OPTIONS,
	SERVICE_TYPE_OPTIONS,
	VEHICLE_MODEL_OPTIONS,
	serviceBookingSchema,
	todayInTT,
	type ServiceBookingInput,
} from '#shared/types/contact';
import { inquiryInputClass as inputClass } from '~/composables/useInquiryForm';

/** /service sidebar form → form_submissions (submission_type "service"). */
const props = defineProps<{ vehicleModel?: string }>();

const initial = (): ServiceBookingInput => ({
	first_name: '',
	last_name: '',
	phone: '',
	email: '',
	service_type: '' as ServiceBookingInput['service_type'],
	vehicle_model: (VEHICLE_MODEL_OPTIONS.find((m) => m === props.vehicleModel) ?? '') as ServiceBookingInput['vehicle_model'],
	registration_number: '',
	vehicle_mileage: '' as unknown as number,
	request_date: '',
	dealer_id: '' as ServiceBookingInput['dealer_id'],
});

const { values, errors, loading, status, serverError, touch, submit } = useInquiryForm(
	'service',
	serviceBookingSchema,
	initial,
);

// Computed on the client after mount so SSR and hydration agree on the min date.
const minDate = ref<string>();
onMounted(() => (minDate.value = todayInTT()));
</script>

<template>
	<InquiryFormShell
		title="Book a Service"
		description="Tell us about your vehicle and preferred date — our service advisors will confirm your appointment."
		submit-label="Request Service Booking"
		success-message="Thank you! Your service request has been received. Our service team will contact you to confirm your booking."
		:loading="loading"
		:status="status"
		:server-error="serverError"
		@submit="submit"
		@dismiss="status = 'idle'"
	>
		<InquiryField v-slot="attrs" name="first_name" label="First Name" required :error="errors.first_name">
			<input v-bind="attrs" v-model="values.first_name" type="text" autocomplete="given-name" :class="inputClass" @blur="touch('first_name')" />
		</InquiryField>
		<InquiryField v-slot="attrs" name="last_name" label="Last Name" required :error="errors.last_name">
			<input v-bind="attrs" v-model="values.last_name" type="text" autocomplete="family-name" :class="inputClass" @blur="touch('last_name')" />
		</InquiryField>
		<InquiryField v-slot="attrs" name="phone" label="Contact Number" required :error="errors.phone">
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
		<InquiryField v-slot="attrs" name="email" label="Email" required :error="errors.email">
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

		<InquiryField v-slot="attrs" name="service_type" label="Service Type" required :error="errors.service_type">
			<select v-bind="attrs" v-model="values.service_type" :class="inputClass" @blur="touch('service_type')">
				<option value="" disabled>Select a service</option>
				<option v-for="option in SERVICE_TYPE_OPTIONS" :key="option" :value="option">{{ option }}</option>
			</select>
		</InquiryField>
		<InquiryField v-slot="attrs" name="vehicle_model" label="Vehicle Model" required :error="errors.vehicle_model">
			<select v-bind="attrs" v-model="values.vehicle_model" :class="inputClass" @blur="touch('vehicle_model')">
				<option value="" disabled>Select your vehicle</option>
				<option v-for="option in VEHICLE_MODEL_OPTIONS" :key="option" :value="option">{{ option }}</option>
			</select>
		</InquiryField>
		<InquiryField v-slot="attrs" name="registration_number" label="Registration Number" required :error="errors.registration_number">
			<input
				v-bind="attrs"
				v-model="values.registration_number"
				type="text"
				placeholder="e.g. PDQ 1234"
				autocapitalize="characters"
				:class="[inputClass, 'uppercase placeholder:normal-case']"
				@blur="touch('registration_number')"
			/>
		</InquiryField>
		<InquiryField v-slot="attrs" name="vehicle_mileage" label="Vehicle Mileage (km)" required :error="errors.vehicle_mileage">
			<input
				v-bind="attrs"
				v-model="values.vehicle_mileage"
				type="number"
				inputmode="numeric"
				min="0"
				step="1"
				placeholder="e.g. 45000"
				:class="inputClass"
				@blur="touch('vehicle_mileage')"
			/>
		</InquiryField>
		<InquiryField v-slot="attrs" name="request_date" label="Preferred Date" required :error="errors.request_date">
			<input v-bind="attrs" v-model="values.request_date" type="date" :min="minDate" :class="inputClass" @blur="touch('request_date')" />
		</InquiryField>
		<InquiryField v-slot="attrs" name="dealer_id" label="Nearest Dealer" required :error="errors.dealer_id">
			<select v-bind="attrs" v-model="values.dealer_id" :class="inputClass" @blur="touch('dealer_id')">
				<option value="" disabled>Select a branch</option>
				<option v-for="option in DEALER_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
			</select>
		</InquiryField>
	</InquiryFormShell>
</template>
