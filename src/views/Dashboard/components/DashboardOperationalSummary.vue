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
      <div v-if="priorityActions.length" class="priority-panel">
        <div class="decision-heading">
          <div>
            <p class="eyebrow">Que atender primero</p>
            <h3>Lectura automatica</h3>
          </div>
          <small>Usa datos ya visibles</small>
        </div>

        <div class="priority-grid">
          <article v-for="item in priorityActions" :key="item.key" :class="['priority-card', 'tone-' + item.tone]">
            <v-icon size="22">{{ item.icon }}</v-icon>
            <div>
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.impact }}</small>
              <em>{{ item.nextStep }}</em>
            </div>
          </article>
        </div>

        <p class="interpretation-note panel-note">
          Como leerlo: este bloque no agrega mas numeros; toma los indicadores del resumen y los ordena como una lista de trabajo para decidir que conviene revisar primero.
        </p>
      </div>

      <div class="summary-groups">
        <article v-if="hasGroup('appointments')" class="operation-group">
          <div class="group-heading">
            <v-icon size="22">mdi-calendar-check-outline</v-icon>
            <div>
              <strong>Citas</strong>
              <span>{{ formatNumber(appointments.total) }} creadas en el periodo</span>
            </div>
          </div>
          <div class="metric-grid">
            <span class="metric-tile"><strong>{{ formatNumber(appointments.scheduled) }}</strong> con fecha en el periodo</span>
          </div>
          <div class="status-list">
            <span v-for="item in appointmentStatuses" :key="item.status">
              {{ appointmentLabel(item.status) }}
              <strong>{{ formatNumber(item.count) }}</strong>
            </span>
          </div>
          <p class="interpretation-note">
            {{ appointments.dateBasis || 'Estado actual de citas con fecha en el periodo.' }}. Las citas creadas pueden estar programadas para otro periodo.
          </p>
        </article>

        <article v-if="hasGroup('prescriptions')" class="operation-group">
          <div class="group-heading">
            <v-icon size="22">mdi-file-document-edit-outline</v-icon>
            <div>
              <strong>Recetas</strong>
              <span>{{ formatNumber(prescriptions.total) }} totales</span>
            </div>
          </div>
          <div class="metric-grid">
            <span class="metric-tile"><strong>{{ formatNumber(prescriptions.issued) }}</strong> emitidas</span>
            <span class="metric-tile"><strong>{{ formatNumber(prescriptions.drafts) }}</strong> borradores</span>
            <span class="metric-tile"><strong>{{ formatNumber(prescriptions.cancelled) }}</strong> canceladas</span>
          </div>
          <p class="interpretation-note">
            {{ prescriptions.dateBasis || 'Estado actual de recetas creadas en el periodo.' }}. El indicador Recetas emitidas del resumen usa la fecha de emision.
          </p>
        </article>

        <article v-if="hasGroup('clinicalHistories')" class="operation-group">
          <div class="group-heading">
            <v-icon size="22">mdi-clipboard-check-outline</v-icon>
            <div>
              <strong>Historias clinicas</strong>
              <span>{{ formatNumber(clinicalHistories.total) }} totales</span>
            </div>
          </div>
          <div class="metric-grid">
            <span class="metric-tile"><strong>{{ formatNumber(clinicalHistories.finalized) }}</strong> finalizadas</span>
            <span class="metric-tile"><strong>{{ formatNumber(clinicalHistories.drafts) }}</strong> borradores</span>
            <span class="metric-tile"><strong>{{ formatNumber(clinicalHistories.pending) }}</strong> pendientes de finalizar</span>
          </div>
          <p class="interpretation-note">
            {{ clinicalHistories.dateBasis || 'Estado actual de historias creadas en el periodo.' }}. Las pendientes corresponden a borradores; este conteo no mide por si solo la calidad de la atencion.
          </p>
        </article>
      </div>

      <div v-if="hasMetricGroup('treatmentEconomics')" class="economics-panel">
        <div class="decision-heading">
          <div>
            <p class="eyebrow">Planes de tratamiento</p>
            <h3>Costos estimados de tratamientos</h3>
          </div>
          <small>Sin montos por paciente</small>
        </div>

        <div class="economics-grid">
          <article v-for="item in economicsCards" :key="item.key" class="economics-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.helper }}</small>
          </article>
        </div>

        <p class="interpretation-note panel-note">
          {{ treatmentEconomics.reason || treatmentEconomics.definition || 'Suma los costos capturados en tratamientos no cancelados creados en el periodo. No representa ingresos ni cobros.' }}
        </p>
      </div>

      <div v-if="decisionCards.length" class="decision-panel">
        <div class="decision-heading">
          <div>
            <p class="eyebrow">Indicadores de decision</p>
            <h3>Acceso y continuidad</h3>
          </div>
          <small>Sin datos personales</small>
        </div>

        <div class="decision-grid">
          <article v-for="item in decisionCards" :key="item.key" :class="['decision-card', 'tone-' + (item.tone || 'neutral')]">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.helper }}</small>
            <em>{{ item.interpretation }}</em>
          </article>
        </div>
      </div>

      <div v-if="comparisonCards.length" class="comparison-panel">
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
            <em>{{ item.interpretation }}</em>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { formatMetric, hasMetric, metricNumber } from '../../../domain/dashboard/metrics';

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
    decisionMetrics: function() {
      return this.data && this.data.decisionMetrics ? this.data.decisionMetrics : {};
    },
    appointmentHealth: function() {
      return this.decisionMetrics.appointmentHealth || {};
    },
    retention: function() {
      return this.decisionMetrics.retention || {};
    },
    followUps: function() {
      return this.decisionMetrics.followUps || {};
    },
    treatmentEconomics: function() {
      return this.decisionMetrics.treatmentEconomics || {};
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
      ].filter(item => hasMetric(this.comparison, item.key)).map((item) => ({
        ...item,
        interpretation: this.comparisonInterpretation(item.key)
      }));
    },
    economicsCards: function() {
      return [
        {
          key: 'totalEstimatedTreatmentValue',
          label: 'Costo total estimado',
          value: this.formatCurrency(this.treatmentEconomics.totalEstimatedTreatmentValue),
          helper: 'Suma de tratamientos con costo capturado'
        },
        {
          key: 'averageTreatmentValuePerPatient',
          label: 'Costo promedio por paciente',
          value: this.formatCurrency(this.treatmentEconomics.averageTreatmentValuePerPatient),
          helper: 'Promedio entre pacientes con tratamiento valuado'
        },
        {
          key: 'patientsWithEstimatedTreatment',
          label: 'Pacientes con costo registrado',
          value: this.formatNumber(this.treatmentEconomics.patientsWithEstimatedTreatment),
          helper: 'Pacientes con al menos un tratamiento con costo'
        },
        {
          key: 'treatmentItemsWithCost',
          label: 'Tratamientos con costo',
          value: this.formatNumber(this.treatmentEconomics.treatmentItemsWithCost),
          helper: 'Partidas de tratamiento incluidas'
        }
      ];
    },
    priorityActions: function() {
      const pendingConfirmations = normalizeNumber(this.appointmentHealth.pendingConfirmation);
      const noShow = normalizeNumber(this.appointmentHealth.noShow);
      const cancelled = normalizeNumber(this.appointmentHealth.cancelled);
      const followUpsDue = normalizeNumber(this.followUps.due);
      const followUpsScheduled = normalizeNumber(this.followUps.scheduled);
      const followUpsWithoutAppointment = metricNumber(this.followUps.due) !== null && metricNumber(this.followUps.scheduled) !== null
        ? Math.max(0, followUpsDue - followUpsScheduled) : 0;
      const clinicalPending = normalizeNumber(this.clinicalHistories.pending);
      const prescriptionDrafts = normalizeNumber(this.prescriptions.drafts);
      const actions = [
        {
          key: 'pendingConfirmations',
          count: pendingConfirmations,
          score: pendingConfirmations * 4,
          label: 'Confirma tu agenda',
          value: `${this.formatNumber(pendingConfirmations)} pendientes`,
          impact: 'La agenda puede verse llena, pero esas citas todavia no estan aseguradas.',
          nextStep: 'Primero confirma o depura estas citas.',
          icon: 'mdi-calendar-alert-outline',
          tone: pendingConfirmations >= 5 ? 'danger' : 'warning'
        },
        {
          key: 'followUpsWithoutAppointment',
          count: followUpsWithoutAppointment,
          score: followUpsWithoutAppointment * 4,
          label: 'Recupera seguimientos',
          value: `${this.formatNumber(followUpsWithoutAppointment)} sin cita`,
          impact: 'Son pacientes que deberian volver y aun no tienen una cita ligada.',
          nextStep: 'Conviene convertir seguimientos pendientes en citas.',
          icon: 'mdi-clipboard-pulse-outline',
          tone: followUpsWithoutAppointment >= 3 ? 'danger' : 'warning'
        },
        {
          key: 'clinicalPending',
          count: clinicalPending,
          score: clinicalPending * 3,
          label: 'Revisa historias pendientes',
          value: `${this.formatNumber(clinicalPending)} pendientes`,
          impact: 'Son borradores de historia clinica pendientes de finalizar.',
          nextStep: 'Revisa si corresponde completarlos o continuar la captura.',
          icon: 'mdi-clipboard-text-clock-outline',
          tone: clinicalPending >= 3 ? 'danger' : 'warning'
        },
        {
          key: 'prescriptionDrafts',
          count: prescriptionDrafts,
          score: prescriptionDrafts * 2,
          label: 'Revisa recetas borrador',
          value: `${this.formatNumber(prescriptionDrafts)} borradores`,
          impact: 'Pueden ser indicaciones que quedaron sin cerrar o sin emitir.',
          nextStep: 'Valida si deben emitirse, corregirse o descartarse.',
          icon: 'mdi-file-document-alert-outline',
          tone: 'warning'
        },
        {
          key: 'noShow',
          count: noShow,
          score: noShow * 3,
          label: 'Reduce ausencias',
          value: `${this.formatNumber(noShow)} no asistio`,
          impact: 'Cada ausencia puede representar tiempo clinico perdido.',
          nextStep: 'Refuerza confirmacion y revisa si conviene reagendar.',
          icon: 'mdi-account-cancel-outline',
          tone: noShow >= 3 ? 'danger' : 'warning'
        },
        {
          key: 'cancelled',
          count: cancelled,
          score: cancelled * 2,
          label: 'Revisa cancelaciones',
          value: `${this.formatNumber(cancelled)} canceladas`,
          impact: 'Si no se recuperan, pueden convertirse en huecos de agenda.',
          nextStep: 'Busca que las cancelaciones importantes queden reagendadas.',
          icon: 'mdi-calendar-remove-outline',
          tone: cancelled >= 5 ? 'danger' : 'warning'
        }
      ]
        .filter((item) => item.count > 0)
        .sort((a, b) => b.score - a.score);

      if(!actions.length) {
        const measured = [this.appointmentHealth.pendingConfirmation, this.appointmentHealth.noShow,
          this.appointmentHealth.cancelled, this.clinicalHistories.pending, this.prescriptions.drafts]
          .some(value => metricNumber(value) !== null);
        if(!measured) return [];
        return [
          {
            key: 'steady',
            label: 'Datos disponibles',
            value: 'Sin pendientes detectados',
            impact: 'No hay pendientes en los indicadores disponibles para este periodo.',
            nextStep: 'Los indicadores no disponibles quedan fuera de esta lectura.',
            icon: 'mdi-check-circle-outline',
            tone: 'success'
          }
        ];
      }

      return actions.slice(0, 3);
    },
    decisionCards: function() {
      return [
        {
          key: 'retention',
          group: 'retention',
          label: 'Retorno efectivo tras primera cita',
          value: this.formatPercent(this.retention.retentionRate),
          helper: metricNumber(this.retention.firstVisitPatients) === 0 ? 'Sin primeras citas completadas en el periodo'
            : `${this.formatNumber(this.retention.retainedPatients)} de ${this.formatNumber(this.retention.firstVisitPatients)} pacientes volvieron`,
          interpretation: this.retention.reason || this.retention.definition || 'Pacientes con primera cita completada en el periodo y otra cita completada posterior, antes de su cierre. No cuenta citas futuras.',
          tone: 'accent'
        },
        {
          key: 'followUps',
          group: 'followUps',
          label: 'Seguimientos con cita',
          value: this.formatPercent(this.followUps.coverageRate),
          helper: this.followUps.available === false ? 'Sin una atribucion verificable al doctor'
            : `${this.formatNumber(this.followUps.scheduled)} de ${this.formatNumber(this.followUps.due)} seguimientos`,
          interpretation: this.followUps.reason || this.followUps.definition || 'Seguimientos pendientes que ya tienen una cita registrada.',
          tone: 'success'
        },
        {
          key: 'noShow',
          group: 'appointmentHealth',
          label: 'No asistio',
          value: this.formatPercent(this.appointmentHealth.noShowRate),
          helper: `${this.formatNumber(this.appointmentHealth.noShow)} citas del periodo`,
          interpretation: 'Al subir, se pierde tiempo de sillon y conviene reforzar confirmaciones.',
          tone: normalizeNumber(this.appointmentHealth.noShow) > 0 ? 'warning' : 'neutral'
        },
        {
          key: 'pending',
          group: 'appointmentHealth',
          label: 'Pendientes de confirmar',
          value: this.formatPercent(this.appointmentHealth.pendingConfirmationRate),
          helper: `${this.formatNumber(this.appointmentHealth.pendingConfirmation)} de ${this.formatNumber(this.appointmentHealth.scheduled)} programadas`,
          interpretation: 'Si es alto, la agenda parece llena pero todavia no esta asegurada.',
          tone: normalizeNumber(this.appointmentHealth.pendingConfirmation) > 0 ? 'warning' : 'neutral'
        },
        {
          key: 'completion',
          group: 'appointmentHealth',
          label: 'Citas completadas',
          value: this.formatPercent(this.appointmentHealth.completedRate),
          helper: `${this.formatNumber(this.appointmentHealth.completed)} completadas`,
          interpretation: 'Alto indica que la agenda se esta convirtiendo en atencion real.',
          tone: 'neutral'
        },
        {
          key: 'cancelled',
          group: 'appointmentHealth',
          label: 'Cancelacion',
          value: this.formatPercent(this.appointmentHealth.cancelledRate),
          helper: `${this.formatNumber(this.appointmentHealth.cancelled)} canceladas`,
          interpretation: 'Al subir, revisa motivos y si se estan reagendando a tiempo.',
          tone: normalizeNumber(this.appointmentHealth.cancelled) > 0 ? 'warning' : 'neutral'
        }
      ].filter(card => this.hasMetricGroup(card.group));
    },
    previousRangeLabel: function() {
      const range = this.data && this.data.previousRange ? this.data.previousRange : null;
      if(!range || !range.from || !range.to) {
        return '';
      }

      return `${this.formatDate(range.from)} - ${this.formatDate(range.to)}`;
    },
    isEmpty: function() {
      return !this.data;
    }
  },
  methods: {
    hasGroup: function(key) {
      return hasMetric(this.data, key);
    },
    hasMetricGroup: function(key) {
      return hasMetric(this.decisionMetrics, key);
    },
    metricComparison: function(key) {
      const item = this.comparison[key] || {};
      return {
        current: metricNumber(item.current),
        previous: metricNumber(item.previous),
        delta: metricNumber(item.delta),
        deltaPercent: item.deltaPercent === null || item.deltaPercent === undefined ? null : Number(item.deltaPercent)
      };
    },
    comparisonInterpretation: function(key) {
      const labels = {
        patientsCreated: 'Ayuda a ver si esta entrando gente nueva al consultorio.',
        appointmentsCreated: 'Ayuda a ver si la demanda de agenda esta creciendo o bajando.',
        prescriptionsIssued: 'Ayuda a ver movimiento clinico documentado en recetas.',
        clinicalHistoriesFinalized: 'Compara cuantas historias se finalizaron durante cada periodo.'
      };
      return labels[key] || 'Compara el periodo actual contra el anterior.';
    },
    appointmentLabel: function(status) {
      const labels = {
        confirmed: 'Confirmadas',
        cancelled: 'Canceladas',
        pending_confirmation: 'Pendientes de confirmar',
        rescheduled: 'Reprogramadas',
        completed: 'Completadas',
        no_show: 'No asistio'
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
      if(item.delta === null || item.current === null || item.previous === null) return 'Comparacion no disponible';
      const sign = item.delta > 0 ? '+' : '';
      const percent = item.deltaPercent === null
        ? 'sin porcentaje comparable'
        : `${sign}${this.formatNumber(item.deltaPercent)}%`;
      return `${sign}${this.formatNumber(item.delta)} vs anterior (${percent})`;
    },
    formatNumber: function(value) {
      return formatMetric(value);
    },
    formatPercent: function(value) {
      if(metricNumber(value) === null) return 'No disponible';
      return `${formatMetric(value, {
        maximumFractionDigits: 1
      })}%`;
    },
    formatCurrency: function(value) {
      return formatMetric(value, {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0
      });
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
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: 0.85rem;
}

.operation-group,
.priority-panel,
.priority-card,
.economics-panel,
.economics-card,
.decision-panel,
.decision-card,
.comparison-panel,
.comparison-card {
  border: 1px solid #e2edf0;
  background: #f8fbfc;
}

.operation-group {
  display: grid;
  align-content: flex-start;
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

.metric-grid,
.status-list {
  display: grid;
  gap: 0.4rem;
}

.metric-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.5rem), 1fr));
}

.metric-tile,
.status-list span {
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.metric-tile strong,
.status-list strong {
  color: #12313a;
}

.metric-tile {
  align-items: baseline;
  min-width: 0;
  color: #475569;
  line-height: 1.35;
}

.metric-tile strong {
  flex: 0 0 auto;
  font-size: 1.12rem;
}

.interpretation-note {
  margin: 0;
  padding: 0.72rem 0.82rem;
  border: 1px solid #d7ebe8;
  background: #f5fbfa;
  color: #475569;
  font-size: 0.82rem;
  line-height: 1.45;
}

.priority-panel {
  padding: 1rem;
  background: #fbfdfc;
}

.priority-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: 0.75rem;
  margin-top: 0.9rem;
}

.priority-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.72rem;
  padding: 0.9rem;
  background: #ffffff;
}

.priority-card .v-icon {
  display: grid;
  place-items: center;
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 0.75rem;
  color: #0f766e;
  background: #dff7f4;
}

.priority-card span,
.priority-card strong,
.priority-card small,
.priority-card em {
  display: block;
}

.priority-card span {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 900;
}

.priority-card strong {
  margin-top: 0.12rem;
  color: #12313a;
  font-size: 1.22rem;
}

.priority-card small {
  margin-top: 0.26rem;
  color: #475569;
  line-height: 1.28rem;
}

.priority-card em {
  margin-top: 0.42rem;
  color: #0f766e;
  font-size: 0.8rem;
  font-style: normal;
  font-weight: 900;
  line-height: 1.25rem;
}

.priority-card.tone-warning {
  border-color: #e7dbc3;
  background: #fffaf0;
}

.priority-card.tone-danger {
  border-color: #f5c6c8;
  background: #fff7f7;
}

.priority-card.tone-danger .v-icon {
  color: #b4232a;
  background: #fde8e8;
}

.priority-card.tone-success {
  border-color: #c8eadc;
  background: #f3fbf7;
}

.economics-panel {
  padding: 1rem;
  background: #fbfdfc;
}

.economics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
  gap: 0.75rem;
  margin-top: 0.9rem;
}

.economics-card {
  display: grid;
  gap: 0.22rem;
  padding: 0.85rem;
  background: #ffffff;
}

.economics-card span {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 900;
}

.economics-card strong {
  color: #12313a;
  font-size: 1.35rem;
  line-height: 1.45rem;
  word-break: break-word;
}

.economics-card small {
  color: #64748b;
  line-height: 1.25rem;
}

.panel-note {
  margin-top: 0.9rem;
}

.decision-panel,
.comparison-panel {
  padding: 1rem;
}

.decision-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.decision-heading small {
  color: #0f766e;
  font-size: 0.8rem;
  font-weight: 900;
}

.decision-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.9rem;
}

.decision-card {
  display: grid;
  gap: 0.22rem;
  padding: 0.85rem;
  background: #ffffff;
}

.decision-card span {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 900;
}

.decision-card strong {
  color: #12313a;
  font-size: 1.65rem;
  line-height: 1.7rem;
}

.decision-card small {
  color: #64748b;
  line-height: 1.2rem;
}

.decision-card em,
.comparison-card em {
  color: #475569;
  font-size: 0.78rem;
  font-style: normal;
  line-height: 1.25rem;
}

.decision-card.tone-accent {
  border-color: #b7e4df;
  background: #f5fdfb;
}

.decision-card.tone-success {
  border-color: #c8eadc;
  background: #f3fbf7;
}

.decision-card.tone-warning {
  border-color: #e7dbc3;
  background: #fffaf0;
}

.decision-card.tone-neutral {
  border-color: #e2edf0;
  background: #ffffff;
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
html[data-theme="clinical-night"] .metric-tile strong,
html[data-theme="clinical-night"] .status-list strong,
html[data-theme="clinical-night"] .priority-card strong,
html[data-theme="clinical-night"] .economics-card strong,
html[data-theme="clinical-night"] .decision-card strong,
html[data-theme="clinical-night"] .comparison-card strong {
  color: #e2e8f0;
}

html[data-theme="clinical-night"] .operation-group,
html[data-theme="clinical-night"] .priority-panel,
html[data-theme="clinical-night"] .priority-card,
html[data-theme="clinical-night"] .economics-panel,
html[data-theme="clinical-night"] .economics-card,
html[data-theme="clinical-night"] .decision-panel,
html[data-theme="clinical-night"] .decision-card,
html[data-theme="clinical-night"] .comparison-panel,
html[data-theme="clinical-night"] .comparison-card,
html[data-theme="clinical-night"] .metric-tile,
html[data-theme="clinical-night"] .status-list span {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(30, 41, 59, 0.76);
}

html[data-theme="clinical-night"] .group-heading span,
html[data-theme="clinical-night"] .metric-tile,
html[data-theme="clinical-night"] .status-list span,
html[data-theme="clinical-night"] .priority-card span,
html[data-theme="clinical-night"] .priority-card small,
html[data-theme="clinical-night"] .economics-card span,
html[data-theme="clinical-night"] .economics-card small,
html[data-theme="clinical-night"] .decision-card span,
html[data-theme="clinical-night"] .decision-card small,
html[data-theme="clinical-night"] .decision-card em,
html[data-theme="clinical-night"] .comparison-heading small,
html[data-theme="clinical-night"] .comparison-card span,
html[data-theme="clinical-night"] .comparison-card small,
html[data-theme="clinical-night"] .comparison-card em,
html[data-theme="clinical-night"] .widget-state p,
html[data-theme="clinical-night"] .widget-state {
  color: #94a3b8;
}

html[data-theme="clinical-night"] .priority-card em {
  color: #5eead4;
}

html[data-theme="clinical-night"] .interpretation-note {
  border-color: rgba(45, 212, 191, 0.18);
  background: rgba(15, 23, 42, 0.58);
  color: #cbd5e1;
}

@media (max-width: 1100px) {
  .summary-groups,
  .decision-grid,
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
  .decision-grid,
  .comparison-grid,
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
