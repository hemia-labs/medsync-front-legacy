<template>
  <section class="clinical-chart" aria-label="Arcadas del odontograma del paciente">
    <p class="clinical-chart-help">Selecciona una pieza para consultar o editar el diagnóstico guardado. El texto previo no se convierte automáticamente en marcas por cara.</p>
    <div v-for="row in chartRows" :key="row.id" class="clinical-chart-arch">
      <h3>{{ row.label }}</h3>
      <div class="clinical-chart-scroll" tabindex="0" :aria-label="row.label + ': desplaza para ver todas las piezas'">
        <div class="clinical-chart-teeth">
          <button v-for="tooth in row.teeth" :key="tooth.id_tooth" type="button"
            :disabled="busy" :aria-pressed="selectedId === tooth.id_tooth"
            :aria-label="'Pieza ' + tooth.sec + (tooth.treatment ? ', con diagnóstico registrado' : ', sin diagnóstico registrado')"
            @click="selectedId = tooth.id_tooth">
            <strong>{{ tooth.sec }}</strong>
            <tooth-drawing :number="Number(tooth.sec)" :tooth="emptyDrawing" />
            <span>{{ tooth.treatment ? 'Con nota' : 'Sin nota' }}</span>
          </button>
        </div>
      </div>
    </div>
    <div v-if="selected" class="clinical-chart-detail" aria-live="polite">
      <h3>Pieza {{ selected.sec }}</h3>
      <p>{{ selected.treatment || 'Sin diagnóstico registrado.' }}</p>
      <button type="button" class="clinical-chart-edit" :disabled="busy" @click="$emit('edit', selected)">
        {{ selected.treatment ? 'Editar diagnóstico' : 'Registrar diagnóstico' }}
      </button>
    </div>
  </section>
</template>

<script>
import ToothDrawing from './preview/OdontogramPreviewTooth.vue';
import { sequence } from '../../../../utils/odontogram/dentalContract';

export default {
  components: { ToothDrawing },
  props: {
    teeth: { type: Array, required: true },
    busy: { type: Boolean, default: false }
  },
  data: () => ({ selectedId: null, emptyDrawing: { findings: [] } }),
  computed: {
    selected() { return this.teeth.find(tooth => tooth.id_tooth === this.selectedId); },
    chartRows() {
      const byNumber = new Map(this.teeth.map(tooth => [Number(tooth.sec), tooth]));
      const order = sequence('mixed');
      return [
        { id: 'upper', label: 'Superior · permanente', quadrants: [1, 2] },
        { id: 'primaryUpper', label: 'Superior · temporal', quadrants: [5, 6] },
        { id: 'primaryLower', label: 'Inferior · temporal', quadrants: [8, 7] },
        { id: 'lower', label: 'Inferior · permanente', quadrants: [4, 3] }
      ].map(row => {
        // Drawing orientation matches the existing visual shell; traversal is separate.
        const numbers = order.filter(n => row.quadrants.includes(Math.floor(n / 10)));
        if (row.id === 'lower' || row.id === 'primaryLower') numbers.reverse();
        return { ...row, teeth: numbers.filter(n => byNumber.has(n)).map(n => byNumber.get(n)) };
      }).filter(row => row.teeth.length);
    }
  },
  watch: {
    teeth() {
      if (!this.selected) this.selectedId = null;
    }
  }
};
</script>

<style scoped>
.clinical-chart { padding: 20px; border-bottom: 1px solid var(--color-border, #d8e9ef); }
.clinical-chart-help { color: var(--color-text-muted, #64748b); font-size: 13px; }
.clinical-chart-arch h3, .clinical-chart-detail h3 { font-size: 14px; margin: 12px 0; }
.clinical-chart-scroll { overflow-x: auto; padding: 4px; }
.clinical-chart-teeth { display: flex; gap: 6px; width: max-content; }
.clinical-chart-teeth button { display: flex; flex-direction: column; align-items: center; width: 60px; min-height: 110px; padding: 6px; border: 1px solid var(--color-border, #d8e9ef); border-radius: 8px; }
.clinical-chart-teeth button[aria-pressed="true"] { border-color: var(--color-primary-700, #0e7490); background: var(--color-primary-50, #effbfe); }
.clinical-chart-teeth button span { font-size: 10px; }
.clinical-chart-teeth button:focus-visible, .clinical-chart-edit:focus-visible { outline: 2px solid var(--color-primary-700, #0e7490); outline-offset: 2px; }
.clinical-chart-teeth button:disabled, .clinical-chart-edit:disabled { opacity: .5; cursor: wait; }
.clinical-chart ::v-deep svg { width: 44px; height: 66px; }
.clinical-chart ::v-deep .co26-root-line { fill: none; stroke: currentColor; }
.clinical-chart ::v-deep .co26-fill-empty { fill: var(--color-surface, #fff); }
.clinical-chart-detail { margin-top: 16px; padding: 16px; border: 1px solid var(--color-border, #d8e9ef); border-radius: 8px; }
.clinical-chart-detail p { white-space: pre-wrap; overflow-wrap: anywhere; }
.clinical-chart-edit { padding: 10px 16px; min-height: 44px; border-radius: 8px; background: var(--color-primary-900, #086783); color: #fff; }
@media (max-width: 600px) { .clinical-chart { padding: 12px; } }
</style>
