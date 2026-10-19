<script setup lang="ts">
import PartsServicePage from '~/components/layout/PartsServicePage.vue';
import PartsRequestForm from '~/components/forms/PartsRequestForm.vue';

/** /parts — Genuine Parts tab: trust badge strip (as on /service) above the content. `?vehicle=<model>` pre-selects the vehicle. */
const vehicleModel = useInquiryVehicleQuery();

const TRUST_BADGES = [
	{ icon: 'lucide:shield-check', title: '100% OEM Guarantee', detail: 'Direct from factory' },
	{ icon: 'lucide:scan-barcode', title: 'VIN-Verified Fitment', detail: 'Zero compatibility errors' },
	{ icon: 'lucide:badge-check', title: 'Factory Warranty Safe', detail: 'Preserves manufacturer coverage' },
	{ icon: 'lucide:warehouse', title: 'Nationwide Counter Stock', detail: '4 branch locations' },
];
</script>

<template>
	<PartsServicePage
		tab="parts"
		permalink="/parts"
		title="Genuine Parts"
		description="The exact parts your Mitsubishi was engineered with, stocked and fitted by ANSA Motors across Trinidad & Tobago."
	>
		<template #lead>
			<TrustBadgeStrip :badges="TRUST_BADGES" label="Why buy genuine parts from ANSA Motors" />
		</template>

		<PartsRequestForm :vehicle-model="vehicleModel" />
	</PartsServicePage>
</template>
