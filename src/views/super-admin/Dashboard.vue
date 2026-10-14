<template>
  <div class="super-dashboard">
    <section class="intro-panel">
      <div>
        <p class="eyebrow">Administracion global</p>
        <h1>Dashboard Super Admin</h1>
        <span>Resumen operativo del sistema SaaS con metricas agregadas y sin datos clinicos privados.</span>
        <small>{{ rangeLabel }}</small>
      </div>

      <v-btn color="primary" depressed :loading="isLoading" @click="fetchSummary">
        <v-icon left>mdi-refresh</v-icon>
        Actualizar
      </v-btn>
    </section>

    <section class="filters-panel" aria-label="Filtros del dashboard">
      <v-text-field
        v-model="filters.from"
        label="Desde"
        type="date"
        outlined
        dense
        hide-details
      />

      <v-text-field
        v-model="filters.to"
        label="Hasta"
        type="date"
        outlined
        dense
        hide-details
      />

      <v-select
        v-model="filters.businessId"
        :items="businessOptions"
        :loading="isLoadingBusinesses"
        label="Negocio"
        outlined
        dense
        hide-details
      />

      <div class="filter-actions">
        <v-btn color="primary" depressed :loading="isLoading" @click="applyFilters">
          <v-icon left small>mdi-filter-check-outline</v-icon>
          Aplicar
        </v-btn>
        <v-btn text color="primary" :disabled="isLoading" @click="clearFilters">
          Limpiar filtros
        </v-btn>
      </div>
    </section>

    <v-alert v-if="errorMessage" type="error" dense text>
      <div class="error-content">
        <span>{{ errorMessage }}</span>
        <v-btn text small color="error" @click="fetchSummary">Reintentar</v-btn>
      </div>
    </v-alert>

    <v-progress-linear v-if="isLoading" indeterminate color="primary" height="3" />

    <section class="section-panel jobs-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Automatizacion SaaS</p>
          <h2>Estado de jobs y trials</h2>
        </div>
        <v-btn outlined color="primary" small :loading="isRunningDryRun" @click="runTrialLifecycleDryRun">
          <v-icon left small>mdi-play-circle-outline</v-icon>
          Ejecutar dry-run
        </v-btn>
      </div>

      <v-alert v-if="jobsErrorMessage" type="error" dense text>
        {{ jobsErrorMessage }}
      </v-alert>

      <div class="jobs-grid">
        <article class="job-card">
          <span>Jobs SaaS</span>
          <strong>{{ saasJobsStatus.jobsEnabled ? 'Activos' : 'Inactivos' }}</strong>
          <small>Apagados por defecto hasta configurar variables de entorno.</small>
        </article>
        <article class="job-card">
          <span>Job de trial</span>
          <strong>{{ saasJobsStatus.trialExpirationJobEnabled ? 'Activo' : 'Inactivo' }}</strong>
          <small>Controla deteccion y conversion de trials vencidos.</small>
        </article>
        <article class="job-card">
          <span>Modo</span>
          <strong>{{ jobModeLabel }}</strong>
          <small>La UI solo ejecuta dry-run, sin modificar negocios.</small>
        </article>
        <article class="job-card">
          <span>Trials vencidos</span>
          <strong>{{ formatNumber(saasJobsStatus.expiredTrials) }}</strong>
          <small>Detectados por el job SaaS.</small>
        </article>
        <article class="job-card">
          <span>Por vencer</span>
          <strong>{{ formatNumber(saasJobsStatus.trialsExpiringSoon) }}</strong>
          <small>Ventana: {{ formatNumber(saasJobsStatus.expiringSoonDays) }} dias.</small>
        </article>
      </div>

      <div v-if="lastDryRun" class="dry-run-summary">
        <strong>Ultimo dry-run</strong>
        <span>
          Vencidos: {{ formatNumber(lastDryRun.expiredTrials) }}.
          Por vencer: {{ formatNumber(lastDryRun.trialsExpiringSoon) }}.
          Actualizados: {{ formatNumber(lastDryRun.updatedBusinesses) }}.
        </span>
      </div>
    </section>

    <section class="metric-grid" aria-label="Metricas principales">
      <article v-for="card in totalCards" :key="card.key" class="metric-card">
        <div :class="['metric-icon', card.tone]">
          <v-icon size="24">{{ card.icon }}</v-icon>
        </div>
        <div>
          <p>{{ card.title }}</p>
          <strong>{{ formatNumber(card.value) }}</strong>
          <span>{{ card.description }}</span>
        </div>
      </article>
    </section>

    <section class="section-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Actividad reciente</p>
          <h2>Movimiento operativo</h2>
        </div>
      </div>

      <div class="compact-grid">
        <article v-for="card in recentCards" :key="card.key" class="compact-card">
          <span>{{ card.title }}</span>
          <strong>{{ formatNumber(card.value) }}</strong>
          <small>{{ card.description }}</small>
        </article>
      </div>
    </section>

    <section class="section-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Uso agregado del sistema</p>
          <h2>Conteos clinicos agregados</h2>
        </div>
        <span class="privacy-note">Solo conteos, sin detalle clinico.</span>
      </div>

      <div class="compact-grid">
        <article v-for="card in clinicalUsageCards" :key="card.key" class="compact-card">
          <span>{{ card.title }}</span>
          <strong>{{ formatNumber(card.value) }}</strong>
          <small>{{ card.description }}</small>
        </article>
      </div>
    </section>

    <section class="section-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Tendencia mensual</p>
          <h2>Series agregadas</h2>
        </div>
      </div>

      <div v-if="hasMonthlySeries" class="series-grid">
        <article v-for="serie in monthlySeriesCards" :key="serie.key" class="series-card">
          <div class="series-title">
            <strong>{{ serie.title }}</strong>
            <span>{{ formatNumber(serie.total) }}</span>
          </div>
          <div class="bar-list">
            <div v-for="item in serie.items" :key="`${serie.key}-${item.month}`" class="bar-row">
              <span>{{ item.month }}</span>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: getBarWidth(item.total, serie.max) }" />
              </div>
              <strong>{{ formatNumber(item.total) }}</strong>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <v-icon size="34">mdi-chart-line-variant</v-icon>
        <strong>Aun no hay datos suficientes para mostrar tendencias.</strong>
      </div>
    </section>

    <section class="section-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Uso por negocio</p>
          <h2>Negocios destacados</h2>
        </div>
      </div>

      <div v-if="topBusinesses.length" class="table-scroll">
        <table class="usage-table">
          <thead>
            <tr>
              <th>Negocio</th>
              <th>Estado SaaS</th>
              <th>Plan</th>
              <th>Trial</th>
              <th>Usuarios</th>
              <th>Pacientes</th>
              <th>Citas</th>
              <th>Recetas</th>
              <th>Historias clinicas</th>
              <th>Ultima actividad</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="business in topBusinesses" :key="business.id_business">
              <td class="name-cell">{{ business.name || 'Sin nombre' }}</td>
              <td>
                <span :class="getSubscriptionChipClass(business.subscription_status)">
                  {{ getSubscriptionStatusLabel(business.subscription_status) }}
                </span>
              </td>
              <td>{{ business.plan || 'Sin plan' }}</td>
              <td>{{ getBusinessTrialLabel(business) }}</td>
              <td>{{ formatNumber(business.users) }}</td>
              <td>{{ formatNumber(business.patients) }}</td>
              <td>{{ formatNumber(business.appointments) }}</td>
              <td>{{ formatNumber(business.prescriptions) }}</td>
              <td>{{ formatNumber(business.clinicalHistories) }}</td>
              <td>{{ formatDate(business.lastActivityAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        <v-icon size="34">mdi-domain-off</v-icon>
        <strong>No hay actividad suficiente para mostrar negocios destacados.</strong>
      </div>
    </section>

    <section class="section-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Alertas operativas</p>
          <h2>Riesgos de operacion</h2>
        </div>
      </div>

      <div v-if="hasAlerts" class="alert-grid">
        <article v-for="alert in alertCards" :key="alert.key" :class="['alert-card', alert.value > 0 ? 'has-alert' : 'is-clear']">
          <v-icon>{{ alert.value > 0 ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline' }}</v-icon>
          <div>
            <strong>{{ formatNumber(alert.value) }}</strong>
            <span>{{ alert.title }}</span>
          </div>
        </article>
      </div>

      <div v-else class="positive-state">
        <v-icon size="34">mdi-shield-check-outline</v-icon>
        <strong>No hay alertas SaaS criticas por ahora.</strong>
      </div>
    </section>
  </div>
</template>

<script>
import { DASuperAdminService } from '@/services/context/core-proccess-context';

const EMPTY_SUMMARY = {
  totals: {},
  recent: {},
  clinicalUsage: {},
  monthlySeries: {},
  topBusinessesByUsage: [],
  alerts: {}
};

export default {
  data: function() {
    return {
      isLoading: false,
      isLoadingBusinesses: false,
      errorMessage: '',
      summary: { ...EMPTY_SUMMARY },
      isLoadingJobs: false,
      isRunningDryRun: false,
      jobsErrorMessage: '',
      saasJobsStatus: {
        jobsEnabled: false,
        trialExpirationJobEnabled: false,
        mode: 'alert_only',
        expiringSoonDays: 7,
        expiredTrials: 0,
        trialsExpiringSoon: 0
      },
      lastDryRun: null,
      filters: {
        from: '',
        to: '',
        businessId: ''
      },
      appliedFilters: {
        from: '',
        to: '',
        businessId: ''
      },
      businessOptions: [
        { text: 'Todos', value: '' }
      ]
    };
  },

  computed: {
    rangeLabel: function() {
      const from = this.appliedFilters.from || 'ultimos 30 dias';
      const to = this.appliedFilters.to || 'hoy';
      const business = this.selectedBusinessName;

      return business
        ? `Rango: ${from} a ${to}. Negocio: ${business}.`
        : `Rango: ${from} a ${to}.`;
    },

    selectedBusinessName: function() {
      const selected = this.businessOptions.find((item) => item.value === this.appliedFilters.businessId);
      return selected && selected.value ? selected.text : '';
    },

    jobModeLabel: function() {
      return this.saasJobsStatus.mode === 'mark_past_due'
        ? 'Marcar pago pendiente'
        : 'Solo alerta';
    },

    totalCards: function() {
      const totals = this.summary.totals || {};
      return [
        { key: 'businesses', title: 'Total negocios', value: totals.businesses, description: 'Negocios registrados', icon: 'mdi-domain', tone: 'tone-green' },
        { key: 'activeBusinesses', title: 'Negocios activos', value: totals.activeBusinesses, description: 'Operacion habilitada', icon: 'mdi-store-check-outline', tone: 'tone-blue' },
        { key: 'inactiveBusinesses', title: 'Negocios inactivos', value: totals.inactiveBusinesses, description: 'Sin actividad operativa', icon: 'mdi-store-off-outline', tone: 'tone-gray' },
        { key: 'suspendedBusinesses', title: 'Suspendidos', value: totals.suspendedBusinesses, description: 'Requieren seguimiento', icon: 'mdi-store-alert-outline', tone: 'tone-red' },
        { key: 'trialBusinesses', title: 'Negocios en prueba', value: totals.trialBusinesses, description: 'Trial comercial', icon: 'mdi-timer-sand', tone: 'tone-blue' },
        { key: 'activeSubscriptionBusinesses', title: 'Clientes activos', value: totals.activeSubscriptionBusinesses, description: 'Suscripcion activa', icon: 'mdi-handshake-outline', tone: 'tone-green' },
        { key: 'expiredTrials', title: 'Trials vencidos', value: totals.expiredTrials, description: 'Acceso tenant bloqueable', icon: 'mdi-calendar-alert', tone: 'tone-red' },
        { key: 'trialsExpiringSoon', title: 'Trials por vencer', value: totals.trialsExpiringSoon, description: 'Vencen en 7 dias', icon: 'mdi-calendar-clock', tone: 'tone-amber' },
        { key: 'pastDueBusinesses', title: 'Pago pendiente', value: totals.pastDueBusinesses, description: 'Estado past_due', icon: 'mdi-credit-card-clock-outline', tone: 'tone-amber' },
        { key: 'suspendedSubscriptionBusinesses', title: 'Suspendidos SaaS', value: totals.suspendedSubscriptionBusinesses, description: 'Estado comercial suspendido', icon: 'mdi-pause-octagon-outline', tone: 'tone-red' },
        { key: 'cancelledBusinesses', title: 'Cancelados', value: totals.cancelledBusinesses, description: 'Estado comercial cancelado', icon: 'mdi-cancel', tone: 'tone-gray' },
        { key: 'users', title: 'Usuarios totales', value: totals.users, description: 'Cuentas de acceso', icon: 'mdi-account-group-outline', tone: 'tone-purple' },
        { key: 'activeUsers', title: 'Usuarios activos', value: totals.activeUsers, description: 'Cuentas habilitadas', icon: 'mdi-account-check-outline', tone: 'tone-green' },
        { key: 'lockedUsers', title: 'Usuarios bloqueados', value: totals.lockedUsers, description: 'Cuentas restringidas', icon: 'mdi-account-lock-outline', tone: 'tone-red' },
        { key: 'activeSessions', title: 'Sesiones activas', value: totals.activeSessions, description: 'Sesiones vigentes', icon: 'mdi-monitor-account', tone: 'tone-blue' }
      ];
    },

    recentCards: function() {
      const recent = this.summary.recent || {};
      return [
        { key: 'newBusinesses', title: 'Nuevos negocios', value: recent.newBusinesses, description: 'Creados en el rango' },
        { key: 'newTrialBusinesses', title: 'Nuevos trials', value: recent.newTrialBusinesses, description: 'Pruebas creadas en el rango' },
        { key: 'newActiveSubscriptionBusinesses', title: 'Nuevos activos SaaS', value: recent.newActiveSubscriptionBusinesses, description: 'Clientes activos creados en el rango' },
        { key: 'convertedToActive', title: 'Conversiones a activo', value: recent.convertedToActive, description: 'Requiere historico comercial' },
        { key: 'newUsers', title: 'Nuevos usuarios', value: recent.newUsers, description: 'Cuentas creadas en el rango' },
        { key: 'businessesWithoutRecentActivity', title: 'Sin actividad reciente', value: recent.businessesWithoutRecentActivity, description: 'Negocios que requieren seguimiento' }
      ];
    },

    clinicalUsageCards: function() {
      const usage = this.summary.clinicalUsage || {};
      return [
        { key: 'patientsCreated', title: 'Pacientes creados', value: usage.patientsCreated, description: 'Conteo agregado' },
        { key: 'appointmentsCreated', title: 'Citas creadas', value: usage.appointmentsCreated, description: 'Conteo agregado' },
        { key: 'prescriptionsCreated', title: 'Recetas creadas', value: usage.prescriptionsCreated, description: 'Conteo agregado' },
        { key: 'clinicalHistoriesCreated', title: 'Historias clinicas creadas', value: usage.clinicalHistoriesCreated, description: 'Conteo agregado' }
      ];
    },

    monthlySeriesCards: function() {
      const series = this.summary.monthlySeries || {};
      const labels = [
        { key: 'businesses', title: 'Negocios' },
        { key: 'users', title: 'Usuarios' },
        { key: 'patients', title: 'Pacientes' },
        { key: 'appointments', title: 'Citas' },
        { key: 'prescriptions', title: 'Recetas' },
        { key: 'clinicalHistories', title: 'Historias clinicas' }
      ];

      return labels
        .map((label) => {
          const items = Array.isArray(series[label.key]) ? series[label.key] : [];
          const total = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
          const max = items.reduce((current, item) => Math.max(current, Number(item.total || 0)), 0);

          return {
            ...label,
            items,
            total,
            max
          };
        })
        .filter((serie) => serie.items.length);
    },

    hasMonthlySeries: function() {
      return this.monthlySeriesCards.length > 0;
    },

    topBusinesses: function() {
      return Array.isArray(this.summary.topBusinessesByUsage)
        ? this.summary.topBusinessesByUsage
        : [];
    },

    alertCards: function() {
      const alerts = this.summary.alerts || {};
      return [
        { key: 'businessesWithoutAdmin', title: 'Negocios sin admin', value: Number(alerts.businessesWithoutAdmin || 0) },
        { key: 'businessesWithoutActivityLast30Days', title: 'Sin actividad ultimos 30 dias', value: Number(alerts.businessesWithoutActivityLast30Days || 0) },
        { key: 'lockedUsers', title: 'Usuarios bloqueados', value: Number(alerts.lockedUsers || 0) },
        { key: 'expiredTrials', title: 'Trials vencidos', value: Number(alerts.expiredTrials || 0) },
        { key: 'trialsExpiringNext7Days', title: 'Trials por vencer en 7 dias', value: Number(alerts.trialsExpiringNext7Days || 0) },
        { key: 'suspendedBusinesses', title: 'Negocios suspendidos', value: Number(alerts.suspendedBusinesses || 0) },
        { key: 'pastDueBusinesses', title: 'Negocios con pago pendiente', value: Number(alerts.pastDueBusinesses || 0) },
        { key: 'cancelledBusinesses', title: 'Negocios cancelados', value: Number(alerts.cancelledBusinesses || 0) }
      ];
    },

    hasAlerts: function() {
      return this.alertCards.some((alert) => alert.value > 0);
    }
  },

  mounted: function() {
    this.fetchBusinesses();
    this.fetchSummary();
    this.fetchSaasJobsStatus();
  },

  methods: {
    buildParams: function() {
      return {
        from: this.appliedFilters.from,
        to: this.appliedFilters.to,
        businessId: this.appliedFilters.businessId
      };
    },

    fetchSummary: async function() {
      this.isLoading = true;
      this.errorMessage = '';

      const response = await DASuperAdminService.getDashboardSummary(this.buildParams());

      if(response && response.success) {
        this.summary = {
          totals: response.data && response.data.totals ? response.data.totals : {},
          recent: response.data && response.data.recent ? response.data.recent : {},
          clinicalUsage: response.data && response.data.clinicalUsage ? response.data.clinicalUsage : {},
          monthlySeries: response.data && response.data.monthlySeries ? response.data.monthlySeries : {},
          topBusinessesByUsage: response.data && Array.isArray(response.data.topBusinessesByUsage) ? response.data.topBusinessesByUsage : [],
          alerts: response.data && response.data.alerts ? response.data.alerts : {}
        };
      } else {
        this.summary = { ...EMPTY_SUMMARY };
        this.handleRequestError(response);
      }

      this.isLoading = false;
    },

    fetchBusinesses: async function() {
      this.isLoadingBusinesses = true;

      const response = await DASuperAdminService.getBusinessOptions({
        page: 1,
        pageSize: 100,
        sortBy: 'name',
        sortDir: 'asc'
      });

      if(response && response.success) {
        const payload = response.data || {};
        const businesses = Array.isArray(payload.data) ? payload.data : [];
        this.businessOptions = [
          { text: 'Todos', value: '' },
          ...businesses.map((business) => ({
            text: business.name || business.id_business,
            value: business.id_business
          }))
        ];
      }

      this.isLoadingBusinesses = false;
    },

    fetchSaasJobsStatus: async function() {
      this.isLoadingJobs = true;
      this.jobsErrorMessage = '';

      const response = await DASuperAdminService.getSaasJobsStatus();

      if(response && response.success) {
        this.saasJobsStatus = {
          jobsEnabled: Boolean(response.data && response.data.jobsEnabled),
          trialExpirationJobEnabled: Boolean(response.data && response.data.trialExpirationJobEnabled),
          mode: response.data && response.data.mode ? response.data.mode : 'alert_only',
          expiringSoonDays: Number(response.data && response.data.expiringSoonDays ? response.data.expiringSoonDays : 7),
          expiredTrials: Number(response.data && response.data.expiredTrials ? response.data.expiredTrials : 0),
          trialsExpiringSoon: Number(response.data && response.data.trialsExpiringSoon ? response.data.trialsExpiringSoon : 0)
        };
      } else {
        this.jobsErrorMessage = response && response.message
          ? response.message
          : 'No fue posible consultar el estado de jobs SaaS.';
      }

      this.isLoadingJobs = false;
    },

    runTrialLifecycleDryRun: async function() {
      this.isRunningDryRun = true;
      this.jobsErrorMessage = '';

      const response = await DASuperAdminService.runSaasTrialLifecycleDryRun();

      if(response && response.success) {
        this.lastDryRun = {
          expiredTrials: Number(response.data && response.data.expiredTrials ? response.data.expiredTrials : 0),
          trialsExpiringSoon: Number(response.data && response.data.trialsExpiringSoon ? response.data.trialsExpiringSoon : 0),
          updatedBusinesses: Number(response.data && response.data.updatedBusinesses ? response.data.updatedBusinesses : 0)
        };
        await this.fetchSaasJobsStatus();
      } else {
        this.jobsErrorMessage = response && response.message
          ? response.message
          : 'No fue posible ejecutar el dry-run de jobs SaaS.';
      }

      this.isRunningDryRun = false;
    },

    applyFilters: function() {
      this.appliedFilters = {
        from: this.filters.from,
        to: this.filters.to,
        businessId: this.filters.businessId
      };
      this.fetchSummary();
    },

    clearFilters: function() {
      this.filters = {
        from: '',
        to: '',
        businessId: ''
      };
      this.appliedFilters = {
        from: '',
        to: '',
        businessId: ''
      };
      this.fetchSummary();
    },

    handleRequestError: function(response) {
      const status = response && Number(response.status);

      if(status === 401) {
        this.errorMessage = 'Tu sesion expiro. Vuelve a iniciar sesion para continuar.';
        return;
      }

      if(status === 403) {
        this.errorMessage = 'No tienes permiso para consultar el dashboard global.';
        window.setTimeout(() => this.$router.push({ name: 'dashboard' }).catch(() => {}), 1200);
        return;
      }

      this.errorMessage = response && response.message
        ? response.message
        : 'No fue posible cargar las metricas del dashboard.';
    },

    getBarWidth: function(value, max) {
      const safeMax = Number(max || 0);
      const safeValue = Number(value || 0);

      if(!safeMax) {
        return '0%';
      }

      return `${Math.max(6, Math.round((safeValue / safeMax) * 100))}%`;
    },

    formatNumber: function(value) {
      return Number(value || 0).toLocaleString('es-MX');
    },

    getSubscriptionStatusLabel: function(status) {
      const labels = {
        trial: 'Prueba gratis',
        active: 'Activo',
        past_due: 'Pago pendiente',
        suspended: 'Suspendido',
        cancelled: 'Cancelado'
      };

      return labels[status] || 'Desconocido';
    },

    getSubscriptionChipClass: function(status) {
      return [
        'subscription-chip',
        `is-${status || 'unknown'}`
      ];
    },

    getBusinessTrialLabel: function(business) {
      if(!business || business.subscription_status !== 'trial') {
        return 'No aplica';
      }

      if(business.trial_days_remaining === 0) {
        return 'Trial vencido';
      }

      const days = Number(business.trial_days_remaining);

      if(Number.isFinite(days)) {
        return `${days} dias restantes`;
      }

      return this.formatDate(business.trial_ends_at);
    },

    formatDate: function(value) {
      if(!value) {
        return 'Sin registro';
      }

      const date = new Date(value);

      if(Number.isNaN(date.getTime())) {
        return 'Sin registro';
      }

      return new Intl.DateTimeFormat('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }
  }
};
</script>

<style scoped>
.super-dashboard {
  display: grid;
  gap: 1.25rem;
}

.intro-panel,
.filters-panel,
.section-panel,
.metric-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
}

.intro-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  color: #047857;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.intro-panel h1,
.section-heading h2 {
  margin: 0;
  color: #111827;
  font-weight: 800;
  letter-spacing: 0;
}

.intro-panel h1 {
  font-size: 1.65rem;
  line-height: 2rem;
}

.intro-panel span {
  display: block;
  max-width: 55rem;
  margin-top: 0.75rem;
  color: #4b5563;
  line-height: 1.5rem;
}

.intro-panel small {
  display: block;
  margin-top: 0.45rem;
  color: #6b7280;
  font-size: 0.82rem;
}

.filters-panel {
  display: grid;
  grid-template-columns: minmax(9rem, 12rem) minmax(9rem, 12rem) minmax(14rem, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
}

.filter-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  min-width: 18rem;
}

.error-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1rem;
}

.metric-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  align-items: start;
  min-height: 9.5rem;
  padding: 1.15rem;
}

.metric-icon {
  width: 2.75rem;
  height: 2.75rem;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
}

.tone-green {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.tone-blue {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.tone-purple {
  color: #6d28d9;
  background: #f5f3ff;
  border-color: #ddd6fe;
}

.tone-red {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}

.tone-amber {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.tone-gray {
  color: #4b5563;
  background: #f9fafb;
  border-color: #d1d5db;
}

.metric-card p,
.compact-card span,
.alert-card span {
  margin: 0;
  color: #6b7280;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.metric-card strong {
  display: block;
  margin-top: 0.25rem;
  color: #111827;
  font-size: 1.75rem;
  line-height: 2.1rem;
  font-weight: 800;
}

.metric-card span,
.compact-card small {
  display: block;
  margin-top: 0.35rem;
  color: #6b7280;
  font-size: 0.88rem;
  line-height: 1.25rem;
}

.section-panel {
  padding: 1rem;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-heading h2 {
  font-size: 1.15rem;
  line-height: 1.6rem;
}

.privacy-note {
  color: #047857;
  font-size: 0.82rem;
  font-weight: 700;
}

.compact-grid,
.alert-grid,
.jobs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 1rem;
}

.compact-card,
.alert-card,
.job-card,
.series-card {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.compact-card,
.job-card {
  padding: 1rem;
}

.compact-card strong,
.job-card strong {
  display: block;
  margin-top: 0.25rem;
  color: #111827;
  font-size: 1.5rem;
  line-height: 1.9rem;
  font-weight: 800;
}

.job-card span {
  margin: 0;
  color: #6b7280;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.job-card small {
  display: block;
  margin-top: 0.35rem;
  color: #6b7280;
  font-size: 0.88rem;
  line-height: 1.25rem;
}

.dry-run-summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e3a8a;
}

.dry-run-summary strong {
  color: #1d4ed8;
}

.series-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 1rem;
}

.series-card {
  padding: 1rem;
}

.series-title,
.bar-row {
  display: grid;
  grid-template-columns: minmax(5rem, 1fr) minmax(7rem, 2fr) 3rem;
  gap: 0.75rem;
  align-items: center;
}

.series-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.9rem;
  color: #111827;
}

.bar-list {
  display: grid;
  gap: 0.6rem;
}

.bar-row span,
.bar-row strong {
  color: #4b5563;
  font-size: 0.82rem;
}

.bar-track {
  height: 0.55rem;
  overflow: hidden;
  background: #e5e7eb;
}

.bar-fill {
  height: 100%;
  background: #0f766e;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.usage-table {
  width: 100%;
  min-width: 82rem;
  border-collapse: collapse;
}

.usage-table th,
.usage-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #eef2f7;
  color: #374151;
  font-size: 0.9rem;
  text-align: left;
  white-space: nowrap;
}

.usage-table th {
  background: #f9fafb;
  color: #111827;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.name-cell {
  color: #111827;
  font-weight: 700;
}

.subscription-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  padding: 0 0.65rem;
  border: 1px solid #d1d5db;
  color: #374151;
  background: #f9fafb;
  font-size: 0.78rem;
  font-weight: 700;
}

.subscription-chip.is-trial {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.subscription-chip.is-active {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.subscription-chip.is-past_due {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.subscription-chip.is-suspended,
.subscription-chip.is-cancelled,
.subscription-chip.is-unknown {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fecaca;
}

.alert-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem;
}

.alert-card strong {
  display: block;
  color: #111827;
  font-size: 1.35rem;
  line-height: 1.7rem;
  font-weight: 800;
}

.alert-card.has-alert {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}

.alert-card.is-clear {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.empty-state,
.positive-state {
  display: grid;
  place-items: center;
  gap: 0.5rem;
  min-height: 9rem;
  color: #6b7280;
  text-align: center;
}

.empty-state strong,
.positive-state strong {
  color: #111827;
  font-size: 1rem;
}

.positive-state {
  color: #047857;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
}

@media (max-width: 1000px) {
  .intro-panel,
  .section-heading {
    display: grid;
  }

  .filters-panel {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    justify-content: flex-start;
    min-width: 0;
  }
}
</style>
