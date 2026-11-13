<template>
  <section class="patient-create-page">
    <header class="patient-create-hero">
      <div>
        <p class="patient-create-kicker">Alta administrativa</p>
        <h1>Nuevo paciente</h1>
        <p>Registra los datos básicos del paciente. Los campos con * son obligatorios. La historia clínica se podrá crear después dentro del expediente.</p>
      </div>
      <button type="button" class="patient-create-secondary" :disabled="isSaving || !!pendingCreate" @click="cancelCreation">
        Cancelar
      </button>
    </header>

    <p v-if="fromAgenda" role="status">Al terminar volverás a la cita para revisar el paciente. La captura se conserva solo en esta sesión; recargar o cambiar de acceso la descarta.</p>
    <p v-if="creationMessage" role="alert">{{ creationMessage }}</p>
    <div class="patient-create-shell">
      <fieldset :disabled="isSaving || !!pendingCreate || !!createdPatient || accessChanged">
      <div v-if="submitted && Object.keys(formErrors).length" class="patient-create-error-summary" role="alert">
        <strong>Revisa los datos antes de crear el paciente.</strong>
        <button v-for="(message, field) in formErrors" :key="field" type="button" @click="focusField(field)">{{ message }}</button>
      </div>
      <article class="patient-create-section">
        <div class="section-heading">
          <p>Datos personales</p>
          <span>Información mínima para crear el expediente.</span>
        </div>
        <div class="patient-create-grid">
          <v-text-field v-field-error="{ id: 'patient-name', invalid: Boolean(fieldError('name').length), required: true }" ref="name" v-model.trim="form.name" label="Nombre *" required outlined dense :error-messages="fieldError('name')" @blur="touchField('name')"></v-text-field>
          <v-text-field v-field-error="{ id: 'patient-firstSurname', invalid: Boolean(fieldError('firstSurname').length), required: true }" ref="firstSurname" v-model.trim="form.firstSurname" label="Apellido paterno *" required outlined dense :error-messages="fieldError('firstSurname')" @blur="touchField('firstSurname')"></v-text-field>
          <v-text-field v-model.trim="form.secondSurname" label="Apellido materno, opcional" outlined dense></v-text-field>
          <v-text-field v-field-error="{ id: 'patient-birthDate', invalid: Boolean(fieldError('birthDate').length), required: true }" ref="birthDate" v-model="form.birthDate" label="Fecha de nacimiento *" required type="date" :max="today" outlined dense :error-messages="fieldError('birthDate')" @blur="touchField('birthDate')"></v-text-field>
          <v-text-field :value="form.age" label="Edad" outlined dense readonly></v-text-field>
          <v-text-field v-field-error="{ id: 'patient-mobilePhone', invalid: Boolean(fieldError('mobilePhone').length), required: true }" ref="mobilePhone" v-model.trim="form.mobilePhone" label="Teléfono / celular *" required type="tel" inputmode="tel" hint="10 dígitos; puedes usar espacios, guiones o paréntesis." persistent-hint outlined dense :error-messages="fieldError('mobilePhone')" @blur="touchField('mobilePhone')"></v-text-field>
        </div>
      </article>

      <article class="patient-create-section">
        <div class="section-heading">
          <p>Datos opcionales</p>
          <span>Estos datos ayudan a identificar al paciente, pero no son historia clínica.</span>
        </div>
        <div class="patient-create-grid">
          <v-text-field v-field-error="{ id: 'patient-localPhone', invalid: Boolean(fieldError('localPhone').length), required: false }" ref="localPhone" v-model.trim="form.localPhone" label="Teléfono local, opcional" type="tel" inputmode="tel" hint="10 dígitos." outlined dense :error-messages="fieldError('localPhone')" @blur="touchField('localPhone')"></v-text-field>
          <v-text-field v-model.trim="form.occupation" label="Ocupación, opcional" outlined dense></v-text-field>
          <v-text-field v-model.trim="form.rfc" label="RFC, opcional" outlined dense></v-text-field>
        </div>
      </article>

      <article class="patient-create-section">
        <div class="section-heading">
          <p>Dirección</p>
          <span>La dirección es opcional en el alta; puede completarse después.</span>
        </div>
        <div class="patient-create-grid">
          <v-text-field v-model.trim="form.streetAddress" label="Calle / domicilio" outlined dense></v-text-field>
          <v-text-field v-model.trim="form.city" label="Ciudad / municipio" outlined dense></v-text-field>
          <v-text-field v-model.trim="form.state" label="Estado" outlined dense></v-text-field>
          <v-text-field v-field-error="{ id: 'patient-postalCode', invalid: Boolean(fieldError('postalCode').length), required: false }" ref="postalCode" v-model.trim="form.postalCode" label="Código postal, opcional" inputmode="numeric" hint="5 dígitos." outlined dense :error-messages="fieldError('postalCode')" @blur="touchField('postalCode')"></v-text-field>
        </div>
      </article>

      <article class="patient-create-section patient-create-note">
        <div>
          <p>Contacto de emergencia</p>
          <span>El alta registra únicamente los teléfonos del paciente. El contacto de emergencia no está disponible en este formulario. El personal clínico puede documentar su nombre, relación y teléfono en Observaciones generales de la historia clínica para la atención.</span>
        </div>
      </article>

      </fieldset>
      <footer class="patient-create-actions">
        <button type="button" class="patient-create-secondary" :disabled="isSaving || !!pendingCreate" @click="cancelCreation">
          Cancelar
        </button>
        <button v-if="pendingCreate" type="button" class="patient-create-secondary" :disabled="isSaving || accessChanged" @click="recoverCreation">Consultar resultado del alta</button>
        <button type="button" class="patient-create-primary" :disabled="isSaving || accessChanged || (!!pendingCreate && !retryAllowed)" @click="createPatient">
          {{ isSaving ? 'Procesando…' : createdPatient ? 'Continuar con el paciente creado' : pendingCreate ? 'Reintentar la misma alta' : 'Crear paciente' }}
        </button>
      </footer>
    </div>
  </section>
</template>

<script>
import { mapGetters } from 'vuex';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import VuexMixin from '../../mixins/VuexMixin';
import { patientAge, patientAdministrativeErrors, normalizePatientPhone, localDateString } from '../../domain/patient/administrative.validation';
import fieldError from '../../core/directives/field-error';
import DAPxService from '../../services/core/px/DAPxService';
import { newAgendaRequestId } from '../../domain/appointments/agendaInteraction';
import { peekAgendaReturn, setAgendaCreatedPatient } from '../../domain/appointments/agendaNavigation';
import { authorizationContext, isCurrentAuthorization } from '../../security/authorizationContext';

export default {
  directives: { fieldError },
  mixins: [VuexMixin],
  data() {
    return {
      isSaving: false,
      pendingCreate: null, retryAllowed: false, createdPatient: null, creationMessage: '', accessChanged: false,
      creationContext: authorizationContext(this.$store), alive: true, leaving: false, removeCreationGuard: null,
      submitted: false,
      touched: {},
      form: {
        name: '',
        firstSurname: '',
        secondSurname: '',
        birthDate: '',
        age: '',
        mobilePhone: '',
        localPhone: '',
        occupation: '',
        rfc: '',
        streetAddress: '',
        city: '',
        state: '',
        postalCode: ''
      }
    };
  },
  created() {
    const entry = peekAgendaReturn(this.$store), phone = entry && entry.kind === 'create-patient' && entry.draft && String(entry.draft.appointment.contactPhone || '').replace(/[()\s-]/g, '');
    if(/^\+52\d{10}$/.test(phone)) this.form.mobilePhone = phone.slice(3);
    else if(/^\d{10}$/.test(phone)) this.form.mobilePhone = phone;
  },
  mounted() {
    this.removeCreationGuard = this.$router.beforeEach((to, from, next) => next(!this.leaving && (this.isSaving || this.pendingCreate) ? false : undefined));
    window.addEventListener('beforeunload', this.guardCreationUnload);
  },
  beforeDestroy() { this.alive = false; if(this.removeCreationGuard) this.removeCreationGuard(); window.removeEventListener('beforeunload', this.guardCreationUnload); },
  computed: {
    ...mapGetters(moduleTypes.AUTH, { hasPermission: fnTypes.hasPermission }),
    creationAccessKey() { return JSON.stringify(authorizationContext(this.$store)); },
    fromAgenda() { const entry = peekAgendaReturn(this.$store); return entry && entry.kind === 'create-patient'; },
    today() { return localDateString(); },
    formErrors() { return patientAdministrativeErrors(this.form); }
  },
  watch: {
    creationAccessKey() { this.accessChanged = true; this.pendingCreate = null; this.createdPatient = null; Object.keys(this.form).forEach(key => { this.form[key] = '' }); this.creationMessage = 'Cambió tu acceso. Recarga para continuar.'; },
    'form.birthDate': function() {
      this.form.age = this.calculateAge(this.form.birthDate);
    }
  },
  methods: {
    creationCurrent() { return this.alive && isCurrentAuthorization(this.creationContext, this.$store) && this.hasPermission('px.new'); },
    guardCreationUnload(event) { if(this.pendingCreate || this.isSaving) { event.preventDefault(); event.returnValue = ''; } },
    async cancelCreation() { if(this.isSaving || this.pendingCreate) return; this.leaving = true; await this.$router.push(this.fromAgenda ? { name: 'Citas' } : '/inicio'); },
    async finishCreation(id, payload) {
      if(!this.creationCurrent()) return;
      this.createdPatient = { id, name: [payload.person.name,payload.person.surname].filter(Boolean).join(' '), label: [payload.person.name,payload.person.surname].filter(Boolean).join(' ') };
      this.pendingCreate = null; this.leaving = true;
      const returning = setAgendaCreatedPatient(this.$store, this.createdPatient);
      try { await this.$router.push(returning ? { name: 'Citas' } : this.hasPermission('px.all') ? { path: `/px/history/${id}`, query: { tab: 'medical-history', fromCreatePatient: '1' } } : '/inicio'); }
      catch (_) { this.creationMessage = 'El paciente ya se creó. Usa Continuar para volver; no se creará otro.'; this.leaving = false; }
    },
    async recoverCreation() {
      if(this.isSaving || !this.pendingCreate || !this.creationCurrent()) return;
      this.isSaving = true; this.retryAllowed = false;
      const sent = this.pendingCreate;
      try {
        const r = await DAPxService.minimalResult(sent.request_id);
        if(!this.creationCurrent()) return;
        if(r.success && r.data && r.data.id_person) await this.finishCreation(r.data.id_person, sent);
        else if(r.status === 404 && r.data && r.data.code === 'PATIENT_CREATE_NOT_FOUND') { this.retryAllowed = true; this.creationMessage = 'No hay un alta guardada para esta operación. Puedes reintentar la misma captura.'; }
        else this.creationMessage = r.message || 'No se pudo confirmar el resultado. Consulta otra vez antes de crear otro paciente.';
      } catch (_) { if(this.creationCurrent()) this.creationMessage = 'No se pudo consultar. Conservamos la captura; consulta otra vez.'; }
      finally { this.isSaving = false; }
    },
    calculateAge(value) {
      return patientAge(value);
    },
    fieldError(field) {
      return (this.submitted || this.touched[field]) && this.formErrors[field] ? [this.formErrors[field]] : [];
    },
    touchField(field) { this.$set(this.touched, field, true); },
    focusField(field) {
      this.$nextTick(() => {
        const control = this.$refs[field];
        if(control && control.$el) control.$el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        if(control && control.focus) control.focus();
      });
    },
    validateForm() {
      return Object.keys(this.formErrors).length === 0;
    },
    buildResidence() {
      return [this.form.city, this.form.state].filter(Boolean).join(', ');
    },
    buildPayload() {
      const surname = [this.form.firstSurname, this.form.secondSurname].filter(Boolean).join(' ');
      return {
        person: {
          name: this.form.name,
          surname,
          birthday: this.form.birthDate,
          age: this.form.age,
          telephone: normalizePatientPhone(this.form.mobilePhone),
          local_telephone: normalizePatientPhone(this.form.localPhone) || null,
          ocupation: this.form.occupation || null,
          rfc: this.form.rfc || null
        },
        address: {
          direction: this.form.streetAddress || null,
          residence: this.buildResidence() || null,
          cp: this.form.postalCode || null,
          place_birth: null
        }
      };
    },
    async createPatient() {
      if(this.isSaving || !this.creationCurrent()) return;
      if(this.createdPatient) return this.finishCreation(this.createdPatient.id, this.buildPayload());
      if(this.pendingCreate && !this.retryAllowed) return;
      this.submitted = true;
      if(!this.pendingCreate && !this.validateForm()) { this.focusField(Object.keys(this.formErrors)[0]); return; }
      if(!this.pendingCreate) this.pendingCreate = { ...this.buildPayload(), request_id: newAgendaRequestId() };
      const sent = this.pendingCreate;
      this.isSaving = true; this.retryAllowed = false; this.creationMessage = '';
      let recover = false;
      try {
        const r = await DAPxService.createMinimal(sent);
        if(!this.creationCurrent()) return;
        if(r.success && r.data && r.data.id_person) await this.finishCreation(r.data.id_person, sent);
        else if(r.data && r.data.code === 'PATIENT_CREATE_ALREADY_RECORDED') recover = true;
        else if(r.status >= 400 && r.status < 500) { this.pendingCreate = null; this.creationMessage = r.message || 'Revisa los datos del alta.'; }
        else this.creationMessage = 'No se confirmó el alta. Consulta el resultado antes de volver a enviarla.';
      } catch (_) { if(this.creationCurrent()) this.creationMessage = 'No se confirmó el alta. Consulta el resultado; no se enviará otra automáticamente.'; }
      finally { this.isSaving = false; }
      if(recover) await this.recoverCreation();
    }
  }
};
</script>

<style scoped>
fieldset { border:0; margin:0; padding:0; min-width:0; }
html[data-theme="clinical-night"] .patient-create-hero,
html[data-theme="clinical-night"] .patient-create-shell,
html[data-theme="clinical-night"] .patient-create-note { background:#1e293b; }
html[data-theme="clinical-night"] .patient-create-kicker,
html[data-theme="clinical-night"] .section-heading p,
html[data-theme="clinical-night"] .patient-create-note p { color:#7dd3fc; }
html[data-theme="clinical-night"] .patient-create-page ::v-deep .v-messages:not(.error--text) { color:#cbd5e1; }
html[data-theme="clinical-night"] .patient-create-page input[type="date"] { color-scheme:dark; }
html[data-theme="clinical-night"] .patient-create-hero h1,
html[data-theme="clinical-night"] .patient-create-hero p,
html[data-theme="clinical-night"] .section-heading span,
html[data-theme="clinical-night"] .patient-create-note span,
html[data-theme="clinical-night"] .patient-create-page > p { color:#e2e8f0; }
.patient-create-page {
  max-width: 76rem;
  margin: 4.5rem auto 2rem;
  padding: 0 1rem;
}

.patient-create-hero,
.patient-create-shell {
  border: 1px solid var(--color-primary-200);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.09);
}

.patient-create-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-radius: 14px;
  margin-bottom: 1rem;
}

.patient-create-kicker,
.section-heading p,
.patient-create-note p {
  margin: 0;
  color: var(--color-primary-900);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.patient-create-hero h1 {
  margin: 0.15rem 0;
  color: #0f172a;
  font-size: 1.55rem;
  font-weight: 600;
}

.patient-create-hero p,
.section-heading span,
.patient-create-note span {
  margin: 0;
  color: #52627a;
  font-size: 0.92rem;
}

.patient-create-shell {
  border-radius: 14px;
  overflow: hidden;
}

.patient-create-section {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2edf5;
}

.section-heading {
  margin-bottom: 1rem;
}

.patient-create-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem 1rem;
}

.patient-create-note {
  background: #f8fbfd;
}

.patient-create-error-summary { display: grid; gap: .4rem; padding: 1rem 1.5rem; color: #991b1b; background: #fff7ed; border-bottom: 1px solid #fed7aa; }
.patient-create-error-summary button { text-align: left; text-decoration: underline; }
.patient-create-error-summary button:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }

.patient-create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
}

.patient-create-primary,
.patient-create-secondary {
  min-height: 2.55rem;
  border-radius: 999px;
  padding: 0 1.15rem;
  font-weight: 600;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.patient-create-primary {
  color: white;
  background: var(--color-primary-700);
  box-shadow: 0 10px 20px rgba(14, 165, 190, 0.24);
}

.patient-create-secondary {
  color: var(--color-primary-900);
  border: 1px solid var(--color-primary-200);
  background: white;
}

.patient-create-primary:hover,
.patient-create-secondary:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
}

.patient-create-primary:disabled,
.patient-create-secondary:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

@media (max-width: 768px) {
  .patient-create-hero,
  .patient-create-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .patient-create-grid {
    grid-template-columns: 1fr;
  }
}
</style>
