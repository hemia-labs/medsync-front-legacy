<template>
  <section class="an-card trends-widget" aria-labelledby="activity-trends-title">
    <div class="an-heading">
      <div>
        <p class="an-eyebrow">Tendencia</p>
        <h2 id="activity-trends-title">Tendencia de actividad</h2>
      </div>

      <div class="an-segment" role="group" aria-label="Granularidad de tendencia">
        <button
          v-for="option in granularityOptions"
          :key="option.value"
          type="button"
          :class="{ 'is-active': granularity === option.value }"
          :aria-pressed="granularity === option.value"
          :disabled="loading"
          @click="$emit('granularity-change', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="an-state">
      <v-progress-circular indeterminate color="#0f766e" size="28"></v-progress-circular>
      <span>Cargando tendencia...</span>
    </div>

    <div v-else-if="error" class="an-state is-error">
      <v-icon size="28">mdi-alert-circle-outline</v-icon>
      <span>No pudimos cargar la tendencia de actividad.</span>
      <button type="button" class="an-button" @click="$emit('retry')">Reintentar</button>
    </div>

    <div v-else-if="isEmpty" class="an-state is-empty">
      <v-icon size="30">mdi-chart-line-variant</v-icon>
      <div>
        <strong>Aun no hay datos para graficar en este periodo.</strong>
        <p>Cambia el rango o espera a que se registre actividad.</p>
      </div>
    </div>

    <div v-else class="trend-content">
      <p class="trend-readout" aria-live="polite">
        <span>Periodo destacado</span>
        <strong>{{ activeItem.period }}</strong>
        <em>Suma de indicadores: {{ formatNumber(periodTotal(activeItem)) }}</em>
      </p>

      <div class="trend-multiples" @mouseleave="hoverIndex = null">
        <article v-for="metric in metricCharts" :key="metric.key" class="an-tile trend-metric">
          <header>
            <i class="an-dot" :style="{ background: metric.color }" aria-hidden="true"></i>
            <small>{{ metric.label }}</small>
          </header>
          <div class="metric-figures">
            <strong>{{ formatNumber(metric.value) }}</strong>
            <span>{{ activeItem.period }}: <b>{{ formatNumber(activeItem[metric.key]) }}</b></span>
          </div>
          <div class="metric-columns" role="group" :aria-label="metric.label + ' por periodo'">
            <button
              v-for="(bar, index) in metric.bars"
              :key="bar.period"
              type="button"
              :class="['metric-column', { 'is-active': index === activeIndex }]"
              :title="bar.title"
              :aria-label="bar.title"
              @mouseenter="hoverIndex = index"
              @focus="pinnedIndex = index"
              @click="pinnedIndex = index"
            >
              <span :style="{ height: bar.height + '%', background: metric.color }"></span>
            </button>
          </div>
          <footer>
            <span>{{ firstPeriod }}</span>
            <span>máx. {{ formatNumber(metric.max) }}</span>
            <span>{{ lastPeriod }}</span>
          </footer>
        </article>
      </div>

      <details class="an-details trend-table">
        <summary>Ver cifras por periodo</summary>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Periodo</th>
                <th v-for="metric in metricDefinitions" :key="metric.key" scope="col">{{ metric.label }}</th>
                <th scope="col">Suma de indicadores</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in limitedSeries" :key="item.period">
                <th scope="row">{{ item.period }}</th>
                <td v-for="metric in metricDefinitions" :key="metric.key">{{ formatNumber(item[metric.key]) }}</td>
                <td>{{ formatNumber(periodTotal(item)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>

      <p class="an-note">Un mismo registro puede aparecer en mas de un indicador; la suma no representa consultas distintas.</p>
    </div>
  </section>
</template>

<script>
import { formatMetric, hasMetric, metricNumber, sumMetric } from '../../../domain/dashboard/metrics';

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
      hoverIndex: null,
      pinnedIndex: null,
      granularityOptions: [
        { value: 'day', label: 'Dia' },
        { value: 'week', label: 'Semana' },
        { value: 'month', label: 'Mes' }
      ],
      // El color pertenece al indicador: es el mismo en las tarjetas del periodo.
      allMetricDefinitions: [
        { key: 'patientsCreated', label: 'Pacientes creados', short: 'Pac.', color: 'var(--an-series-1)' },
        { key: 'appointmentsCreated', label: 'Citas registradas', short: 'Citas', color: 'var(--an-series-2)' },
        { key: 'appointmentsScheduled', label: 'Citas programadas', short: 'Prog.', color: 'var(--an-series-3)' },
        { key: 'prescriptionsIssued', label: 'Recetas emitidas', short: 'Rec.', color: 'var(--an-series-4)' },
        { key: 'clinicalHistoriesFinalized', label: 'Historias finalizadas', short: 'Hist.', color: 'var(--an-series-5)' }
      ]
    };
  },
  watch: {
    data: function() {
      this.hoverIndex = null;
      this.pinnedIndex = null;
    }
  },
  computed: {
    metricDefinitions: function() {
      return this.allMetricDefinitions.filter(metric => this.series.some(item => hasMetric(item, metric.key)));
    },
    series: function() {
      return this.data && Array.isArray(this.data.series) ? this.data.series : [];
    },
    limitedSeries: function() {
      return this.series.slice(-12);
    },
    activeIndex: function() {
      const last = this.limitedSeries.length - 1;
      const index = this.hoverIndex !== null ? this.hoverIndex : this.pinnedIndex !== null ? this.pinnedIndex : last;
      return Math.min(Math.max(index, 0), last);
    },
    activeItem: function() {
      return this.limitedSeries[this.activeIndex] || {};
    },
    firstPeriod: function() {
      return this.limitedSeries.length ? this.limitedSeries[0].period : '';
    },
    lastPeriod: function() {
      return this.limitedSeries.length > 1 ? this.limitedSeries[this.limitedSeries.length - 1].period : '';
    },
    metricTotals: function() {
      return this.metricDefinitions.map((metric) => ({
        ...metric,
        value: sumMetric(this.series, metric.key)
      }));
    },
    metricCharts: function() {
      return this.metricTotals.map((metric) => {
        const max = Math.max.apply(null, this.limitedSeries.map(item => normalizeNumber(item[metric.key])).concat([0]));
        return {
          ...metric,
          max,
          summary: `${metric.label} por periodo: ` + this.limitedSeries
            .map(item => `${item.period}, ${this.formatNumber(item[metric.key])}`).join('; '),
          bars: this.limitedSeries.map((item) => {
            const value = normalizeNumber(item[metric.key]);
            return {
              period: item.period,
              title: `${item.period} · ${metric.label}: ${this.formatNumber(item[metric.key])}`,
              height: value <= 0 || max <= 0 ? 0 : Math.max(6, Math.round((value / max) * 100))
            };
          })
        };
      });
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
      if(!this.metricDefinitions.some(metric => metricNumber(item[metric.key]) !== null)) return null;
      return this.metricDefinitions.reduce((acc, metric) => acc + normalizeNumber(item[metric.key]), 0);
    },
    formatNumber: function(value) {
      return formatMetric(value);
    }
  }
};
</script>

<style scoped>
.trend-content {
  display: grid;
  gap: 0.9rem;
  margin-top: 1.1rem;
}

.trend-readout {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem 0.7rem;
  margin: 0;
  color: var(--an-muted);
  font-size: 0.84rem;
}

.trend-readout span {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.trend-readout strong {
  color: var(--an-ink);
  font-size: 1.05rem;
}

.trend-readout em {
  font-style: normal;
}

.trend-multiples {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
  gap: 0.75rem;
}

.trend-metric {
  display: grid;
  gap: 0.45rem;
}

.trend-metric header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.trend-metric header small {
  color: var(--an-ink-2);
  font-size: 0.82rem;
  font-weight: 600;
}

.metric-figures {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.metric-figures strong {
  color: var(--an-ink);
  font-size: 1.7rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.metric-figures span {
  color: var(--an-muted);
  font-size: 0.78rem;
}

.metric-figures b {
  color: var(--an-ink);
  font-weight: 600;
}

.metric-columns {
  display: flex;
  align-items: stretch;
  gap: 2px;
  height: 5rem;
  border-bottom: 1px solid var(--an-border);
}

.metric-column {
  display: flex;
  flex: 1 1 0;
  align-items: flex-end;
  min-width: 0;
  padding: 0 1px;
  border-radius: 6px 6px 0 0;
  cursor: default;
}

.metric-column span {
  display: block;
  width: 100%;
  max-width: 1.5rem;
  margin: 0 auto;
  border-radius: 4px 4px 0 0;
  opacity: 0.55;
  transition: opacity 140ms ease, height 400ms ease;
}

.metric-column.is-active {
  background: var(--an-surface-2);
}

.metric-column.is-active span,
.metric-column:hover span {
  opacity: 1;
}

.metric-column:focus-visible {
  outline: 2px solid var(--an-accent);
  outline-offset: 1px;
}

.trend-metric footer {
  display: flex;
  justify-content: space-between;
  gap: 0.4rem;
  color: var(--an-muted);
  font-size: 0.7rem;
}

.table-scroll {
  margin-top: 0.6rem;
  overflow-x: auto;
}

.trend-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.trend-table th,
.trend-table td {
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid var(--an-border);
  color: var(--an-ink-2);
  text-align: right;
  white-space: nowrap;
}

.trend-table th:first-child {
  text-align: left;
}

.trend-table thead th {
  color: var(--an-muted);
  font-size: 0.74rem;
  font-weight: 600;
  white-space: normal;
}

.trend-table tbody th {
  color: var(--an-ink);
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .metric-column span {
    transition: none;
  }
}
</style>
