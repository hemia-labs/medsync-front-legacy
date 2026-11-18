<template>
  <div class="catalog-field">
    <div v-if="guided" class="catalog-field-modes" role="group" aria-label="Cómo añadir la CLUES">
      <button type="button" :aria-pressed="String(!manual)" :disabled="disabled" @click="manual && toggle()">Buscar en catálogo</button>
      <button type="button" :aria-pressed="String(manual)" :disabled="disabled" @click="!manual && toggle()">Ingresar mi CLUES</button>
    </div>
    <p v-if="guided" class="catalog-field-guidance">{{ manual ? 'Si tu clave no aparece en la búsqueda, puedes ingresarla tal como te la asignaron.' : 'Escribe tu CLUES o el nombre del establecimiento y elige una coincidencia de la lista.' }}</p>
    <v-autocomplete v-if="!manual" :id="inputId" :value="selected" :items="options" item-text="text" item-value="key" return-object
      :search-input.sync="search" :label="guided ? 'Buscar por CLUES o nombre' : label" :loading="loading" :disabled="disabled" :error-messages="errors" :hint="hint" persistent-hint
      outlined dense clearable no-filter :menu-props="{ offsetY: true, maxHeight: 280, contentClass: guided ? 'clues-catalog-menu' : '' }" :no-data-text="guided ? 'No encontramos coincidencias. Si ya tienes tu clave, usa Ingresar mi CLUES.' : 'Sin coincidencias. Puedes capturar una clave conocida.'"
      @focus="load" @change="select">
      <template v-if="guided" v-slot:selection="{ item }"><span class="catalog-field-code">{{ item.ref.code }}</span></template>
      <template v-if="guided" v-slot:item="{ item }"><div class="catalog-field-result"><span class="catalog-field-code">{{ item.ref.code }}</span><span>{{ item.text.replace(' · ' + item.ref.code, '') }}</span></div></template>
      <template v-slot:append-item><v-btn v-if="hasMore" text small :disabled="loading" @click="load(true)">Más resultados</v-btn></template>
    </v-autocomplete>
    <v-text-field v-else :id="inputId" :value="value && value.code" :label="guided ? 'Tu CLUES' : label" :disabled="disabled" :error-messages="errors"
      :hint="guided ? 'Se guardará como captura manual, sin verificar en el catálogo.' : 'Captura una clave conocida; quedará no verificada.'" persistent-hint maxlength="32" outlined dense @input="typeCode" @change="commitCode" />
    <div class="catalog-field-actions">
      <button v-if="!guided" type="button" :disabled="disabled" @click="toggle">{{ manual ? 'Buscar en catálogo' : 'Capturar clave manual' }}</button>
      <button v-if="failure" type="button" :disabled="disabled || loading" @click="retry">Reintentar consulta</button>
    </div>
    <p v-if="failure" class="catalog-field-note" role="status">No se pudo consultar. Conservamos el dato sin verificar.</p>
  </div>
</template>
<script>
import { DACore } from '../../services/config/axios.context';
import { authorizationContext, isCurrentAuthorization } from '../../security/authorizationContext';
import { cleanReference, candidateReference, referenceKey } from '../../domain/identity/catalogCapture';
export default {
  props: { value: { default: null }, family: { type: String, required: true }, label: String, id: String, disabled: Boolean, guided: Boolean,
    active: { type: Boolean, default: true }, parent: { type: String, default: '' }, errors: { type: Array, default: () => [] } },
  data: () => ({ rows: [], search: '', manual: false, loading: false, available: null, failure: false, hasMore: false, check: null, sequence: 0, checkSequence: 0, timer: null, alive: true }),
  computed: {
    inputId() { return this.id || 'catalog-' + this._uid; },
    selected() { return this.value ? { key: referenceKey(this.value), ref: this.value, text: (this.check && this.check.label ? this.check.label + ' · ' : '') + this.value.code } : null; },
    options() { const selected = this.selected; return selected && !this.rows.some(r => r.key === selected.key) ? [selected, ...this.rows] : this.rows; },
    owner() { return JSON.stringify(authorizationContext(this.$store)); },
    hint() {
      if (this.guided) {
        if (this.value && this.value.releaseId && !this.check && !this.failure) return 'Consultando la referencia guardada…';
        if (this.check && this.check.result === 'invalid') return 'Esta clave no coincide con la versión consultada. Revisa que esté bien escrita.';
        if (this.value) return this.check && this.check.result === 'valid' ? 'Encontramos esta clave en el catálogo.' : 'Esta referencia aún está sin verificar.';
        return this.available === false ? 'El catálogo no está disponible. Puedes ingresar tu clave o añadirla después.' : 'Seleccionar un resultado lo añade al formulario; después pulsa Guardar unidad.';
      }
      if (this.check && this.check.result === 'invalid') return 'La clave no es válida en el catálogo indicado. Revisa el dato antes de guardar.';
      if (this.value) return this.check && this.check.result === 'valid' ? 'Clave ' + this.value.code + ' · Coincide con catálogo · ' + (this.check.source.sourceVersion || this.check.source.releaseId) : 'No verificado' + (this.value.releaseId ? ' · se conserva la versión capturada' : ' · clave capturada manualmente');
      return this.available === false ? 'Catálogo no disponible. Puedes dejarlo pendiente o capturar una clave conocida.' : 'Busca por nombre o clave. Selecciona un resultado; escribir no lo guarda.';
    }
  },
  watch: {
    search() { clearTimeout(this.timer); this.sequence++; this.timer = setTimeout(() => this.load(), 300); },
    value: { deep: true, handler() { this.resolve(); } },
    active(value) { if (value) this.resolve(); else { this.sequence++; this.checkSequence++; this.loading = false; } },
    parent() { this.rows = []; this.sequence++; if (this.active) this.load(); },
    owner() { this.sequence++; this.checkSequence++; this.rows = []; this.check = null; this.available = null; this.loading = false; clearTimeout(this.timer); }
  },
  mounted() { if (this.guided && this.value && !this.value.releaseId) this.manual = true; if (this.active) this.resolve(); },
  beforeDestroy() { this.alive = false; this.sequence++; this.checkSequence++; clearTimeout(this.timer); },
  methods: {
    current(owner) { return this.alive && this.active && isCurrentAuthorization(owner, this.$store); },
    async load(more = false) {
      if (!this.active || this.disabled || this.manual) return;
      more = more === true;
      const seq = ++this.sequence, owner = authorizationContext(this.$store), offset = more ? this.rows.length : 0;
      this.loading = true; this.failure = false;
      try {
        const q = this.selected && this.search === this.selected.text ? '' : this.search || '';
        const r = await DACore.get('api/identity/catalogs/' + encodeURIComponent(this.family), { params: { q, parent: this.parent, offset } });
        if (seq !== this.sequence || !this.current(owner)) return;
        if (!r.success) throw new Error('catalog');
        this.available = r.data.available; this.hasMore = r.data.hasMore;
        const rows = r.data.items.map(item => ({ ref: item.ref, key: referenceKey(item.ref), text: item.label + ' · ' + item.ref.code }));
        this.rows = more ? [...this.rows, ...rows] : rows;
      } catch (_) { if (seq === this.sequence && this.current(owner)) { this.failure = true; this.rows = []; this.hasMore = false; } }
      finally { if (seq === this.sequence && this.current(owner)) this.loading = false; }
    },
    async resolve() {
      const seq = ++this.checkSequence, owner = authorizationContext(this.$store);
      this.check = null;
      if (!this.value || !this.value.releaseId || !this.active) return;
      try {
        const r = await DACore.get('api/identity/catalogs/' + encodeURIComponent(this.family), { params: { code: this.value.code, releaseId: this.value.releaseId } });
        if (seq !== this.checkSequence || !this.current(owner)) return;
        if (!r.success) throw new Error('catalog');
        this.check = r.data.check;
      } catch (_) { if (seq === this.checkSequence && this.current(owner)) this.failure = true; }
    },
    select(item) { if (!this.disabled) { const ref = cleanReference(item && item.ref); this.$emit('input', ref); this.$emit('commit', ref); } },
    typeCode(text) { if (!this.disabled) this.$emit('input', candidateReference(this.family, text)); },
    commitCode(text) { if (!this.disabled) this.$emit('commit', candidateReference(this.family, text)); },
    toggle() { this.manual = !this.manual; clearTimeout(this.timer); this.sequence++; this.loading = false; if (!this.manual) { this.search = ''; this.load(); } },
    retry() { this.failure = false; this.resolve(); this.load(); }
  }
};
</script>
<style scoped>
.catalog-field { min-width: 0; margin-bottom: 12px; }
.catalog-field-modes { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px; border: 1px solid var(--clinic-border, #d8e4e7); border-radius: 12px; background: var(--clinic-soft, #f6f9fa); margin-bottom: 12px; }
.catalog-field-modes button { flex: 1; min-width: 130px; min-height: 38px; padding: 7px 10px; border: 1px solid transparent; border-radius: 8px; font-size: 13px; color: var(--clinic-muted, #526774); }
.catalog-field-modes button[aria-pressed="true"] { background: var(--clinic-surface, #fff); border-color: var(--clinic-accent, #096b78); color: var(--clinic-accent, #096b78); box-shadow: 0 1px 4px #0f334815; }
.catalog-field-modes button:focus-visible { outline: 2px solid var(--clinic-accent, #096b78); outline-offset: 1px; }
.catalog-field .catalog-field-guidance { font-size: 13px; color: var(--clinic-muted, #526774); line-height: 1.6; margin: 0 0 20px; }
.catalog-field-code { font-family: ui-monospace, monospace; font-size: 14px; font-weight: 400; color: var(--clinic-ink, #163d46); }
.catalog-field-result { display: grid; gap: 3px; padding: 8px 0; white-space: normal; overflow-wrap: anywhere; font-size: 13px; line-height: 1.45; }
.catalog-field-actions { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.catalog-field-actions button { color: var(--v-primary-base, #00728c); font-size: 12px; min-height: 32px; text-align: left; }
.catalog-field-actions button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.catalog-field-actions button:disabled { opacity: .55; }
.catalog-field-note { font-size: 12px; margin: 0; }
.catalog-field ::v-deep .v-select__selection { max-width: 100%; }
html[data-theme="clinical-night"] .catalog-field-actions button { color: #7dd3fc; }
html[data-theme="clinical-night"] .catalog-field-note { color: #cbd5e1; }
html[data-theme="clinical-night"] .catalog-field ::v-deep .v-messages:not(.error--text),
html[data-theme="clinical-night"] .catalog-field ::v-deep .v-label { color: #cbd5e1; }
/* The global night input background otherwise covers Vuetify's label. */
html[data-theme="clinical-night"] .catalog-field ::v-deep input { background-color: transparent !important; }
html[data-theme="clinical-night"] .catalog-field ::v-deep .error--text { color: #fda4af !important; }
html[data-theme="clinical-night"] .catalog-field-code { color: #e2e8f0; }
html[data-theme="clinical-night"] .catalog-field-result { color: #e2e8f0; }
</style>
