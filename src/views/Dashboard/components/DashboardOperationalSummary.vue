<template>
  <section class="an-card operational-widget" aria-labelledby="operational-summary-title">
    <div class="an-heading">
      <div>
        <p class="an-eyebrow">Analisis operativo</p>
        <h2 id="operational-summary-title">Resumen operativo</h2>
      </div>
      <span class="an-chip">Informacion general</span>
    </div>

    <div v-if="loading" class="an-state">
      <v-progress-circular indeterminate color="#0f766e" size="28"></v-progress-circular>
      <span>Cargando resumen operativo...</span>
    </div>

    <div v-else-if="error" class="an-state is-error">
      <v-icon size="28">mdi-alert-circle-outline</v-icon>
      <span>No pudimos cargar el resumen operativo.</span>
      <button type="button" class="an-button" @click="$emit('retry')">Reintentar</button>
    </div>

    <div v-else-if="isEmpty" class="an-state is-empty">
      <v-icon size="30">mdi-clipboard-text-search-outline</v-icon>
      <div>
        <strong>No hay actividad operativa registrada en este periodo.</strong>
        <p>Cuando existan citas, recetas o historias clinicas, apareceran aqui de forma resumida.</p>
      </div>
    </div>

    <div v-else class="operational-content">
      <div v-if="priorityActions.length" class="reading-panel">
        <div class="an-heading">
          <div>
            <p class="an-eyebrow">Interpretación del periodo</p>
            <h3>Lectura del periodo</h3>
          </div>
          <small class="heading-aside">Alcance y periodo seleccionados</small>
        </div>

        <div class="reading-grid">
          <article v-for="item in priorityActions" :key="item.key" :class="['reading-card', 'tone-' + item.tone]">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
            <small>{{ item.impact }}</small>
            <em v-if="!sharedNextStep"><v-icon size="15">{{ item.icon }}</v-icon>{{ item.nextStep }}</em>
          </article>
        </div>

        <p v-if="sharedNextStep" class="reading-next"><v-icon size="16">mdi-chart-box-outline</v-icon>{{ sharedNextStep }}</p>

        <p class="an-note">
          Esta lectura describe los registros del periodo seleccionado. Consulta el Pulso para revisar obligaciones actuales de todo el consultorio, incluido el backlog anterior.
        </p>
      </div>

      <div class="summary-groups">
        <article v-if="hasGroup('appointments')" class="an-panel operation-group">
          <div class="group-heading">
            <v-icon size="22">mdi-calendar-check-outline</v-icon>
            <div>
              <strong>Citas</strong>
              <span>{{ formatNumber(appointments.total) }} creadas en el periodo</span>
            </div>
            <b>{{ formatNumber(appointments.scheduled) }}<small>con fecha en el periodo</small></b>
          </div>
          <div v-if="appointmentSegments.length" class="an-stack" role="img" :aria-label="segmentsLabel(appointmentSegments)">
            <span
              v-for="segment in appointmentSegments"
              :key="segment.key"
              :style="{ width: segment.width + '%', background: segment.color }"
              :title="segment.label + ': ' + formatNumber(segment.value)"
            ></span>
          </div>
          <ul class="legend-list">
            <li v-for="item in appointmentStatuses" :key="item.status">
              <i class="an-dot" :style="{ background: appointmentColor(item.status) }" aria-hidden="true"></i>
              <span>{{ appointmentLabel(item.status) }}</span>
              <strong>{{ formatNumber(item.count) }}</strong>
            </li>
          </ul>
          <p class="an-note">
            {{ appointments.dateBasis || 'Estado actual de citas con fecha en el periodo' }}. Las citas creadas pueden estar programadas para otro periodo.
          </p>
        </article>

        <article v-if="hasGroup('prescriptions')" class="an-panel operation-group">
          <div class="group-heading">
            <v-icon size="22">mdi-file-document-edit-outline</v-icon>
            <div>
              <strong>Recetas</strong>
              <span>{{ formatNumber(prescriptions.total) }} totales</span>
            </div>
          </div>
          <div v-if="prescriptionSegments.length" class="an-stack" role="img" :aria-label="segmentsLabel(prescriptionSegments)">
            <span
              v-for="segment in prescriptionSegments"
              :key="segment.key"
              :style="{ width: segment.width + '%', background: segment.color }"
              :title="segment.label + ': ' + formatNumber(segment.value)"
            ></span>
          </div>
          <ul class="legend-list">
            <li><i class="an-dot" :style="{ background: palette.done }" aria-hidden="true"></i><span>emitidas</span><strong>{{ formatNumber(prescriptions.issued) }}</strong></li>
            <li><i class="an-dot" :style="{ background: palette.draft }" aria-hidden="true"></i><span>borradores</span><strong>{{ formatNumber(prescriptions.drafts) }}</strong></li>
            <li><i class="an-dot" :style="{ background: palette.off }" aria-hidden="true"></i><span>canceladas</span><strong>{{ formatNumber(prescriptions.cancelled) }}</strong></li>
          </ul>
          <p class="an-note">
            {{ prescriptions.dateBasis || 'Estado actual de recetas creadas en el periodo' }}. El indicador Recetas emitidas del resumen usa la fecha de emision.
          </p>
        </article>

        <article v-if="hasGroup('clinicalHistories')" class="an-panel operation-group">
          <div class="group-heading">
            <v-icon size="22">mdi-clipboard-check-outline</v-icon>
            <div>
              <strong>Historias clinicas</strong>
              <span>{{ formatNumber(clinicalHistories.total) }} totales</span>
            </div>
          </div>
          <div v-if="historySegments.length" class="an-stack" role="img" :aria-label="segmentsLabel(historySegments)">
            <span
              v-for="segment in historySegments"
              :key="segment.key"
              :style="{ width: segment.width + '%', background: segment.color }"
              :title="segment.label + ': ' + formatNumber(segment.value)"
            ></span>
          </div>
          <ul class="legend-list">
            <li><i class="an-dot" :style="{ background: palette.done }" aria-hidden="true"></i><span>finalizadas</span><strong>{{ formatNumber(clinicalHistories.finalized) }}</strong></li>
            <li><i class="an-dot" :style="{ background: palette.draft }" aria-hidden="true"></i><span>borradores</span><strong>{{ formatNumber(clinicalHistories.drafts) }}</strong></li>
            <li><i class="an-dot is-hollow" aria-hidden="true"></i><span>pendientes de finalizar</span><strong>{{ formatNumber(clinicalHistories.pending) }}</strong></li>
          </ul>
          <p class="an-note">
            {{ clinicalHistories.dateBasis || 'Estado actual de historias creadas en el periodo' }}. Las pendientes corresponden a borradores; este conteo no mide por si solo la calidad de la atencion.
          </p>
        </article>
      </div>

      <div v-if="decisionCards.length" class="decision-panel">
        <div class="an-heading">
          <div>
            <p class="an-eyebrow">Indicadores de decision</p>
            <h3>Acceso y continuidad</h3>
          </div>
          <small class="heading-aside">Sin datos personales</small>
        </div>

        <div class="decision-grid">
          <article v-for="item in decisionCards" :key="item.key" :class="['an-tile', 'decision-card', 'tone-' + (item.tone || 'neutral')]">
            <div class="decision-main">
              <svg v-if="ringFor(item.key) !== null" class="an-ring" viewBox="0 0 36 36" aria-hidden="true">
                <circle class="ring-track" cx="18" cy="18" r="15.915" />
                <circle class="ring-value" cx="18" cy="18" r="15.915" :stroke-dasharray="ringFor(item.key) + ' 100'" />
              </svg>
              <div>
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
            <small>{{ item.helper }}</small>
            <details class="an-details">
              <summary>Cómo leerlo</summary>
              <em>{{ item.interpretation }}</em>
            </details>
          </article>
        </div>
      </div>

      <div v-if="hasMetricGroup('treatmentEconomics')" class="economics-panel an-panel">
        <div class="an-heading">
          <div>
            <p class="an-eyebrow">Planes de tratamiento</p>
            <h3>Costos estimados de tratamientos</h3>
          </div>
          <small class="heading-aside">Sin montos por paciente</small>
        </div>

        <div class="economics-grid">
          <article v-for="item in economicsCards" :key="item.key" class="an-tile economics-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.helper }}</small>
          </article>
        </div>

        <p class="an-note">
          {{ treatmentEconomics.reason || treatmentEconomics.definition || 'Suma los costos capturados en tratamientos no cancelados creados en el periodo. No representa ingresos ni cobros.' }}
        </p>
      </div>

      <div v-if="comparisonCards.length" class="comparison-panel">
        <div class="an-heading">
          <div>
            <p class="an-eyebrow">Comparativo</p>
            <h3>Vs periodo anterior</h3>
          </div>
          <small v-if="previousRangeLabel" class="heading-aside">{{ previousRangeLabel }}</small>
        </div>

        <div class="comparison-grid">
          <article v-for="item in comparisonCards" :key="item.key" class="an-tile comparison-card">
            <span>{{ item.label }}</span>
            <div class="comparison-value">
              <strong>{{ formatNumber(item.current) }}</strong>
              <b v-if="deltaDirection(item)" :class="'is-' + deltaDirection(item)" aria-hidden="true">{{ { up: '▲', down: '▼', flat: '=' }[deltaDirection(item)] }}</b>
            </div>
            <small>
              {{ deltaLabel(item) }}
            </small>
            <div v-if="item.current !== null && item.previous !== null" class="comparison-bars" aria-hidden="true">
              <div><i>Actual</i><span class="an-meter"><span :style="{ width: comparisonWidth(item, 'current') + '%' }"></span></span><u>{{ formatNumber(item.current) }}</u></div>
              <div class="is-previous"><i>Anterior</i><span class="an-meter"><span :style="{ width: comparisonWidth(item, 'previous') + '%' }"></span></span><u>{{ formatNumber(item.previous) }}</u></div>
            </div>
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
  data: function() {
    return {
      // Colores por estado; siempre acompañados de su etiqueta y su cifra en la leyenda.
      palette: {
        done: 'var(--an-series-1)',
        confirmed: 'var(--an-series-2)',
        draft: 'var(--an-series-3)',
        absent: 'var(--an-series-4)',
        moved: 'var(--an-series-5)',
        off: 'var(--an-muted)'
      }
    };
  },
  computed: {
    appointmentSegments: function() {
      return this.buildSegments(this.appointmentStatuses.map(item => ({
        key: item.status,
        label: this.appointmentLabel(item.status),
        value: item.count,
        color: this.appointmentColor(item.status)
      })));
    },
    prescriptionSegments: function() {
      return this.buildSegments([
        { key: 'issued', label: 'emitidas', value: this.prescriptions.issued, color: this.palette.done },
        { key: 'drafts', label: 'borradores', value: this.prescriptions.drafts, color: this.palette.draft },
        { key: 'cancelled', label: 'canceladas', value: this.prescriptions.cancelled, color: this.palette.off }
      ]);
    },
    historySegments: function() {
      return this.buildSegments([
        { key: 'finalized', label: 'finalizadas', value: this.clinicalHistories.finalized, color: this.palette.done },
        { key: 'drafts', label: 'borradores', value: this.clinicalHistories.drafts, color: this.palette.draft }
      ]);
    },
    // Cuando todas las tarjetas comparten el mismo siguiente paso, se muestra una sola vez.
    sharedNextStep: function() {
      const steps = this.priorityActions.map(item => item.nextStep);
      return steps.length > 1 && steps.every(step => step === steps[0]) ? steps[0] : '';
    },
    decisionRings: function() {
      return {
        retention: this.retention.retentionRate,
        followUps: this.followUps.coverageRate,
        noShow: this.appointmentHealth.noShowRate,
        pending: this.appointmentHealth.pendingConfirmationRate,
        completion: this.appointmentHealth.completedRate,
        cancelled: this.appointmentHealth.cancelledRate
      };
    },
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
    pendingFollowUps: function() {
      const due = metricNumber(this.followUps.due);
      const scheduled = metricNumber(this.followUps.scheduled);
      return this.followUps.available === false || due === null || scheduled === null
        ? null : Math.max(0, due - scheduled);
    },
    overdueFollowUps: function() {
      return this.followUps.available === false ? null : metricNumber(this.followUps.overdueWithoutAppointment);
    },
    upcomingFollowUps: function() {
      return this.followUps.available === false ? null : metricNumber(this.followUps.upcomingWithoutAppointment);
    },
    hasOperationalActivity: function() {
      return [this.appointments.total, this.appointments.scheduled, this.appointmentHealth.scheduled,
        this.prescriptions.total, this.clinicalHistories.total,
        this.followUps.available === false ? null : this.followUps.due,
        ...['appointmentsCreated', 'prescriptionsIssued', 'clinicalHistoriesFinalized']
          .map(key => (this.comparison[key] || {}).current)]
        .some(value => metricNumber(value) > 0);
    },
    priorityActions: function() {
      const definitions = [
        ['pendingConfirmations', this.appointmentHealth.pendingConfirmation, 'Confirmaciones del periodo', 'Citas con fecha en el periodo que conservan ese estado; las futuras pueden estar dentro de su plazo normal.'],
        ['overdueFollowUps', this.overdueFollowUps, 'Seguimientos de este periodo', 'Fecha sugerida vencida y sin cita vigente vinculada dentro del conjunto analizado. No incluye todo el backlog del consultorio.'],
        ['clinicalPending', this.clinicalHistories.pending, 'Capturas de historia en borrador', 'Un borrador permite continuar una captura. Su estado no demuestra una obligación vencida.'],
        ['prescriptionDrafts', this.prescriptions.drafts, 'Recetas en borrador', 'Existencias del periodo. Revisa el contexto antes de decidir si corresponde emitir o continuar.'],
        ['noShow', this.appointmentHealth.noShow, 'Ausencias registradas', 'Resultado de citas del periodo; no se convierte automáticamente en una deuda actual.'],
        ['cancelled', this.appointmentHealth.cancelled, 'Cancelaciones registradas', 'Resultado del periodo. Una nueva obligación requiere una tarea o seguimiento aplicable.']
      ];
      const rows = definitions.filter(row => metricNumber(row[1]) !== null && Number(row[1]) > 0).map(row => ({key:row[0],label:row[2],value:this.formatNumber(row[1]) + (row[0] === 'overdueFollowUps' ? ' sin cita' : ''),impact:row[3],nextStep:'Revisa las definiciones y el contexto del periodo.',icon:'mdi-chart-box-outline',tone:'neutral'}));
      if(rows.length) return rows;
      if(!definitions.some(row => metricNumber(row[1]) !== null)) return [];
      return [{key:this.hasOperationalActivity?'steady':'insufficient',label:'Alcance de esta lectura',value:this.hasOperationalActivity?'Sin registros pendientes conocidos en este conjunto':'Aún no hay datos suficientes',impact:'Los indicadores no disponibles quedan fuera. Esta lectura del periodo no confirma el estado actual de todo el consultorio.',nextStep:'Puedes comparar otro periodo o consultar el Pulso si tienes acceso.',icon:'mdi-information-outline',tone:'neutral'}];
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
          key: 'followUpsOverdue',
          group: 'followUps',
          label: 'Seguimientos vencidos sin cita',
          value: this.formatNumber(this.overdueFollowUps),
          helper: this.followUps.asOfDate ? `Fecha sugerida anterior al ${this.formatDate(this.followUps.asOfDate)}` : 'Fecha sugerida anterior a hoy',
          interpretation: this.followUps.reason || 'Seguimientos activos del periodo sin cita vigente vinculada. Solo estos seguimientos generan prioridad.',
          tone: this.overdueFollowUps > 0 ? 'warning' : 'neutral'
        },
        {
          key: 'followUpsUpcoming',
          group: 'followUps',
          label: 'Próximos seguimientos sin cita',
          value: this.formatNumber(this.upcomingFollowUps),
          helper: 'Incluye hoy y las fechas posteriores del periodo',
          interpretation: this.followUps.reason || 'Informacion para planificar la agenda; estos seguimientos todavia no estan vencidos y no generan prioridad.',
          tone: 'neutral'
        },
        {
          key: 'noShow',
          group: 'appointmentHealth',
          label: 'No asistió',
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
    buildSegments: function(parts) {
      const measured = parts
        .map(part => ({ ...part, value: metricNumber(part.value) }))
        .filter(part => part.value !== null && part.value > 0);
      const total = measured.reduce((sum, part) => sum + part.value, 0);
      return measured.map(part => ({ ...part, width: (part.value / total) * 100 }));
    },
    segmentsLabel: function(segments) {
      return segments.map(segment => `${segment.label}: ${this.formatNumber(segment.value)}`).join(', ');
    },
    appointmentColor: function(status) {
      const colors = {
        completed: this.palette.done,
        confirmed: this.palette.confirmed,
        pending_confirmation: this.palette.draft,
        no_show: this.palette.absent,
        rescheduled: this.palette.moved,
        cancelled: this.palette.off
      };
      return colors[status] || this.palette.off;
    },
    ringFor: function(key) {
      if(!Object.prototype.hasOwnProperty.call(this.decisionRings, key)) return null;
      const rate = metricNumber(this.decisionRings[key]);
      return rate === null ? null : Math.max(0, Math.min(100, rate));
    },
    deltaDirection: function(item) {
      if(item.delta === null || item.current === null || item.previous === null) return '';
      return item.delta > 0 ? 'up' : item.delta < 0 ? 'down' : 'flat';
    },
    comparisonWidth: function(item, key) {
      const max = Math.max(item.current, item.previous, 1);
      return item[key] > 0 ? Math.max(3, Math.round((item[key] / max) * 100)) : 0;
    },
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
        no_show: 'No asistió'
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
.operational-content {
  display: grid;
  gap: 1.4rem;
  margin-top: 1.1rem;
}

.operational-content > * {
  min-width: 0;
}

.heading-aside {
  color: var(--an-muted);
  font-size: 0.8rem;
  font-weight: 700;
}

/* Lectura del periodo */
.reading-panel,
.decision-panel,
.comparison-panel {
  display: grid;
  gap: 0.9rem;
}

.reading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  gap: 0.75rem;
}

.reading-card {
  display: grid;
  align-content: start;
  gap: 0.2rem;
  padding: 0.95rem 1rem;
  border: 1px solid var(--an-border);
  border-left: 4px solid var(--an-accent);
  border-radius: var(--an-radius-sm);
  background: var(--an-surface-2);
}

.reading-card strong {
  color: var(--an-ink);
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.reading-card span {
  color: var(--an-ink);
  font-size: 0.9rem;
  font-weight: 750;
}

.reading-card small {
  color: var(--an-ink-2);
  font-size: 0.82rem;
  line-height: 1.45;
}

.reading-card em {
  display: flex;
  align-items: flex-start;
  gap: 0.3rem;
  margin-top: 0.3rem;
  color: var(--an-accent-strong);
  font-size: 0.78rem;
  font-style: normal;
  font-weight: 750;
  line-height: 1.4;
}

.reading-card em .v-icon {
  margin-top: 0.1rem;
  color: inherit !important;
}

.reading-next {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  color: var(--an-accent-strong);
  font-size: 0.82rem;
  font-weight: 750;
}

.reading-next .v-icon {
  color: inherit !important;
}

.reading-card.tone-warning {
  border-left-color: var(--an-warn-ink);
  background: var(--an-warn-bg);
}

.reading-card.tone-danger {
  border-left-color: var(--an-danger-ink);
  background: var(--an-danger-bg);
}

/* Grupos operativos */
.summary-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
  gap: 0.85rem;
}

.operation-group {
  display: grid;
  align-content: start;
  gap: 0.85rem;
}

.group-heading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.7rem;
  align-items: center;
}

.group-heading .v-icon {
  display: grid;
  place-items: center;
  width: 2.45rem;
  height: 2.45rem;
  border-radius: 0.8rem;
  color: var(--an-accent) !important;
  background: var(--an-accent-soft);
}

.group-heading strong,
.group-heading span {
  display: block;
}

.group-heading strong {
  color: var(--an-ink);
  font-size: 1.05rem;
}

.group-heading span {
  color: var(--an-muted);
  font-size: 0.82rem;
}

.group-heading b {
  color: var(--an-ink);
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.1;
  text-align: right;
}

.group-heading b small {
  display: block;
  max-width: 7rem;
  color: var(--an-muted);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.2;
}

.legend-list {
  display: grid;
  gap: 0.1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.legend-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.55rem;
  align-items: center;
  padding: 0.32rem 0;
  border-bottom: 1px dashed var(--an-border);
  color: var(--an-ink-2);
  font-size: 0.86rem;
}

.legend-list li:last-child {
  border-bottom: 0;
}

.legend-list strong {
  color: var(--an-ink);
  font-weight: 800;
}

.an-dot.is-hollow {
  border: 1.5px solid var(--an-muted);
}

/* Indicadores de decisión */
.decision-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 15.5rem), 1fr));
  gap: 0.75rem;
}

.decision-card {
  display: grid;
  align-content: start;
  gap: 0.45rem;
}

.decision-main {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.decision-main > div {
  min-width: 0;
}

.decision-card span,
.economics-card span,
.comparison-card > span {
  display: block;
  color: var(--an-muted);
  font-size: 0.78rem;
  font-weight: 750;
  line-height: 1.3;
}

.decision-card strong {
  display: block;
  color: var(--an-ink);
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.decision-card small,
.economics-card small,
.comparison-card small {
  color: var(--an-ink-2);
  font-size: 0.82rem;
  line-height: 1.4;
}

.decision-card.tone-warning {
  border-color: var(--an-warn-border);
  background: var(--an-warn-bg);
}

.decision-card.tone-warning .ring-value {
  stroke: var(--an-warn-ink);
}

.decision-card.tone-neutral .ring-value {
  stroke: var(--an-series-2);
}

/* Costos */
.economics-panel {
  display: grid;
  gap: 0.9rem;
}

.economics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
  gap: 0.75rem;
}

.economics-card {
  display: grid;
  align-content: start;
  gap: 0.2rem;
}

.economics-card strong {
  color: var(--an-ink);
  font-size: 1.4rem;
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

/* Comparativo */
.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: 0.75rem;
}

.comparison-card {
  display: grid;
  align-content: start;
  gap: 0.3rem;
}

.comparison-value {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
}

.comparison-value strong {
  color: var(--an-ink);
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.comparison-value b {
  color: var(--an-muted);
  font-size: 0.85rem;
}

.comparison-value b.is-up {
  color: var(--an-good-ink);
}

.comparison-value b.is-down {
  color: var(--an-warn-ink);
}

.comparison-bars {
  display: grid;
  gap: 0.3rem;
  margin: 0.3rem 0;
}

.comparison-bars > div {
  display: grid;
  grid-template-columns: 3.6rem minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: center;
}

.comparison-bars i,
.comparison-bars u {
  color: var(--an-muted);
  font-size: 0.72rem;
  font-style: normal;
  font-weight: 700;
  text-decoration: none;
}

.comparison-bars u {
  min-width: 1.6rem;
  color: var(--an-ink-2);
  text-align: right;
}

.comparison-bars .is-previous .an-meter span {
  background: var(--an-muted);
  opacity: 0.55;
}

.comparison-card em {
  color: var(--an-muted);
  font-size: 0.78rem;
  font-style: normal;
  line-height: 1.45;
}
</style>
