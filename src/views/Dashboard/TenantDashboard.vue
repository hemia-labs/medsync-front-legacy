<template>
  <section class="tenant-dashboard-page">
    <div class="dashboard-container">
      <header class="dashboard-hero">
        <svg class="hero-art" viewBox="0 0 320 220" fill="none" aria-hidden="true">
          <circle cx="250" cy="60" r="150" stroke="currentColor" stroke-opacity=".12" />
          <circle cx="250" cy="60" r="105" stroke="currentColor" stroke-opacity=".16" />
          <circle cx="250" cy="60" r="62" stroke="currentColor" stroke-opacity=".22" />
          <path d="M20 190 L80 150 L130 168 L190 110 L240 128 L300 70" stroke="currentColor" stroke-opacity=".35" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="190" cy="110" r="5" fill="currentColor" fill-opacity=".6" />
          <circle cx="300" cy="70" r="5" fill="currentColor" fill-opacity=".6" />
        </svg>
        <div class="hero-copy">
          <p class="hero-eyebrow">Panel del consultorio</p>
          <h1>Análisis del consultorio</h1>
          <p class="hero-scope">{{ scopeLabel }}</p>
          <p class="hero-lead">Revisa los indicadores disponibles para tus permisos en este periodo, sin datos personales de pacientes.</p>
          <div class="hero-meta">
            <span v-if="businessName">
              <v-icon size="16">mdi-domain</v-icon>
              Consultorio: {{ businessName }}
            </span>
            <span v-if="planLabel">
              <v-icon size="16">mdi-shield-check-outline</v-icon>
              {{ planLabel }}
            </span>
            <span>
              <v-icon size="16">mdi-calendar-range-outline</v-icon>
              {{ rangeLabel }}
            </span>
            <span v-if="scopeDoctorLabel">
              <v-icon size="16">mdi-account-tie-outline</v-icon>
              {{ scopeDoctorLabel }}
            </span>
          </div>
        </div>
      </header>

      <section class="filters-panel an-card" aria-label="Filtros del resumen">
        <div class="an-filter">
          <span id="dashboard-range-label" class="an-filter-label">Elige que periodo revisar</span>
          <div class="an-segment" role="group" aria-labelledby="dashboard-range-label">
            <button
              v-for="preset in rangePresets"
              :key="preset.key"
              type="button"
              :class="{ 'is-active': selectedPreset === preset.key }"
              :aria-pressed="selectedPreset === preset.key"
              :disabled="isDashboardBusy"
              @click="applyPreset(preset.key)"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <div v-if="canChangeScope" class="an-filter">
          <span id="dashboard-scope-label" class="an-filter-label">Alcance</span>
          <div class="an-segment" role="group" aria-labelledby="dashboard-scope-label">
            <button
              v-for="option in scopeOptions"
              :key="option.key"
              type="button"
              :class="{ 'is-active': dashboardScope.mode === option.key }"
              :aria-pressed="dashboardScope.mode === option.key"
              :disabled="isDashboardBusy"
              @click="changeScope(option.key)"
            >{{ option.label }}</button>
          </div>
        </div>

        <button
          type="button"
          class="an-button refresh-button"
          :disabled="isDashboardBusy"
          @click="fetchDashboard"
        >
          <v-icon size="19">mdi-refresh</v-icon>
          <span>{{ isDashboardBusy ? 'Actualizando...' : 'Actualizar' }}</span>
        </button>
      </section>

      <v-progress-linear
        v-if="isDashboardBusy"
        indeterminate
        color="#0f766e"
        height="3"
        class="dashboard-progress"
      ></v-progress-linear>

      <section v-if="errorMessage" class="an-state is-error page-state" aria-live="polite">
        <v-icon size="34">mdi-alert-circle-outline</v-icon>
        <div>
          <strong>No pudimos cargar el resumen.</strong>
          <p>{{ errorMessage }}</p>
        </div>
        <button type="button" class="an-button" @click="fetchDashboard">Reintentar</button>
      </section>

      <template v-if="summary">
        <button
          v-if="canShowAdministrativeAlerts && dashboardAlerts.length"
          type="button"
          class="alert-strip"
          @click="goToAccount"
        >
          <v-icon size="22">mdi-bell-alert-outline</v-icon>
          <span>
            <strong>{{ dashboardAlerts.length === 1 ? 'Hay 1 aviso del consultorio por revisar' : 'Hay ' + dashboardAlerts.length + ' avisos del consultorio por revisar' }}</strong>
            <small>{{ dashboardAlerts[0].title }}{{ dashboardAlerts.length > 1 ? ' y más' : '' }}</small>
          </span>
          <em>Ver avisos <span aria-hidden="true">↓</span></em>
        </button>

        <section v-if="canShowBasicActivity" class="activity-section" aria-labelledby="activity-title">
          <div class="an-heading section-heading">
            <div>
              <p class="an-eyebrow">Actividad del periodo</p>
              <h2 id="activity-title">{{ scopeLabel }}</h2>
            </div>
            <span class="an-chip"><v-icon size="15">mdi-shield-lock-outline</v-icon>Sin datos personales</span>
          </div>

          <div class="activity-grid">
            <article
              v-for="card in kpiCards"
              :key="card.key"
              class="activity-card an-card"
              :style="{ '--kpi-color': card.color }"
            >
              <div class="kpi-top">
                <span class="activity-icon">
                  <v-icon size="22">{{ card.icon }}</v-icon>
                </span>
                <span
                  v-if="card.trend"
                  :class="['kpi-delta', 'is-' + card.trend.direction]"
                  :title="card.trend.title"
                >
                  <span aria-hidden="true">{{ card.trend.arrow }}</span> {{ card.trend.text }}
                </span>
              </div>
              <strong>{{ formatNumber(card.value) }}</strong>
              <span class="kpi-label">{{ card.label }}</span>
              <small>{{ card.description }}</small>
              <small v-if="card.trend" class="kpi-previous">{{ card.trend.previousText }}</small>
            </article>
          </div>

          <div v-if="hasMeasuredActivity && !hasActivity && !isDashboardBusy" class="an-state is-empty">
            <v-icon size="32">mdi-chart-box-outline</v-icon>
            <div>
              <strong>No hay actividad registrada en este periodo.</strong>
              <p>Cambia el rango para revisar otros dias o meses. Los analisis avanzados apareceran cuando tu plan los incluya.</p>
            </div>
          </div>
        </section>

        <pulse-entry />

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

          <dashboard-activity-trends
            v-if="canShowTrends"
            :loading="trendsLoading"
            :error="trendsError"
            :data="trendsData"
            :granularity="trendsGranularity"
            class="dashboard-widget-wide"
            @granularity-change="changeTrendsGranularity"
            @retry="fetchTrends"
          />

          <div
            v-if="canShowProfessionalBreakdown || canShowTeamBreakdown"
            :class="[
              'dashboard-secondary-grid',
              { 'is-single': !canShowTeamBreakdown || !canShowProfessionalBreakdown }
            ]"
          >
            <dashboard-professional-breakdown
              v-if="canShowProfessionalBreakdown"
              :loading="professionalBreakdownLoading"
              :error="professionalBreakdownError"
              :data="professionalBreakdownData"
              @retry="fetchProfessionalBreakdown"
            />

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

        <section
          v-if="canShowPlanStatus || canShowAdministrativeAlerts || canShowLicenseUsage"
          id="dashboard-account"
          ref="account"
          class="account-section"
          aria-labelledby="account-title"
          tabindex="-1"
        >
          <div class="an-heading section-heading">
            <div>
              <p class="an-eyebrow">Tu cuenta</p>
              <h2 id="account-title">Plan, avisos y capacidad</h2>
            </div>
          </div>

          <div
            v-if="canShowPlanStatus || canShowAdministrativeAlerts"
            :class="['overview-grid', { 'is-single': !(canShowPlanStatus && canShowAdministrativeAlerts) }]"
          >
            <article v-if="canShowPlanStatus" class="an-card plan-card">
              <div class="an-heading">
                <div>
                  <p class="an-eyebrow">Plan contratado</p>
                  <h3>{{ planName }}</h3>
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

            <article v-if="canShowAdministrativeAlerts" class="an-card alerts-card">
              <div class="an-heading">
                <div>
                  <p class="an-eyebrow">Avisos del consultorio</p>
                  <h3>{{ dashboardAlerts.length ? 'Revisar' : 'Todo en orden' }}</h3>
                </div>
                <v-icon size="26" :class="dashboardAlerts.length ? 'alerts-icon is-pending' : 'alerts-icon'">{{ dashboardAlerts.length ? 'mdi-bell-alert-outline' : 'mdi-check-circle-outline' }}</v-icon>
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
          </div>

          <div :class="['account-grid', { 'is-single': !(canShowPlanStatus && canShowLicenseUsage) }]">
            <section v-if="canShowPlanStatus" class="an-card plan-scope-card" aria-labelledby="plan-scope-title">
              <div class="an-heading">
                <div>
                  <p class="an-eyebrow">Lo que incluye tu plan</p>
                  <h3 id="plan-scope-title">{{ dashboardLevelLabel }}</h3>
                </div>
                <span class="an-chip">{{ dashboardPlanLabel }}</span>
              </div>

              <p>{{ planScopeMessage }}</p>

              <div v-if="planScopeNotes.length" class="scope-note-list">
                <article v-for="note in planScopeNotes" :key="note.key" :class="['scope-note', note.tone]">
                  <v-icon size="20">{{ note.icon }}</v-icon>
                  <div>
                    <strong>{{ note.title }}</strong>
                    <span>{{ note.message }}</span>
                  </div>
                </article>
              </div>
            </section>

            <section v-if="canShowLicenseUsage" class="an-card license-card" aria-labelledby="license-title">
              <div class="an-heading">
                <div>
                  <p class="an-eyebrow">Capacidad de tu cuenta</p>
                  <h3 id="license-title">Usuarios incluidos</h3>
                </div>
                <span class="an-chip">Pacientes ilimitados</span>
              </div>

              <div class="license-list">
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
                    <v-icon size="20">{{ item.icon }}</v-icon>
                  </div>
                  <div class="license-copy">
                    <span>{{ item.label }}</span>
                    <small>{{ item.remainingLabel }}</small>
                    <div v-if="!item.unlimited" class="an-meter" aria-hidden="true">
                      <span :style="{ width: item.progress + '%' }"></span>
                    </div>
                  </div>
                  <strong v-if="item.key === 'patients'">{{ item.limitLabel }}</strong>
                  <strong v-else>{{ item.usedLabel }} / {{ item.limitLabel }}</strong>
                </article>
              </div>
            </section>
          </div>
        </section>
      </template>

      <section v-else-if="!isDashboardBusy && !errorMessage" class="an-state is-empty page-state">
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
import PulseEntry from '../Pulse/PulseEntry.vue';
import { DABusinessDashboardService } from '../../services/context/core-proccess-context';
import DashboardActivityTrends from './components/DashboardActivityTrends.vue';
import DashboardEnterpriseLockedWidget from './components/DashboardEnterpriseLockedWidget.vue';
import DashboardLockedWidget from './components/DashboardLockedWidget.vue';
import DashboardOperationalSummary from './components/DashboardOperationalSummary.vue';
import DashboardProfessionalBreakdown from './components/DashboardProfessionalBreakdown.vue';
import DashboardTeamBreakdown from './components/DashboardTeamBreakdown.vue';
import { buildPlanFeatureMessage, isPlanFeatureResponse } from '../../utils/licenseLimitMessage';
import moduleTypes from '../../store/modules/common/module-types';
import { formatMetric, hasMetric, metricNumber } from '../../domain/dashboard/metrics';

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
    PulseEntry,
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
      dashboardDisposed: false,
      requestGeneration: 0,
      requestVersions: {},
      selectedScope: '',
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
  beforeDestroy: function() {
    this.dashboardDisposed = true;
    this.clearDashboard();
  },
  watch: {
    sessionKey: function() {
      this.selectedScope = '';
      this.clearDashboard();
      if(this.sessionKey && !this.dashboardDisposed) this.fetchDashboard();
    }
  },
  computed: {
    sessionKey: function() {
      const getters = this.$store.getters;
      const user = getters[moduleTypes.AUTH + '/getUser'] || {};
      const business = getters[moduleTypes.AUTH + '/getBusiness'] || {};
      const actor = user.id_login || user.id;
      const tenant = business.id_business || user.id_business;
      return actor && tenant
        ? JSON.stringify([actor, tenant, [...(getters[moduleTypes.AUTH + '/getPermissions'] || [])].sort()]) : '';
    },
    dashboardAccess: function() {
      return (this.summary && this.summary.access) || this.dashboardConfig.access || {};
    },
    dashboardScope: function() {
      return this.dashboardAccess.scope || {};
    },
    scopeLabel: function() {
      if(!this.dashboardScope.mode) return 'Resumen de actividad';
      return this.dashboardScope.mode === 'own' ? 'Mi actividad' : 'Todo el consultorio';
    },
    scopeDoctorLabel: function() {
      return this.dashboardScope.mode === 'own' ? this.dashboardScope.doctorName || '' : '';
    },
    canChangeScope: function() {
      return Boolean(this.dashboardAccess.canSelectTenant && this.dashboardAccess.canSelectOwn);
    },
    scopeOptions: function() {
      return [{ key: 'own', label: 'Mi actividad', allowed: this.dashboardAccess.canSelectOwn },
        { key: 'tenant', label: 'Todo el consultorio', allowed: this.dashboardAccess.canSelectTenant }].filter(option => option.allowed);
    },
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
      return this.dashboardConfig.capabilities || {};
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
        && this.canShowPlanStatus
        && !this.canShowTrends
        && !this.canShowOperationalAnalysis
      );
    },
    showEnterpriseLockedPanel: function() {
      return Boolean(
        this.summary
        && this.canShowPlanStatus
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
        return 'Tu plan incluye tendencias, resumen operativo y la vista administrativa del equipo para revisar usuarios, roles y capacidad del consultorio, segun tus permisos.';
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
            title: 'Indicadores habilitados segun permisos',
            message: 'Se muestran las familias autorizadas para tu puesto y el alcance seleccionado, dentro de lo que incluye tu plan.'
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
            key: 'pro-team-ready',
            tone: 'included',
            icon: 'mdi-account-group-outline',
            title: 'Vista administrativa del equipo',
            message: 'Incluye uso del equipo, distribucion por roles y capacidad contratada, segun tus permisos administrativos.'
          },
          {
            key: 'enterprise-locked',
            tone: 'locked',
            icon: 'mdi-lock-outline',
            title: 'Actividad por profesional',
            message: 'Disponible en el plan Clinica para revisar indicadores por profesional responsable.'
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
      return this.business.plan || '';
    },
    planName: function() {
      return this.business.planName || this.businessPlan || 'Plan no disponible';
    },
    planLabel: function() {
      const name = this.business.planName || this.business.plan;
      return this.canShowPlanStatus && name ? `Plan ${name}` : '';
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
          icon: 'mdi-calendar-plus',
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
      ].filter(card => hasMetric(this.activity, card.key)).map(card => {
        const definition = (this.summary && this.summary.metricDefinitions || {})[card.key] || {};
        return { ...card, description: definition.reason || card.description };
      });
    },
    kpiCards: function() {
      // Cada indicador conserva el mismo color que en la tendencia de actividad.
      const colors = {
        patientsCreated: 'var(--an-series-1)',
        appointmentsCreated: 'var(--an-series-2)',
        prescriptionsIssued: 'var(--an-series-4)',
        clinicalHistoriesFinalized: 'var(--an-series-5)'
      };
      const comparison = (this.operationalData && this.operationalData.periodComparison) || {};
      return this.activityCards.map(card => ({
        ...card,
        color: colors[card.key],
        trend: this.buildKpiTrend(comparison[card.key])
      }));
    },
    hasActivity: function() {
      return this.activityCards.some((card) => normalizeNumber(card.value) > 0);
    },
    hasMeasuredActivity: function() {
      return this.activityCards.length > 0 && this.activityCards.every(card => metricNumber(card.value) !== null);
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
    clearDashboard: function() {
      this.requestGeneration += 1;
      this.summary = null;
      this.errorMessage = '';
      this.isLoading = false;
      this.resetDashboardWidgets();
    },
    dashboardParams: function(extra = {}) {
      return { from: this.filters.from, to: this.filters.to, scope: this.selectedScope, ...extra };
    },
    beginDashboardRequest: function(key) {
      const version = (this.requestVersions[key] || 0) + 1;
      this.requestVersions[key] = version;
      return { key, version, generation: this.requestGeneration, session: this.sessionKey };
    },
    isCurrentDashboardRequest: function(request) {
      return !this.dashboardDisposed && Boolean(this.sessionKey)
        && request.session === this.sessionKey
        && request.generation === this.requestGeneration
        && request.version === this.requestVersions[request.key];
    },
    changeScope: function(scope) {
      if(!this.canChangeScope || scope === this.dashboardScope.mode) return;
      this.selectedScope = scope;
      this.fetchDashboard();
    },
    fetchDashboard: async function() {
      await this.fetchSummary();
    },
    fetchSummary: async function() {
      this.clearDashboard();
      if(!this.sessionKey || this.dashboardDisposed) return;
      const request = this.beginDashboardRequest('summary');
      const widgetRequests = Object.fromEntries(['trends', 'operational', 'professionalBreakdown', 'teamBreakdown']
        .map(key => [key, this.beginDashboardRequest(key)]));
      const requestedGranularity = this.trendsGranularity;
      this.isLoading = true;
      try {
        const response = await DABusinessDashboardService.getOverview(this.dashboardParams({ granularity: requestedGranularity }));
        if(!this.isCurrentDashboardRequest(request)) return;
        if(response && response.success && response.data && response.data.summary) {
          this.summary = response.data.summary;
          const widgets = response.data.widgets || {};
          const features = { trends: 'trends', operational: 'operational_analysis',
            professionalBreakdown: 'professional_activity_metrics', teamBreakdown: 'team_usage_metrics' };
          Object.keys(widgetRequests).forEach(key => {
            if(!this.isCurrentDashboardRequest(widgetRequests[key])) return;
            if(key === 'trends' && requestedGranularity !== this.trendsGranularity) {
              this.fetchTrends();
              return;
            }
            const widget = widgets[key];
            this[key + 'Loading'] = false;
            if(widget && widget.status === 200) this[key + 'Data'] = widget.data;
            else if(widget) this[key + 'Error'] = this.dashboardFeatureMessage(widget, features[key]);
          });
        }
        else {
          this.errorMessage = response && response.message
            ? response.message : 'No fue posible recuperar la informacion del resumen.';
        }
      }
      catch(error) {
        if(this.isCurrentDashboardRequest(request)) {
          this.errorMessage = 'No fue posible recuperar la informacion del resumen.';
        }
      }
      finally {
        if(this.isCurrentDashboardRequest(request)) this.isLoading = false;
      }
    },
    loadDashboardWidgetsForSummary: function(summary) {
      const capabilities = this.resolveDashboardCapabilities(summary);
      if(capabilities.trends) this.fetchTrends();
      if(capabilities.operationalAnalysis) this.fetchOperationalSummary();
      if(capabilities.professionalBreakdown) this.fetchProfessionalBreakdown();
      if(capabilities.teamBreakdown) this.fetchTeamBreakdown();
    },
    resolveDashboardCapabilities: function(summary) {
      return summary && summary.dashboard && summary.dashboard.capabilities
        ? summary.dashboard.capabilities : {};
    },
    resetDashboardWidgets: function() {
      ['trends', 'operational', 'professionalBreakdown', 'teamBreakdown'].forEach(key => {
        this[key + 'Loading'] = false;
        this[key + 'Error'] = '';
        this[key + 'Data'] = null;
      });
    },
    fetchWidget: async function(key, serviceMethod, feature, extra = {}) {
      if(!this.sessionKey || this.dashboardDisposed) return;
      const request = this.beginDashboardRequest(key);
      this[key + 'Loading'] = true;
      this[key + 'Error'] = '';
      this[key + 'Data'] = null;
      try {
        const response = await DABusinessDashboardService[serviceMethod](this.dashboardParams(extra));
        if(!this.isCurrentDashboardRequest(request)) return;
        if(response && response.success && response.data) {
          this[key + 'Data'] = response.data;
        }
        else {
          this[key + 'Error'] = this.dashboardFeatureMessage(response, feature);
        }
      }
      catch(error) {
        if(this.isCurrentDashboardRequest(request)) {
          this[key + 'Error'] = 'No fue posible recuperar los indicadores. Intenta nuevamente.';
        }
      }
      finally {
        if(this.isCurrentDashboardRequest(request)) this[key + 'Loading'] = false;
      }
    },
    fetchTrends: async function() {
      if(this.canShowTrends) {
        await this.fetchWidget('trends', 'getTrends', 'trends', { granularity: this.trendsGranularity });
      }
    },
    fetchOperationalSummary: async function() {
      if(this.canShowOperationalAnalysis) {
        await this.fetchWidget('operational', 'getOperationalSummary', 'operational_analysis');
      }
    },
    fetchProfessionalBreakdown: async function() {
      if(this.canShowProfessionalBreakdown) {
        await this.fetchWidget('professionalBreakdown', 'getProfessionalBreakdown', 'professional_activity_metrics');
      }
    },
    fetchTeamBreakdown: async function() {
      if(this.canShowTeamBreakdown) {
        await this.fetchWidget('teamBreakdown', 'getTeamBreakdown', 'team_usage_metrics');
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
    buildKpiTrend: function(item) {
      const delta = metricNumber(item && item.delta);
      const previous = metricNumber(item && item.previous);
      if(delta === null || previous === null) return null;
      const percent = metricNumber(item.deltaPercent);
      const sign = delta > 0 ? '+' : '';
      const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
      return {
        direction,
        arrow: { up: '▲', down: '▼', flat: '=' }[direction],
        text: delta === 0 ? 'Sin cambio' : percent === null
          ? `${sign}${this.formatNumber(delta)}` : `${sign}${this.formatNumber(percent)}%`,
        title: `${sign}${this.formatNumber(delta)} respecto al periodo anterior`,
        previousText: `Periodo anterior: ${this.formatNumber(previous)}`
      };
    },
    goToAccount: function() {
      const target = this.$refs.account;
      if(!target) return;
      target.scrollIntoView({ block: 'start' });
      target.focus({ preventScroll: true });
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
      return formatMetric(value);
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

<style src="./analysis.css"></style>

<style scoped>
.tenant-dashboard-page {
  min-height: 100%;
  padding: 1.6rem 1rem 2.4rem;
}

.dashboard-container {
  display: grid;
  gap: 1.1rem;
  width: min(100%, 78rem);
  margin: 0 auto;
}

.dashboard-container > * {
  min-width: 0;
  margin: 0;
}

/* Encabezado */
.dashboard-hero {
  position: relative;
  overflow: hidden;
  padding: clamp(1.4rem, 3.4vw, 2.3rem);
  border-radius: 24px;
  color: #ffffff;
  background: linear-gradient(125deg, #0b4f4a 0%, #0f766e 48%, #1c5f8c 100%);
  box-shadow: 0 18px 44px rgba(11, 79, 74, 0.22);
}

.hero-art {
  position: absolute;
  top: 0;
  right: 0;
  width: min(46%, 24rem);
  height: 100%;
  color: #ffffff;
  pointer-events: none;
}

.hero-copy {
  position: relative;
  max-width: 46rem;
}

.hero-eyebrow {
  margin: 0 0 0.4rem;
  color: #b9f1e8;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.dashboard-hero h1 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(1.9rem, 4vw, 2.8rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.hero-scope {
  margin: 0.55rem 0 0;
  color: #d9fbf5;
  font-size: 1.05rem;
  font-weight: 600;
}

.hero-lead {
  max-width: 40rem;
  margin: 0.45rem 0 0;
  color: rgba(255, 255, 255, 0.86);
  font-size: 0.96rem;
  line-height: 1.55;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.1rem;
}

.hero-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2rem;
  padding: 0 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.12);
  font-size: 0.8rem;
  font-weight: 600;
}

.hero-meta .v-icon {
  color: #b9f1e8 !important;
}

/* Filtros */
.filters-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.9rem 1.4rem;
  padding: 0.9rem 1.1rem;
}

.an-filter {
  display: grid;
  gap: 0.35rem;
}

.an-filter-label {
  color: var(--an-muted);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.refresh-button {
  margin-left: auto;
}

.dashboard-progress {
  border-radius: 999px;
}

.page-state {
  margin-top: 0;
}

/* Aviso superior */
.alert-strip {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  width: 100%;
  padding: 0.85rem 1.1rem;
  border: 1px solid var(--an-warn-border);
  border-radius: var(--an-radius-sm);
  color: var(--an-warn-ink);
  background: var(--an-warn-bg);
  text-align: left;
}

.alert-strip .v-icon {
  color: inherit !important;
}

.alert-strip > span {
  flex: 1;
  min-width: 0;
}

.alert-strip strong,
.alert-strip small {
  display: block;
}

.alert-strip small {
  font-size: 0.82rem;
  opacity: 0.9;
}

.alert-strip em {
  flex: 0 0 auto;
  font-size: 0.82rem;
  font-style: normal;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.alert-strip:focus-visible,
.account-section:focus-visible {
  outline: 3px solid var(--an-accent);
  outline-offset: 3px;
}

/* Titulares del periodo */
.section-heading {
  align-items: flex-end;
  margin-bottom: 0.9rem;
}

.section-heading h2 {
  margin: 0;
  color: var(--an-ink);
  font-size: 1.45rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: 0.9rem;
}

.activity-card {
  position: relative;
  display: grid;
  align-content: start;
  gap: 0.15rem;
  overflow: hidden;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.activity-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 4px;
  background: var(--kpi-color);
}

.activity-card:hover {
  transform: translateY(-2px);
}

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
}

.activity-icon {
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 0.85rem;
  color: var(--an-ink);
  background: var(--an-surface-2);
  box-shadow: inset 0 0 0 1.5px var(--kpi-color);
}

.activity-icon .v-icon {
  color: inherit !important;
}

.kpi-delta {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 1.6rem;
  padding: 0 0.55rem;
  border-radius: 999px;
  color: var(--an-ink-2);
  background: var(--an-surface-2);
  font-size: 0.74rem;
  font-weight: 600;
  white-space: nowrap;
}

.kpi-delta.is-up {
  color: var(--an-good-ink);
  background: var(--an-accent-soft);
}

.kpi-delta.is-down {
  color: var(--an-warn-ink);
  background: var(--an-warn-bg);
}

.activity-card strong {
  color: var(--an-ink);
  font-size: clamp(2rem, 3.4vw, 2.6rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.05;
  overflow-wrap: anywhere;
}

.kpi-label {
  color: var(--an-ink);
  font-weight: 600;
  line-height: 1.3;
}

.activity-card small {
  color: var(--an-muted);
  font-size: 0.8rem;
  line-height: 1.4;
}

.kpi-previous {
  margin-top: 0.2rem;
  font-weight: 600;
}

/* Widgets avanzados */
.dashboard-widget-layout {
  display: grid;
  gap: 1.1rem;
}

.dashboard-secondary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(20rem, 0.88fr);
  gap: 1.1rem;
  align-items: start;
}

.dashboard-secondary-grid.is-single {
  grid-template-columns: 1fr;
}

.dashboard-secondary-grid > *,
.dashboard-widget-wide {
  min-width: 0;
}

/* Cuenta */
.account-section {
  display: grid;
  gap: 0.9rem;
  padding-top: 0.6rem;
  scroll-margin-top: 5rem;
}

.account-section .section-heading {
  margin-bottom: 0;
}

.overview-grid,
.account-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.8fr);
  gap: 0.9rem;
  align-items: start;
}

.account-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.overview-grid.is-single,
.account-grid.is-single {
  grid-template-columns: 1fr;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.85rem;
  padding: 0 0.7rem;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.status-chip.is-success {
  color: var(--an-good-ink);
  background: var(--an-accent-soft);
}

.status-chip.is-info {
  color: var(--an-info-ink);
  border-color: var(--an-info-border);
  background: var(--an-info-bg);
}

.status-chip.is-danger {
  color: var(--an-danger-ink);
  border-color: var(--an-danger-border);
  background: var(--an-danger-bg);
}

.plan-details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
  margin-top: 1rem;
}

.plan-details span {
  min-width: 0;
  padding: 0.75rem 0.85rem;
  border-radius: var(--an-radius-sm);
  background: var(--an-surface-2);
}

.plan-details small,
.license-copy small,
.positive-state span,
.alert-item span,
.scope-note span {
  display: block;
  color: var(--an-muted);
  font-size: 0.82rem;
  line-height: 1.4;
}

.plan-details strong {
  display: block;
  margin-top: 0.15rem;
  color: var(--an-ink);
  overflow-wrap: anywhere;
}

.alerts-icon {
  color: var(--an-accent) !important;
}

.alerts-icon.is-pending {
  color: var(--an-warn-ink) !important;
}

.positive-state,
.alert-list {
  margin-top: 1rem;
}

.positive-state {
  display: grid;
  gap: 0.2rem;
  padding: 0.85rem 0.95rem;
  border-radius: var(--an-radius-sm);
  background: var(--an-accent-soft);
}

.positive-state strong,
.alert-item strong,
.scope-note strong {
  display: block;
  color: var(--an-ink);
}

.alert-list {
  display: grid;
  gap: 0.5rem;
}

.alert-item {
  display: grid;
  gap: 0.15rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--an-warn-border);
  border-radius: var(--an-radius-sm);
  background: var(--an-warn-bg);
}

.alert-item.danger {
  border-color: var(--an-danger-border);
  background: var(--an-danger-bg);
}

.alert-item.soft {
  border-color: var(--an-info-border);
  background: var(--an-info-bg);
}

.plan-scope-card > p {
  margin: 0.75rem 0 0;
  color: var(--an-ink-2);
  font-size: 0.92rem;
  line-height: 1.55;
}

.scope-note-list {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.85rem;
}

.scope-note {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.65rem;
  align-items: start;
  padding: 0.7rem 0.8rem;
  border-radius: var(--an-radius-sm);
  background: var(--an-accent-soft);
}

.scope-note .v-icon {
  margin-top: 0.1rem;
  color: var(--an-accent) !important;
}

.scope-note.locked {
  background: var(--an-surface-2);
}

.scope-note.locked .v-icon {
  color: var(--an-muted) !important;
}

.license-list {
  display: grid;
  gap: 0.55rem;
  margin-top: 1rem;
}

.license-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem 0.85rem;
  border: 1px solid transparent;
  border-radius: var(--an-radius-sm);
  background: var(--an-surface-2);
}

.license-item.is-complete {
  border-color: var(--an-info-border);
  background: var(--an-info-bg);
}

.license-item.is-exceeded {
  border-color: var(--an-danger-border);
  background: var(--an-danger-bg);
}

.license-item.is-exceeded .an-meter span {
  background: var(--an-danger-ink);
}

.license-icon {
  display: grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 0.8rem;
  color: var(--an-accent);
  background: var(--an-accent-soft);
}

.license-icon .v-icon {
  color: inherit !important;
}

.license-copy {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.license-copy span {
  color: var(--an-ink);
  font-weight: 600;
}

.license-copy .an-meter {
  margin-top: 0.3rem;
}

.license-item > strong {
  color: var(--an-ink);
  font-size: 1.15rem;
  font-weight: 600;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .overview-grid,
  .account-grid,
  .dashboard-secondary-grid {
    grid-template-columns: 1fr;
  }

  .hero-art {
    opacity: 0.6;
  }
}

@media (max-width: 640px) {
  .tenant-dashboard-page {
    padding: 1rem 0.75rem 1.6rem;
  }

  .dashboard-hero {
    border-radius: 18px;
  }

  .filters-panel {
    align-items: stretch;
    flex-direction: column;
  }

  .filters-panel .an-segment {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    border-radius: 14px;
  }

  .filters-panel .an-segment button {
    padding: 0 0.4rem;
    border-radius: 10px;
    font-size: 0.8rem;
  }

  .refresh-button {
    width: 100%;
    margin-left: 0;
  }

  .plan-details {
    grid-template-columns: 1fr;
  }

  .alert-strip {
    flex-wrap: wrap;
  }

  .alert-strip em {
    margin-left: 2.2rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .activity-card {
    transition: none;
  }

  .activity-card:hover {
    transform: none;
  }
}
</style>
