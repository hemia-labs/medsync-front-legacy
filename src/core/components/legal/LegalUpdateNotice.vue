<template>
  <aside v-if="sessionEligible && (pendingCount > 0 || error)" class="legal-update-notice text-gray-700" aria-labelledby="legal-update-notice-title">
    <div class="legal-update-copy">
      <h2 id="legal-update-notice-title">{{ pendingCount > 0 ? 'Hay documentos legales por revisar' : 'No pudimos revisar las actualizaciones legales' }}</h2>
      <p v-if="pendingCount > 0" role="status">{{ pendingCount }} {{ pendingCount === 1 ? 'documento requiere' : 'documentos requieren' }} una nueva aceptación. Puedes continuar con tu trabajo y revisarlos en Cuenta y legal.</p>
      <p v-if="businessPending">La aceptación por el consultorio corresponde a una persona administradora. Las aceptaciones personales las realiza cada usuario.</p>
      <p v-if="error" role="alert">{{ error }}</p>
    </div>
    <div class="legal-update-actions"><router-link class="legal-update-primary" to="/admin?section=account-legal">Abrir Cuenta y legal</router-link><button v-if="error" type="button" class="legal-update-retry" :disabled="loading" @click="load(true)">{{ loading ? 'Consultando…' : 'Reintentar consulta' }}</button></div>
  </aside>
</template>

<script>
import SaaSLegalService from '@/services/saasLegal.service';
import { authorizationContext, authorizationFingerprint, isCurrentAuthorization } from '../../../security/authorizationContext';

const CHECK_INTERVAL = 45000;
export default {
  name: 'LegalUpdateNotice',
  data: () => ({ pendingCount: null, businessPending: false, loading: false, error: '', lastCheckedAt: 0, request: 0, disposed: false, queuedRefresh: false }),
  computed: {
    authState() { return this.$store && this.$store.state && this.$store.state.CORE && this.$store.state.CORE.AUTH || {}; },
    sessionEligible() { const auth = this.authState; return Boolean(auth.authenticated && (auth.user || {}).id_login && ((auth.business || {}).id_business || (auth.user || {}).id_business) && String(auth.role || '').toLowerCase() !== 'super_admin'); },
    sessionKey() { return authorizationFingerprint(this.authState) + ':' + (this.authState.accessRevision || 0) + ':' + String(this.authState.token || ''); }
  },
  watch: {
    sessionKey: { immediate: true, handler() { this.request++; this.pendingCount = null; this.businessPending = false; this.loading = false; this.error = ''; this.lastCheckedAt = 0; this.queuedRefresh = false; if(this.sessionEligible) this.load(true); } },
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
.legal-update-notice{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:0 0 22px;padding:18px 22px;border:1px solid var(--color-primary-300,#94cbd0);border-radius:16px;background:var(--color-primary-100,#e8f5f6);color:var(--color-primary-1000,#153d4a)}.legal-update-copy{min-width:0}.legal-update-copy h2{font-size:17px;font-weight:750;line-height:1.4;margin:0 0 6px}.legal-update-copy p{font-size:14px;line-height:1.55;margin:5px 0 0}.legal-update-actions{display:flex;flex-direction:column;align-items:center;gap:12px;flex-shrink:0}.legal-update-primary{display:inline-block;padding:10px 16px;border-radius:10px;font-weight:750;background:var(--color-primary-700,#167b86);color:white;text-decoration:none;text-align:center;white-space:normal}.legal-update-retry{font-weight:700;text-decoration:underline}.legal-update-retry:disabled{opacity:.5;cursor:not-allowed}.legal-update-notice a:focus-visible,.legal-update-notice button:focus-visible{outline:3px solid var(--color-primary-500,#198b95);outline-offset:3px}@media(max-width:700px){.legal-update-notice{flex-direction:column;align-items:stretch;gap:14px;padding:16px}.legal-update-actions{align-items:stretch}.legal-update-primary{width:100%}}
html[data-theme="clinical-night"] .legal-update-notice{background:#172f41;color:#e2e8f0!important;border-color:#3b4d63}
html[data-theme="clinical-night"] .legal-update-primary{background:#0e7490;color:#fff}
html[data-theme="clinical-night"] .legal-update-retry{color:#bae6fd}
</style>
