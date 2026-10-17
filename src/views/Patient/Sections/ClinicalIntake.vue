<template>
  <section class="pa-5" :aria-busy="String(loading || saving)">
    <div class="mb-4">
      <p class="text-sm font-semibold text-primary-700">HISTORIA CLÍNICA · CAPTURA INICIAL</p>
      <h2 class="text-lg font-semibold">Motivo y relato del paciente</h2>
      <p class="text-sm mt-2">Registra lo que refiere el paciente. Se guarda como borrador para que el doctor lo revise y complete.</p>
      <p class="text-sm mt-2">Paciente: <strong>{{ patientName }}</strong></p>
    </div>
    <p v-if="loading" role="status">Cargando captura inicial…</p>
    <v-alert v-if="error" type="error" text dense role="alert">{{ error }}</v-alert>
    <v-btn v-if="loadFailed" outlined :disabled="loading" @click="load">Reintentar</v-btn>
    <v-alert v-if="feedback" type="success" text dense role="status">{{ feedback }}</v-alert>
    <v-alert v-if="loaded && !editable" type="info" text dense>{{ closedMessage }}</v-alert>
    <v-form v-if="loaded && editable" @submit.prevent="save">
      <v-text-field v-if="doctorAssignmentLocked" :value="assignedDoctorLabel" label="Doctor que revisará el borrador" outlined dense readonly hint="Para cambiar el doctor asignado se requiere el editor clínico autorizado." persistent-hint class="mb-3" />
      <v-select v-else v-model="doctorProfileId" :items="doctors" item-value="id_doctor_professional_profile" item-text="professional_name"
        label="Doctor que revisará el borrador" outlined dense :disabled="saving || loading" :error-messages="doctorError"
        no-data-text="No hay doctores activos en este consultorio" hint="El borrador aparecerá en los pendientes del doctor seleccionado. Él revisará la historia antes de finalizarla." persistent-hint class="mb-3" />
      <v-alert v-if="doctorAssignmentLocked && !assignedDoctorAvailable" type="warning" text dense>
        El doctor asignado ya no está disponible. Solicita su cambio desde el editor clínico antes de guardar.
      </v-alert>
      <v-textarea v-if="fields.includes('reason')" v-model="form.reason" label="Motivo de consulta referido por el paciente" outlined rows="2" counter="500" maxlength="500" :disabled="saving || loading" />
      <v-textarea v-if="fields.includes('current_condition')" v-model="form.current_condition" label="Relato del padecimiento actual" outlined rows="3" counter="1500" maxlength="1500" :disabled="saving || loading" />
      <v-text-field v-if="fields.includes('evolution_time')" v-model="form.evolution_time" label="Tiempo de evolución referido" outlined dense counter="100" maxlength="100" :disabled="saving || loading" />
      <v-textarea v-if="fields.includes('main_symptoms')" v-model="form.main_symptoms" label="Síntomas referidos por el paciente" outlined rows="2" counter="1500" maxlength="1500" :disabled="saving || loading" />
      <p class="text-sm mb-4">La captura inicial no finaliza la historia ni firma documentos. Los demás apartados requieren sus permisos clínicos.</p>
      <div class="flex flex-wrap gap-3 justify-end">
        <v-btn v-if="conflict" outlined :disabled="saving || loading" @click="requestReload">Cargar versión actual</v-btn>
        <v-btn color="primary" type="submit" :loading="saving" :disabled="saving || loading || conflict || !dirty || (doctorAssignmentLocked && !assignedDoctorAvailable)">Guardar borrador</v-btn>
      </div>
    </v-form>
    <v-dialog v-model="showLeaveDialog" persistent max-width="520">
      <v-card>
        <v-card-title class="text-h6">Tienes cambios sin guardar</v-card-title>
        <v-card-text>{{ reloadRequested ? 'Cargar la versión actual descartará lo que escribiste aquí. Puedes seguir editando para conservarlo.' : 'Puedes guardar la captura inicial como borrador antes de salir.' }}</v-card-text>
        <v-card-text v-if="error || doctorError" role="alert" class="error--text">{{ doctorError || error }}</v-card-text>
        <v-card-actions class="flex flex-wrap gap-2 pa-4">
          <v-btn v-if="!reloadRequested && !conflict" color="primary" :loading="saving" @click="resolveLeave('save')">Guardar y salir</v-btn>
          <v-btn outlined color="error" :disabled="saving" @click="resolveLeave('discard')">{{ reloadRequested ? 'Descartar y cargar' : 'Descartar cambios' }}</v-btn>
          <v-btn text :disabled="saving" @click="resolveLeave('stay')">Seguir editando</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script>
import HistoryService from '../../../services/core/clinicalHistory/DAClinicalHistoryService';
const empty = () => ({ reason: '', current_condition: '', evolution_time: '', main_symptoms: '' });

export default {
  props: { px: { type: Object, required: true } },
  data() {
    return { form: empty(), saved: JSON.stringify(empty()), history: null, fields: [], loading: false, saving: false,
      loaded: false, editable: false, loadFailed: false, error: '', feedback: '', conflict: false, closedMessage: '',
      requestId: 0, disposed: false, showLeaveDialog: false, reloadRequested: false, leaveResolver: null, leavePromise: null,
      doctors: [], doctorProfileId: null, savedDoctorProfileId: null, doctorAssignmentLocked: false,
      assignedDoctorAvailable: true, assignedDoctorLabel: '', doctorError: '' };
  },
  computed: {
    patientId() { return this.px && this.px.person && this.px.person.id_person; },
    patientName() { const p = this.px && this.px.person || {}; return p.fullname || [p.name, p.surname].filter(Boolean).join(' '); },
    dirty() { return JSON.stringify(this.form) !== this.saved || this.doctorProfileId !== this.savedDoctorProfileId; }
  },
  mounted() {
    this.$emit('register-navigation-guard', this.confirmLeave);
    this.load();
    window.addEventListener('beforeunload', this.beforeUnload);
    this.removeNavigationGuard = this.$router.beforeEach((to, from, next) => this.confirmLeave().then(value => next(value)).catch(() => next(false)));
  },
  beforeDestroy() {
    this.disposed = true;
    this.requestId++;
    this.$emit('register-navigation-guard', null);
    window.removeEventListener('beforeunload', this.beforeUnload);
    if(this.removeNavigationGuard) this.removeNavigationGuard();
    if(this.leaveResolver) this.leaveResolver(false);
  },
  methods: {
    apply(data) {
      this.fields = data.fields || Object.keys(empty());
      this.form = { ...empty(), ...(data.consultation || {}) };
      this.saved = JSON.stringify(this.form);
      this.history = data.history || null;
      this.doctors = data.doctors || [];
      const assigned = data.responsible_doctor || null;
      this.doctorProfileId = assigned && assigned.id_doctor_professional_profile || data.suggested_doctor_profile_id || null;
      this.savedDoctorProfileId = this.history ? assigned && assigned.id_doctor_professional_profile || null : this.doctorProfileId;
      this.doctorAssignmentLocked = Boolean(data.doctor_assignment_locked);
      this.assignedDoctorAvailable = data.assigned_doctor_available !== false;
      this.assignedDoctorLabel = assigned && assigned.professional_name || 'Sin doctor asignado';
      this.doctorError = '';
      this.editable = Boolean(data.editable);
      this.closedMessage = data.message || '';
      this.loaded = true;
      this.conflict = false;
    },
    async load() {
      if(this.saving || !this.patientId) return;
      const version = ++this.requestId;
      const patient = this.patientId;
      this.loading = true;
      this.error = '';
      this.loadFailed = false;
      try {
        const response = await HistoryService.getIntake(patient);
        if(this.disposed || version !== this.requestId || patient !== this.patientId) return;
        if(!response.success) throw new Error(response.message || 'No se pudo cargar la captura inicial.');
        this.apply(response.data);
      } catch(error) {
        if(!this.disposed && version === this.requestId) { this.error = error.message || 'No se pudo cargar la captura inicial.'; this.loadFailed = true; }
      } finally { if(!this.disposed && version === this.requestId) this.loading = false; }
    },
    async save() {
      if(this.saving || this.loading || !this.editable || this.conflict) return false;
      this.error = '';
      this.feedback = '';
      this.doctorError = '';
      if(!this.doctorProfileId) { this.doctorError = 'Selecciona el doctor que revisará este borrador.'; return false; }
      if(this.doctorAssignmentLocked && !this.assignedDoctorAvailable) return false;
      this.saving = true;
      const patient = this.patientId;
      try {
        const response = await HistoryService.saveIntake(patient, { id_clinical_history: this.history && this.history.id_clinical_history,
          doctor_responsible_profile_id: this.doctorProfileId,
          expected_revision: this.history && this.history.revision, consultation: Object.fromEntries(this.fields.map(field => [field, this.form[field]])) });
        if(this.disposed || patient !== this.patientId) return false;
        if(!response.success) {
          this.conflict = Number(response.status) === 409 || Boolean(response.data && response.data.code === 'HISTORY_REVISION_CONFLICT');
          this.error = response.message || 'No se pudo guardar. Tu captura se conserva; intenta nuevamente.';
          return false;
        }
        this.apply(response.data);
        this.feedback = `Captura guardada como borrador para ${this.assignedDoctorLabel}. El doctor podrá revisarla y completar la historia.`;
        return true;
      } catch(error) {
        this.error = 'No se pudo guardar. Tu captura se conserva; intenta nuevamente.';
        return false;
      } finally { this.saving = false; }
    },
    beforeUnload(event) { if(this.dirty || this.saving) { event.preventDefault(); event.returnValue = ''; } },
    confirmLeave() {
      if(this.saving || this.loading) return Promise.resolve(false);
      if(!this.dirty) return Promise.resolve(true);
      if(this.leavePromise) return this.leavePromise;
      this.reloadRequested = false;
      this.showLeaveDialog = true;
      this.leavePromise = new Promise(resolve => { this.leaveResolver = resolve; });
      return this.leavePromise;
    },
    requestReload() { this.reloadRequested = true; this.showLeaveDialog = true; },
    async resolveLeave(action) {
      if(this.saving) return;
      if(action === 'save' && !await this.save()) return;
      const reload = this.reloadRequested && action === 'discard';
      if(action === 'discard' && !reload) { this.form = JSON.parse(this.saved); this.doctorProfileId = this.savedDoctorProfileId; }
      this.showLeaveDialog = false;
      this.reloadRequested = false;
      const resolve = this.leaveResolver;
      this.leaveResolver = null;
      this.leavePromise = null;
      if(resolve) resolve(action !== 'stay');
      if(reload) await this.load();
    }
  }
};
</script>
