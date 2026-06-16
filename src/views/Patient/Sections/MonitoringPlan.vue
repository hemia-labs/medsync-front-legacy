<template>
  <div class="w-full h-full">

    <da-loader v-bind:overlay="isLoading"></da-loader>
    <div class="monitoring-body">
        <div class="monitoring-intro">
          <div>
            <p class="monitoring-kicker">Seguimiento clínico</p>
            <h3>Registros del paciente</h3>
            <p>Consulta tratamientos realizados, próxima cita y notas clínicas.</p>
          </div>
          <button type="button" class="monitoring-add tab-create-action" @click="openModalAdd()">
            <v-icon small>mdi-plus</v-icon>
            <span>Nuevo seguimiento</span>
          </button>
        </div>

        <div class="monitoring-table-card">
          <div v-if="monitoringRows.length === 0" class="monitoring-empty-state">
            <v-icon size="34">mdi-calendar-search-outline</v-icon>
            <strong>Aún no hay seguimientos registrados.</strong>
            <p>Cuando agregues un seguimiento, aquí aparecerán el tratamiento realizado, la próxima cita y las notas clínicas.</p>
          </div>

          <template v-else>
            <div class="monitoring-table-wrap">
              <table class="monitoring-table">
                <thead>
                  <tr>
                    <th>Fecha del seguimiento</th>
                    <th>Tratamiento realizado</th>
                    <th>Tratamiento sugerido para próxima cita</th>
                    <th>Próxima cita</th>
                    <th class="monitoring-table-action">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in monitoringRows" :key="monitoringKey(item)">
                    <td>
                      <div class="monitoring-date-cell">
                        <span class="monitoring-date-icon"><v-icon size="18">mdi-calendar-check-outline</v-icon></span>
                        <div>
                          <strong>{{ displayMonitoringDate(item.quote_date_now, 'Sin fecha registrada') }}</strong>
                          <small>Fecha del registro</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="monitoring-treatment-cell">
                        <strong>{{ displayMonitoringText(item.treatment_now, 'Sin tratamiento registrado') }}</strong>
                        <small v-if="displayMonitoringText(item.note, '')">{{ monitoringNotePreview(item) }}</small>
                      </div>
                    </td>
                    <td>
                      <span class="monitoring-pill">
                        {{ displayMonitoringText(item.treatment_after, 'Sin tratamiento definido') }}
                      </span>
                    </td>
                    <td>
                      <span :class="['monitoring-next-date', hasNextAppointmentDate(item.quote_date_after) ? 'has-date' : 'is-empty']">
                        {{ displayMonitoringDate(item.quote_date_after, 'Sin próxima cita') }}
                      </span>
                    </td>
                    <td>
                      <div class="monitoring-actions">
                        <button type="button" class="monitoring-action monitoring-action--view" @click="showModalData(item)">
                          <v-icon small>mdi-eye-outline</v-icon>
                          <span>Ver detalle</span>
                        </button>
                        <button type="button" class="monitoring-action monitoring-action--danger" @click="showDelete(item.id_tracing)">
                          <v-icon small>mdi-trash-can-outline</v-icon>
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="monitoring-mobile-list">
              <article v-for="item in monitoringRows" :key="`mobile-${monitoringKey(item)}`" class="monitoring-mobile-card">
                <div class="monitoring-mobile-head">
                  <span class="monitoring-date-icon"><v-icon size="18">mdi-calendar-check-outline</v-icon></span>
                  <div>
                    <strong>{{ displayMonitoringDate(item.quote_date_now, 'Sin fecha registrada') }}</strong>
                    <small>Seguimiento clínico</small>
                  </div>
                </div>

                <dl class="monitoring-mobile-meta">
                  <div>
                    <dt>Tratamiento realizado</dt>
                    <dd>{{ displayMonitoringText(item.treatment_now, 'Sin tratamiento registrado') }}</dd>
                  </div>
                  <div>
                    <dt>Próximo tratamiento</dt>
                    <dd>{{ displayMonitoringText(item.treatment_after, 'Sin tratamiento definido') }}</dd>
                  </div>
                  <div>
                    <dt>Próxima cita</dt>
                    <dd>{{ displayMonitoringDate(item.quote_date_after, 'Sin próxima cita') }}</dd>
                  </div>
                </dl>

                <p v-if="displayMonitoringText(item.note, '')" class="monitoring-mobile-note">
                  {{ monitoringNotePreview(item) }}
                </p>

                <div class="monitoring-actions mobile">
                  <button type="button" class="monitoring-action monitoring-action--view" @click="showModalData(item)">
                    <v-icon small>mdi-eye-outline</v-icon>
                    <span>Ver detalle</span>
                  </button>
                  <button type="button" class="monitoring-action monitoring-action--danger" @click="showDelete(item.id_tracing)">
                    <v-icon small>mdi-trash-can-outline</v-icon>
                    <span>Eliminar</span>
                  </button>
                </div>
              </article>
            </div>
          </template>
        </div>

        <section class="appointment-history-section" aria-labelledby="appointment-history-title">
          <div class="appointment-history-head">
            <div>
              <p class="monitoring-kicker">Agenda del paciente</p>
              <h3 id="appointment-history-title">Historial de citas</h3>
              <p>Citas operativas vinculadas al expediente.</p>
            </div>
            <button type="button" class="appointment-history-refresh" @click="loadAppointmentHistory(true)" :disabled="appointmentHistoryLoading">
              <v-icon small>mdi-refresh</v-icon>
              <span>Actualizar</span>
            </button>
          </div>

          <div v-if="appointmentHistoryLoading && appointmentHistoryRows.length === 0" class="appointment-history-state">
            <v-icon size="30">mdi-calendar-sync-outline</v-icon>
            <strong>Cargando historial de citas...</strong>
          </div>

          <div v-else-if="appointmentHistoryError && appointmentHistoryRows.length === 0" class="appointment-history-state appointment-history-state--error">
            <v-icon size="30">mdi-alert-circle-outline</v-icon>
            <strong>{{ appointmentHistoryError }}</strong>
          </div>

          <div v-else-if="appointmentHistoryRows.length === 0" class="appointment-history-state">
            <v-icon size="30">mdi-calendar-blank-outline</v-icon>
            <strong>Este paciente aun no tiene citas registradas.</strong>
          </div>

          <template v-else>
            <div v-if="nextAppointmentHistory" class="appointment-history-next">
              <span>Proxima cita</span>
              <strong>{{ appointmentDateLabel(nextAppointmentHistory) }} - {{ appointmentTimeLabel(nextAppointmentHistory) }}</strong>
              <small>{{ appointmentReason(nextAppointmentHistory) }}</small>
            </div>

            <div class="appointment-history-table-wrap">
              <table class="appointment-history-table">
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Profesional/usuario</th>
                    <th>Estado</th>
                    <th>Motivo y notas</th>
                    <th>Actualizacion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="appointment in appointmentHistoryRows" :key="appointmentKey(appointment)">
                    <td>
                      <strong>{{ appointmentDateLabel(appointment) }}</strong>
                      <small>{{ appointmentTimeLabel(appointment) }}</small>
                    </td>
                    <td>{{ appointmentActor(appointment) }}</td>
                    <td>
                      <span class="appointment-history-chip" :style="appointmentStatusStyle(appointment.status)">
                        {{ appointmentStatusLabel(appointment.status) }}
                      </span>
                      <small v-if="isUpcomingAppointment(appointment)" class="appointment-history-upcoming">Proxima</small>
                    </td>
                    <td>
                      <strong>{{ appointmentReason(appointment) }}</strong>
                      <small v-if="appointmentNotes(appointment)">{{ appointmentNotes(appointment) }}</small>
                    </td>
                    <td>{{ appointmentUpdatedLabel(appointment) || 'Sin registro' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="appointment-history-mobile-list">
              <article v-for="appointment in appointmentHistoryRows" :key="`history-mobile-${appointmentKey(appointment)}`" class="appointment-history-mobile-item">
                <div class="appointment-history-mobile-head">
                  <div>
                    <strong>{{ appointmentDateLabel(appointment) }}</strong>
                    <small>{{ appointmentTimeLabel(appointment) }}</small>
                  </div>
                  <span class="appointment-history-chip" :style="appointmentStatusStyle(appointment.status)">
                    {{ appointmentStatusLabel(appointment.status) }}
                  </span>
                </div>
                <dl class="appointment-history-mobile-meta">
                  <div>
                    <dt>Profesional/usuario</dt>
                    <dd>{{ appointmentActor(appointment) }}</dd>
                  </div>
                  <div>
                    <dt>Motivo</dt>
                    <dd>{{ appointmentReason(appointment) }}</dd>
                  </div>
                  <div v-if="appointmentNotes(appointment)">
                    <dt>Notas</dt>
                    <dd>{{ appointmentNotes(appointment) }}</dd>
                  </div>
                </dl>
              </article>
            </div>

            <div v-if="appointmentHistoryHasMore" class="appointment-history-footer">
              <button type="button" class="appointment-history-more" @click="loadMoreAppointmentHistory()" :disabled="appointmentHistoryLoading">
                <v-icon small>mdi-chevron-down</v-icon>
                <span>{{ appointmentHistoryLoading ? 'Cargando...' : 'Ver mas' }}</span>
              </button>
            </div>
          </template>
        </section>
    </div>

    <v-dialog v-model="show" persistent max-width="860" content-class="monitoring-dialog-shell">
      <v-card class="monitoring-dialog-card">
        <div class="monitoring-dialog-header">
          <div>
            <p class="monitoring-dialog-kicker">Seguimiento clÃ­nico</p>
            <h3>Agregar seguimiento</h3>
            <span>Registra el tratamiento realizado y programa la prÃ³xima atenciÃ³n del paciente.</span>
          </div>
            <div class="flex justify-end items-center mr-4 mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" @click="show = false" class="icon icon-tabler icon-tabler-square-x text-gray-400 cursor-pointer" width="35" height="35" viewBox="0 0 24 24" stroke-width="1" stroke="#BDBDBD" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M10 10l4 4m0 -4l-4 4" />
                </svg>
            </div>
        </div>
        <v-card-text class="monitoring-dialog-body">

          <v-text-field
            v-model="objCita3.quote_date_now"
            type="date"
            label="Fecha actual"
            dense
            outlined
            :color="themePrimaryColor"
          ></v-text-field>

          <div class="w-ful text-right">
            <span v-if="showtto2 == true" class="text-primary-700 cursor-pointer" @click="showtto2 = !showtto2">Escribir tratamiento</span>
            <span v-else class="text-primary-700 cursor-pointer" @click="showtto2 = !showtto2">Seleccionar tratamiento</span>
          </div>

          <v-text-field
            v-if="showtto2 == false"
            v-model="objCita3.id_cat_treatment_now"
            class="animate-fade-in-up"
            label="Tratamiento realizado"
            dense
            outlined
            :color="themePrimaryColor"
          ></v-text-field>

          <v-autocomplete v-if="showtto2 == true" class="animate-fade-in-up" :items="getAllTreatments" item-text="name" v-model="ttoSelecionado1" item-value="id" label="Tratamiento realizado" dense outlined :color="themePrimaryColor"></v-autocomplete>

          <v-text-field
            :value="objCita3.quote_date_after"
            type="date"
            label="Fecha proximo tratamiento"
            dense
            outlined
            :color="themePrimaryColor"
            @input="onNewAppointmentDateChange($event)"
          ></v-text-field>

          <div class="monitoring-schedule-panel mt-2 mb-5 border border-gray-200 bg-gray-50 p-4">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
              <div>
                <p class="m-0 text-gray-700 font-semibold">Hora de próxima cita</p>
                <p class="m-0 text-gray-500 text-sm">Solo se muestran horarios disponibles según la agenda configurada.</p>
              </div>
              <v-chip v-if="selectedAppointmentTime" color="#FFF3CD" text-color="#8A5A00" small>Pendiente de confirmar</v-chip>
            </div>
            <div v-if="availableNewAppointmentSlots.length > 0" class="flex flex-wrap gap-2">
              <button
                v-for="slot in availableNewAppointmentSlots"
                :key="slot.startTime"
                type="button"
                class="monitoring-slot px-3 py-2 border text-sm font-semibold focus:outline-none"
                :class="selectedAppointmentTime === slot.startTime ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-green-700 border-green-200'"
                @click="selectNewAppointmentSlot(slot)"
              >
                {{ slot.startTime }}
              </button>
            </div>
            <p v-else class="m-0 text-sm text-gray-500">Selecciona una fecha con horarios disponibles.</p>
            <p v-if="selectedAppointmentTime" class="m-0 mt-3 text-sm text-gray-700">
              Cita seleccionada: {{ objCita3.quote_date_after }} a las {{ selectedAppointmentTime }}.
            </p>
          </div>

          <div class="w-ful text-right">
            <span v-if="showtto3 == true" class="text-primary-700 cursor-pointer" @click="showtto3 = !showtto3">Escribir tratamiento</span>
            <span v-else class="text-primary-700 cursor-pointer" @click="showtto3 = !showtto3">Seleccionar tratamiento</span>
          </div>

          <v-text-field
            v-if="showtto3 == false"
            v-model ="objCita3.id_cat_treatment_after"
            class="animate-fade-in-up"
            label="Tratamiento proxima cita"
            dense
            outlined
            :color="themePrimaryColor"
          ></v-text-field>

         <v-autocomplete v-if="showtto3 == true" class="animate-fade-in-up" :items="getAllTreatments" item-text="name" v-model="ttoSelecionado" item-value="id" label="Tratamiento proxima cita" dense outlined :color="themePrimaryColor"></v-autocomplete>

          <v-textarea
            v-model="objCita3.note"
            label="Notas"
            rows="3"
            dense
            outlined
            auto-grow
            :color="themePrimaryColor"
          ></v-textarea>

          <div class="flex justify-end flex-wrap gap-2">
              <button type="button" class="monitoring-dialog-action monitoring-dialog-action--save mt-5" @click="onSaveMonitoring()">
                <v-icon small>mdi-content-save-outline</v-icon>
                <span>Guardar</span>
              </button>
              <button type="button" class="monitoring-dialog-action monitoring-dialog-action--close mt-5" @click="show = false">
                <v-icon small>mdi-close</v-icon>
                <span>Cancelar</span>
              </button>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <da-dialog v-model="isDelete" :persist="true" :maxWidth="'500px'">
        <template #body>
            <da-sweet-confirm 
            :title="'Eliminar Registro'" 
            :message="'¿Esta seguro de eliminar el registro de seguimiento seleccionado?'"
            :lottiepath="DELETE"
            :iconwidth="150"
            :iconheight="150"
            v-on:confirm="onDelete()" 
            v-on:close="isDelete = false">
        </da-sweet-confirm>
        </template>
    </da-dialog>

    <v-dialog v-model="isNote" persistent max-width="860" content-class="monitoring-dialog-shell">
      <v-card class="monitoring-dialog-card">
        <div class="monitoring-dialog-header monitoring-dialog-header--detail">
          <span class="text-xl ml-5 mt-4">Detalle del seguimiento</span> 
            <div class="flex justify-end items-center mr-4 mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" @click="closeModalEdit()" class="icon icon-tabler icon-tabler-square-x text-gray-400 cursor-pointer" width="35" height="35" viewBox="0 0 24 24" stroke-width="1" stroke="#BDBDBD" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M10 10l4 4m0 -4l-4 4" />
                </svg>
            </div>
        </div>
        <v-card-text v-if="isReadOnly" class="monitoring-dialog-body monitoring-dialog-body--readonly">

          <v-text-field
            v-model="objCita2.quote_date_now"
            label="Fecha del seguimiento"
            dense
            outlined
            readonly
            :color="themePrimaryColor"
          ></v-text-field>

          <v-text-field
            v-model="objCita2.id_cat_treatment_now"
            label="Tratamiento realizado"
            dense
            outlined
            readonly
            :color="themePrimaryColor"
          ></v-text-field>

          <v-text-field
            v-model="objCita2.quote_date_after"
            label="Fecha proximo tratamiento"
            dense
            outlined
            readonly
            :color="themePrimaryColor"
          ></v-text-field>

          <v-text-field
            v-model ="objCita2.id_cat_treatment_after"
            label="Tratamiento proxima cita"
            dense
            outlined
            readonly
            :color="themePrimaryColor"
          ></v-text-field>

          <v-textarea
            v-model="objCita2.note"
            label="Notas"
            rows="3"
            dense
            outlined
            auto-grow
            readonly
            :color="themePrimaryColor"
          ></v-textarea>

      <div class="flex justify-end flex-wrap gap-2">
            <button v-if="!isEdit" type="button" class="monitoring-dialog-action monitoring-dialog-action--edit mt-5" @click="changeButton()">
              <v-icon small>mdi-pencil-outline</v-icon>
              <span>Editar</span>
            </button>
            <button v-if="isEdit" type="button" class="monitoring-dialog-action monitoring-dialog-action--save mt-5" @click="onUPDMonitoring()">
              <v-icon small>mdi-content-save-outline</v-icon>
              <span>Guardar</span>
            </button>
            <button type="button" class="monitoring-dialog-action monitoring-dialog-action--close mt-5" @click="isNote = false">
              <v-icon small>mdi-close</v-icon>
              <span>Cerrar</span>
            </button>
      </div>
        </v-card-text>

        <v-card-text v-else class="monitoring-dialog-body monitoring-dialog-body--edit">

          <v-text-field
            v-model="objCita.quote_date_now"
            type="date"
            label="Fecha actual"
            dense
            outlined
            :color="themePrimaryColor"
          ></v-text-field>

          <div class="w-ful text-right">
            <span v-if="showtto1 == true" class="text-primary-700 cursor-pointer" @click="showtto1 = !showtto1">Seleccionar tratamiento</span>
            <span v-else class="text-primary-700 cursor-pointer" @click="showtto1 = !showtto1">Escribir tratamiento</span>
          </div>

          <v-text-field
              v-show="showtto1 == true"
              v-model="objCita.id_cat_treatment_now"
              class="animate-fade-in-up"
              label="Tratamiento realizado"
              dense
              outlined
              :color="themePrimaryColor"
          ></v-text-field>

          <v-autocomplete v-show="showtto1 == false" class="animate-fade-in-up" :items="getAllTreatments" item-text="name" v-model="ttoSelecionado2" item-value="name" label="Tratamiento realizado" dense outlined :color="themePrimaryColor"></v-autocomplete>
          <v-text-field
            v-model="objCita.quote_date_after"
            type="date"
            label="Fecha proximo tratamiento"
            dense
            outlined
            :color="themePrimaryColor"
          ></v-text-field>

          <div class="w-ful text-right">
            <span v-if="showtto == true" class="text-primary-700 cursor-pointer" @click="showtto = !showtto">Seleccionar tratamiento</span>
            <span v-else class="text-primary-700 cursor-pointer" @click="showtto = !showtto">Escribir tratamiento</span>
          </div>

          <v-text-field
            v-show="showtto == true"
            v-model ="objCita.id_cat_treatment_after"
            class="animate-fade-in-up"
            label="Tratamiento proxima cita"
            dense
            outlined
            :color="themePrimaryColor"
          ></v-text-field>

         <v-autocomplete v-show="showtto == false" class="animate-fade-in-up" :items="getAllTreatments" item-text="name" v-model="ttoSelecionado3" item-value="name" label="Tratamiento proxima cita" dense outlined :color="themePrimaryColor"></v-autocomplete>

          <v-textarea
            v-model="objCita.note"
            label="Notas"
            rows="3"
            dense
            outlined
            auto-grow
            :color="themePrimaryColor"
          ></v-textarea>

      <div class="flex justify-end flex-wrap gap-2">
            <button type="button" class="monitoring-dialog-action monitoring-dialog-action--save mt-5" @click="onUPDMonitoring()">
              <v-icon small>mdi-content-save-outline</v-icon>
              <span>Guardar</span>
            </button>
            <button type="button" class="monitoring-dialog-action monitoring-dialog-action--close mt-5" @click="cancelEditButton()">
              <v-icon small>mdi-close</v-icon>
              <span>Cancelar</span>
            </button>
      </div>
        </v-card-text>

      </v-card>
    </v-dialog>

  </div> 

</template>

<script>
import { mapActions, mapGetters } from 'vuex';
import VuexMixin from '../../../mixins/VuexMixin';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import DASweetConfirm from '../../../core/components/form/dialog/components/DASweetConfirm.vue';
import { DAAppointmentService } from '../../../services/context/core-proccess-context';
import { DELETE } from '../../../utils/lottieicon';
import { formatFecha, revertFormatFecha } from '../../../utils/date';
import DAMonitorPlanModel from '../../../models/monitor/DAMonitorPlan.model';
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_STATUS_LABELS,
  appointmentBlocksAvailability,
  getAppointmentConfig,
  getAppointments,
  normalizeAppointmentConfig,
  saveAppointmentConfig
} from '../../../domain/appointments/appointment.storage';
import {
  addMinutesToTime,
  formatDisplayDate,
  generateDaySlots,
  toIsoDate
} from '../../../domain/appointments/availability';

export default {
    mixins: [VuexMixin],
    props: {
    px: {
      type: Object,
      default: function(){return {}}
    }
  },
  data: function() {
        return {
            citas:  [],
            showtto:    false,
            showtto1:   false,
            showtto2:   false,
            showtto3:   false,
            show:       false,
            isLoading:  false,
            isDelete:   false,
            isNote:     false,
            isEdit:     false,
            isReadOnly: true,
            ttoSelecionado:   '',
            ttoSelecionado1:  '',
            ttoSelecionado2:   '',
            ttoSelecionado3:  '',
            idtracing:  '',
            dateNow: '',
            ida: '',
            appointmentConfig: getAppointmentConfig(),
            appointments: getAppointments(),
            selectedAppointmentTime: '',
            selectedAppointmentEndTime: '',
            appointmentHistory: [],
            appointmentHistoryLoading: false,
            appointmentHistoryError: '',
            appointmentHistoryLimit: 6,
            appointmentHistoryOffset: 0,
            appointmentHistoryHasMore: false,
            DELETE,
            objCita: {
              quote_date_now:         '',
              id_cat_treatment_now:   '',
              quote_date_after:       '',
              id_cat_treatment_after: '',
              note:                   ''
            },
            objCita2: {
              quote_date_now:         '',
              id_cat_treatment_now:   '',
              quote_date_after:       '',
              id_cat_treatment_after: '',
              note:                   ''
            },
            objCita3: new DAMonitorPlanModel(),
            headers: [
                { text: 'Fecha',                value: 'quote_date_now' },
                { text: 'Tipo de Tratamiento',  value: 'treatment_now' },
                { text: 'Tratamiento próxima cita', value: 'treatment_after' },
                { text: 'Próxima Cita',         value: 'quote_date_after' },
                { text: 'Acción',               value: 'action' },
            ],
            rules: {
              date: [
                (v) => !!v || "El campo es requerido",
                (v) =>
                  (v && v.replace(/\D/g, "").length === 8) ||
                  "La fecha es incorrecta",
              ],
            },
        }
       
    },
    components: {
        'da-sweet-confirm': DASweetConfirm
    },
  created() {
      this.isLoading = true
      this.init()
      this.isLoading = false
  },
  computed: {
    ...mapGetters(moduleTypes.MONITORING, {
      saveMonitorings:    fnTypes.saveTracing,
      updMonitorings:     fnTypes.updTracing,
      getMonitorings:     fnTypes.getTracing,
      deleteMonitorings:  fnTypes.deleteTracing,
      getAllTreatments:   fnTypes.getAllPxTreatment
    }) ,

    monitoringRows: function() {
      return Array.isArray(this.getMonitorings) ? this.getMonitorings : []
    },

    appointmentHistoryRows: function() {
      return Array.isArray(this.appointmentHistory) ? this.appointmentHistory : []
    },

    nextAppointmentHistory: function() {
      const now = new Date()
      return this.appointmentHistoryRows
        .filter((appointment) => this.appointmentDateTime(appointment) >= now)
        .sort((left, right) => this.appointmentDateTime(left) - this.appointmentDateTime(right))[0] || null
    },

    themePrimaryColor: function() {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-primary-700').trim() || '#1497bd'
    },

    availableNewAppointmentSlots: function() {
      if(!this.objCita3.quote_date_after) {
        return []
      }

      return generateDaySlots(
        this.objCita3.quote_date_after,
        this.appointmentConfig,
        this.appointments
      ).filter((slot) => slot.selectable)
    }
  },
  watch: {
    'px.person.id_person': function() {
      this.loadAppointmentHistory(true)
    }
  },
  methods: {
    formatFecha,
    revertFormatFecha,
    ...mapActions(moduleTypes.MONITORING, [
        fnTypes.saveTracing,
        fnTypes.updTracing,
        fnTypes.getTracing,
        fnTypes.deleteTracing,
        fnTypes.getAllPxTreatment
      ]),

      init(){
        this.onGetMonitoring()
        this.onGetAllTreatment()
        this.getCurrentDate()
        this.loadAppointmentHistory(true)
      },

      monitoringKey: function(item) {
        return item.id_tracing || `${item.quote_date_now || ''}-${item.treatment_now || ''}-${item.quote_date_after || ''}`
      },

      displayMonitoringText: function(value, fallback) {
        const text = String(value || '').trim()
        return text && text !== 'null' && text !== 'undefined' ? text : fallback
      },

      hasNextAppointmentDate: function(value) {
        const text = String(value || '').trim()
        return Boolean(text && text !== '00-00-0000' && text !== '0000-00-00' && text !== 'Sin fecha')
      },

      displayMonitoringDate: function(value, fallback) {
        if(!this.hasNextAppointmentDate(value)) {
          return fallback
        }

        return String(value).trim()
      },

      monitoringNotePreview: function(item) {
        const note = this.displayMonitoringText(item.note, '')
        if(!note) {
          return ''
        }

        return note.length > 72 ? `${note.slice(0, 72)}...` : note
      },

      appointmentKey: function(appointment) {
        return appointment.id || `${appointment.date || ''}-${appointment.startTime || ''}-${appointment.status || ''}`
      },

      appointmentDateTime: function(appointment) {
        const date = toIsoDate(appointment && appointment.date ? appointment.date : '')
        const time = appointment && appointment.startTime ? appointment.startTime : '00:00'
        const value = date ? new Date(`${date}T${time}:00`) : new Date(0)
        return Number.isNaN(value.getTime()) ? new Date(0) : value
      },

      appointmentDateLabel: function(appointment) {
        return appointment && appointment.date ? formatDisplayDate(appointment.date) : 'Sin fecha'
      },

      appointmentTimeLabel: function(appointment) {
        const start = appointment && appointment.startTime ? appointment.startTime : ''
        const end = appointment && appointment.endTime ? appointment.endTime : ''
        if(start && end) {
          return `${start} - ${end}`
        }
        return start || 'Sin hora'
      },

      appointmentStatusLabel: function(status) {
        return APPOINTMENT_STATUS_LABELS[status] || status || 'Cita registrada'
      },

      appointmentStatusStyle: function(status) {
        const colors = APPOINTMENT_STATUS_COLORS[status] || APPOINTMENT_STATUS_COLORS[APPOINTMENT_STATUSES.BLOCKED]
        return `background:${colors.bg};color:${colors.text};border-color:${colors.border};`
      },

      appointmentReason: function(appointment) {
        return this.displayMonitoringText(appointment.title, 'Sin motivo registrado')
      },

      appointmentNotes: function(appointment) {
        return this.displayMonitoringText(appointment.description || appointment.cancellationReason, '')
      },

      appointmentActor: function(appointment) {
        return this.displayMonitoringText(appointment.updatedByName || appointment.createdByName, 'No asignado')
      },

      appointmentUpdatedLabel: function(appointment) {
        const value = appointment && (appointment.updatedAt || appointment.createdAt)
        if(!value) {
          return ''
        }

        const date = new Date(value)
        if(Number.isNaN(date.getTime())) {
          return ''
        }

        return date.toLocaleDateString('es-MX', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      },

      isUpcomingAppointment: function(appointment) {
        return this.appointmentDateTime(appointment) >= new Date()
      },

      loadMoreAppointmentHistory: async function() {
        await this.loadAppointmentHistory(false)
      },

      loadAppointmentHistory: async function(reset) {
        const patientId = this.px && this.px.person ? this.px.person.id_person : ''
        if(!patientId) {
          this.appointmentHistory = []
          this.appointmentHistoryHasMore = false
          return
        }

        if(reset) {
          this.appointmentHistoryOffset = 0
          this.appointmentHistoryHasMore = false
        }

        this.appointmentHistoryLoading = true
        this.appointmentHistoryError = ''

        const response = await DAAppointmentService.patientHistory(patientId, {
          limit: this.appointmentHistoryLimit,
          offset: this.appointmentHistoryOffset
        })

        if(response && response.success) {
          const payload = response.data || {}
          const appointments = Array.isArray(payload.appointments)
            ? payload.appointments
            : (Array.isArray(payload) ? payload : [])

          this.appointmentHistory = reset
            ? appointments
            : this.appointmentHistory.concat(appointments)

          const pagination = payload.pagination || {}
          this.appointmentHistoryHasMore = Boolean(pagination.hasMore)
          this.appointmentHistoryOffset = pagination.nextOffset !== undefined
            ? pagination.nextOffset
            : this.appointmentHistory.length
        }
        else {
          this.appointmentHistoryError = response && response.message ? response.message : 'No se pudo cargar el historial de citas.'
        }

        this.appointmentHistoryLoading = false
      },
    
      onDelete: async function(){
        this.isLoading = true
        let data = {
          "id_tracing": this.ida,
          "id_person":  this.px.person.id_person
        }
        await this.deleteTracing(data)
        this.onGetMonitoring()
        this.isDelete = false
        this.isLoading = false
      },

      onSaveMonitoring: async function(){

        let objeto = this.getAllTreatments.find((elemento) => elemento.id === this.ttoSelecionado1);//Tto Actual
        let objeto1 = this.getAllTreatments.find((elemento) => elemento.id === this.ttoSelecionado); //prox Tto

        var ttoActual = ''
        var ttoProximo = ''
        
        //Validacion tto Actual
        if (this.showtto2 == true){
          ttoActual = objeto.name
        }
        else {
          ttoActual = this.objCita3.id_cat_treatment_now
        }

        if (this.showtto3 == true){
          ttoProximo = objeto1.name
        }
        else{
          ttoProximo =  this.objCita3.id_cat_treatment_after 
        }

        if (ttoActual == '' || ttoProximo == '') {
          this.isLoading = false
          return 
        }

        if(this.objCita3.quote_date_after == '' || this.objCita3.quote_date_after == undefined){
          this.objCita3.quote_date_after = '00-00-0000'
        }

        if(this.objCita3.quote_date_after !== '00-00-0000' && !this.selectedAppointmentTime) {
          this.toastFunction('error','Selecciona un horario disponible para la próxima cita.')
          return
        }

        if(this.objCita3.quote_date_now == '' || this.objCita3.quote_date_now == undefined){
          this.objCita3.quote_date_now = this.dateNow
        }

        this.isLoading = true

        let data  = {
          "tracing":    [
          {
            "quote_date_now":    this.formatFecha(this.objCita3.quote_date_now),
            "treatment_now":    ttoActual,
            "quote_date_after": this.formatFecha(this.objCita3.quote_date_after),
            "treatment_after":  ttoProximo,
            "note":             this.objCita3.note,
          }
        ],
          "id_person":  this.px.person.id_person
        }

          await this.saveTracing(data)
        
        if(this.saveMonitorings){
          await this.createFollowUpAppointment(ttoProximo)
          this.show = false
          this.onGetMonitoring()
        }
        this.isLoading = false
      },

      onUPDMonitoring: async function(){

        let objeto = this.getAllTreatments.find((elemento) => elemento.name === this.ttoSelecionado3);

        let objeto1 = this.getAllTreatments.find((elemento) => elemento.name === this.ttoSelecionado2);

        var tto = ''
        var tto1 = ''

        if (this.showtto){
          tto = this.objCita.id_cat_treatment_after 
        }
        else{
          if(objeto != undefined)
          {
            tto =  objeto.name
          }
          else {
              tto = this.objCita.id_cat_treatment_after 
          }
        }

        if (this.showtto1){
          tto1 = this.objCita.id_cat_treatment_now
        }
        else{
          if(objeto1 != undefined)
          {
            tto1 =  objeto1.name
          }
          else {
              tto1 = this.objCita.id_cat_treatment_now 
          }
        }

        this.isLoading = true

        if (tto == '' || tto1 == '') {
           this.isLoading = false
          return 
        }


        if(this.objCita.quote_date_after == '' || this.objCita.quote_date_after == undefined){
          this.objCita.quote_date_after = '00-00-0000'
        }

        if(this.objCita.quote_date_now == '' || this.objCita.quote_date_now == undefined){
          this.objCita.quote_date_now = this.dateNow
        }

        let data  = {
          "tracing":    [
              {
                "id_tracing":       this.idtracing,
                "quote_date_now":    this.formatFecha(this.objCita.quote_date_now),
                "treatment_now":    tto1,
                "quote_date_after":  this.formatFecha(this.objCita.quote_date_after),
                "treatment_after":  tto,
                "note":             this.objCita.note,
              }
        ],
          "id_person":  this.px.person.id_person
        }


          await this.updTracing(data)
        
        
        if(this.updMonitorings){
          this.isReadOnly = true
          this.isEdit = false
           this.isNote = false
          this.onGetMonitoring()
        }
        this.isLoading = false
      },

      onGetMonitoring: async function(){
        this.isLoading = true
        await this.ActionWrapp(moduleTypes.MONITORING, fnTypes.getTracing, this.px.person.id_person)
        this.citas = this.getMonitorings
        this.isLoading = false
      },

      onGetAllTreatment: async function(){
        this.isLoading = true
        await this.ActionWrapp(moduleTypes.MONITORING, fnTypes.getAllPxTreatment, this.px.person.id_person)
        this.isLoading = false
      },

      getCurrentDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        this.objCita3.quote_date_now = `${year}-${month}-${day}`
        this.dateNow = `${year}-${month}-${day}`
      },

      openModalAdd: async function(){
        await this.reloadAppointmentData()
        this.getCurrentDate()
        this.show = true
        this.objCita3.id_cat_treatment_now   = ''
        this.objCita3.id_cat_treatment_after = ''
        this.objCita3.quote_date_after       = ''
        this.objCita3.note                   = ''
        this.ttoSelecionado                 = ''
        this.ttoSelecionado1                = ''
        this.selectedAppointmentTime         = ''
        this.selectedAppointmentEndTime      = ''
      },

      onNewAppointmentDateChange: async function(date) {
        this.objCita3.quote_date_after = date
        this.selectedAppointmentTime = ''
        this.selectedAppointmentEndTime = ''
        await this.reloadAppointmentData(date)
      },

      selectNewAppointmentSlot(slot) {
        this.selectedAppointmentTime = slot.startTime
        this.selectedAppointmentEndTime = slot.endTime
      },

      reloadAppointmentData: async function(date) {
        const configResponse = await DAAppointmentService.getConfig()
        if(configResponse && configResponse.success && configResponse.data) {
          this.appointmentConfig = normalizeAppointmentConfig(configResponse.data)
          saveAppointmentConfig(this.appointmentConfig)
        }
        else {
          this.appointmentConfig = getAppointmentConfig()
        }

        const targetDate = date || this.objCita3.quote_date_after || this.dateNow
        const listResponse = await DAAppointmentService.list({
          date_from: toIsoDate(targetDate),
          date_to: toIsoDate(targetDate)
        })

        if(listResponse && listResponse.success) {
          this.appointments = listResponse.data || []
        }
        else {
          this.appointments = getAppointments()
        }
      },

      createFollowUpAppointment: async function(treatmentAfter) {
        if(!this.selectedAppointmentTime || this.objCita3.quote_date_after === '00-00-0000') {
          return
        }

        const startTime = this.selectedAppointmentTime
        const endTime = this.selectedAppointmentEndTime || addMinutesToTime(startTime, this.appointmentConfig.defaultAppointmentDuration || 30)
        const patientName = `${this.px.person.name || ''} ${this.px.person.surname || ''}`.trim()
        const response = await DAAppointmentService.save({
          patientId: this.px.person.id_person,
          patientName,
          followUpId: this.saveMonitorings && this.saveMonitorings.id_tracing ? this.saveMonitorings.id_tracing : '',
          date: toIsoDate(this.objCita3.quote_date_after),
          startTime,
          endTime,
          status: APPOINTMENT_STATUSES.PENDING,
          title: treatmentAfter || 'Próxima cita',
          description: this.objCita3.note || '',
          source: 'follow_up',
          blocksAvailability: appointmentBlocksAvailability(APPOINTMENT_STATUSES.PENDING)
        })

        if(response && response.success) {
          await this.reloadAppointmentData(this.objCita3.quote_date_after)
          await this.loadAppointmentHistory(true)
          this.toastFunction('success',`Cita creada como pendiente de confirmar a las ${startTime}.`)
          return
        }

        this.toastFunction('error', response && response.message ? response.message : 'No se pudo crear la cita en agenda.')
      },

      showDelete(id){
        this.ida = id
        this.isDelete = true
      },

      showModalData(obj){
        this.objCita2 = {};

        this.objCita2.quote_date_now         = obj.quote_date_now
        this.objCita2.id_cat_treatment_now   = obj.treatment_now
        this.objCita2.id_cat_treatment_after = obj.treatment_after
        this.objCita2.quote_date_after       = obj.quote_date_after
        this.objCita2.note                   = obj.note
        this.isNote           = true
        this.idtracing        = obj.id_tracing
        this.ttoSelecionado   =  obj.treatment_after
        this.ttoSelecionado1  =  obj.treatment_now
        this.ttoSelecionado2  =  obj.treatment_now
        this.ttoSelecionado3  =  obj.treatment_after

        let proxTtoExisteEnLista = this.getAllTreatments.find((elemento) => elemento.name === obj.treatment_after);
        let actualTtoExisteEnLista = this.getAllTreatments.find((elemento) => elemento.name === obj.treatment_now);

        if(proxTtoExisteEnLista != undefined)
          {
            this.showtto = false
          }
          else {
            this.showtto = true
          }

          if(actualTtoExisteEnLista != undefined)
          {
            this.showtto1 = false
          }
          else {
            this.showtto1 = true
          }

        this.objCita  = {...this.objCita2, quote_date_after: this.revertFormatFecha(obj.quote_date_after), quote_date_now: this.revertFormatFecha(obj.quote_date_now)};
      },

      changeButton(){
        this.isReadOnly = false
        this.isEdit = true
      },
      cancelEditButton(){
        this.isReadOnly = true
        this.isEdit     = false
        this.showtto    = false
        this.showtto1   = false
      },

      closeModalEdit(){
        this.isEdit = false
        this.showtto = false
        this.showtto1 = false
        this.isReadOnly = true
        this.esperarCincoSegundos()
      },

      toastFunction: function(type,text){
        const Toast = this.$swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          didOpen: (toast) => {
            toast.addEventListener('mouseenter', this.$swal.stopTimer)
            toast.addEventListener('mouseleave', this.$swal.resumeTimer)
          }
        })

        Toast.fire({
          icon: type,
          title: text
        })
      },

      esperarCincoSegundos() {
      setTimeout(() => {

        this.isNote = false
      }, 1000);

      
    },
    }
}
</script>

<style scoped>
.monitoring-body {
  padding: 1.25rem;
}

.monitoring-intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-primary-200);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--color-primary-100), #fff);
}

.monitoring-kicker {
  margin: 0 0 0.2rem;
  color: var(--color-primary-900);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.monitoring-intro h3 {
  margin: 0;
  color: #334155;
  font-size: 1rem;
  font-weight: 800;
}

.monitoring-intro p:last-child {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 600;
}

.monitoring-table-card {
  overflow: hidden;
  border: 1px solid #d8eef5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
}

.appointment-history-section {
  margin-top: 1rem;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.appointment-history-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.appointment-history-head h3 {
  margin: 0;
  color: #334155;
  font-size: 0.98rem;
  font-weight: 900;
  letter-spacing: 0;
}

.appointment-history-head p:last-child {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 600;
}

.appointment-history-refresh,
.appointment-history-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 2rem;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  font-size: 0.76rem;
  font-weight: 900;
  line-height: 1;
  transition: transform 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.appointment-history-refresh {
  flex: 0 0 auto;
  padding: 0.35rem 0.72rem;
}

.appointment-history-more {
  padding: 0.42rem 0.85rem;
}

.appointment-history-refresh:hover,
.appointment-history-more:hover {
  transform: translateY(-1px);
  border-color: var(--color-primary-300, #a6e1f0);
  color: var(--color-primary-900, #086783);
}

.appointment-history-refresh:disabled,
.appointment-history-more:disabled {
  cursor: wait;
  opacity: 0.65;
}

.appointment-history-refresh .v-icon,
.appointment-history-more .v-icon {
  color: currentColor;
}

.appointment-history-state {
  display: grid;
  place-items: center;
  gap: 0.4rem;
  min-height: 8rem;
  padding: 1.25rem;
  color: #64748b;
  text-align: center;
}

.appointment-history-state strong {
  color: #334155;
  font-weight: 900;
}

.appointment-history-state .v-icon {
  color: var(--color-primary-700, #1497bd);
}

.appointment-history-state--error .v-icon,
.appointment-history-state--error strong {
  color: #b4232f;
}

.appointment-history-next {
  display: grid;
  gap: 0.12rem;
  margin: 0.85rem 1rem 0;
  padding: 0.8rem 0.9rem;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  background: #f0fdf4;
}

.appointment-history-next span {
  color: #166534;
  font-size: 0.7rem;
  font-weight: 900;
  text-transform: uppercase;
}

.appointment-history-next strong {
  color: #12313a;
  font-size: 0.92rem;
  font-weight: 900;
}

.appointment-history-next small {
  color: #475569;
  font-size: 0.8rem;
  font-weight: 700;
}

.appointment-history-table-wrap {
  overflow-x: auto;
}

.appointment-history-table {
  width: 100%;
  min-width: 860px;
  border-collapse: separate;
  border-spacing: 0;
}

.appointment-history-table th {
  padding: 0.78rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  color: #64748b;
  background: #ffffff;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0;
  text-align: left;
  text-transform: uppercase;
}

.appointment-history-table td {
  padding: 0.88rem 1rem;
  border-bottom: 1px solid #eef2f7;
  color: #475569;
  font-size: 0.86rem;
  vertical-align: top;
}

.appointment-history-table tr:last-child td {
  border-bottom: 0;
}

.appointment-history-table td strong,
.appointment-history-table td small {
  display: block;
  max-width: 25rem;
  overflow-wrap: anywhere;
}

.appointment-history-table td strong {
  color: #12313a;
  font-weight: 900;
}

.appointment-history-table td small {
  margin-top: 0.18rem;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.2rem;
}

.appointment-history-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.7rem;
  padding: 0.18rem 0.6rem;
  border: 1px solid;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
}

.appointment-history-upcoming {
  display: block;
  margin-top: 0.32rem;
  color: #166534 !important;
  font-size: 0.68rem !important;
  font-weight: 900 !important;
  text-transform: uppercase;
}

.appointment-history-mobile-list {
  display: none;
}

.appointment-history-footer {
  display: flex;
  justify-content: center;
  padding: 0.8rem 1rem 1rem;
  border-top: 1px solid #eef2f7;
}

.monitoring-table-wrap {
  overflow-x: auto;
}

.monitoring-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.monitoring-table th {
  padding: 0.95rem 1rem;
  border-bottom: 1px solid var(--color-primary-200, #cdeef7);
  color: var(--color-primary-900, #086783);
  background: var(--color-primary-100, #e6f7fb);
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1rem;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.monitoring-table td {
  padding: 0.95rem 1rem;
  border-bottom: 1px solid #e8eef2;
  color: #475569;
  font-size: 0.9rem;
  vertical-align: middle;
}

.monitoring-table tbody tr {
  transition: background-color 160ms ease;
}

.monitoring-table tbody tr:hover {
  background: #fbfdfe;
}

.monitoring-table tbody tr:last-child td {
  border-bottom: 0;
}

.monitoring-table-action {
  text-align: right !important;
}

.monitoring-date-cell,
.monitoring-mobile-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.7rem;
  min-width: 12rem;
}

.monitoring-date-icon {
  display: grid;
  place-items: center;
  width: 2.45rem;
  height: 2.45rem;
  border-radius: 8px;
  color: var(--color-primary-900, #086783);
  background: var(--color-primary-100, #e6f7fb);
}

.monitoring-date-icon .v-icon {
  color: currentColor;
}

.monitoring-date-cell strong,
.monitoring-treatment-cell strong,
.monitoring-mobile-head strong {
  display: block;
  color: #12313a;
  font-weight: 900;
  letter-spacing: 0;
}

.monitoring-date-cell small,
.monitoring-treatment-cell small,
.monitoring-mobile-head small {
  display: block;
  margin-top: 0.12rem;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.15rem;
}

.monitoring-treatment-cell {
  min-width: 14rem;
}

.monitoring-treatment-cell small {
  max-width: 24rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.monitoring-pill,
.monitoring-next-date {
  display: inline-flex;
  align-items: center;
  min-height: 1.9rem;
  padding: 0 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 800;
}

.monitoring-pill {
  border: 1px solid #dbe7eb;
  color: #475569;
  background: #f8fafc;
}

.monitoring-next-date.has-date {
  border: 1px solid #bbf7d0;
  color: #166534;
  background: #f0fdf4;
}

.monitoring-next-date.is-empty {
  border: 1px solid #e5e7eb;
  color: #64748b;
  background: #f8fafc;
}

.monitoring-empty-state {
  display: grid;
  place-items: center;
  gap: 0.45rem;
  min-height: 11rem;
  padding: 1.5rem;
  color: #64748b;
  background: #fbfdfe;
  text-align: center;
}

.monitoring-empty-state .v-icon {
  color: var(--color-primary-700, #1497bd);
}

.monitoring-empty-state strong {
  color: #12313a;
  font-weight: 900;
}

.monitoring-empty-state p {
  max-width: 34rem;
  margin: 0;
  color: #64748b;
  line-height: 1.45rem;
}

.monitoring-mobile-list {
  display: none;
}

.monitoring-dialog-shell {
  border-radius: 8px;
}

.monitoring-dialog-card {
  overflow: hidden;
  border: 1px solid var(--color-border, #d8e9ef);
  border-radius: 8px !important;
  background: var(--color-bg, #f8fbfd);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
}

.monitoring-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border, #d8e9ef);
  background: linear-gradient(180deg, var(--color-primary-100, #e6f7fb), #ffffff);
}

.monitoring-dialog-header > div:first-child {
  min-width: 0;
}

.monitoring-dialog-header > span {
  display: block;
  margin: 0;
  color: #12313a;
  font-size: 1.1rem;
  font-weight: 900;
  line-height: 1.35;
}

.monitoring-dialog-header > span::before {
  content: 'Seguimiento clinico';
  display: block;
  margin-bottom: 0.18rem;
  color: var(--color-primary-900, #086783);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.monitoring-dialog-header h3 {
  margin: 0;
  color: #12313a;
  font-size: 1.12rem;
  font-weight: 900;
  letter-spacing: 0;
}

.monitoring-dialog-header h3 + span {
  display: block;
  margin-top: 0.28rem;
  color: #64748b;
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1.35rem;
}

.monitoring-dialog-header:not(.monitoring-dialog-header--detail) h3 + span {
  color: transparent;
  font-size: 0;
  line-height: 1;
}

.monitoring-dialog-header:not(.monitoring-dialog-header--detail) h3 + span::after {
  content: 'Registra el tratamiento realizado y programa la proxima atencion del paciente.';
  color: #64748b;
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1.35rem;
}

.monitoring-dialog-kicker {
  margin: 0 0 0.18rem;
  color: transparent;
  font-size: 0;
  line-height: 1;
}

.monitoring-dialog-kicker::after {
  content: 'Seguimiento clinico';
  color: var(--color-primary-900, #086783);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.monitoring-dialog-header > .flex {
  flex: 0 0 auto;
  margin: 0 !important;
}

.monitoring-dialog-header svg,
.monitoring-dialog-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.15rem;
  height: 2.15rem;
  border: 1px solid var(--color-border, #d8e9ef);
  border-radius: 999px;
  background: #ffffff;
  color: #64748b;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
  transition: transform 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.monitoring-dialog-header svg {
  padding: 0.3rem;
}

.monitoring-dialog-header svg rect {
  display: none;
}

.monitoring-dialog-header svg:hover,
.monitoring-dialog-close:hover {
  transform: translateY(-1px);
  border-color: rgba(20, 151, 189, 0.35);
  color: var(--color-primary-700, #1497bd);
}

.monitoring-dialog-body {
  display: grid;
  gap: 1rem;
  max-height: 72vh;
  overflow-y: auto;
  padding: 1.15rem 1.25rem !important;
  background: var(--color-bg, #f8fbfd);
}

.monitoring-dialog-body > * {
  min-width: 0;
}

.monitoring-dialog-body > .w-ful.text-right {
  margin: -0.25rem 0 0;
}

.monitoring-dialog-body > .w-ful.text-right span {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0.25rem 0.7rem;
  border: 1px solid var(--color-primary-200, #bdebf5);
  border-radius: 999px;
  background: var(--color-primary-50, #eef9fc);
  color: var(--color-primary-900, #086783) !important;
  font-size: 0.76rem;
  font-weight: 900;
}

.monitoring-dialog-body::v-deep .v-input {
  margin-top: 0;
}

.monitoring-dialog-body::v-deep .v-input__slot {
  border-radius: 8px;
}

.monitoring-dialog-body::v-deep .v-text-field__details {
  margin-bottom: 0;
}

.monitoring-schedule-panel {
  margin: 0 !important;
  border: 1px solid var(--color-border, #d8e9ef) !important;
  border-radius: 8px;
  background: #ffffff !important;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.monitoring-schedule-panel p {
  line-height: 1.45rem;
}

.monitoring-schedule-panel > div:first-child p:first-child {
  color: #12313a !important;
  font-size: 0.92rem;
  font-weight: 900 !important;
}

.monitoring-schedule-panel > div:first-child p:last-child {
  margin-top: 0.15rem !important;
  color: #64748b !important;
  font-weight: 600;
}

.monitoring-slot {
  min-width: 4.5rem;
  border-radius: 999px;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.monitoring-slot:hover {
  transform: translateY(-1px);
  box-shadow: 0 7px 16px rgba(22, 101, 52, 0.12);
}

.monitoring-dialog-body > .flex.justify-end,
.monitoring-dialog-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.55rem;
  padding: 0.85rem 1.25rem 1rem !important;
  border-top: 1px solid var(--color-border, #d8e9ef);
  background: #ffffff;
}

.monitoring-dialog-body > .flex.justify-end {
  margin: 0 -1.25rem -1.15rem;
}

.monitoring-dialog-body .monitoring-dialog-action {
  margin-top: 0 !important;
}

.monitoring-dialog-body--readonly,
.monitoring-dialog-body--edit {
  grid-template-columns: 1fr;
}

.monitoring-add,
.monitoring-action,
.monitoring-dialog-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid transparent;
  border-radius: 999px;
  font-weight: 800;
  letter-spacing: 0.03em;
  line-height: 1;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.1);
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.monitoring-add:hover,
.monitoring-action:hover,
.monitoring-dialog-action:hover {
  transform: translateY(-1px);
}

.monitoring-add .v-icon,
.monitoring-action .v-icon,
.monitoring-dialog-action .v-icon {
  color: currentColor;
}

.monitoring-add {
  min-height: 2.35rem;
  padding: 0.45rem 0.9rem;
  background: #e8f8ef;
  border-color: #b8e8ca;
  color: #137445;
  font-size: 0.78rem;
}

.monitoring-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.45rem;
}

.monitoring-action {
  min-height: 2rem;
  padding: 0.35rem 0.7rem;
  font-size: 0.74rem;
}

.monitoring-action--view {
  background: #eef9fc;
  border-color: #bdebf5;
  color: var(--color-primary-700);
}

.monitoring-action--danger {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #b4232f;
}

.monitoring-dialog-action {
  min-height: 2.35rem;
  padding: 0.48rem 0.9rem;
  font-size: 0.82rem;
}

.monitoring-dialog-action--save {
  background: #e8f8ef;
  border-color: #b8e8ca;
  color: #137445;
}

.monitoring-dialog-action--edit {
  background: #eef9fc;
  border-color: #bdebf5;
  color: var(--color-primary-700);
}

.monitoring-dialog-action--close {
  background: #fff;
  border-color: #e5e7eb;
  color: #64748b;
}

@media (max-width: 768px) {
  .monitoring-body {
    padding: 1rem;
  }

  .monitoring-intro {
    align-items: flex-start;
    flex-direction: column;
  }

  .appointment-history-head {
    flex-direction: column;
  }

  .appointment-history-refresh {
    width: 100%;
  }

  .appointment-history-next {
    margin: 0.85rem 0.9rem 0;
  }

  .appointment-history-table-wrap {
    display: none;
  }

  .appointment-history-mobile-list {
    display: grid;
    gap: 0.75rem;
    padding: 0.9rem;
  }

  .appointment-history-mobile-item {
    display: grid;
    gap: 0.75rem;
    padding: 0.85rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
  }

  .appointment-history-mobile-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .appointment-history-mobile-head strong,
  .appointment-history-mobile-head small {
    display: block;
  }

  .appointment-history-mobile-head strong {
    color: #12313a;
    font-weight: 900;
  }

  .appointment-history-mobile-head small {
    margin-top: 0.15rem;
    color: #64748b;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .appointment-history-mobile-meta {
    display: grid;
    gap: 0.55rem;
    margin: 0;
  }

  .appointment-history-mobile-meta div {
    min-width: 0;
  }

  .appointment-history-mobile-meta dt {
    margin: 0 0 0.15rem;
    color: #64748b;
    font-size: 0.7rem;
    font-weight: 900;
    text-transform: uppercase;
  }

  .appointment-history-mobile-meta dd {
    overflow-wrap: anywhere;
    margin: 0;
    color: #12313a;
    font-size: 0.84rem;
    font-weight: 800;
    line-height: 1.25rem;
  }

  .monitoring-table-wrap {
    display: none;
  }

  .monitoring-mobile-list {
    display: grid;
    gap: 0.85rem;
    padding: 0.9rem;
  }

  .monitoring-mobile-card {
    display: grid;
    gap: 0.85rem;
    padding: 0.95rem;
    border: 1px solid #e0edf0;
    border-radius: 8px;
    background: #ffffff;
  }

  .monitoring-mobile-meta {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.65rem;
    margin: 0;
  }

  .monitoring-mobile-meta div {
    min-width: 0;
    padding: 0.75rem;
    border: 1px solid #e8eef2;
    border-radius: 8px;
    background: #f8fafc;
  }

  .monitoring-mobile-meta dt {
    margin: 0 0 0.25rem;
    color: #64748b;
    font-size: 0.72rem;
    font-weight: 900;
    text-transform: uppercase;
  }

  .monitoring-mobile-meta dd {
    overflow: hidden;
    margin: 0;
    color: #12313a;
    font-size: 0.86rem;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .monitoring-mobile-note {
    margin: 0;
    padding: 0.75rem;
    border-left: 3px solid var(--color-primary-300, #a6e1f0);
    color: #475569;
    background: #fbfdfe;
    font-size: 0.86rem;
    line-height: 1.35rem;
  }

  .monitoring-actions.mobile {
    display: grid;
    grid-template-columns: 1fr;
  }

  .monitoring-actions.mobile .monitoring-action {
    width: 100%;
  }
}
</style>
