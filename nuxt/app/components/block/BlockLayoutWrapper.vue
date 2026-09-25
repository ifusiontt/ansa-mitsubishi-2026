<script setup lang="ts">
import BaseBlock from '~/components/base/BaseBlock.vue';

interface WrapperSectionItem {
  id: string;
  collection: string;
  item: Record<string, any>;
}

// Ingest layout data through a unified data object matching BaseBlock's mapping
interface BlockLayoutWrapperProps {
  data?: {
    template?: 'split_grid' | 'stacked_rows';
    layout_ratio?: '50_50' | '40_60' | '60_40';
    collapse_breakpoint?: 'md' | 'sm';
    grid_gap?: 'gap-4' | 'gap-8' | 'gap-12';
    sections?: WrapperSectionItem[];
  };
}

const props = withDefaults(defineProps<BlockLayoutWrapperProps>(), {
  data: () => ({
    template: 'split_grid',
    layout_ratio: '50_50',
    collapse_breakpoint: 'md',
    grid_gap: 'gap-4',
    sections: [],
  }),
});

// Reactively unwrap data properties matching the keys coming from Directus API
const template = computed(() => props.data?.template || 'split_grid');
const layoutRatio = computed(() => props.data?.layout_ratio || '50_50');
const collapseBreakpoint = computed(() => props.data?.collapse_breakpoint || 'md');
const gridGap = computed(() => props.data?.grid_gap || 'gap-4');
const sections = computed(() => props.data?.sections || []);

// Calculate the outer responsive grid frame mapping strings to Tailwind utilities
const wrapperGridClasses = computed(() => {
  if (template.value === 'split_grid') {
    const classes = ['grid w-full items-start'];
    classes.push(gridGap.value);
    
    if (collapseBreakpoint.value === 'sm') {
      classes.push('grid-cols-1 sm:grid-cols-12');
    } else {
      classes.push('grid-cols-1 md:grid-cols-12');
    }
    return classes.join(' ');
  }
  return 'flex flex-col w-full space-y-8';
});

// FIXED: Use complete, static string literals so Tailwind's compiler can whitelist them safely
const leftColumnSpan = computed(() => {
  if (template.value !== 'split_grid') return 'w-full';
  
  const ratio = layoutRatio.value || '50_50';
  const bp = collapseBreakpoint.value || 'md';
  
  if (bp === 'sm') {
    if (ratio === '40_60') return 'sm:col-span-5';
    if (ratio === '60_40') return 'sm:col-span-7';
    return 'sm:col-span-6';
  } else {
    if (ratio === '40_60') return 'md:col-span-5';
    if (ratio === '60_40') return 'md:col-span-7';
    return 'md:col-span-6';
  }
});

const rightColumnSpan = computed(() => {
  if (template.value !== 'split_grid') return 'w-full';
  
  const ratio = layoutRatio.value || '50_50';
  const bp = collapseBreakpoint.value || 'md';
  
  if (bp === 'sm') {
    if (ratio === '40_60') return 'sm:col-span-7';
    if (ratio === '60_40') return 'sm:col-span-5';
    return 'sm:col-span-6';
  } else {
    if (ratio === '40_60') return 'md:col-span-7';
    if (ratio === '60_40') return 'md:col-span-5';
    return 'md:col-span-6';
  }
});
</script>

<template>
  <div :class="wrapperGridClasses" class="ansa-form-scope">
    <div v-if="sections[0]" :class="leftColumnSpan">
      <BaseBlock :block="sections[0]" />
    </div>

    <div v-if="sections[1]" :class="rightColumnSpan">
      <BaseBlock :block="sections[1]" />
    </div>
  </div>
</template>