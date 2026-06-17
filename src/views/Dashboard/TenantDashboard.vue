<template>
  <section class="tenant-dashboard-page">
    <div class="dashboard-container">
      <header class="dashboard-hero">
        <div class="hero-copy">
          <p class="eyebrow">Panel del consultorio</p>
          <h1>Resumen del consultorio</h1>
          <p>Revisa como va tu consultorio en este periodo. Mostramos informacion general, sin datos clinicos de pacientes.</p>
          <div class="hero-meta">
            <span v-if="businessName">
              <v-icon size="17">mdi-domain</v-icon>
              Consultorio: {{ businessName }}
            </span>
            <span v-if="planLabel">
              <v-icon size="17">mdi-shield-check-outline</v-icon>
              {{ planLabel }}
            </span>
            <span>
              <v-icon size="17">mdi-calendar-range-outline</v-icon>
              {{ rangeLabel }}
            </span>
          </div>
        </div>

        <button
          type="button"
          class="refresh-button"
          :disabled="isDashboardBusy"
          @click="fetchDashboard"
        >
          <v-icon size="19">mdi-refresh</v-icon>
          <span>{{ isDashboardBusy ? 'Actualizando...' : 'Actualizar' }}</span>
        </button>
      </header>

      <section class="filters-panel" aria-label="Filtros del resumen">
        <div>
          <p class="eyebrow">Periodo</p>
          <h2>Elige que periodo revisar</h2>
        </div>

        <div class="range-actions">
          <button
            v-for="preset in rangePresets"
            :key="preset.key"
            type="button"
            :class="['range-button', { 'is-active': selectedPreset === preset.key }]"
            :disabled="isDashboardBusy"
            @click="applyPreset(preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>
      </section>

      <v-progress-linear
        v-if="isDashboardBusy"
        indeterminate
        color="#0f766e"
        height="3"
        class="dashboard-progress"
      ></v-progress-linear>

      <section v-if="errorMessage" class="state-panel is-error" aria-live="polite">
        <v-icon size="34">mdi-alert-circle-outline</v-icon>
        <div>
          <strong>No pudimos cargar el resumen.</strong>
          <p>{{ errorMessage }}</p>
        </div>
        <button type="button" class="state-action" @click="fetchDashboard">Reintentar</button>
      </section>

      <template v-if="summary">
        <section
          v-if="canShowPlanStatus || canShowAdministrativeAlerts"
          class="overview-grid"
          aria-label="Estado del negocio"
        >
          <article v-if="canShowPlanStatus" class="summary-card plan-card">
            <div class="card-heading">
              <div>
                <p class="eyebrow">Plan contratado</p>
                <h2>{{ planName }}</h2>
              </div>
              <span :class="['status-chip', subscriptionTone]">{{ subscriptionLabel }}</span>
            </div>

            <div class="plan-details">
              <span>
                <small>Tipo de plan</small>
                <strong>{{ planName }}</strong>
              </span>
              <span>
                <small>Estado del consultorio</small>
                <strong>{{ businessStatusLabel }}</strong>
              </span>
              <span>
                <small>Periodo revisado</small>
                <strong>{{ rangeLabel }}</strong>
              </span>
            </div>
          </article>

          <article v-if="canShowAdministrativeAlerts" class="summary-card alerts-card">
            <div class="card-heading">
              <div>
                <p class="eyebrow">Avisos del consultorio</p>
                <h2>{{ dashboardAlerts.length ? 'Revisar' : 'Todo en orden' }}</h2>
              </div>
              <v-icon size="26">{{ dashboardAlerts.length ? 'mdi-bell-alert-outline' : 'mdi-check-circle-outline' }}</v-icon>
            </div>

            <div v-if="dashboardAlerts.length" class="alert-list">
              <div
                v-for="alert in dashboardAlerts"
                :key="alert.key"
                :class="['alert-item', alert.tone || 'warning']"
              >
                <strong>{{ alert.title }}</strong>
                <span>{{ alert.message }}</span>
              </div>
            </div>

            <div v-else class="positive-state">
              <strong>Sin alertas importantes por ahora.</strong>
              <span>Aqui apareceran avisos de configuracion o capacidad de tu cuenta.</span>
            </div>
          </article>
        </section>

        <section class="summary-card plan-scope-card is-compact" aria-labelledby="plan-scope-title">
          <div class="card-heading">
            <div>
              <p class="eyebrow">Lo que incluye tu plan</p>
              <h2 id="plan-scope-title">{{ dashboardLevelLabel }}</h2>
            </div>
            <span class="privacy-note">{{ dashboardPlanLabel }}</span>
          </div>

          <p>{{ planScopeMessage }}</p>

          <div v-if="planScopeNotes.length" class="scope-note-grid">
            <article v-for="note in planScopeNotes" :key="note.key" :class="['scope-note', note.tone]">
              <v-icon size="22">{{ note.icon }}</v-icon>
              <div>
                <strong>{{ note.title }}</strong>
                <span>{{ note.message }}</span>
              </div>
            </article>
          </div>
        </section>

        <section v-if="canShowLicenseUsage" class="summary-card license-card" aria-labelledby="license-title">
          <div class="card-heading">
            <div>
              <p class="eyebrow">Capacidad de tu cuenta</p>
              <h2 id="license-title">Usuarios incluidos</h2>
            </div>
            <span class="privacy-note">Pacientes ilimitados</span>
          </div>

          <div class="license-grid">
            <article
              v-for="item in licenseCards"
              :key="item.key"
              :class="[
                'license-item',
                {
                  'is-complete': !item.exceeded && item.remaining === 0,
                  'is-exceeded': item.exceeded
                }
              ]"
            >
              <div class="license-icon">
                <v-icon size="22">{{ item.icon }}</v-icon>
              </div>
              <div class="license-copy">
                <span>{{ item.label }}</span>
                <strong v-if="item.key === 'patients'">{{ item.limitLabel }}</strong>
                <strong v-else>{{ item.usedLabel }} / {{ item.limitLabel }}</strong>
                <small>{{ item.remainingLabel }}</small>
              </div>
              <div v-if="!item.unlimited" class="license-progress" aria-hidden="true">
                <span :style="{ width: item.progress + '%' }"></span>
              </div>
            </article>
          </div>
        </section>

        <section v-if="canShowBasicActivity" class="activity-section" aria-labelledby="activity-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Actividad del periodo</p>
              <h2 id="activity-title">Actividad del consultorio</h2>
            </div>
            <span class="privacy-note">Sin datos personales</span>
          </div>

          <div class="activity-grid">
            <article v-for="card in activityCards" :key="card.key" class="activity-card">
              <span class="activity-icon">
                <v-icon size="24">{{ card.icon }}</v-icon>
              </span>
              <div>
                <strong>{{ formatNumber(card.value) }}</strong>
                <span>{{ card.label }}</span>
                <small>{{ card.description }}</small>
              </div>
            </article>
          </div>

          <div v-if="!hasActivity && !isDashboardBusy" class="state-panel is-empty">
            <v-icon size="32">mdi-chart-box-outline</v-icon>
            <div>
              <strong>No hay actividad registrada en este periodo.</strong>
              <p>Cambia el rango para revisar otros dias o meses. Los analisis avanzados apareceran cuando tu plan los incluya.</p>
            </div>
          </div>
        </section>

        <dashboard-locked-widget v-if="showProLockedPanel" />

        <section
          v-if="hasAdvancedDashboardWidgets"
          class="dashboard-widget-layout"
          aria-label="Analisis avanzado del consultorio"
        >
          <dashboard-operational-summary
            v-if="canShowOperationalAnalysis"
            :loading="operationalLoading"
            :error="operationalError"
            :data="operationalData"
            class="dashboard-widget-wide"
            @retry="fetchOperationalSummary"
          />

          <div
            v-if="canShowTrends || canShowProfessionalBreakdown || canShowTeamBreakdown"
            :class="[
              'dashboard-secondary-grid',
              {
                'is-single': !canShowTeamBreakdown || !(canShowTrends || canShowProfessionalBreakdown)
              }
            ]"
          >
            <div v-if="canShowTrends || canShowProfessionalBreakdown" class="dashboard-secondary-stack">
              <dashboard-activity-trends
                v-if="canShowTrends"
                :loading="trendsLoading"
                :error="trendsError"
                :data="trendsData"
                :granularity="trendsGranularity"
                @granularity-change="changeTrendsGranularity"
                @retry="fetchTrends"
              />

              <dashboard-professional-breakdown
                v-if="canShowProfessionalBreakdown"
                :loading="professionalBreakdownLoading"
                :error="professionalBreakdownError"
                :data="professionalBreakdownData"
                @retry="fetchProfessionalBreakdown"
              />
            </div>

            <dashboard-team-breakdown
              v-if="canShowTeamBreakdown"
              :loading="teamBreakdownLoading"
              :error="teamBreakdownError"
              :data="teamBreakdownData"
              @retry="fetchTeamBreakdown"
            />
          </div>
        </section>

        <dashboard-enterprise-locked-widget v-if="showEnterpriseLockedPanel" />
      </template>

      <section v-else-if="!isDashboardBusy && !errorMessage" class="state-panel is-empty">
        <v-icon size="34">mdi-view-dashboard-outline</v-icon>
        <div>
          <strong>Aun no hay informacion para mostrar.</strong>
          <p>Cuando exista informacion disponible, aparecera aqui.</p>
        </div>
      </section>
    </div>
  </section>
</template>

<script>
import { DABusinessDashboardService } from '../../services/context/core-proccess-context';
import DashboardActivityTrends from './components/DashboardActivityTrends.vue';
import DashboardEnterpriseLockedWidget from './components/DashboardEnterpriseLockedWidget.vue';
import DashboardLockedWidget from './components/DashboardLockedWidget.vue';
import DashboardOperationalSummary from './components/DashboardOperationalSummary.vue';
import DashboardProfessionalBreakdown from './components/DashboardProfessionalBreakdown.vue';
import DashboardTeamBreakdown from './components/DashboardTeamBreakdown.vue';
import { buildPlanFeatureMessage, isPlanFeatureResponse } from '../../utils/licenseLimitMessage';

const DAY_IN_MS = 86400000;

function pad(value) {
  return String(value).padStart(2, '0');
}

function toLocalDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function endOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

function daysAgo(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return new Date(date.getTime() - (days - 1) * DAY_IN_MS);
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default {
  name: 'TenantDashboard',
  components: {
    DashboardActivityTrends,
    DashboardEnterpriseLockedWidget,
    DashboardLockedWidget,
    DashboardOperationalSummary,
    DashboardProfessionalBreakdown,
    DashboardTeamBreakdown
  },
  data: function() {
    return {
      isLoading: false,
      errorMessage: '',
      summary: null,
      trendsLoading: false,
      trendsError: '',
      trendsData: null,
      trendsGranularity: 'month',
      operationalLoading: false,
      operationalError: '',
      operationalData: null,
      professionalBreakdownLoading: false,
      professionalBreakdownError: '',
      professionalBreakdownData: null,
      teamBreakdownLoading: false,
      teamBreakdownError: '',
      teamBreakdownData: null,
      selectedPreset: 'month',
      filters: {
        from: toLocalDateString(startOfCurrentMonth()),
        to: toLocalDateString(endOfCurrentMonth())
      },
      rangePresets: [
        { key: 'month', label: 'Este mes' },
        { key: '7d', label: 'Ultimos 7 dias' },
        { key: '30d', label: 'Ultimos 30 dias' }
      ]
    };
  },
  created: function() {
    this.fetchDashboard();
  },
  computed: {
    isDashboardBusy: function() {
      return Boolean(
        this.isLoading
        || this.trendsLoading
        || this.operationalLoading
        || this.professionalBreakdownLoading
        || this.teamBreakdownLoading
      );
    },
    business: function() {
      return this.summary && this.summary.business ? this.summary.business : {};
    },
    license: function() {
      return this.summary && this.summary.license ? this.summary.license : {};
    },
    activity: function() {
      return this.summary && this.summary.activity ? this.summary.activity : {};
    },
    dashboardConfig: function() {
      return this.summary && this.summary.dashboard ? this.summary.dashboard : {};
    },
    dashboardCapabilities: function() {
      return this.dashboardConfig.capabilities || {
        planStatus: true,
        licenseUsage: true,
        basicActivity: true,
        administrativeAlerts: true,
        trends: false,
        operationalAnalysis: false,
        teamBreakdown: false,
        professionalBreakdown: false,
        advancedReports: false
      };
    },
    dashboardLevel: function() {
      return this.dashboardConfig.level || 'simple';
    },
    dashboardPlanLabel: function() {
      return this.dashboardConfig.planLabel || this.planName || 'Individual';
    },
    dashboardLevelLabel: function() {
      const labels = {
        simple: 'Vista esencial',
        operational: 'Vista operativa',
        administrative: 'Vista administrativa'
      };
      return labels[this.dashboardLevel] || 'Vista esencial';
    },
    canShowPlanStatus: function() {
      return Boolean(this.dashboardCapabilities.planStatus);
    },
    canShowLicenseUsage: function() {
      return Boolean(this.dashboardCapabilities.licenseUsage);
    },
    canShowBasicActivity: function() {
      return Boolean(this.dashboardCapabilities.basicActivity);
    },
    canShowAdministrativeAlerts: function() {
      return Boolean(this.dashboardCapabilities.administrativeAlerts);
    },
    canShowTrends: function() {
      return Boolean(this.dashboardCapabilities.trends);
    },
    canShowOperationalAnalysis: function() {
      return Boolean(this.dashboardCapabilities.operationalAnalysis);
    },
    canShowProfessionalBreakdown: function() {
      return Boolean(this.dashboardCapabilities.professionalBreakdown);
    },
    canShowTeamBreakdown: function() {
      return Boolean(this.dashboardCapabilities.teamBreakdown);
    },
    showProLockedPanel: function() {
      return Boolean(
        this.summary
        && !this.canShowTrends
        && !this.canShowOperationalAnalysis
      );
    },
    showEnterpriseLockedPanel: function() {
      return Boolean(
        this.summary
        && this.dashboardLevel === 'operational'
        && !this.canShowProfessionalBreakdown
        && !this.canShowTeamBreakdown
      );
    },
    hasAdvancedDashboardWidgets: function() {
      return Boolean(
        this.canShowTrends
        || this.canShowOperationalAnalysis
        || this.canShowProfessionalBreakdown
        || this.canShowTeamBreakdown
      );
    },
    planScopeMessage: function() {
      if(this.dashboardLevel === 'administrative') {
        return 'Tu plan incluye analisis operativo y una vista administrativa para entender mejor la actividad del equipo.';
      }

      if(this.dashboardLevel === 'operational') {
        return 'Tu plan incluye tendencias y resumen operativo para seguir la actividad diaria del consultorio.';
      }

      return 'Tu plan incluye lo esencial para operar: estado del consultorio, capacidad de cuenta, actividad basica y avisos importantes.';
    },
    planScopeNotes: function() {
      if(this.dashboardLevel === 'administrative') {
        return [
          {
            key: 'enterprise-ready',
            tone: 'included',
            icon: 'mdi-chart-line-variant',
            title: 'Vista administrativa activa',
            message: 'Puedes revisar actividad por profesional y uso del equipo sin mostrar datos de pacientes.'
          }
        ];
      }

      if(this.dashboardLevel === 'operational') {
        return [
          {
            key: 'pro-ready',
            tone: 'included',
            icon: 'mdi-chart-line-variant',
            title: 'Analisis operativo incluido',
            message: 'Puedes revisar tendencias y comparativos del periodo.'
          },
          {
            key: 'enterprise-locked',
            tone: 'locked',
            icon: 'mdi-lock-outline',
            title: 'Desglose administrativo',
            message: 'Disponible en el plan Clinica para revisar profesionales y equipo.'
          }
        ];
      }

      return [
        {
          key: 'basic-summary',
          tone: 'included',
          icon: 'mdi-view-dashboard-outline',
          title: 'Resumen esencial incluido',
          message: 'Incluye estado, capacidad y actividad basica del consultorio.'
        },
        {
          key: 'pro-locked',
          tone: 'locked',
          icon: 'mdi-lock-outline',
          title: 'Analisis operativo',
          message: 'Disponible en el plan Profesional con tendencias y comparativos.'
        }
      ];
    },
    businessName: function() {
      return this.business.name || '';
    },
    businessPlan: function() {
      return this.business.plan || 'Sin plan';
    },
    planName: function() {
      return this.business.planName || this.businessPlan || 'Plan no disponible';
    },
    planLabel: function() {
      return this.planName ? `Plan ${this.planName}` : '';
    },
    subscriptionLabel: function() {
      const labels = {
        trial: 'Modo de prueba',
        active: 'Activo',
        suspended: 'Suspendido',
        past_due: 'Pago pendiente',
        cancelled: 'Cancelado'
      };
      return labels[this.business.subscriptionStatus] || this.business.subscriptionStatus || 'Sin estado';
    },
    subscriptionTone: function() {
      const status = this.business.subscriptionStatus;
      if(status === 'active') {
        return 'is-success';
      }
      if(status === 'suspended' || status === 'cancelled' || status === 'past_due') {
        return 'is-danger';
      }
      return 'is-info';
    },
    businessStatusLabel: function() {
      const labels = {
        active: 'Activo',
        suspended: 'Suspendido',
        inactive: 'Inactivo'
      };
      return labels[this.business.status] || this.business.status || 'Sin estado';
    },
    rangeLabel: function() {
      const range = this.summary && this.summary.range ? this.summary.range : this.filters;
      return `${this.formatDate(range.from)} - ${this.formatDate(range.to)}`;
    },
    licenseCards: function() {
      return [
        this.buildLicenseCard('professionals', 'Profesionales', 'mdi-account-tie-outline'),
        this.buildLicenseCard('staffUsers', 'Usuarios internos', 'mdi-account-multiple-outline'),
        {
          key: 'patients',
          label: 'Pacientes',
          icon: 'mdi-account-heart-outline',
          used: null,
          usedLabel: 'Ilimitados',
          limitLabel: 'Ilimitados',
          remaining: null,
          remainingLabel: 'Sin limite de pacientes',
          exceeded: false,
          unlimited: true,
          progress: 100
        }
      ];
    },
    activityCards: function() {
      return [
        {
          key: 'patientsCreated',
          label: 'Pacientes creados',
          description: 'Nuevos registros del periodo.',
          icon: 'mdi-account-plus-outline',
          value: this.activity.patientsCreated
        },
        {
          key: 'appointmentsCreated',
          label: 'Citas registradas',
          description: 'Citas creadas en el rango.',
          icon: 'mdi-calendar-plus-outline',
          value: this.activity.appointmentsCreated
        },
        {
          key: 'prescriptionsIssued',
          label: 'Recetas emitidas',
          description: 'Recetas emitidas durante el periodo.',
          icon: 'mdi-file-document-edit-outline',
          value: this.activity.prescriptionsIssued
        },
        {
          key: 'clinicalHistoriesFinalized',
          label: 'Historias finalizadas',
          description: 'Historias clinicas cerradas en el periodo.',
          icon: 'mdi-clipboard-check-outline',
          value: this.activity.clinicalHistoriesFinalized
        }
      ];
    },
    hasActivity: function() {
      return this.activityCards.some((card) => normalizeNumber(card.value) > 0);
    },
    dashboardAlerts: function() {
      const backendAlerts = Array.isArray(this.summary && this.summary.alerts)
        ? this.summary.alerts.map((alert, index) => ({
          key: alert.key || `backend-alert-${index}`,
          title: alert.title || alert.label || 'Alerta administrativa',
          message: alert.message || alert.description || 'Revisa esta configuracion administrativa.',
          tone: alert.tone || 'warning'
        }))
        : [];

      const licenseAlerts = this.licenseCards
        .filter((item) => item.exceeded || (!item.unlimited && item.remaining === 0))
        .map((item) => ({
          key: `license-${item.key}`,
          title: item.exceeded ? `${item.label} excedidos` : `Capacidad de ${item.label.toLowerCase()} completa`,
          message: item.exceeded
            ? `El uso actual supera el limite configurado para ${item.label.toLowerCase()}.`
            : this.capacityCompleteMessage(item),
          tone: item.exceeded ? 'danger' : 'soft'
        }));

      return backendAlerts.concat(licenseAlerts);
    }
  },
  methods: {
    fetchDashboard: async function() {
      await this.fetchSummary();
    },
    fetchSummary: async function() {
      this.isLoading = true;
      this.errorMessage = '';
      this.resetDashboardWidgets();

      try {
        const response = await DABusinessDashboardService.getSummary({
          from: this.filters.from,
          to: this.filters.to
        });

        if(response && response.success && response.data) {
          this.summary = response.data;
          this.loadDashboardWidgetsForSummary(response.data);
        }
        else {
          this.summary = null;
          this.errorMessage = response && response.message
            ? response.message
            : 'No fue posible recuperar la informacion del resumen.';
        }
      }
      catch(error) {
        this.summary = null;
        this.errorMessage = 'No fue posible recuperar la informacion del resumen.';
      }
      finally {
        this.isLoading = false;
      }
    },
    loadDashboardWidgetsForSummary: function(summary) {
      const capabilities = this.resolveDashboardCapabilities(summary);

      if(capabilities.trends) {
        this.fetchTrends();
      }

      if(capabilities.operationalAnalysis) {
        this.fetchOperationalSummary();
      }

      if(capabilities.professionalBreakdown) {
        this.fetchProfessionalBreakdown();
      }

      if(capabilities.teamBreakdown) {
        this.fetchTeamBreakdown();
      }
    },
    resolveDashboardCapabilities: function(summary) {
      return summary
        && summary.dashboard
        && summary.dashboard.capabilities
        ? summary.dashboard.capabilities
        : {};
    },
    resetDashboardWidgets: function() {
      this.trendsLoading = false;
      this.trendsError = '';
      this.trendsData = null;
      this.operationalLoading = false;
      this.operationalError = '';
      this.operationalData = null;
      this.professionalBreakdownLoading = false;
      this.professionalBreakdownError = '';
      this.professionalBreakdownData = null;
      this.teamBreakdownLoading = false;
      this.teamBreakdownError = '';
      this.teamBreakdownData = null;
    },
    fetchTrends: async function() {
      if(!this.canShowTrends) {
        return;
      }

      this.trendsLoading = true;
      this.trendsError = '';

      try {
        const response = await DABusinessDashboardService.getTrends({
          from: this.filters.from,
          to: this.filters.to,
          granularity: this.trendsGranularity
        });

        if(response && response.success && response.data) {
          this.trendsData = response.data;
        }
        else {
          this.trendsData = null;
          this.trendsError = response && response.message
            ? this.dashboardFeatureMessage(response, 'trends')
            : 'No fue posible recuperar la tendencia de actividad.';
        }
      }
      catch(error) {
        this.trendsData = null;
        this.trendsError = 'No fue posible recuperar la tendencia de actividad.';
      }
      finally {
        this.trendsLoading = false;
      }
    },
    fetchOperationalSummary: async function() {
      if(!this.canShowOperationalAnalysis) {
        return;
      }

      this.operationalLoading = true;
      this.operationalError = '';

      try {
        const response = await DABusinessDashboardService.getOperationalSummary({
          from: this.filters.from,
          to: this.filters.to
        });

        if(response && response.success && response.data) {
          this.operationalData = response.data;
        }
        else {
          this.operationalData = null;
          this.operationalError = response && response.message
            ? this.dashboardFeatureMessage(response, 'operational_analysis')
            : 'No fue posible recuperar el resumen operativo.';
        }
      }
      catch(error) {
        this.operationalData = null;
        this.operationalError = 'No fue posible recuperar el resumen operativo.';
      }
      finally {
        this.operationalLoading = false;
      }
    },
    fetchProfessionalBreakdown: async function() {
      if(!this.canShowProfessionalBreakdown) {
        return;
      }

      this.professionalBreakdownLoading = true;
      this.professionalBreakdownError = '';

      try {
        const response = await DABusinessDashboardService.getProfessionalBreakdown({
          from: this.filters.from,
          to: this.filters.to
        });

        if(response && response.success && response.data) {
          this.professionalBreakdownData = response.data;
        }
        else {
          this.professionalBreakdownData = null;
          this.professionalBreakdownError = response && response.message
            ? this.dashboardFeatureMessage(response, 'professional_activity_metrics')
            : 'No fue posible recuperar la actividad por profesional.';
        }
      }
      catch(error) {
        this.professionalBreakdownData = null;
        this.professionalBreakdownError = 'No fue posible recuperar la actividad por profesional.';
      }
      finally {
        this.professionalBreakdownLoading = false;
      }
    },
    fetchTeamBreakdown: async function() {
      if(!this.canShowTeamBreakdown) {
        return;
      }

      this.teamBreakdownLoading = true;
      this.teamBreakdownError = '';

      try {
        const response = await DABusinessDashboardService.getTeamBreakdown({
          from: this.filters.from,
          to: this.filters.to
        });

        if(response && response.success && response.data) {
          this.teamBreakdownData = response.data;
        }
        else {
          this.teamBreakdownData = null;
          this.teamBreakdownError = response && response.message
            ? this.dashboardFeatureMessage(response, 'team_usage_metrics')
            : 'No fue posible recuperar el uso por equipo.';
        }
      }
      catch(error) {
        this.teamBreakdownData = null;
        this.teamBreakdownError = 'No fue posible recuperar el uso por equipo.';
      }
      finally {
        this.teamBreakdownLoading = false;
      }
    },
    changeTrendsGranularity: function(granularity) {
      if(this.trendsGranularity === granularity) {
        return;
      }

      this.trendsGranularity = granularity;
      this.fetchTrends();
    },
    applyPreset: function(preset) {
      this.selectedPreset = preset;
      const today = new Date();

      if(preset === '7d') {
        this.filters = {
          from: toLocalDateString(daysAgo(7)),
          to: toLocalDateString(today)
        };
      }
      else if(preset === '30d') {
        this.filters = {
          from: toLocalDateString(daysAgo(30)),
          to: toLocalDateString(today)
        };
      }
      else {
        this.filters = {
          from: toLocalDateString(startOfCurrentMonth()),
          to: toLocalDateString(endOfCurrentMonth())
        };
      }

      this.fetchDashboard();
    },
    buildLicenseCard: function(key, label, icon) {
      const source = this.license[key] || (key === 'staffUsers' ? this.license.auxiliaryUsers : {}) || {};
      const used = normalizeNumber(source.used);
      const limit = source.limit;
      const remaining = source.remaining;
      const unlimited = limit === null || limit === undefined || Number(limit) < 0;
      const numericLimit = Number(limit);
      const safeLimit = Number.isFinite(numericLimit) && numericLimit > 0 ? numericLimit : 0;
      const progress = unlimited || safeLimit === 0
        ? 100
        : Math.min(100, Math.round((used / safeLimit) * 100));

      return {
        key,
        label,
        icon,
        used,
        usedLabel: this.formatNumber(used),
        limitLabel: unlimited ? 'Ilimitado' : this.formatNumber(limit),
        remaining: unlimited ? null : normalizeNumber(remaining),
        remainingLabel: unlimited ? 'Sin limite configurado' : `${this.formatNumber(remaining)} restantes`,
        exceeded: Boolean(source.exceeded),
        unlimited,
        progress
      };
    },
    capacityCompleteMessage: function(item) {
      if(item.key === 'patients') {
        return 'Tu plan mantiene pacientes ilimitados.';
      }
      return `Tu cuenta ya usa todos los ${item.label.toLowerCase()} incluidos.`;
    },
    dashboardFeatureMessage: function(response, feature) {
      if(isPlanFeatureResponse(response)) {
        return buildPlanFeatureMessage(
          {
            ...response,
            data: {
              ...(response && response.data ? response.data : {}),
              feature: response && response.data && response.data.feature ? response.data.feature : feature
            }
          },
          response && response.message
        );
      }

      return response && response.message ? response.message : 'Esta vista no esta disponible para tu plan actual.';
    },
    formatNumber: function(value) {
      return normalizeNumber(value).toLocaleString('es-MX');
    },
    formatDate: function(value) {
      if(!value) {
        return 'Sin fecha';
      }

      const parts = String(value).split('-');
      if(parts.length !== 3) {
        return value;
      }

      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
};
</script>

<style scoped>
.tenant-dashboard-page {
  min-height: 100%;
  padding: 1.6rem 1rem 2rem;
}

.dashboard-container {
  width: min(100%, 78rem);
  margin: 0 auto;
}

.dashboard-hero,
.filters-panel,
.summary-card,
.state-panel {
  border: 1px solid rgba(14, 116, 144, 0.12);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.07);
}

.dashboard-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.2rem;
  padding: clamp(1.35rem, 3vw, 2.1rem);
}

.hero-copy {
  max-width: 48rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  color: #0f766e;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.dashboard-hero h1,
.filters-panel h2,
.summary-card h2,
.section-heading h2 {
  margin: 0;
  color: #12313a;
  letter-spacing: 0;
}

.dashboard-hero h1 {
  font-size: clamp(2rem, 4vw, 3.1rem);
  line-height: 1.02;
}

.dashboard-hero p:not(.eyebrow) {
  max-width: 44rem;
  margin: 0.8rem 0 0;
  color: #475569;
  font-size: 1rem;
  line-height: 1.55;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 1rem;
}

.hero-meta span,
.privacy-note,
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2rem;
  padding: 0 0.7rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 800;
}

.hero-meta span {
  color: #0f766e;
  background: #ecfdf5;
}

.refresh-button,
.range-button,
.state-action {
  min-height: 2.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid #b7e4df;
  border-radius: 999px;
  padding: 0 0.95rem;
  color: #0f766e;
  background: #ffffff;
  font-weight: 900;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.refresh-button:hover,
.range-button:hover,
.state-action:hover,
.range-button.is-active {
  border-color: #0f766e;
  color: #ffffff;
  background: #0f766e;
}

.filters-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem;
}

.range-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.dashboard-progress {
  margin-top: 1rem;
  border-radius: 999px;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.72fr);
  gap: 1rem;
  margin-top: 1rem;
}

.summary-card {
  padding: 1.15rem;
}

.card-heading,
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.status-chip {
  border: 1px solid transparent;
}

.status-chip.is-success {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.status-chip.is-info {
  color: #0369a1;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.status-chip.is-danger {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}

.plan-details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
  margin-top: 1.2rem;
}

.plan-details span {
  min-width: 0;
  padding: 0.85rem;
  border: 1px solid #e2edf0;
  background: #f8fbfc;
}

.plan-details small,
.license-copy small,
.activity-card small,
.positive-state span,
.alert-item span {
  color: #64748b;
  font-size: 0.82rem;
  line-height: 1.25rem;
}

.plan-details strong {
  display: block;
  margin-top: 0.18rem;
  color: #12313a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.privacy-note {
  color: #0f766e;
  background: #ecfdf5;
}

.positive-state,
.alert-list {
  margin-top: 1rem;
}

.positive-state {
  display: grid;
  gap: 0.25rem;
  padding: 0.95rem;
  border: 1px dashed #b7e4df;
  background: #f8fdfc;
}

.alert-list {
  display: grid;
  gap: 0.55rem;
}

.alert-item {
  display: grid;
  gap: 0.2rem;
  padding: 0.85rem;
  border: 1px solid #fde68a;
  background: #fffbeb;
}

.alert-item.danger {
  border-color: #fecaca;
  background: #fef2f2;
}

.alert-item.soft {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.plan-scope-card,
.license-card,
.activity-section,
.dashboard-widget-layout {
  margin-top: 1rem;
}

.plan-scope-card.is-compact {
  padding: 1rem;
}

.dashboard-widget-layout {
  display: grid;
  gap: 1rem;
}

.dashboard-secondary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(22rem, 0.88fr);
  gap: 1rem;
  align-items: start;
}

.dashboard-secondary-grid.is-single {
  grid-template-columns: 1fr;
}

.dashboard-secondary-stack {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.dashboard-secondary-grid > * {
  min-width: 0;
}

.dashboard-widget-wide {
  min-width: 0;
}

.plan-scope-card p {
  margin: 0.85rem 0 0;
  color: #475569;
  line-height: 1.55;
}

.scope-note-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 0.8rem;
}

.scope-note {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.65rem;
  padding: 0.75rem;
  border: 1px solid #dbeafe;
  background: #f8fbff;
}

.scope-note.included {
  border-color: #b7e4df;
  background: #f8fdfc;
}

.scope-note.locked {
  border-color: #e2e8f0;
  background: #f8fafc;
}

.scope-note .v-icon {
  color: #0f766e;
}

.scope-note strong,
.scope-note span {
  display: block;
}

.scope-note strong {
  color: #12313a;
}

.scope-note span {
  margin-top: 0.12rem;
  color: #64748b;
  font-size: 0.84rem;
  line-height: 1.25rem;
}

.license-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 1rem;
}

.license-item {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  min-height: 7.4rem;
  padding: 0.95rem;
  border: 1px solid #e2edf0;
  background: #f8fbfc;
  overflow: hidden;
}

.license-item.is-complete {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.license-item.is-exceeded {
  border-color: #fecaca;
  background: #fef2f2;
}

.license-icon,
.activity-icon {
  display: grid;
  place-items: center;
  border-radius: 0.8rem;
  color: #0f766e;
  background: #dff7f4;
}

.license-icon {
  width: 2.55rem;
  height: 2.55rem;
}

.license-copy {
  display: grid;
  gap: 0.1rem;
}

.license-copy span {
  color: #334155;
  font-weight: 900;
}

.license-copy strong {
  color: #12313a;
  font-size: 1.2rem;
}

.license-progress {
  position: absolute;
  left: 0.95rem;
  right: 0.95rem;
  bottom: 0.85rem;
  height: 0.38rem;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.license-progress span {
  display: block;
  height: 100%;
  max-width: 100%;
  border-radius: inherit;
  background: #0f766e;
}

.activity-section {
  padding: 1.15rem;
  border: 1px solid rgba(14, 116, 144, 0.12);
  background: rgba(255, 255, 255, 0.74);
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 1rem;
}

.activity-card {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  min-width: 0;
  padding: 1rem;
  border: 1px solid #dfecef;
  background: #ffffff;
}

.activity-icon {
  flex: 0 0 2.7rem;
  width: 2.7rem;
  height: 2.7rem;
  margin-top: 0.12rem;
}

.activity-card > div {
  min-width: 0;
}

.activity-card strong {
  display: block;
  color: #0f2f38;
  font-size: 2rem;
  line-height: 1.95rem;
}

.activity-card span {
  display: block;
  color: #334155;
  font-weight: 900;
  line-height: 1.2rem;
  overflow-wrap: anywhere;
}

.state-panel {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin-top: 1rem;
  padding: 1rem;
}

.state-panel.is-error {
  border-color: #fecaca;
  background: #fff7f7;
}

.state-panel.is-empty {
  border-style: dashed;
}

.state-panel strong {
  display: block;
  color: #12313a;
}

.state-panel p {
  margin: 0.2rem 0 0;
  color: #64748b;
}

html[data-theme="clinical-night"] .dashboard-hero,
html[data-theme="clinical-night"] .filters-panel,
html[data-theme="clinical-night"] .summary-card,
html[data-theme="clinical-night"] .state-panel,
html[data-theme="clinical-night"] .activity-section {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.88);
}

html[data-theme="clinical-night"] .dashboard-hero h1,
html[data-theme="clinical-night"] .filters-panel h2,
html[data-theme="clinical-night"] .summary-card h2,
html[data-theme="clinical-night"] .section-heading h2,
html[data-theme="clinical-night"] .plan-details strong,
html[data-theme="clinical-night"] .activity-card strong,
html[data-theme="clinical-night"] .state-panel strong {
  color: #e2e8f0;
}

html[data-theme="clinical-night"] .dashboard-hero p:not(.eyebrow),
html[data-theme="clinical-night"] .plan-details small,
html[data-theme="clinical-night"] .license-copy small,
html[data-theme="clinical-night"] .activity-card small,
html[data-theme="clinical-night"] .state-panel p,
html[data-theme="clinical-night"] .plan-scope-card p,
html[data-theme="clinical-night"] .scope-note span {
  color: #94a3b8;
}

html[data-theme="clinical-night"] .plan-details span,
html[data-theme="clinical-night"] .license-item,
html[data-theme="clinical-night"] .activity-card,
html[data-theme="clinical-night"] .positive-state,
html[data-theme="clinical-night"] .scope-note {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(30, 41, 59, 0.76);
}

html[data-theme="clinical-night"] .alert-item.soft,
html[data-theme="clinical-night"] .license-item.is-complete {
  border-color: rgba(96, 165, 250, 0.32);
  background: rgba(30, 64, 175, 0.16);
}

html[data-theme="clinical-night"] .scope-note strong {
  color: #e2e8f0;
}

@media (max-width: 1180px) {
  .activity-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .dashboard-hero,
  .filters-panel,
  .card-heading,
  .section-heading {
    flex-direction: column;
  }

  .overview-grid,
  .license-grid,
  .plan-details,
  .scope-note-grid,
  .dashboard-secondary-grid {
    grid-template-columns: 1fr;
  }

  .refresh-button,
  .range-actions,
  .range-button {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .tenant-dashboard-page {
    padding: 1rem 0.75rem 1.5rem;
  }

  .activity-grid {
    grid-template-columns: 1fr;
  }

  .state-panel,
  .activity-card,
  .license-item {
    grid-template-columns: 1fr;
  }
}
</style>
