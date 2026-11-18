<template>
  <div class="min-w-0">
    <div class="flex flex-wrap items-center gap-2">
      <h4 class="m-0 text-gray-800 text-base font-semibold break-words">{{ unit.displayName }}</h4>
      <span class="unit-chip" :class="unit.active ? 'unit-chip--on' : 'unit-chip--off'">{{ unit.active ? 'Disponible para atención' : 'Inactiva en MedSync' }}</span>
    </div>
    <dl class="m-0 mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6">
      <div class="py-2"><dt class="text-xs font-bold uppercase tracking-wider text-gray-500">CLUES</dt>
        <dd class="m-0 mt-1"><span v-if="unit.cluesRef" class="font-mono text-gray-800 text-base">{{ unit.cluesRef.code }}</span>
          <span class="unit-status block text-sm mt-1" :class="'unit-status--' + status.key">{{ status.text }}</span></dd></div>
      <div class="py-2"><dt class="text-xs font-bold uppercase tracking-wider text-gray-500">Domicilio</dt>
        <dd class="m-0 mt-1 text-gray-700 text-sm whitespace-pre-line break-words" v-if="single">{{ business.address || 'Sin domicilio en Datos del consultorio' }}<span class="block text-gray-500">Tomado de Datos del consultorio.</span></dd>
        <dd class="m-0 mt-1 text-gray-500 text-sm" v-else>Con varias unidades, el domicilio por unidad aún no se registra (decisión pendiente).</dd></div>
    </dl>
    <div v-if="official" class="unit-official mt-3 p-3 border border-gray-200">
      <p class="m-0 text-xs font-bold uppercase tracking-wider text-gray-500">Datos oficiales de la CLUES · solo lectura</p>
      <dl class="m-0 mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 text-sm">
        <div class="py-1"><dt class="text-gray-500">Nombre oficial</dt><dd class="m-0 text-gray-800 break-words">{{ official.nombre_unidad }}</dd></div>
        <div class="py-1"><dt class="text-gray-500">Institución</dt><dd class="m-0 text-gray-800">{{ official.institucion }}</dd></div>
        <div class="py-1"><dt class="text-gray-500">Tipo de establecimiento</dt><dd class="m-0 text-gray-800">{{ unitType }}</dd></div>
        <div class="py-1"><dt class="text-gray-500">Tipología / subtipología</dt><dd class="m-0 text-gray-800">{{ official.tip_abreviacion }} / {{ official.sub_abreviacion }}</dd></div>
        <div class="py-1"><dt class="text-gray-500">Entidad federativa</dt><dd class="m-0 text-gray-800">{{ official.id_entidad_federativa }}</dd></div>
        <div class="py-1"><dt class="text-gray-500">Situación en esa versión</dt><dd class="m-0 text-gray-800">{{ official.en_operacion === '1' ? 'En operación' : 'Clave ' + official.en_operacion }}</dd></div>
      </dl>
      <p v-if="namesDiffer" class="m-0 mt-2 text-sm text-gray-600">El nombre oficial es distinto del nombre que usas. Es normal: no cambiamos tus datos. Si el nombre oficial está desactualizado, se corrige con un trámite ante la autoridad, no en MedSync.</p>
      <p class="m-0 mt-2 text-sm text-gray-600">El catálogo SIS no publica domicilio oficial.</p>
      <details v-if="source" class="mt-2 text-sm text-gray-600"><summary class="cursor-pointer">Fuente y versión</summary>
        <p class="m-0 mt-1 break-words">{{ source.sourceVersion }} · vigente en MedSync desde {{ source.validFrom }} ({{ source.validityBasis === 'download_date' ? 'fecha de descarga, no fecha oficial' : source.validityBasis }})</p></details>
    </div>
    <p v-if="unit.validFrom || unit.validTo" class="m-0 mt-3 text-sm text-gray-600">Asociada a tu cuenta: {{ date(unit.validFrom) }} → {{ unit.validTo ? date(unit.validTo) : 'sin fecha de fin' }}</p>
    <p v-if="unit.updatedAt" class="m-0 mt-1 text-xs text-gray-500">Última actualización {{ date(unit.updatedAt) }}. MedSync todavía no conserva el historial de cambios de esta unidad.</p>
  </div>
</template>
<script>
import { cluesStatus, UNIT_TYPES } from '../../domain/identity/healthUnits';
export default {
  name: 'HealthUnitSummary',
  props: { unit: Object, business: Object, single: Boolean },
  computed: {
    status() { return cluesStatus(this.unit); },
    source() { const c = (this.unit.catalogChecks || []).find(x => x.field === 'cluesRef'); return c && c.source || null; },
    official() { return this.unit.catalogAttributes || null; },
    namesDiffer() { return this.official && this.official.nombre_unidad && ![this.unit.displayName, this.business.name].some(n => String(n || '').trim().toUpperCase() === this.official.nombre_unidad.toUpperCase()); },
    unitType() { return this.official && (UNIT_TYPES[this.official.tipo_unidad] || 'Clave ' + this.official.tipo_unidad); }
  },
  methods: { date(v) { return v ? String(v).slice(0, 10) : 'Sin fecha'; } }
};
</script>
