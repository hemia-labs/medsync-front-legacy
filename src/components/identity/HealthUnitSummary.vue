<template>
  <div class="min-w-0">
    <div class="flex flex-wrap items-center gap-2">
      <h4 class="m-0 text-gray-800 text-base font-semibold break-words">{{ unit.displayName }}</h4>
      <span class="unit-chip" :class="unit.active ? 'unit-chip--on' : 'unit-chip--off'">{{ unit.active ? 'Activa en MedSync' : 'Inactiva en MedSync' }}</span>
    </div>
    <dl class="m-0 mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6">
      <div class="py-2"><dt class="text-xs font-bold uppercase tracking-wider text-gray-500">CLUES</dt>
        <dd class="m-0 mt-1"><span v-if="unit.cluesRef" class="font-mono text-gray-800 text-base">{{ unit.cluesRef.code }}</span>
          <span class="unit-status block text-sm mt-1" :class="'unit-status--' + status.key">{{ status.text }}</span></dd></div>
      <!-- R6: the unit's location is never inferred from Datos del consultorio; per-unit address is D-3. -->
      <div class="py-2"><dt class="text-xs font-bold uppercase tracking-wider text-gray-500">Ubicación de la unidad</dt>
        <dd class="m-0 mt-1 text-gray-600 text-sm">Sin confirmar. MedSync aún no registra la ubicación de cada unidad; el domicilio del consultorio está en Datos del consultorio.</dd></div>
    </dl>
    <div v-if="official" class="unit-official mt-3 p-3 border border-gray-200">
      <p class="m-0 text-xs font-bold uppercase tracking-wider text-gray-500">{{ status.key === 'stale' ? 'Datos oficiales de la versión guardada · ya no vigente · solo lectura' : 'Datos oficiales de la CLUES · solo lectura' }}</p>
      <dl class="m-0 mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 text-sm">
        <div v-for="row in rows" :key="row.key" class="py-1"><dt class="text-gray-500">{{ row.label }}</dt><dd class="m-0 text-gray-800 break-words">{{ row.value }}</dd></div>
      </dl>
      <p v-if="namesDiffer" class="m-0 mt-2 text-sm text-gray-600">El nombre oficial es distinto del nombre que usas. Es normal: no cambiamos tus datos. Si el nombre oficial está desactualizado, se corrige con un trámite ante la autoridad, no en MedSync.</p>
      <p class="m-0 mt-2 text-sm text-gray-600">El catálogo SIS no publica domicilio oficial.</p>
      <details v-if="source" class="mt-2 text-sm text-gray-600"><summary class="cursor-pointer">Fuente y versión</summary>
        <p class="m-0 mt-1 break-words">{{ source.sourceVersion }} · release {{ source.releaseId }} · en MedSync desde {{ source.validFrom }} ({{ source.validityBasis === 'download_date' ? 'fecha de descarga, no fecha oficial' : source.validityBasis }}){{ status.key === 'stale' ? ' · sustituida por una versión posterior' : '' }}</p></details>
    </div>
    <p v-if="unit.validFrom || unit.validTo" class="m-0 mt-3 text-sm text-gray-600">Periodo de asociación con tu cuenta: {{ date(unit.validFrom) }} → {{ unit.validTo ? date(unit.validTo) : 'sin fecha de fin' }}</p>
    <p v-if="unit.updatedAt" class="m-0 mt-1 text-xs text-gray-500">Última actualización {{ date(unit.updatedAt) }}. MedSync todavía no conserva el historial de cambios de esta unidad.</p>
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
