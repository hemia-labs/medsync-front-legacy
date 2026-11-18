<template>
  <!-- NC1 identidad simple/integrada: system (outlined) controls. Names are three plain fields, always visible:
       no «has surname / declares none» selectors; an empty field stays pending (the server derives the status).
       The other updaters keep their current values on purpose (payload compatibility; normalization N1 is separate). -->
  <section class="idf" role="group" :aria-labelledby="heading ? uid + '-title' : null" :aria-label="heading ? null : title" :aria-describedby="uid + '-hint'">
    <header v-if="heading" class="idf-head">
      <h3 :id="uid + '-title'" class="idf-title">{{ title }}</h3>
    </header>
    <p :id="uid + '-hint'" class="idf-hint">Lo que no captures queda pendiente. No se deduce del nombre ni de otros documentos.</p>

    <div class="idf-grid">
      <template v-if="names">
        <div ref="f-givenNames"><v-text-field v-field-error="fe('givenNames', requiredNames)" :id="uid + '-givenNames'" :value="value.givenNames" :label="requiredNames ? 'Nombre(s) *' : 'Nombre(s)'" autocomplete="given-name" maxlength="500" outlined dense :disabled="disabled" :error-messages="err('givenNames')" @input="set('givenNames', nullable($event))"></v-text-field></div>
        <div ref="f-firstSurname"><v-text-field v-field-error="fe('firstSurname', requiredNames)" :id="uid + '-firstSurname'" :value="value.firstSurname" :label="requiredNames ? 'Primer apellido *' : 'Primer apellido'" autocomplete="family-name" maxlength="500" outlined dense :disabled="disabled" :error-messages="err('firstSurname')" @input="set('firstSurname', nullable($event))"></v-text-field></div>
        <div ref="f-secondSurname"><v-text-field v-field-error="fe('secondSurname')" :id="uid + '-secondSurname'" :value="value.secondSurname" label="Segundo apellido, opcional" maxlength="500" outlined dense :disabled="disabled" :error-messages="err('secondSurname')" @input="set('secondSurname', nullable($event))"></v-text-field></div>
        <div ref="f-birthDate"><v-text-field v-field-error="fe('birthDate')" :id="uid + '-birthDate'" :value="value.birthDate" type="date" :max="today" label="Fecha de nacimiento, opcional" outlined dense :disabled="disabled" :error-messages="err('birthDate')" @input="set('birthDate', nullable($event))"></v-text-field></div>
      </template>

      <div v-if="kind === 'patient'" ref="f-biologicalSex">
        <v-select v-field-error="fe('biologicalSex', requiredSex)" :id="uid + '-biologicalSex'" :value="value.biologicalSex || ''" :items="items(sexes)" :label="requiredSex ? 'Sexo biológico *' : 'Sexo biológico, opcional'" outlined dense :disabled="disabled" :error-messages="err('biologicalSex')" :menu-props="{ offsetY: true }" @change="set('biologicalSex', nullable($event))"></v-select>
      </div>
      <div v-for="(options, key) in enumerations" :key="key" :ref="'f-' + key">
        <v-select v-field-error="fe(key)" :id="uid + '-' + key" :value="value[key] || ''" :items="items(options)" :label="labels[key] + ', opcional'" outlined dense :disabled="disabled" :error-messages="err(key)" :menu-props="{ offsetY: true }" @change="set(key, nullable($event))"></v-select>
      </div>

      <div ref="f-curp"><v-text-field v-field-error="fe('curp')" :id="uid + '-curp'" :value="value.curp && value.curp.value" label="CURP, opcional" maxlength="18" outlined dense :disabled="disabled" :error-messages="err('curp')" @input="curp($event)"></v-text-field></div>
      <template v-if="value.curp">
        <!-- Required by the contract once a CURP exists: no «opcional» suffix. -->
        <div ref="f-curp.kind"><v-select v-field-error="fe('curp.kind')" :id="uid + '-curpKind'" :value="value.curp.kind" :items="curpKinds" label="Tipo de CURP" outlined dense :disabled="disabled" :error-messages="err('curp.kind')" :menu-props="{ offsetY: true }" @change="set('curp', { ...value.curp, kind: $event })"></v-select></div>
        <div v-if="value.curp.kind === 'generic'" ref="f-curp.reason" class="idf-wide"><v-text-field v-field-error="fe('curp.reason')" :id="uid + '-curpReason'" :value="value.curp.reason" label="Motivo de CURP genérica" maxlength="250" outlined dense :disabled="disabled" :error-messages="err('curp.reason')" @input="set('curp', { ...value.curp, reason: $event })"></v-text-field></div>
      </template>
    </div>

    <template v-if="!compact">
      <button type="button" class="idf-toggle" :disabled="disabled" :aria-expanded="String(open)" :aria-controls="uid + '-refs'" @click="open = !open">
        <v-icon small>{{ open ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        <span>{{ refsTitle }}<span v-if="referenceCount" class="idf-count"> · {{ referenceCount }} capturada{{ referenceCount === 1 ? '' : 's' }}</span></span>
      </button>
      <div v-show="open" :id="uid + '-refs'" class="idf-refs">
        <p class="idf-note">Busca por nombre o clave. Los datos sin catálogo disponible quedan no verificados. Guardar no acredita validez para un reporte.</p>
        <div class="idf-grid">
          <div v-for="ref in references" :key="ref.key" :ref="'f-' + ref.key">
            <catalog-reference-field :id="uid + '-' + ref.key.replace('.', '-')" :value="referenceAt(value, ref.key)" :family="ref.family" :label="ref.label + ', opcional'" :parent="catalogParent(value, ref.key)" :active="open" :disabled="disabled" :errors="err(ref.key)" @input="$emit('input', withCatalogReference(value, ref.key, $event))" />
          </div>
          <div v-if="kind === 'patient'" ref="f-affiliations" class="idf-wide">
            <catalog-reference-list :value="value.affiliations" family="sis.affiliation" label="Afiliación" :active="open" :disabled="disabled" :errors="err('affiliations')" @input="set('affiliations', $event)" />
          </div>
          <!-- v-if: without canManage the control is not in the DOM. -->
          <div v-if="kind === 'professional' && canManage" ref="f-authorizedPersonnelTypes" class="idf-wide">
            <catalog-reference-list :value="value.authorizedPersonnelTypes" family="sis.personnel_type" label="Tipo de personal" :active="open" :disabled="disabled" :errors="err('authorizedPersonnelTypes')" @input="set('authorizedPersonnelTypes', $event)" />
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script>
import CatalogReferenceField from './CatalogReferenceField.vue';
import CatalogReferenceList from './CatalogReferenceList.vue';
import { referenceAt, withCatalogReference, catalogParent } from '../../domain/identity/catalogCapture';
import fieldError from '../../core/directives/field-error';
const COLLAPSED = ['birthCountry', 'birthEntity', 'nationality', 'originCountry', 'residence.country', 'residence.entity', 'residence.municipality', 'residence.locality', 'residence.postalCode', 'affiliations', 'authorizedPersonnelTypes'];
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export default {
  name: 'IdentityFields',
  components: { CatalogReferenceField, CatalogReferenceList },
  directives: { fieldError },
  props: { value: { type: Object, required: true }, kind: { type: String, default: 'patient' }, names: { type: Boolean, default: true }, requiredSex: Boolean, requiredNames: Boolean,
    disabled: Boolean, compact: Boolean, canManage: Boolean, heading: { type: Boolean, default: true },
    // Presentation only: { field: [messages] }. Without it nothing changes.
    errors: { type: Object, default: () => ({}) } },
  data() {
    return {
      open: false, uid: 'idf-' + this._uid, today: localToday(),
      sexes: { 1: 'Hombre', 2: 'Mujer', 3: 'Intersexual' },
      curpKinds: [{ text: 'Personal', value: 'real' }, { text: 'Genérica', value: 'generic' }],
      labels: { genderIdentity: 'Género', indigenousSelfIdentification: '¿Se autodenomina indígena?', afromexicanSelfIdentification: '¿Se autodenomina afromexicano/a?', migrantStatus: 'Situación migratoria' }
    };
  },
  computed: {
    title() { return this.kind === 'professional' ? 'Identidad profesional' : 'Identidad del paciente'; },
    // The professional contract only stores birth country (+ personnel types for administrators): no residence.
    refsTitle() { return this.kind === 'professional' ? 'Claves opcionales' : 'Claves de nacimiento y residencia, opcional'; },
    enumerations() { const declaration = { yes: 'Sí', no: 'No', declined: 'No responde', unknown_to_patient: 'No sabe' }; return this.kind === 'professional' ? {} : { genderIdentity: { 0: 'No especificado', 1: 'Masculino', 2: 'Femenino', 3: 'Transgénero', 4: 'Transexual', 5: 'Travesti', 6: 'Intersexual', 88: 'Otro' }, indigenousSelfIdentification: declaration, afromexicanSelfIdentification: declaration, migrantStatus: { none: 'No migrante', national: 'Nacional', international: 'Internacional', returned: 'Retornado' } }; },
    references() { const base = [{ key: 'birthCountry', family: 'sis.country', label: 'País de nacimiento', format: 'Clave de país' }]; return this.kind === 'professional' ? base : base.concat([
      { key: 'birthEntity', family: 'sis.federal_entity', label: 'Entidad de nacimiento', format: 'Clave DGIS' }, { key: 'nationality', family: 'renapo.nationality', label: 'Nacionalidad', format: 'Clave RENAPO' }, { key: 'originCountry', family: 'sis.country', label: 'País de procedencia', format: 'Clave de país' },
      { key: 'residence.country', family: 'sis.country', label: 'País de residencia', format: 'Clave de país' }, { key: 'residence.entity', family: 'inegi.state', label: 'Entidad de residencia', format: 'Clave EE' }, { key: 'residence.municipality', family: 'inegi.municipality', label: 'Municipio', format: 'Clave EEMMM' }, { key: 'residence.locality', family: 'inegi.locality', label: 'Localidad', format: 'Clave EEMMMLLLL' }, { key: 'residence.postalCode', family: 'sepomex.postal_code', label: 'Código postal', format: '5 dígitos' }]); },
    referenceCount() { return this.references.filter(ref => this.code(ref.key)).length + (this.kind === 'patient' ? (this.value.affiliations || []).length : 0) + (this.canManage ? (this.value.authorizedPersonnelTypes || []).length : 0); }
  },
  watch: {
    // A field error inside the collapsed block opens it, so the message is never hidden.
    errors(next) { if (Object.keys(next || {}).some(key => COLLAPSED.includes(key))) this.open = true; }
  },
  methods: {
    referenceAt, withCatalogReference, catalogParent,
    items(options) { return [{ text: 'Sin capturar', value: '' }].concat(Object.keys(options).map(value => ({ text: options[value], value }))); },
    // An error replaces the hint, so the expected format travels with the message.
    err(field) { const messages = (this.errors && this.errors[field]) || []; const ref = this.references.find(item => item.key === field); return ref && ref.format ? messages.map(m => `${m} Formato: ${ref.format}.`) : messages; },
    fe(field, required = false) { return { id: this.uid + '-' + field.replace('.', '-'), invalid: Boolean(this.err(field).length), required }; },
    // Opens the disclosure first when the field lives inside it, then focuses and scrolls.
    focus(field) {
      if (COLLAPSED.includes(field)) this.open = true;
      this.$nextTick(() => {
        const holder = this.$refs['f-' + field];
        const element = Array.isArray(holder) ? holder[0] : holder;
        const input = element && element.querySelector('input, [role="button"]');
        if (input) { input.focus(); if (element.scrollIntoView) element.scrollIntoView({ block: 'center' }); }
      });
    },
    // ---- Updaters: unchanged semantics (no trimming here; editors normalize names when building the patch). ----
    nullable(v) { return v === '' ? null : v; },
    set(k, v) { this.$emit('input', { ...this.value, [k]: v }); },
    curp(v) { this.set('curp', v ? { value: v.toUpperCase(), kind: (this.value.curp || {}).kind || 'real', ...((this.value.curp || {}).reason ? { reason: this.value.curp.reason } : {}) } : null); },
    code(k) { const r = k.startsWith('residence.') ? (this.value.residence || {})[k.split('.')[1]] : this.value[k]; return r ? r.code : ''; },
    setRef(ref, v) { const r = v ? { family: ref.family, code: v } : null; if (ref.key.startsWith('residence.')) this.set('residence', { ...this.value.residence, [ref.key.split('.')[1]]: r }); else this.set(ref.key, r); },
    setList(k, family, v) { this.set(k, v ? v.split(',').map(code => ({ family, code: code.trim() })) : null); }
  }
};
</script>

<style scoped>
.idf { min-width: 0; }
.idf-head { margin-bottom: 4px; }
.idf-title { margin: 0; font-size: 16px; font-weight: 600; color: #1f2937; }
.idf-hint { margin: 0 0 14px; font-size: 13px; color: #6b7280; }
.idf-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 16px; }
.idf-wide { grid-column: 1 / -1; }
.idf-toggle { display: inline-flex; flex-wrap: nowrap; align-items: center; justify-content: flex-start; text-align: left; gap: 6px; min-height: 44px; padding: 8px 4px; font-size: 14px; font-weight: 600; color: var(--v-primary-base, #00728c); background: transparent; border: 0; cursor: pointer; }
.idf-toggle:disabled { color: #9ca3af; cursor: not-allowed; }
.idf-toggle:focus-visible { outline: 2px solid var(--v-primary-base, #00728c); outline-offset: 2px; border-radius: 4px; }
.idf-count { font-weight: 400; font-size: 12px; color: #6b7280; }
.idf-refs { padding-top: 8px; }
.idf-note { margin: 0 0 12px; font-size: 13px; color: #6b7280; }
html[data-theme="clinical-night"] .idf-title { color: #f1f5f9; }
html[data-theme="clinical-night"] .idf-hint, html[data-theme="clinical-night"] .idf-note, html[data-theme="clinical-night"] .idf-count { color: #cbd5e1; }
html[data-theme="clinical-night"] .idf-toggle { color: #7dd3fc; }
html[data-theme="clinical-night"] .idf ::v-deep .v-messages:not(.error--text) { color: #cbd5e1; }
html[data-theme="clinical-night"] .idf ::v-deep input[type="date"] { color-scheme: dark; }
@media (max-width: 767px) { .idf-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
