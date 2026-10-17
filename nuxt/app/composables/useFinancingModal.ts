/**
 * Global state for the two-step financing modal (components/shared/FinancingCalculatorModal.vue,
 * mounted once in layouts/default.vue). The homepage fleet cards' "Calculate" calls `open()` with
 * the vehicle and the price to finance (its starting price).
 */
export interface FinancingTarget {
	slug: string;
	title: string;
	price: number;
	trim?: string;
}

export function useFinancingModal() {
	const isOpen = useState('financing-open', () => false);
	const target = useState<FinancingTarget | null>('financing-target', () => null);

	function open(next: FinancingTarget) {
		target.value = next;
		isOpen.value = true;
	}

	function close() {
		isOpen.value = false;
	}

	return { isOpen, target, open, close };
}
