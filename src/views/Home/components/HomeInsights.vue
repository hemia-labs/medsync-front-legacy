<template>
  <div v-if="cards.length" class="home-insights">
    <section v-for="card in cards" :key="card.key" class="insight-card" :aria-labelledby="'home-insight-' + card.key">
      <div class="insight-symbol" aria-hidden="true">
        <v-icon v-if="card.key === 'pulse'" class="insight-pulse-icon" color="currentColor">mdi-creation</v-icon>
        <svg v-else viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 12v40h42" stroke-opacity=".4" />
          <path d="M22 43V32m12 11V26m12 17V18" stroke-width="5" />
          <path d="m20 23 13-8 12-5" stroke-opacity=".7" />
        </svg>
      </div>
      <p class="insight-eyebrow">{{ card.eyebrow }}</p>
      <h2 :id="'home-insight-' + card.key">{{ card.title }}</h2>
      <p class="insight-description">{{ card.description }}</p>
      <p v-if="card.key === 'pulse' && pulseStatus" class="insight-status" :class="'insight-status-' + pulseStatus.tone" role="status">{{ pulseStatus.text }}</p>
      <router-link class="insight-link" :to="{ name: card.route }">{{ card.action }} <span aria-hidden="true">→</span></router-link>
    </section>
  </div>
</template>

<script>
import { canAccessPulse } from '../../../security/pulseAccess';
import pulseService from '../../../services/core/business/DABusinessPulseService';
import { tenantNavigationItems } from '../../../core/navigation/tenantNavigation';

const analysisPermissions = tenantNavigationItems.find(item => item.key === 'dashboard').permissionsAny;

export default {
  name: 'HomeInsights',
  data: () => ({ pulseStatus: null }),
  mounted() { this.loadPulseStatus(); },
  methods: {
    // Reuses the cached business snapshot (refresh=0); a failure only hides the status line.
    async loadPulseStatus() {
      if (!this.cards.some(card => card.key === 'pulse')) return;
      const business = (this.$store.state.CORE.AUTH.business || {}).id_business;
      try {
        const response = await pulseService.snapshot(false);
        const data = response && response.success && response.data;
        if (!data || !data.context || String(data.context.businessId) !== String(business) || !Array.isArray(data.incidents)) return;
        const pending = data.incidents.reduce((n, i) => n + (i.count || 0), 0), priority = data.incidents.filter(i => i.severity === 'priority').reduce((n, i) => n + i.count, 0);
        if (priority) this.pulseStatus = { tone: 'priority', text: priority + (priority === 1 ? ' pendiente que atender primero' : ' pendientes que atender primero') + ' · ' + pending + ' en total' };
        else if (pending) this.pulseStatus = { tone: 'attention', text: pending + (pending === 1 ? ' pendiente por retomar' : ' pendientes por retomar') };
        else if (data.quality && data.quality.evaluated === 3 && data.operational.category === 'clear') this.pulseStatus = { tone: 'clear', text: 'Todo al día en lo revisado' };
      } catch (_) { this.pulseStatus = null; }
    }
  },
  computed: {
    cards() {
      const auth = this.$store.state.CORE.AUTH;
      if (auth.role === 'super_admin' || (auth.tenantOperational && auth.tenantOperational.allowed === false)) return [];
      const permissions = auth.permissions || [];
      const cards = [];
      if (canAccessPulse(permissions, auth.role)) cards.push({
        key: 'pulse', title: 'Pulso del consultorio', eyebrow: 'Qué necesita atención',
        description: 'Conoce el estado actual y lo que conviene atender primero.',
        action: 'Explorar Pulso', route: 'business-pulse'
      });
      if (analysisPermissions.some(permission => permissions.includes(permission))) cards.push({
        key: 'analysis', title: 'Análisis del consultorio', eyebrow: 'Cómo va tu consultorio',
        description: 'Consulta indicadores, tendencias y la evolución de tu actividad.',
        action: 'Ver análisis', route: 'dashboard'
      });
      return cards;
    }
  }
};
</script>

<style scoped>
.home-insights { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.insight-card { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; padding: 22px; border: 1px solid #d6e6ea; border-radius: 20px; background: linear-gradient(120deg, #f0f8f8, #f8fafc 65%, #f1f5fc); color: #183d49; box-shadow: 0 6px 20px rgba(24, 56, 74, .04); }
.insight-card:only-child { grid-column: 1 / -1; }
.insight-symbol { display: grid; place-items: center; width: 52px; height: 52px; margin-bottom: 16px; border: 1px solid #d4e7e8; border-radius: 16px; background: rgba(255, 255, 255, .8); color: #247781; }
.insight-symbol svg { width: 42px; height: 42px; }
.insight-eyebrow { margin: 0 0 6px; font-size: 10px; line-height: 1.5; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: #486b78; }
.insight-card h2 { margin: 0; font-size: 18px; line-height: 1.4; font-weight: 600; color: inherit; }
.insight-description { margin: 8px 0 18px; font-size: 14px; line-height: 1.6; color: #526778; }
.insight-link { display: inline-flex; align-items: center; justify-content: center; gap: 14px; min-height: 44px; margin-top: auto; padding: 9px 14px; border: 1px solid #bdd6db; border-radius: 11px; background: rgba(255, 255, 255, .8); color: #175b66; font-size: 13px; line-height: 1.5; font-weight: 600; text-decoration: none; }
.insight-link:hover { border-color: #71a8af; background: #e4f2f3; }
.insight-link:focus-visible { outline: 3px solid #287588; outline-offset: 4px; }
.theme--dark .insight-card, html[data-theme="clinical-night"] .insight-card { background: linear-gradient(120deg, #182e36, #1c283d); border-color: #384e61; color: #deedf5; }
.theme--dark .insight-symbol, html[data-theme="clinical-night"] .insight-symbol { background: #203a45; border-color: #3c5866; color: #8dcdd1; }
.theme--dark .insight-eyebrow, html[data-theme="clinical-night"] .insight-eyebrow { color: #a5cbd4; }
.theme--dark .insight-description, html[data-theme="clinical-night"] .insight-description { color: #b6c9d8; }
.theme--dark .insight-link, html[data-theme="clinical-night"] .insight-link { background: #243e4a; border-color: #527280; color: #c0ecee; }
.theme--dark .insight-link:hover, html[data-theme="clinical-night"] .insight-link:hover { background: #304d5b; }
@media (max-width: 760px) {
  .home-insights { grid-template-columns: minmax(0, 1fr); }
  .insight-card { padding: 20px; }
}
.insight-pulse-icon { font-size: 34px !important; color: inherit !important; }
.insight-status { margin: -6px 0 14px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; line-height: 1.5; background: #eef2f8; color: #34475f; }
.insight-status-priority { background: #fbe9dc; color: #8a4a1c; }
.insight-status-attention { background: #fff3dc; color: #7a5310; }
.insight-status-clear { background: #e5f5ee; color: #1d6b55; }
.theme--dark .insight-status, html[data-theme="clinical-night"] .insight-status { background: #24344c; color: #c6d3e5; }
</style>
