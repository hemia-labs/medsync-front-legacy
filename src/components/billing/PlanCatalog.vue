<template>
  <section class="plan-catalog" :aria-labelledby="titleId" :aria-busy="loading ? 'true' : 'false'">
    <h2 :id="titleId">{{ compact ? 'Planes para después de tu prueba' : 'Planes de MedSync' }}</h2>
    <p>Prueba Profesional durante 15 días al verificar tu correo. Sin tarjeta.</p>
    <p v-if="loading" role="status">Consultando planes y precios…</p>
    <div v-else-if="error" role="status" class="catalog-error">
      <p>No pudimos consultar los planes. Puedes volver a consultarlos sin modificar tu cuenta.</p>
      <button type="button" class="catalog-link" @click="load">Volver a consultar planes</button>
    </div>
    <template v-else>
      <div class="plan-grid">
        <article v-for="plan in plans" :key="plan.code" class="plan-card">
          <h3>{{ plan.name }}</h3>
          <div v-for="price in plan.prices" :key="price.code" class="plan-price">
            <strong>{{ money(price.amount) }}</strong> <span>{{ price.currency }}</span>
            <p>{{ period(price) }} · IVA incluido</p>
          </div>
          <ul>
            <li v-for="benefit in benefits(plan)" :key="benefit">{{ benefit }}</li>
          </ul>
        </article>
      </div>
      <p class="catalog-note">El registro no realiza cobros. Los pagos todavía no están habilitados; podrás consultar los planes sin modificar tu prueba.</p>
      <button v-if="compact" type="button" class="catalog-link" @click="expanded = true">Comparar todos los beneficios</button>
    </template>
  </section>
</template>
<script>
import Registration from '../../services/core/auth/DARegistrationService';
const labels = {
  'patients.unlimited_reasonable_use': 'Pacientes ilimitados con uso razonable',
  'clinical_record.enabled': 'Expediente clínico', 'clinical_history.enabled': 'Historia clínica',
  'prescriptions.enabled': 'Recetas', 'schedule.basic': 'Agenda básica',
  'schedule.advanced': 'Agenda avanzada', 'schedule.multi_professional': 'Agenda por profesional',
  'documents.basic': 'Documentos básicos', 'documents.enabled': 'Documentos',
  'consents.basic': 'Consentimientos básicos', 'consents.enabled': 'Consentimientos',
  'clinical_templates.custom': 'Plantillas clínicas personalizables',
  'clinical_templates.by_professional_or_specialty': 'Plantillas por profesional o especialidad',
  'appointments.advanced_management': 'Gestión avanzada de citas',
  'dashboard.basic': 'Dashboard básico', 'dashboard.operational': 'Dashboard operativo',
  'dashboard.admin': 'Dashboard administrativo', 'reports.basic': 'Reportes básicos',
  'reports.advanced_basic': 'Reportes avanzados básicos', 'roles_permissions.advanced': 'Roles y permisos avanzados',
  'business_admin_audit.enabled': 'Auditoría administrativa', 'support.standard': 'Soporte estándar',
  'support.priority': 'Soporte prioritario', 'onboarding.assisted': 'Acompañamiento inicial',
  'clinic_settings.basic': 'Configuración del consultorio'
};
export default {
  props: { compact: Boolean },
  data: () => ({ loading: true, error: false, plans: [], expanded: false }),
  computed: { titleId() { return 'medsync-plans-' + this._uid; } },
  created() { this.load(); },
  methods: {
    async load() {
      if (this.loading && this.pending) return;
      this.loading = true; this.pending = true; this.error = false;
      try {
        const result = await Registration.publicPlans();
        if (this._isDestroyed) return;
        if (!result.available || result.taxBehavior !== 'inclusive' || !Array.isArray(result.offers) || !result.offers.length) throw new Error();
        this.plans = result.offers;
      } catch (_) { if (!this._isDestroyed) this.error = true; }
      finally { if (!this._isDestroyed) { this.loading = false; this.pending = false; } }
    },
    money(amount) {
      const [whole, cents] = String(amount).split('.');
      return '$' + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (cents === '00' ? '' : '.' + cents);
    },
    period(price) {
      const unit = price.billingInterval === 'year' ? ['año', 'años'] : ['mes', 'meses'];
      return price.billingIntervalCount === 1 ? 'Al ' + unit[0] : 'Cada ' + price.billingIntervalCount + ' ' + unit[1];
    },
    benefits(plan) {
      const f = plan.features;
      const items = [];
      if (Number.isInteger(f['professionals.included'])) items.push(f['professionals.included'] + (f['professionals.included'] === 1 ? ' profesional' : ' profesionales'));
      if (Number.isInteger(f['users.auxiliary.included'])) items.push(f['users.auxiliary.included'] + (f['users.auxiliary.included'] === 1 ? ' usuario auxiliar' : ' usuarios auxiliares'));
      if (!this.compact || this.expanded) for (const [code, label] of Object.entries(labels)) if (f[code] === true) items.push(label);
      return items;
    }
  }
};
</script>
<style scoped>
.plan-catalog{color:var(--color-primary-900);margin:24px 0;min-width:0}.plan-catalog h2{font-size:21px;line-height:1.35;margin-bottom:10px}.plan-catalog>p{font-size:14px;line-height:1.6;margin-bottom:16px}.plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.plan-card{min-width:0;border:1px solid var(--auth-border,#c3dbd7);border-radius:12px;padding:16px;background:var(--color-surface)}.plan-card h3{font-size:18px;margin-bottom:14px;overflow-wrap:anywhere}.plan-price{margin-bottom:16px}.plan-price strong{font-size:26px;line-height:1.3;overflow-wrap:anywhere}.plan-price span,.plan-price p,.plan-card li{font-size:13px;line-height:1.6}.plan-price p{margin:6px 0 0}.plan-card ul{padding-left:18px;margin:0}.plan-card li+li{margin-top:7px}.catalog-note{margin-top:18px;color:var(--color-grey)}.catalog-link{min-height:44px;text-decoration:underline;color:var(--auth-link,#08799a);font-weight:600}.catalog-link:focus-visible{outline:3px solid var(--auth-focus,#08799a);outline-offset:3px}.catalog-error{font-size:14px;line-height:1.6}@media(max-width:600px){.plan-grid{grid-template-columns:minmax(0,1fr)}.plan-card{padding:18px}.plan-price strong{font-size:28px}}
</style>
