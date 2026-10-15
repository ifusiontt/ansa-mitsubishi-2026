<script setup lang="ts">
import type { Faq } from '#shared/types/schema';
import { FAQ_CATEGORY_LABELS, type FaqCategory, type FaqGroup } from '#shared/types/faq';

/**
 * Pitch-black FAQ accordion, grouped by category (FAQ_CATEGORY_LABELS order).
 * One answer is open at a time. Answers expand via a grid-rows 0fr→1fr
 * transition, which animates to the content's natural height without measuring it.
 * Collapsed answers stay in the DOM (searchable, SSR'd) but are `inert`.
 */
const props = defineProps<{ items: Faq[] }>();

const openId = ref<number | null>(null);

const groups = computed<FaqGroup[]>(() =>
	(Object.keys(FAQ_CATEGORY_LABELS) as FaqCategory[])
		.map((category) => ({
			category,
			label: FAQ_CATEGORY_LABELS[category],
			items: props.items.filter((faq) => (faq.category ?? 'general') === category),
		}))
		.filter((group) => group.items.length),
);

const toggle = (id: number) => {
	openId.value = openId.value === id ? null : id;
};
</script>

<template>
	<div class="space-y-10">
		<section v-for="group in groups" :key="group.category" :aria-labelledby="`faq-group-${group.category}`">
			<h2
				:id="`faq-group-${group.category}`"
				class="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-brand-red"
			>
				{{ group.label }}
			</h2>

			<div class="overflow-hidden rounded-lg border border-[#1F1F1F] bg-[#0A0A0A]">
				<div v-for="faq in group.items" :key="faq.id" class="border-b border-[#1F1F1F] last:border-b-0">
					<h3>
						<button
							:id="`faq-q-${faq.id}`"
							type="button"
							:aria-expanded="openId === faq.id"
							:aria-controls="`faq-a-${faq.id}`"
							:class="[
								'group flex w-full items-center justify-between gap-6 px-5 py-5 text-left transition-colors duration-200 md:px-6',
								'hover:text-brand-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-red',
								openId === faq.id ? 'text-brand-red' : 'text-white',
							]"
							@click="toggle(faq.id)"
						>
							<span class="text-base font-medium md:text-lg">{{ faq.question }}</span>
							<span
								aria-hidden="true"
								:class="[
									'flex size-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 motion-reduce:transition-none',
									openId === faq.id
										? 'rotate-45 border-brand-red bg-brand-red text-white'
										: 'border-[#1F1F1F] text-neutral-400 group-hover:border-brand-red group-hover:text-brand-red',
								]"
							>
								<Icon name="lucide:plus" class="size-4" />
							</span>
						</button>
					</h3>

					<div
						:id="`faq-a-${faq.id}`"
						role="region"
						:aria-labelledby="`faq-q-${faq.id}`"
						:inert="openId !== faq.id"
						:class="[
							'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
							openId === faq.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
						]"
					>
						<div class="overflow-hidden">
							<!-- Answers are CMS-authored rich text (same trust level as block_richtext). -->
							<div
								class="prose prose-invert max-w-none px-5 pb-6 text-neutral-300 prose-p:my-2 prose-a:text-brand-red prose-strong:text-white md:px-6"
								v-html="faq.answer"
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
	</div>
</template>
