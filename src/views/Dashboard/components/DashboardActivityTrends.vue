<template>
  <section class="dashboard-widget trends-widget" aria-labelledby="activity-trends-title">
    <div class="widget-heading">
      <div>
        <p class="eyebrow">Tendencia</p>
        <h2 id="activity-trends-title">Tendencia de actividad</h2>
      </div>

      <div class="granularity-control" aria-label="Granularidad de tendencia">
        <button
          v-for="option in granularityOptions"
          :key="option.value"
          type="button"
          :class="['granularity-button', { 'is-active': granularity === option.value }]"
          :disabled="loading"
          @click="$emit('granularity-change', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="widget-state">
      <v-progress-circular indeterminate color="#0f766e" size="28"></v-progress-circular>
      <span>Cargando tendencia...</span>
    </div>

    <div v-else-if="error" class="widget-state is-error">
      <v-icon size="28">mdi-alert-circle-outline</v-icon>
      <span>No pudimos cargar la tendencia de actividad.</span>
      <button type="button" class="widget-action" @click="$emit('retry')">Reintentar</button>
    </div>

    <div v-else-if="isEmpty" class="widget-state is-empty">
      <v-icon size="30">mdi-chart-line-variant</v-icon>
      <div>
        <strong>Aun no hay datos para graficar en este periodo.</strong>
        <p>Cambia el rango o espera a que se registre actividad.</p>
      </div>
    </div>

    <div v-else class="trend-content">
      <div class="trend-totals">
        <article v-for="metric in metricTotals" :key="metric.key" class="trend-total">
          <small>{{ metric.label }}</small>
          <strong>{{ formatNumber(metric.value) }}</strong>
        </article>
      </div>

      <div class="trend-periods" aria-label="Series de actividad por periodo">
        <article v-for="item in limitedSeries" :key="item.period" class="trend-row">
          <div class="period-label">
            <strong>{{ item.period }}</strong>
            <span>{{ formatNumber(periodTotal(item)) }} eventos</span>
          </div>

          <div class="period-bars">
            <span
              v-for="metric in metricDefinitions"
              :key="metric.key"
              class="period-bar"
              :style="{ width: metricWidth(item, metric.key) + '%', background: metric.color }"
              :title="`${metric.label}: ${formatNumber(item[metric.key])}`"
            ></span>
          </div>

          <div class="period-values">
            <span v-for="metric in metricDefinitions" :key="metric.key">
              {{ metric.short }} {{ formatNumber(item[metric.key]) }}
            </span>
          </div>
        </article>
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
  name: 'DashboardActivityTrends',
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
    },
    granularity: {
      type: String,
      default: 'month'
    }
  },
  data: function() {
    return {
      granularityOptions: [
        { value: 'day', label: 'Dia' },
        { value: 'week', label: 'Semana' },
        { value: 'month', label: 'Mes' }
      ],
      metricDefinitions: [
        { key: 'patientsCreated', label: 'Pacientes creados', short: 'Pac.', color: '#0f766e' },
        { key: 'appointmentsCreated', label: 'Citas registradas', short: 'Citas', color: '#0369a1' },
        { key: 'appointmentsScheduled', label: 'Citas programadas', short: 'Prog.', color: '#7c3aed' },
        { key: 'prescriptionsIssued', label: 'Recetas emitidas', short: 'Rec.', color: '#be123c' },
        { key: 'clinicalHistoriesFinalized', label: 'Historias finalizadas', short: 'Hist.', color: '#b45309' }
      ]
    };
  },
  computed: {
    series: function() {
      return this.data && Array.isArray(this.data.series) ? this.data.series : [];
    },
    limitedSeries: function() {
      return this.series.slice(-12);
    },
    maxPeriodTotal: function() {
      return Math.max.apply(null, this.series.map((item) => this.periodTotal(item)).concat([1]));
    },
    metricTotals: function() {
      return this.metricDefinitions.map((metric) => ({
        ...metric,
        value: this.series.reduce((acc, item) => acc + normalizeNumber(item[metric.key]), 0)
      }));
    },
    isEmpty: function() {
      if(!this.series.length) {
        return true;
      }

      return this.metricTotals.every((metric) => metric.value === 0);
    }
  },
  methods: {
    periodTotal: function(item) {
      return this.metricDefinitions.reduce((acc, metric) => acc + normalizeNumber(item[metric.key]), 0);
    },
    metricWidth: function(item, key) {
      const value = normalizeNumber(item[key]);
      if(value <= 0) {
        return 0;
      }

      return Math.max(6, Math.round((value / this.maxPeriodTotal) * 100));
    },
    formatNumber: function(value) {
      return normalizeNumber(value).toLocaleString('es-MX');
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

.widget-heading {
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

h2 {
  margin: 0;
  color: #12313a;
  letter-spacing: 0;
}

.granularity-control {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.granularity-button,
.widget-action {
  min-height: 2.25rem;
  border: 1px solid #b7e4df;
  border-radius: 999px;
  padding: 0 0.8rem;
  color: #0f766e;
  background: #ffffff;
  font-weight: 900;
}

.granularity-button.is-active,
.granularity-button:hover,
.widget-action:hover {
  color: #ffffff;
  border-color: #0f766e;
  background: #0f766e;
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

.trend-content {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.trend-totals {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.65rem;
}

.trend-total {
  padding: 0.75rem;
  border: 1px solid #e2edf0;
  background: #f8fbfc;
}

.trend-total small {
  display: block;
  color: #64748b;
  font-weight: 800;
}

.trend-total strong {
  display: block;
  margin-top: 0.2rem;
  color: #12313a;
  font-size: 1.45rem;
}

.trend-periods {
  display: grid;
  gap: 0.7rem;
}

.trend-row {
  display: grid;
  grid-template-columns: minmax(7rem, 0.36fr) minmax(10rem, 1fr) minmax(12rem, 0.8fr);
  gap: 0.8rem;
  align-items: center;
  padding: 0.8rem;
  border: 1px solid #e2edf0;
  background: #ffffff;
}

.period-label strong,
.period-label span {
  display: block;
}

.period-label strong {
  color: #12313a;
}

.period-label span,
.period-values span {
  color: #64748b;
  font-size: 0.8rem;
}

.period-bars {
  display: flex;
  align-items: center;
  gap: 0.22rem;
  min-height: 0.75rem;
}

.period-bar {
  display: block;
  height: 0.72rem;
  min-width: 0;
  border-radius: 999px;
}

.period-values {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.7rem;
}

html[data-theme="clinical-night"] .dashboard-widget {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.88);
}

html[data-theme="clinical-night"] h2,
html[data-theme="clinical-night"] .widget-state strong,
html[data-theme="clinical-night"] .trend-total strong,
html[data-theme="clinical-night"] .period-label strong {
  color: #e2e8f0;
}

html[data-theme="clinical-night"] .trend-total,
html[data-theme="clinical-night"] .trend-row {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(30, 41, 59, 0.76);
}

html[data-theme="clinical-night"] .trend-total small,
html[data-theme="clinical-night"] .period-label span,
html[data-theme="clinical-night"] .period-values span,
html[data-theme="clinical-night"] .widget-state p,
html[data-theme="clinical-night"] .widget-state {
  color: #94a3b8;
}

@media (max-width: 1100px) {
  .trend-totals {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trend-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .widget-heading {
    flex-direction: column;
  }

  .granularity-control,
  .granularity-button {
    width: 100%;
  }

  .trend-totals {
    grid-template-columns: 1fr;
  }
}
</style>
