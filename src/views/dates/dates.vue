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
          <v-btn icon @click="moveWeek(-7)">
            <v-icon color="#6B7280">mdi-chevron-left</v-icon>
          </v-btn>
          <v-text-field v-model="selectedDate" type="date" label="Semana" dense outlined hide-details :color="themePrimaryColor" class="w-44"></v-text-field>
          <v-btn icon @click="moveWeek(7)">
            <v-icon color="#6B7280">mdi-chevron-right</v-icon>
          </v-btn>
          <da-button-secondary @click.native="followUpDialog = true" :label="'Seguimientos'" rxl swpr class="py-1 px-3 font-light"></da-button-secondary>
          <da-button-primary @click.native="openManualAppointment()" :label="'Nueva cita'" rxl swpr class="py-1 px-3 font-light"></da-button-primary>
        </div>
      </div>

      <div class="px-6 py-4 border-b border-gray-200">
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

      <div v-if="!appointmentConfig.enabled" class="m-6 p-5 border border-gray-200 bg-gray-50 text-gray-600">
        La agenda esta desactivada. Activa la agenda desde Configuracion para generar disponibilidad.
      </div>

      <div v-else class="p-4 overflow-x-auto">
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
      <v-card>
        <div class="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200">
          <div>
            <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Seguimiento</p>
            <h3 class="m-0 mt-1 text-gray-700 text-xl font-semibold">Pacientes por seguimiento</h3>
            <p class="m-0 mt-1 text-gray-500 text-sm">Lista de apoyo para contactar pacientes con proxima cita registrada en seguimiento.</p>
          </div>
          <v-btn icon @click="followUpDialog = false">
            <v-icon color="#9CA3AF">mdi-close</v-icon>
          </v-btn>
        </div>
        <v-card-text class="pt-5">
          <da-datatable :headers="headers" :values="allMonitorings" :elevation="1" :hidesearch="false">
            <template #action="{ data }">
              <da-button-900 @click.native="goTo(data.telephone,data.name,data.quote_date_after)" :label="'Contactar'" r2xl swpr class="w-full px-2 tracking-wider rounded-md">
                <v-icon small color="white">mdi mdi-whatsapp</v-icon>
              </da-button-900>
            </template>
          </da-datatable>
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
          <v-btn icon @click="closeDialog()">
            <v-icon color="#9CA3AF">mdi-close</v-icon>
          </v-btn>
        </div>

        <v-card-text class="pt-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <v-text-field v-model="editingAppointment.date" type="date" label="Fecha" outlined dense :color="themePrimaryColor" @change="refreshDialogEndTime"></v-text-field>
            <v-select v-model="editingAppointment.startTime" :items="dialogAvailableTimes" item-text="label" item-value="value" label="Hora" outlined dense :color="themePrimaryColor" @change="refreshDialogEndTime"></v-select>
            <v-text-field :value="editingAppointment.endTime" label="Fin" outlined dense readonly :color="themePrimaryColor"></v-text-field>
            <v-select v-model="editingAppointment.status" :items="appointmentStatusOptions" item-text="text" item-value="value" label="Estado" outlined dense :color="themePrimaryColor" @change="syncBlocksAvailability"></v-select>
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
          >
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

          <v-text-field v-model="editingAppointment.patientName" label="Nombre del paciente" hint="Usa este campo si es paciente nuevo o no tiene expediente." persistent-hint outlined dense :color="themePrimaryColor"></v-text-field>
          <div class="appointment-contact-row">
            <v-text-field
              v-model="editingAppointment.contactPhone"
              label="Telefono de contacto / WhatsApp"
              hint="Se usara solo para confirmar o contactar esta cita."
              persistent-hint
              outlined
              dense
              counter="40"
              maxlength="40"
              :color="themePrimaryColor"
              class="appointment-contact-field"
              @blur="normalizeAppointmentContactPhone"
            ></v-text-field>
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
          <v-text-field v-model="editingAppointment.title" label="Motivo o titulo" outlined dense :color="themePrimaryColor"></v-text-field>
          <v-textarea v-model="editingAppointment.description" label="Descripcion" outlined dense :color="themePrimaryColor" rows="3"></v-textarea>
          <v-textarea v-if="editingAppointment.status === 'cancelled'" v-model="editingAppointment.cancellationReason" label="Motivo de cancelacion" outlined dense :color="themePrimaryColor" rows="2"></v-textarea>

          <p v-if="dialogError" class="text-red-600 font-semibold">{{ dialogError }}</p>
        </v-card-text>

        <v-card-actions class="appointment-dialog-actions px-6 pb-5 justify-end">
          <da-button-secondary @click.native="closeDialog()" :label="'Cerrar'" rxl swpr class="appointment-dialog-action py-1 px-4 font-light"></da-button-secondary>
          <da-button-900 v-if="editingAppointment.id" @click.native="cancelAppointment()" :label="'Cancelar cita'" rxl swpr class="appointment-dialog-action py-1 px-4 font-light"></da-button-900>
          <da-button-primary @click.native="saveAppointment()" :label="'Guardar'" rxl swpr class="appointment-dialog-action py-1 px-4 font-light"></da-button-primary>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
 
<script>
import { mapActions, mapGetters } from 'vuex';
import VuexMixin from '../../mixins/VuexMixin';
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
  mixins: [VuexMixin],
  data: function() {
    return {
      selectedDate: toIsoDate(new Date()),
      appointmentConfig: getAppointmentConfig(),
      appointments: getAppointments(),
      appointmentDialog: false,
      followUpDialog: false,
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
      headers: [
        { text: 'Nombre', value: 'name' },
        { text: 'Prox. Cita', value: 'quote_date_after' },
        { text: 'Prox. Tratamiento', value: 'treatment_after' },
        { text: 'Telefono', value: 'telephone' },
        { text: 'Accion', value: 'action' }
      ],
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

    dialogTitle: function() {
      if(!this.editingAppointment.date || !this.editingAppointment.startTime) {
        return 'Selecciona fecha y hora'
      }
      return `${formatDisplayDate(this.editingAppointment.date)} ${this.editingAppointment.startTime}`
    },

    dialogAvailableTimes: function() {
      const appointments = this.appointments.filter((appointment) => appointment.id !== this.editingAppointment.id)
      const slots = generateDaySlots(this.editingAppointment.date, this.appointmentConfig, appointments)
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

    appointmentWhatsAppTooltip: function() {
      return this.canOpenAppointmentWhatsApp
        ? 'Contactar por WhatsApp'
        : 'Captura un telefono de contacto valido'
    },

    themePrimaryColor: function() {
      if(typeof window === 'undefined') {
        return '#E7AC18'
      }

      return getComputedStyle(document.documentElement).getPropertyValue('--color-primary-700').trim() || '#E7AC18'
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
      await this.loadAppointmentConfig()
      await this.reloadAppointments()
      await this.onSearch()
    },

    onSearch: async function() {
      await this.getAllTracing()
    },

    loadAppointmentConfig: async function() {
      const response = await DAAppointmentService.getConfig()
      if(response && response.success && response.data) {
        this.appointmentConfig = normalizeAppointmentConfig(response.data)
        saveAppointmentConfig(this.appointmentConfig)
      }
    },

    reloadAppointments: async function() {
      const response = await DAAppointmentService.list({
        date_from: this.weekDates[0],
        date_to: this.weekDates[this.weekDates.length - 1]
      })

      if(response && response.success) {
        this.appointments = response.data || []
      }
      else {
        this.appointments = getAppointments()
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
        contactPhone: normalizeAppointmentContactPhoneValue(appointment && (appointment.contactPhone || appointment.contact_phone))
      })
      this.originalAppointment = appointment && appointment.id ? Object.assign({}, appointment) : null
      this.resetPatientSearchState()
      this.refreshDialogEndTime()
      this.appointmentDialog = true
    },

    closeDialog: function() {
      this.appointmentDialog = false
      this.dialogError = ''
      this.editingAppointment = {}
      this.originalAppointment = null
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

    saveRescheduledAppointment: async function() {
      const appointmentsToValidate = this.appointments.filter((appointment) => appointment.id !== this.editingAppointment.id)
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

      const validation = validateAppointmentSlot(newAppointment, this.appointmentConfig, appointmentsToValidate)

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

      if(this.shouldCreateRescheduledAppointment()) {
        await this.saveRescheduledAppointment()
        return
      }

      const appointmentsToValidate = this.appointments.filter((appointment) => appointment.id !== this.editingAppointment.id)
      const validation = validateAppointmentSlot(this.editingAppointment, this.appointmentConfig, appointmentsToValidate)
      if(!validation.valid && appointmentBlocksAvailability(this.editingAppointment.status)) {
        this.dialogError = validation.message
        return
      }

      const normalizedPatientId = this.editingAppointment.patientId || null
      const normalizedFollowUpId = this.editingAppointment.source === 'follow_up'
        ? this.editingAppointment.followUpId
        : null

      const response = await DAAppointmentService.save(Object.assign({}, this.editingAppointment, {
        patientId: normalizedPatientId,
        followUpId: normalizedFollowUpId,
        contactPhone: this.editingAppointment.contactPhone || null,
        date: toIsoDate(this.editingAppointment.date),
        blocksAvailability: appointmentBlocksAvailability(this.editingAppointment.status)
      }))

      if(!response || !response.success) {
        this.dialogError = response && response.message ? response.message : 'No se pudo guardar la cita.'
        return
      }

      await this.reloadAppointments()
      this.closeDialog()
    },

    cancelAppointment: async function() {
      this.editingAppointment.status = APPOINTMENT_STATUSES.CANCELLED
      this.editingAppointment.blocksAvailability = false
      await this.saveAppointment()
    },

    refreshDialogEndTime: function() {
      if(this.editingAppointment.startTime) {
        this.editingAppointment.endTime = addMinutesToTime(this.editingAppointment.startTime, this.appointmentConfig.defaultAppointmentDuration || 30)
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
      this.reloadAppointments()
    }
  }
}
</script>

<style scoped>
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
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.appointment-contact-field {
  flex: 1 1 auto;
  min-width: 0;
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

@media (max-width: 640px) {
  .appointment-dialog-actions {
    justify-content: stretch !important;
  }

  .appointment-dialog-action {
    width: 100%;
  }

  .appointment-contact-row {
    align-items: stretch;
    flex-direction: column;
  }

  .appointment-whatsapp-button {
    width: 100%;
  }

  .appointment-whatsapp-trigger {
    width: 100%;
  }
}
</style>
