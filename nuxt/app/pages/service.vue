<script setup lang="ts">
import PartsServicePage from '~/components/layout/PartsServicePage.vue';
import ServiceBookingForm from '~/components/forms/ServiceBookingForm.vue';

/** /service — Service Centre tab. `?vehicle=<model>` pre-selects the vehicle (e.g. from showroom CTAs). */
const vehicleModel = useInquiryVehicleQuery();
</script>

<template>
	<PartsServicePage
		tab="service"
		permalink="/service"
		title="Service Centre"
		description="Factory-trained technicians, Mitsubishi diagnostics and genuine parts — book your next service with ANSA Motors."
	>
		<ServiceBookingForm :vehicle-model="vehicleModel" />
	</PartsServicePage>
</template>
