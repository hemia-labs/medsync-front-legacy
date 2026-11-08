<template>
  <aside v-if="visible" class="trial-notice" aria-label="Periodo de prueba">
    <div>
      <strong>{{ days > 0 ? 'Te queda' + (days === 1 ? ' 1 día' : 'n ' + days + ' días') + ' de prueba' : 'Tu periodo de prueba terminó' }}</strong>
      <p>{{ days > 0 ? 'Prueba sin tarjeta. Puedes consultar los planes en cualquier momento.' : 'Tus datos se conservan. Consulta los planes para conocer las opciones disponibles.' }}</p>
    </div>
    <button v-if="canChoose" type="button" class="trial-button" @click="showPlans = true">Elegir plan</button>
    <plan-catalog-dialog v-model="showPlans" />
  </aside>
</template>
<script>
import PlanCatalogDialog from './PlanCatalogDialog.vue';
export default {
  components: { PlanCatalogDialog },
  data: () => ({ now: Date.now(), observedAt: Date.now(), timer: null, showPlans: false }),
  computed: {
    business() { return this.$store.getters['CORE/AUTH/getBusiness'] || {}; },
    role() { return this.$store.getters['CORE/AUTH/getRole']; },
    visible() { return this.role !== 'super_admin' && (this.business.subscriptionStatus || this.business.subscription_status) === 'trial' && Number.isFinite(Date.parse(this.business.trialEndsAt || this.business.trial_ends_at)); },
    canChoose() { return ['admin', 'business_admin'].includes(this.role); },
    days() {
      const end = Date.parse(this.business.trialEndsAt || this.business.trial_ends_at);
      const server = Date.parse(this.business.serverNow);
      const now = Number.isFinite(server) ? server + Math.max(0, this.now - this.observedAt) : this.now;
      return Math.max(0, Math.ceil((end - now) / 86400000));
    }
  },
  watch: {
    business: { immediate: true, handler() { this.observedAt = Date.now(); this.now = Date.now(); this.showPlans = false; } }
  },
  mounted() { this.timer = setInterval(() => { this.now = Date.now(); }, 60000); },
  beforeDestroy() { clearInterval(this.timer); }
};
</script>
<style scoped>
.trial-notice{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:16px 24px;padding:16px 20px;border:1px solid var(--auth-border,#bddbd0);border-radius:12px;background:var(--color-surface,#edf8f4);color:var(--color-primary-900,#173f37)}.trial-notice strong{font-size:16px}.trial-notice p{font-size:14px;line-height:1.5;margin:6px 0 0}.trial-button{flex-shrink:0;min-height:44px;padding:10px 18px;border-radius:10px;background:var(--color-primary-700,#176b61);color:white;font-weight:600}.trial-button:focus-visible{outline:3px solid var(--auth-focus,#08799a);outline-offset:3px}@media(max-width:600px){.trial-notice{margin:12px;flex-direction:column;align-items:stretch;padding:16px}.trial-button{width:100%}}
</style>
