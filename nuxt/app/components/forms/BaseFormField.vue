<script setup lang="ts">
import type { FormField } from '#shared/types/schema';
import { useField } from 'vee-validate';
import { Info } from 'lucide-vue-next';

import Input from '~/components/ui/input/Input.vue';
import { Textarea } from '~/components/ui/textarea';
import CheckboxField from './fields/CheckboxField.vue';
import CheckboxGroupField from './fields/CheckboxGroupField.vue';
import RadioGroupField from './fields/RadioGroupField.vue';
import SelectField from './fields/SelectField.vue';
import FileUploadField from './fields/FileUploadField.vue';

const props = defineProps<{ field: FormField; theme?: 'light' | 'dark' }>();
const { value, errorMessage } = useField(props.field.name ?? '');

const componentMap: Record<string, Component> = {
	textarea: Textarea,
	checkbox: CheckboxField,
	checkbox_group: CheckboxGroupField,
	radio: RadioGroupField,
	select: SelectField,
	file: FileUploadField,
};

const getFieldComponent = () => componentMap[props.field.type ?? ''] || Input;

const isDark = computed(() => props.theme === 'dark');

const darkControlClass =
	'bg-black text-white border-neutral-800 placeholder:text-neutral-500 focus-visible:ring-[#C3002F] focus-visible:ring-offset-black';

/**
 * Directus stores email/phone inputs as `text` fields, so the HTML input type is
 * derived from the field's type, validation rules, and name. Explicit `email`,
 * `phone` or `tel` types are honoured too if they are added to the CMS choices.
 */
const resolveInputType = (field: FormField): string => {
	const type = String(field.type ?? 'text').toLowerCase();
	const name = (field.name ?? '').toLowerCase();
	const rules = (field.validation ?? '').toLowerCase().split('|');

	if (type === 'email' || rules.includes('email') || /(^|[_-])e?mail($|[_-])/.test(name)) return 'email';
	if (type === 'phone' || type === 'tel' || /(^|[_-])(phone|tel|mobile)($|[_-])/.test(name)) return 'tel';
	if (rules.includes('url')) return 'url';
	return 'text';
};

const getComponentProps = (field: FormField) => {
	const baseProps = {
		id: field.id,
		name: field.name ?? '',
		placeholder: field.placeholder ?? '',
		modelValue: value.value,
		'onUpdate:modelValue': (val: any) => (value.value = val),
	};

	if (['checkbox_group', 'radio', 'select'].includes(field.type ?? '')) {
		return { ...baseProps, options: field.choices ?? [] };
	}

	if (field.type === 'checkbox') {
		return { ...baseProps, label: field.label ?? '' };
	}

	const themedProps = isDark.value ? { ...baseProps, class: darkControlClass } : baseProps;

	if (field.type === 'textarea') {
		return themedProps;
	}

	const inputType = resolveInputType(field);

	return {
		...themedProps,
		type: inputType,
		autocomplete: inputType === 'email' ? 'email' : inputType === 'tel' ? 'tel' : undefined,
		inputmode: inputType === 'tel' ? 'tel' : undefined,
	};
};
</script>

<template>
	<div
		v-if="props.field.type !== 'hidden'"
		:class="[`field-width-${field.width ?? '100'}`, { 'form-field--dark': isDark }]"
	>
		<FormItem class="pt-2">
			<FormLabel :for="field.name ?? ''" class="flex items-center justify-between">
				<div class="flex items-center space-x-1 h-[20px]">
					<span v-if="field.type !== 'checkbox'">{{ field.label ?? '' }}</span>
					<TooltipProvider v-if="field.help">
						<Tooltip>
							<TooltipTrigger>
								<Info :class="['w-4 h-4 cursor-pointer', isDark ? 'text-neutral-400' : 'text-gray-500']" />
							</TooltipTrigger>
							<TooltipContent>{{ field.help }}</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
				<span v-if="field.required" :class="['text-sm', isDark ? 'text-neutral-500' : 'text-gray-400']">*Required</span>
			</FormLabel>
			<FormControl class="h-10">
				<component :is="getFieldComponent()" v-bind="getComponentProps(field)" />
			</FormControl>
			<FormMessage v-if="errorMessage" :class="['italic text-sm', isDark ? 'text-[#ff4d6d]' : 'text-red-500']">{{ errorMessage }}</FormMessage>
		</FormItem>
	</div>
</template>

<style scoped>
/* Select / radio / checkbox controls come from shadcn primitives without a class prop. */
.form-field--dark :deep(button[role='combobox']) {
	background-color: #000;
	color: #fff;
	border-color: rgb(38 38 38);
}
.form-field--dark :deep(label) {
	color: #fff;
}

.field-width-100 {
	flex: 100%;
}
.field-width-50 {
	flex: calc(50% - 1rem);
}
.field-width-67 {
	flex: calc(67% - 1rem);
}
.field-width-33 {
	flex: calc(33% - 1rem);
}
</style>
