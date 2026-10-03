<script setup lang="ts">
import { DEALER_OPTIONS, VEHICLE_MODEL_OPTIONS, partsRequestSchema, type PartsRequestInput } from '#shared/types/contact';
import { inquiryInputClass as inputClass } from '~/composables/useInquiryForm';

/** /parts sidebar form → form_submissions (submission_type "parts"). */
const props = defineProps<{ vehicleModel?: string }>();

const initial = (): PartsRequestInput => ({
	first_name: '',
	last_name: '',
	phone: '',
	email: '',
	vehicle_model: (VEHICLE_MODEL_OPTIONS.find((m) => m === props.vehicleModel) ?? '') as PartsRequestInput['vehicle_model'],
	registration_number: '',
	vehicle_year: '' as unknown as number,
	chassis_number: '',
	part_number: '',
	part_description: '',
	dealer_id: '' as PartsRequestInput['dealer_id'],
});

const { values, errors, loading, status, serverError, touch, submit } = useInquiryForm(
	'parts',
	partsRequestSchema,
	initial,
);

const maxYear = new Date().getFullYear() + 1;
</script>

<template>
	<InquiryFormShell
		title="Request Genuine Parts"
		description="Send us your vehicle details and the part you need — we'll confirm fitment, availability and pricing."
		submit-label="Request Parts Quote"
		success-message="Thank you! Your parts request has been received. Our parts team will contact you with availability and pricing."
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

		<InquiryField v-slot="attrs" name="vehicle_model" label="Vehicle Model" required :error="errors.vehicle_model">
			<select v-bind="attrs" v-model="values.vehicle_model" :class="inputClass" @blur="touch('vehicle_model')">
				<option value="" disabled>Select your vehicle</option>
				<option v-for="option in VEHICLE_MODEL_OPTIONS" :key="option" :value="option">{{ option }}</option>
			</select>
		</InquiryField>
		<InquiryField v-slot="attrs" name="vehicle_year" label="Vehicle Year" required :error="errors.vehicle_year">
			<input
				v-bind="attrs"
				v-model="values.vehicle_year"
				type="number"
				inputmode="numeric"
				min="1990"
				:max="maxYear"
				placeholder="e.g. 2024"
				:class="inputClass"
				@blur="touch('vehicle_year')"
			/>
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
		<InquiryField
			v-slot="attrs"
			name="chassis_number"
			label="Chassis Number / VIN"
			required
			hint="Found on your registration or the driver-side door pillar."
			:error="errors.chassis_number"
		>
			<input
				v-bind="attrs"
				v-model="values.chassis_number"
				type="text"
				autocapitalize="characters"
				spellcheck="false"
				:class="[inputClass, 'uppercase']"
				@blur="touch('chassis_number')"
			/>
		</InquiryField>
		<div class="sm:col-span-2">
			<InquiryField v-slot="attrs" name="part_number" label="Part Number" :error="errors.part_number">
				<input
					v-bind="attrs"
					v-model="values.part_number"
					type="text"
					spellcheck="false"
					placeholder="If known, e.g. MZ690070"
					:class="inputClass"
					@blur="touch('part_number')"
				/>
			</InquiryField>
		</div>
		<div class="sm:col-span-2">
			<InquiryField v-slot="attrs" name="part_description" label="Part Description" required :error="errors.part_description">
				<textarea
					v-bind="attrs"
					v-model="values.part_description"
					rows="4"
					placeholder="e.g. Front brake pads and rotors"
					:class="[inputClass, 'resize-y']"
					@blur="touch('part_description')"
				/>
			</InquiryField>
		</div>
		<div class="sm:col-span-2">
			<InquiryField v-slot="attrs" name="dealer_id" label="Nearest Dealer" required :error="errors.dealer_id">
				<select v-bind="attrs" v-model="values.dealer_id" :class="inputClass" @blur="touch('dealer_id')">
					<option value="" disabled>Select a branch</option>
					<option v-for="option in DEALER_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
				</select>
			</InquiryField>
		</div>
	</InquiryFormShell>
</template>
