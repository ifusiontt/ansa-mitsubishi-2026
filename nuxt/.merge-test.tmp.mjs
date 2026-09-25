
import { createDirectus, rest, readItems, createItem, deleteItem, readSingleton } from '@directus/sdk';
import fs from 'fs';
const token = fs.readFileSync('/home/ifusion/development/Mitsubishi_Ansa_Mitsubishi_2026/directus/.env', 'utf8').match(/^[A-Z_]*ADMIN_TOKEN[^\n]*/m)?.[0].split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
const c = createDirectus('http://localhost:8055', { auth: { autoRefresh: false, storage: () => ({ token }) } }).with(rest());
const log = (...a) => console.log(...a);

// 1. Create test button
const btn = await c.request(createItem('block_button', { label: '__merge_test_btn', type: 'url', url: 'https://example.com', variant: 'solid', sort: 1 }));
log('created button:', btn.id, btn.label);

// 2. Create test CTA with M2A buttons
const cta = await c.request(createItem('block_cta_simple', { headline: '__merge_test_cta', subtext: 'test', status: 'draft', background_style: 'default', buttons: [btn.id] }));
log('created cta:', cta.id);

// 3. Create draft test page
const page = await c.request(createItem('pages', { title: '__merge_test_page', permalink: '/__merge_test', status: 'draft' }));
log('created page:', page.id, page.permalink);

// 4. Attach CTA as a page block (M2A junction page_blocks)
await c.request(createItem('page_blocks', { page: page.id, collection: 'block_cta_simple', item: cta.id, sort: 1 }));
log('attached block to page');

// 5. Query with nested M2A structure (what the new handler will use)
const fields = ['title', {
  blocks: ['id', 'collection', 'item', 'sort', {
    item: {
      block_cta_simple: ['id', 'status', 'headline', 'subtext', 'background_style', 'container_width', {
        buttons: ['id', 'collection', 'item', {
          item: {
            block_button: ['id', 'label', 'variant', 'type', 'url', 'sort', { page: ['permalink'] }, { post: ['slug'] }],
            block_button_group: ['id', { buttons: ['id', 'label', 'variant', 'type', 'url'] }],
          },
        }],
      }],
    },
  }],
}];
const res = await c.request(readItems('pages', { filter: { id: { _eq: page.id } }, fields }));
const p = Array.isArray(res) ? res[0] : res;
const block = p.blocks?.[0];
log('block collection:', block?.collection);
log('item type:', typeof block?.item, block?.item ? 'keys=' + Object.keys(block.item).join(',') : '');
log('buttons:', JSON.stringify(block?.item?.buttons, null, 1)?.slice(0, 800));

// Store ids for cleanup
fs.writeFileSync('/tmp/merge-test-ids.json', JSON.stringify({ button: btn.id, cta: cta.id, page: page.id }));
log('IDs saved to /tmp/merge-test-ids.json');
