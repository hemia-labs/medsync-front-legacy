<template>
  <article class="health-units" aria-labelledby="health-units-title">
    <header class="unit-section-heading">
      <span class="clinic-detail-icon" aria-hidden="true"><v-icon color="inherit" size="22">mdi-hospital-building</v-icon></span>
      <h2 id="health-units-title">Unidades de atención y CLUES</h2>
    </header>
    <div class="unit-introduction">
      <p>La CLUES (Clave Única de Establecimientos de Salud) es la clave oficial que identifica a cada consultorio, clínica u hospital en México. El nombre registrado ante Salud puede ser distinto de tu nombre comercial o razón social.</p>
      <details class="unit-help"><summary>¿Cómo obtengo mi CLUES?</summary><p>La Secretaría de Salud la asigna a través de la DGIS. Si tu consultorio aún no tiene una, consulta al enlace CLUES de los servicios de salud de tu estado para iniciar el trámite.</p><a class="unit-link" href="https://sidof.segob.gob.mx/notas/docFuente/5761090" target="_blank" rel="noopener noreferrer">Consultar los lineamientos oficiales <span class="sr-only">(abre otra pestaña)</span></a></details>
    </div>

    <!-- R1: an uncertain create is never forgotten by Cancel or by leaving the view. -->
    <v-alert v-if="uncertainCreate && editing !== 'new'" type="warning" text role="alert" class="mt-5 mb-0">
      Hay un registro de unidad sin confirmar («{{ uncertainCreate.payload.displayName }}»). Puede haberse guardado o no. Retómalo para comprobarlo antes de registrar otra unidad.
    </v-alert>

    <p v-if="loading" class="mt-5 text-gray-600" role="status">Cargando las unidades guardadas…</p>
    <v-alert v-else-if="loadError" type="error" text role="alert" class="mt-5">{{ loadError }} <button type="button" class="underline font-semibold" @click="load">Reintentar</button></v-alert>

    <template v-else>
      <!-- Empty state: nothing is created when the page opens; the user starts it explicitly. -->
      <div v-if="!rows.length && editing !== 'new'" class="mt-5 border border-dashed border-gray-300 p-5">
        <p class="m-0 text-gray-700 font-semibold">Aún no registras la unidad donde atiendes.</p>
        <p class="m-0 mt-1 text-gray-500 text-sm">Añade el consultorio o la sede donde atiendes a tus pacientes. Puedes empezar con su nombre y agregar la CLUES cuando la tengas.</p>
        <v-btn class="mt-4" color="primary" depressed :disabled="locked || busy || Boolean(editing)" @click="startNew(true)">{{ uncertainCreate ? 'Retomar el registro sin confirmar' : 'Registrar la unidad del consultorio' }}</v-btn>
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
              <p v-if="uncertainUpdates[item.row.id]" class="m-0 mb-2 text-sm unit-warn" role="alert">Hay una actualización de la referencia CLUES sin confirmar. Lo que ves puede no ser lo guardado: usa «Comprobar con la versión vigente» para releer la unidad.</p>
              <unit-summary :unit="details[item.row.id]" :business="business" />
            </template>
            <div class="flex flex-wrap gap-2 mt-4">
              <v-btn class="unit-action" outlined color="primary" :disabled="actionsLocked || Boolean(detailErrors[item.row.id]) || !details[item.row.id]" @click="startEdit(item.row.id)">Editar unidad</v-btn>
              <v-btn v-if="canRevalidate(item.row.id)" class="unit-action" outlined color="primary" :disabled="actionsLocked || Boolean(detailErrors[item.row.id])" @click="startRevalidate(item.row.id)">Comprobar con la versión vigente</v-btn>
              <v-btn v-if="detailErrors[item.row.id]" class="unit-action" outlined color="primary" :disabled="busy" @click="reloadDetail(item.row.id)">Reintentar consulta</v-btn>
            </div>
            <unit-revalidation v-if="reval && reval.id === item.row.id" :state="reval.state" :code="revalCode(item.row.id)" :saved="details[item.row.id] && details[item.row.id].catalogAttributes" :saved-source="savedSource(item.row.id)"
              :current="reval.current" :busy="busy" :error="reval.error" :notice="reval.notice" :uncertain="reval.uncertain" :unit-status="reval.unitStatus"
              @apply="applyRevalidation" @retry="retryRevalidation" @close="closeRevalidation" />
          </template>
        </section>
      </template>

      <div v-if="rows.length && !editing && !reval" class="mt-5 text-sm text-gray-600">
        <v-btn class="unit-action px-0" text color="primary" :disabled="locked || busy" @click="startNew(false)">{{ uncertainCreate ? 'Retomar el registro sin confirmar' : 'Agregar otra unidad' }}</v-btn>
        <details class="unit-help"><summary>Cuándo agregar otra unidad</summary><p>Si atiendes en otro consultorio o sede, puedes registrarlo aquí aunque aún no tenga CLUES. También corresponde crear otra unidad cuando la autoridad asigna una nueva clave por sustitución oficial, incluso en el mismo inmueble; conserva la anterior como inactiva.</p><p>Si solo escribiste mal una clave, usa Editar unidad para corregirla.</p></details>
      </div>
    </template>

    <section v-if="editing === 'new'" class="unit-card mt-5 border border-primary-200 p-4 min-w-0" aria-label="Nueva unidad">
      <p class="unit-editor-caption">{{ rows.length ? 'Nueva unidad' : 'Unidad del consultorio' }}</p>
      <!-- R1: visible for the whole edit, not only after Cancel. -->
      <v-alert v-if="uncertainCreate && uncertainCreate.retried" type="warning" text role="status" class="mb-3">Registro sin confirmar: el envío original puede haberse guardado. Conservamos la operación y tu captura; no reenviamos nada automáticamente.</v-alert>
      <unit-editor ref="editor" :form.sync="form" :business="business" :errors="fieldErrors" :busy="busy" :saved="null" />
    </section>

    <!-- R1: a confirmed create whose later draft is pending stays editable even if the list or detail read fails. -->
    <section v-if="confirmedDraft && !editorInList" class="unit-card mt-5 border border-primary-200 p-4 min-w-0" aria-label="Unidad registrada con cambios sin guardar">
      <unit-editor ref="editor" :form.sync="form" :business="business" :errors="fieldErrors" :busy="busy" :saved="details[editing] || null" />
    </section>

    <div v-if="editing" class="mt-4">
        <v-alert v-if="confirmedDraft" type="info" text role="status" class="mb-3">
          La unidad «{{ confirmedDraft.displayName }}» quedó registrada (operación confirmada). Tus cambios posteriores siguen sin guardar; se enviarán solo al pulsar Guardar unidad, sobre la revisión {{ revision }}.
          <template v-if="confirmedDraft.readFailed"> No pudimos releer la unidad; partimos de la respuesta confirmada del registro. <button type="button" class="underline font-semibold" :disabled="busy" @click="refreshConfirmed">Reintentar lectura</button></template>
          <template v-if="confirmedDraft.changed"> La unidad cambió desde el registro; revisa tus cambios antes de guardar.</template>
        </v-alert>
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
    <p class="m-0 mt-3 text-sm" role="status">{{ message }}</p>
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
    pending: null, confirmedDraft: null, reval: null, uncertainUpdates: {} }),
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
    // R1: an uncertain create (no confirmed id yet) versus a confirmed create with a later draft (confirmedId set).
    uncertainCreate() { return this.pending && !this.pending.confirmedId ? this.pending : null; },
    editorInList() { return Boolean(this.editing) && this.editing !== 'new' && !this.loading && !this.loadError && this.displayItems.some(i => i.row && i.row.id === this.editing); },
    saveLabel() { return this.editing === 'new' && this.uncertainCreate ? 'Comprobar y completar el registro' : 'Guardar unidad'; }
  },
  watch: {
    dirty() { this.emitState(); }, busy() { this.emitState(); }, editing() { this.emitState(); }, reval() { this.emitState(); },
    form: { deep: true, handler() { this.fieldErrors = {}; if (!this.conflict) this.error = ''; } }
  },
  mounted() {
    this.context = authorizationContext(this.$store); this.owner = JSON.stringify(this.context);
    this.pending = pendingCreate(this.owner);
    this.emitState(); // R2: the parent must not keep the previous instance's state.
    this.load().then(() => { if (this.pending && this.pending.confirmedId && !this.editing) this.resumeConfirmed(); });
  },
  beforeDestroy() {
    this.alive = false;
    if (this.pending && (this.editing === 'new' || this.editing === this.pending.confirmedId)) rememberCreate(this.owner, { ...this.pending, draft: { ...this.form } });
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
      if (this.uncertainCreate) {
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
      if (this.editing === 'new' && this.uncertainCreate) {
        // R1: Cancel never forgets an uncertain create; the later capture is kept with it.
        rememberCreate(this.owner, { ...this.pending, draft: { ...this.form } }); this.pending = pendingCreate(this.owner);
        this.closeEditor(); this.message = 'Guardamos tu captura con el registro sin confirmar; puedes retomarlo.'; return;
      }
      if (this.dirty && !await confirmSettingsDiscard(this, { title: 'Descartar cambios de la unidad', text: 'Tu captura de la unidad no se ha guardado.' })) return;
      this.discard();
    },
    closeEditor() { this.editing = null; this.form = empty(); this.original = empty(); this.fieldErrors = {}; this.conflict = false; this.forbidden = false; this.error = ''; this.confirmedDraft = null; },
    discard() {
      // Navigation discard: an uncertain create keeps its original payload; only the later capture is dropped.
      if (this.editing === 'new' && this.uncertainCreate) rememberCreate(this.owner, { ...this.pending, draft: null });
      // A confirmed create needs nothing more from the operation once its later draft is explicitly discarded.
      if (this.confirmedDraft) { forgetCreate(this.owner); this.pending = null; }
      this.closeEditor(); this.reval = null;
    },
    // R1: open (or reopen) the later draft of a confirmed create on that unit. The revision comes from the confirmed
    // response or from a successful read, never invented after a failed one.
    openConfirmed(op, view) {
      this.resetErrors();
      this.editing = op.confirmedId; this.original = pick(view); this.revision = view.revision; this.form = { ...op.draft };
      this.confirmedDraft = { id: op.confirmedId, displayName: view.displayName, readFailed: !this.details[op.confirmedId], changed: false };
      if (op.confirmedId !== this.primaryId) this.otherOpen = true;
    },
    resumeConfirmed() {
      const op = this.pending; if (!op || !op.confirmedId) return;
      this.openConfirmed(op, this.details[op.confirmedId] || op.confirmedView);
    },
    async refreshConfirmed() {
      const c = this.confirmedDraft; if (!c || this.busy) return;
      this.busy = true;
      try {
        if (this.loadError || !this.rows.some(r => r.id === c.id)) { this.busy = false; await this.load(); this.busy = true; }
        else { const d = await this.fetchDetail(c.id); if (!this.current()) return; if (d.data) { this.$set(this.details, c.id, { ...this.rows.find(r => r.id === c.id), ...d.data }); this.$delete(this.detailErrors, c.id); } else this.$set(this.detailErrors, c.id, { status: d.status }); }
        this.syncConfirmed();
      } finally { if (this.alive) this.busy = false; }
    },
    // After a successful read the editor bases its PATCH on what the server holds now; the draft itself is untouched.
    syncConfirmed() {
      const c = this.confirmedDraft; if (!c) return;
      const saved = this.details[c.id];
      if (!saved || this.detailErrors[c.id]) { this.confirmedDraft = { ...c, readFailed: true }; return; }
      const changed = saved.revision !== this.revision;
      this.original = pick(saved); this.revision = saved.revision;
      this.confirmedDraft = { ...c, readFailed: false, changed: c.changed || changed };
    },
    async reloadSaved() {
      if (!await confirmSettingsDiscard(this, { title: 'Ver la versión guardada', text: 'Se descarta tu captura y se muestra lo que otra persona guardó.' })) return;
      const id = this.editing; if (this.confirmedDraft) { forgetCreate(this.owner); this.pending = null; } this.closeEditor(); await this.load(); if (this.details[id]) this.startEdit(id);
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
        if (r.success) { const id = this.editing; if (this.confirmedDraft) { forgetCreate(this.owner); this.pending = null; } this.closeEditor(); await this.load(); this.message = 'Unidad guardada.' + (cluesStatus(this.details[id] || r.data).key === 'manual' ? ' La CLUES queda capturada sin verificar.' : ''); return; }
        this.rejected(r);
      } catch (_) { if (this.current()) this.error = 'No se confirmó el guardado. Conservamos tu captura; vuelve a guardar cuando haya conexión. No reenviamos nada automáticamente.'; }
      finally { if (this.alive) this.busy = false; }
    },
    rejected(r) {
      if (r.status === 409 && r.data && r.data.code === 'CATALOG_RELEASE_CHANGED') {
        this.fieldErrors = { cluesRef: ['El catálogo cambió. Busca de nuevo la clave para elegir la versión vigente.'] };
        this.error = 'La referencia no se guardó. Conservamos tu captura.'; return;
      }
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
      const op = this.uncertainCreate || { key: newOperationKey(), payload: capture };
      rememberCreate(this.owner, { ...op, draft: capture }); this.pending = pendingCreate(this.owner);
      this.busy = true; this.error = '';
      let r;
      try { r = await DACore.post(base, { identity: op.payload, expectedRevision: 0 }, { headers: { 'Idempotency-Key': op.key } }); }
      catch (_) { r = null; }
      try {
        if (!this.current()) return;
        if (r && r.success) {
          const id = r.data.id, later = !same(capture, op.payload);
          if (!later) {
            forgetCreate(this.owner); this.pending = null; this.closeEditor(); await this.load();
            this.message = 'Unidad registrada.' + (op.retried ? ' Comprobamos la operación original: quedó guardada una sola vez.' : ''); return;
          }
          // R1: the original payload is what was saved. The later capture becomes a recoverable draft tied to the
          // confirmed id: kept in the operation record until an explicit PATCH saves it or the user discards it.
          const confirmed = { ...op, confirmedId: id, confirmedView: r.data, draft: capture };
          rememberCreate(this.owner, confirmed); this.pending = pendingCreate(this.owner);
          this.openConfirmed(confirmed, r.data);
          await this.load(); this.syncConfirmed();
          return;
        }
        if (uncertain(r)) {
          rememberCreate(this.owner, { ...op, retried: true, draft: capture }); this.pending = pendingCreate(this.owner);
          this.error = 'No se confirmó el registro. Puede haberse guardado o no. Al volver a guardar repetiremos exactamente el envío original con la misma operación; tus cambios posteriores se conservan aparte.';
          return;
        }
        // 4xx on a first attempt: nothing was created. On a retry it only rejects the retry; the first attempt may
        // have been saved, so the operation and the capture are kept and the message says exactly that.
        if (op.retried) {
          rememberCreate(this.owner, { ...op, draft: capture }); this.pending = pendingCreate(this.owner);
          const still = ' El resultado del envío original sigue sin confirmar: la unidad puede haberse guardado. Conservamos la operación y tu captura; no reenviamos nada.';
          if (r.status === 403) { this.forbidden = true; this.error = 'El reintento fue rechazado: tu sesión ya no tiene permiso para registrar unidades.' + still; return; }
          if (r.status === 400 && r.data && r.data.field) this.fieldErrors = { [r.data.field]: ['Revisa este dato.'] };
          this.error = 'El reintento fue rechazado por el servidor.' + still; return;
        }
        forgetCreate(this.owner); this.pending = null;
        this.rejected(r);
      } catch (_) { if (this.current()) this.error = 'No se confirmó el registro. Conservamos tu captura.'; }
      finally { if (this.alive) this.busy = false; }
    },
    // ---- D-5: explicit check against the current release; reading never writes or replaces the reference ----
    canRevalidate(id) { const d = this.details[id]; return Boolean(d && d.cluesRef && d.cluesRef.releaseId); },
    savedSource(id) { const c = cluesCheck(this.details[id]); return c && c.source || null; },
    revalCode(id) { const d = this.details[id]; return d && d.cluesRef ? d.cluesRef.code : ''; },
    // D-5-F1: every check (and every recovery) re-reads the unit first, so the comparison and the revision of the next
    // confirmation come from what the server holds now — never from a stale snapshot.
    startRevalidate(id) { if (this.actionsLocked) return; this.message = ''; this.reval = { id, state: 'reading', current: null, error: '', notice: '', uncertain: false, unitStatus: null }; this.recheck(); },
    retryRevalidation() { if (this.reval && !this.busy) this.recheck(); },
    async recheck(notice = '') {
      const reval = this.reval; if (!reval) return;
      this.reval = { ...reval, state: 'reading', error: '', notice, unitStatus: null }; this.busy = true;
      let d;
      try { d = await this.fetchDetail(reval.id); } finally { if (this.alive) this.busy = false; }
      if (!this.current() || !this.reval || this.reval.id !== reval.id) return;
      if (!d.data) { this.reval = { ...this.reval, state: 'unit-error', unitStatus: d.status }; return; }
      this.$set(this.details, reval.id, { ...this.rows.find(r => r.id === reval.id), ...d.data }); this.$delete(this.detailErrors, reval.id); this.$delete(this.uncertainUpdates, reval.id);
      const ref = d.data.cluesRef;
      if (!ref || !ref.releaseId) { this.reval = { ...this.reval, state: 'no-ref', uncertain: false }; return; }
      await this.lookup();
    },
    async lookup() {
      const reval = this.reval; if (!reval) return;
      const ref = this.details[reval.id].cluesRef;
      this.reval = { ...reval, state: 'loading', error: '' }; this.busy = true;
      try {
        const r = await DACore.get('api/identity/catalogs/sis.establishments', { params: { exactCode: ref.code } });
        if (!this.current() || !this.reval || this.reval.id !== reval.id) return;
        if (!r || !r.success || !r.data.available) { this.reval = { ...this.reval, state: 'unavailable' }; return; }
        const item = r.data.item, source = r.data.source;
        if (!item) { this.reval = { ...this.reval, state: 'missing', current: { source } }; return; }
        if (!item.check || item.check.result !== 'valid') { this.reval = { ...this.reval, state: 'ineligible', current: { source } }; return; }
        this.reval = { ...this.reval, state: item.ref.releaseId === ref.releaseId ? 'same' : 'found', uncertain: false, current: { ref: item.ref, label: item.label, attributes: item.attributes || null, source } };
      } catch (_) { if (this.current() && this.reval) this.reval = { ...this.reval, state: 'unavailable' }; }
      finally { if (this.alive) this.busy = false; }
    },
    closeRevalidation() {
      if (this.busy || !this.reval) return;
      // Closing while the outcome is unknown keeps that uncertainty visible on the unit until it is re-read.
      if (this.reval.uncertain) this.$set(this.uncertainUpdates, this.reval.id, true);
      this.reval = null;
    },
    async applyRevalidation() {
      const reval = this.reval; if (!reval || reval.state !== 'found' || this.busy) return;
      const unit = this.details[reval.id], next = reval.current;
      const ok = await this.confirmUpdate(unit.cluesRef.code, next.source.sourceVersion); if (!ok || !this.current()) return;
      this.busy = true; this.reval = { ...reval, error: '', notice: '' };
      let r;
      try {
        // Minimal PATCH: only the reference changes, under the revision of the last successful read.
        r = await DACore.patch(base + '/' + encodeURIComponent(reval.id), { identity: { cluesRef: next.ref }, expectedRevision: unit.revision });
      } catch (_) { r = null; }
      finally { if (this.alive) this.busy = false; }
      if (!this.current() || !this.reval) return;
      if (r && r.success) {
        this.reval = null; await this.load();
        this.message = !this.loadError && !this.detailErrors[reval.id] && cluesStatus(this.details[reval.id]).key === 'valid'
          ? 'Referencia actualizada a la versión vigente. Nada más cambió.'
          : 'Referencia guardada. No pudimos confirmar que siga vigente; puedes volver a comprobarla.';
        return;
      }
      // 409: someone else saved. Show the fresh data for review and a new explicit confirmation; nothing is resent.
      if (r && r.status === 409) {
        await this.recheck(r.data && r.data.code === 'CATALOG_RELEASE_CHANGED'
          ? 'El catálogo cambió mientras revisabas. Mostramos la versión actual: revísala y confirma de nuevo si corresponde.'
          : 'Otra persona guardó cambios en esta unidad. Mostramos los datos actuales: revísalos y confirma de nuevo solo si sigue procediendo.'); return;
      }
      if (r && r.status && r.status < 500) {
        this.reval = { ...this.reval, error: r.status === 403 ? 'El servidor rechazó la actualización: tu sesión ya no tiene permiso para modificar unidades. No se aplicó.' : 'El servidor rechazó la actualización; no se aplicó. Revisa e inténtalo de nuevo.' };
        return;
      }
      // Lost response or 5xx: the update may or may not have been applied. No resend; reading tells which.
      this.reval = { ...this.reval, uncertain: true, error: '' };
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
/* Alerts of this block (confirmed draft, unconfirmed create, errors): Vuetify text alerts fall below 4.5:1 here. */
.health-units .v-alert--text.info--text { color: #075985 !important; caret-color: #075985 !important; }
.health-units .v-alert--text.warning--text { color: #7c2d12 !important; caret-color: #7c2d12 !important; }
.health-units .v-alert--text.error--text { color: #9f1239 !important; caret-color: #9f1239 !important; }
html[data-theme="clinical-night"] .health-units .v-alert--text.info--text { color: #7dd3fc !important; caret-color: #7dd3fc !important; }
html[data-theme="clinical-night"] .health-units .v-alert--text.warning--text { color: #fdba74 !important; caret-color: #fdba74 !important; }
html[data-theme="clinical-night"] .health-units .v-alert--text.error--text { color: #fda4af !important; caret-color: #fda4af !important; }
html[data-theme="clinical-night"] .health-units .v-alert--text button { color: inherit; }
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
