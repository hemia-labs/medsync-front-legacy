<template>
  <div class="unit-summary">
    <div class="unit-summary-heading">
      <h3>{{ unit.displayName }}</h3>
      <span class="unit-chip" :class="unit.active ? 'unit-chip--on' : 'unit-chip--off'">{{ unit.active ? 'Activa en MedSync' : 'Inactiva en MedSync' }}</span>
    </div>
    <dl class="unit-summary-facts">
      <div><dt>CLUES</dt><dd><span v-if="unit.cluesRef" class="unit-summary-code">{{ unit.cluesRef.code }}</span><span class="unit-status" :class="'unit-status--' + status.key">{{ status.text }}</span></dd></div>
      <div><dt>Ubicación de la unidad</dt><dd class="unit-summary-location">Sin confirmar. Por ahora solo se guarda el domicilio general, en Datos del consultorio.</dd></div>
    </dl>
    <section v-if="official" class="unit-official">
      <p class="unit-official-label">{{ status.key === 'stale' ? 'Datos del catálogo · versión anterior, ya no vigente' : 'Datos del catálogo · solo lectura' }}</p>
      <p class="unit-official-name">{{ official.nombre_unidad }}</p>
      <p v-if="namesDiffer" class="unit-official-note">El catálogo puede registrar un nombre distinto al que usas con tus pacientes. Si necesita una corrección, solicítala a la autoridad que gestiona tu CLUES.</p>
      <details class="unit-help"><summary>Ver datos del catálogo</summary>
        <dl class="unit-official-fields"><div v-for="row in rows.filter(r => r.key !== 'nombre_unidad')" :key="row.key"><dt>{{ row.label }}</dt><dd>{{ row.value }}</dd></div></dl>
        <p>El catálogo SIS no publica domicilio oficial.</p>
      </details>
      <details v-if="source" class="unit-help"><summary>Fuente y versión</summary><p class="unit-source">{{ source.sourceVersion }} · release {{ source.releaseId }} · en MedSync desde {{ source.validFrom }} ({{ source.validityBasis === 'download_date' ? 'fecha de descarga, no fecha oficial' : source.validityBasis }}){{ status.key === 'stale' ? ' · sustituida por una versión posterior' : '' }}</p></details>
    </section>
    <p v-if="unit.validFrom || unit.validTo" class="unit-summary-meta">Periodo de uso en tu cuenta: {{ date(unit.validFrom) }} → {{ unit.validTo ? date(unit.validTo) : 'sin fecha de fin' }}</p>
    <p v-if="unit.updatedAt" class="unit-summary-meta">Última actualización {{ date(unit.updatedAt) }}. Solo se conserva la información más reciente de esta unidad.</p>
  </div>
</template>
<script>
import { cluesStatus, cluesCheck, COMPARED, describeAttribute } from '../../domain/identity/healthUnits';
export default {
  name: 'HealthUnitSummary',
  props: { unit: Object, business: Object },
  computed: {
    status() { return cluesStatus(this.unit); },
    source() { const c = cluesCheck(this.unit); return c && c.source || null; },
    official() { return this.unit.catalogAttributes || null; },
    rows() { return COMPARED.map(([key, label]) => ({ key, label, value: describeAttribute(key, this.official[key]) })); },
    namesDiffer() { return this.official && this.official.nombre_unidad && ![this.unit.displayName, this.business.name].some(n => String(n || '').trim().toUpperCase() === this.official.nombre_unidad.toUpperCase()); }
  },
  methods: { date(v) { return v ? String(v).slice(0, 10) : 'Sin fecha'; } }
};
</script>
