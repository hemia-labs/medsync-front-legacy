<template>
  <section class="account-legal bg-white text-gray-700 border border-primary-200 shadow-xl" aria-labelledby="account-legal-title" :aria-busy="String(currentLoading || historyLoading)">
    <header class="legal-heading">
      <div>
        <p class="legal-eyebrow">Cuenta y legal</p>
        <h2 id="account-legal-title">Documentos de tu cuenta</h2>
        <p>Revisa las versiones publicadas y conserva el comprobante de cada aceptación. Una actualización requiere una nueva revisión.</p>
      </div>
      <button type="button" class="legal-button legal-button--outline" :disabled="currentLoading || historyLoading || saving || reviewSaving" @click="refreshAll">Actualizar documentos</button>
    </header>

    <p v-if="!sessionEligible" class="legal-message" role="status">Inicia sesión con un usuario de tu consultorio para consultar estos documentos.</p>
    <template v-else>
      <p v-if="centralWarning" class="legal-message" role="status">{{ centralWarning }}</p>
      <CentralLegalReview v-for="set in centralReviewSets" :key="set.key || 'registration'" ref="centralReviews" :owner-key="sessionKey"
        :available="set.available" :document-set-key="set.key" :set-name="set.name" :disabled="saving || reviewSaving || currentLoading || !!currentError"
        @saving="reviewSaving = $event" @confirmed="refreshAfterCentral" @refresh="refreshAll" />
      <p v-if="currentLoading" class="legal-message" role="status">Consultando las versiones publicadas…</p>
      <div v-if="currentError" class="legal-message legal-message--error" role="alert">
        <p>{{ currentError }}</p><button type="button" class="legal-link" :disabled="currentLoading || saving" @click="loadCurrent">Reintentar consulta</button>
      </div>
      <p v-if="currentLoaded && !currentLoading && !currentError && !documents.length" class="legal-message" role="status">Todavía no hay documentos legales disponibles para esta cuenta.</p>
      <div v-if="currentLoaded && !currentError" class="legal-document-grid">
        <article v-for="item in documents" :key="item.id_document" class="legal-document-card bg-white border border-gray-200">
          <div class="legal-card-top"><h3>{{ item.title }}</h3><span class="legal-status" :class="statusClass(item)">{{ statusLabel(item) }}</span></div>
          <p v-if="item.description">{{ item.description }}</p>
          <p class="legal-scope">{{ item.informational ? 'Documento de consulta.' : scopeHelp(item.acceptance_scope) }} · {{ item.source === 'central' ? 'Legal central' : 'Historial local' }}</p>
          <p v-if="!item.current_version">Aún no se ha publicado una versión. No hay una aceptación disponible.</p>
          <template v-else>
            <p class="legal-meta">Versión {{ item.current_version.version_number }}<template v-if="item.current_version.published_at"> · Publicada {{ formatDate(item.current_version.published_at) }}</template></p>
            <p v-if="isAccepted(item)" class="legal-meta">Aceptada por {{ actorName(item.accepted) }} el {{ formatDate(item.accepted.accepted_at) }}.</p>
            <p v-else-if="item.pending && !item.can_accept && !item.central_can_review && item.acceptance_scope === 'business'" class="legal-responsible">Pide a una persona administradora que revise y acepte esta versión por el consultorio.</p>
            <button type="button" class="legal-button legal-button--outline" :disabled="saving || reviewSaving || currentLoading" @click="openCurrent(item)">Ver documento<span class="sr-only">: {{ item.title }}, versión {{ item.current_version.version_number }}</span></button>
          </template>
        </article>
      </div>

      <section class="legal-history" aria-labelledby="legal-history-title">
        <div class="legal-history-heading"><div><h3 id="legal-history-title">Historial y comprobantes</h3><p>Las versiones aceptadas se conservan para consulta. El historial personal sólo muestra tus aceptaciones.</p></div><button type="button" class="legal-link" :disabled="historyLoading || saving || reviewSaving" @click="loadHistory">Actualizar historial</button></div>
        <p v-if="historyWarning" class="legal-message" role="status">{{ historyWarning }}</p>
        <button v-if="historyCursor" type="button" class="legal-link" :disabled="historyLoading || saving || reviewSaving" @click="loadHistory(true)">Cargar más comprobantes de Legal central</button>
        <p v-if="historyLoading" class="legal-message" role="status">Consultando comprobantes…</p>
        <div v-if="historyError" class="legal-message legal-message--error" role="alert"><p>{{ historyError }}</p><button type="button" class="legal-link" :disabled="historyLoading || saving || reviewSaving" @click="loadHistory">Reintentar historial</button></div>
        <p v-if="historyLoaded && !historyLoading && !historyError && !acceptances.length" class="legal-message" role="status">Aún no hay aceptaciones registradas para mostrar.</p>
        <ol v-if="historyLoaded && !historyError && acceptances.length" class="legal-receipt-list">
          <li v-for="receipt in acceptances" :key="receipt.id_acceptance" class="legal-receipt bg-white border border-gray-200">
            <div><strong>{{ receipt.title || 'Documento legal' }} · Versión {{ receipt.version_number }}</strong><p>{{ scopeLabel(receipt.acceptance_scope) }} · {{ actorName(receipt) }} · {{ receipt.source === 'central' ? 'Legal central' : 'Historial local' }}</p><p>{{ formatDate(receipt.accepted_at) }}</p><p class="legal-hash" v-if="receipt.content_hash">Huella del contenido: {{ receipt.content_hash }}</p></div>
            <button type="button" class="legal-button legal-button--outline" :disabled="saving || !receipt.version" @click="openReceipt(receipt)">Ver documento aceptado<span class="sr-only">: {{ receipt.title }}, versión {{ receipt.version_number }}</span></button>
          </li>
        </ol>
      </section>
    </template>

    <v-dialog v-model="dialogOpen" persistent scrollable max-width="920" role="dialog" aria-modal="true" aria-labelledby="saas-legal-dialog-title" @keydown.esc.stop.prevent="requestClose">
      <v-card class="legal-review bg-white">
        <header class="legal-review-heading">
          <div><p class="legal-eyebrow">{{ dialogSource === 'history' || confirmedAcceptance ? 'Comprobante de aceptación' : 'Revisión del documento' }}</p><h2 id="saas-legal-dialog-title">{{ selectedDocument ? selectedDocument.title : 'Documento legal' }}</h2><p v-if="selectedVersion">Versión {{ selectedVersion.version_number }}<template v-if="selectedVersion.published_at"> · Publicada {{ formatDate(selectedVersion.published_at) }}</template></p></div>
          <v-btn icon :disabled="saving" aria-label="Cerrar documento legal" @click="requestClose"><v-icon>mdi-close</v-icon></v-btn>
        </header>
        <v-card-text class="legal-review-body">
          <div v-if="selectedAcceptance" ref="acceptanceStatus" class="legal-acceptance-proof" role="status" tabindex="-1"><strong>Aceptación registrada</strong><p v-if="selectedAcceptance.evidence_id">Comprobante de Legal central: {{ selectedAcceptance.evidence_id }}</p><p>{{ actorName(selectedAcceptance) }} · {{ formatDate(selectedAcceptance.accepted_at) }}</p><p>{{ scopeLabel(selectedAcceptance.acceptance_scope) }}</p></div>
          <p v-if="dialogSource === 'history'" class="legal-message">Estás consultando la versión que se aceptó en esa fecha. No se reemplaza con el texto de versiones posteriores.</p>
          <p v-if="saveError" role="alert" class="legal-message legal-message--error">{{ saveError }}</p>
          <button v-if="staleVersion" type="button" class="legal-button legal-button--outline" :disabled="saving || reviewSaving || currentLoading" @click="reviewLatest">Cargar y revisar la versión vigente</button>
          <v-skeleton-loader v-if="centralDocumentLoading" class="legal-document-skeleton" type="heading, paragraph@3" loading-text="Cargando el documento legal" />
          <article v-else-if="contentAvailable" class="legal-document-content" v-html="safeContent"></article>
          <p v-else class="legal-message" role="status">El contenido de esta versión no está disponible.</p>
          <p v-if="selectedVersion && selectedVersion.content_hash" class="legal-hash">Huella del contenido: {{ selectedVersion.content_hash }}</p>
          <label v-if="mayAcceptSelected" class="legal-acknowledgment"><input v-model="acknowledged" type="checkbox" :disabled="saving || staleVersion || currentLoading"><span>Leí la versión {{ selectedVersion.version_number }} y acepto este documento {{ selectedDocument.acceptance_scope === 'business' ? 'por el consultorio' : 'de forma personal' }}.</span></label>
          <p v-else-if="dialogSource === 'current' && selectedDocument && selectedDocument.sync_pending" class="legal-message">Tu confirmación está pendiente de sincronizar con Legal central.</p>
          <p v-else-if="dialogSource === 'current' && selectedDocument && selectedDocument.pending && selectedDocument.acceptance_scope === 'business'" class="legal-message">Una persona administradora debe aceptar esta versión por el consultorio.</p>
          <p v-else-if="dialogSource === 'current' && selectedDocument && selectedDocument.pending && selectedDocument.source !== 'central'" class="legal-message">Tu acceso actual no permite registrar esta aceptación.</p>
        </v-card-text>
        <v-card-actions class="legal-review-actions">
          <button type="button" class="legal-button legal-button--outline" :disabled="saving" @click="requestClose">{{ selectedAcceptance ? 'Cerrar comprobante' : 'Cerrar sin aceptar' }}</button>
          <button v-if="mayAcceptSelected" type="button" class="legal-button legal-button--primary" :disabled="!canSubmitAcceptance" @click="acceptSelected">{{ saving ? 'Registrando aceptación…' : 'Aceptar esta versión' }}</button>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script>
import CentralLegalReview from './CentralLegalReview.vue';
import SaaSLegalService from '@/services/saasLegal.service';
import { sanitizeHtmlForDocumentSnapshot } from '../../../utils/sanitizeHtml';
import { authorizationContext, authorizationFingerprint, isCurrentAuthorization } from '../../../security/authorizationContext';
import { registerSettingsNavigationGuard } from '../../../domain/settings/settings.navigation';

const clone = value => JSON.parse(JSON.stringify(value));
export default {
  name: 'AccountLegalDocuments',
  components: { CentralLegalReview },
  data: () => ({ documents: [], acceptances: [], currentLoading: false, historyLoading: false, currentLoaded: false, historyLoaded: false,
    reviewSaving: false, centralWarning: '', historyWarning: '', historyCursor: null, centralDocumentLoading: false, currentError: '', historyError: '', currentRequest: 0, historyRequest: 0, documentRequest: 0, actionRequest: 0, disposed: false,
    dialogOpen: false, dialogSource: '', selectedDocument: null, selectedVersion: null, selectedAcceptance: null,
    acknowledged: false, saving: false, saveError: '', staleVersion: false, confirmedAcceptance: false, reviewContext: null, opener: null, removeSavingGuard: null }),
  computed: {
    centralReviewSets() {
      const sets = new Map();
      for(const doc of this.documents) {
        if(doc.source !== 'central' || doc.informational || doc.central_can_review === false) continue;
        const key = this.reviewSetKey(doc);
        const available = Boolean(sets.get(key)?.available || doc.pending && !doc.sync_pending);
        sets.set(key, { key, name: key ? doc.document_set_name : undefined, available });
      }
      return [...sets.values()];
    },
    authState() { return this.$store && this.$store.state && this.$store.state.CORE && this.$store.state.CORE.AUTH || {}; },
    sessionEligible() { const auth = this.authState; return Boolean(auth.authenticated && (auth.user || {}).id_login && ((auth.business || {}).id_business || (auth.user || {}).id_business) && String(auth.role || '').toLowerCase() !== 'super_admin'); },
    sessionKey() { return authorizationFingerprint(this.authState) + ':' + (this.authState.accessRevision || 0) + ':' + String(this.authState.token || ''); },
    safeContent() { return this.selectedVersion ? sanitizeHtmlForDocumentSnapshot(this.selectedVersion.content_html || '') : ''; },
    contentAvailable() { const content = document.createElement('div'); content.innerHTML = this.safeContent; return Boolean(String(content.textContent || '').replace(/[\s\u200b-\u200f\ufeff]/g, '') || content.querySelector('img[src]')); },
    selectedIsCurrent() { return Boolean(this.selectedDocument && this.selectedDocument.id_document && this.selectedVersion && this.selectedVersion.id_version && this.documents.some(item => item.id_document === this.selectedDocument.id_document && item.current_version && item.current_version.id_version === this.selectedVersion.id_version)); },
    mayAcceptSelected() { return Boolean(this.dialogSource === 'current' && this.selectedDocument && this.selectedDocument.can_accept && !this.selectedAcceptance && !this.confirmedAcceptance); },
    canSubmitAcceptance() { return Boolean(this.sessionEligible && this.reviewContext && this.isCurrent(this.reviewContext) && this.dialogOpen && this.mayAcceptSelected && this.selectedIsCurrent && this.contentAvailable && this.acknowledged && !this.saving && !this.staleVersion && !this.currentLoading && !this.currentError); }
  },
  watch: { sessionKey: { immediate: true, handler() { this.resetSession(); if(this.sessionEligible) this.refreshAll(); } } },
  mounted() {
    this.removeSavingGuard = registerSettingsNavigationGuard(this, { isSaving: () => this.saving || this.reviewSaving });
    window.addEventListener('saas-legal-accepted', this.onAcceptanceNotice);
  },
  beforeDestroy() { this.disposed = true; this.currentRequest++; this.historyRequest++; this.actionRequest++; if(this.removeSavingGuard) this.removeSavingGuard(); window.removeEventListener('saas-legal-accepted', this.onAcceptanceNotice); },
  methods: {
    reviewSetKey(doc) { return doc.document_set_key === 'registration' ? undefined : doc.document_set_key; },
    refreshAfterCentral() { this.$nextTick(() => this.refreshAll()); },
    captureContext() { return { authorization: authorizationContext(this.$store), key: this.sessionKey }; },
    isCurrent(context) { return !this.disposed && this.sessionEligible && context.key === this.sessionKey && isCurrentAuthorization(context.authorization, this.$store); },
    resetSession() {
      this.reviewSaving = false;
      this.centralWarning = ''; this.historyWarning = ''; this.historyCursor = null; this.centralDocumentLoading = false;
      this.currentRequest++; this.historyRequest++; this.actionRequest++; this.documents = []; this.acceptances = [];
      this.currentLoading = false; this.historyLoading = false; this.currentLoaded = false; this.historyLoaded = false;
      this.currentError = ''; this.historyError = ''; this.saving = false; this.clearSelection(); this.opener = null;
    },
    async refreshAll() { if(this.saving || this.reviewSaving) return false; await Promise.all([this.loadCurrent(), this.loadHistory()]); return true; },
    async loadCurrent() {
      if(!this.sessionEligible || this.currentLoading || this.saving) return false;
      const context = this.captureContext(), request = ++this.currentRequest;
      this.currentLoading = true; this.currentError = '';
      try {
        const response = await SaaSLegalService.current();
        if(request !== this.currentRequest || this.disposed) return false;
        if(!this.isCurrent(context)) { this.documents = []; this.currentLoaded = false; this.clearSelection(); this.currentError = 'La sesión o tus accesos cambiaron. Actualiza la consulta para ver los documentos actuales.'; return false; }
        if(!response || !response.success || !response.data || !Array.isArray(response.data.documents)) throw new Error();
        this.documents = response.data.documents; this.currentLoaded = true;
        this.centralWarning = response.data.central_available === false ? 'No pudimos consultar Legal central. El historial local sigue disponible; reintenta para comprobar los documentos de registro.' : response.data.central_sync_pending ? 'Tus confirmaciones están guardadas y pendientes de sincronizar con Legal central. No necesitas aceptarlas otra vez.' : '';
        if(this.dialogSource === 'current' && this.selectedVersion && !this.selectedIsCurrent && !this.confirmedAcceptance) {
          this.acknowledged = false; this.staleVersion = true; this.saveError = 'Hay una versión diferente disponible. Cárgala y revísala antes de aceptar.';
        } else if(this.dialogSource === 'current' && this.selectedVersion && this.selectedIsCurrent) {
          const current = this.documents.find(item => item.id_document === this.selectedDocument.id_document);
          this.selectedDocument = clone(current);
          if(this.isAccepted(current)) { this.selectedAcceptance = clone(current.accepted); this.acknowledged = false; }
        }
        return true;
      } catch(_) { if(request === this.currentRequest && this.isCurrent(context)) this.currentError = 'No pudimos consultar los documentos vigentes. Reintenta antes de registrar una aceptación.'; return false; }
      finally { if(request === this.currentRequest && !this.disposed) this.currentLoading = false; }
    },
    async loadHistory(more = false) {
      more = more === true;
      if(!this.sessionEligible || this.historyLoading || this.saving) return false;
      const context = this.captureContext(), request = ++this.historyRequest;
      this.historyLoading = true; this.historyError = '';
      try {
        const response = await SaaSLegalService.history(more ? this.historyCursor : undefined);
        if(request !== this.historyRequest || this.disposed) return false;
        if(!this.isCurrent(context)) { this.acceptances = []; this.historyLoaded = false; this.historyError = 'La sesión o tus accesos cambiaron. Reintenta para consultar el historial actual.'; return false; }
        if(!response || !response.success || !response.data || !Array.isArray(response.data.acceptances)) throw new Error();
        this.acceptances = more ? this.acceptances.concat(response.data.acceptances.filter(item => !this.acceptances.some(old => old.id_acceptance === item.id_acceptance))) : response.data.acceptances;
        this.historyCursor = response.data.central_next_cursor || null;
        this.historyWarning = response.data.central_available === false ? 'No pudimos consultar los comprobantes de Legal central. Tus comprobantes locales se conservan; reintenta el historial.' : response.data.central_sync_pending ? 'Hay confirmaciones pendientes de sincronización. Se mostrarán como comprobantes centrales cuando Legal confirme su recepción.' : '';
        this.historyLoaded = true; return true;
      } catch(_) { if(request === this.historyRequest && this.isCurrent(context)) this.historyError = 'No pudimos consultar los comprobantes. Reintenta el historial; esto no elimina las aceptaciones registradas.'; return false; }
      finally { if(request === this.historyRequest && !this.disposed) this.historyLoading = false; }
    },
    isAccepted(item) { return Boolean(item.current_version && item.accepted && item.accepted.id_version === item.current_version.id_version); },
    statusLabel(item) { return item.informational ? 'Solo lectura' : item.sync_pending ? 'Sincronización pendiente' : !item.current_version ? 'Sin publicar' : this.isAccepted(item) ? 'Aceptado' : item.source === 'central' && !item.pending ? 'Sin nueva aceptación requerida' : item.pending ? 'Pendiente de aceptación' : 'Disponible para revisar'; },
    statusClass(item) { return item.informational || !item.current_version ? 'legal-status--neutral' : this.isAccepted(item) ? 'legal-status--accepted' : 'legal-status--pending'; },
    scopeLabel(scope) { return scope === 'business' ? 'Aceptación por el consultorio' : 'Aceptación personal'; },
    scopeHelp(scope) { return scope === 'business' ? 'Una persona administradora acepta por el consultorio.' : 'Cada usuario revisa y acepta este documento de forma personal.'; },
    actorName(receipt) { return receipt && receipt.accepted_by_name || 'Usuario registrado'; },
    formatDate(value) {
      if(!value) return 'Fecha no disponible'; const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date) + ' (hora del centro de México)';
    },
    clearSelection() { this.documentRequest++; this.centralDocumentLoading = false; this.dialogOpen = false; this.dialogSource = ''; this.selectedDocument = null; this.selectedVersion = null; this.selectedAcceptance = null; this.acknowledged = false; this.saveError = ''; this.staleVersion = false; this.confirmedAcceptance = false; this.reviewContext = null; },
    openCurrent(item) {
      if(!this.sessionEligible || this.saving || this.reviewSaving || this.currentLoading || !item || !item.current_version || !item.current_version.id_version) return false;
      if(item.source === 'central' && item.pending && !item.informational && !item.sync_pending && item.central_can_review !== false && !this.isAccepted(item)) {
        const review = (this.$refs.centralReviews || []).find(child => child.documentSetKey === this.reviewSetKey(item));
        if(review) { review.start(); return true; }
      }
      this.opener = document.activeElement; this.clearSelection(); this.dialogSource = 'current'; this.selectedDocument = clone(item); this.selectedVersion = clone(item.current_version);
      this.selectedAcceptance = this.isAccepted(item) ? clone(item.accepted) : null; this.reviewContext = this.captureContext(); this.dialogOpen = true; if(item.source === 'central') this.loadCentralVersion(item.current_version.id_version, undefined, item.document_set_key); return true;
    },
    openReceipt(receipt) {
      if(!this.sessionEligible || this.saving || !receipt || !receipt.version) return false;
      this.opener = document.activeElement; this.clearSelection(); this.dialogSource = 'history';
      this.selectedDocument = { id_document: receipt.id_document, title: receipt.title, acceptance_scope: receipt.acceptance_scope };
      this.selectedVersion = clone(receipt.version); this.selectedAcceptance = clone(receipt); this.dialogOpen = true;
      if(receipt.source === 'central') this.loadCentralVersion(receipt.id_version, receipt.history_cursor, receipt.document_set_key); return true;
    },
    async loadCentralVersion(id, cursor, setKey) {
      const context = this.captureContext(), request = ++this.documentRequest; this.centralDocumentLoading = true;
      try {
        const response = await SaaSLegalService.centralDocument(id, cursor, setKey);
        if(request !== this.documentRequest || !this.isCurrent(context) || !this.dialogOpen || !this.selectedVersion || this.selectedVersion.id_version !== id) return;
        const version = response && response.success && response.data && response.data.version;
        if(!version || version.id_version !== id || version.content_hash !== this.selectedVersion.content_hash) throw new Error();
        this.selectedVersion = clone(version);
      } catch(_) { /* Keep the immutable receipt visible when archived text is unavailable. */ }
      finally { if(request === this.documentRequest && this.isCurrent(context)) this.centralDocumentLoading = false; }
    },
    requestClose() {
      if(this.saving) return false;
      this.clearSelection(); this.$nextTick(() => { if(this.opener && document.contains(this.opener) && typeof this.opener.focus === 'function') this.opener.focus(); }); return true;
    },
    focusAcceptanceStatus(context, id) {
      this.$nextTick(() => {
        if(!this.isCurrent(context) || !this.dialogOpen || !this.selectedAcceptance || this.selectedAcceptance.id_acceptance !== id) return;
        const status = this.$refs.acceptanceStatus;
        if(status && typeof status.focus === 'function') status.focus();
      });
    },
    isStaleResponse(value) { const payload = value && value.response && value.response.data || value || {}; return Number(payload.status) === 409 || payload.code === 'LEGAL_VERSION_STALE' || payload.data && payload.data.code === 'LEGAL_VERSION_STALE'; },
    async reviewLatest() {
      if(this.saving) return false;
      const id = this.selectedDocument && this.selectedDocument.id_document;
      if(!await this.loadCurrent()) return false;
      const latest = this.documents.find(item => item.id_document === id && item.current_version);
      if(!latest) { this.saveError = 'No hay una versión publicada disponible. Actualiza la consulta o pide ayuda al administrador.'; return false; }
      return this.openCurrent(latest);
    },
    async acceptSelected() {
      if(!this.canSubmitAcceptance) return false;
      const context = this.captureContext(), request = ++this.actionRequest, id = this.selectedVersion.id_version;
      this.saving = true; this.saveError = ''; let accepted = false;
      try {
        const response = await SaaSLegalService.accept(id);
        if(request !== this.actionRequest || !this.isCurrent(context)) return false;
        if(this.isStaleResponse(response)) { this.staleVersion = true; this.acknowledged = false; this.saveError = 'Se publicó una versión nueva. Cárgala y revísala; no registramos automáticamente tu aceptación de otra versión.'; return false; }
        const receipt = response && response.data && response.data.acceptance;
        const business = (this.authState.business || {}).id_business || (this.authState.user || {}).id_business;
        if(!response || !response.success || !receipt || !receipt.id_acceptance || receipt.id_version !== id || receipt.id_business !== business || receipt.acceptance_scope !== this.selectedDocument.acceptance_scope || !receipt.accepted_at || Number.isNaN(new Date(receipt.accepted_at).getTime())) throw new Error();
        this.selectedAcceptance = clone(receipt); this.confirmedAcceptance = true; this.acknowledged = false;
        this.focusAcceptanceStatus(context, receipt.id_acceptance);
        this.documents = this.documents.map(item => item.current_version && item.current_version.id_version === id ? { ...item, accepted: clone(receipt), pending: false, can_accept: false } : item);
        window.dispatchEvent(new window.CustomEvent('saas-legal-accepted')); accepted = true;
      } catch(error) {
        if(request === this.actionRequest && this.isCurrent(context)) {
          if(this.isStaleResponse(error)) { this.staleVersion = true; this.acknowledged = false; this.saveError = 'La versión cambió. Carga y revisa el documento vigente antes de aceptar.'; }
          else this.saveError = 'No se pudo confirmar la aceptación. Conservamos tu selección. Revisa la conexión y vuelve a consultar los documentos o reintenta.';
        }
      } finally { if(request === this.actionRequest && !this.disposed) this.saving = false; }
      if(accepted) await this.refreshAll(); return accepted;
    },
    onAcceptanceNotice() { if(!this.saving) this.refreshAll(); }
  }
};
</script>

<style scoped>
.account-legal{border-radius:18px;overflow:hidden;color:#344b55}.legal-heading,.legal-history-heading,.legal-card-top,.legal-receipt,.legal-review-heading,.legal-review-actions{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.legal-heading,.legal-history{padding:24px}.legal-heading{background:var(--color-primary-100,#e8f5f6);border-bottom:1px solid var(--color-primary-200,#c8e0e3)}.legal-heading>div,.legal-card-top h3,.legal-receipt>div,.legal-review-heading>div{min-width:0}.legal-eyebrow{text-transform:uppercase;font-size:12px;font-weight:750;letter-spacing:.08em;margin:0 0 6px}.legal-heading h2,.legal-review-heading h2{font-size:24px;line-height:1.25;margin:0 0 10px;font-weight:750}.legal-heading p,.legal-document-card p,.legal-history p,.legal-review-heading p{margin:8px 0 0;line-height:1.55}.legal-button{padding:10px 16px;border-radius:11px;font-weight:700;line-height:1.4;white-space:normal;flex-shrink:0}.legal-button--outline{border:1px solid var(--color-primary-500,#198b95);color:var(--color-primary-900,#15535d);background:transparent}.legal-button--primary{background:var(--color-primary-700,#167b86);color:white;border:1px solid transparent}.legal-button:disabled,.legal-link:disabled{cursor:not-allowed;opacity:.5}.legal-link{color:var(--color-primary-900,#15535d);text-decoration:underline;font-weight:700}.legal-document-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;padding:24px}.legal-document-card{border-radius:14px;padding:20px;min-width:0}.legal-card-top{flex-wrap:wrap;gap:10px}.legal-card-top h3{font-size:18px;font-weight:750;overflow-wrap:anywhere;margin:0}.legal-status{font-size:12px;font-weight:750;border-radius:20px;padding:5px 10px}.legal-status--neutral{background:#e9eef1;color:#475b67}.legal-status--accepted{background:#e5f6ec;color:#206542}.legal-status--pending{background:#fff3d9;color:#825311}.legal-scope{font-weight:650}.legal-meta,.legal-hash{font-size:12px}.legal-hash{overflow-wrap:anywhere;word-break:break-word;line-height:1.5}.legal-responsible{color:#825311}.legal-document-card .legal-button{margin-top:16px}.legal-message{padding:16px 22px;margin:0;line-height:1.55}.legal-message p{margin:0 0 8px}.legal-message--error{color:#a32834;background:#fff0f1}.legal-history{border-top:1px solid var(--color-primary-200,#c8e0e3)}.legal-history h3{font-size:20px;font-weight:750;margin:0}.legal-receipt-list{list-style:none;margin:18px 0 0;padding:0;display:grid;gap:12px}.legal-receipt{border-radius:12px;padding:18px;align-items:center}.legal-review-heading{padding:22px;border-bottom:1px solid var(--color-primary-200,#c8e0e3)}.legal-review-body{padding:22px!important;overscroll-behavior:contain}.legal-document-content{font-size:15px;line-height:1.75;overflow-x:auto;overflow-wrap:anywhere;margin:20px 0}.legal-document-content ::v-deep img{max-width:100%;height:auto}.legal-acceptance-proof{padding:15px;border:1px solid #a3d6bb;border-radius:12px;background:#edf9f2;color:#265d42}.legal-acceptance-proof p{margin:6px 0 0}.legal-acknowledgment{display:flex;gap:12px;align-items:flex-start;font-weight:650;line-height:1.6;margin:20px 0}.legal-acknowledgment input{width:20px;height:20px;flex-shrink:0;margin-top:3px;accent-color:var(--color-primary-700,#167b86)}.legal-review-actions{padding:18px 22px!important;border-top:1px solid var(--color-primary-200,#c8e0e3);justify-content:flex-end;flex-wrap:wrap}.account-legal button:focus-visible,.legal-review button:focus-visible,.legal-acknowledgment input:focus-visible{outline:3px solid var(--color-primary-500,#198b95);outline-offset:3px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:700px){.legal-heading,.legal-history-heading,.legal-receipt{flex-direction:column;align-items:stretch}.legal-heading,.legal-history,.legal-document-grid{padding:18px}.legal-document-grid{grid-template-columns:minmax(0,1fr)}.legal-review-heading,.legal-review-body{padding:16px!important}.legal-review-heading h2{font-size:21px}.legal-review-actions{padding:16px!important;align-items:stretch;flex-direction:column}.legal-review-actions .legal-button,.legal-heading>.legal-button{width:100%}}
.legal-document-content{background:#fff;color:#25364d;padding:18px;border:1px solid #dce6ec;border-radius:10px}
.legal-document-skeleton{padding:18px;min-height:240px}
html[data-theme="clinical-night"] .legal-document-skeleton ::v-deep .v-skeleton-loader__bone{background:#334155}
.legal-acceptance-proof:focus{outline:3px solid var(--color-primary-500,#198b95);outline-offset:3px}
html[data-theme="clinical-night"] .legal-heading{background:#172f41;color:#e2e8f0;border-color:#3b4d63}
html[data-theme="clinical-night"] .legal-document-card,html[data-theme="clinical-night"] .legal-receipt{border-color:#3b4d63!important}
html[data-theme="clinical-night"] .legal-history,html[data-theme="clinical-night"] .legal-review-heading,html[data-theme="clinical-night"] .legal-review-actions{border-color:#3b4d63}
html[data-theme="clinical-night"] .legal-button--outline,html[data-theme="clinical-night"] .legal-link{color:#bae6fd;border-color:#6489a9}
html[data-theme="clinical-night"] .legal-button--primary{background:#0e7490;border-color:#0e7490;color:#fff}
html[data-theme="clinical-night"] .legal-status--neutral{background:#334155;color:#e2e8f0}
html[data-theme="clinical-night"] .legal-status--accepted,html[data-theme="clinical-night"] .legal-acceptance-proof{background:#183e32;color:#c8f5de;border-color:#477d64}
html[data-theme="clinical-night"] .legal-status--pending{background:#4b3b1d;color:#fde5ad}
html[data-theme="clinical-night"] .legal-responsible{color:#fde5ad}
html[data-theme="clinical-night"] .legal-message--error{background:#492b35;color:#ffdae1}
</style>
