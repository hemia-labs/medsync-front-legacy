<template>
  <v-dialog :value="value" :persistent="busy" max-width="760" scrollable @input="$emit('input', $event)">
    <v-card v-dialog-name="'Sustituir negativa'" class="substitution-dialog">
      <v-card-title class="substitution-title"><h3>Sustituir negativa</h3></v-card-title>
      <v-card-text>
        <p class="patient-name">{{ patientName }}</p>
        <p>Revisa ambos documentos. La autorización cambia el consentimiento vigente; conserva la negativa y las historias anteriores.</p>
        <p v-if="error" ref="error" role="alert" tabindex="-1" class="review-error">{{ error }}</p>
        <div class="substitution-pair">
          <section>
            <h4>Negativa que se conserva</h4>
            <v-select :value="refusalId" :items="refusals" item-value="id_patient_document" :item-text="documentLabel"
              label="Documento con negativa" outlined dense :disabled="busy || checking" @input="$emit('refusal', $event)" />
            <p v-if="refusal">Registrada: {{ date(refusal.refusal_at) }}</p>
            <p v-if="refusal">{{ refusal.refusal_reason || 'Sin motivo registrado' }}</p>
          </section>
          <section>
            <h4>Consentimiento posterior</h4>
            <v-select :value="signedId" :items="signedDocuments" item-value="id_patient_document" :item-text="documentLabel"
              label="Documento firmado" outlined dense :disabled="busy || checking" @input="$emit('signed', $event)" />
            <p v-if="signed">Firmado: {{ date(signed.signed_at) }}</p>
            <p v-if="signed">Responsable: {{ signed.doctor_name_snapshot || 'Consultar documento' }}</p>
          </section>
        </div>
        <p v-if="candidate" class="predicted-result" role="status">
          {{ candidate.predicted_status === 'FIRMADO' ? 'Después de autorizar: consentimiento vigente firmado.' : 'Después de autorizar: seguirá habiendo una negativa vigente. Revisa las demás negativas por separado.' }}
        </p>
        <p v-else>No hay una pareja elegible seleccionada. El firmado debe ser posterior a la última negativa registrada.</p>
        <p v-if="candidate && !candidate.can_authorize" class="authority-note">Requiere autorización del doctor responsable: {{ signed.doctor_name_snapshot || 'Consultar documento' }}.</p>
        <v-textarea v-if="candidate && candidate.can_authorize" :value="reason" label="Motivo de la sustitución" outlined
          rows="3" auto-grow counter="500" maxlength="500" :disabled="busy || checking" hint="Explica la revisión realizada (mínimo 10 caracteres)."
          persistent-hint @input="$emit('reason', $event)" />
        <p class="history-note">Esta acción no finaliza ni reabre historias clínicas.</p>
      </v-card-text>
      <v-card-actions class="substitution-actions">
        <v-btn outlined :disabled="busy" @click="$emit('input', false)">Cancelar</v-btn>
        <v-btn v-if="needsReview" outlined :loading="checking" :disabled="busy || checking" @click="$emit('review')">Revisar estado actual</v-btn>
        <v-btn v-else-if="candidate && candidate.can_authorize" color="primary" :loading="busy || checking"
          :disabled="busy || checking || reason.trim().length < 10 || reason.length > 500" @click="$emit('authorize')">Autorizar sustitución</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import dialogName from '../../../../core/directives/dialog-name';
export default {
  directives: { dialogName },
  props: {
    value: Boolean, busy: Boolean, checking: Boolean, needsReview: Boolean,
    patientName: { type: String, default: '' }, error: { type: String, default: '' },
    reason: { type: String, default: '' }, refusalId: { type: String, default: '' }, signedId: { type: String, default: '' },
    review: { type: Object, default: () => ({ documents: [], candidates: [] }) }
  },
  computed: {
    refusals() { return this.review.documents.filter(doc => this.review.candidates.some(pair => pair.refusal_id === doc.id_patient_document)); },
    signedDocuments() { return this.review.documents.filter(doc => this.review.candidates.some(pair => pair.refusal_id === this.refusalId && pair.signed_id === doc.id_patient_document)); },
    refusal() { return this.review.documents.find(doc => doc.id_patient_document === this.refusalId); },
    signed() { return this.signedDocuments.find(doc => doc.id_patient_document === this.signedId); },
    candidate() { return this.review.candidates.find(pair => pair.refusal_id === this.refusalId && pair.signed_id === this.signedId); }
  },
  watch: { error(value) { if(value) this.$nextTick(() => this.$refs.error && this.$refs.error.focus()); } },
  methods: {
    documentLabel(doc) { return `${String(doc.id_patient_document).slice(0, 8).toUpperCase()} · ${doc.title || 'Consentimiento'}`; },
    date(value) { return value ? new Date(value).toLocaleString('es-MX') : 'Sin fecha verificable'; }
  }
};
</script>

<style scoped>
.substitution-dialog .substitution-title { padding: 24px 24px 8px; }
.substitution-title h3 { font-size: 22px; color: var(--color-primary-800); word-break: normal; }
.patient-name { font-weight: 700; font-size: 17px; }
.substitution-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 20px 0; }
.substitution-pair section { min-width: 0; border: 1px solid var(--color-border, #dce5e7); border-radius: 10px; padding: 16px; }
.substitution-pair h4 { margin: 0 0 16px; font-size: 15px; }
.substitution-pair p { overflow-wrap: anywhere; }
.predicted-result { border-left: 4px solid var(--color-primary-500); padding: 12px; background: var(--color-primary-50, #edf8f7); }
.review-error { padding: 12px; border: 1px solid #c84836; border-radius: 8px; }
.authority-note, .history-note { font-size: 13px; }
.substitution-actions { padding: 16px 24px 24px; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.substitution-actions .v-btn { min-height: 44px; white-space: normal; letter-spacing: 0; text-transform: none; }
@media(max-width: 600px) { .substitution-pair { grid-template-columns: 1fr; } .substitution-actions .v-btn { flex: 1 1 100%; margin-left: 0 !important; } }
</style>
