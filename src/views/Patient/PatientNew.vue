<template>
  <div class="sm:mx-5  lg:mx-20%">
    <da-patient-create></da-patient-create>
  </div>
</template>

<script>
import PatientCreate from './PatientCreate.vue';

export default {
    components: {
        'da-patient-create': PatientCreate
    }
}
</script>

<style>

</style>
