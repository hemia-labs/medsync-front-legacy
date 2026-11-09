<template>
  <v-dialog :value="value" max-width="1050" scrollable aria-labelledby="plan-dialog-title" @input="$emit('input', $event)">
    <v-card>
      <v-card-title id="plan-dialog-title">Elegir un plan</v-card-title>
      <v-card-text><plan-catalog v-if="value" /></v-card-text>
      <v-card-actions><v-spacer /><v-btn text color="primary" @click="$emit('input', false)">Cerrar</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
import PlanCatalog from './PlanCatalog.vue';
export default { components: { PlanCatalog }, props: { value: Boolean } };
</script>
