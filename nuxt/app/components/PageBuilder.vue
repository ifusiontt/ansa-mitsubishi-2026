<script setup lang="ts">
interface PageBuilderProps {
  sections: PageBlock[];
}

const props = defineProps<PageBuilderProps>();

const validBlocks = computed(() =>
  props.sections.filter(
    (block): block is PageBlock & { collection: string; item: object } =>
      typeof block.collection === 'string' && !!block.item && typeof block.item === 'object',
  ),
);

function getContainerWidth(block: PageBlock & { collection: string; item: object }): string {
  // Directus block payloads are dynamic — cast at this single boundary for
  // custom-block fields (container_width / template) absent from the generated union.
  const item = block.item as Record<string, any>;
  const isFull = item?.container_width === 'full' || item?.container_width === 'fluid';
  if (isFull) return 'max-w-none px-0';
  if (
    block.collection === 'block_hero' ||
    block.collection === 'block_hero_custom' ||
    block.collection === 'block_layout_wrapper' || // Register our generic layout container rule safely
    (block.collection === 'block_content_block' &&
      (item?.template?.includes('testimonial') || item?.template?.includes('media_carousel') || item?.template?.includes('hero_slider')))
  ) {
    return 'max-w-xxl';
  }
  return 'max-w-7xl';
}
</script>

<template>
  <div v-for="block in validBlocks" :key="block.id" :data-background="block.background" class="py-8">
    <Container :max-width="getContainerWidth(block)">
      <BaseBlock :block="block" />
    </Container>
  </div>
</template>
