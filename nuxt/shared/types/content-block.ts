/**
 * Hand-written types for the `block_content_block` collection.
 *
 * These interfaces are intentionally NOT in the generated `schema.ts`
 * (regenerated via `npm run generate:types` from the live Directus schema).
 * `ContentBlock.vue` and `ContentBlockFallback.vue` type against these
 * instead of importing from `#shared/types/schema`.
 */

export interface BlockContentItems {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	status?: string | null;
	tagline?: string | null;
	headline?: string | null;
	description?: string | null;
	text_blocks?: any;
	images?: Array<{ directus_files_id?: string | { id?: string } }> | null;
	buttons?: any[] | null;
	url?: string | null;
	slug?: string | null;
	path?: string | null;
	page?: { slug?: string | null } | string | null;
	[key: string]: any;
}

export interface BlockContentBlock {
	/** @primaryKey */
	id: string;
	tagline?: string | null;
	variant?: string | null;
	template?: string | null;
	container_width?: string | null;
	items?: Array<BlockContentItems | string> | null;
	[key: string]: any;
}
