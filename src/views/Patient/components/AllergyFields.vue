<template>
  <div class="allergy-fields">
    <fieldset>
      <legend>Estado de alergias <span aria-hidden="true">*</span></legend>
      <p>Consulta al paciente. Dejar una respuesta pendiente no significa que no tenga alergias.</p>
      <label v-for="option in options" :key="option.value" :class="{ selected: value.review_status === option.value }">
        <input type="radio" :name="groupName" :value="option.value" :checked="value.review_status === option.value" :disabled="disabled" @change="select(option.value)">
        <span>{{ option.label }}</span>
      </label>
    </fieldset>
    <label v-if="needsDetail" class="detail-label" :for="`${groupName}-detail`">{{ value.review_status === 'UNKNOWN' ? 'Motivo por el que no se pudo confirmar *' : 'Alergias y detalles conocidos *' }}</label>
    <textarea v-if="needsDetail" :id="`${groupName}-detail`" :value="value.description || ''" :disabled="disabled" rows="4" maxlength="5000" :aria-describedby="`${groupName}-help`" @input="$emit('input', { ...value, description: $event.target.value })"></textarea>
    <p v-if="needsDetail" :id="`${groupName}-help`">{{ value.review_status === 'UNKNOWN' ? 'Este estado conservará un aviso de información pendiente de aclarar.' : 'Indica la sustancia y reacción reportada. Señala los detalles que se desconocen.' }}</p>
  </div>
</template>
<script>
export default {
  props: { value: { type: Object, required: true }, disabled: Boolean, groupName: { type: String, default: 'allergy-review' } },
  data: () => ({ options: [{ value: 'HAS_ALLERGIES', label: 'Con alergias registradas' }, { value: 'NONE_KNOWN', label: 'Sin alergias conocidas' }, { value: 'UNKNOWN', label: 'No se pudo confirmar' }] }),
  computed: { needsDetail() { return ['HAS_ALLERGIES', 'UNKNOWN'].includes(this.value.review_status); } },
  methods: { select(status) { this.$emit('input', { ...this.value, review_status: status, has_allergy: status === 'HAS_ALLERGIES' ? true : status === 'NONE_KNOWN' ? false : null }); } }
};
</script>
<style scoped>
fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
legend, .detail-label { font-weight: 700; color: #334155; }
p { color: #475569; font-size: .88rem; margin: .5rem 0 .8rem; }
fieldset label { display: flex; align-items: center; gap: .7rem; border: 1px solid #cbd5e1; border-radius: 10px; padding: .8rem; margin: .5rem 0; min-height: 44px; cursor: pointer; color: #334155; }
fieldset label.selected { border-color: var(--color-primary-700); background: var(--color-primary-50, #ecfeff); }
input { width: 18px; height: 18px; flex-shrink: 0; accent-color: var(--color-primary-700); }
.detail-label { display: block; margin-top: 1rem; }
textarea { width: 100%; border: 1px solid #94a3b8; border-radius: 8px; padding: .7rem; margin-top: .4rem; color: #334155; background: #fff; resize: vertical; }
input:focus-visible, textarea:focus-visible { outline: 3px solid var(--color-primary-700); outline-offset: 3px; }
</style>
