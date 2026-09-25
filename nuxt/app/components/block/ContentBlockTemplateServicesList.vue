<script setup lang="ts">
interface ContentItem {
	id: string;
	headline?: string;
	description?: string;
	tagline?: string;
	text_blocks?: string;
	images?: Array<{ directus_files_id?: { id?: string } }>;
}

const props = withDefaults(defineProps<{
	tagline?: string;
	variant?: string;
	items?: ContentItem[];
}>(), {
	items: () => [],
});

const { setAttr } = useVisualEditing();

const isSingleItem = computed(() => props.items.length === 1);

function extractTextBlocks(tb: any): string {
  if (typeof tb === 'string') return tb;

  if (typeof tb === 'object' && tb !== null && tb.content) {
    tb = tb.content;
  }

  if (!Array.isArray(tb)) return '';

  let ulAccum: string[] = [];
  const result: string[] = [];

  function flushUl() {
    if (ulAccum.length > 0) {
      result.push('<ul class="list-disc list-inside space-y-1">' + ulAccum.join('') + '</ul>');
      ulAccum = [];
    }
  }

  function buildHtml(node: any): string | undefined {
    if (typeof node === 'string') return node;
    if (!node) return '';

    // Directus repeater block with description (rich-text HTML field)
    if (typeof node.description === 'string') {
      let html = node.description;
      // Decode double-encoded HTML entities (Directus TipTap stores &amp;lt; for <)
      html = html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      // Clean up stored styling: tighten spacing, remove stray <br> and &nbsp;
      html = html.replace(/mt-\d+/g, 'mt-2').replace(/space-y-\d+/g, 'space-y-1').replace(/<br[^>]*>/gi, '').replace(/&nbsp;/g, '');
      return html;
    }
    if (!node.type) return '';

    if (node.type === 'text') {
      const inner = node.text || '';
      return node.marks?.some((m: any) => m.type === 'bold')
        ? `<strong>${inner}</strong>`
        : inner;
    }

    if (node.type === 'list_item' && node.content) {
      const inner = node.content.map(buildHtml).filter(Boolean).join('');
      ulAccum.push(`<li>${inner}</li>`);
      return undefined;
    }

    if (node.type === 'bullet_list') return undefined;

    if (node.type === 'paragraph' && node.content) {
      return `<p class="mb-2">${node.content.map(buildHtml).filter(Boolean).join('')}</p>`;
    }

    return '';
  }

  tb.reduce((_, block: any) => {
    if (block && block.type && block.type !== 'list_item') {
      flushUl();
    }
    const html = buildHtml(block);
    if (html !== undefined) {
      result.push(html);
    }
    return block;
  }, null as any);

  flushUl();
  return result.join('');
}
</script>

<template>
	<section class="py-16 px-6 bg-white">
		<div class="max-w-7xl mx-auto">
			<div v-if="tagline" class="text-center mb-12">
				<Tagline
					:tagline="tagline"
					:data-directus="setAttr({ collection: 'block_content_block', item: '', fields: 'tagline', mode: 'popover' })"
				/>
			</div>

			<!-- Single-item showcase mode: standalone block, no alternating grid -->
			<template v-if="isSingleItem">
				<div
					v-for="item in items"
					:key="item.id"
					:data-directus="setAttr({ collection: 'block_content_block', item: item.id, fields: 'headline,description,text_blocks,images', mode: 'modal' })"
					class="max-w-4xl mx-auto"
				>
					<div class="flex flex-col md:flex-row items-start gap-8 md:gap-12">
						<!-- <pre class="text-gray-600">
							{{ item }}
						</pre> -->
						<div :class="[variant === 'equipment' ? 'w-full md:w-1/2' : 'w-full md:w-2/5']">
							<DirectusImage
								v-if="item.images?.[0]?.directus_files_id?.id"
								:uuid="item.images[0].directus_files_id.id"
								:alt="item.headline || 'Service image'"
								:class="[
									'w-full rounded-xl',
									variant === 'equipment' ? 'h-auto max-h-[450px] object-contain p-4' : 'h-64 object-cover shadow-sm'
								]"
								sizes="(max-width: 768px) 100vw, 40vw"
							/>
							<div v-else class="w-full h-64 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
								<Icon name="lucide:image" size="48" />
							</div>
						</div>

						<div :class="[variant === 'equipment' ? 'w-full md:w-1/2' : 'w-full md:w-3/5']">
							<h3
								v-if="item.headline"
								:data-directus="setAttr({ collection: 'block_content_block', item: item.id, fields: 'headline', mode: 'popover' })"
								class="text-2xl font-bold text-slate-900 mb-4"
							>
								{{ item.headline }}
							</h3>

							<p
								v-if="item.description"
								:data-directus="setAttr({ collection: 'block_content_block', item: item.id, fields: 'description', mode: 'popover' })"
								class="text-slate-600 leading-relaxed mb-4"
								v-html="item.description"
							/>

				<div
						v-if="item.text_blocks"
						:data-directus="setAttr({ collection: 'block_content_block', item: item.id, fields: 'text_blocks', mode: 'popover' })"
						class="prose max-w-none text-slate-600"
						v-html="extractTextBlocks(item.text_blocks)"
					/>
						</div>
					</div>
				</div>
			</template>

			<!-- Multi-item alternating split layout -->
			<template v-else>
				<div class="flex flex-col gap-12">
					<div
						v-for="(item, index) in items"
						:key="item.id"
						:data-directus="setAttr({ collection: 'block_content_block', item: item.id, fields: 'headline,description,images', mode: 'modal' })"
						:class="[
							'flex flex-col md:flex-row items-center gap-8 md:gap-12',
							index % 2 === 1 ? 'md:flex-row-reverse' : '',
						]"
					>
						<div class="w-full md:w-1/2">
							<DirectusImage
								v-if="item.images?.[0]?.directus_files_id?.id"
								:uuid="item.images[0].directus_files_id.id"
								:alt="item.headline || `Service ${index + 1}`"
								:class="[
									'w-full rounded-xl',
									variant === 'equipment' ? 'h-auto max-h-[450px] object-contain p-4' : 'h-64 object-cover shadow-sm'
								]"
								sizes="(max-width: 768px) 100vw, 50vw"
							/>
							<div v-else class="w-full h-64 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
								<Icon name="lucide:image" size="48" />
							</div>
						</div>

						<div class="w-full md:w-1/2">
							<h3
								v-if="item.headline"
								:data-directus="setAttr({ collection: 'block_content_block', item: item.id, fields: 'headline', mode: 'popover' })"
								class="text-2xl font-bold text-slate-900 mb-3"
							>
								{{ item.headline }}
							</h3>
							<p
								v-if="item.description"
								:data-directus="setAttr({ collection: 'block_content_block', item: item.id, fields: 'description', mode: 'popover' })"
								class="text-slate-600 leading-relaxed mb-4"
								v-html="item.description"
							/>

				<div
						v-if="item.text_blocks"
						:data-directus="setAttr({ collection: 'block_content_block', item: item.id, fields: 'text_blocks', mode: 'popover' })"
						class="prose max-w-none text-slate-600"
						v-html="extractTextBlocks(item.text_blocks)"
					/>
						</div>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
