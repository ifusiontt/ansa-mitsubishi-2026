<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { buildZodSchema } from '~/lib/zodSchemaBuilder';
import type { FormField } from '#shared/types/schema';
import BaseFormField from './BaseFormField.vue';
import BaseButton from '../base/BaseButton.vue';

const props = defineProps<{
	fields: FormField[];
	onSubmit: (data: Record<string, any>) => Promise<void> | void;
	submitLabel: string;
	formId?: string;
	blockFormId?: string;
	/** Values keyed by field name that override the empty defaults (e.g. from the query string). */
	prefill?: Record<string, string>;
	/** `console`: light zinc controls with dark-mode variants (secondary pages such as /contact). */
	theme?: 'light' | 'dark' | 'console';
}>();

const isSubmitting = ref(false);
const { isDraftPreview, setBlockAttr } = useVisualEditingAttrs();

const sortedFields = computed(() => [...props.fields].sort((a, b) => (a.sort || 0) - (b.sort || 0)));

const validFields = computed(() =>
	sortedFields.value.filter((field): field is FormField & { name: string } => field.name != null && field.name !== ''),
);

const schema = computed(() => {
	if (!validFields.value.length) return null;
	try {
		const zodSchema = buildZodSchema(validFields.value);
		return toTypedSchema(zodSchema);
	} catch {
		return null;
	}
});

const initialValues = computed(() => {
	if (!validFields.value.length) return {};
	return validFields.value.reduce(
		(defaults, field) => {
			const name = field.name;

			switch (field.type) {
				case 'checkbox':
					defaults[name] = false;
					break;
				case 'checkbox_group':
					defaults[name] = [];
					break;
				case 'select':
				case 'radio':
					defaults[name] = '';
					break;
				case 'file':
					defaults[name] = null;
					break;
				case 'textarea':
				case 'text':
				default:
					defaults[name] = '';
			}

			const prefilled = props.prefill?.[name];
			if (prefilled !== undefined && ['text', 'textarea', 'select', 'radio', 'hidden'].includes(field.type ?? 'text')) {
				defaults[name] = prefilled;
			}

			return defaults;
		},
		{} as Record<string, any>,
	);
});

const { handleSubmit, values } = useForm({
	validationSchema: schema,
	initialValues: initialValues.value,
});

const onSubmitForm = handleSubmit(async (formValues) => {
	if (isSubmitting.value) return;
	try {
		isSubmitting.value = true;
		await props.onSubmit(formValues);
	} finally {
		isSubmitting.value = false;
	}
});

const SUBMIT_CLASSES = {
	dark: 'bg-brand-red text-white hover:bg-brand-red-dark',
	console: 'w-full justify-center rounded-lg bg-brand-red py-3 font-semibold text-white shadow-md transition-all hover:bg-red-700',
} as const;
const submitClass = computed(() => (props.theme && props.theme !== 'light' ? SUBMIT_CLASSES[props.theme] : undefined));
</script>

<template>
	<form
		v-if="schema"
		:validation-schema="schema"
		:initial-values="initialValues"
		:data-directus="
			setBlockAttr(
				isDraftPreview && blockFormId
					? {
							blockCollection: 'block_form',
							blockItemId: blockFormId,
							fields: 'form',
							mode: 'modal',
						}
					: {
							blockCollection: 'forms',
							blockItemId: formId!,
							fields: 'fields',
							mode: 'popover',
						},
			)
		"
		@submit.prevent="onSubmitForm"
	>
		<div class="flex flex-wrap gap-4">
			<BaseFormField
				v-for="field in validFields"
				:key="field.id"
				:field="field"
				:model-value="values[field.name]"
				:theme="theme"
			/>
			<div class="w-full">
				<div
					:data-directus="
						setBlockAttr(
							isDraftPreview && blockFormId
								? {
										blockCollection: 'block_form',
										blockItemId: blockFormId,
										fields: 'form',
										mode: 'popover',
									}
								: {
										blockCollection: 'forms',
										blockItemId: formId!,
										fields: 'submit_label',
										mode: 'popover',
									},
						)
					"
				>
					<BaseButton
						:id="`submit-${submitLabel.replace(/\s+/g, '-').toLowerCase()}`"
						type="submit"
						:label="submitLabel"
						:disabled="isSubmitting"
						:class-name="submitClass"
						icon="arrow"
						icon-position="right"
					/>
				</div>
			</div>
		</div>
	</form>
</template>
