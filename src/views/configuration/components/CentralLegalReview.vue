<template>
  <div class="central-legal">
    <div v-if="available" class="central-legal-prompt">
      <p v-if="setName">{{ setName }}</p>
      <p v-else>Hay documentos de Legal central que requieren tu revisión.</p>
      <button ref="opener" type="button" :disabled="disabled || loading || saving" @click="start">{{ setName ? 'Revisar ' + setName : 'Revisar y confirmar documentos' }}</button>
    </div>
    <p v-if="result && !open" class="central-legal-status" role="status">{{ result }}</p>
    <v-dialog :value="open" persistent scrollable max-width="920" :aria-labelledby="dialogTitleId">
      <v-card class="central-legal-panel">
        <v-card-title><h2 :id="dialogTitleId">Revisión de documentos de Legal central</h2></v-card-title>
        <v-card-text>
          <p>Revisa cada documento y confirma su versión. Las casillas son personales y no se marcan automáticamente.</p>
          <v-skeleton-loader v-if="loading" class="central-legal-skeleton" type="heading, paragraph@3" loading-text="Cargando los documentos para revisar" />
          <p v-if="error" role="alert" class="central-legal-error">{{ error }}</p>
          <p v-if="result" ref="status" tabindex="-1" role="status" class="central-legal-status">{{ result }}</p>
          <template v-if="review && !result">
            <p class="central-legal-expiry">Esta revisión vence el {{ expiresLabel }}. Si vence antes de enviar, vuelve a cargarla.</p>
            <article v-for="doc in documents" :key="doc.versionId" class="central-legal-document">
              <h3>{{ doc.title }} · Versión {{ doc.version }}</h3>
              <div class="central-legal-content" v-html="doc.safeHtml"></div>
              <label><input v-model="checked[doc.versionId]" type="checkbox" :disabled="saving || stale || !!submitted"><span>{{ confirmationLabel(doc) }}</span></label>
            </article>
          </template>
        </v-card-text>
        <v-card-actions>
          <button type="button" :disabled="saving" @click="close">{{ result ? 'Cerrar' : 'Cerrar sin nueva confirmación' }}</button>
          <button v-if="!result && (!review || stale)" type="button" :disabled="loading || saving" @click="load">Volver a cargar documentos</button>
          <button v-if="review && !result && !stale" type="button" class="central-legal-primary" :disabled="!canSubmit" @click="confirm">{{ confirmLabel }}</button>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import SaaSLegalService from '@/services/saasLegal.service';
import { sanitizeHtmlForDocumentSnapshot } from '../../../utils/sanitizeHtml';
import { registrationAttemptId, usableRegistrationContext } from '../../../utils/registration';
import { authorizationContext, isCurrentAuthorization } from '../../../security/authorizationContext';
import { registerSettingsNavigationGuard } from '../../../domain/settings/settings.navigation';

const errorCode = value => {
  const data = value && value.response && value.response.data || value || {};
  return data.code || data.data && data.data.code;
};
export default {
  name: 'CentralLegalReview',
  props: { available: Boolean, disabled: Boolean, documentSetKey: String, setName: String, ownerKey: { type: String, required: true } },
  data: () => ({ open: false, loading: false, saving: false, review: null, checked: {}, submitted: null,
    error: '', result: '', stale: false, request: 0, disposed: false, reviewOwner: null, reviewOpener: null, removeGuard: null }),
  computed: {
    dialogTitleId() { return 'central-legal-title-' + (this.documentSetKey || 'registration'); },
    documents() { return this.review ? this.review.legalDocuments.map(doc => ({ ...doc, safeHtml: sanitizeHtmlForDocumentSnapshot(doc.contentHtml) })) : []; },
    expiresLabel() { return this.review ? new Date(this.review.legalContextExpiresAt).toLocaleString('es-MX') : ''; },
    confirmLabel() {
      if(this.saving) return 'Guardando confirmaciones…';
      if(this.submitted) return 'Reintentar el mismo envío';
      return this.documents.length === 1 && this.documents[0].requiredAction === 'accept' ? 'Aceptar esta versión' : 'Confirmar estas versiones';
    },
    canSubmit() { return Boolean(this.open && this.review && !this.loading && !this.saving && !this.stale && !this.result
      && this.current(this.reviewOwner) && this.documents.length && this.documents.every(doc => this.checked[doc.versionId] && this.readable(doc.safeHtml))); }
  },
  watch: { ownerKey() { this.reset(); } },
  mounted() { this.removeGuard = registerSettingsNavigationGuard(this, { isSaving: () => this.saving }); },
  beforeDestroy() { this.disposed = true; this.request++; if(this.removeGuard) this.removeGuard(); },
  methods: {
    owner() { return { key: this.ownerKey, authorization: authorizationContext(this.$store) }; },
    current(owner) { return Boolean(!this.disposed && owner && owner.key === this.ownerKey && isCurrentAuthorization(owner.authorization, this.$store)); },
    reset() { this.request++; this.open = false; this.loading = false; this.saving = false; this.review = null; this.checked = {}; this.submitted = null; this.error = ''; this.result = ''; this.stale = false; this.reviewOwner = null; this.$emit('saving', false); },
    readable(html) { const node = document.createElement('div'); node.innerHTML = html; return Boolean(String(node.textContent || '').replace(/[\s\u200b-\u200f\ufeff]/g, '') || node.querySelector('img[src]')); },
    confirmationLabel(doc) {
      const action = { accept: 'acepto este documento', acknowledge: 'confirmo haber leído este documento', consent: 'otorgo mi consentimiento para lo descrito en este documento' }[doc.requiredAction];
      return `Leí la versión ${doc.version} y ${action} ${this.review?.acceptanceScope === 'business' ? 'en representación del consultorio' : 'de forma personal'}.`;
    },
    async start() { if(this.disabled || this.loading || this.saving) return; this.reviewOpener = document.activeElement; this.open = true; if(this.result || !this.submitted) await this.load(); },
    async load() {
      if(this.loading || this.saving) return false;
      const owner = this.owner(), request = ++this.request;
      this.loading = true; this.review = null; this.checked = {}; this.submitted = null; this.result = ''; this.error = ''; this.stale = false;
      try {
        const response = await SaaSLegalService.centralContext(this.documentSetKey);
        if(request !== this.request || !this.current(owner)) return false;
        const review = response && response.success && response.data;
        if(!usableRegistrationContext({ ...review, enabled: true }) || !Number.isFinite(Date.parse(review.legalContextExpiresAt))
          || Date.parse(review.legalContextExpiresAt) <= Date.now()) throw response;
        if(!review.legalDocuments.every(doc => this.readable(sanitizeHtmlForDocumentSnapshot(doc.contentHtml)))) throw new Error();
        this.reviewOwner = owner; this.review = review;
        this.checked = Object.fromEntries(review.legalDocuments.map(doc => [doc.versionId, false])); return true;
      } catch(error) { if(request === this.request && this.current(owner)) this.error = this.message(error); return false; }
      finally { if(request === this.request && !this.disposed) this.loading = false; }
    },
    message(error) {
      const code = errorCode(error), status = error && error.response && error.response.status || error && error.status;
      if(code === 'LEGAL_SYNC_PENDING') return 'Ya hay confirmaciones guardadas y pendientes de sincronizar. Cierra y actualiza los documentos.';
      if(code === 'LEGAL_VERSION_STALE') return 'Esta revisión venció. Vuelve a cargar los documentos y marca nuevamente las casillas después de revisarlos.';
      if(status === 401 || status === 403 || code === 'AUTH_CONTEXT_CHANGED') return 'La sesión o tus accesos cambiaron. Actualiza tu sesión antes de continuar.';
      if(status === 429) return 'Has realizado varios intentos. Espera un momento y reintenta.';
      if(code === 'LEGAL_IDEMPOTENCY_CONFLICT') return 'Este envío no coincide con el anterior. Cierra y actualiza los documentos antes de iniciar otra revisión.';
      if(code === 'LEGAL_REPRESENTATIVE_REJECTED') return 'Legal central rechazó la autorización de esta firma. Inicia una revisión con una sesión autorizada.';
      return this.submitted ? 'No pudimos comprobar el resultado. Puedes reintentar el mismo envío sin duplicar la confirmación.' : 'No pudimos cargar los documentos. Reintenta en unos momentos.';
    },
    async confirm() {
      if(!this.canSubmit) return false;
      const owner = this.reviewOwner, request = ++this.request;
      if(!this.submitted) {
        if(Date.parse(this.review.legalContextExpiresAt) <= Date.now()) { this.stale = true; this.checked = {}; this.error = this.message({ code: 'LEGAL_VERSION_STALE' }); return false; }
        this.submitted = { legalContext: this.review.legalContext, idempotencyKey: registrationAttemptId(),
          ...(this.documentSetKey ? { documentSetKey: this.documentSetKey } : {}),
          legalAcceptances: this.review.legalDocuments.map(doc => ({ documentKey: doc.documentKey, versionId: doc.versionId, acknowledged: true })) };
      }
      this.saving = true; this.error = ''; this.$emit('saving', true);
      try {
        const response = await SaaSLegalService.acceptCentral(this.submitted);
        if(request !== this.request || !this.current(owner)) return false;
        if(!response || !response.success || response.data?.eventId !== this.submitted.idempotencyKey || typeof response.data.queued !== 'boolean'
          || !response.data.queued && !response.data.evidenceId) throw response;
        this.result = response.data.queued ? 'Tus confirmaciones están guardadas y pendientes de sincronizar con Legal central. No necesitas aceptarlas otra vez.' : 'Legal central recibió tus confirmaciones. El comprobante está disponible en el historial.';
        this.$nextTick(() => { if(this.current(owner) && this.$refs.status) this.$refs.status.focus(); });
        window.dispatchEvent(new window.CustomEvent('saas-legal-accepted'));
        this.$emit('confirmed'); return true;
      } catch(error) {
        if(request === this.request && this.current(owner)) {
          this.error = this.message(error);
          if(['LEGAL_VERSION_STALE','LEGAL_REPRESENTATIVE_REJECTED'].includes(errorCode(error))) { this.stale = true; this.checked = {}; this.submitted = null; }
        }
        return false;
      } finally { if(request === this.request && !this.disposed) { this.saving = false; this.$emit('saving', false); } }
    },
    close() {
      if(this.saving) return false;
      this.request++; this.loading = false; this.open = false; this.$emit('refresh');
      const opener = this.reviewOpener;
      this.reviewOpener = null;
      this.$nextTick(() => {
        if(opener && opener !== document.body && document.contains(opener)) opener.focus();
        else if(this.$refs.opener) this.$refs.opener.focus();
      });
      return true;
    }
  }
};
</script>
<style scoped>
.central-legal-skeleton{min-height:240px;padding:18px}
html[data-theme="clinical-night"] .central-legal-skeleton ::v-deep .v-skeleton-loader__bone{background:#334155}
.central-legal{color:#344b55}.central-legal-prompt{padding:18px 24px;background:#e8f5f6;border-bottom:1px solid #c8e0e3}.central-legal-prompt p{margin:0 0 12px}.central-legal button{border:1px solid #198b95;color:#15535d;border-radius:10px;padding:10px 16px;font-weight:700}.central-legal-panel{color:#344b55!important}.central-legal-panel h2{font-size:23px;line-height:1.35;word-break:normal;margin:0}.central-legal-panel h3{font-size:18px;line-height:1.45;overflow-wrap:anywhere}.central-legal-panel .v-card__text{padding:20px 24px;overscroll-behavior:contain}.central-legal-panel .v-card__title{border-bottom:1px solid #c8e0e3;padding:22px 24px}.central-legal-panel .v-card__actions{gap:12px;padding:18px 24px;justify-content:flex-end;flex-wrap:wrap;border-top:1px solid #c8e0e3}.central-legal-panel button{border:1px solid #198b95;border-radius:10px;padding:10px 16px;font-weight:700;color:#15535d}.central-legal-panel .central-legal-primary{background:#167b86;color:#fff}.central-legal button:disabled,.central-legal-panel button:disabled{opacity:.5;cursor:not-allowed}.central-legal-document{padding:18px 0;border-top:1px solid #c8e0e3}.central-legal-content{background:#fff;color:#25364d;border:1px solid #dce6ec;border-radius:10px;padding:18px;margin:14px 0;line-height:1.75;font-size:15px;overflow-wrap:anywhere;overflow-x:auto}.central-legal-content ::v-deep img{max-width:100%;height:auto}.central-legal-document label{display:flex;align-items:flex-start;gap:12px;line-height:1.65;font-weight:650}.central-legal-document input{width:20px;height:20px;margin-top:3px;flex-shrink:0;accent-color:#167b86}.central-legal-error{background:#fff0f1;color:#a32834;padding:14px;border-radius:10px}.central-legal-status{padding:16px;background:#edf9f2;color:#265d42;line-height:1.6}.central-legal-expiry{font-size:12px}.central-legal button:focus-visible,.central-legal-panel button:focus-visible,.central-legal-panel input:focus-visible,.central-legal-status:focus{outline:3px solid #198b95;outline-offset:3px}
html[data-theme="clinical-night"] .central-legal-prompt{background:#172f41;color:#e2e8f0;border-color:#3b4d63}html[data-theme="clinical-night"] .central-legal-prompt button{color:#bae6fd;border-color:#6489a9}html[data-theme="clinical-night"] .central-legal-panel{background:#172f41!important;color:#e2e8f0!important}html[data-theme="clinical-night"] .central-legal-panel .v-card__text{color:#e2e8f0}html[data-theme="clinical-night"] .central-legal-panel button{color:#bae6fd;border-color:#6489a9}html[data-theme="clinical-night"] .central-legal-panel .central-legal-primary{background:#0e7490;color:white}
@media(max-width:700px){.central-legal-prompt{padding:18px}.central-legal-panel h2{font-size:20px}.central-legal-panel .v-card__text,.central-legal-panel .v-card__title{padding:16px}.central-legal-panel .v-card__actions{padding:16px;flex-direction:column;align-items:stretch}.central-legal-prompt button,.central-legal-panel button{width:100%}}
</style>
