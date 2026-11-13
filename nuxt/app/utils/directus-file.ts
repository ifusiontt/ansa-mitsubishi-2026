import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

/** A Directus file reference as returned by the API — a raw UUID or a resolved file object. */
type FileRef = string | { id?: string | null } | null | undefined;

/** UUID of a Directus file reference, or '' when there is none. */
export function directusFileId(file: FileRef): string {
	if (!file) return '';
	return typeof file === 'string' ? file : (file.id ?? '');
}

/**
 * CSS object-position for a file's Directus focal point (stored in source pixels), or undefined when the
 * reference is a bare UUID or has no focal point — callers then keep their default framing.
 */
export function focalPosition(file: FileRef): string | undefined {
	if (!file || typeof file !== 'object') return undefined;
	const { focal_point_x: x, focal_point_y: y, width, height } = file as Record<string, unknown>;
	if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') return undefined;
	if (!width || !height) return undefined;
	return `${((x / width) * 100).toFixed(1)}% ${((y / height) * 100).toFixed(1)}%`;
}

/**
 * Directus transform tiers for lifestyle photography (2048px WebP masters from
 * scripts/optimize-lifestyle-images.py): hero banner + gallery lightbox, story rows / highlights,
 * gallery-strip thumbnails.
 */
export const LIFESTYLE_TIERS = {
	hero: { width: 2048, quality: 85 },
	story: { width: 1200, quality: 82 },
	thumb: { width: 600, quality: 80 },
} as const;

/**
 * Directus transform for a transparent colour render on the ~768px colour stage (2x for high-DPI).
 * No trim: the studio canvas keeps each render's camera framing and ground plane intact; sizing is
 * handled by the height-bounded VehicleColorStage.
 */
export const VEHICLE_RENDER_QUERY = 'width=1536&quality=82&format=webp';

/** "TTD $289,000" — the showroom price format. */
export function formatTtdPrice(price: number | null | undefined): string {
	if (price == null) return '';
	return `TTD $${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price)}`;
}

/**
 * "Download Brochure" link: the vehicle's `brochure` PDF in Directus (/assets/<id>, uploaded by
 * scripts/upload-brochures.mjs), else the legacy `brochure_url`; '' hides the CTA.
 */
export function brochureHref(vehicle: { brochure?: FileRef; brochure_url?: string | null } | null | undefined): string {
	const id = directusFileId(vehicle?.brochure);
	return id ? getDirectusAssetURL(id) : (vehicle?.brochure_url ?? '');
}
