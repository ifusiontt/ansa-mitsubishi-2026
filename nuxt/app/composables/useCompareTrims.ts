import type { VehiclePage } from '#shared/types/vehicle';

/**
 * Global state for the Compare Trims modal (components/showroom/CompareTrimsModal.vue, mounted once
 * in layouts/default.vue). The showroom page calls `open(vehicle)` with its payload; the modal reads
 * the vehicle-level fields it shows alongside every trim (title, year, seating) plus the trims.
 */
export type CompareTrimsVehicle = Pick<VehiclePage, 'slug' | 'title' | 'model_year' | 'seating_capacity' | 'trims'>;

export function useCompareTrims() {
	const isOpen = useState('compare-trims-open', () => false);
	const vehicleData = useState<CompareTrimsVehicle | null>('compare-trims-vehicle', () => null);

	function open(vehicle: CompareTrimsVehicle) {
		vehicleData.value = vehicle;
		isOpen.value = true;
	}

	function close() {
		isOpen.value = false;
	}

	return { isOpen, vehicleData, open, close };
}
