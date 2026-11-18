<template>
  <article class="health-units min-w-0 border border-gray-200 bg-white shadow-sm p-5" aria-labelledby="health-units-title">
    <div class="flex items-start gap-3 min-w-0">
      <div class="flex items-center justify-center w-10 h-10 bg-primary-100 text-primary-900 border border-primary-200 shrink-0">
        <v-icon color="inherit" size="22">mdi-hospital-building</v-icon>
      </div>
      <div class="min-w-0">
        <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Establecimiento de salud</p>
        <h3 id="health-units-title" class="m-0 text-gray-700 text-lg font-semibold">Unidades de atención y CLUES</h3>
        <p class="m-0 mt-2 text-gray-500 text-sm leading-relaxed">La CLUES identifica ante la Secretaría de Salud un establecimiento donde se atiende. Registrar unidades no cambia el nombre comercial, la razón social, el domicilio ni el contacto del consultorio.</p>
      </div>
    </div>

    <!-- R1: an uncertain create is never forgotten by Cancel or by leaving the view. -->
    <v-alert v-if="pending && editing !== 'new'" type="warning" text role="alert" class="mt-5 mb-0">
      Hay un registro de unidad sin confirmar («{{ pending.payload.displayName }}»). Puede haberse guardado o no. Retómalo para comprobarlo antes de registrar otra unidad.
    </v-alert>

    <p v-if="loading" class="mt-5 text-gray-600" role="status">Cargando las unidades guardadas…</p>
    <v-alert v-else-if="loadError" type="error" text role="alert" class="mt-5">{{ loadError }} <button type="button" class="underline font-semibold" @click="load">Reintentar</button></v-alert>

    <template v-else>
      <!-- Empty state: nothing is created when the page opens; the user starts it explicitly. -->
      <div v-if="!rows.length && editing !== 'new'" class="mt-5 border border-dashed border-gray-300 p-5">
        <p class="m-0 text-gray-700 font-semibold">Aún no registras la unidad donde atiendes.</p>
        <p class="m-0 mt-1 text-gray-500 text-sm">Puedes registrarla con o sin CLUES. Usaremos el nombre comercial como punto de partida; nada se guarda hasta que pulses Guardar.</p>
        <v-btn class="mt-4" color="primary" depressed :disabled="locked || busy || Boolean(editing)" @click="startNew(true)">{{ pending ? 'Retomar el registro sin confirmar' : 'Registrar la unidad del consultorio' }}</v-btn>
        <p v-if="locked" class="m-0 mt-2 text-sm text-gray-500">Termina o cancela la edición de los datos del consultorio para continuar.</p>
      </div>

      <template v-for="item in displayItems">
        <button v-if="item.type === 'toggle'" :key="item.key" type="button" class="unit-toggle mt-5 font-semibold" :aria-expanded="String(otherOpen)" @click="otherOpen = !otherOpen">
          {{ otherOpen ? 'Ocultar' : 'Mostrar' }} otras unidades ({{ otherRows.length }})
        </button>
        <section v-else :key="item.key" class="unit-card mt-4 border border-gray-200 p-4 min-w-0" :aria-label="'Unidad ' + item.row.displayName">
          <unit-editor v-if="editing === item.row.id" ref="editor" :form.sync="form" :business="business" :errors="fieldErrors" :busy="busy" :saved="details[item.row.id]" />
          <template v-else>
            <!-- R3: an unknown detail is not «sin CLUES». -->
            <div v-if="detailErrors[item.row.id] && !details[item.row.id]" class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="m-0 text-gray-800 text-base font-semibold break-words">{{ item.row.displayName }}</h4>
                <span class="unit-chip" :class="item.row.active ? 'unit-chip--on' : 'unit-chip--off'">{{ item.row.active ? 'Activa en MedSync' : 'Inactiva en MedSync' }}</span>
              </div>
              <p class="m-0 mt-2 text-sm unit-warn" role="alert">{{ detailErrors[item.row.id].status === 403 ? 'Tu sesión no tiene permiso para consultar el detalle de esta unidad.' : 'No pudimos consultar el detalle de esta unidad.' }} Su CLUES y sus datos oficiales son desconocidos por ahora; no significa que no tenga CLUES.</p>
            </div>
            <template v-else-if="details[item.row.id]">
              <p v-if="detailErrors[item.row.id]" class="m-0 mb-2 text-sm unit-warn" role="alert">Datos sin actualizar: la última consulta de esta unidad falló. Lo que ves puede no ser lo guardado ahora.</p>
              <unit-summary :unit="details[item.row.id]" :business="business" />
            </template>
            <div class="flex flex-wrap gap-2 mt-4">
              <v-btn class="unit-action" outlined color="primary" :disabled="actionsLocked || Boolean(detailErrors[item.row.id]) || !details[item.row.id]" @click="startEdit(item.row.id)">Editar unidad</v-btn>
              <v-btn v-if="canRevalidate(item.row.id)" class="unit-action" outlined color="primary" :disabled="actionsLocked || Boolean(detailErrors[item.row.id])" @click="startRevalidate(item.row.id)">Comprobar con la versión vigente</v-btn>
              <v-btn v-if="detailErrors[item.row.id]" class="unit-action" outlined color="primary" :disabled="busy" @click="reloadDetail(item.row.id)">Reintentar consulta</v-btn>
            </div>
            <unit-revalidation v-if="reval && reval.id === item.row.id" :state="reval.state" :code="details[item.row.id].cluesRef.code" :saved="details[item.row.id].catalogAttributes" :saved-source="savedSource(item.row.id)"
              :current="reval.current" :busy="busy" :error="reval.error" :conflict="reval.conflict" @apply="applyRevalidation" @retry="lookup" @close="closeRevalidation" />
          </template>
        </section>
      </template>

      <section v-if="editing === 'new'" class="unit-card mt-5 border border-primary-200 p-4 min-w-0" aria-label="Nueva unidad">
        <p class="m-0 mb-3 text-primary-900 text-xs font-bold tracking-widest uppercase">{{ rows.length ? 'Otra unidad' : 'Unidad del consultorio' }}</p>
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
          <v-btn class="unit-action--primary" color="primary" depressed :loading="busy" :disabled="busy || conflict || forbidden" @click="save">{{ busy ? 'Guardando…' : saveLabel }}</v-btn>
          <span class="text-sm text-gray-500" role="status">{{ dirty ? 'Cambios sin guardar en esta unidad.' : 'Sin cambios.' }}</span>
        </div>
      </div>

      <div v-if="rows.length && !editing && !reval" class="mt-5 text-sm text-gray-600">
        <v-btn class="unit-action px-0" text color="primary" :disabled="locked || busy" @click="startNew(false)">{{ pending ? 'Retomar el registro sin confirmar' : 'Agregar otra unidad' }}</v-btn>
        <p class="m-0">Agrega otra unidad si atiendes en otro establecimiento, aunque todavía no tenga CLUES, o si la autoridad asignó una CLUES nueva a un establecimiento distinto, incluso en el mismo inmueble (sustitución oficial: conserva la anterior como inactiva). Para corregir una clave mal capturada, edita la unidad.</p>
      </div>
      <p class="m-0 mt-3 text-sm" role="status">{{ message }}</p>
    </template>
  </article>
</template>

<script>
import { DACore } from '../../services/config/axios.context';
import { authorizationContext, isCurrentAuthorization } from '../../security/authorizationContext';
import { confirmSettingsDiscard } from '../../domain/settings/settings.navigation';
import { cluesStatus, CLUES_ERRORS, empty, pick, same, pendingCreate, rememberCreate, forgetCreate, newOperationKey, cluesCheck } from '../../domain/identity/healthUnits';
import UnitSummary from './HealthUnitSummary.vue';
import UnitEditor from './HealthUnitEditor.vue';
import UnitRevalidation from './HealthUnitRevalidation.vue';

const base = 'api/identity/establishments';
const uncertain = r => !r || !r.status || Number(r.status) >= 500;
const IDLE = { dirty: false, busy: false, editing: false };

export default {
  name: 'ClinicHealthUnits',
  components: { UnitSummary, UnitEditor, UnitRevalidation },
  props: { business: { type: Object, default: () => ({}) }, locked: Boolean },
  data: () => ({ rows: [], details: {}, detailErrors: {}, loading: false, loadError: '', editing: null, form: empty(), original: empty(), revision: 0,
    busy: false, error: '', fieldErrors: {}, conflict: false, forbidden: false, message: '', context: null, owner: '', alive: true, otherOpen: false,
    pending: null, reval: null }),
  computed: {
    dirty() { return Boolean(this.editing) && !same(this.form, this.original); },
    actionsLocked() { return this.busy || this.locked || Boolean(this.editing) || Boolean(this.reval); },
    // The first active unit is the main summary; the rest go to a secondary list. Never chosen as a clinical default.
    primaryId() { const a = this.rows.find(r => r.active); return (a || this.rows[0] || {}).id; },
    otherRows() { return this.rows.filter(r => r.id !== this.primaryId); },
    displayItems() {
      const primary = this.rows.find(r => r.id === this.primaryId), items = primary ? [{ type: 'unit', key: 'u-' + primary.id, row: primary }] : [];
      if (this.otherRows.length) items.push({ type: 'toggle', key: 'toggle' });
      if (this.otherOpen) this.otherRows.forEach(row => items.push({ type: 'unit', key: 'u-' + row.id, row }));
      return items;
    },
    saveLabel() { return this.editing === 'new' && this.pending ? 'Comprobar y completar el registro' : 'Guardar unidad'; }
  },
  watch: {
    dirty() { this.emitState(); }, busy() { this.emitState(); }, editing() { this.emitState(); }, reval() { this.emitState(); },
    form: { deep: true, handler() { this.fieldErrors = {}; if (!this.conflict) this.error = ''; } }
  },
  mounted() {
    this.context = authorizationContext(this.$store); this.owner = JSON.stringify(this.context);
    this.pending = pendingCreate(this.owner);
    this.emitState(); // R2: the parent must not keep the previous instance's state.
    this.load();
  },
  beforeDestroy() {
    this.alive = false;
    if (this.pending && this.editing === 'new') rememberCreate(this.owner, { ...this.pending, draft: { ...this.form } });
    this.$emit('state', { ...IDLE });
  },
  methods: {
    emitState() { this.$emit('state', { dirty: this.dirty, busy: this.busy, editing: Boolean(this.editing) || Boolean(this.reval) }); },
    current() { return this.alive && isCurrentAuthorization(this.context, this.$store); },
    async fetchDetail(id) {
      try { const d = await DACore.get(base + '/' + encodeURIComponent(id)); return d && d.success ? { data: d.data } : { status: d && d.status || 0 }; }
      catch (_) { return { status: 0 }; }
    },
    async load() {
      this.loading = !this.rows.length; this.loadError = '';
      try {
        const r = await DACore.get(base);
        if (!this.current()) return;
        if (!r.success) throw new Error(r.status === 403 ? 'No tienes permiso para consultar las unidades de atención.' : 'No se pudieron consultar las unidades de atención.');
        const details = {}, errors = {};
        for (const row of r.data) {
          const d = await this.fetchDetail(row.id); if (!this.current()) return;
          if (d.data) details[row.id] = { ...row, ...d.data };
          else { errors[row.id] = { status: d.status }; if (this.details[row.id]) details[row.id] = this.details[row.id]; }
        }
        this.rows = r.data; this.details = details; this.detailErrors = errors;
      } catch (e) { if (this.current()) this.loadError = e.message || 'No se pudieron consultar las unidades de atención.'; }
      finally { if (this.current()) this.loading = false; }
    },
    async reloadDetail(id) {
      this.busy = true;
      try {
        const d = await this.fetchDetail(id); if (!this.current()) return;
        const row = this.rows.find(r => r.id === id);
        if (d.data) { this.$set(this.details, id, { ...row, ...d.data }); this.$delete(this.detailErrors, id); }
        else this.$set(this.detailErrors, id, { status: d.status });
      } finally { if (this.alive) this.busy = false; }
    },
    startNew(prefill) {
      if (this.editing || this.locked || this.reval) return;
      this.resetErrors();
      if (this.pending) {
        // Re-entry: the later capture comes back as the draft; the original payload stays the operation's content.
        this.form = { ...(this.pending.draft || this.pending.payload) }; this.original = { ...this.pending.payload };
        this.$nextTick(() => { this.error = 'Este registro no se confirmó. Al guardar repetiremos exactamente el envío original con la misma operación para comprobarlo; los cambios posteriores se conservan aparte.'; });
      } else {
        this.form = { ...empty(), displayName: prefill ? this.business.name || '' : '' };
        // The commercial-name suggestion is not user input: cancelling it untouched needs no confirmation.
        this.original = { ...this.form };
      }
      this.revision = 0; this.editing = 'new';
      this.$nextTick(() => this.focusEditor());
    },
    startEdit(id) {
      if (this.actionsLocked || !this.details[id]) return;
      this.form = pick(this.details[id]); this.original = pick(this.details[id]); this.revision = this.details[id].revision;
      this.editing = id; this.resetErrors(); if (id !== this.primaryId) this.otherOpen = true;
      this.$nextTick(() => this.focusEditor());
    },
    resetErrors() { this.error = ''; this.fieldErrors = {}; this.conflict = false; this.forbidden = false; this.message = ''; },
    focusEditor(field) { const e = [].concat(this.$refs.editor || [])[0]; if (e) e.focusFirst(field); },
    async cancel() {
      if (this.busy) return;
      if (this.editing === 'new' && this.pending) {
        // R1: Cancel never forgets an uncertain create; the later capture is kept with it.
        rememberCreate(this.owner, { ...this.pending, draft: { ...this.form } }); this.pending = pendingCreate(this.owner);
        this.closeEditor(); this.message = 'Guardamos tu captura con el registro sin confirmar; puedes retomarlo.'; return;
      }
      if (this.dirty && !await confirmSettingsDiscard(this, { title: 'Descartar cambios de la unidad', text: 'Tu captura de la unidad no se ha guardado.' })) return;
      this.discard();
    },
    closeEditor() { this.editing = null; this.form = empty(); this.original = empty(); this.fieldErrors = {}; this.conflict = false; this.forbidden = false; this.error = ''; },
    discard() {
      // Navigation discard: an uncertain create keeps its original payload; only the later capture is dropped.
      if (this.editing === 'new' && this.pending) rememberCreate(this.owner, { ...this.pending, draft: null });
      this.closeEditor(); this.reval = null;
    },
    async reloadSaved() {
      if (!await confirmSettingsDiscard(this, { title: 'Ver la versión guardada', text: 'Se descarta tu captura y se muestra lo que otra persona guardó.' })) return;
      const id = this.editing; this.closeEditor(); await this.load(); if (this.details[id]) this.startEdit(id);
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
      if (this.editing === 'new') return this.create();
      this.busy = true; this.error = '';
      try {
        const r = await DACore.patch(base + '/' + encodeURIComponent(this.editing), { identity: { ...this.form, displayName: this.form.displayName.trim() }, expectedRevision: this.revision });
        if (!this.current()) return;
        if (r.success) { const id = this.editing; this.closeEditor(); await this.load(); this.message = 'Unidad guardada.' + (cluesStatus(this.details[id] || r.data).key === 'manual' ? ' La CLUES queda capturada sin verificar.' : ''); return; }
        this.rejected(r);
      } catch (_) { if (this.current()) this.error = 'No se confirmó el guardado. Conservamos tu captura; vuelve a guardar cuando haya conexión. No reenviamos nada automáticamente.'; }
      finally { if (this.alive) this.busy = false; }
    },
    rejected(r) {
      if (r.status === 409) { this.conflict = true; return; }
      if (r.status === 403) { this.forbidden = true; this.error = 'Tu sesión ya no tiene permiso para modificar unidades. No se guardó; tu captura sigue en pantalla.'; return; }
      if (r.status === 400 && r.data && r.data.field) {
        const field = r.data.field;
        this.fieldErrors = { [field]: [field === 'cluesRef' ? CLUES_ERRORS[r.data.code] || 'Revisa la CLUES: 11 letras o números.' : 'Revisa este dato.'] };
        this.error = 'Revisa los campos señalados. Conservamos tu captura.'; this.$nextTick(() => this.focusEditor(field)); return;
      }
      throw new Error('save');
    },
    // R1: one stable operation identity per intended create. A retry repeats the exact original payload with the same
    // Idempotency-Key; later edits are never folded into it. The guarantee needs CLUES-F1 in the backend.
    async create() {
      const capture = { ...this.form, displayName: this.form.displayName.trim() };
      const op = this.pending || { key: newOperationKey(), payload: capture };
      rememberCreate(this.owner, { ...op, draft: capture }); this.pending = pendingCreate(this.owner);
      this.busy = true; this.error = '';
      let r;
      try { r = await DACore.post(base, { identity: op.payload, expectedRevision: 0 }, { headers: { 'Idempotency-Key': op.key } }); }
      catch (_) { r = null; }
      try {
        if (!this.current()) return;
        if (r && r.success) {
          forgetCreate(this.owner); this.pending = null;
          const id = r.data.id, later = !same(capture, op.payload);
          this.closeEditor(); await this.load();
          if (!later) { this.message = 'Unidad registrada.' + (op.retried ? ' Comprobamos la operación original: quedó guardada una sola vez.' : ''); return; }
          // The original payload is what was saved; the later capture is offered as an unsaved edit of that unit.
          const saved = this.details[id];
          if (saved) { this.editing = id; this.original = pick(saved); this.revision = saved.revision; this.form = { ...capture }; if (id !== this.primaryId) this.otherOpen = true; }
          this.$nextTick(() => { this.error = 'Confirmamos el registro original. Tus cambios posteriores siguen sin guardar: revísalos y pulsa Guardar unidad.'; });
          return;
        }
        if (uncertain(r)) {
          rememberCreate(this.owner, { ...op, retried: true, draft: capture }); this.pending = pendingCreate(this.owner);
          this.error = 'No se confirmó el registro. Puede haberse guardado o no. Al volver a guardar repetiremos exactamente el envío original con la misma operación; tus cambios posteriores se conservan aparte.';
          return;
        }
        // 4xx on a first attempt: nothing was created. On a retry it does not prove the first attempt failed, so the
        // uncertain operation is kept (e.g. permission revoked between attempts).
        if (op.retried) { rememberCreate(this.owner, { ...op, draft: capture }); this.pending = pendingCreate(this.owner); }
        else { forgetCreate(this.owner); this.pending = null; }
        this.rejected(r);
      } catch (_) { if (this.current()) this.error = 'No se confirmó el registro. Conservamos tu captura.'; }
      finally { if (this.alive) this.busy = false; }
    },
    // ---- D-5: explicit check against the current release; reading never writes or replaces the reference ----
    canRevalidate(id) { const d = this.details[id]; return Boolean(d && d.cluesRef && d.cluesRef.releaseId); },
    savedSource(id) { const c = cluesCheck(this.details[id]); return c && c.source || null; },
    startRevalidate(id) { if (this.actionsLocked) return; this.message = ''; this.reval = { id, state: 'loading', current: null, error: '', conflict: false }; this.lookup(); },
    async lookup() {
      const reval = this.reval; if (!reval) return;
      const ref = this.details[reval.id].cluesRef;
      this.reval = { ...reval, state: 'loading', error: '' }; this.busy = true;
      try {
        const r = await DACore.get('api/identity/catalogs/sis.establishments', { params: { q: ref.code, parent: '', offset: 0 } });
        if (!this.current() || !this.reval || this.reval.id !== reval.id) return;
        if (!r || !r.success || !r.data.available) { this.reval = { ...this.reval, state: 'unavailable' }; return; }
        const item = r.data.items.find(i => i.ref.code === ref.code), source = r.data.source;
        if (!item) { this.reval = { ...this.reval, state: 'missing', current: { source } }; return; }
        this.reval = { ...this.reval, state: item.ref.releaseId === ref.releaseId ? 'same' : 'found', current: { ref: item.ref, label: item.label, attributes: item.attributes || null, source } };
      } catch (_) { if (this.current() && this.reval) this.reval = { ...this.reval, state: 'unavailable' }; }
      finally { if (this.alive) this.busy = false; }
    },
    closeRevalidation() { if (!this.busy) this.reval = null; },
    async applyRevalidation() {
      const reval = this.reval; if (!reval || reval.state !== 'found' || this.busy) return;
      const unit = this.details[reval.id], next = reval.current;
      const ok = await this.confirmUpdate(unit.cluesRef.code, next.source.sourceVersion); if (!ok || !this.current()) return;
      this.busy = true; this.reval = { ...reval, error: '' };
      try {
        // Minimal PATCH: only the reference changes, under the revision that was read.
        const r = await DACore.patch(base + '/' + encodeURIComponent(reval.id), { identity: { cluesRef: next.ref }, expectedRevision: unit.revision });
        if (!this.current()) return;
        if (r.success) { this.reval = null; await this.load(); this.message = 'Referencia actualizada a la versión vigente. Nada más cambió.'; return; }
        if (r.status === 409) { this.reval = { ...this.reval, conflict: true }; return; }
        this.reval = { ...this.reval, error: r.status === 403 ? 'Tu sesión ya no tiene permiso para modificar unidades. No se actualizó nada.' : 'No se actualizó la referencia. Revisa e inténtalo de nuevo.' };
      } catch (_) { if (this.current() && this.reval) this.reval = { ...this.reval, error: 'No se confirmó la actualización. No reenviamos nada; cierra y vuelve a comprobar para ver lo guardado.' }; }
      finally { if (this.alive) this.busy = false; }
    },
    async confirmUpdate(code, version) {
      const swal = this.$swal; if (!swal) return false;
      try {
        const result = await swal.fire({ title: 'Actualizar la referencia CLUES', text: 'La clave ' + code + ' pasará a usar la versión ' + version + '. No cambian el nombre de la unidad, los datos del consultorio ni atenciones anteriores.',
          icon: 'question', showCancelButton: true, confirmButtonText: 'Actualizar referencia', cancelButtonText: 'No actualizar', focusCancel: true, reverseButtons: true });
        return Boolean(result && result.isConfirmed);
      } catch (_) { return false; }
    }
  }
};
</script>

<style>
.health-units .unit-chip { display: inline-block; padding: 2px 10px; font-size: 12px; font-weight: 600; border: 1px solid; }
.health-units .unit-chip--on { color: #166534; background: #f0fdf4; border-color: #bbf7d0; }
.health-units .unit-chip--off { color: #475569; background: #f8fafc; border-color: #cbd5e1; }
.health-units .unit-status--valid { color: #166534; }
.health-units .unit-status--manual, .health-units .unit-status--unverified, .health-units .unit-status--none, .health-units .unit-status--stale { color: #475569; }
.health-units .unit-status--invalid, .health-units .unit-warn { color: #9a3412; }
.health-units .unit-official, .health-units .unit-reval { background: #f8fafc; border-color: #e2e8f0; }
.health-units .unit-link { color: #0e7490; background: none; border: 0; padding: 0; margin-top: 2px; }
.health-units .unit-toggle { color: #0e7490; background: none; border: 0; padding: 4px 0; text-decoration: underline; }
.health-units .unit-compare { overflow-x: auto; }
.health-units .unit-compare table { border-collapse: collapse; min-width: 0; table-layout: fixed; }
.health-units .unit-compare th, .health-units .unit-compare td { text-align: left; vertical-align: top; padding: 6px 4px; border-bottom: 1px solid #e2e8f0; overflow-wrap: break-word; }
.health-units .unit-compare--changed td { font-weight: 600; }
/* At phone width the comparison is stacked per field, so words are never split. */
@media (max-width: 640px) {
  .health-units .unit-compare thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .health-units .unit-compare tr { display: block; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
  .health-units .unit-compare th, .health-units .unit-compare td { display: block; border: 0; padding: 2px 0; }
  .health-units .unit-compare td::before { content: attr(data-label) ": "; font-weight: 400; color: #475569; }
  html[data-theme="clinical-night"] .health-units .unit-compare td::before { color: #cbd5e1; }
  html[data-theme="clinical-night"] .health-units .unit-compare tr { border-color: #475569; }
}
/* The selected official name must stay readable at 390: wrap instead of truncating. */
.health-units .v-select__selections { flex-wrap: wrap; }
.health-units .v-select__selection { white-space: normal; overflow: visible; text-overflow: clip; max-width: 100%; line-height: 1.3; }
html[data-theme="clinical-night"] .health-units, html[data-theme="clinical-night"] .health-units .unit-card { background: #1e293b !important; border-color: #475569 !important; }
html[data-theme="clinical-night"] .health-units .unit-official, html[data-theme="clinical-night"] .health-units .unit-reval { background: #0f172a; border-color: #475569 !important; }
html[data-theme="clinical-night"] .health-units .unit-compare th, html[data-theme="clinical-night"] .health-units .unit-compare td { border-color: #475569; }
html[data-theme="clinical-night"] .health-units .unit-chip--on { color: #bbf7d0; background: #14532d; border-color: #166534; }
html[data-theme="clinical-night"] .health-units .unit-chip--off { color: #e2e8f0; background: #334155; border-color: #64748b; }
html[data-theme="clinical-night"] .health-units .unit-status--valid { color: #86efac; }
html[data-theme="clinical-night"] .health-units .unit-status--manual, html[data-theme="clinical-night"] .health-units .unit-status--unverified, html[data-theme="clinical-night"] .health-units .unit-status--none, html[data-theme="clinical-night"] .health-units .unit-status--stale { color: #cbd5e1; }
html[data-theme="clinical-night"] .health-units .unit-status--invalid, html[data-theme="clinical-night"] .health-units .unit-warn { color: #fdba74; }
html[data-theme="clinical-night"] .health-units .unit-link, html[data-theme="clinical-night"] .health-units .unit-toggle { color: #7dd3fc; }
/* R4: Vuetify's focus overlay (0.24) drops the primary text to 4.1:1 in light; a lighter overlay plus an outline keeps >=4.5:1. */
.health-units .unit-action.v-btn:focus::before { opacity: .1 !important; }
.health-units .unit-action:focus-visible { outline: 2px solid #0e7490; outline-offset: 2px; }
/* R4: secondary actions reuse the night tokens of .text-primary-900 (#38BDF8) and its hover (#7DD3FC). */
html[data-theme="clinical-night"] .health-units .unit-action:not(.v-btn--disabled) { color: #38bdf8 !important; caret-color: #38bdf8 !important; }
html[data-theme="clinical-night"] .health-units .unit-action:not(.v-btn--disabled):hover,
html[data-theme="clinical-night"] .health-units .unit-action:not(.v-btn--disabled):focus-visible,
html[data-theme="clinical-night"] .health-units .unit-action:not(.v-btn--disabled).v-btn--active { color: #7dd3fc !important; }
html[data-theme="clinical-night"] .health-units .unit-action:focus-visible { outline: 2px solid #7dd3fc; outline-offset: 2px; }
html[data-theme="clinical-night"] .health-units .v-messages, html[data-theme="clinical-night"] .health-units .v-counter { color: #cbd5e1 !important; }
html[data-theme="clinical-night"] .health-units .text-gray-500, html[data-theme="clinical-night"] .health-units .text-gray-600 { color: #cbd5e1 !important; }
</style>
