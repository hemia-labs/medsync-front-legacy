<template>
  <fieldset class="min-w-0" :disabled="busy">
    <legend class="sr-only">Editar unidad</legend>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div data-field="displayName" class="min-w-0">
        <v-text-field :value="form.displayName" @input="set('displayName', $event)" label="Nombre de la unidad en MedSync *" maxlength="250" counter outlined dense
          :error-messages="errors.displayName" hint="Cómo la reconoce tu equipo. Puede ser tu nombre comercial; no reemplaza el nombre oficial." persistent-hint />
        <button v-if="business.name && form.displayName !== business.name" type="button" class="unit-link text-sm underline" @click="useBusinessName">Usar el nombre comercial «{{ business.name }}»</button>
      </div>
      <div data-field="cluesRef" class="min-w-0">
        <catalog-reference-field :value="form.cluesRef" family="sis.establishments" label="CLUES, opcional" :disabled="busy" :errors="errors.cluesRef || []" @input="set('cluesRef', $event)" />
        <p v-if="form.cluesRef" class="m-0 mt-1 text-sm text-gray-700 break-words unit-selection" role="status" aria-live="polite">Selección: <strong>{{ selectedLabel || 'sin nombre oficial (captura manual o catálogo no disponible)' }}</strong> · <span class="font-mono">{{ form.cluesRef.code }}</span></p>
        <p v-if="codeChanged" class="m-0 mt-1 text-sm unit-warn" role="note">Cambiar la clave aquí <strong>corrige una captura equivocada</strong> de esta misma unidad. Si la autoridad asignó una CLUES nueva (sustitución oficial, aunque sea en el mismo inmueble), no la cambies aquí: conserva esta unidad, márcala inactiva y agrega otra. Son dos guardados separados.</p>
      </div>
    </div>
    <div class="mt-3 flex items-start gap-3">
      <v-switch :input-value="form.active" @change="set('active', Boolean($event))" inset hide-details class="m-0 mt-0" aria-describedby="unit-active-help" label="Activa en MedSync" />
    </div>
    <p id="unit-active-help" class="m-0 mt-1 text-sm text-gray-500">Registro administrativo de tu cuenta. Hoy no bloquea ni asigna atenciones. Marcarla inactiva no borra ni cambia registros anteriores y no es la situación oficial de la CLUES.</p>
    <details class="mt-3" :open="showPeriod" @toggle="showPeriod = $event.target.open">
      <summary class="cursor-pointer text-sm font-semibold text-gray-700">Periodo de asociación con tu cuenta (opcional)</summary>
      <p class="m-0 mt-1 text-sm text-gray-500">Fechas en que esta unidad perteneció a tu cuenta de MedSync. No es una vigencia oficial: las CLUES no caducan.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <v-text-field :value="form.validFrom" @input="set('validFrom', $event || null)" type="date" label="Desde" outlined dense :error-messages="errors.validFrom" />
        <v-text-field :value="form.validTo" @input="set('validTo', $event || null)" type="date" label="Hasta (sin incluir)" outlined dense :error-messages="errors.validTo" />
      </div>
    </details>
  </fieldset>
</template>
<script>
import CatalogReferenceField from './CatalogReferenceField.vue';
import { DACore } from '../../services/config/axios.context';
import { authorizationContext, isCurrentAuthorization } from '../../security/authorizationContext';
export default {
  name: 'HealthUnitEditor',
  components: { CatalogReferenceField },
  props: { form: Object, business: Object, errors: Object, busy: Boolean, saved: Object },
  data: () => ({ showPeriod: false, selectedLabel: '', seq: 0 }),
  watch: { 'form.cluesRef': { immediate: true, handler: 'describe' } },
  created() { this.showPeriod = Boolean(this.form.validFrom || this.form.validTo); },
  methods: {
    set(key, value) { this.$emit('update:form', { ...this.form, [key]: value }); },
    // Full official name below the field: the autocomplete input truncates it at 390.
    async describe(ref) {
      const seq = ++this.seq, owner = authorizationContext(this.$store); this.selectedLabel = '';
      if (!ref || !ref.releaseId) return;
      if (this.saved && this.saved.catalogAttributes && this.saved.cluesRef && this.saved.cluesRef.code === ref.code && this.saved.cluesRef.releaseId === ref.releaseId) { this.selectedLabel = this.saved.catalogAttributes.nombre_unidad; return; }
      try {
        const r = await DACore.get('api/identity/catalogs/sis.establishments', { params: { code: ref.code, releaseId: ref.releaseId } });
        if (seq === this.seq && isCurrentAuthorization(owner, this.$store) && r.success && r.data.check && r.data.check.label) this.selectedLabel = r.data.check.label;
      } catch (_) { /* the field itself reports the catalog failure */ }
    },
    useBusinessName() { this.set('displayName', this.business.name || ''); },
    focusFirst(field) { const el = this.$el.querySelector('[data-field="' + (field || 'displayName') + '"] input'); if (el) { el.focus(); return true; } return false; }
  },
  computed: {
    codeChanged() { return this.saved && this.saved.cluesRef && (!this.form.cluesRef || this.form.cluesRef.code !== this.saved.cluesRef.code); }
  }
};
</script>
