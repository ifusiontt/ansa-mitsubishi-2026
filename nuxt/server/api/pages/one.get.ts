import { withoutTrailingSlash, withLeadingSlash } from 'ufo';
import type { Page, PageBlock, BlockPost, Post, BlockContentBlock, BlockLayoutWrapper } from '#shared/types/schema';

/**
 * Shared sub-schemas for the ANSA page-builder block system.
 *
 * M2A deep-fetch convention (Directus 12 + @directus/sdk v22):
 * an object entry inside a fields array marks the M2A junction, and its keys
 * are the allowed target collections — serialized as `parent.m2aField:collection.field`
 * (e.g. `blocks.item:block_cta_simple.buttons.item:block_button.label`).
 * Only collections listed here are resolved; others stay raw UUIDs.
 *
 * ── URL-size constraint (HTTP 431) ─────────────────────────────────────────
 * Directus serves items via GET, so the serialized `fields` list lives in the
 * query string. Node's HTTP server rejects request lines above ~16KB
 * (HTTP 431, no body). The full block payload is ~22KB when inlined into the
 * page query, which 431s every page request. We therefore split the fetch:
 *
 *   Phase 1 — page + blocks with LEAN per-target item fields (scalars + the
 *             small legacy nests). URL ≈ 7KB.
 *   Phase 2 — for pages that actually contain the heavy custom blocks
 *             (block_content_block, block_layout_wrapper), one small batched
 *             query per collection (URLs ≈ 2KB / 7.5KB) resolves the nested
 *             items / sections / M2A buttons, merged back onto `block.item`.
 *
 * The final JSON shape is identical to a single deep fetch, so the frontend
 * contracts are unchanged.
 */

const blockButtonFields = [
	'id',
	'label',
	'variant',
	'size',
	'type',
	'url',
	'sort',
	{ page: ['id', 'permalink', 'title'] },
	{ post: ['id', 'slug', 'title'] },
];

/** M2A button junction (block_button | block_button_group) used by CTA/content/hero blocks. */
const blockButtonsM2AFields = [
	'id',
	'collection',
	'item',
	{
		item: {
			block_button: blockButtonFields,
			block_button_group: ['id', 'sort', { buttons: blockButtonFields }],
		},
	},
];

/** File list via the `*_files` O2M junction (files special) — id + display metadata. */
const blockFileListFields = ['id', { directus_files_id: ['id', 'title', 'filename_download', 'filesize'] }];

/** Full content-item schema (block_content_items) — shared by block_content_block and layout sections. */
const blockContentItemFields = [
	'id',
	'sort',
	'status',
	'tagline',
	'headline',
	'description',
	'text_blocks',
	{ images: blockFileListFields },
	{ buttons: blockButtonsM2AFields },
	{ vehicle: ['id', 'title', 'slug', 'tagline'] },
];

/** Full block_content_block payload — O2M content items (auto-sorted via relation sort_field). */
const blockContentBlockFields = [
	'id',
	'tagline',
	'variant',
	'template',
	'container_width',
	{ items: blockContentItemFields },
];

const blockCtaSimpleFields = [
	'id',
	'status',
	'headline',
	'subtext',
	'background_style',
	'container_width',
	{ buttons: blockButtonsM2AFields },
];

const blockFormFields = [
	'id',
	'tagline',
	'headline',
	{
		form: [
			'id',
			'title',
			'submit_label',
			'success_message',
			'on_success',
			'success_redirect_url',
			'is_active',
			{
				fields: [
					'id',
					'name',
					'type',
					'label',
					'placeholder',
					'help',
					'validation',
					'width',
					'choices',
					'required',
					'sort',
				],
			},
		],
	},
];

/** Full block_layout_wrapper payload — O2M sections, each an M2A into a nested block. */
const blockLayoutWrapperFields = [
	'id',
	'status',
	'template',
	'layout_ratio',
	'grid_gap',
	'collapse_breakpoint',
	{
		sections: [
			'id',
			'collection',
			'item',
			{
				item: {
					block_content_block: blockContentBlockFields,
					block_form: blockFormFields,
					block_cta_simple: blockCtaSimpleFields,
				},
			},
		],
	},
];

/**
 * Page fields configuration for Directus queries (PHASE 1 — lean)
 *
 * This defines the complete field structure for pages including:
 * - Basic page metadata (title, id)
 * - SEO fields for search engine optimization
 * - Complex nested content blocks (hero, gallery, pricing, forms, etc.)
 *
 * ⚠️ The two heavy custom blocks (block_content_block, block_layout_wrapper)
 * only request their scalar fields here — their nested payloads are fetched in
 * Phase 2 (see enrichCustomBlocks) to keep this query string under the ~16KB
 * URL limit enforced by the Directus HTTP server (HTTP 431).
 */
const pageFields = [
	'title',
	'id',
	{
		// SEO fields for search engine optimization
		seo: ['title', 'meta_description', 'og_image'],
		// Content blocks
		blocks: [
			'id',
			'background',
			'collection', // Type of block (hero, gallery, pricing, etc.)
			'item', // The actual block content (scalars only for the heavy blocks — nested payload resolved in Phase 2)
			'sort',
			'hide_block',
			{
				// Different block types with their specific fields.
				// ⚠️ Only the collections listed here are deep-resolved by the M2A fetch;
				// any other allowed M2A collection comes back as a raw id in `item`.
				item: {
					// ── Legacy ANSA starter blocks ──
					block_richtext: ['id', 'tagline', 'headline', 'content', 'alignment'],
					block_gallery: ['id', 'tagline', 'headline', { items: ['id', 'directus_file', 'sort'] }],
					block_pricing: [
						'id',
						'tagline',
						'headline',
						{
							pricing_cards: [
								'id',
								'sort',
								'title',
								'description',
								'price',
								'badge',
								'features',
								'is_highlighted',
								{
									button: ['id', 'label', 'variant', 'url', 'type', { page: ['permalink'] }, { post: ['slug'] }],
								},
							],
						},
					],
					block_hero: [
						'id',
						'tagline',
						'headline',
						'description',
						'layout',
						'image',
						{
							button_group: [
								'id',
								{
									buttons: ['id', 'label', 'variant', 'url', 'type', { page: ['permalink'] }, { post: ['slug'] }],
								},
							],
						},
					],
					block_posts: ['id', 'tagline', 'headline', 'collection', 'limit'],
					block_form: blockFormFields,
					// ── ANSA custom page-builder blocks (Mitsubishi 2026) ──
					// Custom hero — headline/body + single media file or media gallery
					block_hero_custom: [
						'id',
						'title',
						'headline',
						'highlight_keyword',
						'body',
						'variant',
						'template',
						'container_width',
						'media',
						{ media_gallery: blockFileListFields },
					],
					// CTA — headline/subtext + background style + M2A buttons
					block_cta_simple: blockCtaSimpleFields,
					// Heavy blocks — scalars only here; nested payload resolved in Phase 2
					block_content_block: ['id', 'tagline', 'variant', 'template', 'container_width'],
					block_layout_wrapper: ['id', 'status', 'template', 'layout_ratio', 'grid_gap', 'collapse_breakpoint'],
				},
			},
		],
	},
];

/**
 * PHASE 2 — resolve the heavy custom block payloads.
 *
 * Scans the page's blocks for `block_content_block` / `block_layout_wrapper`
 * entries whose `item` is still a raw id (not deep-resolved in Phase 1), then
 * issues one batched query per collection with the full nested field list and
 * merges the result back onto `block.item`. Both query URLs stay well under
 * the ~16KB limit (≈2KB and ≈7.5KB), and content items are returned in
 * `sort` order (the junction relation carries sort_field = sort).
 */
async function enrichCustomBlocks(page: Page, token: string | null): Promise<Page> {
	const blocks = (page.blocks as PageBlock[]) || [];
	const contentBlockIds: string[] = [];
	const layoutWrapperIds: number[] = [];

	for (const block of blocks) {
		// Phase 1 requested scalar sub-fields, so `item` arrives as a partial
		// object (scalars only) — detect the missing nested payload, not a raw id.
		if (block.collection === 'block_content_block' && block.item && typeof block.item === 'object' && !Array.isArray((block.item as BlockContentBlock).items)) {
			contentBlockIds.push((block.item as BlockContentBlock).id);
		}

		if (block.collection === 'block_layout_wrapper' && block.item && typeof block.item === 'object' && !Array.isArray((block.item as BlockLayoutWrapper).sections)) {
			layoutWrapperIds.push((block.item as BlockLayoutWrapper).id);
		}
	}

	if (contentBlockIds.length === 0 && layoutWrapperIds.length === 0) return page;

	const [contentBlocks, layoutWrappers] = await Promise.all([
		contentBlockIds.length
			? directusServer.request(
					token && token.trim()
						? withToken(
								token,
								readItems('block_content_block', {
									filter: { id: { _in: contentBlockIds } },
									fields: blockContentBlockFields as any,
								}),
							)
						: readItems('block_content_block', {
								filter: { id: { _in: contentBlockIds } },
								fields: blockContentBlockFields as any,
							}),
				)
			: Promise.resolve([] as BlockContentBlock[]),
		layoutWrapperIds.length
			? directusServer.request(
					token && token.trim()
						? withToken(
								token,
								readItems('block_layout_wrapper', {
									filter: { id: { _in: layoutWrapperIds } },
									fields: blockLayoutWrapperFields as any,
								}),
							)
						: readItems('block_layout_wrapper', {
								filter: { id: { _in: layoutWrapperIds } },
								fields: blockLayoutWrapperFields as any,
							}),
				)
			: Promise.resolve([] as BlockLayoutWrapper[]),
	]);

	const contentMap = new Map((contentBlocks as BlockContentBlock[]).map((b) => [b.id, b]));
	const wrapperMap = new Map((layoutWrappers as BlockLayoutWrapper[]).map((b) => [b.id, b]));

	for (const block of blocks) {
		if (block.collection === 'block_content_block' && block.item && typeof block.item === 'object' && !Array.isArray((block.item as BlockContentBlock).items)) {
			const full = contentMap.get((block.item as BlockContentBlock).id);
			if (full) block.item = full;
		} else if (block.collection === 'block_layout_wrapper' && block.item && typeof block.item === 'object' && !Array.isArray((block.item as BlockLayoutWrapper).sections)) {
			const full = wrapperMap.get((block.item as BlockLayoutWrapper).id);
			if (full) block.item = full;
		}
	}

	return page;
}

/**
 * Pages API Handler - Fetches individual pages by permalink
 *
 * Purpose: This handler is designed for website pages (homepage, about, contact, etc.) where you need to:
 * - Fetch pages by their permalink (URL path)
 * - Support complex page layouts with multiple content blocks
 * - Handle dynamic content blocks (hero, gallery, pricing, forms, etc.)
 * - Support preview mode for draft/unpublished content
 * - Handle version-specific content for content management workflows
 *
 * Key Features:
 * - Permalink-based routing (e.g. /about, /contact, /pricing)
 * - Preview mode with token authentication
 * - Version support for content management workflows
 * - Dynamic content blocks with real-time data fetching
 * - Two-phase block fetching (see header) that stays under the Directus
 *   ~16KB GET-URL limit while still deep-resolving M2A buttons, content
 *   items and layout-wrapper sections
 * - SEO metadata support
 */
export default defineEventHandler(async (event) => {
	const query = getQuery(event);

	const { preview, permalink: rawPermalink, id } = query;
	// Live preview sends version=published (Directus v12+) or version=main (older Directus versions) for live content.
	// Neither key requires an explicit version parameter — strip both to fetch the default published version.
	const version = String(query.version) !== 'published' && String(query.version) !== 'main' ? query.version : undefined;

	// Normalize permalink: ensure it starts with / and doesn't end with /
	// This handles various URL formats consistently
	const permalink = withoutTrailingSlash(withLeadingSlash(String(rawPermalink)));

	// Use the server token from runtimeConfig when preview mode is enabled
	const config = useRuntimeConfig();
	const token = preview === 'true' ? (config.directusServerToken as string) || null : null;

	try {
		let page: Page;
		let pageId = id as string;

		// Version-specific content handling:
		// When a version is requested (e.g. "draft", "published"), we need to:
		// 1. Look up the page ID by permalink if not provided directly
		// 2. Fetch the specific version of that page
		// 3. Fail gracefully if the page doesn't exist for that version
		if (version && !pageId) {
			// Look up page ID by permalink - this is needed because Directus version API requires an ID
			let lookupRequest = (readItems as any)('pages', {
				filter: { permalink: { _eq: permalink } },
				limit: 1,
				fields: ['id'],
			});

			if (token && token.trim()) {
				lookupRequest = withToken(token, lookupRequest);
			}

			const pageIdLookup = (await directusServer.request(lookupRequest)) as any[];
			pageId = pageIdLookup.length > 0 ? pageIdLookup[0]?.id || '' : '';

			// Security: If version was requested but page doesn't exist, return 404
			// This prevents silent fallback to published content when version lookup fails
			if (version && !pageId) {
				throw createError({ statusCode: 404, statusMessage: 'Page version not found' });
			}
		}

		// Execute API call based on whether we need version-specific content
		if (version && pageId) {
			// Version-specific request: Use readItem with specific version
			// This is used when we have both a pageId and want a specific version (draft, published, etc.)
			try {
				page = (await directusServer.request(
					token && token.trim()
						? withToken(
								token,
								readItem('pages', pageId, {
									version: String(version),
									fields: pageFields as any,
									deep: {
										blocks: { _sort: ['sort'], _filter: { hide_block: { _neq: true } } },
									},
								}),
							)
						: readItem('pages', pageId, {
								version: String(version),
								fields: pageFields as any,
								deep: {
									blocks: { _sort: ['sort'], _filter: { hide_block: { _neq: true } } },
								},
							}),
				)) as unknown as Page;
			} catch {
				// If version fetch fails, throw error
				throw createError({ statusCode: 404, statusMessage: 'Page version not found' });
			}
		} else {
			// Standard request: Use readItems with permalink filtering
			// Filter logic:
			// - If preview mode: fetch any status (to show draft content)
			// - If not preview: only fetch published content (for public viewing)
			const pageData = await directusServer.request(
				token && token.trim()
					? withToken(
							token,
							readItems('pages', {
								filter:
									preview === 'true'
										? { permalink: { _eq: permalink } }
										: { permalink: { _eq: permalink }, status: { _eq: 'published' } },
								limit: 1,
								fields: pageFields as any,
								deep: {
									blocks: { _sort: ['sort'], _filter: { hide_block: { _neq: true } } },
								},
							}),
						)
					: readItems('pages', {
							filter:
								preview === 'true'
									? { permalink: { _eq: permalink } }
									: { permalink: { _eq: permalink }, status: { _eq: 'published' } },
							limit: 1,
							fields: pageFields as any,
							deep: {
								blocks: { _sort: ['sort'], _filter: { hide_block: { _neq: true } } },
							},
						}),
			);

			if (!pageData.length) {
				throw createError({ statusCode: 404, statusMessage: 'Page not found' });
			}

			page = pageData[0] as Page;
		}

		// PHASE 2: resolve the heavy custom block payloads (content items,
		// layout sections, M2A buttons) fetched with lean fields above.
		page = await enrichCustomBlocks(page, token);

		// Dynamic Content Enhancement:
		// Some blocks need additional data fetched at runtime
		// This is where we enhance static block data with dynamic content
		if (Array.isArray(page?.blocks)) {
			for (const block of page.blocks as PageBlock[]) {
				// Handle dynamic posts blocks - these blocks display a list of posts
				// The posts are fetched dynamically based on the block's configuration
				if (
					block.collection === 'block_posts' &&
					block.item &&
					typeof block.item !== 'string' &&
					'collection' in block.item &&
					block.item.collection === 'posts'
				) {
					const blockPost = block.item as BlockPost;
					const limit = blockPost.limit ?? 6; // Default to 6 posts if no post limit specified

					// Fetch the actual posts data for this block
					// Always fetch published posts only (no preview mode for dynamic content)
					const posts: Post[] = await directusServer.request(
						readItems('posts', {
							fields: ['id', 'title', 'description', 'slug', 'image', 'published_at'],
							filter: { status: { _eq: 'published' } },
							sort: ['-published_at'],
							limit,
						}),
					);

					// Attach the fetched posts to the block for frontend rendering
					(block.item as BlockPost & { posts: Post[] }).posts = posts;
				}
			}
		}

		return page;
	} catch (err) {
		// Preserve 404s thrown above; surface unexpected errors distinctly so a
		// broken CMS query (e.g. a 431/500 from Directus) is not masked as a
		// "Page not found" 404 in production.
		if (err && typeof err === 'object' && 'statusCode' in err) {
			throw err;
		}

		throw createError({ statusCode: 500, statusMessage: 'Failed to load page content' });
	}
});
