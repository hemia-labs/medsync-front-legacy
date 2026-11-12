<template>
  <div class="legal-page">
    <section class="legal-intro">
      <div>
        <p class="legal-eyebrow">Administración global</p>
        <h1>Documentos legales</h1>
        <p>Edita y publica el contrato que aceptan los administradores de cada consultorio.</p>
      </div>
      <button type="button" class="legal-button" :disabled="busy" @click="requestReload">
        <v-icon small>mdi-refresh</v-icon> Actualizar
      </button>
    </section>

    <v-alert v-if="loadError" type="error" text role="alert">{{ loadError }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" aria-label="Cargando documentos legales" />

    <div class="legal-workspace">
      <aside class="legal-document-list">
        <p class="legal-list-note">Los términos y condiciones y el aviso de privacidad se administran en Hemia Legal.</p>
      </aside>

      <div class="legal-main" v-if="selectedDocument && form">
        <section class="legal-panel">
          <header class="legal-panel-header">
            <div><p class="legal-eyebrow">Borrador</p><h2>{{ selectedDefinition.label }}</h2></div>
            <span class="legal-badge">{{ dirty ? 'Cambios sin guardar' : 'Revisión ' + form.revision }}</span>
          </header>
          <div class="legal-publication-summary">
            <v-icon small>mdi-file-check-outline</v-icon>
            <span v-if="selectedDocument.current_version">Versión vigente {{ selectedDocument.current_version.version_number }} · {{ formatDate(selectedDocument.current_version.published_at) }}</span>
            <span v-else>Aún no hay una versión publicada.</span>
            <button v-if="selectedDocument.current_version" type="button" class="legal-link" :disabled="busy" @click="openVersion(selectedDocument.current_version)">Ver vigente</button>
          </div>
          <v-alert v-if="successMessage" type="success" text dense role="status">{{ successMessage }}</v-alert>
          <v-alert v-if="actionError" type="error" text dense role="alert">{{ actionError }}</v-alert>
          <p v-if="syncRequired" class="legal-recovery">Actualiza los documentos para comprobar el estado del servidor antes de volver a guardar o publicar. La captura actual se conserva hasta que confirmes descartarla.</p>

          <form class="legal-form" @submit.prevent="saveDraft">
            <v-text-field v-model="form.title" label="Título" outlined dense maxlength="255" counter="255" :disabled="busy"
              :error-messages="fieldErrors.title" autocomplete="off" />
            <v-textarea v-model="form.description" label="Descripción breve (opcional)" outlined rows="2" maxlength="1000" counter="1000"
              :disabled="busy" :error-messages="fieldErrors.description" />
            <div class="legal-audience"><v-icon small>mdi-account-check-outline</v-icon><div><strong>Quién acepta</strong><p>{{ audienceLabel }}</p></div></div>
            <v-checkbox v-model="form.required" :disabled="busy" label="Solicitar aceptación obligatoria de esta versión" hide-details class="legal-required" />
            <p class="legal-help">Al publicar, la nueva versión aparecerá pendiente de aceptación para sus destinatarios. Esta opción indica si se cuenta como obligatoria.</p>
            <v-textarea v-model="form.content_html" label="Contenido del documento (HTML)" outlined rows="16" auto-grow class="legal-html-editor"
              :disabled="busy" :error-messages="fieldErrors.content_html" spellcheck="false" />
            <p class="legal-help">Puedes usar párrafos, títulos, listas y tablas en HTML. Revisa la vista previa antes de publicar. El borrador puede guardarse sin contenido; una versión publicada debe incluir texto.</p>
            <footer class="legal-editor-actions">
              <button type="button" class="legal-button" :disabled="busy" @click="previewOpen = true"><v-icon small>mdi-eye-outline</v-icon> Vista previa</button>
              <span class="legal-action-spacer"></span>
              <button type="submit" class="legal-button" :disabled="busy || !dirty || syncRequired"><v-progress-circular v-if="saving" indeterminate size="16" width="2" />Guardar borrador</button>
              <button type="button" class="legal-button legal-button-primary" :disabled="busy || dirty || syncRequired || !canPublish" @click="requestPublish"><v-icon small>mdi-publish</v-icon> Publicar nueva versión</button>
            </footer>
            <p v-if="dirty" class="legal-help">Guarda el borrador antes de publicar.</p>
            <p v-else-if="!canPublish" class="legal-help">Completa el título y el contenido para publicar una nueva versión.</p>
          </form>
        </section>

        <section class="legal-panel" aria-label="Historial de versiones publicadas">
          <header class="legal-panel-header"><div><p class="legal-eyebrow">Contenido conservado</p><h2>Historial de versiones</h2></div><span class="legal-badge">{{ versions.length }}</span></header>
          <div v-if="!versions.length" class="legal-empty"><v-icon size="32">mdi-file-clock-outline</v-icon><p>Las versiones aparecerán aquí después de publicarlas.</p></div>
          <ol v-else class="legal-version-list">
            <li v-for="version in versions" :key="version.id_version">
              <div><strong>Versión {{ version.version_number }}</strong><span v-if="selectedDocument.current_version && selectedDocument.current_version.id_version === version.id_version" class="legal-badge">Vigente</span><p>{{ formatDate(version.published_at) }}</p><code v-if="version.content_hash" class="legal-hash">{{ version.content_hash }}</code></div>
              <button type="button" class="legal-button" :disabled="busy" @click="openVersion(version)">Ver versión</button>
            </li>
          </ol>
        </section>
      </div>
      <section v-else-if="!loading" class="legal-panel legal-empty"><v-icon size="36">mdi-file-document-alert-outline</v-icon><h2>No se pudo abrir el documento</h2><p>Actualiza para consultar los documentos disponibles.</p></section>
    </div>

    <v-dialog v-model="previewOpen" max-width="920" scrollable :retain-focus="true">
      <section class="legal-dialog" role="dialog" aria-modal="true" aria-labelledby="legal-preview-title">
        <header class="legal-panel-header"><div><p class="legal-eyebrow">Vista previa del borrador</p><h2 id="legal-preview-title">{{ form && form.title || selectedDefinition.label }}</h2></div><button type="button" class="legal-icon-button" aria-label="Cerrar vista previa" @click="previewOpen = false"><v-icon>mdi-close</v-icon></button></header>
        <div class="legal-dialog-body"><p class="legal-help">Esta vista previa no publica ni solicita aceptación.</p><article v-if="previewHasText" class="legal-rendered-document" v-html="previewHtml"></article><p v-else class="legal-empty">El borrador aún no contiene texto para mostrar.</p></div>
        <footer class="legal-dialog-actions"><button type="button" class="legal-button" @click="previewOpen = false">Cerrar</button></footer>
      </section>
    </v-dialog>

    <v-dialog v-model="versionOpen" max-width="920" scrollable @input="onVersionDialogChange">
      <section class="legal-dialog" role="dialog" aria-modal="true" aria-labelledby="legal-version-title">
        <header class="legal-panel-header"><div><p class="legal-eyebrow">Versión publicada · Solo lectura</p><h2 id="legal-version-title">{{ frozenVersion ? frozenVersion.title || selectedDefinition.label : 'Consultar versión' }}</h2></div><button type="button" class="legal-icon-button" aria-label="Cerrar versión" @click="closeVersion"><v-icon>mdi-close</v-icon></button></header>
        <div class="legal-dialog-body">
          <v-progress-linear v-if="versionLoading" indeterminate color="primary" aria-label="Cargando versión publicada" />
          <v-alert v-if="versionError" type="error" text role="alert">{{ versionError }}</v-alert>
          <template v-if="frozenVersion"><p>Versión {{ frozenVersion.version_number }} · {{ formatDate(frozenVersion.published_at) }}</p><p class="legal-help">Contenido de esta publicación, conservado independientemente del borrador actual.</p><code class="legal-hash">{{ frozenVersion.content_hash }}</code><article class="legal-rendered-document" v-html="frozenHtml"></article></template>
        </div>
        <footer class="legal-dialog-actions"><button type="button" class="legal-button" @click="closeVersion">Cerrar</button></footer>
      </section>
    </v-dialog>

    <v-dialog v-model="publishOpen" max-width="560" :persistent="publishing">
      <section class="legal-dialog" role="dialog" aria-modal="true" aria-labelledby="legal-publish-title">
        <header class="legal-panel-header"><h2 id="legal-publish-title">Publicar nueva versión</h2></header>
        <div class="legal-dialog-body"><p>Se publicará el borrador guardado de <strong>{{ selectedDefinition.label }}</strong>.</p><p>Se solicitará a {{ audienceLabel.toLowerCase() }} la aceptación de esta nueva versión, aunque hayan aceptado una anterior. Las versiones anteriores conservarán su contenido y sus aceptaciones.</p><p>{{ form && form.required ? 'Esta aceptación se contará como obligatoria.' : 'Esta aceptación será opcional.' }}</p><p>Revisa el texto y sus destinatarios antes de confirmar.</p><v-alert v-if="publishError" type="error" text role="alert">{{ publishError }}</v-alert></div>
        <footer class="legal-dialog-actions"><button type="button" class="legal-button" :disabled="publishing" @click="publishOpen = false">Cancelar</button><button type="button" class="legal-button legal-button-primary" :disabled="publishing || syncRequired" @click="publishVersion"><v-progress-circular v-if="publishing" indeterminate size="16" width="2" />Publicar y solicitar aceptación</button></footer>
      </section>
    </v-dialog>

    <v-dialog v-model="discardOpen" max-width="520" persistent>
      <section class="legal-dialog" role="dialog" aria-modal="true" aria-labelledby="legal-discard-title"><header class="legal-panel-header"><h2 id="legal-discard-title">Hay cambios sin guardar</h2></header><div class="legal-dialog-body"><p>Si continúas, se descartará la captura local. El borrador guardado y las versiones publicadas se conservarán.</p></div><footer class="legal-dialog-actions"><button type="button" class="legal-button" @click="cancelDiscard">Seguir editando</button><button type="button" class="legal-button legal-button-danger" @click="confirmDiscard">Descartar y continuar</button></footer></section>
    </v-dialog>
  </div>
</template>

<script>
import saasLegalService from '@/services/saasLegal.service';
import { sanitizeHtmlForDocumentSnapshot } from '@/utils/sanitizeHtml';
import { authorizationContext, authorizationFingerprint, isCurrentAuthorization } from '@/security/authorizationContext';

const license = { key: 'license_agreement', label: 'Contrato de licencia', scope: 'business' };
const editable = draft => ({ title: String(draft.title || ''), description: String(draft.description || ''), content_html: String(draft.content_html || ''), required: Boolean(draft.required), acceptance_scope: draft.acceptance_scope, revision: draft.revision });
const capture = form => JSON.stringify(form);
const hasText = html => {
  const node = document.createElement('div');
  node.innerHTML = html;
  return Boolean((node.textContent || '').replace(/[\s\u200B-\u200D\u2060\uFEFF]/g, ''));
};
const serverMessage = (response, fallback) => response && response.message || fallback;

export default {
  name: 'SuperAdminLegalDocuments',
  data: function() {
    return { selectedDefinition: license, documents: [], form: null, savedCapture: '', loading: false, saving: false, publishing: false,
      loadError: '', actionError: '', successMessage: '', fieldErrors: {}, syncRequired: false,
      previewOpen: false, publishOpen: false, publishError: '', versionOpen: false, versionLoading: false, versionError: '', frozenVersion: null, versionRequest: 0,
      discardOpen: false, pendingAction: null, cancelAction: null, destroyed: false, contextGeneration: 0 };
  },
  computed: {
    authState: function() { return this.$store && this.$store.state && this.$store.state.CORE && this.$store.state.CORE.AUTH || null; },
    hasAdministrativeSession: function() { return Boolean(this.authState && this.authState.authenticated && String(this.authState.role || '').toLowerCase() === 'super_admin'); },
    authorizationKey: function() { return authorizationFingerprint(this.authState) + ':' + (this.authState && this.authState.accessRevision || 0); },
    selectedDocument: function() { return this.documents[0] || null; },
    dirty: function() { return Boolean(this.form && capture(this.form) !== this.savedCapture); },
    busy: function() { return this.loading || this.saving || this.publishing; },
    audienceLabel: function() { return 'Los administradores de cada consultorio'; },
    previewHtml: function() { return sanitizeHtmlForDocumentSnapshot(this.form && this.form.content_html || ''); },
    previewHasText: function() { return hasText(this.previewHtml); },
    frozenHtml: function() { return sanitizeHtmlForDocumentSnapshot(this.frozenVersion && this.frozenVersion.content_html || ''); },
    canPublish: function() { return Boolean(this.form && this.form.title.trim() && this.previewHasText); },
    versions: function() { return this.selectedDocument && Array.isArray(this.selectedDocument.versions) ? this.selectedDocument.versions.slice().sort((a, b) => Number(b.version_number) - Number(a.version_number)) : []; }
  },
  watch: { authorizationKey: function() { this.onAuthorizationChanged(); } },
  created: function() { if(this.hasAdministrativeSession) this.loadDocuments(); },
  mounted: function() { window.addEventListener('beforeunload', this.onBeforeUnload); },
  beforeDestroy: function() { this.destroyed = true; this.versionRequest++; window.removeEventListener('beforeunload', this.onBeforeUnload); if(this.cancelAction) this.cancelAction(); },
  beforeRouteLeave: function(to, from, next) {
    if(!this.hasAdministrativeSession) { next(); return; }
    if(this.busy) { next(false); return; }
    this.confirmNavigation(() => next(), () => next(false));
  },
  methods: {
    captureContext: function() { return { generation: this.contextGeneration, authorization: authorizationContext(this.$store) }; },
    isContextCurrent: function(context) { return !this.destroyed && this.hasAdministrativeSession && context.generation === this.contextGeneration && isCurrentAuthorization(context.authorization, this.$store); },
    onAuthorizationChanged: function() {
      this.contextGeneration++;
      const continueRoute = this.cancelAction ? this.pendingAction : null;
      this.pendingAction = null; this.cancelAction = null; this.discardOpen = false;
      this.documents = []; this.form = null; this.savedCapture = ''; this.fieldErrors = {}; this.actionError = ''; this.successMessage = ''; this.loadError = ''; this.syncRequired = false;
      this.loading = false; this.saving = false; this.publishing = false; this.previewOpen = false; this.publishOpen = false; this.publishError = ''; this.closeVersion();
      if(continueRoute) continueRoute();
      if(this.hasAdministrativeSession) this.loadDocuments();
    },
    formatDate: function(value) { if(!value) return 'Sin fecha'; const date = new Date(value); return isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }); },
    onBeforeUnload: function(event) { if(this.hasAdministrativeSession && (this.dirty || this.busy)) { event.preventDefault(); event.returnValue = ''; } },
    setSelectedForm: function() {
      this.form = this.selectedDocument && this.selectedDocument.draft ? editable(this.selectedDocument.draft) : null;
      this.savedCapture = this.form ? capture(this.form) : '';
      this.fieldErrors = {}; this.actionError = ''; this.successMessage = ''; this.syncRequired = false;
    },
    loadDocuments: async function() {
      if(this.busy || !this.hasAdministrativeSession) return;
      const context = this.captureContext();
      this.loading = true; this.loadError = '';
      try {
        const response = await saasLegalService.adminList();
        if(!this.isContextCurrent(context)) return;
        if(!response || !response.success || !response.data || !Array.isArray(response.data.documents)) throw new Error(serverMessage(response, 'No se pudieron cargar los documentos legales.'));
        this.documents = response.data.documents.filter(item => item.document_key === license.key);
        this.setSelectedForm();
      } catch(error) { if(this.isContextCurrent(context)) this.loadError = serverMessage(error.response && error.response.data, error.message || 'No se pudieron cargar los documentos legales.'); }
      finally { if(this.isContextCurrent(context)) this.loading = false; }
    },
    confirmNavigation: function(action, cancel) {
      if(!this.dirty) { action(); return; }
      if(this.discardOpen) { if(cancel) cancel(); return; }
      this.pendingAction = action; this.cancelAction = cancel || null; this.discardOpen = true;
    },
    cancelDiscard: function() { const cancel = this.cancelAction; this.pendingAction = null; this.cancelAction = null; this.discardOpen = false; if(cancel) cancel(); },
    confirmDiscard: function() { const action = this.pendingAction; this.pendingAction = null; this.cancelAction = null; this.discardOpen = false; this.setSelectedForm(); if(action) action(); },
    requestReload: function() { if(this.hasAdministrativeSession && !this.busy) this.confirmNavigation(() => this.loadDocuments()); },
    validateDraft: function() {
      const errors = {};
      if(!this.form || !this.form.title.trim()) errors.title = 'Escribe el título del documento.';
      else if(this.form.title.trim().length > 255) errors.title = 'El título admite hasta 255 caracteres.';
      if(this.form && this.form.description.length > 1000) errors.description = 'La descripción admite hasta 1000 caracteres.';
      this.fieldErrors = errors;
      return !Object.keys(errors).length;
    },
    applyServerDocument: function(response) {
      const item = response && response.data && response.data.document;
      if(!item || item.document_key !== license.key || !item.draft || !Number.isInteger(item.draft.revision)) {
        this.syncRequired = true;
        throw new Error('La operación se completó, pero no se pudo confirmar el borrador actualizado. Actualiza para comprobar el resultado.');
      }
      const index = this.documents.findIndex(row => row.document_key === item.document_key);
      if(index >= 0) this.$set(this.documents, index, item); else this.documents.push(item);
      this.setSelectedForm();
    },
    showActionFailure: function(response, fallback) {
      this.actionError = serverMessage(response, fallback);
      const errors = response && response.data && response.data.fieldErrors || response && response.fieldErrors;
      this.fieldErrors = errors && typeof errors === 'object' ? errors : {};
      const code = response && (response.code || response.data && response.data.code);
      if(code === 'LEGAL_DRAFT_CONFLICT' || code === 'LEGAL_ALREADY_PUBLISHED' || response && response.status === 409) this.syncRequired = true;
    },
    saveDraft: async function() {
      if(!this.hasAdministrativeSession || this.busy || !this.dirty || this.syncRequired || !this.validateDraft()) return;
      const context = this.captureContext();
      this.saving = true; this.actionError = ''; this.successMessage = '';
      const payload = { title: this.form.title.trim(), description: this.form.description.trim(), content_html: this.form.content_html, required: this.form.required, acceptance_scope: this.selectedDefinition.scope, expected_revision: this.form.revision };
      try {
        const response = await saasLegalService.saveDraft(license.key, payload);
        if(!this.isContextCurrent(context)) return;
        if(!response || !response.success) { this.showActionFailure(response, 'No se pudo guardar el borrador.'); return; }
        this.applyServerDocument(response); this.successMessage = 'Borrador guardado. La versión publicada se conserva hasta que publiques una nueva.';
      } catch(error) {
        if(this.isContextCurrent(context)) { const response = error.response && error.response.data; this.showActionFailure(response, error.message || 'No se pudo confirmar el guardado.'); if(!error.response || error.response.status === 409) this.syncRequired = true; }
      } finally { if(this.isContextCurrent(context)) this.saving = false; }
    },
    requestPublish: function() {
      if(!this.hasAdministrativeSession || this.busy || this.dirty || this.syncRequired || !this.canPublish) return;
      this.publishError = ''; this.publishOpen = true;
    },
    publishVersion: async function() {
      if(!this.hasAdministrativeSession || !this.publishOpen || this.busy || this.dirty || this.syncRequired || !this.canPublish) return;
      const context = this.captureContext();
      this.publishing = true; this.publishError = ''; this.actionError = ''; this.successMessage = '';
      try {
        const response = await saasLegalService.publish(license.key, this.form.revision);
        if(!this.isContextCurrent(context)) return;
        if(!response || !response.success) { this.showActionFailure(response, 'No se pudo publicar la versión.'); this.publishError = this.actionError; return; }
        this.applyServerDocument(response); this.publishOpen = false; this.successMessage = 'Nueva versión publicada. Sus destinatarios tendrán pendiente la aceptación de esta versión.';
      } catch(error) {
        if(this.isContextCurrent(context)) { const response = error.response && error.response.data; this.showActionFailure(response, error.message || 'No se pudo confirmar la publicación.'); this.publishError = this.actionError; if(!error.response || error.response.status === 409) this.syncRequired = true; }
      } finally { if(this.isContextCurrent(context)) this.publishing = false; }
    },
    openVersion: async function(version) {
      if(!this.hasAdministrativeSession || this.busy || !version || !version.id_version) return;
      const context = this.captureContext();
      const request = ++this.versionRequest, key = license.key;
      this.versionOpen = true; this.frozenVersion = null; this.versionError = ''; this.versionLoading = true;
      try {
        const response = await saasLegalService.version(key, version.id_version);
        if(!this.isContextCurrent(context) || request !== this.versionRequest || !this.versionOpen) return;
        if(!response || !response.success || !response.data || !response.data.version || response.data.version.id_version !== version.id_version) throw new Error(serverMessage(response, 'No se pudo consultar esta versión.'));
        this.frozenVersion = response.data.version;
      } catch(error) { if(this.isContextCurrent(context) && request === this.versionRequest && this.versionOpen) this.versionError = serverMessage(error.response && error.response.data, error.message || 'No se pudo consultar esta versión.'); }
      finally { if(this.isContextCurrent(context) && request === this.versionRequest) this.versionLoading = false; }
    },
    onVersionDialogChange: function(open) { if(!open) this.closeVersion(); },
    closeVersion: function() { this.versionRequest++; this.versionOpen = false; this.versionLoading = false; this.frozenVersion = null; }
  }
};
</script>

<style scoped>
.legal-page { --legal-surface: #fff; --legal-muted-surface: #f8fafc; --legal-text: #1e293b; --legal-muted: #64748b; --legal-border: #dbe3ec; color: var(--legal-text); min-width: 0; }
.legal-intro { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.25rem; margin-bottom: 1.5rem; }
.legal-intro h1 { font-size: 1.65rem; font-weight: 750; margin: 0 0 .5rem; }
.legal-intro p:last-child { max-width: 48rem; margin: 0; color: var(--legal-muted); line-height: 1.6; }
.legal-eyebrow { color: var(--color-primary-900, #086783); text-transform: uppercase; letter-spacing: .08em; font-size: .7rem; font-weight: 750; margin: 0 0 .35rem; }
.legal-workspace { display: grid; grid-template-columns: 16rem minmax(0, 1fr); gap: 1.25rem; align-items: start; }
.legal-document-list { display: grid; gap: .6rem; }
.legal-list-note,.legal-help,.legal-recovery { color: var(--legal-muted); font-size: .8rem; line-height: 1.55; margin: .65rem 0; }
.legal-list-note { padding: 0 .5rem; }
.legal-recovery { font-weight: 600; }
.legal-main { display: grid; gap: 1.25rem; min-width: 0; }
.legal-panel,.legal-dialog { background: var(--legal-surface, #fff); color: var(--legal-text, #1e293b); border: 1px solid var(--legal-border, #dbe3ec); border-radius: 16px; min-width: 0; overflow: hidden; }
.legal-panel { padding: 1.5rem; }
.legal-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.legal-panel-header>div { min-width: 0; }
.legal-panel-header h2 { font-size: 1.12rem; line-height: 1.4; margin: 0; font-weight: 750; overflow-wrap: anywhere; }
.legal-badge { display: inline-block; border: 1px solid var(--legal-border, #dbe3ec); border-radius: 20px; background: var(--legal-muted-surface, #f8fafc); color: var(--legal-muted, #64748b); font-size: .73rem; padding: .3rem .65rem; white-space: nowrap; }
.legal-publication-summary { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; padding: .85rem; margin-bottom: 1.5rem; border-radius: 10px; background: var(--legal-muted-surface); color: var(--legal-muted); font-size: .82rem; }
.legal-form { display: grid; gap: .35rem; }
.legal-audience { display: flex; align-items: flex-start; gap: .65rem; background: var(--legal-muted-surface); padding: .85rem; border-radius: 10px; font-size: .85rem; }
.legal-audience p { margin: .2rem 0 0; color: var(--legal-muted); }
.legal-required { margin-top: .6rem; }
.legal-editor-actions,.legal-dialog-actions { display: flex; align-items: center; flex-wrap: wrap; gap: .6rem; }
.legal-action-spacer { flex: 1; }
.legal-button { min-height: 40px; display: inline-flex; justify-content: center; align-items: center; gap: .45rem; border: 1px solid var(--legal-border, #dbe3ec); border-radius: 9px; padding: .6rem .9rem; background: var(--legal-surface, #fff); color: var(--legal-text, #1e293b); font-size: .82rem; font-weight: 650; line-height: 1.35; }
.legal-button-primary { background: var(--color-primary-900, #086783); color: white; border-color: var(--color-primary-900, #086783); }
.legal-button-danger { color: #b91c1c; border-color: #fecaca; background: #fef2f2; }
.legal-button:disabled { opacity: .55; cursor: not-allowed; }
.legal-button:hover:not(:disabled) { filter: brightness(.97); }
.legal-button:focus-visible,.legal-link:focus-visible,.legal-icon-button:focus-visible { outline: 3px solid var(--color-primary-700, #1497bd); outline-offset: 3px; }
.legal-button-primary .v-icon { color: inherit; }
.legal-link { color: var(--color-primary-900, #086783); text-decoration: underline; font-weight: 650; margin-left: auto; }
.legal-empty { display: grid; justify-items: center; gap: .65rem; padding: 1.5rem; color: var(--legal-muted); text-align: center; }
.legal-empty p { margin: 0; }
.legal-version-list { list-style: none; padding: 0; margin: 0; }
.legal-version-list li { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; border-top: 1px solid var(--legal-border); padding: 1rem 0; }
.legal-version-list li:last-child { padding-bottom: 0; }
.legal-version-list li>div { min-width: 0; }
.legal-version-list strong { margin-right: .5rem; font-size: .9rem; }
.legal-version-list p { color: var(--legal-muted); margin: .4rem 0; font-size: .8rem; }
.legal-hash { display: block; word-break: break-all; white-space: normal; padding: .4rem .6rem; margin: .5rem 0; background: var(--legal-muted-surface, #f8fafc); color: var(--legal-muted, #64748b); font-size: .7rem; border-radius: 6px; }
.legal-dialog { --legal-surface: #fff; --legal-muted-surface: #f8fafc; --legal-text: #1e293b; --legal-muted: #64748b; --legal-border: #dbe3ec; display: flex; flex-direction: column; max-height: 90vh; }
.legal-dialog>.legal-panel-header { padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid var(--legal-border); flex-shrink: 0; }
.legal-dialog-body { padding: 1.25rem 1.5rem; overflow-y: auto; min-height: 0; }
.legal-dialog-body p { line-height: 1.65; }
.legal-dialog-actions { justify-content: flex-end; padding: 1rem 1.5rem; border-top: 1px solid var(--legal-border); flex-shrink: 0; }
.legal-icon-button { display: inline-flex; padding: .35rem; border-radius: 6px; }
.legal-rendered-document { overflow-wrap: anywhere; background: #fff; color: #1e293b; padding: 1.25rem; border: 1px solid #dbe3ec; border-radius: 10px; overflow-x: auto; margin-top: 1rem; }
.legal-rendered-document ::v-deep table { max-width: 100%; }
.legal-rendered-document ::v-deep img { max-width: 100%; height: auto; }
.legal-html-editor ::v-deep textarea { font-family: ui-monospace, Consolas, monospace; font-size: .85rem; line-height: 1.65; }
html[data-theme="clinical-night"] .legal-page,html[data-theme="clinical-night"] .legal-dialog { --legal-surface: #1e293b; --legal-muted-surface: #172333; --legal-text: #e2e8f0; --legal-muted: #cbd5e1; --legal-border: #3b4d63; }
html[data-theme="clinical-night"] .legal-eyebrow,html[data-theme="clinical-night"] .legal-link { color: #bae6fd; }
html[data-theme="clinical-night"] .legal-button-primary ::v-deep .v-icon { color: #fff; }
html[data-theme="clinical-night"] .legal-page ::v-deep .v-label,html[data-theme="clinical-night"] .legal-page ::v-deep .v-input,html[data-theme="clinical-night"] .legal-page ::v-deep .v-icon { color: var(--legal-muted); }
html[data-theme="clinical-night"] .legal-page ::v-deep fieldset { border-color: var(--legal-border); }
html[data-theme="clinical-night"] .legal-page ::v-deep input,html[data-theme="clinical-night"] .legal-page ::v-deep textarea { color: var(--legal-text); background: transparent; }
@media(max-width: 1100px) { .legal-workspace { grid-template-columns: 1fr; } }
@media(max-width: 600px) { .legal-intro { flex-direction: column; }.legal-intro h1 { font-size: 1.4rem; }.legal-panel { padding: 1rem; }.legal-panel-header { align-items: flex-start; flex-wrap: wrap; }.legal-editor-actions,.legal-dialog-actions { flex-direction: column; align-items: stretch; }.legal-action-spacer { display: none; }.legal-editor-actions>.legal-button { width: 100%; }.legal-version-list li { flex-direction: column; }.legal-version-list .legal-button { width: 100%; }.legal-dialog>.legal-panel-header,.legal-dialog-body,.legal-dialog-actions { padding: 1rem; }.legal-dialog>.legal-panel-header { flex-wrap: nowrap; }.legal-rendered-document { padding: .75rem; }.legal-publication-summary .legal-link { margin-left: 0; } }
</style>
