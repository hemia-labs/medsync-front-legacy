<template>
  <v-dialog :value="value" max-width="500" :persistent="busy" scrollable @input="close">
    <v-card v-dialog-name="title" class="odontogram-confirm">
      <header class="confirm-header">
        <span class="confirm-icon" :class="{ danger }"><v-icon size="23">{{ icon }}</v-icon></span>
        <div class="confirm-heading"><p>Odontograma</p><h2>{{ title }}</h2></div>
        <v-btn icon :disabled="busy" :aria-label="'Cerrar: ' + title" @click="close"><v-icon size="21">mdi-close</v-icon></v-btn>
      </header>
      <v-card-text class="confirm-body">
        <p>{{ message }}</p>
        <v-alert v-if="error" type="error" dense outlined role="alert" class="mt-4 mb-0">{{ error }}</v-alert>
        <p v-if="busy" role="status" class="confirm-saving">Guardando cambio…</p>
      </v-card-text>
      <v-card-actions class="confirm-footer">
        <button class="confirm-button confirm-button--secondary" type="button" :disabled="busy" @click="close">Cancelar</button>
        <button class="confirm-button confirm-button--primary" :class="{ danger }" type="button" :disabled="busy" @click="confirm">
          <v-progress-circular v-if="busy" indeterminate size="16" width="2" color="white"></v-progress-circular>
          {{ busy ? 'Guardando…' : confirmLabel }}
        </button>
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
    danger: Boolean,
    title: { type: String, default: 'Confirmar cambio' },
    message: { type: String, default: '' },
    error: { type: String, default: '' },
    confirmLabel: { type: String, default: 'Confirmar' },
    icon: { type: String, default: 'mdi-information-outline' }
  },
  methods: {
    close() { if(!this.busy) this.$emit('input', false); },
    confirm() { if(!this.busy) this.$emit('confirm'); }
  }
};
</script>

<style scoped>
.odontogram-confirm { border-radius: 12px; overflow: hidden; color: var(--color-text, #25364d); background: var(--color-surface, #fff); }
.confirm-header { display: flex; align-items: flex-start; gap: 12px; padding: 22px 24px; border-bottom: 1px solid var(--color-border, #d8e9ef); }
.confirm-heading { flex: 1; min-width: 0; }
.confirm-heading p { margin: 0 0 5px; color: var(--color-primary-900, #086783); font-size: 11px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
.confirm-heading h2 { margin: 0; color: var(--color-text, #25364d); font-size: 20px; font-weight: 700; line-height: 1.4; overflow-wrap: anywhere; }
.confirm-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; height: 42px; width: 42px; border-radius: 10px; background: var(--color-primary-100, #e0f7fc); color: var(--color-primary-700, #0e7490); }
.confirm-icon .v-icon { color: inherit; }
.confirm-icon.danger { background: #fff1f2; color: #b42318; }
.odontogram-confirm .confirm-body { padding: 22px 24px; background: var(--color-bg, #f8fbfd); color: var(--color-text-muted, #64748b); }
.confirm-body p { margin: 0; font-size: 14px; line-height: 1.7; }
.confirm-body .confirm-saving { margin-top: 16px; font-size: 13px; }
.odontogram-confirm .confirm-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--color-border, #d8e9ef); }
.confirm-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; border-radius: 8px; border: 1px solid var(--color-border, #d8e9ef); padding: 9px 16px; font-size: 13px; line-height: 1.4; font-weight: 700; }
.confirm-button--secondary { color: var(--color-text, #25364d); background: var(--color-surface, #fff); }
.confirm-button--primary { color: white; border-color: transparent; background: var(--color-primary-900, #086783); }
.confirm-button--primary.danger { background: #b42318; }
.confirm-button:disabled { opacity: .55; cursor: default; }
.confirm-button:focus-visible { outline: 3px solid var(--color-primary-500, #0e7490); outline-offset: 3px; }
html[data-theme="clinical-night"] .odontogram-confirm { --color-text: #e2e8f0; --color-text-muted: #cbd5e1; --color-surface: #1e293b; --color-bg: #172333; --color-border: #3b4d63; }
html[data-theme="clinical-night"] .confirm-icon.danger { background: #4c1d28; color: #fda4af; }
html[data-theme="clinical-night"] .confirm-heading p { color: #7dd3fc; }
@media (max-width: 480px) {
  .confirm-header { padding: 20px 16px; gap: 10px; }
  .confirm-heading h2 { font-size: 18px; }
  .odontogram-confirm .confirm-body { padding: 20px 16px; }
  .odontogram-confirm .confirm-footer { padding: 16px; flex-direction: column-reverse; align-items: stretch; }
}
</style>
