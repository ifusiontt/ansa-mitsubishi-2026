<script setup lang="ts">
/**
 * Element with its own useScrollReveal observer — for v-for rows that each reveal on their own.
 * Children opt in with `.reveal-item` and `--reveal-i`; attributes (class, data-directus) fall through.
 */
withDefaults(defineProps<{ as?: string }>(), { as: 'div' });

const root = useTemplateRef<HTMLElement>('root');
const state = useScrollReveal(root);
</script>

<template>
	<component :is="as" ref="root" :data-reveal="state">
		<slot />
	</component>
</template>
