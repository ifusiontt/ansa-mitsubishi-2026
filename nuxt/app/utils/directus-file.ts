/** A Directus file reference as returned by the API — a raw UUID or a resolved file object. */
type FileRef = string | { id?: string | null } | null | undefined;

/** UUID of a Directus file reference, or '' when there is none. */
export function directusFileId(file: FileRef): string {
	if (!file) return '';
	return typeof file === 'string' ? file : (file.id ?? '');
}

/** "TTD $289,000" — the showroom price format. */
export function formatTtdPrice(price: number | null | undefined): string {
	if (price == null) return '';
	return `TTD $${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price)}`;
}
