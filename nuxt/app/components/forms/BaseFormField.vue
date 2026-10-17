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

const props = defineProps<{ field: FormField; theme?: 'light' | 'dark' | 'console' }>();
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
const isConsole = computed(() => props.theme === 'console');

const darkControlClass =
	'bg-black text-white border-neutral-800 placeholder:text-neutral-500 focus-visible:ring-brand-red focus-visible:ring-offset-black';

/** Matches inquiryInputClass (service/parts forms). */
const consoleControlClass =
	'h-auto rounded-lg border-zinc-300 bg-zinc-100/80 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-0 ' +
	'dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white dark:placeholder:text-zinc-500';

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

	const themeClass = isDark.value ? darkControlClass : isConsole.value ? consoleControlClass : undefined;
	const themedProps = themeClass ? { ...baseProps, class: themeClass } : baseProps;

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
		:class="[`field-width-${field.width ?? '100'}`, { 'form-field--dark': isDark, 'form-field--console': isConsole }]"
	>
		<FormItem class="pt-2">
			<FormLabel
				:for="field.name ?? ''"
				:class="[
					'flex items-center justify-between',
					isConsole && 'text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300',
				]"
			>
				<div class="flex items-center space-x-1 h-[20px]">
					<span v-if="field.type !== 'checkbox'">
						{{ field.label ?? '' }}
						<span v-if="field.required && isConsole" class="text-brand-red" aria-hidden="true">*</span>
					</span>
					<TooltipProvider v-if="field.help">
						<Tooltip>
							<TooltipTrigger>
								<Info :class="['w-4 h-4 cursor-pointer', isDark ? 'text-neutral-400' : 'text-gray-500']" />
							</TooltipTrigger>
							<TooltipContent>{{ field.help }}</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
				<span v-if="field.required && !isConsole" :class="['text-sm', isDark ? 'text-neutral-500' : 'text-gray-400']">*Required</span>
			</FormLabel>
			<FormControl class="h-10">
				<component :is="getFieldComponent()" v-bind="getComponentProps(field)" />
			</FormControl>
			<FormMessage
				v-if="errorMessage"
				:class="['italic text-sm', isDark ? 'text-[#ff4d6d]' : isConsole ? 'text-xs not-italic text-red-600 dark:text-[#ff4d6d]' : 'text-red-500']"
			>{{ errorMessage }}</FormMessage>
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
.form-field--console :deep(button[role='combobox']) {
	height: auto;
	border-radius: 0.5rem;
	border-color: rgb(212 212 216);
	background-color: rgb(244 244 245 / 0.8);
	padding: 0.625rem 1rem;
	color: rgb(24 24 27);
}
.form-field--console :deep(button[role='combobox']:focus-visible) {
	--tw-ring-color: #ed0008;
	--tw-ring-offset-width: 0px;
}
.dark .form-field--console :deep(button[role='combobox']) {
	border-color: rgb(63 63 70);
	background-color: rgb(39 39 42 / 0.8);
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
