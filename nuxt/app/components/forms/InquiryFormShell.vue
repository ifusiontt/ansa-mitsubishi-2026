<script setup lang="ts">
/**
 * Pitch-black card shared by ServiceBookingForm and PartsRequestForm: heading,
 * success/error banner, field grid (default slot) and the full-width red submit button.
 */
defineProps<{
	title: string;
	description?: string;
	submitLabel: string;
	successMessage: string;
	loading: boolean;
	status: 'idle' | 'success' | 'error';
	serverError?: string;
}>();

const emit = defineEmits<{ submit: []; dismiss: [] }>();
</script>

<template>
	<div class="rounded-xl border border-neutral-800 bg-neutral-950 p-6 text-neutral-100 shadow-2xl">
		<h2 class="text-xl font-bold tracking-tight">{{ title }}</h2>
		<p v-if="description" class="mt-1.5 text-sm text-neutral-400">{{ description }}</p>

		<div aria-live="polite">
			<div
				v-if="status === 'success'"
				role="status"
				class="mt-5 flex items-start gap-3 rounded-lg border border-emerald-700/60 bg-emerald-950/50 p-4 text-sm text-emerald-100"
			>
				<Icon name="lucide:circle-check" class="mt-0.5 size-5 shrink-0 text-emerald-400" />
				<p class="flex-1">{{ successMessage }}</p>
				<button type="button" class="text-emerald-300 hover:text-white" aria-label="Dismiss" @click="emit('dismiss')">
					<Icon name="lucide:x" class="size-4" />
				</button>
			</div>
			<div
				v-else-if="status === 'error'"
				role="alert"
				class="mt-5 flex items-start gap-3 rounded-lg border border-[#C3002F]/60 bg-[#C3002F]/10 p-4 text-sm text-red-100"
			>
				<Icon name="lucide:circle-alert" class="mt-0.5 size-5 shrink-0 text-[#ff4d6d]" />
				<p>{{ serverError }}</p>
			</div>
		</div>

		<form data-inquiry-form novalidate class="mt-6" @submit.prevent="emit('submit')">
			<fieldset :disabled="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<slot />
			</fieldset>

			<button
				type="submit"
				:disabled="loading"
				:aria-busy="loading"
				class="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#C3002F] px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-[#C3002F]/20 transition-transform duration-200 hover:scale-[1.02] hover:bg-[#d4063a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C3002F] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100"
			>
				<Icon v-if="loading" name="lucide:loader-circle" class="size-4 animate-spin" />
				{{ loading ? 'Sending…' : submitLabel }}
			</button>
		</form>
	</div>
</template>
