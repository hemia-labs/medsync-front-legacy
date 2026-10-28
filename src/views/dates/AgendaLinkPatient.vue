<template>
  <v-card class="agenda-link-card pa-5">
    <h2 class="text-xl mb-3">Vincular paciente a la cita</h2>
    <p>Nombre guardado: {{ appointment.patientName }}. El vínculo conserva ese nombre, el teléfono, el horario y el estado. Los demás cambios de la cita no se guardarán con esta acción.</p>
    <p v-if="appointment.status === 'completed'">Esta atención aparecerá en el historial del paciente elegido.</p>
    <v-text-field v-model="query" label="Buscar por nombre, código o teléfono" outlined dense :disabled="busy || !!pending" @keyup.enter="search" />
    <v-btn :disabled="busy || !!pending || query.trim().length < 2" @click="search">Buscar pacientes</v-btn>
    <p class="mt-3">Revisa nombre y código: un teléfono compartido puede corresponder a varias personas.</p>
    <v-radio-group v-model="selected" :disabled="busy || !!pending">
      <v-radio v-for="person in candidates" :key="person.id" :value="person.id" :label="person.label" />
    </v-radio-group>
    <p v-if="message" role="status">{{ message }}</p>
    <v-card-actions class="link-actions">
      <v-btn :disabled="busy || !!pending" @click="$emit('close')">Volver a la cita</v-btn>
      <v-btn class="link-confirm" :disabled="busy || (!selected && !pending)" @click="link">{{ pending ? 'Reintentar vínculo' : 'Confirmar vínculo' }}</v-btn>
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
.link-actions { display:flex; flex-wrap:wrap; gap:10px; }
.link-actions .v-btn { margin-left:0!important; min-height:44px; }
.v-btn.link-confirm { background:var(--color-primary-900)!important; color:white!important; }
html[data-theme="clinical-night"] .agenda-link-card .v-btn:not(.link-confirm) { color:#e2e8f0!important; background:#334155!important; }
html[data-theme="clinical-night"] .agenda-link-card ::v-deep .v-label { color:#e2e8f0!important; }
html[data-theme="clinical-night"] .agenda-link-card ::v-deep .v-icon:not(.primary--text) { color:#94a3b8!important; }
</style>
