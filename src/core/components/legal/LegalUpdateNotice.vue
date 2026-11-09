<template>
  <aside v-if="sessionEligible && (pendingCount > 0 || error || syncPending)" class="legal-update-notice" aria-labelledby="legal-update-notice-title">
    <span class="legal-update-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6M12 12v3M12 18h.01" />
      </svg>
    </span>
    <div class="legal-update-copy">
      <h2 id="legal-update-notice-title">{{ pendingCount > 0 ? 'Revisión legal pendiente' : syncPending && !error ? 'Confirmaciones en sincronización' : 'No pudimos revisar las actualizaciones legales' }}</h2>
      <p v-if="pendingCount > 0" role="status"><strong>{{ pendingCount }} {{ pendingCount === 1 ? 'documento por revisar' : 'documentos por revisar' }}.</strong> Puedes continuar trabajando.</p>
      <details v-if="pendingCount > 0"><summary>Sobre la aceptación</summary><p>Revisa los documentos en Cuenta y legal antes de aceptarlos.</p><p v-if="businessPending">La aceptación por el consultorio corresponde a una persona administradora. Las aceptaciones personales las realiza cada usuario.</p></details>
      <p v-if="syncPending" role="status">Tus confirmaciones están guardadas y pendientes de sincronizar. No necesitas aceptarlas otra vez.</p>
      <p v-if="error" role="alert">{{ error }}</p>
    </div>
    <div class="legal-update-actions">
      <router-link class="legal-update-primary" to="/admin?section=account-legal">
        Revisar documentos <span aria-hidden="true">→</span>
      </router-link>
      <button v-if="error" type="button" class="legal-update-retry" :disabled="loading" @click="load(true)">{{ loading ? 'Consultando…' : 'Reintentar consulta' }}</button>
    </div>
  </aside>
</template>

<script>
import SaaSLegalService from '@/services/saasLegal.service';
import { authorizationContext, authorizationFingerprint, isCurrentAuthorization } from '../../../security/authorizationContext';

const CHECK_INTERVAL = 45000;
export default {
  name: 'LegalUpdateNotice',
  data: () => ({ pendingCount: null, businessPending: false, syncPending: false, loading: false, error: '', lastCheckedAt: 0, request: 0, disposed: false, queuedRefresh: false }),
  computed: {
    authState() { return this.$store && this.$store.state && this.$store.state.CORE && this.$store.state.CORE.AUTH || {}; },
    sessionEligible() { const auth = this.authState; return Boolean(auth.authenticated && (auth.user || {}).id_login && ((auth.business || {}).id_business || (auth.user || {}).id_business) && String(auth.role || '').toLowerCase() !== 'super_admin'); },
    sessionKey() { return authorizationFingerprint(this.authState) + ':' + (this.authState.accessRevision || 0) + ':' + String(this.authState.token || ''); }
  },
  watch: {
    sessionKey: { immediate: true, handler() { this.request++; this.pendingCount = null; this.businessPending = false; this.syncPending = false; this.loading = false; this.error = ''; this.lastCheckedAt = 0; this.queuedRefresh = false; if(this.sessionEligible) this.load(true); } },
    '$route.fullPath'() { this.load(); }
  },
  mounted() { window.addEventListener('focus', this.onVisible); document.addEventListener('visibilitychange', this.onVisible); window.addEventListener('saas-legal-accepted', this.onAccepted); },
  beforeDestroy() { this.disposed = true; this.request++; window.removeEventListener('focus', this.onVisible); document.removeEventListener('visibilitychange', this.onVisible); window.removeEventListener('saas-legal-accepted', this.onAccepted); },
  methods: {
    onVisible() { if(document.visibilityState !== 'hidden') this.load(); },
    onAccepted() { this.load(true); },
    async load(force = false) {
      if(!this.sessionEligible || this.disposed) return false;
      if(this.loading) { if(force) this.queuedRefresh = true; return false; }
      if(!force && this.lastCheckedAt && Date.now() - this.lastCheckedAt < CHECK_INTERVAL) return false;
      const authorization = authorizationContext(this.$store), key = this.sessionKey, request = ++this.request;
      const current = () => !this.disposed && request === this.request && key === this.sessionKey && this.sessionEligible && isCurrentAuthorization(authorization, this.$store);
      this.loading = true; this.error = ''; this.lastCheckedAt = Date.now();
      try {
        const response = await SaaSLegalService.current();
        if(this.disposed || request !== this.request) return false;
        if(!current()) { this.pendingCount = null; this.businessPending = false; this.error = 'La sesión o tus accesos cambiaron. Reintenta para comprobar los documentos actuales.'; return false; }
        if(!response || !response.success || !response.data || !Array.isArray(response.data.documents) || !Number.isInteger(response.data.pending_count) || response.data.pending_count < 0) throw new Error();
        this.syncPending = response.data.central_sync_pending === true;
        this.error = response.data.pending_unknown ? 'No pudimos consultar Legal central. Reintenta para comprobar sus documentos pendientes.' : '';
        this.pendingCount = response.data.pending_count; this.businessPending = response.data.documents.some(item => item.pending && item.acceptance_scope === 'business'); return true;
      } catch(_) { if(current()) this.error = 'Actualiza la consulta para comprobar qué versiones están pendientes. No se registró ninguna aceptación desde este aviso.'; return false; }
      finally {
        if(!this.disposed && request === this.request) {
          this.loading = false;
          if(this.queuedRefresh && current()) { this.queuedRefresh = false; this.load(true); }
        }
      }
    }
  }
};
</script>

<style scoped>
.legal-update-notice {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  margin: 20px 24px 22px;
  padding: 18px 20px;
  border: 1px solid #f3d08b;
  border-left: 5px solid #d97706;
  border-radius: 14px;
  background: #fffbeb;
  color: #78350f;
  box-shadow: 0 3px 12px rgba(120, 53, 15, .06);
}
.legal-update-icon { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; background: #fef3c7; color: #92400e; }
.legal-update-icon svg { width: 25px; height: 25px; }
.legal-update-copy { min-width: 0; }.legal-update-copy summary{font-size:13px;cursor:pointer;min-height:32px;padding-top:6px}.legal-update-copy summary:focus-visible{outline:3px solid #b45309;outline-offset:3px}
.legal-update-copy h2 { font-size: 16px; font-weight: 750; line-height: 1.4; margin: 0 0 5px; color: inherit; }
.legal-update-copy p { font-size: 14px; line-height: 1.55; margin: 5px 0 0; color: inherit; }
.legal-update-actions { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.legal-update-primary { display: inline-flex; align-items: center; justify-content: center; gap: 12px; min-height: 44px; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 750; background: #92400e; color: #fff; text-decoration: none; text-align: center; white-space: normal; }
.legal-update-primary:hover { background: #78350f; }
.legal-update-retry { font-weight: 700; text-decoration: underline; color: inherit; }
.legal-update-retry:disabled { opacity: .5; cursor: not-allowed; }
.legal-update-notice a:focus-visible, .legal-update-notice button:focus-visible { outline: 3px solid #b45309; outline-offset: 3px; }
@media (max-width: 900px) {
  .legal-update-notice { grid-template-columns: auto minmax(0, 1fr); align-items: start; }
  .legal-update-actions { grid-column: 2; align-items: flex-start; }
}
@media (max-width: 600px) {
  .legal-update-notice { gap: 8px; margin: 10px 12px; padding: 10px 12px; }
  .legal-update-icon { width: 36px; height: 36px; border-radius: 10px; }
  .legal-update-icon svg { width: 22px; height: 22px; }
  .legal-update-actions { grid-column: 1 / -1; align-items: stretch; }
  .legal-update-primary { width: 100%; }
}
html[data-theme="clinical-night"] .legal-update-notice { background: #302617; color: #fde8bb; border-color: #735325; border-left-color: #fbbf24; }
html[data-theme="clinical-night"] .legal-update-icon { background: #49341b; color: #fcd34d; }
html[data-theme="clinical-night"] .legal-update-primary { background: #fcd34d; color: #422006; }
html[data-theme="clinical-night"] .legal-update-primary:hover { background: #fde68a; }
html[data-theme="clinical-night"] .legal-update-notice a:focus-visible, html[data-theme="clinical-night"] .legal-update-notice button:focus-visible { outline-color: #fbbf24; }
</style>
