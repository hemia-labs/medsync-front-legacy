<template>
  <section class="tenant-restricted-page" aria-labelledby="restricted-title" :aria-busy="refreshing ? 'true' : 'false'">
    <div class="tenant-restricted-panel">
      <header class="restricted-identity">
        <div class="restricted-clinic">
          <span class="clinic-icon" aria-hidden="true"><v-icon size="28">mdi-hospital-building</v-icon></span>
          <div><p>Tu consultorio en MedSync</p><strong>{{ businessName }}</strong></div>
        </div>
        <div class="restricted-status"><span class="restricted-badge"><v-icon size="18" aria-hidden="true">mdi-alert-circle-outline</v-icon>{{ statusLabel }}</span><v-btn class="restricted-refresh" icon aria-label="Actualizar estado" title="Actualizar estado" :loading="refreshing" :disabled="refreshing" @click="refreshStatus"><v-icon size="24" aria-hidden="true">mdi-refresh</v-icon></v-btn></div>
      </header>

      <div class="restricted-hero">
        <div class="restricted-copy">
          <p class="restricted-eyebrow">Acceso al consultorio</p>
          <h1 id="restricted-title">{{ title }}</h1>
          <p class="restricted-description">{{ message }}</p>
          <p v-if="!canManageBilling" class="restricted-next-step">{{ nextStep }}</p>
          <div class="restricted-actions">
            <v-btn v-if="canChoosePlan" class="restricted-primary" depressed :to="{ name: 'accountPlans' }">Elegir un plan<v-icon right size="18" aria-hidden="true">mdi-arrow-right</v-icon></v-btn>
            <v-btn v-else-if="canManageBilling" class="restricted-primary" depressed :to="{ name: 'admin', query: { section: 'plan-billing' } }">Ver plan y facturación<v-icon right size="18" aria-hidden="true">mdi-arrow-right</v-icon></v-btn>
            <v-btn :class="canManageBilling ? 'restricted-secondary' : 'restricted-primary'" :outlined="canManageBilling" :depressed="!canManageBilling" @click="goToPatientSearch"><v-icon left size="19" aria-hidden="true">mdi-account-search-outline</v-icon>Consultar expedientes</v-btn>
          </div>
        </div>

        <div class="restricted-visual" aria-hidden="true">
          <svg viewBox="0 0 360 310" fill="none" focusable="false">
            <circle cx="181" cy="151" r="130" class="visual-orbit" />
            <circle cx="303" cy="64" r="10" class="visual-dot" />
            <circle cx="52" cy="243" r="6" class="visual-dot" />
            <rect x="90" y="43" width="170" height="216" rx="15" class="visual-back" transform="rotate(8 90 43)" />
            <rect x="83" y="36" width="176" height="218" rx="15" class="visual-paper" />
            <rect x="103" y="58" width="44" height="44" rx="13" class="visual-icon-bg" />
            <path d="M125 69v22m-11-11h22" class="visual-cross" stroke-width="4" stroke-linecap="round" />
            <path d="M164 69h71m-71 16h49" class="visual-line" stroke-width="7" stroke-linecap="round" />
            <path d="M106 129h127m-127 24h98m-98 24h127m-127 24h70" class="visual-line" stroke-width="7" stroke-linecap="round" />
            <circle cx="255" cy="229" r="49" class="visual-badge" />
            <rect x="237" y="225" width="36" height="29" rx="6" class="visual-lock" stroke-width="3" />
            <path d="M244 225v-9a11 11 0 0 1 22 0v9m-11 12v6" class="visual-lock" stroke-width="3" stroke-linecap="round" />
          </svg>
          <span class="visual-caption"><v-icon size="17">mdi-file-document-outline</v-icon>Consulta de expedientes disponible</span>
        </div>
      </div>

      <section class="restricted-access" aria-labelledby="restricted-access-title">
        <h2 id="restricted-access-title">Qué puedes hacer ahora</h2>
        <div class="restricted-access-grid">
          <div class="access-item">
            <span class="access-icon access-icon--available" aria-hidden="true"><v-icon size="28">mdi-file-search-outline</v-icon></span>
            <div><h3>Consultar expedientes existentes</h3><p>Modo lectura, según los permisos de tu cuenta.</p></div>
          </div>
          <div class="access-item">
            <span class="access-icon access-icon--paused" aria-hidden="true"><v-icon size="28">mdi-lock-outline</v-icon></span>
            <div><h3>Creación y edición en pausa</h3><p>Registrar pacientes o editar requiere un plan activo.</p></div>
          </div>
        </div>
      </section>

      <p v-if="loadError" class="restricted-error" role="alert"><v-icon size="18" aria-hidden="true">mdi-alert-circle-outline</v-icon>{{ loadError }}</p>
    </div>
  </section>
</template>

<script>
import { canManageCheckout } from '../../domain/billing/checkout';
import { mapGetters } from 'vuex';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import DABusinessService from '../../services/core/business/DABusinessService';
import { isD2AuthMode } from '../../services/config/authTransport.config';

const REASON_MESSAGES = {
  TRIAL_EXPIRED: 'La prueba del consultorio ha finalizado. Para volver a utilizar las funciones de tu plan, revisa las opciones disponibles.',
  SUBSCRIPTION_PAST_DUE: 'Tu suscripción necesita una revisión antes de continuar con las actividades del consultorio.',
  TENANT_SUSPENDED: 'El acceso operativo está suspendido temporalmente. El administrador del consultorio puede solicitar una revisión del estado de la cuenta.',
  TENANT_CANCELLED: 'Tu suscripción finalizó. Tus expedientes siguen disponibles en modo lectura.',
  TENANT_INACTIVE: 'El consultorio no tiene acceso operativo activo. Puedes consultar la información disponible mientras se revisa su estado.',
  TENANT_STATUS_INVALID: 'No pudimos confirmar un estado operativo válido. El administrador del consultorio puede solicitar una revisión.'
};

export default {
  name: 'TenantRestricted',
  data() {
    return {
      business: null,
      refreshedTenantOperational: null,
      loadError: '',
      refreshing: false
    };
  },
  computed: {
    ...mapGetters(moduleTypes.AUTH, {
      runtimeTenantOperational: fnTypes.getTenantOperational,
      runtimeBusiness: fnTypes.getBusiness
    }),
    canManageBilling() { return canManageCheckout(this.$store.getters['CORE/AUTH/getRole']); },
    canChoosePlan() { return this.canManageBilling && this.reasonCode === 'TRIAL_EXPIRED'; },
    tenantOperational() {
      if(isD2AuthMode()) {
        return this.refreshedTenantOperational || this.runtimeTenantOperational || null;
      }

      return this.$session ? this.$session.get('tenantOperational') : null;
    },
    reasonCode() {
      return this.tenantOperational && this.tenantOperational.reasonCode ? this.tenantOperational.reasonCode : '';
    },
    title() {
      const titles = {
        TRIAL_EXPIRED: 'Tu periodo de prueba ha terminado',
        SUBSCRIPTION_PAST_DUE: 'Revisa el estado de tu suscripción',
        TENANT_SUSPENDED: 'El acceso a tu consultorio está suspendido',
        TENANT_CANCELLED: 'Tu consultorio está en modo consulta',
        TENANT_INACTIVE: 'El acceso a tu consultorio está pausado'
      };
      return titles[this.reasonCode] || 'El acceso a tu consultorio está limitado';
    },
    message() {
      return REASON_MESSAGES[this.reasonCode] || 'La creación y edición de información no están disponibles mientras se revisa el acceso del consultorio.';
    },
    nextStep() {
      return this.canManageBilling
        ? 'Revisa tu plan y las opciones disponibles para tu consultorio.'
        : 'Contacta al administrador de tu consultorio para revisar el acceso.';
    },
    businessName() {
      const business = this.business
        || (isD2AuthMode() ? this.runtimeBusiness : (this.$session ? this.$session.get('business') : null))
        || {};
      return business.name || business.legalName || 'Consultorio';
    },
    statusLabel() {
      const status = (this.tenantOperational && (this.tenantOperational.tenantStatus || this.tenantOperational.status))
        || (this.business && this.business.subscriptionStatus)
        || '';
      const labels = {
        trial: this.reasonCode === 'TRIAL_EXPIRED' ? 'Prueba finalizada' : 'Prueba',
        past_due: 'Suscripción por revisar',
        suspended: 'Suspendido',
        cancelled: 'Acceso cancelado',
        inactive: 'Inactivo'
      };
      return labels[status] || 'Restringido';
    }
  },
  created() {
    this.refreshStatus();
  },
  methods: {
    goToPatientSearch: function() {
      this.$router.push('/px/all').catch(() => {});
    },
    refreshStatus: async function() {
      if(this.refreshing) return;
      this.refreshing = true; this.loadError = '';
      let response = null;

      try {
        response = await DABusinessService.getCurrent();
      } catch (error) {
        response = error && error.response ? error.response.data : null;
      } finally {
        this.refreshing = false;
      }
      if(this._isDestroyed) return;

      if(response && response.status === 200 && response.data) {
        this.business = response.data;
        this.refreshedTenantOperational = response.data.tenantOperational || null;
        if(!isD2AuthMode() && response.data.tenantOperational && this.$session) {
          this.$session.set('tenantOperational', response.data.tenantOperational);
        }
        return;
      }

      this.loadError = response && response.message
        ? response.message
        : 'No fue posible actualizar el estado del consultorio.';
    }
  }
};
</script>

<style scoped>
.tenant-restricted-page {
  --restricted-ink:var(--color-primary-900,#12294a);
  --restricted-accent:var(--color-primary-700,#1c7fa7);
  --restricted-muted:var(--color-grey,#4e5b70);
  --restricted-border:var(--color-forty-500,#dce3ec);
  --restricted-soft:var(--color-primary-100,#e6f0f8);
  --restricted-canvas:#fff;
  --restricted-background:#f3f8fb;
  --restricted-neutral:var(--color-gray98,#f3f6f9);
  --restricted-on-accent:#fff;
  --restricted-danger:var(--color-secondary-700,#a32f3b);
  --restricted-shadow:0 3px 12px rgba(18,41,74,.04);
  color:var(--restricted-ink);
  background:var(--restricted-background);
  width:100%;
  min-height:calc(100vh - 4rem);
  min-height:calc(100dvh - 4rem);
  padding:clamp(16px,2.2vw,32px);
}
.tenant-restricted-panel { width:100%; max-width:1360px; margin:0 auto; display:flex; flex-direction:column; gap:24px; }
.restricted-identity,.restricted-hero,.access-item { border:1px solid var(--restricted-border); border-radius:16px; background:var(--restricted-canvas); box-shadow:var(--restricted-shadow); }
.restricted-identity,.restricted-clinic { display:flex; align-items:center; gap:16px; min-width:0; }
.restricted-identity { justify-content:space-between; flex-wrap:wrap; padding:20px 24px; }
.restricted-clinic { flex:1; }
.restricted-clinic > div { min-width:0; }
.clinic-icon { width:52px; height:52px; border-radius:14px; display:grid; place-items:center; flex-shrink:0; background:var(--restricted-soft); color:var(--restricted-accent); }
.clinic-icon .v-icon { color:inherit; }
.restricted-clinic p { margin:0 0 4px; color:var(--restricted-muted); font-size:14px; line-height:1.5; }
.restricted-clinic strong { display:block; font-size:20px; font-weight:600; line-height:1.4; overflow-wrap:anywhere; }
.restricted-badge { display:inline-flex; align-items:center; gap:8px; max-width:100%; border-radius:999px; padding:8px 13px; color:var(--restricted-muted); background:var(--restricted-soft); font-size:13px; font-weight:600; line-height:1.5; }
.restricted-badge .v-icon { color:inherit; flex-shrink:0; }
.restricted-hero { display:grid; grid-template-columns:minmax(0,1.65fr) minmax(0,.85fr); gap:24px; align-items:center; padding:32px; }
.restricted-eyebrow { margin:0 0 18px; color:var(--restricted-accent); font-size:16px; line-height:1.5; font-weight:600; }
.restricted-copy h1 { margin:0; max-width:680px; font-size:clamp(30px,3.2vw,46px); font-weight:700; line-height:1.2; letter-spacing:-.035em; overflow-wrap:anywhere; }
.restricted-description { margin:18px 0 0; max-width:680px; color:var(--restricted-muted); font-size:16px; line-height:1.65; }
.restricted-next-step { margin:12px 0 0; max-width:680px; color:var(--restricted-muted); font-size:14px; line-height:1.65; }
.restricted-actions { display:flex; align-items:stretch; flex-wrap:wrap; gap:14px; margin-top:28px; }
.restricted-actions .v-btn { min-height:50px; height:auto; margin:0; padding:13px 20px; border-radius:11px; font-size:14px; font-weight:600; letter-spacing:0; text-transform:none; white-space:normal; }
.restricted-actions .v-btn ::v-deep .v-btn__content { min-width:0; white-space:normal; }
.restricted-actions .v-icon { color:inherit; }
.restricted-primary { background:var(--restricted-accent)!important; color:var(--restricted-on-accent)!important; box-shadow:none!important; }
.restricted-secondary { border-color:var(--restricted-border)!important; color:var(--restricted-ink)!important; background:var(--restricted-canvas)!important; }
.restricted-visual { min-width:0; display:flex; flex-direction:column; align-items:center; color:var(--restricted-accent); }
.restricted-visual svg { display:block; width:100%; max-width:300px; height:auto; }
.visual-orbit { fill:var(--restricted-soft); }
.visual-dot { fill:var(--restricted-accent); opacity:.3; }
.visual-back { fill:var(--restricted-border); }
.visual-paper { fill:var(--restricted-canvas); stroke:var(--restricted-border); stroke-width:1.5; }
.visual-icon-bg { fill:var(--restricted-soft); }
.visual-cross { stroke:var(--restricted-accent); }
.visual-line { stroke:var(--restricted-border); }
.visual-badge { fill:var(--restricted-soft); stroke:var(--restricted-canvas); stroke-width:7; }
.visual-lock { stroke:var(--restricted-accent); }
.visual-caption { display:inline-flex; align-items:center; justify-content:center; gap:8px; margin-top:12px; color:var(--restricted-muted); font-size:13px; line-height:1.6; text-align:center; }
.visual-caption .v-icon { color:inherit; }
.restricted-access h2 { margin:0 0 18px; font-size:24px; line-height:1.4; font-weight:600; letter-spacing:-.025em; }
.restricted-access-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; }
.access-item { display:flex; align-items:center; gap:18px; min-width:0; padding:24px; }
.access-icon { width:56px; height:56px; display:grid; place-items:center; flex-shrink:0; border-radius:15px; }
.access-icon .v-icon { color:inherit; }
.access-icon--available { color:var(--restricted-accent); background:var(--restricted-soft); }
.access-icon--paused { color:var(--restricted-muted); background:var(--restricted-neutral); }
.access-item h3 { margin:0; color:var(--restricted-ink); font-size:16px; line-height:1.5; font-weight:600; }
.access-item p { margin:6px 0 0; color:var(--restricted-muted); font-size:14px; line-height:1.6; }
.restricted-status { display:flex; align-items:center; gap:14px; }
.restricted-refresh.v-btn { width:40px; min-width:40px; height:40px; margin:0; color:var(--restricted-accent); }
.tenant-restricted-page .v-btn:focus-visible { outline:3px solid var(--restricted-accent); outline-offset:3px; }
.restricted-error { display:flex; align-items:flex-start; gap:8px; color:var(--restricted-danger); background:rgba(var(--color-secondary-500-rgb,214,69,69),.08); padding:12px 14px; margin:0; border-radius:8px; font-size:13px; line-height:1.7; }
.restricted-error .v-icon { color:inherit; margin-top:1px; flex-shrink:0; }
html[data-theme="clinical-night"] .tenant-restricted-page { --restricted-ink:#e2e8f0; --restricted-muted:#b4c0d0; --restricted-border:#344253; --restricted-accent:color-mix(in srgb,var(--color-primary-700,#1c7fa7) 55%,#fff); --restricted-soft:color-mix(in srgb,var(--color-primary-700,#1c7fa7) 18%,#142334); --restricted-canvas:#142334; --restricted-background:#0f1b29; --restricted-neutral:#1d2b3d; --restricted-on-accent:#142334; --restricted-danger:color-mix(in srgb,var(--color-secondary-700,#a32f3b) 55%,#fff); --restricted-shadow:0 3px 12px rgba(0,0,0,.12); }
@media(max-width:1100px) {
  .restricted-hero { grid-template-columns:minmax(0,1.5fr) minmax(0,1fr); padding:24px; }
  .restricted-actions { gap:10px; }
  .restricted-actions .v-btn { padding:12px 16px; }
  .access-item { padding:20px; gap:14px; }
}
@media(max-width:700px) {
  .tenant-restricted-panel { gap:18px; }
  .restricted-identity { align-items:flex-start; padding:16px; gap:14px; }
  .restricted-clinic { flex:auto; width:100%; gap:12px; }
  .clinic-icon { width:44px; height:44px; border-radius:12px; }
  .restricted-clinic p { font-size:12px; }
  .restricted-clinic strong { font-size:16px; }
  .restricted-status { width:100%; justify-content:space-between; }
  .restricted-badge { padding:6px 11px; font-size:12px; }
  .restricted-refresh.v-btn { width:34px; min-width:34px; height:34px; }
  .restricted-hero { grid-template-columns:minmax(0,1fr); padding:22px; gap:0; }
  .restricted-eyebrow { margin-bottom:12px; font-size:14px; }
  .restricted-copy h1 { font-size:28px; }
  .restricted-description { margin-top:14px; font-size:14px; }
  .restricted-next-step { font-size:13px; }
  .restricted-actions { margin-top:22px; gap:10px; }
  .restricted-actions .v-btn { width:100%; min-height:46px; font-size:13px; }
  .restricted-visual { display:none; }
  .restricted-access h2 { font-size:21px; margin-bottom:14px; }
  .restricted-access-grid { grid-template-columns:minmax(0,1fr); gap:12px; }
  .access-item { padding:18px; gap:14px; align-items:flex-start; }
  .access-icon { width:44px; height:44px; border-radius:12px; }
  .access-item h3 { font-size:14px; }
  .access-item p { margin-top:4px; font-size:13px; }
}
@media(max-height:760px) and (min-width:701px) {
  .tenant-restricted-page { padding:20px; }
  .tenant-restricted-panel { gap:18px; }
  .restricted-identity { padding:14px 20px; }
  .clinic-icon { width:46px; height:46px; }
  .restricted-hero { padding:22px; }
  .restricted-eyebrow { margin-bottom:12px; font-size:14px; }
  .restricted-copy h1 { font-size:clamp(30px,2.8vw,38px); }
  .restricted-description { margin-top:14px; font-size:14px; }
  .restricted-actions { margin-top:20px; }
  .restricted-actions .v-btn { min-height:46px; font-size:13px; }
  .restricted-visual svg { max-width:220px; }
  .restricted-access h2 { font-size:21px; margin-bottom:14px; }
  .access-item { padding:18px; }
  .access-icon { width:46px; height:46px; }
  .access-item h3 { font-size:14px; }
  .access-item p { font-size:13px; }
}
@media(max-height:500px) and (min-width:701px) {
  .restricted-visual { display:none; }
  .restricted-hero { grid-template-columns:minmax(0,1fr); }
  .restricted-copy h1 { font-size:28px; }
}
@media(prefers-reduced-motion:reduce) { .tenant-restricted-page .v-btn { transition:none; } }
</style>
