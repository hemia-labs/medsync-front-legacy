<template>
  <section class="dashboard-widget professional-widget" aria-labelledby="professional-breakdown-title">
    <div class="widget-heading">
      <div>
        <p class="eyebrow">Rendimiento clinico</p>
        <h2 id="professional-breakdown-title">Actividad por profesional</h2>
        <span class="widget-description">Actividad general por profesional, sin datos de pacientes.</span>
      </div>
      <span class="privacy-note">Sin nombres de pacientes</span>
    </div>

    <div v-if="loading" class="widget-state">
      <v-progress-circular indeterminate color="#0f766e" size="28"></v-progress-circular>
      <span>Cargando actividad por profesional...</span>
    </div>

    <div v-else-if="error" class="widget-state is-error">
      <v-icon size="28">mdi-alert-circle-outline</v-icon>
      <span>No pudimos cargar la actividad por profesional.</span>
      <button type="button" class="widget-action" @click="$emit('retry')">Reintentar</button>
    </div>

    <div v-else-if="isEmpty" class="widget-state is-empty">
      <v-icon size="30">mdi-account-tie-outline</v-icon>
      <div>
        <strong>No hay actividad profesional registrada en este periodo.</strong>
        <p>Cambia el rango o espera a que se registren recetas, historias o documentos.</p>
      </div>
    </div>

    <div v-else class="professional-content">
      <div class="total-grid" aria-label="Resumen por profesional">
        <article v-for="metric in totalMetrics" :key="metric.key" class="total-card">
          <small>{{ metric.label }}</small>
          <strong>{{ formatNumber(metric.value) }}</strong>
        </article>
      </div>

      <div class="professional-list" aria-label="Actividad general por profesional">
        <article v-for="item in limitedItems" :key="item.professionalKey || item.label" class="professional-row">
          <div class="professional-main">
            <div class="professional-avatar" aria-hidden="true">
              {{ initialsFor(item.label) }}
            </div>
            <div class="professional-copy">
              <strong>{{ item.label || 'Profesional sin alias' }}</strong>
              <span class="professional-role">{{ item.roleLabel || 'Rol sin etiqueta' }}</span>
              <span>{{ formatNumber(totalActivity(item)) }} movimientos registrados</span>
            </div>
          </div>

          <div class="activity-bar" aria-hidden="true">
            <span :style="{ width: widthFor(item) + '%' }"></span>
          </div>

          <div class="metric-chips">
            <span>
              <v-icon size="16">mdi-file-document-edit-outline</v-icon>
              {{ formatNumber(item.prescriptionsIssued) }} recetas
            </span>
            <span>
              <v-icon size="16">mdi-clipboard-plus-outline</v-icon>
              {{ formatNumber(item.clinicalHistoriesCreated) }} creadas
            </span>
            <span>
              <v-icon size="16">mdi-clipboard-edit-outline</v-icon>
              {{ formatNumber(item.clinicalHistoriesUpdated) }} editadas
            </span>
            <span>
              <v-icon size="16">mdi-clipboard-check-outline</v-icon>
              {{ formatNumber(item.clinicalHistoriesFinalized) }} finalizadas
            </span>
            <span>
              <v-icon size="16">mdi-file-sign-outline</v-icon>
              {{ formatNumber(item.documentsSigned) }} documentos
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
      return this.items.reduce((acc, item) => ({
        prescriptionsIssued: acc.prescriptionsIssued + normalizeNumber(item.prescriptionsIssued),
        clinicalHistoriesCreated: acc.clinicalHistoriesCreated + normalizeNumber(item.clinicalHistoriesCreated),
        clinicalHistoriesUpdated: acc.clinicalHistoriesUpdated + normalizeNumber(item.clinicalHistoriesUpdated),
        clinicalHistoriesFinalized: acc.clinicalHistoriesFinalized + normalizeNumber(item.clinicalHistoriesFinalized),
        documentsSigned: acc.documentsSigned + normalizeNumber(item.documentsSigned)
      }), {
        prescriptionsIssued: 0,
        clinicalHistoriesCreated: 0,
        clinicalHistoriesUpdated: 0,
        clinicalHistoriesFinalized: 0,
        documentsSigned: 0
      });
    },
    totalMetrics: function() {
      return [
        { key: 'professionals', label: 'Profesionales', value: this.items.length },
        { key: 'clinicalHistoriesCreated', label: 'Historias creadas', value: this.totals.clinicalHistoriesCreated },
        { key: 'clinicalHistoriesUpdated', label: 'Historias editadas', value: this.totals.clinicalHistoriesUpdated },
        { key: 'clinicalHistoriesFinalized', label: 'Historias finalizadas', value: this.totals.clinicalHistoriesFinalized },
        { key: 'prescriptionsIssued', label: 'Recetas', value: this.totals.prescriptionsIssued },
        { key: 'documentsSigned', label: 'Documentos', value: this.totals.documentsSigned }
      ];
    },
    isEmpty: function() {
      if(!this.items.length) {
        return true;
      }

      return this.items.every((item) => this.totalActivity(item) === 0);
    }
  },
  methods: {
    totalActivity: function(item) {
      return normalizeNumber(item.prescriptionsIssued)
        + normalizeNumber(item.clinicalHistoriesCreated)
        + normalizeNumber(item.clinicalHistoriesUpdated)
        + normalizeNumber(item.clinicalHistoriesFinalized)
        + normalizeNumber(item.documentsSigned);
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

.widget-description {
  display: block;
  margin-top: 0.28rem;
  color: #64748b;
  line-height: 1.4;
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
  white-space: nowrap;
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

.professional-content {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.total-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7.4rem, 1fr));
  gap: 0.65rem;
}

.total-card,
.professional-row {
  border: 1px solid #e2edf0;
  background: #f8fbfc;
}

.total-card {
  padding: 0.78rem;
}

.total-card small {
  display: block;
  color: #64748b;
  font-weight: 800;
}

.total-card strong {
  display: block;
  margin-top: 0.2rem;
  color: #12313a;
  font-size: 1.45rem;
}

.professional-list {
  display: grid;
  gap: 0.72rem;
}

.professional-row {
  display: grid;
  gap: 0.78rem;
  padding: 0.9rem;
}

.professional-main {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.72rem;
  align-items: center;
}

.professional-avatar {
  display: grid;
  place-items: center;
  width: 2.55rem;
  height: 2.55rem;
  border-radius: 0.85rem;
  color: #0f766e;
  background: #dff7f4;
  font-weight: 900;
}

.professional-copy strong,
.professional-copy span {
  display: block;
}

.professional-copy strong {
  color: #12313a;
}

.professional-copy span {
  color: #64748b;
  font-size: 0.84rem;
}

.professional-copy .professional-role {
  display: inline-flex;
  width: fit-content;
  margin: 0.24rem 0;
  padding: 0.12rem 0.5rem;
  border: 1px solid #cfece7;
  border-radius: 999px;
  color: #0f766e;
  background: #f3fbf9;
  font-size: 0.74rem;
  font-weight: 900;
}

.activity-bar {
  height: 0.48rem;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.activity-bar span {
  display: block;
  height: 100%;
  max-width: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0f766e, #4f9d99);
}

.metric-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.metric-chips span {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 2rem;
  padding: 0 0.62rem;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  color: #334155;
  background: #ffffff;
  font-size: 0.8rem;
  font-weight: 800;
}

.metric-chips .v-icon {
  color: #0f766e;
}

html[data-theme="clinical-night"] .dashboard-widget {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.88);
}

html[data-theme="clinical-night"] h2,
html[data-theme="clinical-night"] .widget-state strong,
html[data-theme="clinical-night"] .total-card strong,
html[data-theme="clinical-night"] .professional-copy strong {
  color: #e2e8f0;
}

html[data-theme="clinical-night"] .widget-description,
html[data-theme="clinical-night"] .widget-state,
html[data-theme="clinical-night"] .widget-state p,
html[data-theme="clinical-night"] .total-card small,
html[data-theme="clinical-night"] .professional-copy span {
  color: #94a3b8;
}

html[data-theme="clinical-night"] .total-card,
html[data-theme="clinical-night"] .professional-row,
html[data-theme="clinical-night"] .professional-copy .professional-role,
html[data-theme="clinical-night"] .metric-chips span {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(30, 41, 59, 0.76);
}

html[data-theme="clinical-night"] .metric-chips span {
  color: #cbd5e1;
}

@media (max-width: 900px) {
  .widget-heading {
    flex-direction: column;
  }

  .total-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .total-grid {
    grid-template-columns: 1fr;
  }

  .widget-state,
  .professional-main {
    grid-template-columns: 1fr;
  }
}
</style>
