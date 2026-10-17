<template>
  <div class="px-4 md:px-8 py-5">
    <div class="bg-white border border-primary-200 shadow-xl">
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 px-6 py-5 border-b border-primary-200 bg-primary-100">
        <div>
          <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Agenda clinica</p>
          <h2 class="m-0 text-gray-700 text-2xl font-normal">Gestion de citas</h2>
          <p class="m-0 mt-2 text-gray-500 text-sm">Consulta disponibilidad, bloqueos y citas de la semana.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <v-btn icon aria-label="Consultar semana anterior" @click="moveWeek(-7)">
            <v-icon color="#6B7280">mdi-chevron-left</v-icon>
          </v-btn>
          <v-text-field v-model="selectedDate" type="date" label="Semana" dense outlined hide-details :color="themePrimaryColor" class="w-44"></v-text-field>
          <v-btn icon aria-label="Consultar semana siguiente" @click="moveWeek(7)">
            <v-icon color="#6B7280">mdi-chevron-right</v-icon>
          </v-btn>
          <da-button-secondary @click.native="followUpDialog = true" :label="'Seguimientos'" rxl swpr class="py-1 px-3 font-light"></da-button-secondary>
          <da-button-primary :disabled="!selectedDoctorId || agendaLoading || !!agendaError" @click.native="openManualAppointment()" :label="'Nueva cita'" rxl swpr class="py-1 px-3 font-light"></da-button-primary>
        </div>
      </div>

      <div class="px-6 py-4 border-b border-gray-200">
        <v-select v-if="doctors.length || agendaLoading || agendaError" v-model="selectedDoctorId" :items="doctors" item-text="display_name" item-value="id_doctor_professional_profile" label="Agenda del doctor" no-data-text="No hay doctores con perfil activo" :readonly="doctors.length === 1" :disabled="agendaLoading" outlined dense :color="themePrimaryColor" @change="changeCalendarDoctor"></v-select>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <strong v-if="selectedDoctor" class="text-gray-700">{{ selectedDoctor.display_name }}</strong>
          <button v-if="canConfigureAgenda" type="button" class="text-primary-900 font-semibold" @click="agendaConfigDialog = true">Configurar agenda</button>
        </div>
        <p v-if="agendaLoading" role="status">Cargando disponibilidad del doctor…</p>
        <p v-if="agendaError" role="alert" class="text-red-700">{{ agendaError }} <button type="button" @click="doctors.length ? changeCalendarDoctor() : init()">Reintentar</button></p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="item in statusLegend"
            :key="item.status"
            class="inline-flex items-center gap-2 px-3 py-2 border text-sm"
            :style="legendStyle(item.status)"
          >
            <span class="w-3 h-3 rounded-full border" :style="dotStyle(item.status)"></span>
            {{ item.label }}
          </span>
        </div>
      </div>

      <section v-if="!agendaLoading && !agendaError && !doctors.length" class="agenda-setup-state" aria-labelledby="agenda-setup-title">
        <v-icon size="32">mdi-calendar-account-outline</v-icon>
        <div>
          <h3 id="agenda-setup-title">Prepara un doctor antes de agendar</h3>
          <p>Aún no hay doctores con perfil profesional activo en este consultorio. Primero completa el nombre y la cédula del doctor y verifica que su perfil esté activo. Después configura sus días y horarios de atención.</p>
          <div class="agenda-setup-actions">
            <router-link v-if="canCompleteOwnProfile" :to="{ path: '/admin', query: { section: 'doctor-identity', returnTo: '/px/dates' } }">Completar mi perfil profesional</router-link>
            <router-link v-if="canConfigureDoctors" :to="{ path: '/admin', query: { section: 'users', returnTo: '/px/dates' } }">Configurar doctores</router-link>
            <button type="button" :disabled="agendaLoading" @click="init">Ya lo configuré: actualizar doctores</button>
          </div>
          <p v-if="!canCompleteOwnProfile && !canConfigureDoctors">Pide al administrador que active el perfil del doctor y configure su agenda. Podrás crear citas cuando esté listo.</p>
        </div>
      </section>

      <div v-else-if="!agendaLoading && !agendaError && (!selectedDoctorId || !appointmentConfig.enabled || appointmentConfig.businessEnabled === false)" class="m-6 p-5 border border-gray-200 bg-gray-50 text-gray-600">
        {{ !selectedDoctorId ? 'Selecciona un doctor para consultar su disponibilidad.' : 'Esta agenda no esta disponible. Revisa su configuracion y los cierres del consultorio.' }}
      </div>

      <div v-else-if="!agendaLoading && !agendaError" class="p-4 overflow-x-auto" role="region" aria-label="Disponibilidad semanal" :aria-describedby="'agenda-week-description'" tabindex="0">
        <p id="agenda-week-description" class="sr-only" aria-live="polite">Agenda de {{ selectedDoctor && selectedDoctor.display_name }}. Semana del {{ formatDisplayDate(weekDates[0]) }} al {{ formatDisplayDate(weekDates[6]) }}. Cada horario indica su día, hora y estado.</p>
        <div class="agenda-grid min-w-agenda">
          <div class="sticky left-0 z-10 bg-white border-b border-r border-gray-200 py-3 px-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Hora</div>
          <div v-for="day in weekDates" :key="day" class="border-b border-gray-200 py-3 px-2 text-center">
            <p class="m-0 text-gray-700 font-semibold">{{ dayShortName(day) }}</p>
            <p class="m-0 text-gray-500 text-xs">{{ formatDisplayDate(day) }}</p>
          </div>

          <template v-for="time in weekTimes">
            <div :key="`time-${time}`" class="sticky left-0 z-10 bg-white border-r border-b border-gray-200 px-2 py-2 text-sm text-gray-500 font-semibold">
              {{ time }}
            </div>
            <button
              v-for="day in weekDates"
              :key="`${day}-${time}`"
              type="button"
              class="agenda-slot border-b border-r text-left p-2 focus:outline-none"
              :class="{ 'cursor-pointer': getSlot(day, time).selectable || getSlot(day, time).appointment, 'cursor-not-allowed': !getSlot(day, time).selectable && !getSlot(day, time).appointment }"
              :style="slotStyle(getSlot(day, time))"
              :aria-label="slotAccessibleName(day, getSlot(day, time))"
              :aria-disabled="String(!getSlot(day, time).selectable && !getSlot(day, time).appointment)"
              @click="onSlotClick(getSlot(day, time))"
            >
              <span class="block text-xs font-bold truncate">{{ slotTitle(getSlot(day, time)) }}</span>
              <span class="block text-xs truncate mt-1">{{ slotSubtitle(getSlot(day, time)) }}</span>
              <span v-if="getSlot(day, time).historicalAppointment" class="block text-xs mt-1 text-gray-500 truncate">
                {{ historicalLabel(getSlot(day, time).historicalAppointment) }}
              </span>
            </button>
          </template>
        </div>
      </div>
    </div>

    <v-dialog v-model="followUpDialog" max-width="1100">
      <v-card class="follow-up-card">
        <div class="follow-up-header">
          <div>
            <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Seguimiento</p>
            <h3 class="m-0 mt-1 text-gray-700 text-xl font-semibold">Pacientes por seguimiento</h3>
            <p class="m-0 mt-1 text-gray-500 text-sm">Lista de apoyo para contactar pacientes con proxima cita registrada en seguimiento.</p>
          </div>
          <v-btn icon aria-label="Cerrar pacientes por seguimiento" @click="followUpDialog = false">
            <v-icon color="#9CA3AF">mdi-close</v-icon>
          </v-btn>
        </div>
        <v-card-text class="follow-up-body">
          <div class="follow-up-search">
            <v-text-field
              v-model="followUpSearch"
              append-icon="mdi-magnify"
              label="Termino de busqueda"
              outlined
              dense
              hide-details
              :color="themePrimaryColor"
            ></v-text-field>
          </div>

          <div class="follow-up-table-shell">
            <div class="follow-up-table-scroll">
              <table class="follow-up-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Prox. Cita</th>
                    <th>Prox. Tratamiento</th>
                    <th>Telefono</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(patient, index) in filteredFollowUps" :key="followUpKey(patient, index)">
                    <td>
                      <span class="follow-up-name">{{ patient.name || 'Paciente' }}</span>
                    </td>
                    <td>{{ patient.quote_date_after || '-' }}</td>
                    <td>{{ patient.treatment_after || '-' }}</td>
                    <td>{{ patient.telephone || '-' }}</td>
                    <td>
                      <div class="follow-up-actions">
                        <button
                          v-if="canOpenFollowUpRecord(patient)"
                          type="button"
                          class="follow-up-record-button"
                          @click="openFollowUpRecord(patient)"
                        >
                          <v-icon size="17">mdi-folder-account-outline</v-icon>
                          <span>Expediente</span>
                        </button>
                        <button
                          type="button"
                          class="follow-up-contact-button"
                          :disabled="!patient.telephone"
                          @click="goTo(patient.telephone, patient.name, patient.quote_date_after)"
                        >
                          <span>Contactar</span>
                          <v-icon size="17">mdi-whatsapp</v-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="!filteredFollowUps.length" class="follow-up-empty">
              <v-icon size="26">mdi-account-search-outline</v-icon>
              <p>No se encontraron pacientes por seguimiento.</p>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="appointmentDialog" persistent max-width="720">
      <v-card>
        <div class="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200">
          <div>
            <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">{{ editingAppointment.id ? 'Detalle de cita' : 'Nueva cita' }}</p>
            <h3 class="m-0 mt-1 text-gray-700 text-xl font-semibold">{{ dialogTitle }}</h3>
          </div>
          <v-btn icon aria-label="Cerrar cita" @click="closeDialog()">
            <v-icon color="#9CA3AF">mdi-close</v-icon>
          </v-btn>
        </div>

        <v-card-text class="pt-5">
          <v-select v-model="editingAppointment.doctorProfileId" :items="doctors" item-text="display_name" item-value="id_doctor_professional_profile" label="Doctor que atendera *" :readonly="doctors.length === 1" outlined dense :color="themePrimaryColor" :disabled="dialogLoading || savingAppointment" @change="loadDialogDoctor(true)"></v-select>
          <p v-if="dialogLoading" role="status">Consultando horarios del doctor…</p>
          <p v-else-if="!dialogConfig.enabled || dialogConfig.businessEnabled === false" role="status" class="text-yellow-800">La agenda de este doctor no esta disponible. Revisa su configuracion o selecciona otro doctor.</p>
          <p v-else-if="!dialogAvailableTimes.length" role="status">No hay horarios disponibles en esta fecha. Selecciona otra fecha.</p>
          <p v-if="originalAppointment && originalAppointment.doctorProfileId !== editingAppointment.doctorProfileId" class="text-yellow-800">Cambiaste el doctor de esta cita. Revisa su nuevo horario antes de guardar.</p>
          <div v-if="isEditingCompletedAppointment" class="completed-appointment-alert">
            <v-icon size="22">mdi-alert-circle-outline</v-icon>
            <div>
              <strong>Cita completada</strong>
              <p>Los cambios a esta cita pueden alterar el historial clinico y operativo del paciente. Revisa antes de guardar.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <v-text-field v-model="editingAppointment.date" type="date" label="Fecha" outlined dense :color="themePrimaryColor" :disabled="dialogLoading || savingAppointment" @change="loadDialogDoctor(true)"></v-text-field>
            <v-select v-model="editingAppointment.startTime" :disabled="dialogLoading || savingAppointment" :items="dialogAvailableTimes" item-text="label" item-value="value" label="Hora" outlined dense :color="themePrimaryColor" @change="refreshDialogEndTime"></v-select>
            <v-text-field :value="editingAppointment.endTime" label="Fin" outlined dense readonly :color="themePrimaryColor" :disabled="savingAppointment"></v-text-field>
            <v-select v-model="editingAppointment.status" :items="appointmentStatusOptions" item-text="text" item-value="value" label="Estado" outlined dense :color="themePrimaryColor" @change="syncBlocksAvailability" :disabled="savingAppointment"></v-select>
          </div>

          <v-autocomplete
            v-model="editingAppointment.patientId"
            :items="patientOptions"
            :search-input.sync="patientSearchInput"
            :loading="patientSearchLoading"
            item-text="name"
            item-value="id"
            label="Paciente registrado (opcional)"
            :no-data-text="patientSearchNoDataText"
            no-filter
            clearable
            outlined
            dense
            :color="themePrimaryColor"
            class="mt-2"
            @update:search-input="onPatientSearchInput"
            @change="syncPatientName"
            @click:clear="clearSelectedPatient"
           :disabled="savingAppointment">
            <template #item="{ item }">
              <v-list-item-content>
                <v-list-item-title>{{ item.name }}</v-list-item-title>
                <v-list-item-subtitle v-if="item.meta">{{ item.meta }}</v-list-item-subtitle>
              </v-list-item-content>
            </template>
            <template #selection="{ item }">
              <span>{{ item.name }}</span>
            </template>
          </v-autocomplete>

          <v-text-field v-model="editingAppointment.patientName" label="Nombre del paciente" hint="Usa este campo si es paciente nuevo o no tiene expediente." persistent-hint outlined dense :color="themePrimaryColor" :disabled="savingAppointment"></v-text-field>
          <div class="appointment-contact-row">
            <div class="appointment-contact-control">
              <v-text-field
                v-model="editingAppointment.contactPhone"
                label="Telefono de contacto / WhatsApp"
                outlined
                dense
                maxlength="40"
                :color="themePrimaryColor"
                class="appointment-contact-field"
                hide-details
                @blur="normalizeAppointmentContactPhone"
               :disabled="savingAppointment"></v-text-field>
              <v-tooltip bottom>
                <template #activator="{ on, attrs }">
                  <span
                    class="appointment-whatsapp-trigger"
                    v-bind="attrs"
                    v-on="on"
                  >
                    <button
                      type="button"
                      class="appointment-whatsapp-button"
                      :class="{ disabled: !canOpenAppointmentWhatsApp }"
                      :disabled="!canOpenAppointmentWhatsApp"
                      @click="openAppointmentWhatsApp"
                    >
                      <v-icon size="20">mdi-whatsapp</v-icon>
                    </button>
                  </span>
                </template>
                <span>{{ appointmentWhatsAppTooltip }}</span>
              </v-tooltip>
            </div>
            <div class="appointment-contact-meta">
              <span>Se usara solo para confirmar o contactar esta cita.</span>
              <span>{{ contactPhoneCharacterCount }} / 40</span>
            </div>
          </div>
          <v-text-field v-model="editingAppointment.title" label="Motivo o titulo" outlined dense :color="themePrimaryColor" :disabled="savingAppointment"></v-text-field>
          <v-textarea v-model="editingAppointment.description" label="Descripcion" outlined dense :color="themePrimaryColor" rows="3" :disabled="savingAppointment"></v-textarea>
          <v-textarea v-if="editingAppointment.status === 'cancelled'" v-model="editingAppointment.cancellationReason" label="Motivo de cancelacion" outlined dense :color="themePrimaryColor" rows="2" :disabled="savingAppointment"></v-textarea>

          <p v-if="dialogError" class="text-red-600 font-semibold">{{ dialogError }}</p>
        </v-card-text>

        <v-card-actions class="appointment-dialog-actions px-6 pb-5 justify-end">
          <da-button-secondary @click.native="closeDialog()" :label="'Cerrar'" rxl swpr class="appointment-dialog-action py-1 px-4 font-light"></da-button-secondary>
          <da-button-900 v-if="editingAppointment.id" @click.native="cancelAppointment()" :label="'Cancelar cita'" rxl swpr class="appointment-dialog-action py-1 px-4 font-light"></da-button-900>
          <da-button-primary :disabled="dialogLoading || savingAppointment" @click.native="saveAppointment()" :label="savingAppointment ? 'Guardando…' : 'Guardar'" rxl swpr class="appointment-dialog-action py-1 px-4 font-light"></da-button-primary>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="completedEditConfirmDialog" max-width="520">
      <v-card class="completed-confirm-card">
        <div class="completed-confirm-header">
          <v-icon size="24">mdi-alert-circle-outline</v-icon>
          <div>
            <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Confirmar cambio</p>
            <h3 class="m-0 mt-1 text-gray-700 text-lg font-semibold">Esta cita ya estaba completada</h3>
          </div>
        </div>
        <div class="completed-confirm-body">
          <p>
            Modificar una cita completada puede cambiar el historial de atencion del paciente.
            Continua solo si estas corrigiendo un dato capturado por error.
          </p>
        </div>
        <v-card-actions class="completed-confirm-actions">
          <button type="button" class="completed-confirm-secondary" @click="dismissCompletedAppointmentEdit">
            Volver a revisar
          </button>
          <button type="button" class="completed-confirm-primary" @click="confirmCompletedAppointmentEdit">
            Continuar y guardar
          </button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="agendaConfigDialog" persistent max-width="1050" :fullscreen="$vuetify.breakpoint.xsOnly">
      <v-card class="agenda-config-card"><div class="p-3 text-right"><v-btn text @click="closeAgendaConfig">Cerrar configuracion</v-btn></div><professional-agenda-config v-if="agendaConfigDialog" ref="agendaEditor" class="agenda-config-editor" :initial-doctor-id="selectedDoctorId" :theme-color="themePrimaryColor" @saved="changeCalendarDoctor" @close="agendaConfigDialog = false" /></v-card>
    </v-dialog>
  </div>
</template>
 
<script>
import { mapActions, mapGetters } from 'vuex';
import VuexMixin from '../../mixins/VuexMixin';
import { getSettingsSections } from '../../security/settingsAccess';
import ProfessionalAgendaConfig from '../configuration/components/ProfessionalAgendaConfig.vue';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import { DAAppointmentService, DAPxService } from '../../services/context/core-proccess-context';
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_OPTIONS,
  WEEK_DAYS,
  appointmentBlocksAvailability,
  getAppointmentConfig,
  getAppointments,
  normalizeAppointmentConfig,
  saveAppointmentConfig
} from '../../domain/appointments/appointment.storage';
import {
  addDays,
  addMinutesToTime,
  formatDisplayDate,
  generateDaySlots,
  getWeekDates,
  toIsoDate,
  validateAppointmentSlot
} from '../../domain/appointments/availability';
import {
  buildAppointmentWhatsAppMessage,
  buildWhatsAppUrl,
  normalizePhoneForWhatsApp,
  openWhatsAppUrl
} from '../../utils/whatsapp';

const PATIENT_SEARCH_MIN_LENGTH = 2;
const PATIENT_SEARCH_LIMIT = 12;
const PATIENT_SEARCH_DEBOUNCE_MS = 220;
const PATIENT_SEARCH_CACHE_TTL_MS = 90000;
const PATIENT_SEARCH_CACHE_MAX_KEYS = 30;

const normalizePatientSearchText = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const normalizeAppointmentContactPhoneValue = (value) => String(value || '').trim();
const hasWhatsAppPhone = (value) => normalizePhoneForWhatsApp(value).length >= 7;

const getPatientDisplayName = (patient = {}) => {
  const fullName = `${patient.name || patient.firstName || ''} ${patient.surname || ''}`.trim();
  return patient.name_complete || patient.fullname || patient.fullName || fullName || 'Paciente';
}

const mapPatientSearchOption = (patient = {}) => {
  const telephone = patient.telephone || patient.phone || patient.mobilePhone || '';
  const localTelephone = patient.localTelephone || patient.local_telephone || '';
  const code = patient.code || patient.folio || '';
  const meta = [code ? `Codigo ${code}` : '', telephone || localTelephone, patient.age ? `${patient.age} años` : '']
    .filter((item) => item)
    .join(' | ');

  return {
    id: patient.id_person || patient.id || '',
    name: getPatientDisplayName(patient),
    telephone,
    localTelephone,
    code,
    age: patient.age || '',
    meta,
    raw: patient
  }
}

export default {
  components: { ProfessionalAgendaConfig },
  mixins: [VuexMixin],
  data: function() {
    return {
      selectedDate: toIsoDate(new Date()),
      doctors: [], selectedDoctorId: '', agendaLoading: false, agendaError: '', agendaRequest: 0,
      dialogConfig: getAppointmentConfig(), dialogAppointments: [], dialogLoading: false, dialogRequest: 0,
      savingAppointment: false, agendaConfigDialog: false,
      appointmentConfig: getAppointmentConfig(),
      appointments: getAppointments(),
      appointmentDialog: false,
      followUpDialog: false,
      completedEditConfirmDialog: false,
      completedEditAcknowledged: false,
      completedEditPendingAction: '',
      dialogError: '',
      editingAppointment: {},
      originalAppointment: null,
      patientSearchInput: '',
      patientSearchResults: [],
      patientSearchLoading: false,
      patientSearchError: false,
      patientSearchTimer: null,
      patientSearchRequestId: 0,
      patientSearchAbortController: null,
      patientSearchCache: Object.create(null),
      followUpSearch: '',
      statusLegend: [
        { status: APPOINTMENT_STATUSES.AVAILABLE, label: 'Disponible' },
        { status: APPOINTMENT_STATUSES.BLOCKED, label: 'Bloqueado' },
        { status: APPOINTMENT_STATUSES.PENDING, label: 'Pendiente' },
        { status: APPOINTMENT_STATUSES.CONFIRMED, label: 'Confirmada' },
        { status: APPOINTMENT_STATUSES.COMPLETED, label: 'Completada' },
        { status: APPOINTMENT_STATUSES.CANCELLED, label: 'Cancelada' },
        { status: APPOINTMENT_STATUSES.RESCHEDULED, label: 'Reprogramada' },
        { status: APPOINTMENT_STATUSES.NO_SHOW, label: 'No asistio' }
      ],
      appointmentStatusOptions: APPOINTMENT_STATUS_OPTIONS
    }
  },
  created() {
    this.init()
  },
  beforeDestroy() {
    this.cancelPatientSearch()
    this.clearPatientSearchTimer()
  },
  computed: {
    ...mapGetters(moduleTypes.MONITORING, {
      allMonitorings: fnTypes.getAllTracing
    }),
    ...mapGetters(moduleTypes.AUTH, {
      hasPermission: fnTypes.hasPermission,
      authUser: fnTypes.getUser,
      role: fnTypes.getRole
    }),

    selectedDoctor() { return this.doctors.find(d => d.id_doctor_professional_profile === this.selectedDoctorId); },
    canConfigureAgenda() { return this.hasPermission('admin.config') || this.doctors.some(d => d.id_login === (this.authUser || {}).id_login); },
    canCompleteOwnProfile() { return getSettingsSections(this.role, this.hasPermission).some(section => section.key === 'doctor-identity'); },
    canConfigureDoctors() { return getSettingsSections(this.role, this.hasPermission).some(section => section.key === 'users'); },

    weekDates: function() {
      return getWeekDates(this.selectedDate)
    },

    weekSlots: function() {
      const slots = {}
      this.weekDates.forEach((date) => {
        slots[date] = generateDaySlots(date, this.appointmentConfig, this.appointments)
      })
      return slots
    },

    weekTimes: function() {
      const times = []
      this.weekDates.forEach((date) => {
        const daySlots = this.weekSlots[date] || []
        daySlots.forEach((slot) => {
          if(!times.includes(slot.startTime)) {
            times.push(slot.startTime)
          }
        })
      })
      return times.sort()
    },

    selectedPatientOption: function() {
      const selectedId = this.editingAppointment && this.editingAppointment.patientId
        ? this.editingAppointment.patientId
        : ''

      if(!selectedId) {
        return null
      }

      const found = (this.patientSearchResults || []).find((patient) => patient.id === selectedId)
      if(found) {
        return found
      }

      return {
        id: selectedId,
        name: this.editingAppointment.patientName || 'Paciente seleccionado',
        telephone: this.editingAppointment.contactPhone || '',
        localTelephone: '',
        code: '',
        age: '',
        meta: ''
      }
    },

    patientOptions: function() {
      const patients = this.selectedPatientOption
        ? [this.selectedPatientOption, ...this.patientSearchResults]
        : this.patientSearchResults

      const unique = []
      patients.forEach((patient) => {
        if(patient.id && !unique.find((item) => item.id === patient.id)) {
          unique.push(patient)
        }
      })
      return unique
    },

    patientSearchNoDataText: function() {
      const query = normalizePatientSearchText(this.patientSearchInput)

      if(this.patientSearchLoading) {
        return 'Buscando pacientes...'
      }

      if(this.patientSearchError) {
        return 'No se pudo buscar pacientes. Intenta de nuevo.'
      }

      if(!query) {
        return 'Escribe para buscar pacientes'
      }

      if(query.length < PATIENT_SEARCH_MIN_LENGTH) {
        return 'Escribe al menos 2 caracteres'
      }

      return 'Sin coincidencias'
    },

    filteredFollowUps: function() {
      const query = normalizePatientSearchText(this.followUpSearch).toLowerCase()
      const rows = this.allMonitorings || []

      if(!query) {
        return rows
      }

      return rows.filter((patient) => [
        patient.name,
        patient.quote_date_after,
        patient.treatment_after,
        patient.telephone
      ].some((value) => String(value || '').toLowerCase().includes(query)))
    },

    canOpenPatientRecords: function() {
      return typeof this.hasPermission === 'function' && this.hasPermission('px.all')
    },

    isEditingCompletedAppointment: function() {
      return Boolean(
        this.originalAppointment
        && this.originalAppointment.id
        && this.originalAppointment.status === APPOINTMENT_STATUSES.COMPLETED
      )
    },

    dialogTitle: function() {
      if(!this.editingAppointment.date || !this.editingAppointment.startTime) {
        return 'Selecciona fecha y hora'
      }
      return `${formatDisplayDate(this.editingAppointment.date)} ${this.editingAppointment.startTime}`
    },

    dialogAvailableTimes: function() {
      const appointments = this.dialogAppointments.filter((appointment) => appointment.id !== this.editingAppointment.id)
      const slots = generateDaySlots(this.editingAppointment.date, this.dialogConfig, appointments)
      const currentTime = this.editingAppointment.startTime
      const options = slots
        .filter((slot) => slot.selectable || slot.startTime === currentTime)
        .map((slot) => ({ value: slot.startTime, label: `${slot.startTime} - ${slot.endTime}` }))

      return options
    },

    manualContactPhoneRequired: function() {
      return Boolean(
        this.editingAppointment
        && !this.editingAppointment.id
        && !this.editingAppointment.patientId
      )
    },

    canOpenAppointmentWhatsApp: function() {
      return hasWhatsAppPhone(this.editingAppointment ? this.editingAppointment.contactPhone : '')
    },

    contactPhoneCharacterCount: function() {
      return String(this.editingAppointment && this.editingAppointment.contactPhone || '').length
    },

    appointmentWhatsAppTooltip: function() {
      return this.canOpenAppointmentWhatsApp
        ? 'Contactar por WhatsApp'
        : 'Captura un telefono de contacto valido'
    },

    themePrimaryColor: function() {
      return 'var(--color-primary-700)'
    }
  },
  methods: {
    formatDisplayDate,
    ...mapActions(moduleTypes.MONITORING, [
      fnTypes.getAllTracing
    ]),

    clearPatientSearchTimer: function() {
      if(this.patientSearchTimer) {
        clearTimeout(this.patientSearchTimer)
        this.patientSearchTimer = null
      }
    },

    cancelPatientSearch: function() {
      this.patientSearchRequestId += 1
      if(this.patientSearchAbortController) {
        this.patientSearchAbortController.abort()
        this.patientSearchAbortController = null
      }
      this.patientSearchLoading = false
    },

    resetPatientSearchState: function() {
      this.clearPatientSearchTimer()
      this.cancelPatientSearch()
      this.patientSearchInput = ''
      this.patientSearchResults = []
      this.patientSearchError = false
    },

    getCachedPatientSearch: function(query) {
      const key = query.toLowerCase()
      const cached = this.patientSearchCache[key]

      if(!cached) {
        return null
      }

      if(Date.now() - cached.createdAt > PATIENT_SEARCH_CACHE_TTL_MS) {
        delete this.patientSearchCache[key]
        return null
      }

      return cached.items
    },

    cachePatientSearch: function(query, items) {
      const key = query.toLowerCase()
      this.patientSearchCache[key] = {
        createdAt: Date.now(),
        items: items || []
      }
      this.prunePatientSearchCache()
    },

    prunePatientSearchCache: function() {
      const keys = Object.keys(this.patientSearchCache)

      if(keys.length <= PATIENT_SEARCH_CACHE_MAX_KEYS) {
        return
      }

      keys
        .sort((left, right) => this.patientSearchCache[left].createdAt - this.patientSearchCache[right].createdAt)
        .slice(0, keys.length - PATIENT_SEARCH_CACHE_MAX_KEYS)
        .forEach((key) => {
          delete this.patientSearchCache[key]
        })
    },

    onPatientSearchInput: function(value) {
      const query = normalizePatientSearchText(value)
      const selectedName = this.selectedPatientOption
        ? normalizePatientSearchText(this.selectedPatientOption.name)
        : ''

      this.clearPatientSearchTimer()
      this.cancelPatientSearch()
      this.patientSearchError = false

      if(this.editingAppointment.patientId && query && selectedName && query === selectedName) {
        return
      }

      if(!query) {
        return
      }

      if(query.length < PATIENT_SEARCH_MIN_LENGTH) {
        this.patientSearchResults = []
        return
      }

      const cachedItems = this.getCachedPatientSearch(query)
      if(cachedItems) {
        this.patientSearchResults = cachedItems
        return
      }

      const requestId = this.patientSearchRequestId
      this.patientSearchLoading = true
      this.patientSearchTimer = setTimeout(() => {
        this.fetchPatientSearch(query, requestId)
      }, PATIENT_SEARCH_DEBOUNCE_MS)
    },

    fetchPatientSearch: async function(query, requestId) {
      if(requestId !== this.patientSearchRequestId) {
        return
      }

      let abortController = null
      let requestConfig = {}

      if(typeof AbortController !== 'undefined') {
        abortController = new AbortController()
        this.patientSearchAbortController = abortController
        requestConfig = { signal: abortController.signal }
      }

      try {
        const response = await DAPxService.searchFast({
          query,
          limit: PATIENT_SEARCH_LIMIT
        }, requestConfig)

        if(requestId !== this.patientSearchRequestId) {
          return
        }

        if(response && response.success) {
          const items = (response.data || [])
            .map(mapPatientSearchOption)
            .filter((patient) => patient.id)

          this.patientSearchResults = items
          this.cachePatientSearch(query, items)
          this.patientSearchError = false
        }
        else {
          this.patientSearchResults = []
          this.patientSearchError = true
        }
      }
      catch(error) {
        if(requestId === this.patientSearchRequestId) {
          this.patientSearchResults = []
          this.patientSearchError = true
        }
      }
      finally {
        if(requestId === this.patientSearchRequestId) {
          this.patientSearchLoading = false
        }

        if(this.patientSearchAbortController === abortController) {
          this.patientSearchAbortController = null
        }
      }
    },

    clearSelectedPatient: function() {
      this.editingAppointment.patientId = ''
      this.patientSearchInput = ''
      this.patientSearchResults = []
      this.patientSearchError = false
      this.clearPatientSearchTimer()
      this.cancelPatientSearch()
    },

    init: async function() {
      this.agendaLoading = true; this.agendaError = ''
      try {
      const response = await DAAppointmentService.doctors()
      if(!response.success) { this.agendaError = response.message || 'No se pudieron cargar los doctores.'; return }
      this.doctors = response.data || []
      const own = this.doctors.find(d => d.id_login === (this.authUser || {}).id_login)
      this.selectedDoctorId = own ? own.id_doctor_professional_profile : this.doctors.length === 1 ? this.doctors[0].id_doctor_professional_profile : ''
      if(this.selectedDoctorId) await this.changeCalendarDoctor()
      await this.onSearch()
      } catch(error) { this.agendaError = 'No se pudieron cargar los doctores. Reintenta.' }
      finally { this.agendaLoading = false }
    },

    async changeCalendarDoctor() {
      if(!this.selectedDoctorId) return
      const request = ++this.agendaRequest
      this.agendaLoading = true; this.agendaError = ''; this.appointments = []; this.appointmentConfig = getAppointmentConfig()
      try {
        const [config, appointments] = await Promise.all([DAAppointmentService.getConfig(this.selectedDoctorId), DAAppointmentService.list({doctor_profile_id:this.selectedDoctorId,date_from:this.weekDates[0],date_to:this.weekDates[6]})])
        if(request !== this.agendaRequest) return
        if(!config.success || !appointments.success) throw new Error(config.message || appointments.message || 'No se pudo cargar esta agenda.')
        if(config.data.doctorProfileId !== this.selectedDoctorId) throw new Error('La agenda recibida no corresponde al doctor seleccionado.')
        this.appointmentConfig = normalizeAppointmentConfig(config.data); this.appointments = appointments.data || []
      } catch(error) { if(request === this.agendaRequest) this.agendaError = error.message }
      finally { if(request === this.agendaRequest) this.agendaLoading = false }
    },

    async closeAgendaConfig() {
      if(this.$refs.agendaEditor && this.$refs.agendaEditor.dirty) { this.$refs.agendaEditor.pending = '__close__'; this.$refs.agendaEditor.leaveOpen = true; return }
      this.agendaConfigDialog = false
      await this.changeCalendarDoctor()
    },

    async loadDialogDoctor(clearTime = false) {
      const request = ++this.dialogRequest
      if(clearTime) { this.editingAppointment.startTime = ''; this.editingAppointment.endTime = '' }
      this.dialogLoading = true; this.dialogError = ''; this.dialogConfig = getAppointmentConfig(); this.dialogAppointments = []
      try {
        const id = this.editingAppointment.doctorProfileId
        const [config, appointments] = await Promise.all([DAAppointmentService.getConfig(id), DAAppointmentService.list({doctor_profile_id:id,date_from:this.editingAppointment.date,date_to:this.editingAppointment.date})])
        if(request !== this.dialogRequest) return
        if(!config.success || !appointments.success) throw new Error(config.message || appointments.message || 'No se pudo consultar disponibilidad.')
        if(config.data.doctorProfileId !== id) throw new Error('La agenda recibida no corresponde al doctor seleccionado.')
        this.dialogConfig = normalizeAppointmentConfig(config.data); this.dialogAppointments = appointments.data || []
      } catch(error) { if(request === this.dialogRequest) this.dialogError = error.message }
      finally { if(request === this.dialogRequest) this.dialogLoading = false }
    },

    onSearch: async function() {
      await this.getAllTracing()
    },

    loadAppointmentConfig: async function() {
      const response = await DAAppointmentService.getConfig(this.selectedDoctorId)
      if(response && response.success && response.data) {
        this.appointmentConfig = normalizeAppointmentConfig(response.data)
        saveAppointmentConfig(this.appointmentConfig)
      }
    },

    reloadAppointments: async function() {
      const response = await DAAppointmentService.list({
        doctor_profile_id: this.selectedDoctorId,
        date_from: this.weekDates[0],
        date_to: this.weekDates[this.weekDates.length - 1]
      })

      if(response && response.success) {
        this.appointments = response.data || []
      }
      else {
        this.appointments = []
        this.agendaError = response && response.message || 'No se pudieron cargar las citas.'
      }
    },

    getSlot: function(day, time) {
      const foundSlot = (this.weekSlots[day] || []).find((slot) => slot.startTime === time)
      return foundSlot || {
        date: day,
        startTime: time,
        endTime: addMinutesToTime(time, this.appointmentConfig.defaultAppointmentDuration || 30),
        status: APPOINTMENT_STATUSES.OUTSIDE_WORKING_HOURS,
        selectable: false
      }
    },

    onSlotClick: function(slot) {
      if(slot.appointment) {
        this.openAppointment(slot.appointment)
        return
      }

      if(!slot.selectable) {
        return
      }

      this.openAppointment({
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: APPOINTMENT_STATUSES.PENDING,
        source: 'calendar',
        title: 'Nueva cita',
        description: '',
        patientId: '',
        patientName: '',
        contactPhone: ''
      })
    },

    openManualAppointment: function() {
      const firstSlot = this.weekDates
        .filter(date => date >= this.selectedDate)
        .map((date) => generateDaySlots(date, this.appointmentConfig, this.appointments).find((slot) => slot.selectable))
        .find((slot) => slot)

      this.openAppointment({
        date: firstSlot ? firstSlot.date : this.selectedDate,
        startTime: firstSlot ? firstSlot.startTime : '08:00',
        endTime: firstSlot ? firstSlot.endTime : addMinutesToTime('08:00', this.appointmentConfig.defaultAppointmentDuration || 30),
        status: APPOINTMENT_STATUSES.PENDING,
        source: 'calendar',
        title: 'Nueva cita',
        description: '',
        patientId: '',
        patientName: '',
        contactPhone: ''
      })
    },

    openAppointment: function(appointment) {
      this.dialogError = ''
      this.editingAppointment = Object.assign({}, appointment, {
        doctorProfileId: appointment.doctorProfileId || this.selectedDoctorId,
        contactPhone: normalizeAppointmentContactPhoneValue(appointment && (appointment.contactPhone || appointment.contact_phone))
      })
      this.originalAppointment = appointment && appointment.id ? Object.assign({}, appointment) : null
      this.completedEditAcknowledged = false
      this.completedEditPendingAction = ''
      this.completedEditConfirmDialog = false
      this.resetPatientSearchState()
      this.refreshDialogEndTime()
      this.appointmentDialog = true
      this.dialogConfig = this.appointmentConfig
      this.dialogAppointments = this.appointments
      this.loadDialogDoctor()
    },

    closeDialog: function() {
      if(this.savingAppointment) return
      this.dialogRequest++
      this.appointmentDialog = false
      this.dialogError = ''
      this.editingAppointment = {}
      this.originalAppointment = null
      this.completedEditAcknowledged = false
      this.completedEditPendingAction = ''
      this.completedEditConfirmDialog = false
      this.resetPatientSearchState()
    },

    hasAppointmentTimeChanged: function() {
      if(!this.originalAppointment || !this.editingAppointment.id) {
        return false
      }

      return toIsoDate(this.originalAppointment.date) !== toIsoDate(this.editingAppointment.date)
        || this.originalAppointment.startTime !== this.editingAppointment.startTime
        || this.originalAppointment.endTime !== this.editingAppointment.endTime
    },

    shouldCreateRescheduledAppointment: function() {
      return this.editingAppointment.id
        && this.originalAppointment
        && this.editingAppointment.status === APPOINTMENT_STATUSES.RESCHEDULED
        && this.hasAppointmentTimeChanged()
    },

    shouldConfirmCompletedAppointmentEdit: function() {
      return this.isEditingCompletedAppointment && !this.completedEditAcknowledged
    },

    dismissCompletedAppointmentEdit: function() {
      this.completedEditConfirmDialog = false
      this.completedEditPendingAction = ''
    },

    confirmCompletedAppointmentEdit: async function() {
      const action = this.completedEditPendingAction || 'save'
      this.completedEditAcknowledged = true
      this.completedEditConfirmDialog = false
      this.completedEditPendingAction = ''

      if(action === 'cancel') {
        await this.cancelAppointment()
        return
      }

      await this.saveAppointment()
    },

    saveRescheduledAppointment: async function() {
      const appointmentsToValidate = this.dialogAppointments.filter((appointment) => appointment.id !== this.editingAppointment.id)
      const newAppointment = Object.assign({}, this.editingAppointment, {
        id: undefined,
        status: APPOINTMENT_STATUSES.PENDING,
        date: toIsoDate(this.editingAppointment.date),
        blocksAvailability: appointmentBlocksAvailability(APPOINTMENT_STATUSES.PENDING),
        rescheduledFromAppointmentId: this.editingAppointment.id
      })

      newAppointment.contactPhone = normalizeAppointmentContactPhoneValue(newAppointment.contactPhone)
      if(!newAppointment.patientId && !newAppointment.contactPhone) {
        this.dialogError = 'Captura el telefono de contacto para crear la cita reagendada.'
        return
      }

      const validation = validateAppointmentSlot(newAppointment, this.dialogConfig, appointmentsToValidate)

      if(!validation.valid) {
        this.dialogError = validation.message
        return
      }

      const createResponse = await DAAppointmentService.save(newAppointment)
      if(!createResponse || !createResponse.success) {
        this.dialogError = createResponse && createResponse.message ? createResponse.message : 'No se pudo crear la nueva cita reagendada.'
        return
      }

      const created = Array.isArray(createResponse.data) ? createResponse.data[0] : createResponse.data
      const oldAppointment = Object.assign({}, this.originalAppointment, {
        status: APPOINTMENT_STATUSES.RESCHEDULED,
        blocksAvailability: false,
        rescheduledToAppointmentId: created && created.id ? created.id : ''
      })
      const updateResponse = await DAAppointmentService.save(oldAppointment)

      if(!updateResponse || !updateResponse.success) {
        this.dialogError = updateResponse && updateResponse.message ? updateResponse.message : 'La nueva cita se creo, pero no se pudo marcar la anterior como reagendada.'
        await this.reloadAppointments()
        return
      }

      await this.reloadAppointments()
      this.closeDialog()
    },

    saveAppointment: async function() {
      if(this.dialogLoading || this.savingAppointment) return
      if(!this.editingAppointment.doctorProfileId) { this.dialogError = 'Selecciona el doctor que atendera.'; return }
      if(!this.editingAppointment.date || !this.editingAppointment.startTime) {
        this.dialogError = 'Selecciona fecha y hora.'
        return
      }

      if(!this.editingAppointment.patientId && !this.editingAppointment.patientName) {
        this.dialogError = 'Selecciona o captura el paciente.'
        return
      }

      this.normalizeAppointmentContactPhone()
      if(this.manualContactPhoneRequired && !this.editingAppointment.contactPhone) {
        this.dialogError = 'Captura el telefono de contacto para esta cita.'
        return
      }

      if(this.shouldConfirmCompletedAppointmentEdit()) {
        this.completedEditPendingAction = 'save'
        this.completedEditConfirmDialog = true
        return
      }

      if(this.shouldCreateRescheduledAppointment()) {
        await this.saveRescheduledAppointment()
        return
      }

      const appointmentsToValidate = this.dialogAppointments.filter((appointment) => appointment.id !== this.editingAppointment.id)
      const validation = validateAppointmentSlot(this.editingAppointment, this.dialogConfig, appointmentsToValidate)
      if(!validation.valid && appointmentBlocksAvailability(this.editingAppointment.status)) {
        this.dialogError = validation.message
        return
      }

      const normalizedPatientId = this.editingAppointment.patientId || null
      const normalizedFollowUpId = this.editingAppointment.source === 'follow_up'
        ? this.editingAppointment.followUpId
        : null

      this.savingAppointment = true
      let response
      try { response = await DAAppointmentService.save(Object.assign({}, this.editingAppointment, {
        patientId: normalizedPatientId,
        followUpId: normalizedFollowUpId,
        contactPhone: this.editingAppointment.contactPhone || null,
        date: toIsoDate(this.editingAppointment.date),
        blocksAvailability: appointmentBlocksAvailability(this.editingAppointment.status)
      })) } catch(error) { this.dialogError = 'No se pudo guardar. Tu captura se conservo; reintenta.'; return }
      finally { this.savingAppointment = false }

      if(!response || !response.success) {
        this.dialogError = response && response.message ? response.message : 'No se pudo guardar la cita.'
        return
      }

      await this.reloadAppointments()
      this.closeDialog()
    },

    cancelAppointment: async function() {
      if(this.shouldConfirmCompletedAppointmentEdit()) {
        this.completedEditPendingAction = 'cancel'
        this.completedEditConfirmDialog = true
        return
      }

      this.editingAppointment.status = APPOINTMENT_STATUSES.CANCELLED
      this.editingAppointment.blocksAvailability = false
      await this.saveAppointment()
    },

    refreshDialogEndTime: function() {
      if(this.editingAppointment.startTime) {
        this.editingAppointment.endTime = addMinutesToTime(this.editingAppointment.startTime, this.dialogConfig.defaultAppointmentDuration || 30)
      }
    },

    syncBlocksAvailability: function() {
      this.editingAppointment.blocksAvailability = appointmentBlocksAvailability(this.editingAppointment.status)
    },

    syncPatientName: function(patientId) {
      const selectedId = patientId || this.editingAppointment.patientId
      if(!selectedId) {
        return
      }

      const patient = this.patientOptions.find((item) => item.id === selectedId)
      if(patient) {
        this.editingAppointment.patientName = patient.name
        this.editingAppointment.contactPhone = normalizeAppointmentContactPhoneValue(patient.telephone || patient.localTelephone || this.editingAppointment.contactPhone)
      }
    },

    normalizeAppointmentContactPhone: function() {
      this.editingAppointment.contactPhone = normalizeAppointmentContactPhoneValue(this.editingAppointment.contactPhone)
    },

    openAppointmentWhatsApp: function() {
      this.normalizeAppointmentContactPhone()

      if(!this.canOpenAppointmentWhatsApp) {
        this.dialogError = 'Captura un telefono valido para contactar por WhatsApp.'
        return
      }

      const message = buildAppointmentWhatsAppMessage({
        patientName: this.editingAppointment.patientName,
        date: formatDisplayDate(this.editingAppointment.date),
        time: this.editingAppointment.startTime
      })
      const url = buildWhatsAppUrl({
        phone: this.editingAppointment.contactPhone,
        text: message
      })
      openWhatsAppUrl(url)
    },

    moveWeek: function(days) {
      this.selectedDate = addDays(this.selectedDate, days)
      this.reloadAppointments()
    },

    dayShortName: function(date) {
      const dayOfWeek = new Date(`${date}T00:00:00`).getDay()
      const day = WEEK_DAYS.find((item) => Number(item.value) === Number(dayOfWeek))
      return day ? day.short : ''
    },

    slotAccessibleName(day, slot) {
      const weekday = new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(new Date(`${day}T12:00:00`))
      const date = `${weekday} ${formatDisplayDate(day)}`
      const status = APPOINTMENT_STATUS_LABELS[slot.status] || 'Horario'
      const detail = slot.appointment ? this.slotTitle(slot) : slot.reason
      return [date, `${slot.startTime} a ${slot.endTime}`, status, detail].filter(Boolean).join(', ')
    },

    slotTitle: function(slot) {
      if(slot.appointment) {
        return slot.appointment.patientName || slot.appointment.title || APPOINTMENT_STATUS_LABELS[slot.status]
      }

      return APPOINTMENT_STATUS_LABELS[slot.status] || 'Horario'
    },

    slotSubtitle: function(slot) {
      if(slot.appointment) {
        return slot.appointment.title || APPOINTMENT_STATUS_LABELS[slot.status]
      }

      if(slot.reason) {
        return slot.reason
      }

      return `${slot.startTime} - ${slot.endTime}`
    },

    historicalLabel: function(appointment) {
      const labels = {
        [APPOINTMENT_STATUSES.CANCELLED]: 'Historial: cancelada',
        [APPOINTMENT_STATUSES.RESCHEDULED]: 'Historial: reprogramada',
        [APPOINTMENT_STATUSES.COMPLETED]: 'Historial: completada',
        [APPOINTMENT_STATUSES.NO_SHOW]: 'Historial: no asistio'
      }

      return labels[appointment.status] || 'Historial'
    },

    slotStyle: function(slot) {
      const colors = APPOINTMENT_STATUS_COLORS[slot.status] || APPOINTMENT_STATUS_COLORS[APPOINTMENT_STATUSES.BLOCKED]
      return `background:${colors.bg};color:${colors.text};border-color:${colors.border};`
    },

    legendStyle: function(status) {
      const colors = APPOINTMENT_STATUS_COLORS[status]
      return `background:${colors.bg};color:${colors.text};border-color:${colors.border};`
    },

    dotStyle: function(status) {
      const colors = APPOINTMENT_STATUS_COLORS[status]
      return `background:${colors.text};border-color:${colors.border};`
    },

    followUpKey: function(patient, index) {
      return [
        patient.id_tracing,
        patient.id_person,
        patient.telephone,
        patient.quote_date_after,
        patient.name,
        index
      ].filter((item) => item).join('-')
    },

    followUpPatientId: function(patient) {
      return patient ? (patient.id_person || patient.patientId || patient.id || '') : ''
    },

    canOpenFollowUpRecord: function(patient) {
      return this.canOpenPatientRecords && Boolean(this.followUpPatientId(patient))
    },

    openFollowUpRecord: function(patient) {
      if(!this.canOpenFollowUpRecord(patient)) {
        return
      }

      this.followUpDialog = false
      this.$router.push(`/px/history/${this.followUpPatientId(patient)}`).catch(() => {})
    },

    goTo(phone,nombre,fecha){
      const message = buildAppointmentWhatsAppMessage({
        patientName: nombre,
        date: fecha
      })
      const url = buildWhatsAppUrl({ phone, text: message })
      openWhatsAppUrl(url)
    }
  },
  watch: {
    selectedDate: function() {
      this.changeCalendarDoctor()
    },
    followUpDialog: function(value) {
      if(value) {
        this.followUpSearch = ''
      }
    }
  }
}
</script>

<style scoped>
.agenda-setup-state { display: flex; align-items: flex-start; gap: 14px; margin: 24px; padding: 20px; border: 1px solid var(--color-primary-200, #b8edf7); border-radius: 12px; color: var(--color-text, #25364d); background: var(--color-primary-50, #effbfe); }
.agenda-setup-state > .v-icon { color: var(--color-primary-700, #0e7490); flex-shrink: 0; }
.agenda-setup-state h3 { margin: 0 0 8px; font-size: 1.05rem; font-weight: 700; }
.agenda-setup-state p { margin: 0 0 12px; line-height: 1.6; font-size: .88rem; }
.agenda-setup-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
.agenda-setup-actions a, .agenda-setup-actions button { display: inline-flex; align-items: center; min-height: 40px; padding: 9px 12px; border: 1px solid var(--color-primary-200, #b8edf7); border-radius: 8px; font-weight: 600; font-size: .82rem; color: var(--color-primary-900, #086783); background: var(--color-surface, #fff); }
.agenda-slot:focus-visible, .agenda-setup-actions a:focus-visible, .agenda-setup-actions button:focus-visible { outline: 3px solid var(--color-primary-500, #0e7490); outline-offset: -3px; }
@media (max-width: 600px) { .agenda-setup-state { margin: 16px; padding: 16px; flex-direction: column; } .agenda-setup-actions { flex-direction: column; } }
.agenda-config-card{max-height:90vh;display:flex;flex-direction:column}.agenda-config-card>div{flex-shrink:0}.agenda-config-editor{overflow-y:auto;min-height:0}.agenda-config-card .agenda-config-editor{flex:1}
.follow-up-card {
  border-radius: 8px;
  overflow: hidden;
}

.follow-up-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem 1.5rem 1.25rem;
  border-bottom: 1px solid #e5eef1;
  background: linear-gradient(180deg, #ffffff 0%, #fbfefe 100%);
}

.follow-up-body {
  padding: 1.35rem 1.5rem 1.5rem !important;
}

.follow-up-search {
  max-width: 28rem;
  margin-bottom: 1rem;
}

.follow-up-table-shell {
  border: 1px solid #dcebed;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.follow-up-table-scroll {
  width: 100%;
  max-height: min(56vh, 35rem);
  overflow-x: auto;
  overflow-y: auto;
}

.follow-up-table {
  width: 100%;
  min-width: 790px;
  border-collapse: separate;
  border-spacing: 0;
  color: #334155;
  font-size: 0.88rem;
}

.follow-up-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0.82rem 1rem;
  border-bottom: 1px solid #dcebed;
  color: #0f766e;
  background: #f1fbfa;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0;
  text-align: left;
  white-space: nowrap;
}

.follow-up-table th:last-child {
  text-align: center;
}

.follow-up-table td {
  padding: 0.9rem 1rem;
  border-bottom: 1px solid #edf4f5;
  background: #ffffff;
  vertical-align: middle;
}

.follow-up-table tbody tr:last-child td {
  border-bottom: 0;
}

.follow-up-table tbody tr:hover td {
  background: #fbfefe;
}

.follow-up-name {
  display: block;
  color: #12313a;
  font-weight: 800;
}

.follow-up-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.follow-up-record-button,
.follow-up-contact-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-width: 8.5rem;
  min-height: 2.15rem;
  padding: 0 0.85rem;
  border: 1px solid #b7e4df;
  border-radius: 8px;
  color: #0f766e;
  background: #f0fdfa;
  font-size: 0.82rem;
  font-weight: 900;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.follow-up-record-button {
  color: #0f766e;
  background: #ffffff;
}

.follow-up-record-button .v-icon,
.follow-up-contact-button .v-icon {
  color: currentColor;
}

.follow-up-record-button:not(:disabled):hover,
.follow-up-record-button:not(:disabled):focus,
.follow-up-contact-button:not(:disabled):hover,
.follow-up-contact-button:not(:disabled):focus {
  border-color: #0f766e;
  color: #ffffff;
  background: #0f766e;
  outline: none;
  transform: translateY(-1px);
}

.follow-up-contact-button:disabled {
  border-color: #d5d9de;
  color: #94a3b8;
  background: #f8fafc;
  cursor: not-allowed;
}

.follow-up-empty {
  display: grid;
  place-items: center;
  gap: 0.35rem;
  min-height: 8rem;
  padding: 1.25rem;
  border-top: 1px solid #edf4f5;
  color: #64748b;
  text-align: center;
}

.follow-up-empty .v-icon {
  color: #0f766e;
}

.follow-up-empty p {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
}

.completed-appointment-alert {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid #fde3bd;
  border-radius: 8px;
  color: #6f4b12;
  background: #fffaf0;
}

.completed-appointment-alert .v-icon {
  color: #b7791f;
}

.completed-appointment-alert strong {
  display: block;
  color: #4f4634;
  font-size: 0.9rem;
  font-weight: 900;
}

.completed-appointment-alert p {
  margin: 0.15rem 0 0;
  color: #6f4b12;
  font-size: 0.82rem;
  line-height: 1.25rem;
}

.completed-confirm-card {
  border-radius: 8px;
  overflow: hidden;
}

.completed-confirm-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.8rem;
  align-items: start;
  padding: 1.25rem 1.35rem 1rem;
  border-bottom: 1px solid #edf1f3;
  background: #ffffff;
}

.completed-confirm-header .v-icon {
  color: #b7791f;
}

.completed-confirm-body {
  padding: 1rem 1.35rem;
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.45rem;
}

.completed-confirm-body p {
  margin: 0;
}

.completed-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 0 1.35rem 1.25rem !important;
}

.completed-confirm-secondary,
.completed-confirm-primary {
  min-height: 2.35rem;
  padding: 0 0.95rem;
  border-radius: 8px;
  font-size: 0.84rem;
  font-weight: 900;
}

.completed-confirm-secondary {
  border: 1px solid #dcebed;
  color: #475569;
  background: #ffffff;
}

.completed-confirm-primary {
  border: 1px solid #0f766e;
  color: #ffffff;
  background: #0f766e;
}

.agenda-grid {
  display: grid;
  grid-template-columns: 76px repeat(7, minmax(142px, 1fr));
}

.min-w-agenda {
  min-width: 1070px;
}

.agenda-slot {
  min-height: 68px;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.agenda-slot.cursor-pointer:hover {
  box-shadow: 0 8px 18px rgba(31, 41, 55, 0.12);
  transform: translateY(-1px);
}

.appointment-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  padding-top: 0.25rem;
}

.appointment-dialog-action {
  min-width: 8.5rem;
}

.appointment-contact-row {
  display: block;
  margin-bottom: 1rem;
}

.appointment-contact-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 2.65rem;
  align-items: start;
  gap: 0.6rem;
}

.appointment-whatsapp-trigger {
  display: inline-flex;
  flex: 0 0 auto;
}

.appointment-whatsapp-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 2.5rem;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid #9fd8b4;
  border-radius: 8px;
  color: #128c4a;
  background: #ecfdf3;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.appointment-whatsapp-button .v-icon {
  color: currentColor;
}

.appointment-whatsapp-button:not(:disabled):hover,
.appointment-whatsapp-button:not(:disabled):focus {
  border-color: #128c4a;
  color: #ffffff;
  background: #128c4a;
  outline: none;
  transform: translateY(-1px);
}

.appointment-whatsapp-button.disabled,
.appointment-whatsapp-button:disabled {
  border-color: #d5d9de;
  color: #9ca3af;
  background: #f3f4f6;
  cursor: not-allowed;
  transform: none;
}

.appointment-contact-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.25rem;
  padding: 0 0.25rem;
  color: #6b7280;
  font-size: 0.74rem;
  line-height: 1.15;
}

.appointment-contact-meta span:first-child {
  min-width: 0;
}

.appointment-contact-meta span:last-child {
  flex: 0 0 auto;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .follow-up-header {
    padding: 1.1rem 1rem 1rem;
  }

  .follow-up-body {
    padding: 1rem !important;
  }

  .follow-up-search {
    max-width: none;
  }

  .follow-up-actions,
  .completed-confirm-actions {
    justify-content: stretch;
  }

  .follow-up-record-button,
  .follow-up-contact-button,
  .completed-confirm-secondary,
  .completed-confirm-primary {
    width: 100%;
  }

  .appointment-dialog-actions {
    justify-content: stretch !important;
  }

  .appointment-dialog-action {
    width: 100%;
  }

  .appointment-contact-control {
    grid-template-columns: minmax(0, 1fr) 2.45rem;
    gap: 0.45rem;
  }

  .appointment-whatsapp-button {
    width: 2.38rem;
    height: 2.38rem;
    flex-basis: 2.38rem;
  }

  .appointment-contact-meta {
    align-items: flex-start;
    font-size: 0.72rem;
    padding-right: 0;
  }
}
</style>
