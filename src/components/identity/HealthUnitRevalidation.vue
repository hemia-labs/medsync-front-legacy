<template>
  <section class="unit-reval mt-4 p-3 border" aria-live="polite" :aria-busy="String(busy)" aria-label="Comprobar con la versión vigente">
    <p class="m-0 text-xs font-bold uppercase tracking-wider text-gray-500">Comprobación con la versión vigente · no cambia nada por sí sola</p>
    <p v-if="state === 'loading'" class="m-0 mt-2 text-sm text-gray-700" role="status">Consultando la versión vigente del catálogo SIS…</p>
    <template v-else-if="state === 'unavailable'">
      <p class="m-0 mt-2 text-sm text-gray-700" role="alert">No pudimos consultar la versión vigente. No cambiamos nada; la referencia guardada se conserva.</p>
    </template>
    <template v-else-if="state === 'missing'">
      <p class="m-0 mt-2 text-sm text-gray-700" role="status">La clave <span class="font-mono">{{ code }}</span> no aparece en la versión vigente ({{ current.source.sourceVersion }}). Esto <strong>no demuestra una baja oficial</strong>: el catálogo SIS no incluye todas las unidades. No cambiamos nada.</p>
    </template>
    <template v-else-if="state === 'same'">
      <p class="m-0 mt-2 text-sm text-gray-700" role="status">La referencia ya usa la versión vigente ({{ current.source.sourceVersion }}). No hay nada que actualizar.</p>
    </template>
    <template v-else-if="state === 'found'">
      <p class="m-0 mt-2 text-sm text-gray-700" role="status">La clave <span class="font-mono">{{ code }}</span> aparece en la versión vigente. Revisa las diferencias antes de decidir.</p>
      <p class="m-0 mt-2 text-sm text-gray-700 break-words">Guardada (ya no vigente): <strong>{{ savedSource && savedSource.sourceVersion }}</strong> · release {{ savedSource && savedSource.releaseId }}<br>Vigente: <strong>{{ current.source.sourceVersion }}</strong> · release {{ current.source.releaseId }}</p>
      <div class="unit-compare mt-2 min-w-0">
        <table class="w-full text-sm">
          <caption class="sr-only">Datos oficiales en la versión guardada y en la vigente</caption>
          <thead><tr><th scope="col">Dato</th><th scope="col">Versión guardada · ya no vigente<span class="block font-normal break-words">{{ savedSource && savedSource.sourceVersion }}</span></th><th scope="col">Versión vigente<span class="block font-normal break-words">{{ current.source.sourceVersion }}</span></th></tr></thead>
          <tbody><tr v-for="row in rows" :key="row.key" :class="{ 'unit-compare--changed': row.changed }"><th scope="row">{{ row.label }}</th><td data-label="Guardada (ya no vigente)">{{ row.before }}</td><td data-label="Vigente">{{ row.after }}<span v-if="row.changed" class="block text-xs unit-warn">Cambió</span></td></tr></tbody>
        </table>
      </div>
      <p class="m-0 mt-2 text-sm text-gray-600">Actualizar solo cambia la versión de la referencia CLUES de esta unidad. No cambia el nombre en MedSync, los datos del consultorio ni atenciones anteriores.</p>
    </template>
    <v-alert v-if="conflict" type="warning" text role="alert" class="mt-3 mb-0">Otra persona guardó cambios en esta unidad. No actualizamos nada ni reenviamos. Cierra y vuelve a comprobar con los datos guardados.</v-alert>
    <v-alert v-else-if="error" type="error" text role="alert" class="mt-3 mb-0">{{ error }}</v-alert>
    <div class="flex flex-wrap gap-2 mt-3">
      <v-btn v-if="state === 'found' && !conflict" class="unit-action--primary" color="primary" depressed :loading="busy" :disabled="busy" @click="$emit('apply')">Actualizar a la versión vigente…</v-btn>
      <v-btn v-if="state === 'unavailable'" class="unit-action" outlined color="primary" :disabled="busy" @click="$emit('retry')">Reintentar consulta</v-btn>
      <v-btn class="unit-action" outlined color="primary" :disabled="busy" @click="$emit('close')">{{ state === 'found' && !conflict ? 'Cerrar sin cambios' : 'Cerrar' }}</v-btn>
    </div>
  </section>
</template>
<script>
import { compareAttributes } from '../../domain/identity/healthUnits';
export default {
  name: 'HealthUnitRevalidation',
  props: { state: String, code: String, saved: Object, savedSource: Object, current: Object, busy: Boolean, error: String, conflict: Boolean },
  computed: { rows() { return compareAttributes(this.saved, this.current && this.current.attributes); } }
};
</script>
