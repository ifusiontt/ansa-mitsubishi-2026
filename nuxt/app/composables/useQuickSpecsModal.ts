import type { VehicleSummary } from '#shared/types/vehicle';

/**
 * Global state for the Quick Specs modal (components/showroom/QuickSpecsModal.vue, mounted once in
 * layouts/default.vue). The homepage fleet cards' "+ Full Specs" calls `open(vehicle)` with the
 * card's fleet index row, so the modal needs no extra fetch.
 */
export function useQuickSpecsModal() {
	const isOpen = useState('quick-specs-open', () => false);
	const vehicle = useState<VehicleSummary | null>('quick-specs-vehicle', () => null);

	function open(target: VehicleSummary) {
		vehicle.value = target;
		isOpen.value = true;
	}

	function close() {
		isOpen.value = false;
	}

	return { isOpen, vehicle, open, close };
}
