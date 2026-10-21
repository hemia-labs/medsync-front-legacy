<template>
  <div v-if="cards.length" class="home-insights">
    <section v-for="card in cards" :key="card.key" class="insight-card" :aria-labelledby="'home-insight-' + card.key">
      <div class="insight-symbol" aria-hidden="true">
        <svg v-if="card.key === 'pulse'" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="24" stroke="currentColor" stroke-opacity=".2" />
          <ellipse cx="32" cy="32" rx="25" ry="12" transform="rotate(-35 32 32)" stroke="currentColor" stroke-width="1.5" />
          <ellipse cx="32" cy="32" rx="25" ry="12" transform="rotate(35 32 32)" stroke="currentColor" stroke-opacity=".45" stroke-width="1.5" />
          <circle cx="32" cy="32" r="6" fill="currentColor" />
          <circle cx="51" cy="17" r="3" fill="currentColor" />
        </svg>
        <svg v-else viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 12v40h42" stroke-opacity=".4" />
          <path d="M22 43V32m12 11V26m12 17V18" stroke-width="5" />
          <path d="m20 23 13-8 12-5" stroke-opacity=".7" />
        </svg>
      </div>
      <p class="insight-eyebrow">{{ card.eyebrow }}</p>
      <h2 :id="'home-insight-' + card.key">{{ card.title }}</h2>
      <p class="insight-description">{{ card.description }}</p>
      <router-link class="insight-link" :to="{ name: card.route }">{{ card.action }} <span aria-hidden="true">→</span></router-link>
    </section>
  </div>
</template>

<script>
import { canAccessPulse } from '../../../security/pulseAccess';
import { tenantNavigationItems } from '../../../core/navigation/tenantNavigation';

const analysisPermissions = tenantNavigationItems.find(item => item.key === 'dashboard').permissionsAny;

export default {
  name: 'HomeInsights',
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
.insight-eyebrow { margin: 0 0 6px; font-size: 10px; line-height: 1.5; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; color: #486b78; }
.insight-card h2 { margin: 0; font-size: 18px; line-height: 1.4; font-weight: 750; color: inherit; }
.insight-description { margin: 8px 0 18px; font-size: 14px; line-height: 1.6; color: #526778; }
.insight-link { display: inline-flex; align-items: center; justify-content: center; gap: 14px; min-height: 44px; margin-top: auto; padding: 9px 14px; border: 1px solid #bdd6db; border-radius: 11px; background: rgba(255, 255, 255, .8); color: #175b66; font-size: 13px; line-height: 1.5; font-weight: 750; text-decoration: none; }
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
</style>
