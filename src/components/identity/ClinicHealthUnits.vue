<template>
  <article class="health-units min-w-0 border border-gray-200 bg-white shadow-sm p-5" aria-labelledby="health-units-title">
    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
      <div class="flex items-start gap-3 min-w-0">
        <div class="flex items-center justify-center w-10 h-10 bg-primary-100 text-primary-900 border border-primary-200 shrink-0">
          <v-icon color="inherit" size="22">mdi-hospital-building</v-icon>
        </div>
        <div class="min-w-0">
          <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Establecimiento de salud</p>
          <h3 id="health-units-title" class="m-0 text-gray-700 text-lg font-semibold">Unidad de atención y CLUES</h3>
          <p class="m-0 mt-2 text-gray-500 text-sm leading-relaxed">La CLUES identifica ante la Secretaría de Salud el inmueble donde atiendes. Registrarla no cambia el nombre comercial, la razón social ni el contacto del consultorio.</p>
        </div>
      </div>
    </div>

    <p v-if="loading" class="mt-5 text-gray-600" role="status">Cargando las unidades guardadas…</p>
    <v-alert v-else-if="loadError" type="error" text role="alert" class="mt-5">{{ loadError }} <button type="button" class="underline font-semibold" @click="load">Reintentar</button></v-alert>

    <template v-else>
      <!-- Empty state: nothing is created when the page opens; the user starts it explicitly. -->
      <div v-if="!rows.length && !editing" class="mt-5 border border-dashed border-gray-300 p-5">
        <p class="m-0 text-gray-700 font-semibold">Aún no registras la unidad donde atiendes.</p>
        <p class="m-0 mt-1 text-gray-500 text-sm">Si tu consultorio tiene CLUES, regístrala aquí. Usaremos el nombre comercial como punto de partida; nada se guarda hasta que pulses Guardar.</p>
        <v-btn ref="startNew" class="mt-4" color="primary" depressed :disabled="locked" @click="startNew(true)">Registrar la unidad del consultorio</v-btn>
        <p v-if="locked" class="m-0 mt-2 text-sm text-gray-500">Termina o cancela la edición de los datos del consultorio para continuar.</p>
      </div>

      <section v-for="row in visibleRows" :key="row.id" class="unit-card mt-5 border border-gray-200 p-4 min-w-0" :aria-label="'Unidad ' + row.displayName">
        <unit-summary v-if="editing !== row.id" :unit="details[row.id] || row" :business="business" :single="rows.length === 1" />
        <div v-if="editing !== row.id" class="flex flex-wrap gap-2 mt-4">
          <v-btn :ref="'edit-' + row.id" outlined color="primary" :disabled="busy || locked || Boolean(editing) || !details[row.id]" @click="startEdit(row.id)">Editar unidad</v-btn>
        </div>
        <unit-editor v-else ref="editor" :form.sync="form" :business="business" :errors="fieldErrors" :busy="busy" :saved="details[row.id]" />
      </section>

      <section v-if="editing === 'new'" class="unit-card mt-5 border border-primary-200 p-4 min-w-0" aria-label="Nueva unidad">
        <p class="m-0 mb-3 text-primary-900 text-xs font-bold tracking-widest uppercase">{{ rows.length ? 'Otra unidad con su propia CLUES' : 'Unidad del consultorio' }}</p>
        <unit-editor ref="editor" :form.sync="form" :business="business" :errors="fieldErrors" :busy="busy" :saved="null" />
      </section>

      <div v-if="editing" class="mt-4">
        <v-alert v-if="conflict" type="warning" text role="alert" class="mb-3">
          Otra persona guardó cambios en esta unidad. Conservamos tu captura y no enviamos nada.
          <button type="button" class="underline font-semibold" :disabled="busy" @click="reloadSaved">Ver lo guardado y descartar mi captura</button>
        </v-alert>
        <v-alert v-else-if="error" type="error" text role="alert" class="mb-3">{{ error }}</v-alert>
        <div class="flex flex-wrap items-center gap-3">
          <button type="button" class="cursor-pointer border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 font-semibold shadow-sm" :disabled="busy" @click="cancel">Cancelar</button>
          <v-btn ref="save" color="primary" depressed :loading="busy" :disabled="busy || conflict || forbidden" @click="save">{{ busy ? 'Guardando…' : 'Guardar unidad' }}</v-btn>
          <span class="text-sm text-gray-500" role="status">{{ dirty ? 'Cambios sin guardar en esta unidad.' : 'Sin cambios.' }}</span>
        </div>
      </div>

      <details v-if="otherRows.length" class="mt-5" :open="otherOpen" @toggle="otherOpen = $event.target.open">
        <summary class="cursor-pointer text-gray-700 font-semibold">Otras unidades ({{ otherRows.length }})</summary>
        <section v-for="row in otherRows" :key="row.id" class="unit-card mt-3 border border-gray-200 p-4 min-w-0" :aria-label="'Unidad ' + row.displayName">
          <unit-summary v-if="editing !== row.id" :unit="details[row.id] || row" :business="business" :single="false" />
          <v-btn v-if="editing !== row.id" class="mt-3" outlined color="primary" :disabled="busy || locked || Boolean(editing) || !details[row.id]" @click="startEdit(row.id)">Editar unidad</v-btn>
          <unit-editor v-else ref="editor" :form.sync="form" :business="business" :errors="fieldErrors" :busy="busy" :saved="details[row.id]" />
        </section>
      </details>

      <div v-if="rows.length && !editing" class="mt-5 text-sm text-gray-600">
        <v-btn text color="primary" class="px-0" :disabled="locked" @click="startNew(false)">Agregar otra unidad</v-btn>
        <p class="m-0">Solo si atiendes en otro inmueble con su propia CLUES. Para corregir una clave mal capturada, edita la unidad.</p>
      </div>
      <p class="m-0 mt-3 text-sm" role="status">{{ message }}</p>
    </template>
  </article>
</template>

<script>
import { DACore } from '../../services/config/axios.context';
import { authorizationContext, isCurrentAuthorization } from '../../security/authorizationContext';
import { confirmSettingsDiscard } from '../../domain/settings/settings.navigation';
import { cluesStatus, CLUES_ERRORS, empty, pick, same } from '../../domain/identity/healthUnits';
import UnitSummary from './HealthUnitSummary.vue';
import UnitEditor from './HealthUnitEditor.vue';

const base = 'api/identity/establishments';



export default {
  name: 'ClinicHealthUnits',
  components: { UnitSummary, UnitEditor },
  props: { business: { type: Object, default: () => ({}) }, locked: Boolean },
  data: () => ({ rows: [], details: {}, loading: false, loadError: '', editing: null, form: empty(), original: empty(), revision: 0,
    busy: false, error: '', fieldErrors: {}, conflict: false, forbidden: false, pendingCreate: null, message: '', context: null, alive: true, otherOpen: false }),
  computed: {
    dirty() { return Boolean(this.editing) && !same(this.form, this.original); },
    // The first active unit is the main summary; the rest go to a secondary list. Never chosen as a clinical default.
    primaryId() { const a = this.rows.find(r => r.active); return (a || this.rows[0] || {}).id; },
    visibleRows() { return this.rows.filter(r => r.id === this.primaryId); },
    otherRows() { return this.rows.filter(r => r.id !== this.primaryId); }
  },
  watch: {
    dirty() { this.emitState(); }, busy() { this.emitState(); }, editing() { this.emitState(); },
    form: { deep: true, handler() { this.fieldErrors = {}; if (!this.conflict) this.error = ''; } }
  },
  mounted() { this.context = authorizationContext(this.$store); this.load(); },
  beforeDestroy() { this.alive = false; },
  methods: {
    emitState() { this.$emit('state', { dirty: this.dirty, busy: this.busy, editing: Boolean(this.editing) }); },
    current() { return this.alive && isCurrentAuthorization(this.context, this.$store); },
    async load() {
      this.loading = true; this.loadError = '';
      try {
        const r = await DACore.get(base);
        if (!this.current()) return;
        if (!r.success) throw new Error(r.status === 403 ? 'No tienes permiso para consultar las unidades de atención.' : 'No se pudieron consultar las unidades de atención.');
        this.rows = r.data;
        const details = {};
        for (const row of r.data) { const d = await DACore.get(base + '/' + encodeURIComponent(row.id)); if (!this.current()) return; if (d.success) details[row.id] = { ...row, ...d.data }; }
        this.details = details;
      } catch (e) { if (this.current()) this.loadError = e.message; }
      finally { if (this.current()) this.loading = false; }
    },
    startNew(prefill) {
      if (this.editing || this.locked) return;
      this.form = { ...empty(), displayName: prefill ? this.business.name || '' : '' };
      // The commercial-name suggestion is not user input: cancelling it untouched needs no confirmation.
      this.original = { ...this.form }; this.revision = 0; this.editing = 'new'; this.resetErrors();
      this.$nextTick(() => this.focusEditor());
    },
    startEdit(id) {
      if (this.editing || this.locked || !this.details[id]) return;
      this.form = pick(this.details[id]); this.original = pick(this.details[id]); this.revision = this.details[id].revision;
      this.editing = id; this.resetErrors(); if (!this.visibleRows.some(r => r.id === id)) this.otherOpen = true;
      this.$nextTick(() => this.focusEditor());
    },
    resetErrors() { this.error = ''; this.fieldErrors = {}; this.conflict = false; this.forbidden = false; this.message = ''; },
    focusEditor(field) { const e = [].concat(this.$refs.editor || [])[0]; if (e) e.focusFirst(field); },
    async cancel() {
      if (this.busy) return;
      if (this.dirty && !await confirmSettingsDiscard(this, { title: 'Descartar cambios de la unidad', text: 'Tu captura de la unidad no se ha guardado.' })) return;
      this.discard();
    },
    discard() { this.editing = null; this.form = empty(); this.original = empty(); this.resetErrors(); this.pendingCreate = null; },
    async reloadSaved() {
      if (!await confirmSettingsDiscard(this, { title: 'Ver la versión guardada', text: 'Se descarta tu captura y se muestra lo que otra persona guardó.' })) return;
      const id = this.editing; this.discard(); await this.load(); if (this.details[id]) this.startEdit(id);
    },
    validate() {
      const f = {}, name = String(this.form.displayName || '').trim();
      if (!name) f.displayName = ['Escribe el nombre con el que tu equipo reconoce la unidad.'];
      if (this.form.validFrom && this.form.validTo && this.form.validTo <= this.form.validFrom) f.validTo = ['La fecha final debe ser posterior a la inicial.'];
      return f;
    },
    async save() {
      if (this.busy || !this.current()) return;
      const invalid = this.validate();
      if (Object.keys(invalid).length) { this.fieldErrors = invalid; this.error = 'Revisa los campos señalados. Conservamos tu captura.'; this.$nextTick(() => this.focusEditor(Object.keys(invalid)[0])); return; }
      this.busy = true; this.error = ''; const creating = this.editing === 'new';
      const identity = { ...this.form, displayName: this.form.displayName.trim() };
      try {
        // A create whose answer was lost is reconciled by reading, never by sending it again.
        if (creating && this.pendingCreate) {
          const list = await DACore.get(base); if (!this.current()) return;
          if (!list.success) throw new Error('read');
          const found = list.data.find(r => r.displayName === this.pendingCreate.displayName && !this.rows.some(o => o.id === r.id));
          if (found) { this.pendingCreate = null; this.editing = null; await this.load(); this.message = 'Encontramos la unidad ya guardada; no creamos otra.'; return; }
          this.pendingCreate = null;
        }
        if (creating) this.pendingCreate = identity;
        const body = { identity, expectedRevision: this.revision };
        const r = creating ? await DACore.post(base, body) : await DACore.patch(base + '/' + encodeURIComponent(this.editing), body);
        if (!this.current()) return;
        if (r.success) {
          this.pendingCreate = null; const id = r.data.id; this.editing = null; await this.load();
          this.message = 'Unidad guardada.' + (cluesStatus(this.details[id] || r.data).key === 'manual' ? ' La CLUES queda capturada sin verificar.' : '');
          return;
        }
        if (Number(r.status) < 500) this.pendingCreate = null;
        if (r.status === 409) { this.conflict = true; return; }
        if (r.status === 403) { this.forbidden = true; this.error = 'Tu sesión ya no tiene permiso para modificar unidades. No se guardó; tu captura sigue en pantalla.'; return; }
        if (r.status === 400 && r.data && r.data.field) {
          const field = r.data.field === 'cluesRef' ? 'cluesRef' : r.data.field;
          this.fieldErrors = { [field]: [field === 'cluesRef' ? CLUES_ERRORS[r.data.code] || 'Revisa la CLUES: 11 letras o números.' : 'Revisa este dato.'] };
          this.error = 'Revisa los campos señalados. Conservamos tu captura.'; this.$nextTick(() => this.focusEditor(field)); return;
        }
        throw new Error('save');
      } catch (_) {
        if (this.current()) this.error = creating ? 'No se confirmó el guardado. Conservamos tu captura; al volver a guardar comprobaremos primero si la unidad ya existe.' : 'No se confirmó el guardado. Conservamos tu captura; vuelve a guardar cuando haya conexión.';
      } finally { if (this.alive) this.busy = false; }
    }
  }
};
</script>

<style>
.health-units .unit-chip { display: inline-block; padding: 2px 10px; font-size: 12px; font-weight: 600; border: 1px solid; }
.health-units .unit-chip--on { color: #166534; background: #f0fdf4; border-color: #bbf7d0; }
.health-units .unit-chip--off { color: #475569; background: #f8fafc; border-color: #cbd5e1; }
.health-units .unit-status--valid { color: #166534; }
.health-units .unit-status--manual, .health-units .unit-status--unverified, .health-units .unit-status--none { color: #475569; }
.health-units .unit-status--invalid, .health-units .unit-warn { color: #9a3412; }
.health-units .unit-official { background: #f8fafc; }
.health-units .unit-link { color: #0e7490; background: none; border: 0; padding: 0; margin-top: 2px; }
html[data-theme="clinical-night"] .health-units, html[data-theme="clinical-night"] .health-units .unit-card { background: #1e293b !important; border-color: #475569 !important; }
html[data-theme="clinical-night"] .health-units .unit-official { background: #0f172a; border-color: #475569 !important; }
html[data-theme="clinical-night"] .health-units .unit-chip--on { color: #bbf7d0; background: #14532d; border-color: #166534; }
html[data-theme="clinical-night"] .health-units .unit-chip--off { color: #e2e8f0; background: #334155; border-color: #64748b; }
html[data-theme="clinical-night"] .health-units .unit-status--valid { color: #86efac; }
html[data-theme="clinical-night"] .health-units .unit-status--manual, html[data-theme="clinical-night"] .health-units .unit-status--unverified, html[data-theme="clinical-night"] .health-units .unit-status--none { color: #cbd5e1; }
html[data-theme="clinical-night"] .health-units .unit-status--invalid, html[data-theme="clinical-night"] .health-units .unit-warn { color: #fdba74; }
html[data-theme="clinical-night"] .health-units .unit-link { color: #7dd3fc; }
/* The selected official name must stay readable at 390: wrap instead of truncating. */
.health-units .v-select__selections { flex-wrap: wrap; }
.health-units .v-select__selection { white-space: normal; overflow: visible; text-overflow: clip; max-width: 100%; line-height: 1.3; }
html[data-theme="clinical-night"] .health-units .v-messages, html[data-theme="clinical-night"] .health-units .v-counter { color: #cbd5e1 !important; }
html[data-theme="clinical-night"] .health-units .text-gray-500, html[data-theme="clinical-night"] .health-units .text-gray-600 { color: #cbd5e1 !important; }
</style>
