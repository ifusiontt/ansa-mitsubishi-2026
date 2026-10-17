/**
 * Global state for the Book a Test Drive modal (components/shared/BookTestDriveModal.vue,
 * mounted once in layouts/default.vue). Any CTA calls `open()` with the vehicle — and, on a
 * showroom page, the selected trim — so the modal opens pre-populated.
 */
export interface TestDriveTarget {
	slug?: string;
	title?: string;
	trim?: string;
}

export function useTestDriveModal() {
	const isOpen = useState('test-drive-open', () => false);
	const vehicleSlug = useState('test-drive-slug', () => '');
	const vehicleTitle = useState('test-drive-title', () => '');
	const selectedTrim = useState('test-drive-trim', () => '');

	function open(vehicle: TestDriveTarget = {}) {
		vehicleSlug.value = vehicle.slug ?? '';
		vehicleTitle.value = vehicle.title ?? '';
		selectedTrim.value = vehicle.trim ?? '';
		isOpen.value = true;
	}

	function close() {
		isOpen.value = false;
	}

	return { isOpen, vehicleSlug, vehicleTitle, selectedTrim, open, close };
}
