<script setup lang="ts">
import { computed } from 'vue'; // 🔐 FIXED: Explicit import to prevent auto-import compilation hiccups

interface CtaSimpleData {
  id?: string;
  status?: string;
  headline?: string;
  subtext?: string;
  background_style?: string;
  buttons?: any[];
  container_width?: string;
}

const props = withDefaults(defineProps<{ data?: CtaSimpleData }>(), {
  data: () => ({}),
});

const { setAttr } = useVisualEditing();

// Pure color tokens: Clean typography bindings matching their background containers
const backgroundClasses: Record<string, string> = {
  default: 'bg-slate-900 text-white',
  light: 'bg-slate-50 text-slate-900',
  brand: 'bg-slate-950 text-white',
  light_tint: 'bg-slate-900/5 border-y border-slate-900/10 text-slate-900',
};

// Normalize Directus background_style values (e.g. "Light Tint" → "light_tint")
const normalizedBgStyle = computed(() => {
  const raw = props.data?.background_style;
  if (!raw) return 'default';
  return raw.toLowerCase().replace(/\s+/g, '_');
});

const isFullWidth = computed(
  () => props.data?.container_width === 'full' || props.data?.container_width === 'fluid'
);

const isLightBg = computed(
  () => normalizedBgStyle.value === 'light' || normalizedBgStyle.value === 'light_tint'
);

// Resolve button variant: dark backgrounds need light-text variants
function resolveVariant(directusVariant?: string | null) {
  if (isLightBg.value) {
    return directusVariant || 'solid';
  }
  const darkProblematic = ['outline', 'ghost', 'link'];
  if (directusVariant && darkProblematic.includes(directusVariant)) {
    return 'cta_outline';
  }
  return directusVariant || 'cta_outline';
}
</script>

<template>
  <!-- 🔐 FIXED: Added v-if="data" check to protect child properties from strict null errors -->
  <section
    v-if="data"
    :data-directus="setAttr({ collection: 'block_cta_simple', item: data?.id ?? '', fields: 'subtext', mode: 'modal' })"
    class="py-20 px-6 w-full transition-colors duration-200"
    :class="backgroundClasses[normalizedBgStyle] || backgroundClasses.default"
  >
    <div :class="isFullWidth ? 'max-w-7xl mx-auto text-center px-6 lg:px-16' : 'max-w-3xl mx-auto text-center'">
      <Headline
        v-if="data?.headline"
        :headline="data.headline"
        as="h2"
        class="text-3xl lg:text-5xl font-black mb-6 leading-tight tracking-tight"
        :class="isLightBg ? 'text-slate-900' : 'text-white'"
        :data-directus="setAttr({ collection: 'block_cta_simple', item: data?.id ?? '', fields: 'headline', mode: 'popover' })"
      />

      <p
        v-if="data?.subtext"
        :data-directus="setAttr({ collection: 'block_cta_simple', item: data?.id ?? '', fields: 'subtext', mode: 'popover' })"
        class="text-lg lg:text-xl mb-10 max-w-2xl mx-auto leading-relaxed opacity-90"
      >
        {{ data.subtext }}
      </p>

      <div v-if="data?.buttons?.length" class="flex flex-wrap justify-center gap-4">
        <!-- 🔐 FIXED: Swapped 'data.buttons' to 'data?.buttons' to satisfy strict template compiler rules -->
        <template v-for="(wrapper, index) in data?.buttons" :key="index">
          <ButtonGroup
            v-if="wrapper.collection === 'block_button_group' && wrapper.item"
            :buttons="wrapper.item.buttons || []"
            :default-variant="resolveVariant(wrapper.item?.variant)"
          />
          <BaseButton
            v-else-if="wrapper.collection === 'block_button' && wrapper.item"
            :id="wrapper.item.id"
            :label="wrapper.item.label"
            :type="wrapper.item.type"
            :url="wrapper.item.url"
            :page="wrapper.item.page"
            :post="wrapper.item.post"
            :variant="resolveVariant(wrapper.item.variant)"
          />
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* CTA block buttons: Mitsubishi Red border hover for visual appeal */
section a.nuxt-link-active,
section a:not(.nuxt-link-active):hover,
section button:hover {
  border-color: #C3002F !important;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
</style>