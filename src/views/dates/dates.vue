<template>
  <div class="px-4 md:px-8 py-5">
    <div class="bg-white border border-primary-200 shadow-xl">
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 px-6 py-5 border-b border-primary-200 bg-primary-100">
        <div>
          <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Agenda clinica</p>
          <h2 class="m-0 text-gray-700 text-2xl font-normal">Gestion de citas</h2>
          <p class="m-0 mt-2 text-gray-500 text-sm">Consulta citas, disponibilidad e historial.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <v-btn icon aria-label="Consultar semana anterior" @click="moveWeek(-7)">
            <v-icon color="#6B7280">mdi-chevron-left</v-icon>
          </v-btn>
          <v-text-field v-model="selectedDate" type="date" label="Fecha" dense outlined hide-details :color="themePrimaryColor" class="w-44"></v-text-field>
          <v-btn icon aria-label="Consultar semana siguiente" @click="moveWeek(7)">
            <v-icon color="#6B7280">mdi-chevron-right</v-icon>
          </v-btn>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn rounded outlined class="agenda-toolbar-button" :color="themePrimaryColor" v-bind="attrs" v-on="on" @click="goToday">Hoy</v-btn>
            </template>
            <span>Ir al día de hoy</span>
          </v-tooltip>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn rounded outlined class="agenda-toolbar-button" :color="themePrimaryColor" :loading="findingSlot" :disabled="!selectedDoctorId || agendaLoading || findingSlot || (selectedDoctor && selectedDoctor.active === 0)" v-bind="attrs" v-on="on" @click="findNextAvailable">Próximo libre</v-btn>
            </template>
            <span>Abrir una cita en el próximo horario disponible</span>
          </v-tooltip>
          <v-tooltip v-if="hasPermission('px.tab.monitoring')" bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn rounded depressed class="agenda-toolbar-button agenda-toolbar-follow-up" v-bind="attrs" v-on="on" @click="followUpDialog = true">Seguimientos</v-btn>
            </template>
            <span>Consultar seguimientos pendientes</span>
          </v-tooltip>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn rounded depressed class="agenda-toolbar-button" :color="themePrimaryColor" :disabled="!selectedDoctorId || agendaLoading || !!agendaError || (selectedDoctor && selectedDoctor.active === 0)" v-bind="attrs" v-on="on" @click="openManualAppointment()"><span class="text-white">Nueva cita</span></v-btn>
            </template>
            <span>Crear una cita y elegir su horario</span>
          </v-tooltip>
        </div>
      </div>

      <div class="px-6 py-4 border-b border-gray-200">
        <v-select v-if="doctors.length || agendaLoading || agendaError" v-model="selectedDoctorId" :items="doctors" item-text="display_name" item-value="id_doctor_professional_profile" label="Agenda del doctor" no-data-text="No hay doctores con perfil activo" :readonly="doctors.length === 1" :disabled="agendaLoading" outlined dense :color="themePrimaryColor" @change="changeCalendarDoctor"></v-select>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <strong v-if="selectedDoctor" class="text-gray-700">{{ selectedDoctor.display_name }}</strong>
          <v-btn v-if="canConfigureAgenda" outlined rounded class="agenda-toolbar-button agenda-config-button" :color="themePrimaryColor" @click="agendaConfigDialog = true"><v-icon small left>mdi-cog-outline</v-icon>Configurar agenda</v-btn>
        </div>
        <p v-if="agendaLoading" role="status">Cargando disponibilidad del doctor…</p>
        <p v-if="agendaNotice" role="status">{{ agendaNotice }}</p>
        <p v-if="agendaError" role="alert" class="text-red-700">{{ agendaError }} <button type="button" @click="doctors.length ? changeCalendarDoctor() : init()">Reintentar</button></p>
        <v-btn-toggle v-model="viewMode" mandatory aria-label="Vista de agenda" class="agenda-view-toggle mb-3">
          <v-btn value="day" small>Día</v-btn><v-btn value="week" small>Semana</v-btn><v-btn value="list" small>Lista</v-btn>
        </v-btn-toggle>
        <p class="text-sm text-gray-600">Zona del consultorio: {{ appointmentConfig.timezone }}</p>
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

      <div v-else-if="!agendaLoading && !agendaError && !selectedDoctorId" class="m-6 p-5 border border-gray-200 bg-gray-50 text-gray-600">
        {{ !selectedDoctorId ? 'Selecciona un doctor para consultar su disponibilidad.' : 'Esta agenda no esta disponible. Revisa su configuracion y los cierres del consultorio.' }}
      </div>

      <div v-else-if="!agendaLoading && !agendaError && viewMode === 'week'" class="p-4 overflow-x-auto" role="region" aria-label="Disponibilidad semanal" :aria-describedby="'agenda-week-description'" tabindex="0">
        <p id="agenda-week-description" class="sr-only" aria-live="polite">Agenda de {{ selectedDoctor && selectedDoctor.display_name }}. Semana del {{ formatDisplayDate(weekDates[0]) }} al {{ formatDisplayDate(weekDates[6]) }}. Cada horario indica su día, hora y estado.</p>
        <p v-if="weekTimeMarker" class="agenda-clock-note"><span class="agenda-clock-dot" aria-hidden="true"></span>Hora de referencia: {{ clinicNow.time }} · {{ formatDisplayDate(clinicNow.date) }} <span>(hora del consultorio)</span></p>
        <div class="agenda-grid min-w-agenda">
          <div class="sticky left-0 z-10 bg-white border-b border-r border-gray-200 py-3 px-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Hora</div>
          <div v-for="day in weekDates" :key="day" class="agenda-day-header border-b border-gray-200 py-3 px-2 text-center" :class="{ 'agenda-day-header-today': day === clinicNow.date }" :aria-current="day === clinicNow.date ? 'date' : null">
            <p class="agenda-day-name m-0 text-gray-700 font-semibold">{{ dayShortName(day) }} <span v-if="day === clinicNow.date" class="agenda-today-badge">Hoy</span></p>
            <p class="m-0 text-gray-500 text-xs">{{ formatDisplayDate(day) }}</p>
          </div>

          <template v-for="time in weekTimes">
            <div :key="`time-${time}`" class="agenda-hour-cell sticky left-0 z-10 bg-white border-r border-b border-gray-200 px-2 py-2 text-sm text-gray-500 font-semibold">
              {{ time }}
              <span v-if="weekTimeMarker && weekTimeMarker.time === time" class="agenda-now-label" :style="{ top: weekTimeMarker.offset + '%' }" aria-hidden="true">{{ clinicNow.time }}</span>
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
              <span v-if="weekTimeMarker && weekTimeMarker.time === time" class="agenda-now-line" :class="{ 'agenda-now-line-today': day === clinicNow.date }" :style="{ top: weekTimeMarker.offset + '%' }" aria-hidden="true"></span>
            </button>
          </template>
        </div>
      </div>
      <section v-if="selectedDoctorId && !agendaLoading && !agendaError" class="agenda-events" aria-label="Citas y horarios">
        <h3>{{ viewMode === 'day' ? 'Agenda del día · ' + formatDisplayDate(selectedDate) : 'Citas e historial de la semana' }}</h3>
        <p v-if="!appointmentConfig.enabled || appointmentConfig.businessEnabled === false || (selectedDoctor && selectedDoctor.active === 0)" role="status">Agenda cerrada o doctor inactivo. Las citas guardadas se conservan para su consulta y cierre.</p>
        <p v-if="viewMode === 'day'" class="text-sm text-gray-600">Selecciona un horario disponible para crear una cita.</p>
        <p v-if="!agendaEntries.length">{{ viewMode === 'day' ? 'No hay citas ni horarios disponibles para este día.' : 'No hay citas en este periodo.' }}</p>
        <div v-for="entry in agendaEntries" :key="entry.key" class="agenda-event-row" :class="{ 'agenda-event-row-timed': viewMode !== 'week' }">
          <div v-if="viewMode !== 'week'" class="agenda-event-time" aria-hidden="true">
            <strong>{{ entry.slot.startTime }}</strong>
            <span>{{ entry.slot.endTime }}</span>
          </div>
          <button type="button" class="agenda-event" :class="{ 'agenda-event-free': !entry.appointment && entry.slot.selectable }" :style="slotStyle(entry.slot)" :disabled="!entry.appointment && !entry.slot.selectable" @click="entry.appointment ? openAppointment(entry.appointment) : onSlotClick(entry.slot)">
          <span v-if="viewMode !== 'week'" class="sr-only">{{ entry.slot.startTime }} a {{ entry.slot.endTime }}.</span>
          <div class="agenda-event-heading">
            <strong>{{ formatDisplayDate(entry.slot.date) }}<template v-if="viewMode === 'week'"> · {{ entry.slot.startTime }}–{{ entry.slot.endTime }}</template></strong>
            <span class="agenda-event-status">{{ statusLabel(entry.slot.status) }}</span>
          </div>
          <span v-if="entry.appointment">{{ entry.appointment.patientName || entry.appointment.title }}</span>
          <span v-else-if="entry.slot.selectable" class="agenda-event-create"><v-icon small color="inherit">mdi-plus-circle-outline</v-icon> Agregar cita</span>
          <span v-else>{{ entry.slot.reason || 'Horario no disponible' }}</span>
          <small v-if="entry.appointment && isOutsideSchedule(entry.appointment)">Fuera del horario actual</small>
          </button>
        </div>
      </section>
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

    <v-dialog v-model="appointmentDialog" persistent max-width="720" @keydown.esc="closeDialog()">
      <v-card class="appointment-card">
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
          <v-select v-model="editingAppointment.doctorProfileId" :items="doctors.filter(d => d.active !== 0 || d.id_doctor_professional_profile === editingAppointment.doctorProfileId)" item-text="display_name" item-value="id_doctor_professional_profile" label="Doctor que atendera *" :readonly="doctors.length === 1" outlined dense :color="themePrimaryColor" :disabled="dialogLoading || savingAppointment || !!pendingSave || isReadOnlyAppointment" @change="loadDialogDoctor(true)"></v-select>
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
            <v-text-field v-model="editingAppointment.date" type="date" label="Fecha" outlined dense :color="themePrimaryColor" :disabled="dialogLoading || savingAppointment || !!pendingSave || isReadOnlyAppointment" @change="loadDialogDoctor(true)"></v-text-field>
            <v-select v-model="editingAppointment.startTime" :disabled="dialogLoading || savingAppointment || !!pendingSave || isReadOnlyAppointment" :items="dialogAvailableTimes" item-text="label" item-value="value" label="Hora" outlined dense :color="themePrimaryColor" @change="refreshDialogEndTime"></v-select>
            <v-text-field :value="editingAppointment.endTime" label="Fin" outlined dense readonly :color="themePrimaryColor" :disabled="savingAppointment || !!pendingSave || isReadOnlyAppointment"></v-text-field>
            <v-select v-model="editingAppointment.status" :items="editingAppointment.status === 'rescheduled' ? appointmentStatusOptions.concat([{value:'rescheduled',text:'Reprogramada'}]) : appointmentStatusOptions" item-text="text" item-value="value" label="Estado" outlined dense :color="themePrimaryColor" @change="syncBlocksAvailability" :disabled="savingAppointment || !!pendingSave || !!(originalAppointment && originalAppointment.status === 'rescheduled')"></v-select>
          </div>

          <v-autocomplete
            v-model="editingAppointment.patientId"
            :items="patientOptions"
            :search-input.sync="patientSearchInput"
            :loading="patientSearchLoading"
            item-text="name"
            item-value="id"
            label="Paciente registrado (opcional)"
            :readonly="!!editingAppointment.id"
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
           :disabled="savingAppointment || !!pendingSave || isReadOnlyAppointment">
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

          <v-text-field v-model="editingAppointment.patientName" label="Nombre del paciente" hint="Usa este campo si es paciente nuevo o no tiene expediente." persistent-hint outlined dense :color="themePrimaryColor" :disabled="savingAppointment || !!pendingSave || isReadOnlyAppointment"></v-text-field>
          <v-select v-model="phoneCountry" :items="contactCountries" label="Pais del telefono" outlined dense :disabled="savingAppointment || !!pendingSave || isReadOnlyAppointment"></v-select>
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
               :disabled="savingAppointment || !!pendingSave || isReadOnlyAppointment"></v-text-field>
              <v-tooltip bottom>
                <template #activator="{ on, attrs }">
                  <span
                    class="appointment-whatsapp-trigger"
                    v-bind="attrs"
                    v-on="on"
                  >
                    <button
                      type="button"
                      class="appointment-whatsapp-button" aria-label="Vista previa de contacto por WhatsApp"
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
          <v-text-field v-model="editingAppointment.title" label="Motivo o titulo" outlined dense :color="themePrimaryColor" :disabled="savingAppointment || !!pendingSave || isReadOnlyAppointment"></v-text-field>
          <v-textarea v-model="editingAppointment.description" label="Descripcion" outlined dense :color="themePrimaryColor" rows="3" :disabled="savingAppointment || !!pendingSave || isReadOnlyAppointment"></v-textarea>
          <v-textarea v-if="editingAppointment.status === 'cancelled'" v-model="editingAppointment.cancellationReason" label="Motivo de cancelacion" outlined dense :color="themePrimaryColor" rows="2" :disabled="savingAppointment || !!pendingSave || isReadOnlyAppointment"></v-textarea>

          <p v-if="dialogError" role="alert" class="text-red-600 font-semibold">{{ dialogError }}</p>
          <p v-if="editingAppointment.status === 'rescheduled'" role="status">Reprogramacion: la cita original y su sustitucion se guardaran juntas.</p>
          <div v-if="pendingSave" role="status"><p>Hay una operacion sin resultado confirmado. Reintenta para recuperar su resultado antes de cambiar los datos.</p></div>
          <div v-if="conflictAppointment" role="alert"><p>Version vigente: {{ statusLabel(conflictAppointment.status) }} · {{ conflictAppointment.date }} {{ conflictAppointment.startTime }}–{{ conflictAppointment.endTime }}. Tu captura sigue abierta.</p><v-btn small @click="useCurrentAppointment">Descartar captura y usar version vigente</v-btn></div>
          <div v-if="editingAppointment.id" class="agenda-detail-tools">
            <v-btn v-if="editingAppointment.status !== 'rescheduled'" small outlined class="appointment-status-action" :style="statusActionStyle('rescheduled')" :disabled="savingAppointment || !!pendingSave || isReadOnlyAppointment" @click="startReschedule">Reprogramar</v-btn>
            <v-btn v-for="state in ['confirmed','completed','no_show']" :key="state" small outlined class="appointment-status-action" :class="{ 'appointment-status-current': editingAppointment.status === state }" :style="statusActionStyle(state)" :aria-label="statusLabel(state) + (editingAppointment.status === state ? ', estado seleccionado' : '')" :disabled="savingAppointment || !!pendingSave || editingAppointment.status === 'rescheduled'" @click="quickStatus(state)"><v-icon v-if="editingAppointment.status === state" small left>mdi-check-circle-outline</v-icon>{{ statusLabel(state) }}</v-btn>
            <v-btn v-if="editingAppointment.rescheduledFromAppointmentId" small text @click="openLinkedAppointment(editingAppointment.rescheduledFromAppointmentId)">Ver cita original</v-btn>
            <v-btn v-if="editingAppointment.rescheduledToAppointmentId" small text @click="openLinkedAppointment(editingAppointment.rescheduledToAppointmentId)">Ver cita destino</v-btn>
          </div>
          <details v-if="editingAppointment.id" @toggle="$event.target.open && loadAudit()">
            <summary>Historial de cambios</summary><p v-if="auditLoading" role="status">Cargando cambios…</p><p v-if="auditError" role="alert">{{ auditError }}</p>
            <p v-if="!auditLoading && !auditItems.length">Sin cambios registrados desde la activacion del historial.</p>
            <p v-for="entry in auditItems" :key="entry.id">Revision {{ entry.revision }} · {{ entry.actorName || 'Usuario del consultorio' }} · {{ entry.createdAt }}<br>{{ auditSummary(entry) }}</p>
            <v-btn v-if="auditNext" small @click="loadAudit(true)">Ver cambios anteriores</v-btn>
          </details>
        </v-card-text>

        <v-card-actions class="appointment-dialog-actions px-6 pb-5 justify-end">
          <da-button-secondary @click.native="closeDialog()" :label="'Cerrar'" rxl swpr class="appointment-dialog-action py-1 px-4 font-light"></da-button-secondary>
          <da-button-900 v-if="editingAppointment.id && !(originalAppointment && originalAppointment.status === 'rescheduled')" :disabled="savingAppointment || !!pendingSave || isReadOnlyAppointment" @click.native="cancelAppointment()" :label="'Cancelar cita'" :style="statusActionStyle('cancelled')" rxl swpr class="appointment-dialog-action appointment-status-action py-1 px-4 font-light"></da-button-900>
          <da-button-primary v-if="!(originalAppointment && originalAppointment.status === 'rescheduled')" :disabled="dialogLoading || savingAppointment" @click.native="saveAppointment()" :label="savingAppointment ? 'Guardando…' : pendingSave ? 'Reintentar operacion' : 'Guardar'" rxl swpr class="appointment-dialog-action py-1 px-4 font-light"></da-button-primary>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="leaveDialog" persistent max-width="480">
      <v-card><v-card-title>Cambios sin guardar</v-card-title><v-card-text>{{ pendingSave ? 'El resultado de la operacion no esta confirmado. Reintenta antes de salir para evitar iniciar otra reserva.' : 'Tu captura se perdera si la descartas.' }}</v-card-text><v-card-actions class="agenda-detail-tools"><v-btn @click="keepEditing">Seguir editando</v-btn><v-btn color="error" @click="discardDraft">Descartar y salir</v-btn></v-card-actions></v-card>
    </v-dialog>
    <v-dialog v-model="contactPreview" max-width="480">
      <v-card><v-card-title>Revisar destinatario</v-card-title><v-card-text>Se abrira WhatsApp para {{ contactTarget }}. Revisa el numero antes de continuar.</v-card-text><v-card-actions><v-btn @click="contactPreview = false">Volver</v-btn><v-btn :href="contactUrl" target="_blank" rel="noopener noreferrer" @click="contactPreview = false">Abrir WhatsApp</v-btn></v-card-actions></v-card>
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
import { newAgendaRequestId, clinicClock, appointmentPhone } from '../../domain/appointments/agendaInteraction'
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
  openWhatsAppUrl
} from '../../utils/whatsapp';

const PATIENT_SEARCH_MIN_LENGTH = 2;
const PATIENT_SEARCH_LIMIT = 12;
const PATIENT_SEARCH_DEBOUNCE_MS = 220;
const PATIENT_SEARCH_CACHE_TTL_MS = 90000;
const PATIENT_SEARCH_CACHE_MAX_KEYS = 30;

const normalizePatientSearchText = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const normalizeAppointmentContactPhoneValue = (value) => String(value || '').trim();

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
      selectedDate: clinicClock('America/Mexico_City').date,
      agendaClockAt: Date.now(),
      viewMode: window.matchMedia('(max-width: 600px)').matches ? 'day' : 'week',
      draftBaseline: '', leaveDialog: false, pendingNavigation: null, removeAgendaGuard: null,
      appointmentRequestId: '', pendingSave: null, conflictAppointment: null,
      phoneCountry: 'MX', contactPreview: false, contactUrl: '', contactTarget: '',
      contactCountries: [{ value: 'MX', text: 'Mexico (+52)' }, { value: 'US', text: 'EE. UU. / Canada (+1)' }, { value: 'INT', text: 'Otro pais (numero con +)' }],
      auditItems: [], auditLoading: false, auditError: '', auditNext: null,
      findingSlot: false, slotRequest: 0, agendaNotice: '',
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
      appointmentStatusOptions: APPOINTMENT_STATUS_OPTIONS.filter(item => item.value !== APPOINTMENT_STATUSES.RESCHEDULED)
    }
  },
  created() {
    this.init()
  },
  mounted() {
    this.removeAgendaGuard = this.$router.beforeEach((to, from, next) => {
      if(this.savingAppointment) return next(false)
      if(!this.appointmentDialog || !this.draftDirty) return next()
      this.pendingNavigation = next; this.leaveDialog = true
    })
    window.addEventListener('beforeunload', this.guardUnload)
    window.addEventListener('focus', this.refreshAgendaClock)
    document.addEventListener('visibilitychange', this.refreshAgendaClock)
  },
  beforeDestroy() {
    this.agendaRequest++; this.dialogRequest++; this.slotRequest++
    if(this.removeAgendaGuard) this.removeAgendaGuard()
    window.removeEventListener('beforeunload', this.guardUnload)
    window.removeEventListener('focus', this.refreshAgendaClock)
    document.removeEventListener('visibilitychange', this.refreshAgendaClock)
    this.cancelPatientSearch()
    this.clearPatientSearchTimer()
  },
  computed: {
    agendaAccessKey() {
      const auth = this.$store && this.$store.state.CORE && this.$store.state.CORE.AUTH || {}
      const user = this.authUser || {}
      return JSON.stringify([auth.accessRevision, user.id_login, user.id_business, user.id_session, auth.authenticated, auth.permissions])
    },
    ...mapGetters(moduleTypes.MONITORING, {
      allMonitorings: fnTypes.getAllTracing
    }),
    ...mapGetters(moduleTypes.AUTH, {
      hasPermission: fnTypes.hasPermission,
      authUser: fnTypes.getUser,
      role: fnTypes.getRole
    }),

    draftDirty() { return !!this.pendingSave || (this.appointmentDialog && this.draftBaseline !== JSON.stringify(this.editingAppointment)) },
    clinicNow() { return clinicClock(this.appointmentConfig.timezone, new Date(this.agendaClockAt)) },
    weekTimeMarker() {
      if(!this.weekDates.includes(this.clinicNow.date)) return null
      const minutes = value => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute }
      const now = minutes(this.clinicNow.time)
      const duration = Number(this.appointmentConfig.defaultAppointmentDuration) || 30
      for(let index = 0; index < this.weekTimes.length; index++) {
        const time = this.weekTimes[index], start = minutes(time)
        // The next row may begin earlier; never stretch a marker across a midday closure.
        const end = Math.min(start + duration, this.weekTimes[index + 1] ? minutes(this.weekTimes[index + 1]) : 1440)
        if(now >= start && now < end) return { time, offset: (now - start) / (end - start) * 100 }
      }
      return null
    },
    visibleAppointments() {
      return [...this.appointments].filter(a => this.viewMode !== 'day' || a.date === this.selectedDate)
        .sort((a,b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    },
    agendaEntries() {
      const entries = this.visibleAppointments.map(appointment => ({ key: `appointment-${appointment.id}`, appointment, slot: appointment }))
      if(this.viewMode === 'day') {
        const slots = this.weekSlots[this.selectedDate] || []
        slots.filter(slot => !slot.appointment).forEach(slot => entries.push({ key: `slot-${slot.date}-${slot.startTime}`, appointment: null, slot }))
      }
      return entries.sort((a, b) => (a.slot.date + a.slot.startTime).localeCompare(b.slot.date + b.slot.startTime) || Number(!a.appointment) - Number(!b.appointment))
    },
    phonePreview() { return appointmentPhone(this.editingAppointment.contactPhone, this.phoneCountry) },
    isReadOnlyAppointment() { return !!this.originalAppointment && this.originalAppointment.status === APPOINTMENT_STATUSES.RESCHEDULED },
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
      this.appointments.forEach(a => { if(!times.includes(a.startTime)) times.push(a.startTime) })
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
        .map(slot => ({ ...slot, endTime: addMinutesToTime(slot.startTime, this.dialogDuration()) }))
        .filter(slot => slot.startTime === currentTime || (slot.selectable && validateAppointmentSlot({ ...this.editingAppointment, startTime: slot.startTime, endTime: slot.endTime }, this.dialogConfig, appointments).valid))
        .map(slot => ({ value: slot.startTime, label: `${slot.startTime} - ${slot.endTime}` }))

      if(currentTime && !options.some(option => option.value === currentTime)) options.unshift({ value: currentTime, label: currentTime + ' - ' + this.editingAppointment.endTime + ' (cita guardada)' })
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
      return this.phonePreview.valid
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
    refreshAgendaClock() { this.agendaClockAt = Date.now() },
    formatDisplayDate,
    guardUnload(event) { if(this.draftDirty || this.savingAppointment) { event.preventDefault(); event.returnValue = '' } },
    keepEditing() { this.leaveDialog = false; if(this.pendingNavigation) this.pendingNavigation(false); this.pendingNavigation = null },
    discardDraft() { const next = this.pendingNavigation; this.pendingNavigation = null; this.leaveDialog = false; this.closeDialog(true); if(next) next() },
    goToday() { this.refreshAgendaClock(); this.selectedDate = clinicClock(this.appointmentConfig.timezone).date },
    async findNextAvailable() {
      if(this.findingSlot || !this.selectedDoctorId) return
      const request = ++this.slotRequest, doctor = this.selectedDoctorId, selected = this.selectedDate, access = this.agendaAccessKey
      const config = this.appointmentConfig, now = clinicClock(config.timezone)
      const start = selected > now.date ? selected : now.date
      this.findingSlot = true; this.agendaNotice = ''
      try {
        const result = await DAAppointmentService.list({ doctor_profile_id: doctor, date_from: start, date_to: addDays(start, 29) })
        if(request !== this.slotRequest || access !== this.agendaAccessKey || doctor !== this.selectedDoctorId || selected !== this.selectedDate) return
        if(!result.success) throw new Error(result.message || 'No se pudo consultar el proximo espacio.')
        for(let offset = 0; offset < 30; offset++) {
          const day = addDays(start, offset)
          const slot = generateDaySlots(day, config, result.data).find(s => s.selectable && (day > now.date || s.startTime > now.time))
          if(slot) { this.selectedDate = day; this.onSlotClick(slot); return }
        }
        this.agendaNotice = 'No hay espacios libres en los 30 dias a partir de la fecha consultada. Revisa horarios y bloqueos.'
      } catch(e) { if(request === this.slotRequest) this.agendaNotice = e.message }
      finally { if(request === this.slotRequest) this.findingSlot = false }
    },
    statusLabel(status) { return APPOINTMENT_STATUS_LABELS[status] || status },
    auditSummary(entry) {
      const changes = typeof entry.changes === 'string' ? JSON.parse(entry.changes) : entry.changes || {}
      const labels = { status:'Estado',date:'Fecha',startTime:'Inicio',endTime:'Fin',doctorProfileId:'Doctor',title:'Motivo',description:'Notas',contactPhone:'Telefono',cancellationReason:'Motivo de cancelacion',patientName:'Nombre',rescheduledFromAppointmentId:'Vinculo con cita original',rescheduledToAppointmentId:'Vinculo con cita destino' }
      if(entry.revision === 1) return entry.operation === 'reschedule' ? 'Cita creada por reprogramacion.' : 'Cita creada.'
      return Object.keys(changes).filter(key => labels[key]).map(key => {
        const change = changes[key]
        if(['date','startTime','endTime','status'].includes(key)) {
          const format = value => key === 'status' ? this.statusLabel(value) : value || 'Sin dato'
          return labels[key] + ': ' + format(change.from) + ' → ' + format(change.to)
        }
        return labels[key] + ' actualizado'
      }).join(' · ')
    },
    isOutsideSchedule(a) { return !validateAppointmentSlot(a, this.appointmentConfig, []).valid || this.appointmentConfig.doctorActive === false },
    async loadAudit(append = false) {
      const id = this.editingAppointment.id, request = this.dialogRequest, access = this.agendaAccessKey
      if(!id) return
      this.auditLoading = true; this.auditError = ''
      try {
        const r = await DAAppointmentService.audit(id, append ? this.auditNext : null)
        if(access !== this.agendaAccessKey || id !== this.editingAppointment.id || request !== this.dialogRequest) return
        if(!r.success) throw new Error(r.message || 'No se pudo cargar el historial.')
        this.auditItems = append ? this.auditItems.concat(r.data.items) : r.data.items; this.auditNext = r.data.nextBefore
      } catch(e) { if(id === this.editingAppointment.id) this.auditError = e.message }
      finally { if(id === this.editingAppointment.id) this.auditLoading = false }
    },
    async openLinkedAppointment(id) {
      if(this.draftDirty) { this.dialogError = 'Guarda o descarta los cambios antes de abrir otra cita.'; return }
      const access = this.agendaAccessKey, request = this.dialogRequest
      const r = await DAAppointmentService.get(id)
      if(access !== this.agendaAccessKey || request !== this.dialogRequest || !this.appointmentDialog) return
      if(!r.success) { this.dialogError = r.message; return }
      const a = r.data
      if(a) this.openAppointment(a)
    },
    useCurrentAppointment() { if(this.conflictAppointment) this.openAppointment(this.conflictAppointment) },
    async quickStatus(status) { if(this.savingAppointment || this.pendingSave) return; this.editingAppointment.status = status; await this.saveAppointment() },
    startReschedule() { if(this.savingAppointment || this.pendingSave) return; this.editingAppointment.status = APPOINTMENT_STATUSES.RESCHEDULED; this.dialogError = 'Selecciona el nuevo doctor, fecha u hora y guarda la reprogramacion.' },
    async submitAppointment(operation) {
      if(this.savingAppointment) return
      const access = this.agendaAccessKey
      if(!this.pendingSave) this.pendingSave = { operation, appointment: JSON.parse(JSON.stringify(this.editingAppointment)), requestId: this.appointmentRequestId }
      this.savingAppointment = true; this.dialogError = ''
      let saved = false
      try {
        const sent = this.pendingSave
        const r = sent.operation === 'reschedule' ? await DAAppointmentService.reschedule(sent.appointment, sent.requestId)
          : await DAAppointmentService.save(sent.appointment, { requestId: sent.requestId })
        if(access !== this.agendaAccessKey) return
        if(!r || !r.success) {
          this.conflictAppointment = r && r.data && r.data.appointment || null
          if(r && r.status >= 400 && r.status < 500) { this.pendingSave = null; this.appointmentRequestId = newAgendaRequestId() }
          this.dialogError = r && r.message || 'No se confirmo el resultado. Reintenta la misma operacion.'
          return
        }
        saved = true; this.pendingSave = null
      } catch(e) { this.dialogError = 'No se confirmo el resultado. Tu captura se conservo; reintenta la misma operacion.' }
      finally { this.savingAppointment = false }
      if(saved) {
        this.closeDialog(true)
        const refreshed = await this.reloadAppointments()
        if(!refreshed) this.agendaError = 'La cita se guardo. No se pudo actualizar esta vista; pulsa Reintentar.'
      }
    },
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
      const access = this.agendaAccessKey
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

        if(access !== this.agendaAccessKey || requestId !== this.patientSearchRequestId) {
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
      const access = this.agendaAccessKey
      this.agendaLoading = true; this.agendaError = ''
      try {
      const response = await DAAppointmentService.doctors()
      if(access !== this.agendaAccessKey) return
      if(!response.success) { this.agendaError = response.message || 'No se pudieron cargar los doctores.'; return }
      this.doctors = response.data || []
      const own = this.doctors.find(d => d.id_login === (this.authUser || {}).id_login)
      this.selectedDoctorId = own ? own.id_doctor_professional_profile : this.doctors.length === 1 ? this.doctors[0].id_doctor_professional_profile : ''
      if(this.selectedDoctorId) { await this.changeCalendarDoctor(); this.goToday() }
      if(access !== this.agendaAccessKey) return
      await this.onSearch()
      if(access !== this.agendaAccessKey) return
      await this.openPulseAppointment()
      } catch(error) { this.agendaError = 'No se pudieron cargar los doctores. Reintenta.' }
      finally { this.agendaLoading = false }
    },

    async openPulseAppointment() {
      const access = this.agendaAccessKey
      const q = this.$route.query || {};
      if(q.returnKey !== 'pulse' || !q.recordId || !/^\d{4}-\d{2}-\d{2}$/.test(q.date || '')) return;
      this.selectedDate = q.date;
      const response = await DAAppointmentService.list({date_from:q.date,date_to:q.date,...(q.doctorProfileId?{doctor_profile_id:q.doctorProfileId}:{})});
      if(access !== this.agendaAccessKey || this.$route.query.recordId !== q.recordId || this.$route.query.returnKey !== 'pulse') return;
      if(!response.success) { this.agendaError = response.message || 'No se pudo consultar la cita solicitada.'; return; }
      const record = (response.data || []).find(a => String(a.id) === q.recordId);
      if(!record) { this.agendaError = 'La cita solicitada ya no está disponible. Vuelve al Pulso y actualiza la lista.'; return; }
      if(record.doctorProfileId && this.doctors.some(d=>d.id_doctor_professional_profile===record.doctorProfileId)) { this.selectedDoctorId = record.doctorProfileId; await this.changeCalendarDoctor(); }
      if(access !== this.agendaAccessKey) return;
      this.openAppointment(record);
    },
    async changeCalendarDoctor() {
      this.refreshAgendaClock()
      const request = ++this.agendaRequest, access = this.agendaAccessKey
      if(!this.selectedDoctorId) { this.appointments = []; this.agendaLoading = false; return }
      this.agendaLoading = true; this.agendaError = ''; this.appointments = []; this.appointmentConfig = getAppointmentConfig()
      try {
        const [config, appointments] = await Promise.all([DAAppointmentService.getConfig(this.selectedDoctorId), DAAppointmentService.list({doctor_profile_id:this.selectedDoctorId,date_from:this.weekDates[0],date_to:this.weekDates[6]})])
        if(access !== this.agendaAccessKey || request !== this.agendaRequest) return
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
      const request = ++this.dialogRequest, access = this.agendaAccessKey
      if(clearTime) { this.editingAppointment.startTime = ''; this.editingAppointment.endTime = '' }
      this.dialogLoading = true; this.dialogError = ''; this.dialogConfig = getAppointmentConfig(); this.dialogAppointments = []
      try {
        const id = this.editingAppointment.doctorProfileId
        const [config, appointments] = await Promise.all([DAAppointmentService.getConfig(id), DAAppointmentService.list({doctor_profile_id:id,date_from:this.editingAppointment.date,date_to:this.editingAppointment.date})])
        if(access !== this.agendaAccessKey || request !== this.dialogRequest) return
        if(!config.success || !appointments.success) throw new Error(config.message || appointments.message || 'No se pudo consultar disponibilidad.')
        if(config.data.doctorProfileId !== id) throw new Error('La agenda recibida no corresponde al doctor seleccionado.')
        this.dialogConfig = normalizeAppointmentConfig(config.data); this.dialogAppointments = appointments.data || []
      } catch(error) { if(request === this.dialogRequest) this.dialogError = error.message }
      finally { if(request === this.dialogRequest) this.dialogLoading = false }
    },

    onSearch: async function() {
      if(this.hasPermission('px.tab.monitoring')) await this.getAllTracing()
    },

    loadAppointmentConfig: async function() {
      const access = this.agendaAccessKey
      const response = await DAAppointmentService.getConfig(this.selectedDoctorId)
      if(access !== this.agendaAccessKey) return
      if(response && response.success && response.data) {
        this.appointmentConfig = normalizeAppointmentConfig(response.data)
        saveAppointmentConfig(this.appointmentConfig)
      }
    },

    reloadAppointments: async function() {
      const request = ++this.agendaRequest, doctor = this.selectedDoctorId, date = this.selectedDate, access = this.agendaAccessKey
      if(!doctor) return false
      try {
        const response = await DAAppointmentService.list({ doctor_profile_id: doctor, date_from: this.weekDates[0], date_to: this.weekDates[6] })
        if(access !== this.agendaAccessKey || request !== this.agendaRequest || doctor !== this.selectedDoctorId || date !== this.selectedDate) return true
        if(!response || !response.success) throw new Error(response && response.message || 'No se pudieron cargar las citas.')
        this.appointments = response.data || []; this.agendaError = ''; return true
      } catch(error) { if(request === this.agendaRequest) this.agendaError = error.message; return false }
    },

    getSlot: function(day, time) {
      const foundSlot = (this.weekSlots[day] || []).find((slot) => slot.startTime === time)
      const event = this.appointments.find(a => a.date === day && a.startTime === time && appointmentBlocksAvailability(a.status))
      if(event && !foundSlot) return { date:day,startTime:time,endTime:event.endTime,status:event.status,appointment:event,selectable:false }
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
      if(this.selectedDoctor && this.selectedDoctor.active === 0) return
      const now = clinicClock(this.appointmentConfig.timezone)
      const firstSlot = this.weekDates
        .filter(date => date >= this.selectedDate && date >= now.date)
        .map((date) => generateDaySlots(date, this.appointmentConfig, this.appointments).find((slot) => slot.selectable && (date > now.date || slot.startTime >= now.time)))
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
      this.appointmentRequestId = newAgendaRequestId(); this.pendingSave = null; this.conflictAppointment = null
      const phone = String(this.editingAppointment.contactPhone || '')
      this.phoneCountry = phone.startsWith('+') && !phone.startsWith('+52') ? 'INT' : 'MX'
      this.auditItems = []; this.auditError = ''; this.auditNext = null
      this.draftBaseline = JSON.stringify(this.editingAppointment)
      this.appointmentDialog = true
      this.dialogConfig = this.appointmentConfig
      this.dialogAppointments = this.appointments
      this.loadDialogDoctor()
    },

    closeDialog: function(force = false) {
      if(this.savingAppointment) return
      if(!force && this.draftDirty) { this.leaveDialog = true; return }
      this.pendingSave = null; this.conflictAppointment = null
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

    saveRescheduledAppointment: async function() { return this.submitAppointment('reschedule') },

    saveAppointment: async function() {
      if(this.dialogLoading || this.savingAppointment) return
      if(this.pendingSave) return this.submitAppointment(this.pendingSave.operation)
      if(!this.editingAppointment.doctorProfileId) { this.dialogError = 'Selecciona el doctor que atendera.'; return }
      if(!this.editingAppointment.date || !this.editingAppointment.startTime) {
        this.dialogError = 'Selecciona fecha y hora.'
        return
      }

      if(!this.editingAppointment.patientId && !this.editingAppointment.patientName) {
        this.dialogError = 'Selecciona o captura el paciente.'
        return
      }

      const changedPhone = !this.originalAppointment || this.editingAppointment.contactPhone !== this.originalAppointment.contactPhone
      if(changedPhone && this.editingAppointment.contactPhone && !this.phonePreview.valid) { this.dialogError = this.phonePreview.message; return }
      if(changedPhone && this.phonePreview.valid) this.editingAppointment.contactPhone = this.phonePreview.e164
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
      const retainsBooking = this.originalAppointment && appointmentBlocksAvailability(this.originalAppointment.status)
        && !this.hasAppointmentTimeChanged() && this.originalAppointment.doctorProfileId === this.editingAppointment.doctorProfileId
      if(!retainsBooking && !validation.valid && appointmentBlocksAvailability(this.editingAppointment.status)) {
        this.dialogError = validation.message
        return
      }

      this.editingAppointment.patientId = this.editingAppointment.patientId || null
      this.editingAppointment.followUpId = this.editingAppointment.followUpId || null
      await this.submitAppointment('save')
    },

    cancelAppointment: async function() {
      if(this.savingAppointment || this.pendingSave) return
      if(this.shouldConfirmCompletedAppointmentEdit()) {
        this.completedEditPendingAction = 'cancel'
        this.completedEditConfirmDialog = true
        return
      }

      this.editingAppointment = { ...this.originalAppointment, cancellationReason: this.editingAppointment.cancellationReason, status: APPOINTMENT_STATUSES.CANCELLED }
      this.editingAppointment.status = APPOINTMENT_STATUSES.CANCELLED
      this.editingAppointment.blocksAvailability = false
      await this.saveAppointment()
    },

    dialogDuration() {
      const minutes = value => Number(value.slice(0,2)) * 60 + Number(value.slice(3,5))
      const previous = this.originalAppointment
      return previous ? minutes(previous.endTime) - minutes(previous.startTime) : this.dialogConfig.defaultAppointmentDuration || 30
    },

    refreshDialogEndTime: function() {
      if(this.editingAppointment.startTime) {
        this.editingAppointment.endTime = addMinutesToTime(this.editingAppointment.startTime, this.dialogDuration())
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
        phone: this.phonePreview.e164,
        text: message
      })
      this.contactTarget = this.phonePreview.e164; this.contactUrl = url; this.contactPreview = true
    },

    moveWeek: function(days) {
      this.selectedDate = addDays(this.selectedDate, days)
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
    statusActionStyle(status) {
      const colors = APPOINTMENT_STATUS_COLORS[status]
      return { '--status-bg': colors.bg, '--status-text': colors.text, '--status-border': colors.border }
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
    viewMode() { this.refreshAgendaClock() },
    agendaAccessKey: function() {
      this.agendaRequest++; this.dialogRequest++; this.slotRequest++
      this.appointments = []; this.dialogAppointments = []; this.auditItems = []; this.doctors = []
      this.appointmentDialog = false; this.agendaConfigDialog = false; this.leaveDialog = false
      this.followUpDialog = false; this.contactPreview = false; this.contactTarget = ''; this.contactUrl = ''
      this.editingAppointment = {}; this.originalAppointment = null; this.conflictAppointment = null; this.pendingSave = null
      this.patientSearchCache = {}; this.resetPatientSearchState()
      this.agendaLoading = false; this.dialogLoading = false; this.findingSlot = false
      this.agendaError = 'La sesion o sus permisos cambiaron. Recarga la agenda.'
      if(this.pendingNavigation) { const next = this.pendingNavigation; this.pendingNavigation = null; next() }
    },
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
.agenda-day-name { display: flex; align-items: center; justify-content: center; gap: 6px; }
.agenda-day-header-today { background: #edf9f7; box-shadow: inset 0 -3px 0 #80bfb8; }
.agenda-day-header-today .agenda-day-name { color: #115e59; }
.agenda-today-badge { padding: 2px 6px; border-radius: 999px; background: #d4eeea; color: #115e59; font-size: 10px; line-height: 1.4; font-weight: 700; }
html[data-theme="clinical-night"] .agenda-day-header-today { background: #193735; box-shadow: inset 0 -3px 0 #548e88; }
html[data-theme="clinical-night"] .agenda-day-header-today .agenda-day-name { color: #b7e5df; }
html[data-theme="clinical-night"] .agenda-day-header-today > p:last-child { color: #a8c8c4; }
html[data-theme="clinical-night"] .agenda-today-badge { background: #2c534f; color: #c6eee7; }
.agenda-config-button.v-btn { background: var(--color-primary-50, #effbfe); border-width: 1px; }
.agenda-clock-note { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; color: #9f2346; font-size: .8rem; font-weight: 600; }
.agenda-clock-note > span:last-child { font-weight: 400; }
.agenda-clock-dot { width: 7px; height: 7px; border-radius: 50%; background: #be345a; }
.agenda-now-line { position: absolute; left: 0; right: -1px; z-index: 2; border-top: 2px solid rgba(190, 52, 90, .5); pointer-events: none; }
.agenda-now-line-today { border-color: #be345a; }
.agenda-now-line-today::before { content: ''; position: absolute; width: 7px; height: 7px; border-radius: 50%; background: #be345a; top: -4px; left: -3px; }
.agenda-now-label { position: absolute; right: 4px; transform: translateY(-50%); z-index: 3; padding: 1px 5px; border-radius: 4px; background: #be345a; color: #fff; font-size: 11px; line-height: 18px; pointer-events: none; }
.agenda-event-row { display: grid; min-width: 0; }
.agenda-event-row-timed { grid-template-columns: 76px minmax(0, 1fr); gap: 12px; align-items: stretch; }
.agenda-event-time { display: flex; flex-direction: column; justify-content: center; align-items: flex-end; gap: 3px; padding: 10px 12px 10px 0; border-right: 2px solid var(--color-primary-200, #b8edf7); font-variant-numeric: tabular-nums; color: var(--color-text, #25364d); }
.agenda-event-time strong { font-size: .95rem; }
.agenda-event-time span { font-size: .8rem; color: var(--color-text-muted, #64748b); }
html[data-theme="clinical-night"] .agenda-clock-note { color: #f7a9c0; }
@media(max-width:600px) { .agenda-event-row-timed { grid-template-columns: 54px minmax(0, 1fr); gap: 8px; } .agenda-event-time { padding-right: 8px; } .agenda-event-time strong { font-size: .85rem; } }
.appointment-status-action { background-color: var(--status-bg) !important; color: var(--status-text) !important; border: 1px solid var(--status-border) !important; border-radius: 8px; text-transform: none; letter-spacing: normal; font-weight: 600; }
.appointment-status-action.appointment-status-current { border-color: var(--status-text) !important; box-shadow: inset 0 0 0 1px var(--status-text); }
.appointment-status-action:focus-visible { outline: 2px solid var(--status-text); outline-offset: 3px; }
.appointment-status-action:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
.agenda-view-toggle.v-btn-toggle { border: 1px solid var(--color-primary-200, #b8edf7); border-radius: 8px; overflow: hidden; }
.agenda-view-toggle.v-btn-toggle > .v-btn { background: var(--color-primary-50, #effbfe); color: var(--color-primary-900, #086783); border-color: var(--color-primary-200, #b8edf7) !important; text-transform: none; letter-spacing: normal; font-weight: 600; opacity: 1; }
.agenda-view-toggle.v-btn-toggle > .v-btn.v-btn--active { background: var(--color-primary-100, #dff6fa); box-shadow: inset 0 -3px 0 var(--color-primary-700, #0e7490); }
.agenda-event-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.agenda-event-status { border: 1px solid currentColor; border-radius: 999px; padding: 2px 9px; font-size: .75rem; font-weight: 600; }
.agenda-event-create { display: inline-flex; align-items: center; gap: 6px; font-size: .875rem; }
.agenda-event.agenda-event-free { border-style: dashed; }
.agenda-event:disabled { cursor: not-allowed; }
.agenda-event:not(:disabled):hover { box-shadow: 0 2px 8px #25364d14; }
.agenda-toolbar-button.v-btn { min-height: 36px; padding: 0 16px; font-size: .875rem; font-weight: 600; letter-spacing: normal; text-transform: none; }
.agenda-toolbar-follow-up.v-btn { background-color: var(--color-primary-900, #086783) !important; color: #fff; }
.agenda-toolbar-button:focus-visible { outline: 2px solid var(--color-primary-900, #086783); outline-offset: 3px; }
.agenda-events { padding: 20px; display: grid; gap: 10px; }
.agenda-event { padding: 14px; border: 1px solid #cbd5e1; border-left-width: 4px; border-radius: 8px; display: grid; gap: 8px; text-align: left; overflow-wrap: anywhere; background: #fff; transition: box-shadow .15s ease; }
.agenda-event:focus-visible { outline: 3px solid #0e7490; outline-offset: 2px; }
.agenda-event small { color: #9a3412; }
.agenda-detail-tools { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.appointment-card { max-height: 90vh; display: flex; flex-direction: column; }
.appointment-card > div { flex-shrink: 0; }
.appointment-card > .v-card__text { min-height: 0; overflow-y: auto; flex: 1 1 auto; }
.appointment-card .appointment-dialog-actions { flex: 0 0 auto; background: white; }

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
  position: relative;
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
