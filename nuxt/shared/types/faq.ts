/**
 * FAQ display types for /about (FAQ tab). The raw `faqs` row is `Faq` in the
 * generated schema.ts; this file only adds the category presentation layer.
 * Seeded by directus/seeds/about-and-faqs.mjs.
 */
import type { Faq } from './schema';

export type FaqCategory = NonNullable<Faq['category']>;

/** Display order and headings for FAQ groups. */
export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
	warranty: 'Warranty Coverage',
	parts: 'Spare Parts',
	service: 'Service Booking',
	financing: 'Financing',
	general: 'General',
};

export interface FaqGroup {
	category: FaqCategory;
	label: string;
	items: Faq[];
}
