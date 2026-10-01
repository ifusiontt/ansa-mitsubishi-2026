<script setup lang="ts">
import DynamicForm from './DynamicForm.vue';
import type { FormField } from '@@/shared/types/schema';
import { CheckCircle } from 'lucide-vue-next';

interface CustomFormData {
	id: string;
	on_success?: 'redirect' | 'message' | null;
	sort?: number | null;
	submit_label?: string | null;
	success_message?: string | null;
	title?: string | null;
	success_redirect_url?: string | null;
	is_active?: boolean | null;
	fields: FormField[];
}

const props = defineProps<{
	form: CustomFormData;
	className?: string;
	blockFormId?: string;
	prefill?: Record<string, string>;
	theme?: 'light' | 'dark';
}>();

const isDark = computed(() => props.theme === 'dark');

const isSubmitted = ref(false);
const error = ref<string | null>(null);

const handleSubmit = async (data: Record<string, any>) => {
	error.value = null;
	try {
		const formData = new FormData();
		formData.append('formId', props.form.id);

		for (const field of props.form.fields) {
			if (!field.name) continue;
			const value = data[field.name];
			if (value === undefined || value === null) continue;

			if (value instanceof File) {
				formData.append(field.name, value);
			} else if (Array.isArray(value)) {
				formData.append(field.name, JSON.stringify(value));
			} else {
				formData.append(field.name, String(value));
			}
		}

		await $fetch('/api/forms/submit', {
			method: 'POST',
			body: formData,
		});

		if (props.form.on_success === 'redirect' && props.form.success_redirect_url) {
			window.location.href = props.form.success_redirect_url;
		} else {
			isSubmitted.value = true;
		}
	} catch {
		error.value = 'Failed to submit the form. Please try again later.';
	}
};
</script>

<template>
	<div
		v-if="form.is_active"
		:class="[
			'space-y-6 border p-8 rounded-lg',
			isDark ? 'bg-black text-white border-neutral-800' : 'border-input',
			className,
		]"
	>
		<div
			v-if="isSubmitted"
			role="status"
			aria-live="polite"
			class="flex flex-col items-center justify-center space-y-4 p-6 text-center"
		>
			<CheckCircle :class="['size-12', isDark ? 'text-[#C3002F]' : 'text-green-500']" />
			<p :class="isDark ? 'text-neutral-300' : 'text-gray-600'">
				{{ form.success_message || 'Your form has been submitted successfully.' }}
			</p>
		</div>
		<template v-else>
			<div
				v-if="error"
				role="alert"
				:class="[
					'p-4 rounded-md',
					isDark ? 'text-white bg-[#C3002F]/15 border border-[#C3002F]/50' : 'text-red-500 bg-red-100',
				]"
			>
				<strong>Error:</strong>
				{{ error }}
			</div>
			<DynamicForm
				:fields="form.fields"
				:onSubmit="handleSubmit"
				:submitLabel="form.submit_label || 'Submit'"
				:formId="form.id"
				:blockFormId="blockFormId"
				:prefill="prefill"
				:theme="theme"
			/>
		</template>
	</div>
</template>
