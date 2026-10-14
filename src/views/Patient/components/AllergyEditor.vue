<template>
  <v-dialog :value="value" persistent max-width="620" content-class="patient-allergy-dialog" @input="$emit('input', $event)">
    <section v-dialog-name="'Revisar alergias'" class="allergy-editor" @keydown.esc.stop="close">
      <header><p class="eyebrow">Seguridad del paciente</p><h2>Revisar alergias</h2><p>{{ patientName }}</p></header>
      <div class="editor-body">
        <p>Este dato se comparte con el expediente y los borradores de historia clínica.</p>
        <p v-if="legacyText" class="legacy-note"><strong>Dato previo de la historia, pendiente de revisión:</strong> {{ legacyText }}</p>
        <AllergyFields ref="fields" v-model="draft" :disabled="busy" :group-name="'allergy-review-' + _uid" />
        <p v-if="error" role="alert" class="error">{{ error }}</p>
        <button v-if="conflict" type="button" class="allergy-button--secondary" :disabled="busy" @click="reload">Consultar estado actual</button>
        <div v-if="conflictRecord" class="legacy-note">
          <strong>Estado actual: {{ labels[conflictRecord.review_status] }}</strong>
          <p>{{ conflictRecord.description }}</p>
          <button type="button" class="allergy-button--secondary" @click="reset(conflictRecord)">Usar estado actual</button>
          <button type="button" class="allergy-button--secondary" @click="keepCapture">Conservar mi captura</button>
        </div>
      </div>
      <footer><button type="button" class="allergy-button--secondary" :disabled="busy" @click="close">Cancelar</button><button type="button" class="allergy-button--primary" :disabled="busy || conflict" @click="save">{{ busy ? 'Guardando…' : 'Guardar alergias' }}</button></footer>
    </section>
  </v-dialog>
</template>
<script>
import AllergyFields from './AllergyFields.vue';
import DAPxService from '../../../services/core/px/DAPxService';
import dialogName from '../../../core/directives/dialog-name';
import { allergyStatus, allergyLabels } from '../../../domain/patient/allergy';
export default {
  components: { AllergyFields }, directives: { dialogName },
  props: { value: Boolean, patientId: { type: String, required: true }, patientName: String, record: { type: Object, default: () => ({}) }, legacyText: String },
  data: () => ({ draft: {}, busy: false, error: '', conflict: false, conflictRecord: null, labels: allergyLabels, request: 0, returnFocus: null }),
  mounted() { if(this.value) this.reset(this.record); },
  watch: { value(open) { if(open) { this.returnFocus = document.activeElement; this.reset(this.record); this.$nextTick(() => { const input = this.$refs.fields && this.$refs.fields.$el.querySelector('input'); if(input) input.focus(); }); } }, patientId() { this.request++; this.busy = false; this.$emit('input', false); } },
  beforeDestroy() { this.request++; },
  methods: {
    reset(record) { this.draft = { review_status: allergyStatus(record), description: record.description || '', expected_revision: Number(record.revision || 0) }; this.error = ''; this.conflict = false; this.conflictRecord = null; },
    keepCapture() { this.draft.expected_revision = Number(this.conflictRecord.revision || 0); this.conflict = false; this.conflictRecord = null; this.error = 'Captura conservada. Revisa la respuesta antes de guardar.'; },
    close() { if(this.busy) return; this.$emit('input', false); this.$nextTick(() => { if(this.returnFocus && this.returnFocus.isConnected) this.returnFocus.focus(); }); },
    async reload() {
      this.busy = true; const request = ++this.request;
      try { const response = await DAPxService.getById(this.patientId); if(request !== this.request) return; if(!response.success) throw new Error(); this.conflictRecord = response.data.allergy || {}; this.error = 'El estado cambió. Elige usar el estado actual o conservar tu captura para volver a revisarla.'; }
      catch(e) { this.error = 'No se pudo consultar el estado actual. Tu captura se conserva.'; }
      finally { if(request === this.request) this.busy = false; }
    },
    async save() {
      if(this.busy) return;
      if(!['HAS_ALLERGIES', 'NONE_KNOWN', 'UNKNOWN'].includes(this.draft.review_status)) { this.error = 'Selecciona un estado de alergias.'; return; }
      if(this.draft.review_status !== 'NONE_KNOWN' && !this.draft.description.trim()) { this.error = 'Completa el detalle o motivo antes de guardar.'; return; }
      this.busy = true; this.error = ''; const request = ++this.request; const patientId = this.patientId;
      try {
        const response = await DAPxService.updateAllergies({ ...this.draft, patient_id: patientId });
        if(request !== this.request || patientId !== this.patientId) return;
        if(!response.success) { this.error = response.message || 'No se pudo guardar. Tu captura se conserva.'; this.conflict = response.status === 409; return; }
        this.$emit('saved', response.data); this.busy = false; this.close();
      } catch(e) { if(request === this.request) this.error = 'No se pudo guardar. Reintenta; tu captura se conserva.'; }
      finally { if(request === this.request) this.busy = false; }
    }
  }
};
</script>
<style scoped>
.allergy-editor { display: flex; flex-direction: column; max-height: 85vh; background: #fff; border-radius: 16px; color: #334155; overflow: hidden; }
header { flex-shrink: 0; padding: 1.3rem 1.5rem; background: var(--color-primary-50, #ecfeff); border-bottom: 1px solid #cbd5e1; }
h2 { font-size: 1.35rem; font-weight: 700; }
.eyebrow { color: var(--color-primary-800); text-transform: uppercase; font-size: .75rem; font-weight: 700; letter-spacing: .08em; }
.editor-body { flex: 1; min-height: 0; padding: 1.25rem 1.5rem; max-height: 65vh; overflow-y: auto; }
.editor-body > p { margin-bottom: 1rem; font-size: .9rem; }
.legacy-note { border: 1px solid #f59e0b; background: #fffbeb; padding: .7rem; border-radius: 8px; }
.error { color: #991b1b; margin-top: 1rem; }
footer { flex-shrink: 0; display: flex; justify-content: flex-end; gap: .7rem; padding: 1rem 1.5rem; border-top: 1px solid #cbd5e1; }
button { min-height: 44px; padding: .6rem 1rem; border-radius: 999px; font-weight: 700; }
button.allergy-button--primary { color: #fff; background: var(--color-primary-700); }
button.allergy-button--secondary { color: var(--color-primary-900); background: #fff; border: 1px solid #94a3b8; }
button:focus-visible { outline: 3px solid var(--color-primary-700); outline-offset: 3px; }
button:disabled { opacity: .6; }
@media(max-width: 480px) { header, .editor-body, footer { padding: 1rem; } footer { flex-direction: column-reverse; } }
</style>
