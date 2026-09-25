<script setup lang="ts">
export interface ContainerProps {
	as?: 'div' | 'section' | 'main' | 'article' | 'aside' | 'nav' | 'header' | 'footer' | 'form';
	className?: string;
	maxWidth?: string;
	role?: string;
}

const { as = 'div', className = '', maxWidth = 'max-w-7xl', role } = defineProps<ContainerProps>();
</script>

<template>
	<component :is="as" :class="[maxWidth, maxWidth === 'max-w-none px-0' ? '' : 'mx-auto px-4 sm:px-6 lg:px-16', className]" :role="role">
		<slot />
	</component>
</template>
