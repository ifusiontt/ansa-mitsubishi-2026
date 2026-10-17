<script setup lang="ts">
/**
 * Light console card (zinc in dark mode) shared by ServiceBookingForm and PartsRequestForm: heading,
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
	<div class="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl md:p-8 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-100">
		<h2 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{{ title }}</h2>
		<p v-if="description" class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{{ description }}</p>

		<div aria-live="polite">
			<div
				v-if="status === 'success'"
				role="status"
				class="mt-5 flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-100"
			>
				<Icon name="lucide:circle-check" class="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
				<p class="flex-1">{{ successMessage }}</p>
				<button type="button" class="text-emerald-700 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-white" aria-label="Dismiss" @click="emit('dismiss')">
					<Icon name="lucide:x" class="size-4" />
				</button>
			</div>
			<div
				v-else-if="status === 'error'"
				role="alert"
				class="mt-5 flex items-start gap-3 rounded-lg border border-brand-red/40 bg-brand-red/5 p-4 text-sm text-red-900 dark:border-brand-red/60 dark:bg-brand-red/10 dark:text-red-100"
			>
				<Icon name="lucide:circle-alert" class="mt-0.5 size-5 shrink-0 text-brand-red dark:text-[#ff4d6d]" />
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
				class="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 dark:focus-visible:ring-offset-zinc-900"
			>
				<Icon v-if="loading" name="lucide:loader-circle" class="size-4 animate-spin" />
				{{ loading ? 'Sending…' : submitLabel }}
			</button>
		</form>
	</div>
</template>
