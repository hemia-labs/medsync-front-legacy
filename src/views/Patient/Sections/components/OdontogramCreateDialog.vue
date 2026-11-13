<template>
  <v-dialog :value="value" max-width="580" scrollable :persistent="busy" @input="close">
    <v-card v-dialog-name="'Crear odontograma'" class="odontogram-create">
      <div class="create-header">
        <span class="create-icon"><v-icon color="var(--color-primary-700)" size="26">mdi-tooth-outline</v-icon></span>
        <div class="create-heading">
          <p class="create-eyebrow">Expediente clínico</p>
          <h2>Crear odontograma</h2>
          <p v-if="patientName" class="create-patient">{{ patientName }}</p>
        </div>
        <v-btn icon :disabled="busy" aria-label="Cerrar creación de odontograma" @click="close"><v-icon>mdi-close</v-icon></v-btn>
      </div>

      <v-card-text class="create-body">
        <p class="create-intro">Selecciona el tipo de dentición para comenzar a registrar los diagnósticos del paciente.</p>
        <v-alert v-if="hasActive" dense outlined type="warning" class="mb-4">
          El odontograma actual se desactivará al crear uno nuevo. Podrás consultarlo en el historial.
        </v-alert>
        <v-alert v-if="error" dense outlined type="error" role="alert" class="mb-4">{{ error }}</v-alert>
        <fieldset class="dentition-options" :disabled="busy">
          <legend>Tipo de dentición</legend>
          <label v-for="item in types" :key="item.code" class="dentition-option" :class="{ selected: selectedType === item.code }">
            <input v-model="selectedType" type="radio" :name="'dentition-' + _uid" :value="item.code" />
            <span><strong>{{ item.description }}</strong><small>{{ typeDescription(item.description) }}</small></span>
          </label>
        </fieldset>
        <p v-if="!types.length" role="status" class="create-intro">No hay tipos de dentición disponibles. Cierra esta ventana y vuelve a cargar el odontograma.</p>
      </v-card-text>

      <v-card-actions class="create-footer">
        <span v-if="busy" role="status" class="create-saving">Guardando odontograma…</span>
        <v-spacer></v-spacer>
        <v-btn text :disabled="busy" class="create-cancel" @click="close">Ahora no</v-btn>
        <v-btn v-if="requiresReload" depressed color="var(--color-primary-900)" :disabled="busy" class="create-submit" @click="$emit('reload')">Volver a cargar</v-btn>
        <v-btn v-else depressed color="var(--color-primary-900)" :disabled="!selectedType || busy || !types.some(item => item.code === selectedType)" :loading="busy" class="create-submit" @click="submit">Crear odontograma</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import dialogName from '../../../../core/directives/dialog-name';

export default {
  directives: { dialogName },
  props: {
    value: Boolean,
    busy: Boolean,
    hasActive: Boolean,
    requiresReload: Boolean,
    error: { type: String, default: '' },
    patientName: { type: String, default: '' },
    types: { type: Array, default: () => [] }
  },
  data() { return { selectedType: '' }; },
  watch: {
    value: {
      immediate: true,
      handler(open) { if(open) this.selectedType = this.types.length === 1 ? this.types[0].code : ''; }
    }
  },
  methods: {
    close() { if(!this.busy) this.$emit('input', false); },
    submit() {
      if(this.busy || this.requiresReload || !this.types.some(item => item.code === this.selectedType)) return;
      this.$emit('create', this.selectedType);
    },
    typeDescription(description) {
      const name = String(description || '').toLowerCase();
      if(/mixt/.test(name)) return 'Dientes temporales y permanentes.';
      if(/temporal|infantil|leche|decidu/.test(name)) return 'Registro de dientes de leche.';
      if(/permanente|adult/.test(name)) return 'Registro de dientes permanentes.';
      return 'Registra el estado de las regiones dentales.';
    }
  }
};
</script>

<style scoped>
.odontogram-create { border-radius: 12px; overflow: hidden; }
.create-header { display: flex; align-items: flex-start; gap: 14px; padding: 24px; border-bottom: 1px solid var(--color-border, #d8e9ef); }
.create-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 48px; height: 48px; border-radius: 12px; background: var(--color-primary-100); }
.create-heading { flex: 1; min-width: 0; }
.create-eyebrow { margin: 0 0 4px; font-size: 10px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; color: var(--color-text-muted, #64748b); }
.create-heading h2 { margin: 0; font-size: 22px; line-height: 1.3; font-weight: 600; color: var(--color-text, #25364d); }
.create-patient { margin: 5px 0 0; color: var(--color-text-muted, #64748b); font-size: 13px; overflow-wrap: anywhere; }
.odontogram-create .create-body { padding: 22px 24px; background: var(--color-bg, #f8fbfd); }
.create-intro { margin: 0 0 20px; color: var(--color-text-muted, #64748b); font-size: 14px; line-height: 1.6; }
.dentition-options { border: 0; padding: 0; margin: 0; min-width: 0; display: grid; gap: 10px; }
.dentition-options legend { margin-bottom: 10px; color: var(--color-text, #25364d); font-size: 13px; font-weight: 600; }
.dentition-option { display: flex; align-items: center; gap: 14px; border: 1px solid var(--color-border, #d8e9ef); border-radius: 8px; padding: 15px 16px; background: var(--color-surface); cursor: pointer; }
.dentition-option.selected { border-color: var(--color-primary-700); background: var(--color-primary-100); box-shadow: inset 0 0 0 1px var(--color-primary-700); }
.dentition-option:focus-within { outline: 2px solid var(--color-primary-700); outline-offset: 3px; }
.dentition-option input { width: 18px; height: 18px; flex-shrink: 0; accent-color: var(--color-primary-700); }
.dentition-option strong, .dentition-option small { display: block; overflow-wrap: anywhere; }
.dentition-option strong { font-size: 14px; color: var(--color-text, #25364d); font-weight: 600; }
.dentition-option small { margin-top: 3px; font-size: 12px; line-height: 1.5; color: var(--color-text-muted, #64748b); }
.dentition-options:disabled .dentition-option { cursor: wait; opacity: .7; }
.odontogram-create .create-footer { padding: 16px 24px; gap: 8px; border-top: 1px solid var(--color-border, #d8e9ef); flex-wrap: wrap; }
.create-footer .v-btn { letter-spacing: 0; text-transform: none; font-size: 13px; font-weight: 600; margin: 0; }
.create-footer .create-submit:not(.v-btn--disabled) { color: white; }
.create-saving { font-size: 12px; color: var(--color-text-muted, #64748b); }
html[data-theme="clinical-night"] .odontogram-create { --color-text: #e2e8f0; --color-text-muted: #cbd5e1; --color-surface: #1e293b; --color-bg: #172333; --color-border: #3b4d63; }
html[data-theme="clinical-night"] .dentition-option.selected { --color-primary-100: #15364d; }
@media (max-width: 480px) {
  .create-header { padding: 20px 16px; gap: 10px; }
  .create-heading h2 { font-size: 20px; }
  .create-icon { width: 40px; height: 40px; }
  .odontogram-create .create-body { padding: 20px 16px; }
  .odontogram-create .create-footer { padding: 16px; flex-direction: column; align-items: stretch; }
  .create-footer .spacer { display: none; }
  .create-saving { width: 100%; }
  .create-footer .create-submit, .create-footer .create-cancel { flex: none; width: 100%; }
  .create-footer .create-submit { order: -1; }
}
</style>
