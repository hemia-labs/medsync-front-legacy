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
          <button v-if="canCreateMonitoring" type="button" class="monitoring-add tab-create-action" @click="openModalAdd()">
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
                    <th>Próximo procedimiento o indicación</th>
                    <th>Próxima atención</th>
                    <th class="monitoring-table-action">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in monitoringRows" :key="monitoringKey(item)" :data-pulse-record="item.id_tracing">
                    <td>
                      <div class="monitoring-date-cell">
                        <span class="monitoring-date-icon"><v-icon size="18">mdi-calendar-check-outline</v-icon></span>
                        <div>
                          <strong>{{ displayMonitoringDate(item.quote_date_now, 'Sin fecha registrada') }}</strong>
                          <small>{{ item.status === 'cancelled' ? 'Anulado · solo consulta' : 'Fecha del registro' }}</small>
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
                      <follow-up-appointment :record="item" />
                      <small v-if="item.linked_appointment_id">Fecha sugerida original: </small>
                      <span :class="['monitoring-next-date', hasNextAppointmentDate(item.quote_date_after) ? 'has-date' : 'is-empty']">
                        {{ displayMonitoringDate(item.quote_date_after, 'Sin fecha sugerida') }}
                      </span>
                    </td>
                    <td>
                      <div class="monitoring-actions"><button v-if="canManageAppointments && hasPermission('px.tab.monitoring') && item.status === 'active' && px.person && px.person.active !== 0" type="button" class="monitoring-action monitoring-action--view" @click="openAgendaForFollowUp(item)">{{ ['pending_confirmation','confirmed'].includes(item.linked_appointment_status) ? 'Ver cita' : 'Agendar' }}</button>
                        <button type="button" class="monitoring-action monitoring-action--view" @click="showModalData(item)">
                          <v-icon small>mdi-eye-outline</v-icon>
                          <span>Ver detalle</span>
                        </button>
                        <button v-if="canCancelMonitoring && item.status !== 'cancelled'" type="button" class="monitoring-action monitoring-action--danger" @click="showDelete(item)">
                          <v-icon small>mdi-trash-can-outline</v-icon>
                          <span>Anular</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="monitoring-mobile-list">
              <article v-for="item in monitoringRows" :key="`mobile-${monitoringKey(item)}`" :data-pulse-record="item.id_tracing" class="monitoring-mobile-card">
                <div class="monitoring-mobile-head">
                  <span class="monitoring-date-icon"><v-icon size="18">mdi-calendar-check-outline</v-icon></span>
                  <div>
                    <strong>{{ displayMonitoringDate(item.quote_date_now, 'Sin fecha registrada') }}</strong>
                    <small>{{ item.status === 'cancelled' ? 'Anulado · solo consulta' : 'Seguimiento clínico' }}</small>
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
                    <dt>Próxima atención</dt>
                    <dd class="monitoring-linked-care"><follow-up-appointment :record="item" /><span v-if="item.linked_appointment_id">Fecha sugerida original: </span>{{ displayMonitoringDate(item.quote_date_after, 'Sin fecha sugerida') }}</dd>
                  </div>
                </dl>

                <p v-if="displayMonitoringText(item.note, '')" class="monitoring-mobile-note">
                  {{ monitoringNotePreview(item) }}
                </p>

                <div class="monitoring-actions mobile"><button v-if="canManageAppointments && hasPermission('px.tab.monitoring') && item.status === 'active' && px.person && px.person.active !== 0" type="button" class="monitoring-action monitoring-action--view" @click="openAgendaForFollowUp(item)">{{ ['pending_confirmation','confirmed'].includes(item.linked_appointment_status) ? 'Ver cita' : 'Agendar' }}</button>
                  <button type="button" class="monitoring-action monitoring-action--view" @click="showModalData(item)">
                    <v-icon small>mdi-eye-outline</v-icon>
                    <span>Ver detalle</span>
                  </button>
                  <button v-if="canCancelMonitoring && item.status !== 'cancelled'" type="button" class="monitoring-action monitoring-action--danger" @click="showDelete(item)">
                    <v-icon small>mdi-trash-can-outline</v-icon>
                    <span>Anular</span>
                  </button>
                </div>
              </article>
            </div>
          </template>
        </div>

        <section v-if="canViewAppointmentHistory" class="appointment-history-section" aria-labelledby="appointment-history-title">
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
              <small>{{ appointmentReason(nextAppointmentHistory) }} · {{ nextAppointmentHistory.doctorName || 'Sin doctor asignado' }}</small>
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
                      <strong>{{ appointmentReason(appointment) }}</strong><small class="block">{{ appointment.doctorName || 'Sin doctor asignado' }}</small>
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
                    <dd>{{ appointmentReason(appointment) }} · {{ appointment.doctorName || 'Sin doctor asignado' }}</dd>
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
            <p class="monitoring-dialog-kicker">Seguimiento clínico</p>
            <h3>Agregar seguimiento</h3>
            <span>Registra el tratamiento realizado y programa la próxima atención del paciente.</span>
          </div>
          <v-btn icon :disabled="isSavingMonitoring" aria-label="Cerrar nuevo seguimiento" @click="closeNewMonitoring"><v-icon>mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="monitoring-dialog-body">
          <p v-if="newMonitoringError" role="alert" class="text-red-700">{{ newMonitoringError }}</p>
          <p v-if="savedNewMonitoring" role="status">El seguimiento ya está guardado. Sólo se reintentará la cita. Su fecha sugerida original se conserva; el horario final se consulta en Historial de citas.</p>
          <p v-if="!canManageAppointments" class="text-gray-500 text-sm">Puedes guardar el seguimiento. Pide a recepción o a una persona con acceso a Agenda que programe la cita si se necesita.</p>

          <v-text-field
            v-model="objCita3.quote_date_now" :readonly="Boolean(savedNewMonitoring) || isSavingMonitoring"
            type="date"
            label="Fecha actual"
            dense
            outlined
            :color="themePrimaryColor"
          ></v-text-field>

          <div v-if="!savedNewMonitoring && !isSavingMonitoring" class="w-ful text-right">
            <button type="button" class="monitoring-treatment-toggle" :aria-pressed="String(showtto2)" aria-label="Cambiar captura del tratamiento realizado" @click="showtto2 = !showtto2">{{ showtto2 ? 'Escribir tratamiento' : 'Seleccionar tratamiento' }}</button>
          </div>

          <v-text-field
            v-if="showtto2 == false"
            v-model="objCita3.id_cat_treatment_now" :readonly="Boolean(savedNewMonitoring) || isSavingMonitoring"
            class="animate-fade-in-up"
            label="Tratamiento realizado (obligatorio)"
            aria-required="true"
            :error-messages="newMonitoringFieldError('performed')"
            dense
            outlined
            :color="themePrimaryColor"
          ></v-text-field>

          <v-autocomplete :readonly="Boolean(savedNewMonitoring) || isSavingMonitoring" v-if="showtto2 == true" class="animate-fade-in-up" :items="getAllTreatments" item-text="name" v-model="ttoSelecionado1" item-value="id" label="Tratamiento realizado (obligatorio)" aria-required="true" :error-messages="newMonitoringFieldError('performed')" dense outlined :color="themePrimaryColor"></v-autocomplete>

          <v-checkbox v-if="canManageAppointments" v-model="scheduleNewAppointment" :disabled="isSavingMonitoring" label="Agendar próxima cita (opcional)" :color="themePrimaryColor" hide-details />
          <v-text-field
            v-if="canManageAppointments && scheduleNewAppointment"
            :value="objCita3.quote_date_after"
            type="date"
            label="Fecha de la cita"
            :readonly="isSavingMonitoring"
            dense
            outlined
            :color="themePrimaryColor"
            @input="onNewAppointmentDateChange($event)"
          ></v-text-field>

          <div v-if="canManageAppointments && scheduleNewAppointment" class="monitoring-schedule-panel mt-2 mb-5 border border-gray-200 bg-gray-50 p-4">
            <p class="text-gray-500 text-sm mb-3">Elige doctor, fecha y horario para crear una cita pendiente de confirmar. Desmarca Agendar próxima cita para guardar sólo el seguimiento.</p>
            <v-select :disabled="isSavingMonitoring" v-model="appointmentDoctorId" :items="appointmentDoctors" item-text="display_name" item-value="id_doctor_professional_profile" label="Doctor de la proxima cita" :readonly="appointmentDoctors.length === 1" outlined dense :color="themePrimaryColor" @change="onAppointmentDoctorChange"></v-select>
            <p v-if="appointmentDataLoading" role="status">Consultando disponibilidad…</p><p v-if="appointmentDataError" role="alert" class="text-red-700">{{ appointmentDataError }}</p>
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
                @click="selectNewAppointmentSlot(slot)" :disabled="isSavingMonitoring"
              >
                {{ slot.startTime }}
              </button>
            </div>
            <p v-else class="m-0 text-sm text-gray-500">Selecciona una fecha con horarios disponibles.</p>
            <p v-if="selectedAppointmentTime" class="m-0 mt-3 text-sm text-gray-700">
              Cita seleccionada: {{ objCita3.quote_date_after }} a las {{ selectedAppointmentTime }}.
            </p>
          </div>

          <div v-if="!savedNewMonitoring && !isSavingMonitoring" class="w-ful text-right">
            <button type="button" class="monitoring-treatment-toggle" :aria-pressed="String(showtto3)" aria-label="Cambiar captura del próximo procedimiento" @click="showtto3 = !showtto3">{{ showtto3 ? 'Escribir tratamiento' : 'Seleccionar tratamiento' }}</button>
          </div>

          <v-text-field
            v-if="showtto3 == false"
            v-model ="objCita3.id_cat_treatment_after" :readonly="Boolean(savedNewMonitoring) || isSavingMonitoring"
            class="animate-fade-in-up"
            label="Próximo procedimiento o indicación (obligatorio)"
            aria-required="true"
            :error-messages="newMonitoringFieldError('next')"
            dense
            outlined
            :color="themePrimaryColor"
          ></v-text-field>

         <v-autocomplete :readonly="Boolean(savedNewMonitoring) || isSavingMonitoring" v-if="showtto3 == true" class="animate-fade-in-up" :items="getAllTreatments" item-text="name" v-model="ttoSelecionado" item-value="id" label="Próximo procedimiento o indicación (obligatorio)" aria-required="true" :error-messages="newMonitoringFieldError('next')" dense outlined :color="themePrimaryColor"></v-autocomplete>

          <p class="text-gray-500 text-sm">El próximo procedimiento o indicación puede ser Revisión de rutina o Sin retorno previsto. Este texto no agenda una cita.</p>
          <v-textarea
            v-model="objCita3.note" :readonly="Boolean(savedNewMonitoring) || isSavingMonitoring"
            label="Notas (opcional)"
            rows="3"
            dense
            outlined
            auto-grow
            :color="themePrimaryColor"
          ></v-textarea>

          <div class="flex justify-end flex-wrap gap-2">
              <button type="button" class="monitoring-dialog-action monitoring-dialog-action--save mt-5" :disabled="isSavingMonitoring" @click="onSaveMonitoring()">
                <v-icon small>mdi-content-save-outline</v-icon>
                <span>{{ isSavingMonitoring ? 'Guardando…' : savedNewMonitoring ? (scheduleNewAppointment && canManageAppointments ? 'Reintentar cita' : 'Cerrar sin agendar') : 'Guardar' }}</span>
              </button>
              <button type="button" :disabled="isSavingMonitoring" class="monitoring-dialog-action monitoring-dialog-action--close mt-5" @click="closeNewMonitoring()">
                <v-icon small>mdi-close</v-icon>
                <span>{{ savedNewMonitoring ? 'Cerrar' : 'Cancelar' }}</span>
              </button>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <da-dialog v-model="isDelete" :persist="true" :maxWidth="'500px'">
        <template #body>
            <da-sweet-confirm 
            :title="'Anular seguimiento'"
            :message="'Se conservarán el contenido y sus cambios para consulta. Esta acción no cancela las citas de la agenda.'"
            :lottiepath="DELETE"
            :iconwidth="150"
            :iconheight="150"
            confirmbtntext="Anular seguimiento"
            calcelbtntext="Conservar seguimiento"
            v-on:confirm="onDelete()" 
            v-on:close="isDelete = false">
          <template #content>
            <v-textarea v-model="cancellationReason" class="mt-4" label="Motivo de anulación (obligatorio)" outlined dense rows="2" maxlength="1000" />
            <p v-if="cancellationError" role="alert">{{ cancellationError }}</p>
          </template>
        </da-sweet-confirm>
        </template>
    </da-dialog>

    <v-dialog v-model="isNote" persistent max-width="860" content-class="monitoring-dialog-shell">
      <v-card class="monitoring-dialog-card">
        <div class="monitoring-dialog-header monitoring-dialog-header--detail">
          <span class="text-xl ml-5 mt-4">Detalle del seguimiento</span> 
          <v-btn icon :disabled="isSavingMonitoring" aria-label="Cerrar detalle del seguimiento" @click="closeModalEdit"><v-icon>mdi-close</v-icon></v-btn>
        </div>
        <v-card-text v-if="isReadOnly" class="monitoring-dialog-body monitoring-dialog-body--readonly">

          <p>Capturado por: {{ selectedMonitoring.author_name || selectedMonitoring.created_by || 'Autor no registrado' }} · Revisión {{ selectedMonitoring.revision || 1 }}</p>
          <p v-if="selectedMonitoring.status === 'cancelled'" role="status">Anulado: {{ selectedMonitoring.cancellation_reason }}</p>
          <follow-up-appointment :record="selectedMonitoring" />

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
            label="Fecha sugerida de próxima atención (opcional)"
            dense
            outlined
            readonly
            :color="themePrimaryColor"
          ></v-text-field>

          <v-text-field
            v-model ="objCita2.id_cat_treatment_after"
            label="Próximo procedimiento o indicación"
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
            <button v-if="!isEdit && canCorrectMonitoring && selectedMonitoring.status !== 'cancelled'" type="button" class="monitoring-dialog-action monitoring-dialog-action--edit mt-5" @click="changeButton()">
              <v-icon small>mdi-pencil-outline</v-icon>
              <span>Corregir</span>
            </button>
            <button v-if="isEdit && canCorrectMonitoring" type="button" class="monitoring-dialog-action monitoring-dialog-action--save mt-5" @click="onUPDMonitoring()">
              <v-icon small>mdi-content-save-outline</v-icon>
              <span>Guardar</span>
            </button>
            <button type="button" class="monitoring-dialog-action monitoring-dialog-action--close mt-5" @click="isNote = false">
              <v-icon small>mdi-close</v-icon>
              <span>Cerrar</span>
            </button>
      </div>
          <details @toggle="loadMonitoringRevisions($event)">
            <summary>Ver cambios conservados</summary>
            <p v-if="revisionsLoading" role="status">Cargando cambios…</p>
            <p v-if="revisionsError" role="alert">{{ revisionsError }}</p>
            <p v-if="revisionsLoaded && !monitoringRevisions.length">Registro anterior al control de versiones; su contenido se conservará al corregirlo o anularlo.</p>
            <article v-for="revision in monitoringRevisions" :key="revision.id_tracing_revision">
              <strong>Revisión {{ revision.revision }} · {{ revisionAction(revision.action) }}</strong>
              <p>{{ revision.actor_name || revision.recorded_by || 'Autoría original conservada en el registro' }} · {{ revision.recorded_at }}</p>
              <p v-if="revision.change_reason">Motivo: {{ revision.change_reason }}</p>
              <p>Fecha: {{ displayMonitoringDate(revision.snapshot.quote_date_now) }} · Tratamiento: {{ revision.snapshot.treatment_now }}</p>
              <p>Próxima cita: {{ displayMonitoringDate(revision.snapshot.quote_date_after, 'Sin próxima cita') }} · {{ revision.snapshot.treatment_after }}</p>
              <p style="white-space: pre-wrap">{{ revision.snapshot.note }}</p>
            </article>
          </details>
        </v-card-text>

        <v-card-text v-else class="monitoring-dialog-body monitoring-dialog-body--edit">
          <p>Se conservará la versión anterior junto con tu corrección.</p>
          <p v-if="savedEditMonitoring" role="status">La corrección ya está guardada. Sólo se reintentará la cita. La fecha sugerida guardada se conserva; consulta el horario final en Historial de citas.</p>
          <p v-if="!canManageAppointments" class="text-gray-500 text-sm">Puedes corregir el seguimiento. Para programar una cita pide apoyo a recepción o a una persona con acceso a Agenda.</p>
          <v-textarea v-model="correctionReason" :readonly="Boolean(savedEditMonitoring) || isSavingMonitoring" label="Motivo de corrección (obligatorio)" outlined dense rows="2" maxlength="1000" />
          <p v-if="correctionError" role="alert">{{ correctionError }}</p>

          <v-text-field
            v-model="objCita.quote_date_now" :readonly="Boolean(savedEditMonitoring) || isSavingMonitoring"
            type="date"
            label="Fecha actual"
            dense
            outlined
            :color="themePrimaryColor"
          ></v-text-field>

          <div v-if="!savedEditMonitoring && !isSavingMonitoring" class="w-ful text-right">
            <button type="button" class="monitoring-treatment-toggle" :aria-pressed="String(!showtto1)" aria-label="Cambiar captura del tratamiento realizado" @click="showtto1 = !showtto1">{{ showtto1 ? 'Seleccionar tratamiento' : 'Escribir tratamiento' }}</button>
          </div>

          <v-text-field
              v-show="showtto1 == true"
              v-model="objCita.id_cat_treatment_now" :readonly="Boolean(savedEditMonitoring) || isSavingMonitoring"
              class="animate-fade-in-up"
              label="Tratamiento realizado"
              dense
              outlined
              :color="themePrimaryColor"
          ></v-text-field>

          <v-autocomplete :readonly="Boolean(savedEditMonitoring) || isSavingMonitoring" v-show="showtto1 == false" class="animate-fade-in-up" :items="performedTreatmentOptions" item-text="name" v-model="ttoSelecionado2" item-value="id" label="Tratamiento realizado" dense outlined :color="themePrimaryColor"></v-autocomplete>
          <div v-if="canManageAppointments && !editAppointmentRequested" class="monitoring-schedule-panel p-4">
            <p>Corregir el seguimiento no cambia las citas existentes.</p>
            <p v-if="editAppointmentLookupError" role="alert" class="text-red-700">{{ editAppointmentLookupError }}</p>
            <button type="button" class="monitoring-dialog-action monitoring-dialog-action--edit" :disabled="isLoading || isSavingMonitoring" @click="requestEditAppointment()">{{ editLinkedAppointment ? 'Modificar cita vinculada' : 'Agendar nueva cita' }}</button>
            <p v-if="!editLinkedAppointment" class="text-gray-500 text-sm mt-2">Las citas completadas, canceladas o reprogramadas se conservan en el historial.</p>
          </div>
          <v-text-field
            v-if="canManageAppointments && editAppointmentRequested"
            v-model="objCita.quote_date_after"
            type="date"
            label="Fecha de la cita"
            :readonly="isSavingMonitoring"
            dense
            outlined
            :color="themePrimaryColor"
            @input="onEditAppointmentDateChange($event)"
          ></v-text-field>

          <div v-if="canManageAppointments && editAppointmentRequested" class="monitoring-schedule-panel mt-2 mb-5 border border-gray-200 bg-gray-50 p-4">
            <button type="button" :disabled="isSavingMonitoring" class="monitoring-dialog-action monitoring-dialog-action--close mb-3" @click="cancelAppointmentChange()">Dejar agenda sin cambios</button>
            <v-select :disabled="isSavingMonitoring" v-model="appointmentDoctorId" :items="appointmentDoctors" item-text="display_name" item-value="id_doctor_professional_profile" label="Doctor de la proxima cita" :readonly="appointmentDoctors.length === 1" outlined dense :color="themePrimaryColor" @change="onAppointmentDoctorChange"></v-select>
            <p v-if="appointmentDataLoading" role="status">Consultando disponibilidad…</p><p v-if="appointmentDataError" role="alert" class="text-red-700">{{ appointmentDataError }}</p>
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
              <div>
                <p class="m-0 text-gray-700 font-semibold">Hora de próxima cita</p>
                <p class="m-0 text-gray-500 text-sm">Solo se muestran horarios disponibles según la agenda configurada.</p>
              </div>
              <v-chip v-if="selectedEditAppointmentTime" color="#FFF3CD" text-color="#8A5A00" small>{{ editLinkedAppointment ? appointmentStatusLabel(editLinkedAppointment.status) : 'Pendiente de confirmar' }}</v-chip>
            </div>
            <div v-if="availableEditAppointmentSlots.length > 0" class="flex flex-wrap gap-2">
              <button
                v-for="slot in availableEditAppointmentSlots"
                :key="slot.startTime"
                type="button"
                class="monitoring-slot px-3 py-2 border text-sm font-semibold focus:outline-none"
                :class="selectedEditAppointmentTime === slot.startTime ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-green-700 border-green-200'"
                @click="selectEditAppointmentSlot(slot)" :disabled="isSavingMonitoring"
              >
                {{ slot.startTime }}
              </button>
            </div>
            <p v-else class="m-0 text-sm text-gray-500">Selecciona una fecha con horarios disponibles.</p>
            <p v-if="selectedEditAppointmentTime" class="m-0 mt-3 text-sm text-gray-700">
              Cita seleccionada: {{ objCita.quote_date_after }} a las {{ selectedEditAppointmentTime }}.
            </p>
          </div>

          <div v-if="!savedEditMonitoring && !isSavingMonitoring" class="w-ful text-right">
            <button type="button" class="monitoring-treatment-toggle" :aria-pressed="String(!showtto)" aria-label="Cambiar captura del próximo procedimiento" @click="showtto = !showtto">{{ showtto ? 'Seleccionar tratamiento' : 'Escribir tratamiento' }}</button>
          </div>

          <v-text-field
            v-show="showtto == true"
            v-model ="objCita.id_cat_treatment_after" :readonly="Boolean(savedEditMonitoring) || isSavingMonitoring"
            class="animate-fade-in-up"
            label="Próximo procedimiento o indicación"
            dense
            outlined
            :color="themePrimaryColor"
          ></v-text-field>

         <v-autocomplete :readonly="Boolean(savedEditMonitoring) || isSavingMonitoring" v-show="showtto == false" class="animate-fade-in-up" :items="getAllTreatments" item-text="name" v-model="ttoSelecionado3" item-value="name" label="Próximo procedimiento o indicación" dense outlined :color="themePrimaryColor"></v-autocomplete>

          <p class="text-gray-500 text-sm">El próximo procedimiento o indicación puede ser Revisión de rutina o Sin retorno previsto; no implica agendar una cita.</p>
          <v-textarea
            v-model="objCita.note" :readonly="Boolean(savedEditMonitoring) || isSavingMonitoring"
            label="Notas"
            rows="3"
            dense
            outlined
            auto-grow
            :color="themePrimaryColor"
          ></v-textarea>

      <div class="flex justify-end flex-wrap gap-2">
            <button type="button" class="monitoring-dialog-action monitoring-dialog-action--save mt-5" :disabled="isSavingMonitoring" @click="onUPDMonitoring()">
              <v-icon small>mdi-content-save-outline</v-icon>
              <span>{{ isSavingMonitoring ? 'Guardando…' : savedEditMonitoring && editAppointmentRequested ? 'Reintentar cita' : 'Guardar' }}</span>
            </button>
            <button type="button" class="monitoring-dialog-action monitoring-dialog-action--close mt-5" @click="cancelEditButton()" :disabled="isSavingMonitoring">
              <v-icon small>mdi-close</v-icon>
              <span>{{ savedEditMonitoring ? 'Cerrar' : 'Cancelar' }}</span>
            </button>
      </div>
        </v-card-text>

      </v-card>
    </v-dialog>

  </div> 

</template>

<script>
import FollowUpAppointment from './FollowUpAppointment.vue';
import { keepAgendaReturn, peekAgendaReturn } from '../../../domain/appointments/agendaNavigation';
import { newAgendaRequestId, clinicClock } from '../../../domain/appointments/agendaInteraction';
import { mapActions, mapGetters } from 'vuex';
import { uuid } from 'vue-uuid';
import VuexMixin from '../../../mixins/VuexMixin';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import DASweetConfirm from '../../../core/components/form/dialog/components/DASweetConfirm.vue';
import { DAAppointmentService } from '../../../services/context/core-proccess-context';
import DAMonitoringService from '../../../services/core/monitoring/DAMonitoringService';
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
            selectedMonitoring: {}, cancelRevision: null, cancellationReason: '', cancellationError: '',
            followUpAgendaRequests: {},
            correctionReason: '', correctionError: '', monitoringRevisions: [], revisionsLoading: false,
            revisionsError: '', revisionsLoaded: false,
            newTracingId: '', savedNewMonitoring: null, newMonitoringError: '', newMonitoringSubmitted: false, isSavingMonitoring: false, scheduleNewAppointment: false,
            savedEditMonitoring: null, editAppointmentRequested: false, editAppointmentLookupError: '', editCreatesNewAppointment: false,
            appointmentHistoryRequest: 0, nextPatientAppointment: null,
            appointmentConfig: getAppointmentConfig(),
            appointmentDoctors: [], appointmentDoctorId: '', appointmentDataLoading: false, appointmentDataError: '', appointmentDataRequest: 0,
            appointments: getAppointments(),
            selectedAppointmentTime: '',
            selectedAppointmentEndTime: '',
            selectedEditAppointmentTime: '',
            selectedEditAppointmentEndTime: '',
            editLinkedAppointment: null,
            originalEditNextDate: '',
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
      FollowUpAppointment,
        'da-sweet-confirm': DASweetConfirm
    },
  created() {
      this.isLoading = true
      this.init()
      this.isLoading = false
  },
  computed: {
    ...mapGetters(moduleTypes.AUTH, { authUser: fnTypes.getUser, hasPermission: fnTypes.hasPermission }),
    canCreateMonitoring() { return this.hasPermission('px.tab.monitoring') && this.hasPermission('tracing.create') },
    canCorrectMonitoring() { return this.hasPermission('px.tab.monitoring') && this.hasPermission('tracing.correct') },
    canCancelMonitoring() { return this.hasPermission('px.tab.monitoring') && this.hasPermission('tracing.cancel') },
    canManageAppointments() { return this.hasPermission('px.dates') || this.hasPermission('admin.config') },
    canViewAppointmentHistory() { return this.hasPermission('px.tab.monitoring') || this.canManageAppointments },
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
      return this.isUpcomingAppointment(this.nextPatientAppointment) ? this.nextPatientAppointment : null
    },

    performedTreatmentOptions() {
      const treatments = Array.isArray(this.getAllTreatments) ? this.getAllTreatments : []
      const original = this.selectedMonitoring || {}
      if (!original.id_patient_treatment) return treatments
      return [{ id: original.id_patient_treatment, name: original.treatment_now }]
        .concat(treatments.filter(item => String(item.id) !== String(original.id_patient_treatment)))
    },

    themePrimaryColor: function() {
      return 'var(--color-primary-700)'
    },

    availableNewAppointmentSlots: function() {
      if (!this.canManageAppointments) return []
      if(!this.appointmentDoctorId || this.appointmentDataLoading || this.appointmentDataError) return []
      if(!this.objCita3.quote_date_after) {
        return []
      }

      return generateDaySlots(
        this.objCita3.quote_date_after,
        this.appointmentConfig,
        this.appointments
      ).filter((slot) => slot.selectable).sort((a, b) => a.startTime.localeCompare(b.startTime))
    },

    availableEditAppointmentSlots: function() {
      if (!this.canManageAppointments || !this.editAppointmentRequested) return []
      if(!this.appointmentDoctorId || this.appointmentDataLoading || this.appointmentDataError) return []
      if(!this.objCita.quote_date_after) {
        return []
      }

      const linkedAppointmentId = this.editLinkedAppointment && this.editLinkedAppointment.id
        ? String(this.editLinkedAppointment.id)
        : ''
      const appointments = linkedAppointmentId
        ? this.appointments.filter((appointment) => String(appointment.id || '') !== linkedAppointmentId)
        : this.appointments

      return generateDaySlots(
        this.objCita.quote_date_after,
        this.appointmentConfig,
        appointments
      ).filter((slot) => slot.selectable).sort((a, b) => a.startTime.localeCompare(b.startTime))
    }
  },
  watch: {
    'px.person.id_person': function() {
      this.show = false
      this.isNote = false
      this.savedNewMonitoring = null
      this.savedEditMonitoring = null
      this.loadAppointmentHistory(true)
    },
    canViewAppointmentHistory(allowed) {
      if (allowed) this.loadAppointmentHistory(true)
      else { ++this.appointmentHistoryRequest; this.appointmentHistory = []; this.nextPatientAppointment = null; this.appointmentHistoryLoading = false }
    },
    canManageAppointments(allowed) {
      if (allowed) { this.loadAppointmentDoctors(); this.loadAppointmentHistory(true); return }
      ++this.appointmentDataRequest
      ++this.appointmentHistoryRequest
      this.appointmentHistory = []
      this.nextPatientAppointment = null
      this.appointmentDoctors = []
      this.appointments = []
      this.appointmentDoctorId = ''
      this.editAppointmentRequested = false
      this.scheduleNewAppointment = false
      this.selectedAppointmentTime = ''
      this.selectedEditAppointmentTime = ''
      this.appointmentDataLoading = false
      this.appointmentHistoryLoading = false
      if (this.canViewAppointmentHistory) this.loadAppointmentHistory(true)
    }
  },
  methods: {
      async openAgendaForFollowUp(item) {
        if(!(this.hasPermission('px.dates') || this.hasPermission('admin.config')) || !this.hasPermission('px.tab.monitoring') || item.status !== 'active' || !this.px.person || this.px.person.active === 0) return;
        const pending = peekAgendaReturn(this.$store);
        if(pending && pending.draft) { await this.$swal.fire({ icon: 'info', title: 'Tienes una captura en la agenda', text: 'Usa Volver a la agenda y termina esa captura antes de agendar otra atención.' }); return; }
        keepAgendaReturn(this.$store, { kind: 'follow-up', patientId: this.px.person.id_person, followUpId: item.id_tracing, date: toIsoDate(item.quote_date_after) || clinicClock(this.appointmentConfig.timezone).date, view: 'day' });
        await this.$router.push({ name: 'Citas' });
      },
    formatFecha,
    revertFormatFecha,
    ...mapActions(moduleTypes.MONITORING, [
        fnTypes.saveTracing,
        fnTypes.updTracing,
        fnTypes.getTracing,
        fnTypes.deleteTracing,
        fnTypes.getAllPxTreatment
      ]),

      async init(){
        this.onGetMonitoring()
        this.onGetAllTreatment()
        this.getCurrentDate()
        this.loadAppointmentHistory(true)
        await this.loadAppointmentDoctors()
      },

      async loadAppointmentDoctors() {
        if (!this.canManageAppointments) return
        const response = await DAAppointmentService.doctors()
        if(response && response.success && this.canManageAppointments) {
          this.appointmentDoctors = response.data || []
          const own = this.appointmentDoctors.find(d => d.id_login === (this.authUser || {}).id_login)
          this.appointmentDoctorId = own ? own.id_doctor_professional_profile : this.appointmentDoctors.length === 1 ? this.appointmentDoctors[0].id_doctor_professional_profile : ''
        }
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

        return formatDisplayDate(value)
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
        return Boolean(appointment && this.isActiveAppointment(appointment) && this.appointmentDateTime(appointment) >= new Date())
      },

      isActiveAppointment(appointment) {
        return Boolean(appointment && [APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.CONFIRMED].includes(appointment.status))
      },

      loadMoreAppointmentHistory: async function() {
        await this.loadAppointmentHistory(false)
      },

      loadAppointmentHistory: async function(reset) {
        const request = ++this.appointmentHistoryRequest
        const patientId = this.px && this.px.person ? this.px.person.id_person : ''
        if (!this.canViewAppointmentHistory || !patientId) {
          this.appointmentHistory = []
          this.nextPatientAppointment = null
          this.appointmentHistoryHasMore = false
          return
        }
        if (reset) {
          this.appointmentHistoryOffset = 0
          this.appointmentHistoryHasMore = false
          this.appointmentHistory = []
          this.nextPatientAppointment = null
        }
        this.appointmentHistoryLoading = true
        this.appointmentHistoryError = ''
        try {
          const responses = await Promise.all([
            DAAppointmentService.patientHistory(patientId, { limit: this.appointmentHistoryLimit, offset: this.appointmentHistoryOffset }),
            reset ? DAAppointmentService.patientHistory(patientId, { upcoming_from: clinicClock(this.appointmentConfig.timezone).date, upcoming_time: clinicClock(this.appointmentConfig.timezone).time, limit: 1, offset: 0 }) : Promise.resolve(null)
          ])
          if (request !== this.appointmentHistoryRequest || !this.canViewAppointmentHistory || this.px.person.id_person !== patientId) return
          const response = responses[0]
          if (!response || !response.success) throw new Error(response && response.message || 'No se pudo cargar el historial de citas.')
          const payload = response.data || {}
          const appointments = Array.isArray(payload.appointments) ? payload.appointments : (Array.isArray(payload) ? payload : [])
          this.appointmentHistory = reset ? appointments : this.appointmentHistory.concat(appointments)
          const pagination = payload.pagination || {}
          this.appointmentHistoryHasMore = Boolean(pagination.hasMore)
          this.appointmentHistoryOffset = pagination.nextOffset !== undefined ? pagination.nextOffset : this.appointmentHistory.length
          if (reset && responses[1] && responses[1].success) {
            const future = responses[1].data || {}
            const rows = Array.isArray(future.appointments) ? future.appointments : (Array.isArray(future) ? future : [])
            this.nextPatientAppointment = rows.find(appointment => this.isUpcomingAppointment(appointment)) || null
          }
        } catch (error) {
          if (request === this.appointmentHistoryRequest) this.appointmentHistoryError = error.message || 'No se pudo cargar el historial de citas.'
        } finally {
          if (request === this.appointmentHistoryRequest) this.appointmentHistoryLoading = false
        }
      },

      onDelete: async function(){
        if (!this.canCancelMonitoring || this.isLoading) return
        if (!this.cancellationReason.trim()) { this.cancellationError = 'Escribe el motivo de anulación.'; return }
        this.cancellationError = ''
        this.isLoading = true
        let data = {
          "id_tracing": this.ida,
          "id_person":  this.px.person.id_person,
          revision: this.cancelRevision, change_reason: this.cancellationReason
        }
        const response = await this.deleteTracing(data)
        if (response && response.success) {
          await this.onGetMonitoring()
          this.isDelete = false
          this.toastFunction('success', response.message)
        } else this.cancellationError = response && response.message ? response.message : 'No se pudo anular; vuelve a intentar.'
        this.isLoading = false
      },

      newMonitoringFieldError(kind) {
        if(!this.newMonitoringSubmitted || this.savedNewMonitoring) return []
        const performed = kind === 'performed'
        const useCatalog = performed ? this.showtto2 : this.showtto3
        const selected = performed ? this.ttoSelecionado1 : this.ttoSelecionado
        const text = performed ? this.objCita3.id_cat_treatment_now : this.objCita3.id_cat_treatment_after
        const value = useCatalog ? (this.getAllTreatments.find(item => String(item.id) === String(selected)) || {}).name : text
        return String(value || '').trim() ? [] : [performed ? 'Indica el tratamiento realizado.' : 'Indica el próximo procedimiento o escribe Sin retorno previsto.']
      },

      onSaveMonitoring: async function(){
        if (!this.canCreateMonitoring || this.isLoading || this.isSavingMonitoring) return
        this.newMonitoringSubmitted = true
        this.newMonitoringError = ''
        const performed = this.getAllTreatments.find(item => String(item.id) === String(this.ttoSelecionado1))
        const next = this.getAllTreatments.find(item => String(item.id) === String(this.ttoSelecionado))
        const treatmentNow = String(this.showtto2 ? performed && performed.name || '' : this.objCita3.id_cat_treatment_now || '').trim()
        const treatmentAfter = this.savedNewMonitoring ? this.savedNewMonitoring.treatment_after
          : String(this.showtto3 ? next && next.name || '' : this.objCita3.id_cat_treatment_after || '').trim()
        if (!this.savedNewMonitoring && (!treatmentNow || !treatmentAfter)) {
          this.newMonitoringError = 'Escribe el procedimiento realizado y el próximo procedimiento o indicación. Puedes indicar Revisión de rutina o Sin retorno previsto.'
          return
        }
        const patientId = this.px.person.id_person
        const wantsAppointment = this.canManageAppointments && this.scheduleNewAppointment
        if (wantsAppointment && (!this.hasNextAppointmentDate(this.objCita3.quote_date_after) || !this.appointmentDoctorId || !this.selectedAppointmentTime || this.appointmentDataLoading || this.appointmentDataError)) {
          this.newMonitoringError = 'Selecciona doctor, fecha y un horario disponible para agendar. También puedes desmarcar Agendar próxima cita para guardar sólo el seguimiento.'
          return
        }
        this.isLoading = true
        this.isSavingMonitoring = true
        try {
          if (!this.savedNewMonitoring) {
            if (!this.newTracingId) this.newTracingId = uuid.v4()
            const row = {
              id_tracing: this.newTracingId,
              quote_date_now: this.formatFecha(this.objCita3.quote_date_now || this.dateNow),
              treatment_now: treatmentNow,
              id_patient_treatment: this.showtto2 && performed ? performed.id : null,
              quote_date_after: wantsAppointment ? this.formatFecha(this.objCita3.quote_date_after) : '00-00-0000',
              treatment_after: treatmentAfter,
              note: this.objCita3.note
            }
            const response = await this.saveTracing({ tracing: [row], id_person: patientId })
            if (this.px.person.id_person !== patientId || !this.canCreateMonitoring) return
            if (!response || !response.success || !this.extractMonitoringId(response)) {
              this.newMonitoringError = response && response.message || 'No se confirmó el guardado. Reintenta con esta misma captura.'
              return
            }
            const confirmed = Array.isArray(response.data) ? response.data[0] : response.data
            this.savedNewMonitoring = { ...row, ...(confirmed || {}), id_tracing: this.extractMonitoringId(response) }
          }
          if (wantsAppointment) {
            const synced = await this.createFollowUpAppointment(this.savedNewMonitoring.treatment_after, this.savedNewMonitoring.id_tracing)
            if (!synced) {
              this.newMonitoringError = this.newMonitoringError || 'Seguimiento guardado; la cita sigue pendiente. Reintenta sólo la cita o cierra para programarla después.'
              return
            }
          }
          this.show = false
          this.toastFunction('success', wantsAppointment ? 'Seguimiento y cita guardados.' : 'Seguimiento guardado sin crear una cita.')
          await this.onGetMonitoring()
        } catch (error) {
          this.newMonitoringError = this.savedNewMonitoring
            ? 'Seguimiento guardado; no se confirmó la cita. Reintenta sólo la cita.'
            : 'No se confirmó el guardado. Reintenta con esta misma captura.'
        } finally { this.isLoading = false; this.isSavingMonitoring = false }
      },

      onUPDMonitoring: async function(){
        if (!this.canCorrectMonitoring || this.isLoading || this.isSavingMonitoring || this.selectedMonitoring.status === 'cancelled') return
        if (!this.savedEditMonitoring && !this.correctionReason.trim()) { this.correctionError = 'Escribe el motivo de corrección.'; return }
        this.correctionError = ''
        const performed = this.performedTreatmentOptions.find(item => String(item.id) === String(this.ttoSelecionado2))
        const next = this.getAllTreatments.find(item => item.name === this.ttoSelecionado3)
        const treatmentNow = String(this.showtto1 ? this.objCita.id_cat_treatment_now || '' : performed && performed.name || '').trim()
        const treatmentAfter = this.savedEditMonitoring ? this.savedEditMonitoring.treatment_after
          : String(this.showtto ? this.objCita.id_cat_treatment_after || '' : next && next.name || this.objCita.id_cat_treatment_after || '').trim()
        if (!this.savedEditMonitoring && (!treatmentNow || !treatmentAfter)) {
          this.correctionError = 'Escribe el procedimiento realizado y el próximo procedimiento o indicación.'
          return
        }
        const patientId = this.px.person.id_person
        const tracingId = this.idtracing
        const syncAppointment = this.canManageAppointments && this.editAppointmentRequested
        if (syncAppointment && (!this.hasNextAppointmentDate(this.objCita.quote_date_after) || !this.appointmentDoctorId || !this.selectedEditAppointmentTime || this.appointmentDataLoading || this.appointmentDataError)) {
          this.correctionError = 'Selecciona doctor, fecha y un horario disponible, o cancela el cambio de agenda.'
          return
        }
        this.isLoading = true
        this.isSavingMonitoring = true
        try {
          if (!this.savedEditMonitoring) {
            const row = {
              id_tracing: this.idtracing,
              revision: this.selectedMonitoring.revision,
              change_reason: this.correctionReason,
              quote_date_now: this.formatFecha(this.objCita.quote_date_now || this.dateNow),
              treatment_now: treatmentNow,
              id_patient_treatment: this.showtto1 ? null : performed && performed.id || null,
              quote_date_after: syncAppointment ? this.formatFecha(this.objCita.quote_date_after)
                : this.selectedMonitoring.quote_date_after || '00-00-0000',
              treatment_after: treatmentAfter,
              note: this.objCita.note
            }
            const response = await this.updTracing({ tracing: [row], id_person: patientId })
            if (this.px.person.id_person !== patientId || this.idtracing !== tracingId || !this.canCorrectMonitoring) return
            if (!response || !response.success) {
              this.correctionError = response && response.message || 'No se pudo guardar la corrección. Tu captura sigue abierta.'
              return
            }
            const updated = Array.isArray(response.data) ? response.data[0] : response.data
            this.savedEditMonitoring = { ...row, ...(updated || {}) }
            this.selectedMonitoring = { ...this.selectedMonitoring, ...this.savedEditMonitoring }
          }
          if (syncAppointment && !await this.syncEditedFollowUpAppointment(treatmentAfter)) {
            this.correctionError = this.correctionError || 'Corrección guardada; el cambio de cita sigue pendiente. Reintenta sólo la cita.'
            return
          }
          this.isReadOnly = true
          this.isEdit = false
          this.isNote = false
          await this.onGetMonitoring()
          this.toastFunction('success', syncAppointment ? 'Corrección y cita guardadas.' : 'Corrección guardada. La agenda no se modificó.')
        } catch (error) {
          this.correctionError = this.savedEditMonitoring ? 'Corrección guardada; no se confirmó la cita. Reintenta sólo la cita.' : 'No se confirmó la corrección. Tu captura sigue abierta.'
        } finally { this.isLoading = false; this.isSavingMonitoring = false }
      },

      onGetMonitoring: async function(){
        this.isLoading = true
        await this.ActionWrapp(moduleTypes.MONITORING, fnTypes.getTracing, this.px.person.id_person)
        this.citas = this.getMonitorings
        const query = this.$route.query || {}
        if(query.returnKey === 'pulse' && query.recordId) this.$nextTick(() => {
          const el = [...this.$el.querySelectorAll('[data-pulse-record]')].find(e => e.getAttribute('data-pulse-record') === query.recordId && e.getClientRects().length && e.offsetHeight)
          if(el) { el.style.outline = '3px solid #52749f'; el.scrollIntoView({block:'center'}); const button = el.querySelector('button'); if(button) button.focus({preventScroll:true}); }
        })
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
        if (!this.canCreateMonitoring || this.isSavingMonitoring) return
        this.newTracingId = uuid.v4()
        this.savedNewMonitoring = null
        this.scheduleNewAppointment = false
        this.newMonitoringError = ''
        this.showtto2 = false
        this.newMonitoringSubmitted = false
        this.showtto3 = false
        if (this.canManageAppointments) await this.reloadAppointmentData()
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
        if (!this.canManageAppointments) return
        this.objCita3.quote_date_after = date
        this.selectedAppointmentTime = ''
        this.selectedAppointmentEndTime = ''
        await this.reloadAppointmentData(date)
      },

      selectNewAppointmentSlot(slot) {
        if (!this.canManageAppointments) return
        this.selectedAppointmentTime = slot.startTime
        this.selectedAppointmentEndTime = slot.endTime
      },

      onEditAppointmentDateChange: async function(date) {
        if (!this.canManageAppointments || !this.editAppointmentRequested) return
        this.objCita.quote_date_after = date
        this.selectedEditAppointmentTime = ''
        this.selectedEditAppointmentEndTime = ''
        await this.reloadAppointmentData(date)
      },

      selectEditAppointmentSlot(slot) {
        if (!this.canManageAppointments || !this.editAppointmentRequested) return
        this.selectedEditAppointmentTime = slot.startTime
        this.selectedEditAppointmentEndTime = slot.endTime
      },

      prepareEditAppointmentData: async function() {
        this.editAppointmentRequested = false
        this.selectedEditAppointmentTime = ''
        this.selectedEditAppointmentEndTime = ''
        this.editLinkedAppointment = null
        if (!this.canManageAppointments) return
        await this.resolveLinkedFollowUpAppointment()
      },

      async requestEditAppointment() {
        if (!this.canManageAppointments || this.isLoading) return
        this.editAppointmentLookupError = ''
        const linked = await this.resolveLinkedFollowUpAppointment()
        if (this.editAppointmentLookupError) return
        this.editAppointmentRequested = true
        this.editCreatesNewAppointment = !linked
        this.objCita.quote_date_after = linked ? toIsoDate(linked.date) : ''
        if (linked) this.appointmentDoctorId = linked.doctorProfileId || ''
        await this.reloadAppointmentData(this.objCita.quote_date_after)
        this.selectedEditAppointmentTime = linked ? linked.startTime || '' : ''
        this.selectedEditAppointmentEndTime = linked ? linked.endTime || '' : ''
      },

      cancelAppointmentChange() {
        this.editAppointmentRequested = false
        this.objCita.quote_date_after = this.originalEditNextDate
        this.selectedEditAppointmentTime = ''
        this.selectedEditAppointmentEndTime = ''
      },

      findLinkedFollowUpAppointment(appointments) {
        const tracingId = String(this.idtracing || '')
        const patientId = String(this.px && this.px.person && this.px.person.id_person || '')
        if (!tracingId || !patientId || !Array.isArray(appointments)) return null
        const matching = appointments.filter(appointment => this.isActiveAppointment(appointment)
          && String(appointment.followUpId || '') === tracingId && String(appointment.patientId || '') === patientId)
        if (matching.length > 1) throw new Error('Hay más de una cita activa vinculada. Revisa las citas desde Agenda antes de modificarlas.')
        return matching[0] || null
      },

      hasMonitoringActionResult(value) {
        return Array.isArray(value) ? value.length > 0 : Boolean(value)
      },

      extractMonitoringId(value) {
        const payload = value && value.data !== undefined ? value.data : value
        if (Array.isArray(payload)) {
          const record = payload.find(item => item && item.id_tracing)
          return record ? record.id_tracing : ''
        }
        return payload && payload.id_tracing || ''
      },

      async resolveLinkedFollowUpAppointment() {
        if (!this.canManageAppointments) return null
        const patientId = this.px && this.px.person && this.px.person.id_person
        const tracingId = this.idtracing
        if (!patientId || !tracingId) return null
        this.editAppointmentLookupError = ''
        try {
          const response = await DAAppointmentService.patientHistory(patientId, { follow_up_id: tracingId, active_only: true, limit: 2 })
          if (!this.canManageAppointments || this.idtracing !== tracingId || this.px.person.id_person !== patientId) return null
          if (!response || !response.success) throw new Error(response && response.message || 'No se pudo comprobar la cita vinculada. Vuelve a intentar antes de modificar la agenda.')
          const payload = response.data || {}
          const appointments = Array.isArray(payload.appointments) ? payload.appointments : (Array.isArray(payload) ? payload : [])
          this.editLinkedAppointment = this.findLinkedFollowUpAppointment(appointments)
          return this.editLinkedAppointment
        } catch (error) {
          this.editAppointmentLookupError = error.message || 'No se pudo comprobar la cita vinculada.'
          return null
        }
      },

      reloadAppointmentData: async function(date) {
        const request = ++this.appointmentDataRequest
        if (!this.canManageAppointments) return
        this.appointmentConfig = getAppointmentConfig(); this.appointments = []; this.appointmentDataError = ''
        if(!this.appointmentDoctorId) { this.appointmentDataLoading = false; return }
        this.appointmentDataLoading = true
        try {
        const configResponse = await DAAppointmentService.getConfig(this.appointmentDoctorId)
        if(request !== this.appointmentDataRequest) return
        if(configResponse && configResponse.success && configResponse.data) {
          this.appointmentConfig = normalizeAppointmentConfig(configResponse.data)
          saveAppointmentConfig(this.appointmentConfig)
        }
        else {
          throw new Error(configResponse.message || 'No se pudo cargar la agenda del doctor.')
        }

        const targetDate = date || this.objCita3.quote_date_after || this.dateNow
        const listResponse = await DAAppointmentService.list({
          doctor_profile_id: this.appointmentDoctorId,
          date_from: toIsoDate(targetDate),
          date_to: toIsoDate(targetDate)
        })
        if(request !== this.appointmentDataRequest) return

        if(listResponse && listResponse.success) {
          this.appointments = listResponse.data || []
        }
        else {
          throw new Error(listResponse.message || 'No se pudo consultar la disponibilidad.')
        }
        } catch(error) { if(request === this.appointmentDataRequest)this.appointmentDataError = error.message }
        finally { if(request === this.appointmentDataRequest)this.appointmentDataLoading = false }
      },

      async onAppointmentDoctorChange() {
        if (!this.canManageAppointments) return
        this.selectedAppointmentTime = ''; this.selectedAppointmentEndTime = ''; this.selectedEditAppointmentTime = ''; this.selectedEditAppointmentEndTime = ''
        await this.reloadAppointmentData(this.isEdit ? this.objCita.quote_date_after : this.objCita3.quote_date_after)
      },

      agendaRequestFor(key) {
        if(!this.followUpAgendaRequests[key]) this.$set(this.followUpAgendaRequests,key,newAgendaRequestId())
        return this.followUpAgendaRequests[key]
      },
      createFollowUpAppointment: async function(treatmentAfter, followUpId) {
        if (!this.canManageAppointments) return false
        if(!this.selectedAppointmentTime || this.objCita3.quote_date_after === '00-00-0000') {
          return
        }

        const normalizedFollowUpId = followUpId
        if(!normalizedFollowUpId) {
          this.newMonitoringError = 'No se confirmó el identificador del seguimiento. Cierra y consulta el registro antes de agendar.'
          return false
        }

        const startTime = this.selectedAppointmentTime
        const endTime = this.selectedAppointmentEndTime || addMinutesToTime(startTime, this.appointmentConfig.defaultAppointmentDuration || 30)
        const patientName = `${this.px.person.name || ''} ${this.px.person.surname || ''}`.trim()
        const response = await DAAppointmentService.save({
          doctorProfileId: this.appointmentDoctorId,
          patientId: this.px.person.id_person,
          patientName,
          followUpId: normalizedFollowUpId,
          date: toIsoDate(this.objCita3.quote_date_after),
          startTime,
          endTime,
          status: APPOINTMENT_STATUSES.PENDING,
          title: treatmentAfter || 'Próxima cita',
          description: this.objCita3.note || '',
          source: 'follow_up',
          blocksAvailability: appointmentBlocksAvailability(APPOINTMENT_STATUSES.PENDING)
        }, { syncFollowUp: true, requestId: this.agendaRequestFor('new:' + normalizedFollowUpId) })

        if(response && response.success) {
          await this.reloadAppointmentData(this.objCita3.quote_date_after)
          await this.loadAppointmentHistory(true)
          this.toastFunction('success', response.message || 'Cita guardada. Consulta su horario en el historial de citas.')
          return true
        }

        this.newMonitoringError = 'Seguimiento guardado. ' + (response && response.message ? response.message : 'No se pudo crear la cita en agenda.')
        return false
      },

      syncEditedFollowUpAppointment: async function(treatmentAfter) {
        if (!this.canManageAppointments || !this.editAppointmentRequested) return false
        if(!this.selectedEditAppointmentTime || !this.hasNextAppointmentDate(this.objCita.quote_date_after)) {
          return true
        }

        const existingAppointment = this.editLinkedAppointment
        if (existingAppointment && !this.isActiveAppointment(existingAppointment)) {
          this.correctionError = 'Corrección guardada. Esta cita ya no está activa; consúltala en Agenda.'
          return false
        }
        if (!existingAppointment && !this.editCreatesNewAppointment) return false
        const startTime = this.selectedEditAppointmentTime
        const endTime = this.selectedEditAppointmentEndTime || addMinutesToTime(startTime, this.appointmentConfig.defaultAppointmentDuration || 30)
        const patientName = `${this.px.person.name || ''} ${this.px.person.surname || ''}`.trim()
        const status = existingAppointment && [
          APPOINTMENT_STATUSES.PENDING,
          APPOINTMENT_STATUSES.CONFIRMED
        ].includes(existingAppointment.status)
          ? existingAppointment.status
          : APPOINTMENT_STATUSES.PENDING

        const appointment = Object.assign({}, existingAppointment || {}, {
          doctorProfileId: this.appointmentDoctorId,
          patientId: this.px.person.id_person,
          patientName,
          followUpId: this.idtracing,
          date: toIsoDate(this.objCita.quote_date_after),
          startTime,
          endTime,
          status,
          title: treatmentAfter || 'Próxima cita',
          description: this.objCita.note || '',
          source: 'follow_up',
          blocksAvailability: appointmentBlocksAvailability(status)
        })

        const response = await DAAppointmentService.save(appointment, {
          syncFollowUp: true,
          explicitNewFollowUp: this.editCreatesNewAppointment,
          requestId: this.agendaRequestFor('edit:' + this.idtracing + ':' + (existingAppointment ? existingAppointment.id + ':' + existingAppointment.revision : 'new'))
        })

        if(response && response.success) {
          await this.reloadAppointmentData(this.objCita.quote_date_after)
          await this.loadAppointmentHistory(true)
          this.toastFunction('success', response.message || 'Cita guardada. Consulta su horario en el historial de citas.')
          return true
        }

        this.correctionError = 'Corrección guardada. ' + (response && response.message ? response.message : 'No se pudo actualizar la cita en agenda.')
        return false
      },

      showDelete(item){
        if (!this.canCancelMonitoring || item.status === 'cancelled') return
        this.ida = item.id_tracing
        this.cancelRevision = item.revision
        this.cancellationReason = ''
        this.cancellationError = ''
        this.isDelete = true
      },

      showModalData(obj){
        if (this.isSavingMonitoring) return
        this.selectedMonitoring = { ...obj }
        this.savedEditMonitoring = null
        this.editAppointmentRequested = false
        this.editCreatesNewAppointment = false
        this.editAppointmentLookupError = ''
        this.isReadOnly = true
        this.isEdit = false
        this.correctionReason = ''
        this.correctionError = ''
        this.monitoringRevisions = []
        this.revisionsLoaded = false
        this.revisionsError = ''
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
        this.ttoSelecionado2  =  obj.id_patient_treatment || ''
        this.ttoSelecionado3  =  obj.treatment_after
        this.selectedEditAppointmentTime = ''
        this.selectedEditAppointmentEndTime = ''
        this.editLinkedAppointment = null

        let proxTtoExisteEnLista = this.getAllTreatments.find((elemento) => elemento.name === obj.treatment_after);


        if(proxTtoExisteEnLista != undefined)
          {
            this.showtto = false
          }
          else {
            this.showtto = true
          }

        this.showtto1 = !obj.id_patient_treatment

        const quoteDateAfter = this.hasNextAppointmentDate(obj.quote_date_after) ? toIsoDate(obj.quote_date_after) : ''
        this.originalEditNextDate = quoteDateAfter
        this.objCita  = {...this.objCita2, quote_date_after: quoteDateAfter, quote_date_now: toIsoDate(obj.quote_date_now)};
      },

      changeButton: async function(){
        if (!this.canCorrectMonitoring || this.selectedMonitoring.status === 'cancelled') return
        this.isReadOnly = false
        this.isEdit = true
        this.isLoading = true
        await this.prepareEditAppointmentData(this.objCita.quote_date_after)
        this.isLoading = false
      },
      revisionAction(action) {
        return { created: 'Captura', corrected: 'Corrección', cancelled: 'Anulación', legacy_baseline: 'Contenido previo conservado' }[action] || action
      },
      async loadMonitoringRevisions(event) {
        if (!event.target.open || this.revisionsLoading || this.revisionsLoaded) return
        const id = this.idtracing
        this.revisionsLoading = true
        this.revisionsError = ''
        try {
          const response = await DAMonitoringService.revisions(this.px.person.id_person, id)
          if (this.idtracing !== id) return
          if (response && response.success) {
            this.monitoringRevisions = Array.isArray(response.data) ? response.data : []
            this.revisionsLoaded = true
          } else this.revisionsError = response && response.message ? response.message : 'No se pudieron consultar los cambios. Cierra y abre esta sección para reintentar.'
        } catch (error) {
          if (this.idtracing === id) this.revisionsError = 'No se pudieron consultar los cambios. Cierra y abre esta sección para reintentar.'
        } finally { this.revisionsLoading = false }
      },
      async closeNewMonitoring() {
        if (this.isSavingMonitoring) return
        this.show = false
        if (this.savedNewMonitoring) await this.onGetMonitoring()
      },

      async cancelEditButton(){
        if (this.isSavingMonitoring) return
        if (this.savedEditMonitoring) { this.isNote = false; await this.onGetMonitoring() }
        this.isReadOnly = true
        this.isEdit     = false
        this.showtto    = false
        this.showtto1   = false
        this.selectedEditAppointmentTime = ''
        this.selectedEditAppointmentEndTime = ''
        this.editLinkedAppointment = null
      },

      closeModalEdit(){
        if (this.isSavingMonitoring) return
        if (this.savedEditMonitoring) { this.cancelEditButton(); return }
        this.isEdit = false
        this.showtto = false
        this.showtto1 = false
        this.isReadOnly = true
        this.selectedEditAppointmentTime = ''
        this.selectedEditAppointmentEndTime = ''
        this.editLinkedAppointment = null
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

.monitoring-treatment-toggle { margin-bottom: 8px; padding: 7px 4px; color: var(--color-primary-900, #086783); font-weight: 600; font-size: .82rem; }
.monitoring-dialog-header > .v-btn { color: var(--color-text-muted, #64748b); flex-shrink: 0; }
.monitoring-dialog-card button:focus-visible { outline: 3px solid var(--color-primary-500, #0e7490); outline-offset: 3px; }

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

  .monitoring-mobile-meta > div {
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

  .monitoring-mobile-meta dd.monitoring-linked-care {
    overflow: visible;
    white-space: normal;
    overflow-wrap: anywhere;
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
