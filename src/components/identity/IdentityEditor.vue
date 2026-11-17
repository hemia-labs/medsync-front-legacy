<template>
  <!-- NC1: identity card inside the clinical edit (PatientForm). Same load/save state machine as before:
       differential patch, expectedRevision, stale-response discard, `saved` and the discard confirmation.
       Presentation: system controls and a field-error adapter for { data.field, message }. -->
  <section class="ide" :aria-busy="String(loading || saving)">
    <div v-if="loading" class="ide-loading" role="status">
      <v-progress-linear indeterminate height="3" color="primary" class="mb-3"></v-progress-linear>
      Consultando identidad…
    </div>
    <div v-if="error && !loaded" class="ide-alert ide-alert--error" role="alert">
      <p class="m-0">{{ error }}</p>
      <v-btn small text color="primary" @click="load">Reintentar</v-btn>
    </div>

    <template v-if="loaded">
      <p v-if="legacy && !hasNames" class="ide-alert ide-alert--info">Datos históricos: <strong>{{ legacy }}</strong>. Escribe el nombre y cada apellido en su campo; no se separan automáticamente.</p>

      <identity-fields ref="fields" v-model="draft" :kind="kind" :disabled="saving" :can-manage="canManage" :errors="fieldErrors" />

      <div v-if="error" class="ide-alert" :class="conflict ? 'ide-alert--warning' : 'ide-alert--error'" role="alert">
        <p class="m-0">{{ error }}<template v-if="conflict"> Usa «Recargar datos guardados».</template></p>
      </div>

      <div class="ide-footer">
        <p class="ide-status" role="status">
          <span v-if="saving">Guardando identidad…</span>
          <span v-else-if="dirty">Cambios de identidad sin guardar. Se guardan solo con «Guardar identidad».</span>
          <span v-else>{{ message }}</span>
        </p>
        <div class="ide-actions">
          <v-btn outlined color="primary" :disabled="saving" @click="reload">Recargar datos guardados</v-btn>
          <v-btn depressed color="primary" :loading="saving" :disabled="saving" @click="save">Guardar identidad</v-btn>
        </div>
      </div>
    </template>
  </section>
</template>

<script>
import IdentityFields from './IdentityFields.vue';
import { DACore } from '../../services/config/axios.context';
import { authorizationContext, isCurrentAuthorization } from '../../security/authorizationContext';
import { editableIdentity, identityPatch, identityFieldError } from '../../domain/identity/identityDraft';

export default {
  components: { IdentityFields },
  props: { kind: { type: String, default: 'patient' }, subject: { type: String, required: true }, canManage: Boolean },
  data: () => ({ draft: {}, baseline: {}, revision: 0, loading: false, saving: false, loaded: false, error: '', message: '', legacy: '', sequence: 0, fieldErrors: {}, conflict: false }),
  computed: {
    url() { return 'api/identity/' + (this.kind === 'patient' ? 'patients/' : 'professionals/') + encodeURIComponent(this.subject); },
    dirty() { return Object.keys(identityPatch(this.draft, this.baseline)).length > 0; },
    // The historical value is the unsplit surname (patients) or display name (professionals): show it until surnames exist.
    hasNames() { return Boolean(this.baseline.firstSurname || this.baseline.secondSurname); }
  },
  watch: { subject() { this.load(); } },
  mounted() { this.load(); },
  beforeDestroy() { this.sequence++; },
  methods: {
    async reload() { if (this.dirty && !window.confirm('¿Descartar los cambios de identidad sin guardar?')) return; await this.load(); },
    async load() {
      const seq = ++this.sequence, context = authorizationContext(this.$store);
      this.loading = true; this.loaded = false; this.error = ''; this.fieldErrors = {}; this.conflict = false;
      try {
        const r = await DACore.get(this.url);
        if (seq !== this.sequence || !isCurrentAuthorization(context, this.$store)) return;
        if (!r.success) throw new Error(r.message);
        this.revision = r.data.revision;
        this.legacy = r.data.legacySurname || r.data.legacyProfessionalName || '';
        this.draft = editableIdentity(r.data);
        this.baseline = editableIdentity(r.data);
        this.loaded = true; this.message = 'La verificación de CURP y catálogos sigue pendiente.';
      } catch (e) { this.error = e.message || 'No se pudo consultar.'; } finally { if (seq === this.sequence) this.loading = false; }
    },
    async save() {
      if (this.saving) return;
      const context = authorizationContext(this.$store), seq = this.sequence;
      this.saving = true; this.error = ''; this.fieldErrors = {}; this.conflict = false;
      const patch = identityPatch(this.draft, this.baseline);
      try {
        const r = await DACore.patch(this.url, { identity: patch, expectedRevision: this.revision });
        if (seq !== this.sequence || !isCurrentAuthorization(context, this.$store)) return;
        if (!r.success) {
          const mapped = identityFieldError(r); this.conflict = r.status === 409;
          if (mapped) { this.fieldErrors = mapped.errors; this.$nextTick(() => this.$refs.fields && this.$refs.fields.focus(mapped.field)); throw new Error(`Revisa «${mapped.label}». Conservamos tu captura.`); }
          throw new Error(r.status === 409 ? 'La identidad cambió. Conservamos tu captura; recarga para conciliar.' : r.message);
        }
        this.baseline = editableIdentity(r.data); this.draft = editableIdentity(r.data); this.revision = r.data.revision;
        this.message = 'Identidad guardada; validación de catálogos pendiente.'; this.$emit('saved', r.data);
      } catch (e) { this.error = e.message || 'No se pudo guardar. Conservamos tu captura.'; } finally { this.saving = false; }
    }
  }
};
</script>

<style scoped>
.ide { margin: 16px 20px 4px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; }
.ide-loading { font-size: 14px; color: #4b5563; padding: 4px 0 8px; }
.ide-alert { margin: 0 0 14px; padding: 10px 14px; font-size: 14px; border: 1px solid; border-radius: 4px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 12px; }
.ide-alert--error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
.ide-alert--warning { border-color: #fde68a; background: #fffbeb; color: #92400e; }
.ide-alert--info { border-color: #bfdbfe; background: #eff6ff; color: #1e40af; display: block; }
.ide-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; margin-top: 4px; padding-top: 14px; border-top: 1px solid #f3f4f6; }
.ide-status { margin: 0; font-size: 13px; color: #4b5563; flex: 1 1 260px; }
.ide-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.ide-actions .v-btn { min-height: 44px; }
html[data-theme="clinical-night"] .ide { background: #1e293b; border-color: #334155; }
html[data-theme="clinical-night"] .ide-footer { border-top-color: #334155; }
html[data-theme="clinical-night"] .ide-status, html[data-theme="clinical-night"] .ide-loading { color: #cbd5e1; }
html[data-theme="clinical-night"] .ide-alert--error { background: #3b1d22; border-color: #7f1d1d; color: #fecaca; }
html[data-theme="clinical-night"] .ide-alert--warning { background: #302617; border-color: #735325; color: #fde8bb; }
html[data-theme="clinical-night"] .ide-alert--info { background: #172554; border-color: #1e3a8a; color: #bfdbfe; }
@media (max-width: 767px) {
  .ide { margin: 12px 12px 4px; padding: 16px; }
  .ide-actions { width: 100%; flex-direction: column-reverse; }
  .ide-actions .v-btn { width: 100%; }
}
</style>
