<template>
  <section class="plan-catalog" :class="{ 'plan-catalog--embedded': embedded }" :aria-label="embedded ? 'Planes disponibles' : null" :aria-labelledby="embedded ? null : titleId" :aria-busy="loading ? 'true' : 'false'">
    <header v-if="!embedded" class="catalog-heading">
      <p class="catalog-eyebrow"><span aria-hidden="true"></span>Planes<span aria-hidden="true"></span></p>
      <h2 :id="titleId">{{ compact ? 'Planes para después de tu prueba' : 'Un plan para tu consultorio.' }}</h2>
    </header>
    <p v-if="!embedded && !catalogData">Prueba Profesional durante 15 días al verificar tu correo. Sin tarjeta.</p>
    <p v-if="loading" role="status">Consultando planes y precios…</p>
    <div v-else-if="error" role="status" class="catalog-error">
      <p>No pudimos consultar los planes. Puedes volver a consultarlos sin modificar tu cuenta.</p>
      <button type="button" class="catalog-link" @click="load">Volver a consultar planes</button>
    </div>
    <template v-else>
      <div class="plan-grid">
        <article v-for="plan in plans" :key="plan.code" class="plan-card" :class="{ 'plan-card--current': plan.code === currentPlanCode, 'plan-card--selected': plan.prices.some(price => price.code === selectedPriceCode) }">
          <div class="plan-card-heading"><h3>{{ plan.name }}</h3><span v-if="plan.code === currentPlanCode" class="plan-current-label">Tu plan actual</span></div>
          <div class="plan-prices">
            <div v-for="price in plan.prices" :key="price.code" class="plan-price">
              <strong>{{ money(price.amount) }}</strong><span>{{ price.currency }} / {{ period(price).replace('Al ', '').replace('Cada ', 'cada ') }}</span>
            </div>
            <p class="plan-tax">Impuestos incluidos</p>
          </div>
          <ul class="plan-benefits">
            <li v-for="benefit in benefits(plan)" :key="benefit">{{ benefit }}</li>
          </ul>
          <div v-if="selectable" class="plan-actions">
            <button v-for="price in plan.prices" :key="price.code" type="button" class="catalog-select" :disabled="disabled || plan.code === currentPlanCode" :aria-pressed="selectedPriceCode ? String(price.code === selectedPriceCode) : null" @click="select(plan, price)">
              <span><template v-if="plan.code === currentPlanCode">Plan actual</template><template v-else>{{ price.code === selectedPriceCode ? 'Seleccionado: ' : 'Elegir ' }}{{ plan.name }}</template><template v-if="plan.prices.length > 1 && plan.code !== currentPlanCode"> · {{ period(price).toLowerCase() }}</template></span><span v-if="plan.code !== currentPlanCode" aria-hidden="true">{{ price.code === selectedPriceCode ? '✓' : '→' }}</span>
            </button>
          </div>
        </article>
      </div>
      <p v-if="!embedded && !selectable" class="catalog-note">El registro no realiza cobros. La contratación requiere una cuenta administradora y confirmación en el proveedor de pagos.</p>
      <button v-if="compact || selectable || embedded" type="button" class="catalog-link" :aria-expanded="expanded ? 'true' : 'false'" @click="expanded = !expanded">{{ expanded ? 'Mostrar menos' : 'Ver todos los beneficios' }}</button>
    </template>
  </section>
</template>
<script>
import Registration from '../../services/core/auth/DARegistrationService';
const labels = {
  'professionals.included': 'Profesionales incluidos', 'users.auxiliary.included': 'Usuarios auxiliares incluidos',
  'businesses.included': 'Consultorios incluidos', 'branches.included': 'Sucursales incluidas',
  'patients.unlimited_reasonable_use': 'Pacientes ilimitados con uso razonable',
  'clinical_record.enabled': 'Expediente clínico', 'clinical_history.enabled': 'Historia clínica',
  'prescriptions.enabled': 'Recetas', 'schedule.basic': 'Agenda básica',
  'schedule.advanced': 'Agenda avanzada', 'schedule.multi_professional': 'Agenda por profesional',
  'documents.basic': 'Documentos básicos', 'documents.enabled': 'Documentos clínicos',
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
const summaryCodes = [
  'schedule.basic', 'schedule.advanced', 'schedule.multi_professional',
  'clinical_record.enabled', 'roles_permissions.advanced',
  'clinical_templates.custom', 'clinical_templates.by_professional_or_specialty',
  'documents.basic', 'documents.enabled', 'consents.basic', 'consents.enabled',
  'prescriptions.enabled', 'support.standard', 'support.priority'
];
export default {
  props: { compact: Boolean, catalogData: Object, selectable: Boolean, disabled: Boolean, embedded: Boolean, currentPlanCode: { type: String, default: '' }, selectedPriceCode: { type: String, default: '' } },
  data: () => ({ loading: true, error: false, plans: [], expanded: false }),
  computed: { titleId() { return 'medsync-plans-' + this._uid; } },
  created() { this.load(); },
  watch: { catalogData() { this.load(); } },
  methods: {
    select(plan, price) {
      if (this.disabled || plan.code === this.currentPlanCode) return;
      this.$emit('select', { plan, price });
    },
    featureLabel(plan, code) {
      const detail = plan && Array.isArray(plan.featureDetails) && plan.featureDetails.find(feature => feature.code === code);
      return detail && typeof detail.name === 'string' && detail.name.trim() && detail.name !== code ? detail.name : labels[code] || '';
    },
    async load() {
      if (this.loading && this.pending) return;
      this.loading = true; this.pending = true; this.error = false;
      try {
        const result = this.catalogData || await Registration.publicPlans();
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
      if (Number.isInteger(f['professionals.included'])) items.push(f['professionals.included'] + (f['professionals.included'] === 1 ? ' profesional incluido' : ' profesionales incluidos'));
      if (Number.isInteger(f['users.auxiliary.included'])) items.push(f['users.auxiliary.included'] + (f['users.auxiliary.included'] === 1 ? ' usuario auxiliar incluido' : ' usuarios auxiliares incluidos'));
      if (this.compact && !this.expanded) return items;
      const codes = this.expanded ? Object.keys(f) : summaryCodes;
      for (const code of codes) if (f[code] === true && this.featureLabel(plan, code)) items.push(this.featureLabel(plan, code));
      return items;
    }
  }
};
</script>
<style scoped>
.plan-catalog { --catalog-accent:#087e7d; --catalog-ink:#1b4146; --catalog-muted:#59727a; color:var(--catalog-ink); margin:32px 0 0; min-width:0; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:400; line-height:1.5; letter-spacing:normal; }
.catalog-heading { text-align:center; margin-bottom:38px; }
.catalog-eyebrow { display:flex; align-items:center; justify-content:center; gap:10px; margin:0 0 12px; color:var(--catalog-accent); font-size:12px; line-height:1.5; font-weight:600; letter-spacing:.08em; }
.catalog-eyebrow span { width:16px; height:1px; background:#9bccca; }
.catalog-heading h2 { margin:0; color:var(--catalog-ink); font-size:clamp(23px,2.1vw,30px); line-height:1.25; font-weight:700; letter-spacing:-.025em; }
.plan-catalog>p { font-size:14px; line-height:1.6; margin-bottom:16px; }
.plan-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr)); gap:16px; align-items:stretch; }
.plan-card { position:relative; min-width:0; min-height:480px; display:flex; flex-direction:column; padding:26px 20px 20px; border:1px solid #d9e6e7; border-radius:16px; background:#fff; box-shadow:0 5px 16px rgba(27,65,70,.025); }
.plan-card-heading { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
.plan-current-label { display:inline-flex; align-items:center; gap:6px; padding:4px 8px; border-radius:999px; color:var(--catalog-accent); background:#e4f2ef; font-size:11px; font-weight:600; line-height:1.5; }
.plan-current-label::before { content:''; width:5px; height:5px; border-radius:50%; background:currentColor; }
.plan-card--current { border-color:#83bdbb; background:#f3f9f7; }
.plan-card--selected { border-color:var(--catalog-accent); box-shadow:0 0 0 1px var(--catalog-accent); }
.plan-card--selected .catalog-select { background:var(--catalog-accent); border-color:var(--catalog-accent); color:#fff; }
.plan-card--current .catalog-select:disabled { opacity:1; background:#e4f2ef; border-color:transparent; }
.plan-card h3 { color:var(--catalog-ink); font-size:17px; line-height:1.4; font-weight:600; margin:0; overflow-wrap:anywhere; }
.plan-prices { border-bottom:1px solid #d8e5e5; margin-bottom:18px; padding-bottom:16px; }
.plan-price { display:flex; flex-wrap:wrap; align-items:baseline; gap:7px; }
.plan-price+.plan-price { margin-top:12px; }
.plan-price strong { color:var(--catalog-ink); font-size:36px; line-height:1.2; font-weight:700; letter-spacing:-.035em; overflow-wrap:anywhere; }
.plan-price>span { color:var(--catalog-muted); font-size:12px; line-height:1.6; }
.plan-tax { margin:5px 0 0; color:var(--catalog-muted); font-size:11px; line-height:1.5; }
.plan-benefits { margin:0; padding:0; list-style:none; }
.plan-benefits li { position:relative; padding-left:21px; color:var(--catalog-muted); font-size:13px; line-height:1.6; }
.plan-benefits li+li { margin-top:9px; }
.plan-benefits li::before { position:absolute; top:5px; left:4px; content:''; width:5px; height:9px; border:solid var(--catalog-accent); border-width:0 1px 1px 0; transform:rotate(45deg); }
.plan-actions { display:flex; flex-direction:column; gap:10px; margin-top:auto; padding-top:32px; }
.catalog-select { display:flex; align-items:center; justify-content:center; gap:12px; min-height:44px; width:100%; padding:10px 12px; border:1px solid #8cc7c7; border-radius:12px; background:#fff; color:var(--catalog-accent); font-size:13px; font-weight:600; line-height:1.5; }
.catalog-select>span:first-child { min-width:0; overflow-wrap:anywhere; }
.catalog-select>span:last-child:not(:first-child) { flex-shrink:0; font-size:18px; line-height:1; }
.catalog-select:hover:not(:disabled) { background:#f0f8f6; }
.plan-card--selected .catalog-select:hover:not(:disabled) { background:#066967; }
.catalog-select:disabled { opacity:.55; cursor:not-allowed; }
.catalog-link:focus-visible,.catalog-select:focus-visible { outline:3px solid var(--auth-focus,#0085ff); outline-offset:3px; }
.catalog-note { margin-top:18px; color:var(--catalog-muted); }
.catalog-error { font-size:14px; line-height:1.6; }
.catalog-link { display:block; min-height:44px; margin:22px auto 0; color:var(--catalog-accent); font-size:13px; font-weight:600; }
.catalog-link:hover { text-decoration:underline; }
@media(max-width:600px) { .catalog-heading { margin-bottom:28px; } .plan-grid { grid-template-columns:minmax(0,1fr); gap:24px; } .plan-card { min-height:420px; padding:24px 20px 20px; } }
.plan-catalog--embedded { margin:0; }
</style>
