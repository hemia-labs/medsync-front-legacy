<template>
  <section class="an-card professional-widget" aria-labelledby="professional-breakdown-title">
    <div class="an-heading">
      <div>
        <p class="an-eyebrow">Actividad clinica documentada</p>
        <h2 id="professional-breakdown-title">Actividad por profesional</h2>
        <span class="an-description">Actividad general por profesional, sin datos de pacientes.</span>
      </div>
      <span class="an-chip"><v-icon size="15">mdi-shield-lock-outline</v-icon>Sin nombres de pacientes</span>
    </div>

    <div v-if="loading" class="an-state">
      <v-progress-circular indeterminate color="#0f766e" size="28"></v-progress-circular>
      <span>Cargando actividad por profesional...</span>
    </div>

    <div v-else-if="error" class="an-state is-error">
      <v-icon size="28">mdi-alert-circle-outline</v-icon>
      <span>No pudimos cargar la actividad por profesional.</span>
      <button type="button" class="an-button" @click="$emit('retry')">Reintentar</button>
    </div>

    <div v-else-if="isEmpty" class="an-state is-empty">
      <v-icon size="30">mdi-account-tie-outline</v-icon>
      <div>
        <strong>No hay actividad profesional registrada en este periodo.</strong>
        <p>Cambia el rango o espera a que se emitan recetas o se finalicen historias.</p>
      </div>
    </div>

    <div v-else class="professional-content">
      <div class="total-grid" aria-label="Resumen por profesional">
        <article v-for="metric in totalMetrics" :key="metric.key" class="total-card">
          <strong>{{ formatNumber(metric.value) }}</strong>
          <small>{{ metric.label }}</small>
        </article>
      </div>

      <div class="professional-list" aria-label="Actividad general por profesional">
        <article v-for="(item, index) in limitedItems" :key="item.professionalKey || item.label" class="an-tile professional-row">
          <div class="professional-main">
            <div class="professional-avatar" :class="'avatar-' + (index % 4)" aria-hidden="true">
              {{ initialsFor(item.label) }}
            </div>
            <div class="professional-copy">
              <strong>{{ item.label || 'Profesional sin alias' }}</strong>
              <span class="professional-role">{{ item.roleLabel || 'Rol sin etiqueta' }}</span>
            </div>
            <b class="professional-total">{{ formatNumber(totalActivity(item)) }}</b>
          </div>

          <div class="an-meter" aria-hidden="true">
            <span :style="{ width: widthFor(item) + '%' }"></span>
          </div>
          <span class="professional-caption">{{ formatNumber(totalActivity(item)) }} recetas emitidas e historias finalizadas</span>

          <div class="metric-chips">
            <span v-if="hasMetric(item, 'prescriptionsIssued')">
              <v-icon size="16">mdi-file-document-edit-outline</v-icon>
              {{ formatNumber(item.prescriptionsIssued) }} recetas
            </span>
            <span v-if="hasMetric(item, 'clinicalHistoriesCreated')">
              <v-icon size="16">mdi-clipboard-plus-outline</v-icon>
              {{ formatNumber(item.clinicalHistoriesCreated) }} creadas
            </span>
            <span v-if="hasMetric(item, 'clinicalHistoriesUpdated')">
              <v-icon size="16">mdi-clipboard-edit-outline</v-icon>
              {{ formatNumber(item.clinicalHistoriesUpdated) }} editadas
            </span>
            <span v-if="hasMetric(item, 'clinicalHistoriesFinalized')">
              <v-icon size="16">mdi-clipboard-check-outline</v-icon>
              {{ formatNumber(item.clinicalHistoriesFinalized) }} finalizadas
            </span>
            <span v-if="hasMetric(item, 'documentsSigned')">
              <v-icon size="16">mdi-file-sign-outline</v-icon>
              {{ formatNumber(item.documentsSigned) }} documentos
            </span>
          </div>
        </article>
      </div>
      <p class="an-note">Las cifras se atribuyen al doctor responsable cuando esta registrado; los registros sin atribucion se muestran por separado. La captura o edicion de un asistente no se considera un acto medico propio. Los indicadores no medidos aparecen como No disponible.</p>
    </div>
  </section>
</template>

<script>
import { formatMetric, hasMetric, sumMetric } from '../../../domain/dashboard/metrics';

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default {
  name: 'DashboardProfessionalBreakdown',
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
    items: function() {
      return this.data && Array.isArray(this.data.items) ? this.data.items : [];
    },
    limitedItems: function() {
      return this.items.slice(0, 8);
    },
    maxTotal: function() {
      return Math.max.apply(null, this.items.map((item) => this.totalActivity(item)).concat([1]));
    },
    totals: function() {
      return ['prescriptionsIssued', 'clinicalHistoriesCreated', 'clinicalHistoriesUpdated',
        'clinicalHistoriesFinalized', 'documentsSigned'].reduce((totals, key) => {
        totals[key] = sumMetric(this.items, key);
        return totals;
      }, {});
    },
    totalMetrics: function() {
      return [
        { key: 'professionals', label: 'Profesionales identificados', value: this.items.filter(item => item.professionalKey !== 'unassigned').length },
        { key: 'clinicalHistoriesCreated', label: 'Historias creadas', value: this.totals.clinicalHistoriesCreated },
        { key: 'clinicalHistoriesUpdated', label: 'Historias editadas', value: this.totals.clinicalHistoriesUpdated },
        { key: 'clinicalHistoriesFinalized', label: 'Historias finalizadas', value: this.totals.clinicalHistoriesFinalized },
        { key: 'prescriptionsIssued', label: 'Recetas', value: this.totals.prescriptionsIssued },
        { key: 'documentsSigned', label: 'Documentos', value: this.totals.documentsSigned }
      ].filter(metric => metric.key === 'professionals' || this.items.some(item => hasMetric(item, metric.key)));
    },
    isEmpty: function() {
      return !this.items.length;
    }
  },
  methods: {
    hasMetric,
    totalActivity: function(item) {
      return normalizeNumber(item.prescriptionsIssued)
        + normalizeNumber(item.clinicalHistoriesFinalized);
    },
    widthFor: function(item) {
      const total = this.totalActivity(item);
      if(total <= 0) {
        return 0;
      }

      return Math.max(8, Math.round((total / this.maxTotal) * 100));
    },
    initialsFor: function(label) {
      const parts = String(label || 'P')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

      return parts.map((part) => part.charAt(0)).join('').toUpperCase() || 'P';
    },
    formatNumber: function(value) {
      return formatMetric(value);
    }
  }
};
</script>

<style scoped>
.professional-content {
  display: grid;
  gap: 1rem;
  margin-top: 1.1rem;
}

.total-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 7.5rem), 1fr));
  gap: 0.5rem;
  padding: 0.85rem;
  border-radius: var(--an-radius-sm);
  background: var(--an-surface-2);
}

.total-card {
  display: grid;
  gap: 0.1rem;
  padding: 0 0.4rem;
  border-left: 2px solid var(--an-border);
}

.total-card strong {
  color: var(--an-ink);
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.2;
}

.total-card small {
  color: var(--an-muted);
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.3;
}

.professional-list {
  display: grid;
  gap: 0.6rem;
}

.professional-row {
  display: grid;
  gap: 0.55rem;
}

.professional-main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
}

.professional-avatar {
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 50%;
  color: #ffffff;
  background: #0f766e;
  font-size: 0.86rem;
  font-weight: 600;
}

.professional-avatar.avatar-1 { background: #1f5f9c; }
.professional-avatar.avatar-2 { background: #5a48b8; }
.professional-avatar.avatar-3 { background: #a23f6b; }

.professional-copy {
  min-width: 0;
}

.professional-copy strong,
.professional-copy span {
  display: block;
  overflow-wrap: anywhere;
}

.professional-copy strong {
  color: var(--an-ink);
}

.professional-role,
.professional-caption {
  color: var(--an-muted);
  font-size: 0.8rem;
}

.professional-total {
  color: var(--an-ink);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.metric-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.metric-chips span {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 1.75rem;
  padding: 0 0.6rem;
  border-radius: 999px;
  color: var(--an-ink-2);
  background: var(--an-surface-2);
  font-size: 0.78rem;
  font-weight: 600;
}

.metric-chips .v-icon {
  color: var(--an-accent) !important;
}
</style>
