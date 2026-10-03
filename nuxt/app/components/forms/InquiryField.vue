<script setup lang="ts">
/**
 * Label + error wrapper for the service/parts inquiry inputs. The slot receives
 * the ids/aria attributes to spread onto the control.
 */
const props = defineProps<{
	name: string;
	label: string;
	error?: string;
	required?: boolean;
	hint?: string;
}>();

const id = computed(() => `inquiry-${props.name}`);
const describedBy = computed(() => (props.error ? `${id.value}-error` : props.hint ? `${id.value}-hint` : undefined));

/**
 * Attributes for the slotted control, passed as one object: individual slot props
 * get camelised (`aria-invalid` → `ariaInvalid`), which would render invalid ARIA.
 */
const controlAttrs = computed(() => ({
	id: id.value,
	name: props.name,
	'aria-invalid': props.error ? ('true' as const) : ('false' as const),
	'aria-describedby': describedBy.value,
	'aria-required': props.required ? ('true' as const) : undefined,
}));
</script>

<template>
	<div>
		<label :for="id" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-300">
			{{ label }}
			<span v-if="required" class="text-[#C3002F]" aria-hidden="true">*</span>
			<span v-else class="font-normal normal-case tracking-normal text-neutral-500">(optional)</span>
		</label>
		<!-- One v-bind object: a static `name` on <slot> would select the slot by name instead of passing a prop. -->
		<slot v-bind="controlAttrs" />
		<p v-if="error" :id="`${id}-error`" class="mt-1.5 text-xs text-[#ff4d6d]">{{ error }}</p>
		<p v-else-if="hint" :id="`${id}-hint`" class="mt-1.5 text-xs text-neutral-500">{{ hint }}</p>
	</div>
</template>
