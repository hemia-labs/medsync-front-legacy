<template>
  <v-card class="agenda-link-card agenda-modal">
    <div class="agenda-modal-header">
      <span class="agenda-modal-icon"><v-icon aria-hidden="true">mdi-account-check-outline</v-icon></span>
      <div class="agenda-modal-heading"><p class="agenda-modal-eyebrow">Continuidad de atención</p><h2 id="agenda-link-title">Vincular paciente a la cita</h2></div>
    </div>
    <v-card-text class="agenda-modal-body">
      <div class="agenda-modal-summary"><span>Nombre guardado en la cita</span><strong>{{ appointment.patientName }}</strong></div>
      <p>El vínculo conserva ese nombre, el teléfono, el horario y el estado. Los demás cambios de la cita no se guardarán con esta acción.</p>
      <p v-if="appointment.status === 'completed'" class="agenda-modal-note">Esta atención aparecerá en el historial del paciente elegido.</p>
      <div class="agenda-modal-search">
        <v-text-field v-model="query" label="Buscar por nombre, código o teléfono" outlined dense hide-details :disabled="busy || !!pending" @keyup.enter="search" />
        <v-btn class="agenda-modal-button" :disabled="busy || !!pending || query.trim().length < 2" @click="search"><v-icon left small aria-hidden="true">mdi-magnify</v-icon>Buscar pacientes</v-btn>
      </div>
      <p id="agenda-link-hint">Revisa nombre y código: un teléfono compartido puede corresponder a varias personas.</p>
      <v-radio-group v-model="selected" class="agenda-link-candidates" aria-label="Pacientes encontrados" aria-describedby="agenda-link-hint" :disabled="busy || !!pending">
        <v-radio v-for="person in candidates" :key="person.id" class="agenda-link-candidate" :value="person.id" :label="person.label" />
      </v-radio-group>
      <p v-if="message" class="agenda-modal-note" role="status">{{ message }}</p>
    </v-card-text>
    <v-card-actions class="link-actions agenda-modal-footer">
      <v-btn class="agenda-modal-button" :disabled="busy || !!pending" @click="$emit('close')">Volver a la cita</v-btn>
      <v-btn class="link-confirm agenda-modal-button agenda-modal-button--primary" :disabled="busy || (!selected && !pending)" @click="link">{{ pending ? 'Reintentar vínculo' : 'Confirmar vínculo' }}</v-btn>
    </v-card-actions>
  </v-card>
</template>
<script>
import { DAAppointmentService, DAPxService } from '../../services/context/core-proccess-context';
import { patientSearchQueries, newAgendaRequestId } from '../../domain/appointments/agendaInteraction';
import { authorizationContext, isCurrentAuthorization } from '../../security/authorizationContext';
export default {
  props: { appointment: { type: Object, required: true }, candidate: { type: Object, default: null } },
  data() { return { query: this.appointment.contactPhone || '', candidates: [], selected: '', busy: false, pending: null, message: '', live: true, removeGuard: null, context: authorizationContext(this.$store) }; },
  created() { if(this.candidate) { this.candidates = [this.candidate]; this.selected = this.candidate.id; } },
  mounted() { this.removeGuard = this.$router.beforeEach((to, from, next) => next(this.busy || this.pending ? false : undefined)); window.addEventListener('beforeunload', this.guardUnload); },
  beforeDestroy() { this.live = false; if(this.removeGuard) this.removeGuard(); window.removeEventListener('beforeunload', this.guardUnload); },
  methods: {
    guardUnload(event) { if(this.busy || this.pending) { event.preventDefault(); event.returnValue = ''; } },
    current() { return this.live && isCurrentAuthorization(this.context, this.$store); },
    async search() {
      if(this.busy || this.pending || this.query.trim().length < 2 || !this.current()) return;
      this.busy = true; this.message = ''; this.selected = ''; this.candidates = [];
      try {
        const results = await Promise.all(patientSearchQueries(this.query).map(query => DAPxService.searchFast({ query, limit: 12 })));
        if(!this.current()) return;
        if(results.some(r => !r.success)) throw new Error();
        const rows = results.flatMap(r => r.data || []);
        this.candidates = [...new Map(rows.map(p => { const id = p.id_person || p.id; return [id, { id, label: [p.name_complete || [p.firstName || p.name,p.surname].filter(Boolean).join(' '), p.code && 'Código ' + p.code, p.telephone].filter(Boolean).join(' · ') }]; })).values()];
        if(!this.candidates.length) this.message = 'No hay coincidencias. Puedes volver a la cita y registrar un paciente.';
      } catch (_) { if(this.current()) this.message = 'No se pudo consultar. Intenta de nuevo.'; }
      finally { this.busy = false; }
    },
    async link() {
      if(this.busy || (!this.selected && !this.pending) || !this.current()) return;
      if(!this.pending) this.pending = { patientId: this.selected, revision: this.appointment.revision, request_id: newAgendaRequestId(), ...(this.appointment.status === 'completed' ? { confirm_completed: true } : {}) };
      this.busy = true; this.message = '';
      try {
        const r = await DAAppointmentService.linkPatient(this.appointment.id, this.pending);
        if(!this.current()) return;
        if(r.success) { this.pending = null; this.$emit('linked', r.data[0]); return; }
        if(r.status >= 400 && r.status < 500) this.pending = null;
        if(r.data && r.data.appointment) this.$emit('conflict', r.data.appointment);
        this.message = r.message || 'No se confirmó el vínculo. Reintenta la misma operación.';
      } catch (_) { if(this.current()) this.message = 'No se confirmó el vínculo. Conservamos la operación para reintentar sin duplicarla.'; }
      finally { this.busy = false; }
    }
  }
};
</script>
<style scoped>
.agenda-link-card .agenda-modal-search { margin-top: 20px; }
</style>
<style src="./agendaDialogs.css"></style>
