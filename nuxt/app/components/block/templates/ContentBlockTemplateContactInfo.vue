<script setup lang="ts">
interface ContentBlockContactInfoProps {
  tagline?: string;
  variant?: string;
  items?: Array<{
    id: string | number;
    tagline?: string;
    headline?: string;
    description?: string;
  }>;
}

const props = withDefaults(defineProps<ContentBlockContactInfoProps>(), {
  tagline: '',
  variant: '',
  items: () => [],
});

const { setAttr } = useVisualEditing();
</script>

<template>
  <div class="w-full space-y-6">
    <div v-if="tagline" class="border-b border-slate-200 pb-4 mb-6">
      <p 
        :data-directus="setAttr({ collection: 'block_content_block', item: '', fields: 'tagline', mode: 'popover' })"
        class="text-[11px] font-black text-slate-900 tracking-widest uppercase mb-1.5"
      >
        {{ tagline }}
      </p>
      <h2 class="text-2xl md:text-3xl font-black text-[#1d1d1d] tracking-tight leading-none">
        Ansa Motors Commercial Division
      </h2>
    </div>

    <div class="space-y-4 w-full">
      <div
        v-for="item in items"
        :key="item.id"
        :data-directus="setAttr({ collection: 'block_content_block', item: item.id, fields: 'tagline,headline,description', mode: 'modal' })"
        class="bg-slate-900/5 border border-slate-900/10 rounded-xl p-5 hover:bg-slate-900/10 transition-all duration-200 shadow-sm"
      >
        <p v-if="item.tagline" class="text-[10px] font-extrabold text-slate-900 tracking-widest uppercase mb-1">
          {{ item.tagline }}
        </p>
        <h3 v-if="item.headline" class="text-base md:text-lg font-bold text-[#1d1d1d] mb-1.5">
          {{ item.headline }}
        </h3>
        <p v-if="item.description" class="text-xs text-slate-600 leading-relaxed" v-html="item.description" />
      </div>
    </div>
  </div>
</template>