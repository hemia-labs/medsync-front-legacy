<template>
  <div role="group" :aria-label="label">
    <div v-for="(item, index) in value || []" :key="index" class="catalog-list-row">
      <catalog-reference-field :value="item" :family="family" :label="label + ' ' + (index + 1)" :disabled="disabled" :active="active" @input="replace(index, $event)" />
      <v-btn text small :disabled="disabled" :aria-label="'Quitar ' + label + ' ' + (index + 1)" @click="replace(index, null)">Quitar</v-btn>
    </div>
    <catalog-reference-field v-if="adding" :value="pending" :family="family" :label="'Añadir ' + label" :disabled="disabled" :active="active" @input="pending = $event" @commit="add" />
    <v-btn v-else text small color="primary" :disabled="disabled || (value || []).length >= 50" @click="adding = true">Añadir {{ label }}</v-btn>
    <p v-for="error in errors" :key="error" role="alert">{{ error }}</p>
  </div>
</template>
<script>
import CatalogReferenceField from './CatalogReferenceField.vue';
export default {
  components: { CatalogReferenceField },
  props: { value: { default: null }, family: String, label: String, disabled: Boolean, active: Boolean, errors: { type: Array, default: () => [] } },
  data: () => ({ adding: false, pending: null }),
  methods: {
    replace(index, ref) { const rows = [...(this.value || [])]; if (ref) rows[index] = ref; else rows.splice(index, 1); this.$emit('input', rows.length ? rows : null); },
    add(ref) { if (!ref) return; if (!(this.value || []).some(item => item.code === ref.code)) this.$emit('input', [...(this.value || []), ref]); this.adding = false; this.pending = null; }
  }
};
</script>
<style scoped>.catalog-list-row { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: start; }</style>
