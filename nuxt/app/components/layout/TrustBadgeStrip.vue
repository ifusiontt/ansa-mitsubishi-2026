<script setup lang="ts">
/** Four-up icon badge strip for the PartsServicePage `lead` slot (/service, /parts). */
export interface TrustBadge {
	icon: string;
	title: string;
	detail: string;
}

defineProps<{ badges: TrustBadge[]; label: string }>();
</script>

<template>
	<ul class="grid grid-cols-2 gap-4 lg:grid-cols-4" :aria-label="label">
		<li
			v-for="badge in badges"
			:key="badge.title"
			class="flex items-center gap-4 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm md:p-5 dark:border-zinc-800 dark:bg-zinc-900/80"
		>
			<span class="grid size-11 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red" aria-hidden="true">
				<Icon :name="badge.icon" class="size-5" />
			</span>
			<span class="min-w-0">
				<span class="block text-sm font-bold text-zinc-900 dark:text-white">{{ badge.title }}</span>
				<span class="block text-xs text-zinc-500 dark:text-zinc-400">{{ badge.detail }}</span>
			</span>
		</li>
	</ul>
</template>
