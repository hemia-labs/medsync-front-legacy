<template>
  <fieldset class="unit-editor min-w-0" :disabled="busy">
    <legend class="sr-only">Editar unidad</legend>
    <div class="unit-editor-grid">
      <section data-field="displayName" class="unit-editor-name">
        <h4>El nombre que usa tu equipo</h4>
        <p class="unit-editor-help">Elige un nombre que te ayude a reconocer esta unidad, como el de tu consultorio o el de una sede.</p>
        <v-text-field :value="form.displayName" @input="set('displayName', $event)" label="Nombre de la unidad en MedSync *" maxlength="250" counter outlined dense :error-messages="errors.displayName" />
        <div v-if="business.name" class="unit-name-suggestion">
          <v-icon size="19" color="inherit" aria-hidden="true">mdi-lightbulb-outline</v-icon>
          <div><p>Puedes usar tu nombre comercial</p><p class="unit-editor-help">Copia «{{ business.name }}» como nombre de esta unidad. Después puedes ajustarlo para distinguir una sede.</p>
            <button v-if="form.displayName !== business.name" type="button" class="unit-link" @click="useBusinessName">Usar nombre comercial</button>
            <span v-else class="unit-name-applied">Ya estás usando este nombre.</span>
          </div>
        </div>
      </section>
      <section data-field="cluesRef" class="unit-editor-clues">
        <h4>CLUES del establecimiento <span class="unit-optional">Opcional en MedSync</span></h4>
        <p class="unit-editor-help">Si aún no tienes la clave, puedes añadirla después.</p>
        <catalog-reference-field :value="form.cluesRef" family="sis.establishments" label="CLUES, opcional" guided :disabled="busy" :errors="errors.cluesRef || []" @input="set('cluesRef', $event)" />
        <div v-if="form.cluesRef" class="unit-selection" role="status" aria-live="polite">
          <span class="unit-selection-label">{{ form.cluesRef.releaseId ? 'Referencia elegida' : 'CLUES capturada manualmente' }}</span>
          <span class="unit-selection-code">{{ form.cluesRef.code }}</span>
          <p>{{ selectedLabel || (form.cluesRef.releaseId ? 'Nombre oficial no disponible por ahora' : 'Sin verificar en el catálogo') }}</p>
        </div>
        <details class="unit-help" :open="Boolean(codeChanged)">
          <summary>{{ codeChanged ? 'Antes de guardar una clave diferente' : '¿Necesitas corregir o cambiar la CLUES?' }}</summary>
          <p>Si escribiste mal la clave de esta unidad, puedes corregir la captura aquí.</p>
          <p>Si la autoridad te asignó otra CLUES por una sustitución oficial, registra una unidad nueva, incluso si está en el mismo inmueble:</p>
          <ol><li>Marca la unidad anterior como inactiva y guarda ese cambio.</li><li>Usa Agregar otra unidad para registrar la nueva clave.</li></ol>
          <p>Así conservas ambas unidades. Cada paso se guarda por separado.</p>
        </details>
      </section>
    </div>
    <div class="unit-activity">
      <div><h4>Estado de esta unidad</h4><p :id="'unit-active-help-' + _uid" class="unit-editor-help">Déjala activa mientras la uses. Si ya no la utilizas, márcala inactiva para conservarla como referencia.</p>
        <details class="unit-help"><summary>Qué cambia al marcarla inactiva</summary><p>Por ahora, las atenciones funcionan igual en ambos estados y los registros anteriores se conservan. El estado oficial de la CLUES se consulta en el catálogo.</p></details>
      </div>
      <v-switch :input-value="form.active" @change="set('active', Boolean($event))" inset hide-details class="m-0" :aria-describedby="'unit-active-help-' + _uid" label="Activa en MedSync" />
    </div>
    <details class="unit-period unit-help" :open="showPeriod" @toggle="showPeriod = $event.target.open">
      <summary>Fechas de esta unidad (opcional)</summary>
      <p>Si te sirve como referencia, indica desde cuándo usas esta unidad y cuándo dejaste de usarla en tu cuenta. Estas fechas no son la vigencia oficial de la CLUES.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <v-text-field :value="form.validFrom" @input="set('validFrom', $event || null)" type="date" label="Desde" outlined dense :error-messages="errors.validFrom" />
        <v-text-field :value="form.validTo" @input="set('validTo', $event || null)" type="date" label="Hasta (sin incluir)" hint="El día indicado queda fuera del periodo." persistent-hint outlined dense :error-messages="errors.validTo" />
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
