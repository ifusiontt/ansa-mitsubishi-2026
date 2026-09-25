<script setup lang="ts">
interface HeroCustomData {
  id?: string;
  title?: string;
  highlight_keyword?: string;
  headline?: string;
  body?: string;
  media?: string;
  variant?: string;
  buttons?: any[];
  container_width?: string;
}

const props = withDefaults(defineProps<{ data?: HeroCustomData }>(), {
  data: () => ({}),
});

const { setAttr } = useVisualEditing();

const heading = computed(() => props.data?.headline || props.data?.title || '');
const bodyText = computed(() => props.data?.body || '');
const highlightKeyword = computed(() => props.data?.highlight_keyword || '');
const variant = computed(() => props.data?.variant || 'dark_industrial');
const isFullWidth = computed(
  () => props.data?.container_width === 'full' || props.data?.container_width === 'fluid'
);

// Enhanced highlighter that changes color dynamically based on the active background theme context
function renderHighlightedText(text: string, keyword: string, currentVariant: string): string {
  if (!keyword || !text) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');

  // Apply Mitsubishi Red on dark themes, and Dark Industrial Slate on light themes for pristine legibility
  const colorClass = currentVariant === 'light_clean' ? 'text-slate-900 font-black' : 'text-[#C3002F] font-extrabold';
  return text.replace(regex, `<span class="${colorClass}">$1</span>`);
}
</script>

<template>
  <section
    v-if="variant === 'dark_industrial'"
    :data-directus="setAttr({ collection: 'block_hero_custom', item: data.id ?? '', fields: 'body', mode: 'modal' })"
    class="bg-slate-950 py-20 text-white relative overflow-hidden border-b-4 border-[#C3002F] w-full"
  >
    <div :class="isFullWidth ? 'w-full' : 'max-w-7xl mx-auto px-6'" class="relative z-10">
      <div class="flex flex-col lg:flex-row items-center gap-12">
        <div class="flex-1">
          <h1
            v-if="heading"
            :data-directus="setAttr({ collection: 'block_hero_custom', item: data.id ?? '', fields: 'headline', mode: 'popover' })"
            class="text-4xl lg:text-5xl font-bold mb-6 leading-tight"
            v-html="renderHighlightedText(heading, highlightKeyword, 'dark_industrial')"
          />
          <p
            v-if="bodyText"
            :data-directus="setAttr({ collection: 'block_hero_custom', item: data.id ?? '', fields: 'body', mode: 'popover' })"
            class="text-lg text-slate-300 mb-8 max-w-xl"
            v-html="bodyText"
          />
          <div v-if="data?.buttons?.length" class="flex flex-wrap gap-4">
            <template v-for="(btn, i) in data.buttons" :key="btn.id ?? i">
              <ButtonGroup v-if="btn.item?.button" :buttons="[btn.item.button]" />
              <ButtonGroup
                v-else-if="btn.item?.block_button_group?.buttons"
                :buttons="btn.item.block_button_group.buttons"
              />
            </template>
          </div>
        </div>
        <div class="flex-1 w-full" v-if="data?.media">
          <DirectusImage :uuid="data.media" :alt="heading || 'Hero image'" class="w-full h-auto object-cover rounded-xl" fill />
        </div>
      </div>
    </div>
    <div class="absolute inset-0 opacity-5 pointer-events-none" style="background-image: repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%); background-size: 20px 20px;" />
  </section>

  <section
    v-else-if="variant === 'light_clean'"
    :data-directus="setAttr({ collection: 'block_hero_custom', item: data.id ?? '', fields: 'body', mode: 'modal' })"
    class="bg-gradient-to-b from-white to-slate-50 py-16 text-slate-900 relative overflow-hidden border-b border-slate-200/60 w-full"
  >
    <div :class="isFullWidth ? 'w-full' : 'max-w-7xl mx-auto px-6'" class="relative z-10">
      <div class="flex flex-col lg:flex-row items-center gap-12">
        <div class="flex-1 text-left">
          <h1
            v-if="heading"
            :data-directus="setAttr({ collection: 'block_hero_custom', item: data.id ?? '', fields: 'headline', mode: 'popover' })"
            class="text-3xl lg:text-4xl font-black mb-4 leading-tight tracking-tight text-slate-900"
            v-html="renderHighlightedText(heading, highlightKeyword, 'light_clean')"
          />
          <p
            v-if="bodyText"
            :data-directus="setAttr({ collection: 'block_hero_custom', item: data.id ?? '', fields: 'body', mode: 'popover' })"
            class="text-base text-slate-600 max-w-2xl font-medium leading-relaxed"
            v-html="bodyText"
          />
          <div v-if="data?.buttons?.length" class="flex flex-wrap gap-4 mt-6">
            <template v-for="(btn, i) in data.buttons" :key="btn.id ?? i">
              <ButtonGroup v-if="btn.item?.button" :buttons="[btn.item.button]" />
            </template>
          </div>
        </div>
        <div class="flex-1 w-full" v-if="data?.media">
          <DirectusImage :uuid="data.media" :alt="heading || 'Hero image'" class="w-full h-auto object-cover rounded-xl" fill />
        </div>
      </div>
    </div>
    <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background-image: radial-gradient(#0A0A0A 1px, transparent 1px); background-size: 16px 16px;" />
  </section>
</template>
