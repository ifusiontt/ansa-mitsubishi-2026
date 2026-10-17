/**
 * Global state for the showroom lead modal (components/shared/BookTestDriveModal.vue, mounted once
 * in layouts/default.vue). Any CTA calls `open()` with the vehicle — and, on a showroom page, the
 * selected trim — so the modal opens pre-populated.
 *
 * `mode: 'financing'` (from the financing estimator) turns it into a pre-approval request and
 * carries the estimate the customer was looking at.
 */
export type LeadModalMode = 'test_drive' | 'financing';

/** The estimator's figures at the moment "Apply for Pre-Approval" was pressed. */
export interface FinancingContext {
	price: number;
	depositPercent: number;
	termMonths: number;
	monthlyPayment: number;
}

export interface TestDriveTarget {
	mode?: LeadModalMode;
	slug?: string;
	title?: string;
	trim?: string;
	financing?: FinancingContext;
}

export function useTestDriveModal() {
	const isOpen = useState('test-drive-open', () => false);
	const mode = useState<LeadModalMode>('test-drive-mode', () => 'test_drive');
	const vehicleSlug = useState('test-drive-slug', () => '');
	const vehicleTitle = useState('test-drive-title', () => '');
	const selectedTrim = useState('test-drive-trim', () => '');
	const financing = useState<FinancingContext | null>('test-drive-financing', () => null);

	function open(target: TestDriveTarget = {}) {
		// Financing mode needs the estimate; without one it falls back to a plain test-drive request.
		mode.value = target.mode === 'financing' && target.financing ? 'financing' : 'test_drive';
		vehicleSlug.value = target.slug ?? '';
		vehicleTitle.value = target.title ?? '';
		selectedTrim.value = target.trim ?? '';
		financing.value = mode.value === 'financing' ? (target.financing ?? null) : null;
		isOpen.value = true;
	}

	function close() {
		isOpen.value = false;
	}

	return { isOpen, mode, vehicleSlug, vehicleTitle, selectedTrim, financing, open, close };
}
