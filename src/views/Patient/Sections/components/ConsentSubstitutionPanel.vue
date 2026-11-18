<template>
  <section v-if="open || message || error || (review && (review.consent_status === 'NO_FIRMADO_POR_NEGATIVA' || review.diagnostics.length))" class="consent-review-panel" aria-label="Vigencia del consentimiento">
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="error && !open" role="alert">{{ error }} <button type="button" class="clinical-link-button" @click="refresh">Reintentar</button></p>
    <template v-if="review && review.consent_status === 'NO_FIRMADO_POR_NEGATIVA'">
      <strong>Negativa vigente</strong>
      <p v-if="review.candidates.length">Hay un consentimiento firmado posterior. La negativa sigue vigente hasta que el doctor responsable autorice su sustitución.</p>
      <p v-else>La negativa se conserva. Para revisar una sustitución debe existir un consentimiento firmado después de la última negativa.</p>
      <v-btn v-if="review.candidates.length" outlined :disabled="checking" @click="begin">Revisar sustitución</v-btn>
    </template>
    <p v-if="review && review.diagnostics.length" role="status">Hay una referencia de sustitución que no se pudo verificar. No se aplicará a la vigencia del consentimiento.</p>
    <consent-substitution-dialog :value="open" :patient-name="patientName" :review="review || emptyReview"
      :refusal-id="refusalId" :signed-id="signedId" :reason="reason" :error="error" :busy="posting" :checking="checking" :needs-review="needsReview"
      @input="setOpen" @refusal="selectRefusal" @signed="selectSigned" @reason="editReason" @review="reviewAgain" @authorize="authorize" />
  </section>
</template>

<script>
import DADocumentService from '../../../../services/core/document/DADocumentService';
import ConsentSubstitutionDialog from './ConsentSubstitutionDialog.vue';

const emptyReview = () => ({ documents: [], candidates: [], diagnostics: [], pairs: [] });
export default {
  components: { ConsentSubstitutionDialog },
  props: { patientId: { type: String, required: true }, patientName: { type: String, default: '' }, scope: { type: String, required: true }, refreshKey: { type: Number, default: 0 } },
  data() { return { emptyReview: emptyReview(), review: null, error: '', message: '', open: false, posting: false, checking: false,
    needsReview: false, reason: '', refusalId: '', signedId: '', requestId: '', attempt: 0, readSequence: 0, alive: true }; },
  watch: {
    scope: { immediate: true, handler() { this.reset(); this.refresh(); } },
    refreshKey() { this.refresh(); }
  },
  beforeDestroy() { this.alive = false; this.attempt++; this.readSequence++; },
  methods: {
    reset() { this.attempt++; this.readSequence++; this.open = false; this.review = null; this.error = ''; this.message = '';
      this.reason = ''; this.refusalId = ''; this.signedId = ''; this.requestId = ''; this.checking = false; this.posting = false; this.needsReview = false; },
    request() { return window.crypto.randomUUID(); },
    current(attempt, scope) { return this.alive && attempt === this.attempt && scope === this.scope; },
    apply(review) { this.review = review; this.$emit('review', review); },
    async refresh() {
      if(!this.patientId || this.posting) return;
      const read = ++this.readSequence, attempt = this.attempt, scope = this.scope;
      try {
        const response = await DADocumentService.getConsentReview(this.patientId);
        if(!this.current(attempt, scope) || read !== this.readSequence) return;
        if(!response || !response.success) throw new Error(response && response.message || 'No se pudo verificar la vigencia del consentimiento.');
        if(this.open && this.review && this.review.substitution_token !== response.data.substitution_token) {
          this.needsReview = true; this.error = 'El consentimiento cambió. Revisa el estado actual; tu motivo se conserva.';
        } else if(!this.open) this.error = '';
        this.apply(response.data);
      } catch(error) { if(this.current(attempt, scope) && read === this.readSequence) this.error = error.message || 'No se pudo verificar el consentimiento.'; }
    },
    chooseDefaults() {
      const candidates = this.review ? this.review.candidates : [];
      if(!candidates.some(pair => pair.refusal_id === this.refusalId)) this.refusalId = candidates[0] ? candidates[0].refusal_id : '';
      const signed = candidates.filter(pair => pair.refusal_id === this.refusalId);
      if(!signed.some(pair => pair.signed_id === this.signedId)) this.signedId = signed.length === 1 ? signed[0].signed_id : '';
    },
    async begin() {
      this.attempt++; this.open = true; this.error = ''; this.message = ''; this.reason = ''; this.requestId = this.request();
      this.chooseDefaults(); this.needsReview = true;
      await this.reviewAgain();
    },
    setOpen(value) { if(this.posting) return; if(!value) { this.attempt++; this.readSequence++; this.checking = false; } this.open = value; },
    selectRefusal(value) { if(this.posting || this.checking) return; this.refusalId = value; this.signedId = ''; this.chooseDefaults(); this.requestId = this.request(); },
    selectSigned(value) { if(this.posting || this.checking) return; this.signedId = value; this.requestId = this.request(); },
    editReason(value) { if(this.posting || this.checking) return; this.reason = value; this.requestId = this.request(); },
    async reviewAgain() {
      if(this.checking || this.posting || !this.open) return;
      const attempt = this.attempt, scope = this.scope, read = ++this.readSequence;
      this.checking = true;
      try {
        const response = await DADocumentService.getConsentReview(this.patientId);
        if(!this.current(attempt, scope) || !this.open || read !== this.readSequence) return;
        if(!response || !response.success) throw new Error(response && response.message || 'No se pudo verificar el consentimiento.');
        this.apply(response.data); this.chooseDefaults(); this.needsReview = false; this.error = '';
        if(response.data.pairs.some(pair => pair.q === this.requestId && pair.n === this.reason.trim())) {
          this.message = 'La autorización ya está registrada. Se conserva el historial.'; this.open = false; this.$emit('saved');
        }
      } catch(error) { if(this.current(attempt, scope)) { this.error = error.message; this.needsReview = true; } }
      finally { if(this.current(attempt, scope)) this.checking = false; }
    },
    async authorize() {
      if(this.checking || this.posting || !this.open || this.needsReview || !this.review || this.reason.trim().length < 10) return;
      const candidate = this.review.candidates.find(pair => pair.refusal_id === this.refusalId && pair.signed_id === this.signedId);
      if(!candidate || !candidate.can_authorize) return;
      const attempt = this.attempt, scope = this.scope, read = ++this.readSequence;
      const token = this.review.substitution_token;
      const payload = { id_person: this.patientId, refusal_id: this.refusalId, signed_id: this.signedId,
        reason: this.reason.trim(), request_id: this.requestId, expected_consent_token: token };
      this.checking = true; this.error = '';
      try {
        const checked = await DADocumentService.getConsentReview(this.patientId);
        if(!this.current(attempt, scope) || !this.open || read !== this.readSequence) return;
        if(!checked || !checked.success) throw new Error(checked && checked.message || 'No se pudo verificar el consentimiento.');
        this.apply(checked.data);
        if(token !== checked.data.substitution_token) { this.needsReview = true; this.error = 'El consentimiento cambió. Revisa el estado actual; tu motivo se conserva.'; return; }
        this.posting = true;
        const response = await DADocumentService.substituteRefusal(payload);
        if(!this.current(attempt, scope)) return;
        if(response && response.success) {
          this.apply(response.data); this.message = response.message || 'Sustitución autorizada. Las historias anteriores se conservan.';
          this.open = false; this.reason = ''; this.$emit('saved');
        } else { this.error = response && response.message || 'No se pudo confirmar la autorización. Revisa el estado antes de reintentar.'; this.needsReview = true; }
      } catch(error) { if(this.current(attempt, scope)) { this.error = error.message || 'No se pudo confirmar la autorización.'; this.needsReview = true; } }
      finally { if(this.current(attempt, scope)) { this.checking = false; this.posting = false; } }
    }
  }
};
</script>

<style scoped>
.consent-review-panel { margin: 16px 0; padding: 16px 20px; border: 1px solid var(--color-border, #dce5e7); border-radius: 12px; }
.consent-review-panel p { margin: 8px 0 12px; }
.consent-review-panel .v-btn { min-height: 44px; letter-spacing: 0; text-transform: none; }
html[data-theme="clinical-night"] .consent-review-panel { color: #e5e7eb; border-color: #64748b; }
html[data-theme="clinical-night"] .consent-review-panel .v-btn:not(.v-btn--disabled) { color: #bae6fd; border-color: #64748b; }
html[data-theme="clinical-night"] .consent-review-panel .v-btn.v-btn--disabled { color: #94a3b8 !important; }
html[data-theme="clinical-night"] .consent-review-panel .clinical-link-button { color: #7dd3fc; }
</style>
