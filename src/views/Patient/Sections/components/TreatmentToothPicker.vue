<template>
  <div class="tp-tooth-picker">
    <div class="dentition-switch" role="group" aria-label="Mostrar dientes">
      <button v-for="option in dentitions" :key="option.value" type="button" :aria-pressed="mode === option.value" :disabled="busy" @click="mode = option.value">
        {{ option.label }} <span v-if="count(option.value)">{{ count(option.value) }} {{ count(option.value) === 1 ? 'seleccionado' : 'seleccionados' }}</span>
      </button>
    </div>
    <p class="picker-help">Toca un número para seleccionar o quitar un diente. Derecha e izquierda corresponden al paciente.</p>
    <div class="quadrants">
      <fieldset v-for="group in groups" :key="group.id">
        <legend>{{ group.label }}</legend>
        <div class="quadrant-teeth">
          <button v-for="(tooth, index) in group.teeth" :key="tooth" :ref="'tooth-' + tooth" type="button"
            :disabled="busy" :tabindex="index === (focusIndexes[group.id] || 0) ? 0 : -1"
            :aria-label="'Diente ' + tooth" :aria-pressed="teeth.includes(tooth)" :class="{ selected: teeth.includes(tooth) }"
            @focus="$set(focusIndexes, group.id, index)" @keydown="moveFocus($event, group, index)" @click="$emit('toggle', tooth)">
            {{ tooth }}<span class="tooth-check" aria-hidden="true">{{ teeth.includes(tooth) ? '✓' : '' }}</span>
          </button>
        </div>
      </fieldset>
    </div>
    <p class="picker-help">Con teclado: usa Tab para cambiar de cuadrante y las flechas para recorrer los dientes.</p>
  </div>
</template>

<script>
export default {
  props: { teeth: { type: Array, required: true }, busy: { type: Boolean, default: false } },
  data: () => ({ mode: 'permanent', focusIndexes: {}, dentitions: [{ value: 'permanent', label: 'Permanentes' }, { value: 'primary', label: 'Temporales (de leche)' }] }),
  computed: {
    groups() {
      const primary = this.mode === 'primary';
      return [
        { id: 'upper-right', label: 'Superior · derecha', quadrant: primary ? 5 : 1, reverse: true },
        { id: 'upper-left', label: 'Superior · izquierda', quadrant: primary ? 6 : 2 },
        { id: 'lower-right', label: 'Inferior · derecha', quadrant: primary ? 8 : 4, reverse: true },
        { id: 'lower-left', label: 'Inferior · izquierda', quadrant: primary ? 7 : 3 }
      ].map(group => ({ ...group, teeth: Array.from({ length: primary ? 5 : 8 }, (_, i) => String(group.quadrant * 10 + (group.reverse ? (primary ? 5 : 8) - i : i + 1))) }));
    }
  },
  methods: {
    count(mode) { return this.teeth.filter(tooth => mode === 'primary' ? Number(tooth) >= 51 : Number(tooth) < 51).length; },
    moveFocus(event, group, index) {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? group.teeth.length - 1
        : (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + group.teeth.length) % group.teeth.length;
      this.$set(this.focusIndexes, group.id, next);
      this.$nextTick(() => { const ref = this.$refs['tooth-' + group.teeth[next]]; (Array.isArray(ref) ? ref[0] : ref).focus(); });
    }
  }
};
</script>

<style scoped>
.tp-tooth-picker { color: var(--color-text, #25364d); }
.dentition-switch { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.dentition-switch button { min-height: 44px; padding: 8px 14px; border: 1px solid var(--color-border, #cbd5e1); border-radius: 24px; color: inherit; background: var(--color-surface, #fff); font-weight: 600; }
.dentition-switch button[aria-pressed="true"] { border-color: var(--color-primary-500, #147e9c); background: var(--color-primary-500, #147e9c); color: #fff; }
.dentition-switch span { font-size: 12px; margin-left: 5px; }
.picker-help { color: var(--color-text-muted, #52657b); font-size: 12px; line-height: 1.5; margin: 10px 0; }
.quadrants { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 20px; }
fieldset { border: 0; min-width: 0; padding: 0; }
legend { font-size: 12px; font-weight: 600; margin-bottom: 6px; }
.quadrant-teeth { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 4px; }
.quadrant-teeth button { position: relative; min-height: 44px; min-width: 0; border: 1px solid var(--color-border, #b8c9d5); border-radius: 9px; background: var(--color-surface, #fff); color: inherit; font-size: 13px; font-weight: 600; }
.quadrant-teeth button.selected { background: var(--color-primary-500, #147e9c); border-color: var(--color-primary-500, #147e9c); color: #fff; }
.tooth-check { position: absolute; bottom: 0; right: 3px; font-size: 10px; }
button:focus-visible { outline: 3px solid var(--color-primary-500, #147e9c); outline-offset: 2px; }
button:disabled { opacity: .55; }
@media (max-width: 600px) { .quadrants { grid-template-columns: 1fr; } }
</style>
