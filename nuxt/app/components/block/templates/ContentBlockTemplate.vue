<script setup lang="ts">
interface ContentBlockTemplateProps {
	tagline?: string;
	variant?: string;
	items: any[];
}

const props = defineProps<ContentBlockTemplateProps>();

// Variant: industries_cta (default) — 2x2 grid of sector cards with images + text
// Future variants: features_list, testimonials_grid, etc.

// Get the first image UUID from an item's images array
const getImageUuid = (item: any) => {
	if (!item.images || !Array.isArray(item.images) || item.images.length === 0) {
		return null;
	}
	const firstImage = item.images[0]?.directus_files_id;
	if (typeof firstImage === 'string') {
		return firstImage;
	}
	if (firstImage && typeof firstImage === 'object' && firstImage.id) {
		return firstImage.id;
	}
	return null;
};

// Resolve a link target for the item if available
const getItemTo = (item: any): string | undefined => {
	// 🔐 NEW PRIORITY: Check the new Many-to-Any sorted buttons array
	if (item?.buttons && Array.isArray(item.buttons) && item.buttons.length > 0) {
		const buttonItem = item.buttons[0]?.item; // Extract target block_button
		if (buttonItem) {
			if (buttonItem.type === 'page' && buttonItem.page?.permalink) {
				return buttonItem.page.permalink;
			}
			if (buttonItem.type === 'url' && buttonItem.url) {
				return buttonItem.url;
			}
		}
	}

	// Legacy fallback paths (keeps old blocks from breaking)
	if (item?.url && typeof item.url === 'string') return item.url;
	if (item?.slug && typeof item.slug === 'string') return `/industries/${item.slug}`;
	if (item?.path && typeof item.path === 'string') return item.path;
	if (item?.page && typeof item.page === 'object' && typeof item.page.slug === 'string') {
		return `/${item.page.slug}`;
	}
	return undefined;
};

// Industries CTA variant — sector-specific card styling
const getCardBackgroundClass = (index: number): string => {
	if (index === 0) {
		return 'bg-accent'; // Transportation - Mitsubishi Red (#C3002F)
	}
	return 'bg-gray-200'; // All others - light gray
};

const getDescriptionTextClass = (index: number): string => {
	if (index === 0) {
		return 'text-slate-900'; // Brand dark for contrast on Mitsubishi Red
	}
	return 'text-[#444444]'; // Default description color
};

const cardBaseClass = 'group relative block overflow-hidden rounded-2xl px-8 pt-8 transition ring-1 ring-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 hover:shadow-lg motion-reduce:transition-none';
</script>

<template>
	<div class="content-block-template">
		<!-- Section Tagline -->
		<div v-if="tagline" class="text-center mb-16">
			<Tagline>{{ tagline }}</Tagline>
		</div>

		<!-- Variant: industries_cta (default) — 2x2 sector card grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<template v-for="(item, index) in items" :key="item.id">
				<NuxtLink
					v-if="getItemTo(item)"
					:to="getItemTo(item)"
					:class="[cardBaseClass, 'cursor-pointer', getCardBackgroundClass(index)]"
					:aria-label="`View ${item.headline}`"
				>
					<!-- Card Body -->
					<div class="absolute inset-0 pointer-events-none">
						<div class="absolute inset-0 bg-gradient-to-t from-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-10"></div>
					</div>
					<div class="relative z-10 h-full">
						<div class="flex-1 pr-8">
							<h3 class="text-2xl font-bold mb-4 underline-offset-4 text-gray-900 group-hover:underline">
								{{ item.headline }}
							</h3>
							<p :class="['text-base leading-relaxed max-w-sm', getDescriptionTextClass(index)]">
								{{ item.description }}
							</p>
						</div>
						<div class="flex-shrink-0 flex items-center justify-center">
							<DirectusImage
								v-if="getImageUuid(item)"
								:uuid="getImageUuid(item)"
								:alt="item.headline || ''"
								class="max-w-full max-h-[398px] object-contain -mt-10 ml-10 transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transform-none drop-shadow-[0_12px_28px_rgba(0,0,0,0.25)]"
							/>
							<div v-else class="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
								<span class="text-gray-500 text-sm">No Image</span>
							</div>
						</div>
					</div>
					<div class="absolute top-3 right-3">
						<span class="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-gray-900 shadow transition-opacity duration-200 opacity-0 group-hover:opacity-100">
							View
							<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path fill-rule="evenodd" d="M7.22 14.78a.75.75 0 0 1 0-1.06L10.94 10 7.22 6.28a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0Z" clip-rule="evenodd" />
							</svg>
						</span>
					</div>
				</NuxtLink>
				<div
					v-else
					:class="[cardBaseClass, 'cursor-default', getCardBackgroundClass(index)]"
					:aria-label="item.headline"
				>
					<!-- Card Body (same as above) -->
					<div class="absolute inset-0 pointer-events-none">
						<div class="absolute inset-0 bg-gradient-to-t from-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-10"></div>
					</div>
					<div class="relative z-10 h-full">
						<div class="flex-1 pr-8">
							<h3 class="text-2xl font-bold mb-4 underline-offset-4 text-gray-900 group-hover:underline">
								{{ item.headline }}
							</h3>
							<p :class="['text-base leading-relaxed max-w-sm', getDescriptionTextClass(index)]">
								{{ item.description }}
							</p>
						</div>
						<div class="flex-shrink-0 flex items-center justify-center">
							<DirectusImage
								v-if="getImageUuid(item)"
								:uuid="getImageUuid(item)"
								:alt="item.headline || ''"
								class="max-w-full max-h-[398px] object-contain -mt-10 ml-10 transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transform-none drop-shadow-[0_12px_28px_rgba(0,0,0,0.25)]"
							/>
							<div v-else class="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
								<span class="text-gray-500 text-sm">No Image</span>
							</div>
						</div>
					</div>
					<div class="absolute top-3 right-3">
						<span class="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-gray-900 shadow transition-opacity duration-200 opacity-0 group-hover:opacity-100">
							View
							<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path fill-rule="evenodd" d="M7.22 14.78a.75.75 0 0 1 0-1.06L10.94 10 7.22 6.28a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0Z" clip-rule="evenodd" />
							</svg>
						</span>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>
