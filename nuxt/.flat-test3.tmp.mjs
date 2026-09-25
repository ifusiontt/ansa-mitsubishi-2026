import { createDirectus, readItems, rest } from '@directus/sdk';
import fs from 'fs';
let captured = null;
const origFetch = globalThis.fetch;
globalThis.fetch = (url, opts) => { captured = String(url); return origFetch(url, opts); };
const blockButtonFields = ['id', 'label', 'variant', 'size', 'type', 'url', 'sort', { page: ['id', 'permalink', 'title'] }, { post: ['id', 'slug', 'title'] }];
const blockButtonsM2AFields = ['id', 'collection', 'item', { item: { block_button: blockButtonFields, block_button_group: ['id', 'sort', { buttons: blockButtonFields }] } }];
const blockFileListFields = ['id', { directus_files_id: ['id', 'title', 'filename_download', 'filesize'] }];
const blockContentItemFields = ['id', 'sort', 'status', 'tagline', 'headline', 'description', 'text_blocks', { images: blockFileListFields }, { buttons: blockButtonsM2AFields }, { vehicle: ['id', 'title', 'slug', 'tagline'] }];
const blockContentBlockFields = ['id', 'tagline', 'variant', 'template', 'container_width', { items: blockContentItemFields }];
const blockCtaSimpleFields = ['id', 'status', 'headline', 'subtext', 'background_style', 'container_width', { buttons: blockButtonsM2AFields }];
const blockFormFields = ['id', 'tagline', 'headline', { form: ['id', 'title', 'submit_label', 'success_message', 'on_success', 'success_redirect_url', 'is_active', { fields: ['id', 'name', 'type', 'label', 'placeholder', 'help', 'validation', 'width', 'choices', 'required', 'sort'] }] }];
const pageFields = ['title', 'id', {
  seo: ['title', 'meta_description', 'og_image'],
  blocks: ['id', 'background', 'collection', 'item', 'sort', 'hide_block', {
    item: {
      block_richtext: ['id', 'tagline', 'headline', 'content', 'alignment'],
      block_gallery: ['id', 'tagline', 'headline', { items: ['id', 'directus_file', 'sort'] }],
      block_pricing: ['id', 'tagline', 'headline', { pricing_cards: ['id', 'sort', 'title', 'description', 'price', 'badge', 'features', 'is_highlighted', { button: ['id', 'label', 'variant', 'url', 'type', { page: ['permalink'] }, { post: ['slug'] }] }] }],
      block_hero: ['id', 'tagline', 'headline', 'description', 'layout', 'image', { button_group: ['id', { buttons: ['id', 'label', 'variant', 'url', 'type', { page: ['permalink'] }, { post: ['slug'] }] }] }],
      block_posts: ['id', 'tagline', 'headline', 'collection', 'limit'],
      block_form: blockFormFields,
      block_hero_custom: ['id', 'title', 'headline', 'highlight_keyword', 'body', 'variant', 'template', 'container_width', 'media', { media_gallery: blockFileListFields }],
      block_cta_simple: blockCtaSimpleFields,
      block_content_block: blockContentBlockFields,
      block_layout_wrapper: ['id', 'status', 'template', 'layout_ratio', 'grid_gap', 'collapse_breakpoint', { sections: ['id', 'collection', 'item', { item: { block_content_block: blockContentBlockFields, block_form: blockFormFields, block_cta_simple: blockCtaSimpleFields } }] }],
    },
  }],
}];
const c = createDirectus('http://localhost:8055', { globals: { fetch: globalThis.fetch } }).with(rest());
try {
  const res = await c.request(readItems('pages', { filter: { permalink: { _eq: '/__e2e_test' } }, limit: 1, fields: pageFields, deep: { blocks: { _sort: ['sort'], _filter: { hide_block: { _neq: true } } } } }));
  console.log('RES type:', typeof res, Array.isArray(res) ? 'array len ' + res.length : JSON.stringify(res).slice(0, 200));
} catch (e) {
  console.log('THREW:', String(e.message || e).slice(0, 800));
}
fs.writeFileSync('/tmp/sdk-url.txt', captured);
process.exit(0);
