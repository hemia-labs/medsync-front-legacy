<template>
  <section class="dashboard-widget operational-widget" aria-labelledby="operational-summary-title">
    <div class="widget-heading">
      <div>
        <p class="eyebrow">Analisis operativo</p>
        <h2 id="operational-summary-title">Resumen operativo</h2>
      </div>
      <span class="privacy-note">Informacion general</span>
    </div>

    <div v-if="loading" class="widget-state">
      <v-progress-circular indeterminate color="#0f766e" size="28"></v-progress-circular>
      <span>Cargando resumen operativo...</span>
    </div>

    <div v-else-if="error" class="widget-state is-error">
      <v-icon size="28">mdi-alert-circle-outline</v-icon>
      <span>No pudimos cargar el resumen operativo.</span>
      <button type="button" class="widget-action" @click="$emit('retry')">Reintentar</button>
    </div>

    <div v-else-if="isEmpty" class="widget-state is-empty">
      <v-icon size="30">mdi-clipboard-text-search-outline</v-icon>
      <div>
        <strong>No hay actividad operativa registrada en este periodo.</strong>
        <p>Cuando existan citas, recetas o historias clinicas, apareceran aqui de forma resumida.</p>
      </div>
    </div>

    <div v-else class="operational-content">
      <div class="summary-groups">
        <article class="operation-group">
          <div class="group-heading">
            <v-icon size="22">mdi-calendar-check-outline</v-icon>
            <div>
              <strong>Citas</strong>
              <span>{{ formatNumber(appointments.total) }} registradas</span>
            </div>
          </div>
          <div class="mini-metrics">
            <span><strong>{{ formatNumber(appointments.scheduled) }}</strong> programadas</span>
          </div>
          <div class="status-list">
            <span v-for="item in appointmentStatuses" :key="item.status">
              {{ appointmentLabel(item.status) }}
              <strong>{{ formatNumber(item.count) }}</strong>
            </span>
          </div>
        </article>

        <article class="operation-group">
          <div class="group-heading">
            <v-icon size="22">mdi-file-document-edit-outline</v-icon>
            <div>
              <strong>Recetas</strong>
              <span>{{ formatNumber(prescriptions.total) }} totales</span>
            </div>
          </div>
          <div class="mini-metrics">
            <span><strong>{{ formatNumber(prescriptions.issued) }}</strong> emitidas</span>
            <span><strong>{{ formatNumber(prescriptions.drafts) }}</strong> borradores</span>
            <span><strong>{{ formatNumber(prescriptions.cancelled) }}</strong> canceladas</span>
          </div>
          <div class="status-list">
            <span v-for="item in prescriptionStatuses" :key="item.status">
              {{ prescriptionLabel(item.status) }}
              <strong>{{ formatNumber(item.count) }}</strong>
            </span>
          </div>
        </article>

        <article class="operation-group">
          <div class="group-heading">
            <v-icon size="22">mdi-clipboard-check-outline</v-icon>
            <div>
              <strong>Historias clinicas</strong>
              <span>{{ formatNumber(clinicalHistories.total) }} totales</span>
            </div>
          </div>
          <div class="mini-metrics">
            <span><strong>{{ formatNumber(clinicalHistories.finalized) }}</strong> finalizadas</span>
            <span><strong>{{ formatNumber(clinicalHistories.drafts) }}</strong> borradores</span>
            <span><strong>{{ formatNumber(clinicalHistories.pending) }}</strong> pendientes</span>
          </div>
          <div class="status-list">
            <span v-for="item in clinicalHistoryStatuses" :key="item.status">
              {{ clinicalHistoryLabel(item.status) }}
              <strong>{{ formatNumber(item.count) }}</strong>
            </span>
          </div>
        </article>
      </div>

      <div class="comparison-panel">
        <div class="comparison-heading">
          <div>
            <p class="eyebrow">Comparativo</p>
            <h3>Vs periodo anterior</h3>
          </div>
          <small v-if="previousRangeLabel">{{ previousRangeLabel }}</small>
        </div>

        <div class="comparison-grid">
          <article v-for="item in comparisonCards" :key="item.key" class="comparison-card">
            <span>{{ item.label }}</span>
            <strong>{{ formatNumber(item.current) }}</strong>
            <small>
              {{ deltaLabel(item) }}
            </small>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default {
  name: 'DashboardOperationalSummary',
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    data: {
      type: Object,
      default: null
    }
  },
  computed: {
    appointments: function() {
      return this.data && this.data.appointments ? this.data.appointments : {};
    },
    prescriptions: function() {
      return this.data && this.data.prescriptions ? this.data.prescriptions : {};
    },
    clinicalHistories: function() {
      return this.data && this.data.clinicalHistories ? this.data.clinicalHistories : {};
    },
    appointmentStatuses: function() {
      return Array.isArray(this.appointments.byStatus) ? this.appointments.byStatus : [];
    },
    prescriptionStatuses: function() {
      return Array.isArray(this.prescriptions.byStatus) ? this.prescriptions.byStatus : [];
    },
    clinicalHistoryStatuses: function() {
      return Array.isArray(this.clinicalHistories.byStatus) ? this.clinicalHistories.byStatus : [];
    },
    comparison: function() {
      return this.data && this.data.periodComparison ? this.data.periodComparison : {};
    },
    comparisonCards: function() {
      return [
        { key: 'patientsCreated', label: 'Pacientes creados', ...this.metricComparison('patientsCreated') },
        { key: 'appointmentsCreated', label: 'Citas creadas', ...this.metricComparison('appointmentsCreated') },
        { key: 'prescriptionsIssued', label: 'Recetas emitidas', ...this.metricComparison('prescriptionsIssued') },
        { key: 'clinicalHistoriesFinalized', label: 'Historias finalizadas', ...this.metricComparison('clinicalHistoriesFinalized') }
      ];
    },
    previousRangeLabel: function() {
      const range = this.data && this.data.previousRange ? this.data.previousRange : null;
      if(!range || !range.from || !range.to) {
        return '';
      }

      return `${this.formatDate(range.from)} - ${this.formatDate(range.to)}`;
    },
    isEmpty: function() {
      if(!this.data) {
        return true;
      }

      return normalizeNumber(this.appointments.total) === 0
        && normalizeNumber(this.appointments.scheduled) === 0
        && normalizeNumber(this.prescriptions.total) === 0
        && normalizeNumber(this.clinicalHistories.total) === 0
        && this.comparisonCards.every((item) => normalizeNumber(item.current) === 0);
    }
  },
  methods: {
    metricComparison: function(key) {
      const item = this.comparison[key] || {};
      return {
        current: normalizeNumber(item.current),
        previous: normalizeNumber(item.previous),
        delta: normalizeNumber(item.delta),
        deltaPercent: item.deltaPercent === null || item.deltaPercent === undefined ? null : Number(item.deltaPercent)
      };
    },
    appointmentLabel: function(status) {
      const labels = {
        confirmed: 'Confirmadas',
        cancelled: 'Canceladas',
        pending_confirmation: 'Pendientes de confirmar',
        rescheduled: 'Reprogramadas'
      };
      return labels[status] || status || 'Sin estado';
    },
    prescriptionLabel: function(status) {
      const labels = {
        issued: 'Emitidas',
        draft: 'Borradores',
        cancelled: 'Canceladas'
      };
      return labels[status] || status || 'Sin estado';
    },
    clinicalHistoryLabel: function(status) {
      const labels = {
        FINALIZED: 'Finalizadas',
        DRAFT: 'Borradores',
        pending: 'Pendientes'
      };
      return labels[status] || status || 'Sin estado';
    },
    deltaLabel: function(item) {
      const sign = item.delta > 0 ? '+' : '';
      const percent = item.deltaPercent === null
        ? 'sin porcentaje comparable'
        : `${sign}${this.formatNumber(item.deltaPercent)}%`;
      return `${sign}${this.formatNumber(item.delta)} vs anterior (${percent})`;
    },
    formatNumber: function(value) {
      return normalizeNumber(value).toLocaleString('es-MX');
    },
    formatDate: function(value) {
      const parts = String(value || '').split('-');
      if(parts.length !== 3) {
        return value || '';
      }

      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
};
</script>

<style scoped>
.dashboard-widget {
  padding: 1.15rem;
  border: 1px solid rgba(14, 116, 144, 0.12);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.07);
}

.widget-heading,
.comparison-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  color: #0f766e;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

h2,
h3 {
  margin: 0;
  color: #12313a;
  letter-spacing: 0;
}

.privacy-note {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0 0.7rem;
  border-radius: 999px;
  color: #0f766e;
  background: #ecfdf5;
  font-size: 0.8rem;
  font-weight: 800;
}

.widget-state {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-top: 1rem;
  padding: 1rem;
  border: 1px dashed #b7e4df;
  color: #475569;
  background: #f8fdfc;
}

.widget-state.is-error {
  border-color: #fecaca;
  background: #fff7f7;
}

.widget-state.is-empty {
  justify-content: center;
  min-height: 9rem;
  text-align: center;
}

.widget-state strong {
  display: block;
  color: #12313a;
}

.widget-state p {
  margin: 0.25rem 0 0;
  color: #64748b;
  line-height: 1.45;
}

.widget-action {
  min-height: 2.25rem;
  border: 1px solid #b7e4df;
  border-radius: 999px;
  padding: 0 0.8rem;
  color: #0f766e;
  background: #ffffff;
  font-weight: 900;
}

.widget-action:hover {
  color: #ffffff;
  border-color: #0f766e;
  background: #0f766e;
}

.operational-content {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.summary-groups {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.operation-group,
.comparison-panel,
.comparison-card {
  border: 1px solid #e2edf0;
  background: #f8fbfc;
}

.operation-group {
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
}

.group-heading {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;
  align-items: center;
}

.group-heading .v-icon {
  display: grid;
  place-items: center;
  width: 2.45rem;
  height: 2.45rem;
  border-radius: 0.75rem;
  color: #0f766e;
  background: #dff7f4;
}

.group-heading strong,
.group-heading span {
  display: block;
}

.group-heading strong {
  color: #12313a;
  font-size: 1.02rem;
}

.group-heading span,
.status-list span,
.comparison-heading small,
.comparison-card span,
.comparison-card small {
  color: #64748b;
  font-size: 0.82rem;
}

.mini-metrics,
.status-list {
  display: grid;
  gap: 0.4rem;
}

.mini-metrics {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.mini-metrics span,
.status-list span {
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.mini-metrics strong,
.status-list strong {
  color: #12313a;
}

.comparison-panel {
  padding: 1rem;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.9rem;
}

.comparison-card {
  display: grid;
  gap: 0.25rem;
  padding: 0.85rem;
  background: #ffffff;
}

.comparison-card strong {
  color: #12313a;
  font-size: 1.7rem;
}

html[data-theme="clinical-night"] .dashboard-widget {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.88);
}

html[data-theme="clinical-night"] h2,
html[data-theme="clinical-night"] h3,
html[data-theme="clinical-night"] .widget-state strong,
html[data-theme="clinical-night"] .group-heading strong,
html[data-theme="clinical-night"] .mini-metrics strong,
html[data-theme="clinical-night"] .status-list strong,
html[data-theme="clinical-night"] .comparison-card strong {
  color: #e2e8f0;
}

html[data-theme="clinical-night"] .operation-group,
html[data-theme="clinical-night"] .comparison-panel,
html[data-theme="clinical-night"] .comparison-card,
html[data-theme="clinical-night"] .mini-metrics span,
html[data-theme="clinical-night"] .status-list span {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(30, 41, 59, 0.76);
}

html[data-theme="clinical-night"] .group-heading span,
html[data-theme="clinical-night"] .status-list span,
html[data-theme="clinical-night"] .comparison-heading small,
html[data-theme="clinical-night"] .comparison-card span,
html[data-theme="clinical-night"] .comparison-card small,
html[data-theme="clinical-night"] .widget-state p,
html[data-theme="clinical-night"] .widget-state {
  color: #94a3b8;
}

@media (max-width: 1100px) {
  .summary-groups,
  .comparison-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .widget-heading,
  .comparison-heading {
    flex-direction: column;
  }

  .summary-groups,
  .comparison-grid,
  .mini-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
