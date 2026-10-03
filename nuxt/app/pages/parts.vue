<script setup lang="ts">
import PartsServicePage from '~/components/layout/PartsServicePage.vue';
import PartsRequestForm from '~/components/forms/PartsRequestForm.vue';

/** /parts — Genuine Parts tab. `?vehicle=<model>` pre-selects the vehicle. */
const vehicleModel = useInquiryVehicleQuery();
</script>

<template>
	<PartsServicePage
		tab="parts"
		permalink="/parts"
		title="Genuine Parts"
		description="The exact parts your Mitsubishi was engineered with, stocked and fitted by ANSA Motors across Trinidad & Tobago."
	>
		<PartsRequestForm :vehicle-model="vehicleModel" />
	</PartsServicePage>
</template>
