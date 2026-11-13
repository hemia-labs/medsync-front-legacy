<template>
  <section class="professional-agenda bg-white border border-primary-200 shadow-xl">
    <OnboardingGuide v-if="guideAllowed && guideRequested && !loading && !guideModal" :editor="editorSnapshot" :doctor-name="doctorName" @focus-target="focusGuideTarget" />
    <div v-if="loaded && agendaIssues.length" class="agenda-repair" role="status">
      <strong>Revisa la configuración guardada</strong>
      <p v-for="issue in agendaIssues" :key="issue.code">{{ issue.message }}</p>
      <button v-if="needsPersistedReview" type="button" class="agenda-link" @click="focusGuideTarget('hours')">Revisar horarios semanales</button>
    </div>
    <header class="agenda-header border-b border-primary-200 bg-primary-100">
      <div>
        <p class="agenda-eyebrow">Agenda clínica</p>
        <h2 class="m-0 text-2xl font-normal text-gray-700">Configuración de citas</h2>
        <p class="m-0 mt-2 text-sm text-gray-500">Horarios, duración de citas y bloqueos de disponibilidad.</p>
      </div>
      <div v-if="selected && loaded" class="agenda-header-actions">
        <v-switch ref="guideActivation" v-model="form.enabled" inset hide-details :label="isBusiness ? 'Consultorio disponible' : 'Agenda activa'" :disabled="saving" :color="themeColor" class="m-0" :class="guideClass('activation')"></v-switch>
        <v-btn ref="guideSave" rounded depressed :color="themeColor" dark :loading="saving" :disabled="loading || timezoneSaving" :class="guideClass('save')" @click="save">Guardar cambios</v-btn>
      </div>
    </header>
    <div class="agenda-body">
      <div class="agenda-scope">
        <v-select ref="guideDoctor" :class="guideClass('doctor')" :key="selected + '-' + selectorRevision" :value="isBusiness ? null : selected" :items="options" item-text="label" item-value="id" label="Doctor" outlined dense hide-details :disabled="loading || saving || timezoneSaving" :color="themeColor" @change="choose"></v-select>
        <div class="text-sm text-gray-600">
          <p class="m-0">{{ !selected ? 'Selecciona el doctor cuya agenda quieres configurar.' : isBusiness ? 'Cierres generales que aplican a todos los doctores.' : 'Estos cambios aplican solo a ' + doctorName + '.' }}</p>
          <p v-if="loaded && !isBusiness" class="m-0 mt-1 text-gray-500">Los cierres del consultorio también se respetan.</p>
          <v-btn v-if="canManageAllDoctors && !isBusiness" small text :color="themeColor" :disabled="loading || saving || timezoneSaving" @click="choose('business')">Cierres del consultorio</v-btn>
        </div>
      </div>
      <p v-if="loading" role="status" class="mt-4 text-gray-600">Cargando configuración…</p>
      <div v-if="!loading && !error && !options.some(option => option.id !== 'business')" role="status" class="agenda-notice">
        <p>{{ canManageAllDoctors ? 'Todavía no hay doctores con perfil activo. Revisa sus perfiles en Personal y usuarios; no necesitas una agenda propia para prepararlos.' : 'No tienes un perfil profesional activo con una agenda propia. Completa y guarda tu perfil profesional; después configura tus horarios de atención.' }} Los cierres generales no sustituyen la agenda del doctor.</p>
        <p v-if="canCompleteOwnProfile">Si tú atenderás las citas, empieza por guardar tu perfil profesional. Después podrás preparar tus horarios; la firma puede esperar.</p>
        <router-link v-if="canCompleteOwnProfile" :to="guideRequested ? '/admin?section=doctor-identity&guide=1&resume=1&goal=agenda' : '/admin?section=doctor-identity'" class="agenda-link underline mr-4">Primero, preparar mi perfil profesional</router-link>
        <router-link v-if="canManageAllDoctors && hasPermission('admin.users')" :to="guideRequested ? '/admin?section=users&guide=1&resume=1' : '/admin?section=users'" class="agenda-link underline">Preparar a otro doctor en Personal y usuarios</router-link>
        <p v-else>Pide al administrador que revise el perfil y los accesos del doctor.</p>
      </div>
      <div v-if="error" role="alert" class="agenda-notice agenda-notice-error">
        {{ error }} <button v-if="!loading && !saving && !timezoneSaving" type="button" class="agenda-link" @click="retryCurrent">{{ saveOutcome === 'uncertain' ? 'Comprobar guardado' : saveOutcome === 'conflict' ? 'Revisar versión guardada' : 'Reintentar' }}</button>
      </div>
      <v-btn v-if="error && loaded" small text :disabled="saving || timezoneSaving" @click="reloadCurrentConfig">Descartar cambios y recargar versión vigente</v-btn>
      <p v-if="message" role="status" class="agenda-notice agenda-notice-success">{{ message }}</p>
      <template v-if="selected && loaded">
        <div class="agenda-summary" :class="{ 'agenda-summary-business': isBusiness }">
          <article v-for="item in summary" :key="item.label" class="agenda-panel agenda-summary-card">
            <p class="agenda-eyebrow">{{ item.label }}</p>
            <h3 class="m-0 mt-2 text-2xl font-semibold text-gray-700">{{ item.value }}</h3>
            <p class="m-0 mt-1 text-sm text-gray-500">{{ item.detail }}</p>
          </article>
        </div>
        <v-tabs v-model="agendaTab" background-color="transparent" :color="themeColor" grow class="agenda-tabs">
          <v-tab>Horarios</v-tab><v-tab>Bloqueos</v-tab><v-tab v-if="!isBusiness">Vista previa</v-tab>
        </v-tabs>
        <v-tabs-items v-model="agendaTab" class="agenda-tab-content">
          <v-tab-item>
            <div class="agenda-hours-layout" :class="{ 'agenda-hours-business': isBusiness }">
              <article class="agenda-panel">
                <p class="agenda-eyebrow">General</p>
                <h3 class="agenda-title">Reglas base</h3>
                <p class="agenda-description">{{ isBusiness ? 'Define la zona horaria y disponibilidad general del consultorio.' : 'Define como se generan los espacios disponibles.' }}</p>
                <v-select v-if="!isBusiness" ref="guideDuration" :class="guideClass('duration')" v-model="form.defaultAppointmentDuration" :items="durationOptions" item-text="label" item-value="value" label="Duración habitual" outlined dense :disabled="saving" :color="themeColor" class="mt-5"></v-select>
                <div ref="guideTimezone" tabindex="-1" :class="guideClass('timezone')">
                  <ClinicTimeZoneField :value="form.timezone" :save-zone="persistTimezone" :can-manage="canManageAllDoctors" :disabled="saving || loading" :color="themeColor" @dialog="zoneDialog = $event">
                    <template #guide><OnboardingGuide v-if="guideActive" :editor="editorSnapshot" :doctor-name="doctorName" inside-modal modal-title="Confirma la hora" modal-text="Guardar actualiza la zona de todas las agendas. Los horarios se guardan aparte al volver al formulario." /></template>
                  </ClinicTimeZoneField>
                </div>
                <p class="agenda-note">{{ isBusiness ? 'Los horarios de atención se configuran en la agenda de cada doctor. Los cierres generales aplican a todos.' : 'Las citas creadas desde seguimiento inician como pendientes de confirmar.' }}</p>
              </article>
              <article v-if="!isBusiness" ref="guideHours" tabindex="-1" class="agenda-panel" :class="guideClass('hours')">
                <p class="agenda-eyebrow">Semana</p>
                <h3 class="agenda-title">Horarios semanales</h3>
                <p class="agenda-description mb-4">Edita un día solo cuando necesites cambiar sus rangos.</p>
                <div class="agenda-days">
                  <div v-for="day in form.workingDays" :key="day.dayOfWeek" class="agenda-day">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <h4 class="m-0 text-base font-semibold text-gray-700">{{ dayName(day.dayOfWeek) }}</h4>
                        <span class="agenda-badge" :class="day.enabled ? 'agenda-badge-active' : 'agenda-badge-inactive'">{{ day.enabled ? 'Activo' : 'Inactivo' }}</span>
                      </div>
                      <div class="flex flex-wrap gap-2 mt-2">
                        <span v-if="!day.enabled || !day.timeRanges.length" class="text-sm text-gray-500">Sin atención</span>
                        <span v-for="(range, i) in day.enabled ? day.timeRanges : []" :key="i" class="agenda-range-chip">{{ range.startTime }} - {{ range.endTime }}</span>
                      </div>
                    </div>
                    <div class="agenda-day-actions">
                      <v-btn small outlined rounded :color="themeColor" :disabled="saving" :aria-label="'Editar ' + dayName(day.dayOfWeek)" @click="openEditDay(day, $event)">Editar</v-btn>
                      <v-btn v-if="day.enabled && day.timeRanges.length" small outlined rounded :color="themeColor" :disabled="saving" :aria-label="'Copiar horario de ' + dayName(day.dayOfWeek)" @click="openCopyDay(day, $event)">Copiar</v-btn>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </v-tab-item>
          <v-tab-item>
            <article ref="guideClosures" tabindex="-1" class="agenda-panel" :class="guideClass('closures')">
              <div class="agenda-panel-header">
                <div><p class="agenda-eyebrow">{{ isBusiness ? 'Cierres generales' : 'Bloqueos del doctor' }}</p><h3 class="agenda-title">Días y horarios no disponibles</h3><p class="agenda-description">Agrega vacaciones, cursos o actividades internas.</p></div>
                <div class="flex flex-wrap gap-2">
                  <v-btn small rounded outlined :color="themeColor" :disabled="saving" @click="openBlockDialog(true, -1, $event)">+ Bloquear día</v-btn>
                  <v-btn small rounded depressed :color="themeColor" dark :disabled="saving" @click="openBlockDialog(false, -1, $event)">+ Bloquear horario</v-btn>
                </div>
              </div>
              <div v-if="!blocks.length" class="agenda-empty"><v-icon :color="themeColor" class="mb-2">mdi-calendar-check-outline</v-icon><h4 class="m-0 font-semibold text-gray-700">No tienes bloqueos configurados</h4><p class="agenda-description">Agrega días festivos, vacaciones u horarios no disponibles.</p></div>
              <div v-else class="agenda-blocks">
                <div v-for="(block, i) in blocks" :key="i" class="agenda-block">
                  <div class="min-w-0"><p class="m-0 font-semibold text-gray-700">{{ block.repeats ? dayName(block.dayOfWeek) : displayDate(block.date) }}</p><p class="agenda-description">{{ block.allDay ? 'Día completo' : block.startTime + ' - ' + block.endTime }}{{ block.repeats ? ' · Repite semanalmente' : '' }}</p><p class="m-0 mt-2 text-sm text-gray-600">{{ block.reason || 'Sin motivo' }}</p></div>
                  <div class="flex"><v-btn icon small :color="themeColor" :disabled="saving" :aria-label="'Editar bloqueo ' + (i + 1)" @click="openBlockDialog(block.allDay, i, $event)"><v-icon>mdi-pencil-outline</v-icon></v-btn><v-btn icon small color="#A6001E" :disabled="saving" :aria-label="'Quitar bloqueo ' + (i + 1)" @click="blocks.splice(i, 1)"><v-icon>mdi-delete-outline</v-icon></v-btn></div>
                </div>
              </div>
            </article>
          </v-tab-item>
          <v-tab-item v-if="!isBusiness">
            <article class="agenda-panel">
              <div class="agenda-panel-header"><div><p class="agenda-eyebrow">Vista previa</p><h3 class="agenda-title">Disponibilidad generada</h3><p class="agenda-description">Revisa esta configuración antes de guardar. No incluye citas ya reservadas.</p></div><v-text-field v-model="previewDate" type="date" label="Fecha de vista previa" outlined dense hide-details :color="themeColor" class="agenda-preview-date"></v-text-field></div>
              <p v-if="!form.enabled || form.businessEnabled === false" class="agenda-note">{{ !form.enabled ? 'La agenda de este doctor está inactiva.' : 'El consultorio no está disponible.' }} Activa la configuración correspondiente para generar horarios.</p>
              <div v-else-if="previewBlocked" class="agenda-notice agenda-notice-error">Este día está bloqueado completo.</div>
              <div class="agenda-preview-grid">
                <div class="agenda-note"><p class="agenda-eyebrow">Horario laboral</p><h4 class="m-0 mt-2 font-semibold text-gray-700">{{ previewDayName }}</h4><div class="flex flex-wrap gap-2 mt-3"><span v-if="!previewRanges.length" class="text-sm text-gray-500">Día sin atención</span><span v-for="(range, i) in previewRanges" :key="i" class="agenda-range-chip">{{ range.startTime }} - {{ range.endTime }}</span></div></div>
                <div class="agenda-note"><p class="agenda-eyebrow">Horarios disponibles</p><div class="flex flex-wrap gap-2 mt-3"><span v-if="!previewSlots.length" class="text-sm text-gray-500">No hay horarios disponibles para esta fecha.</span><span v-for="slot in previewSlots" :key="slot.startTime" class="agenda-slot">{{ slot.startTime }}</span></div></div>
              </div>
              <div class="agenda-note mt-4"><p class="agenda-eyebrow">Bloqueos aplicados</p><div class="flex flex-wrap gap-2 mt-3"><span v-if="!previewHourBlocks.length && !previewBlocked" class="text-sm text-gray-500">Sin bloqueos para esta fecha.</span><span v-if="previewBlocked" class="text-sm text-gray-600">Día completo</span><span v-for="(block, i) in previewHourBlocks" :key="i" class="agenda-range-chip">{{ block.startTime }} - {{ block.endTime }} {{ block.reason }}</span></div></div>
            </article>
          </v-tab-item>
        </v-tabs-items>
        <footer class="agenda-footer"><p class="m-0 text-sm text-gray-500">{{ dirty ? 'Tienes cambios sin guardar. ' : '' }}Guardar cambia la disponibilidad; las citas ya creadas conservan su horario.</p><v-btn rounded depressed :color="themeColor" dark :loading="saving" :disabled="loading || timezoneSaving" @click="save">Guardar cambios</v-btn></footer>
      </template>
    </div>
    <v-dialog v-model="dayDialog" persistent max-width="620" @keydown.esc.stop.prevent="dayDialog = false">
      <v-card class="agenda-dialog"><OnboardingGuide v-if="guideActive" :editor="editorSnapshot" :doctor-name="doctorName" inside-modal />
        <div class="agenda-dialog-header"><div><p class="agenda-eyebrow">{{ doctorName }} · Horario semanal</p><h3 class="agenda-title">Editar {{ dayName(editingDay.dayOfWeek) }}</h3></div><v-btn icon aria-label="Cerrar edición de horario" @click="dayDialog = false"><v-icon>mdi-close</v-icon></v-btn></div>
        <v-card-text class="pt-5"><v-switch v-model="editingDay.enabled" inset :color="themeColor" label="Día laboral"></v-switch>
          <template v-if="editingDay.enabled"><div v-for="(range, i) in editingDay.timeRanges" :key="i" class="agenda-range mb-3"><v-text-field v-model="range.startTime" type="time" :label="'Inicio ' + (i + 1)" outlined dense hide-details :color="themeColor"></v-text-field><v-text-field v-model="range.endTime" type="time" :label="'Fin ' + (i + 1)" outlined dense hide-details :color="themeColor"></v-text-field><v-btn icon color="#A6001E" :aria-label="'Quitar rango ' + (i + 1)" @click="editingDay.timeRanges.splice(i, 1)"><v-icon>mdi-delete-outline</v-icon></v-btn></div><v-btn small rounded outlined :color="themeColor" @click="addEditingRange">+ Agregar rango</v-btn></template>
          <p v-else class="text-gray-500">Este día no generará horarios disponibles.</p><p v-if="editingDayError" role="alert" class="text-red-700 mt-3">{{ editingDayError }}</p><p class="text-sm text-gray-500 mt-4">Los cambios se guardan al pulsar Guardar cambios en la agenda.</p>
        </v-card-text>
        <v-card-actions class="agenda-dialog-actions"><v-btn rounded outlined :color="themeColor" @click="dayDialog = false">Cancelar</v-btn><v-btn rounded depressed :color="themeColor" dark @click="applyDay">Aplicar horario</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="copyDialog" persistent max-width="500" @keydown.esc.stop.prevent="copyDialog = false">
      <v-card class="agenda-dialog"><OnboardingGuide v-if="guideActive" :editor="editorSnapshot" :doctor-name="doctorName" inside-modal modal-title="Copia y después guarda" modal-text="Selecciona los días y pulsa Copiar horario. Después, Guardar cambios en la agenda conserva la copia." /><div class="agenda-dialog-header"><div><p class="agenda-eyebrow">{{ doctorName }} · Copiar horario</p><h3 class="agenda-title">Copiar {{ dayName(copySourceDay.dayOfWeek) }}</h3></div><v-btn icon aria-label="Cerrar copia de horario" @click="copyDialog = false"><v-icon>mdi-close</v-icon></v-btn></div><v-card-text class="pt-5"><p>Selecciona los días que recibirán estos rangos. Reemplazará sus horarios actuales dentro de esta agenda.</p><div class="flex flex-wrap gap-2 mb-3"><span v-for="(range, i) in copySourceDay.timeRanges" :key="i" class="agenda-range-chip">{{ range.startTime }} - {{ range.endTime }}</span></div><v-checkbox v-for="day in copyTargetOptions" :key="day.value" v-model="copyTargetDays" :value="day.value" :label="day.label" :color="themeColor" hide-details></v-checkbox><p class="text-sm text-gray-500 mt-4">Después pulsa Guardar cambios en la agenda.</p></v-card-text><v-card-actions class="agenda-dialog-actions"><v-btn rounded outlined :color="themeColor" @click="copyDialog = false">Cancelar</v-btn><v-btn rounded depressed :color="themeColor" dark :disabled="!copyTargetDays.length" @click="applyCopy">Copiar horario</v-btn></v-card-actions></v-card>
    </v-dialog>
    <v-dialog v-model="blockDialog" persistent max-width="600" @keydown.esc.stop.prevent="blockDialog = false">
      <v-card class="agenda-dialog"><OnboardingGuide v-if="guideActive" :editor="editorSnapshot" :doctor-name="doctorName" inside-modal modal-text="Pulsa Aplicar bloqueo al terminar. Después, Guardar cambios en la agenda conserva el bloqueo." />
        <div class="agenda-dialog-header"><div><p class="agenda-eyebrow">{{ doctorName }}</p><h3 class="agenda-title">{{ editingBlockIndex === -1 ? 'Agregar' : 'Editar' }} bloqueo</h3></div><v-btn icon aria-label="Cerrar edición de bloqueo" @click="blockDialog = false"><v-icon>mdi-close</v-icon></v-btn></div>
        <v-card-text class="pt-5">
          <div class="agenda-block-form">
            <v-checkbox v-model="editingBlock.repeats" label="Repetir cada semana" :color="themeColor" hide-details></v-checkbox>
            <v-checkbox v-model="editingBlock.allDay" label="Todo el día" :color="themeColor" hide-details></v-checkbox>
            <v-select v-if="editingBlock.repeats" v-model="editingBlock.dayOfWeek" :items="weekDays" item-text="label" item-value="value" label="Día de la semana (obligatorio)" outlined dense hide-details :color="themeColor"></v-select>
            <v-text-field v-else v-model="editingBlock.date" type="date" label="Fecha del bloqueo (obligatoria)" aria-required="true" :error-messages="blockAttempted && !validBlockDate(editingBlock.date) ? ['Selecciona una fecha válida para el bloqueo.'] : []" hint="Necesaria para un bloqueo que no se repite cada semana." persistent-hint outlined dense :color="themeColor"></v-text-field>
            <v-text-field v-model="editingBlock.reason" label="Motivo (opcional)" outlined dense hide-details :color="themeColor"></v-text-field>
            <v-text-field v-if="!editingBlock.allDay" v-model="editingBlock.startTime" type="time" label="Inicio del bloqueo" outlined dense hide-details :color="themeColor"></v-text-field>
            <v-text-field v-if="!editingBlock.allDay" v-model="editingBlock.endTime" type="time" label="Fin del bloqueo" outlined dense hide-details :color="themeColor"></v-text-field>
          </div>
          <p v-if="blockError" role="alert" class="text-red-700 mt-3">{{ blockError }}</p><p class="text-sm text-gray-500 mt-4">Los cambios se guardan al pulsar Guardar cambios en la agenda.</p>
        </v-card-text>
        <v-card-actions class="agenda-dialog-actions"><v-btn rounded outlined :color="themeColor" @click="blockDialog = false">Cancelar</v-btn><v-btn rounded depressed :color="themeColor" dark @click="applyBlock">Aplicar bloqueo</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="leaveOpen" persistent max-width="500" @keydown.esc.stop.prevent="leaveOpen = false">
      <v-card class="p-5"><h3 class="text-xl font-semibold text-gray-700">Cambios sin guardar</h3><p>Guarda la agenda antes de cambiar de doctor o descarta estos cambios.</p>
        <div class="flex flex-wrap gap-2"><v-btn :color="themeColor" dark :loading="saving" @click="saveAndSwitch">Guardar y cambiar</v-btn><v-btn outlined :disabled="saving" @click="switchTo(pending)">Descartar cambios</v-btn><v-btn text :disabled="saving" @click="leaveOpen = false">Seguir editando</v-btn></div>
      </v-card>
    </v-dialog>
  </section>
</template>
<script>
import { clinicClock } from '../../../domain/appointments/agendaInteraction';
import { mapGetters } from 'vuex';
import { isTenantAdministrator, getSettingsSections } from '../../../security/settingsAccess';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { DAAppointmentService } from '../../../services/context/core-proccess-context';
import { normalizeAppointmentConfig, WEEK_DAYS, createId } from '../../../domain/appointments/appointment.storage';
import { generateDaySlots, getDayWorkingConfig, getHourBlocksForDate, isDateBlocked, timeToMinutes, formatDisplayDate } from '../../../domain/appointments/availability';
import ClinicTimeZoneField from './ClinicTimeZoneField.vue';
import OnboardingGuide from './OnboardingGuide.vue';
import { guideContext, ONBOARDING } from '../../../domain/onboarding/context';
import { isGuideOnlyNavigation } from '../../../domain/settings/settings.navigation';
import { configIntent, responseFailure } from '../../../domain/appointments/configRecovery';
export default {
  components: { ClinicTimeZoneField, OnboardingGuide },
  props: { themeColor: { type: String, default: '#087F8C' }, initialDoctorId: { type: String, default: '' } },
  data() {
    const today = new Date();
    return {
      doctors: [], selected: '', form: normalizeAppointmentConfig({enabled:false}), blocks: [], weekDays: WEEK_DAYS, durations:[10,15,20,30,45,60,90,120],
      loading:false, loaded:false, saving:false, timezoneSaving:false, error:'', message:'', baseline:'', leaveOpen:false, pending:'', request:0, selectorRevision:0,
      disposed:false, initSequence:0, instanceId:createId('agenda-editor'), zoneDialog:false, saveOutcome:'idle', pendingSave:null, pendingTimezone:null,
      agendaTab:0, dayDialog:false, editingDay:{dayOfWeek:1,enabled:false,timeRanges:[]}, editingDayError:'',
      copyDialog:false, copySourceDay:{dayOfWeek:1,timeRanges:[]}, copyTargetDays:[],
      blockDialog:false, editingBlock:{}, editingBlockIndex:-1, blockError:'', blockAttempted:false,
      previewDate: `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    };
  },
  computed: {
    ...mapGetters(moduleTypes.AUTH, { authUser: fnTypes.getUser, hasPermission: fnTypes.hasPermission, role:fnTypes.getRole }),
    canManageAllDoctors() { return isTenantAdministrator(this.role) && this.hasPermission('admin.config'); },
    canCompleteOwnProfile() { return getSettingsSections(this.role, this.hasPermission).some(section => section.key === 'doctor-identity'); },
    editorContext() { return guideContext(this.authUser,this.role,this.hasPermission,this.$store ? this.$store.state.CORE.AUTH.accessRevision : 0,this.$store ? this.$store.state.CORE.AUTH.business : null); },
    editorContextKey() { return this.editorContext ? this.editorContext.key : JSON.stringify([(this.authUser || {}).id_login,this.role]); },
    guideState() { return this.$store && this.$store.state.CORE.ONBOARDING; },
    guideAllowed() { return !!this.guideState && (this.canManageAllDoctors || this.hasPermission('px.dates')); },
    guideRequested() { return !!this.$route && this.$route.query.guide==='1'; },
    guideActive() { return this.guideRequested && this.guideAllowed && this.guideState.guide==='active'; },
    guideStep() {return this.guideActive ? this.guideState.step : '';},
    agendaIssues(){const agenda=this.guideState && this.guideState.status && this.guideState.status.agenda;return agenda && agenda.subject===this.selected ? agenda.issues || [] : [];},
    needsPersistedReview(){return this.agendaIssues.some(issue=>issue.code==='MISSING_DAYS');},
    guideModal() { return this.dayDialog || this.copyDialog || this.blockDialog || this.zoneDialog || this.leaveOpen; },
    pendingCapture() { return this.dayDialog || this.copyDialog || this.blockDialog || this.zoneDialog; },
    editorSnapshot() { return {instanceId:this.instanceId,contextKey:this.editorContextKey,subject:this.selected,requestSequence:this.request,loaded:this.loaded,loading:this.loading,saving:this.saving || this.timezoneSaving,dirty:this.dirty,pendingModalCapture:this.pendingCapture,draftValidation:'unknown',dayValidation:this.dayDialog ? (this.editingDay.enabled && this.validateRanges(this.editingDay.timeRanges) ? 'invalid' : 'valid') : 'unknown',saveOutcome:this.saveOutcome}; },
    options() { return this.doctors.filter(d => d.active !== 0 && (this.canManageAllDoctors || d.id_login === (this.authUser || {}).id_login)).map(d => ({id:d.id_doctor_professional_profile,label:d.display_name})); },
    doctorName() { return this.isBusiness ? 'Cierres del consultorio' : (this.options.find(d => d.id === this.selected) || {}).label || ''; },
    dirty() { return this.loaded && !!this.baseline && JSON.stringify(this.capture()) !== this.baseline; },
    isBusiness() { return this.selected === 'business'; },
    durationOptions() { return this.durations.map(value => ({value,label:`${value} minutos`})); },
    summary() {
      const days = this.form.workingDays.filter(day => day.enabled);
      const blocks = {label:'Bloqueos',value:this.blocks.length,detail:this.isBusiness ? 'generales del consultorio' : 'de esta agenda'};
      return this.isBusiness ? [{label:'Alcance',value:'Todos',detail:'los doctores del consultorio'},blocks] : [
        {label:'Días activos',value:days.length,detail:'de 7 días configurados'},
        {label:'Duración',value:`${this.form.defaultAppointmentDuration} min`,detail:'por cita'},
        {label:'Rangos',value:days.reduce((total,day)=>total+day.timeRanges.length,0),detail:'horarios semanales'},blocks
      ];
    },
    copyTargetOptions() { return this.weekDays.filter(day => day.value !== this.copySourceDay.dayOfWeek); },
    previewDayName() { return this.previewDate ? this.dayName(new Date(`${this.previewDate}T00:00:00`).getDay()) : 'Selecciona una fecha'; },
    previewRanges() { const day = getDayWorkingConfig(this.form, this.previewDate); return day && day.enabled ? day.timeRanges : []; },
    previewBlocked() { return !!this.previewDate && isDateBlocked(this.capture(), this.previewDate); },
    previewHourBlocks() { return this.previewDate ? getHourBlocksForDate(this.capture(), this.previewDate) : []; },
    previewSlots() { return this.previewDate ? generateDaySlots(this.previewDate, this.capture(), []).filter(slot => slot.selectable) : []; }
  },
  watch: {
    guideRequested() { this.syncGuideRequest(); },
    '$route.query.resume'(value) { if(value==='1')this.syncGuideRequest(); },
    guideModal(value) { if(!value)this.restoreDialogFocus(); },
    guideStep(value) {if(this.guideModal)return;if(value==='closures')this.agendaTab=1;else if(['timezone','duration','hours'].includes(value))this.agendaTab=0;},
    editorContextKey() { this.request++;this.initSequence++;this.loaded=false;this.selected='';this.doctors=[];this.form=normalizeAppointmentConfig({enabled:false});this.blocks=[];this.baseline='';this.pendingSave=null;this.pendingTimezone=null;this.saving=false;this.timezoneSaving=false;this.dayDialog=false;this.copyDialog=false;this.blockDialog=false;this.leaveOpen=false;this.init(); },
    editorSnapshot:{deep:true,handler(){this.publishEditor();}}
  },
  mounted() {
    this.init();
    window.addEventListener('beforeunload',this.beforeUnload);
    this.removeNavigationGuard = this.$router.beforeEach(async (to, from, next) => {
      if(isGuideOnlyNavigation(to,from)) return next();
      if(this.saving || this.timezoneSaving) return next(false);
      if(!this.dirty && !this.pendingCapture && !this.pendingSave && !this.pendingTimezone) return next();
      const result = await this.$swal.fire({title:'Cambios sin guardar',text:'Los cambios de agenda aún no se han guardado.',showCancelButton:true,confirmButtonText:'Descartar y salir',cancelButtonText:'Seguir editando',customClass:{confirmButton:'medsync-alert-danger'}});
      next(result.isConfirmed ? undefined : false);
    });
  },
  beforeDestroy() { this.disposed=true;this.request++;this.initSequence++;if(this.$store)this.$store.dispatch(ONBOARDING+'detach',this.instanceId);window.removeEventListener('beforeunload',this.beforeUnload); if(this.removeNavigationGuard)this.removeNavigationGuard(); },
  methods: {
    async syncGuideRequest() {
      if(!this.guideAllowed || this.loading || this.disposed)return;
      if(!this.guideRequested){if(this.guideState.guide==='active')await this.$store.dispatch(ONBOARDING+'pause');return;}
      if(this.guideState.guide!=='active')await this.$store.dispatch(ONBOARDING+'begin',{resume:true});
      if(this.guideRequested && this.$route.query.resume==='1'){
        const query={...this.$route.query};delete query.resume;
        await this.$router.replace({path:this.$route.path,query}).catch(()=>{});
      }
    },
    rememberDialogFocus(event) { this.dialogReturn={node:event && event.currentTarget || (typeof document!=='undefined' ? document.activeElement : null),key:this.editorContextKey,subject:this.selected}; },
    restoreDialogFocus() {
      const target=this.dialogReturn;this.dialogReturn=null;
      // Let Vuetify release its focus trap before returning to the real opener.
      this.$nextTick(()=>this.$nextTick(()=>{if(target && !this.disposed && !this.guideModal && target.key===this.editorContextKey && target.subject===this.selected && target.node && target.node.isConnected)target.node.focus();}));
    },
    beforeUnload(event) { if(this.dirty || this.pendingCapture || this.saving || this.timezoneSaving || this.pendingSave || this.pendingTimezone) {event.preventDefault();event.returnValue='';} },
    currentRequest(request,key,subject) { return !this.disposed && request===this.request && key===this.editorContextKey && subject===this.selected; },
    publishEditor() { if(this.guideAllowed && this.guideState.subject===this.selected && (this.guideState.context || {}).key===this.editorContextKey) this.$store.commit(ONBOARDING+'editor',this.editorSnapshot); },
    guideClass(target) { return this.guideActive && this.guideState.step===target ? 'agenda-guide-target' : ''; },
    focusGuideTarget(target, reveal) {
      if(target==='closures')this.agendaTab=1;else if(['hours','duration','timezone'].includes(target))this.agendaTab=0;
      this.$nextTick(()=>{const item=this.$refs['guide'+target.charAt(0).toUpperCase()+target.slice(1)], node=item && (item.$el || item);if(item && typeof item.focus==='function')item.focus();else if(node){node.setAttribute('tabindex','-1');node.focus();node.scrollIntoView({block:'nearest',behavior:'auto'});}if(node && typeof reveal==='function')reveal(node);});
    },
    async init() {
      const sequence=++this.initSequence,key=this.editorContextKey;this.loading=true;this.error='';
      if(this.$store)await this.$store.dispatch(ONBOARDING+'context',this.editorContext);
      try {const r=await DAAppointmentService.doctors();if(this.disposed || sequence!==this.initSequence || key!==this.editorContextKey)return;
        if(!r.success)throw new Error(r.message || 'No se pudieron cargar los doctores.');
        this.doctors=r.data || [];const available=this.options;const own=this.doctors.find(d=>d.id_login===(this.authUser || {}).id_login && available.some(o=>o.id===d.id_doctor_professional_profile));
        this.selected=available.some(d=>d.id===this.initialDoctorId) ? this.initialDoctorId : own ? own.id_doctor_professional_profile : available.length===1 ? available[0].id : '';
        if(this.selected)await this.load();else if(this.$store){await this.$store.dispatch(ONBOARDING+'subject','');this.publishEditor();}
      }catch(error){if(!this.disposed && sequence===this.initSequence && key===this.editorContextKey)this.error=error.message || 'No se pudieron cargar los doctores.';}
      finally{if(!this.disposed && sequence===this.initSequence && key===this.editorContextKey){this.loading=false;this.syncGuideRequest();}}
    },
    dayName(value) { return (WEEK_DAYS.find(d => d.value === Number(value)) || {}).label || ''; },
    capture() { return {...this.form,doctorProfileId:this.selected,blockedDates:this.blocks.filter(b=>b.allDay).map(b=>({...b,dayOfWeek:b.repeats?b.dayOfWeek:null})),blockedHours:this.blocks.filter(b=>!b.allDay).map(b=>({...b,dayOfWeek:b.repeats?b.dayOfWeek:null}))}; },
    choose(id) { if(this.saving || this.timezoneSaving)return; if(this.dirty || this.pendingCapture || this.pendingSave || this.pendingTimezone) {this.selectorRevision++;this.pending=id;this.leaveOpen=true;} else this.switchTo(id); },
    switchTo(id) { this.leaveOpen=false;if(id==='__close__'){this.$emit('close');return;}this.agendaTab=0;this.dayDialog=false;this.copyDialog=false;this.blockDialog=false;this.selected=id;this.load(); },
    async saveAndSwitch() { if(await this.save()) this.switchTo(this.pending); },
    async load() {
      if(!this.selected)return;const request=++this.request,key=this.editorContextKey,subject=this.selected;
      this.loading=true;this.loaded=false;this.error='';this.message='';this.pendingSave=null;this.pendingTimezone=null;this.saveOutcome='idle';
      try {
        if(this.$store){await this.$store.dispatch(ONBOARDING+'context',this.editorContext);await this.$store.dispatch(ONBOARDING+'subject',subject);const before=await this.$store.dispatch(ONBOARDING+'refresh');if(!this.currentRequest(request,key,subject))return;this.$store.commit(ONBOARDING+'patch',{originAbsent:!!(before && subject!=='business' && before.agenda.configurationState==='absent')});}
        const r=await DAAppointmentService.getConfig(subject);if(!this.currentRequest(request,key,subject))return;
        if(!r.success||!r.data)throw new Error(r.message||'No se pudo cargar esta agenda.');
        this.form=normalizeAppointmentConfig(r.data);this.previewDate=clinicClock(this.form.timezone).date;this.replaceBlocks();this.loaded=true;this.baseline=JSON.stringify(this.capture());
      }catch(e){if(this.currentRequest(request,key,subject))this.error=e.message || 'No se pudo cargar esta agenda.';}
      finally{if(this.currentRequest(request,key,subject)){this.loading=false;this.publishEditor();this.syncGuideRequest();}}
    },
    async reloadCurrentConfig() {
      const request=this.request,key=this.editorContextKey,subject=this.selected;
      const answer = await this.$swal.fire({ title:'Recargar versión vigente',text:'Se descartarán los cambios sin guardar de este formulario.',showCancelButton:true,confirmButtonText:'Descartar y recargar',cancelButtonText:'Seguir editando' });
      if(answer.isConfirmed && this.currentRequest(request,key,subject)) await this.load();
    },
    async save() {
      if(this.saving || this.timezoneSaving || !this.loaded) return false;
      if(this.pendingSave || this.pendingTimezone) return this.reconcileSave();
      if(!(this.isBusiness && this.canManageAllDoctors) && !this.options.some(option => option.id === this.selected)) { this.error='Selecciona una agenda que tengas permiso para configurar.'; return false; }
      if(!this.dirty && !this.needsPersistedReview) {if(this.$store)await this.$store.dispatch(ONBOARDING+'refresh',{force:true});this.message='No hay cambios pendientes. Conservamos la configuración guardada.';return true;}
      const request=this.request,key=this.editorContextKey,subject=this.selected;
      const submitted=JSON.parse(JSON.stringify(this.capture()));let sent=false;
      this.saving=true;this.error='';this.message='';
      try {
        const impact=await DAAppointmentService.configImpact(submitted);
        if(!this.currentRequest(request,key,subject))return false;
        if(!impact.success) throw new Error(impact.message || 'No se pudo revisar el impacto. Tus cambios se conservaron.');
        const affected=impact.data;
        const summary=affected.appointments.slice(0,8).map(a => a.date+' '+a.startTime+' · '+a.patientName+' · '+a.doctorName).join('\n');
        const impactText=affected.count ? affected.count+' citas futuras quedarían fuera del horario. Las citas conservarán su fecha y duración. Revisa cada una desde Agenda.'+(summary?'\n'+summary:'')+(affected.count>8?'\nConsulta las demás en Agenda.':'') : 'Ninguna cita existente queda fuera de estos horarios. Pulsa Guardar configuración para confirmar.';
        const answer=await this.$swal.fire({title:'Revisar cambio de agenda',text:impactText,showCancelButton:true,confirmButtonText:'Guardar configuración',cancelButtonText:'Seguir editando'});
        if(!answer.isConfirmed || !this.currentRequest(request,key,subject)) return false;
        sent=true;this.pendingSave=submitted;
        const r=await DAAppointmentService.saveConfig(submitted);
        if(!this.currentRequest(request,key,subject))return false;
        if(!r.success || !r.data)throw responseFailure(r);
        this.acceptSaved(r.data,submitted);return true;
      } catch(e) {
        if(!this.currentRequest(request,key,subject))return false;
        const status=e.status || (e.response && e.response.status);
        this.saveOutcome=status===409 ? 'conflict' : sent && !(status>=400 && status<500) ? 'uncertain' : 'failed';
        if(this.saveOutcome!=='uncertain')this.pendingSave=null;
        this.error=this.saveOutcome==='uncertain' ? 'Aún no sabemos si se guardaron los cambios. Comprueba lo guardado antes de intentarlo otra vez.' : this.saveOutcome==='conflict' ? 'La agenda cambió mientras la editabas. Tu captura sigue aquí; revisa la versión guardada antes de continuar.' : e.message;
        return false;
      }
      finally {if(this.currentRequest(request,key,subject)){this.saving=false;this.publishEditor();}}
    },
    replaceBlocks() {this.blocks=[...this.form.blockedDates.map(b=>({...b,allDay:true})),...this.form.blockedHours.map(b=>({...b,allDay:false}))];},
    acceptSaved(data,submitted) {
      const saved={...this.form,...normalizeAppointmentConfig(data),doctorProfileId:this.selected,timezone:this.form.timezone,businessRevision:this.form.businessRevision};
      if(configIntent(this.capture())===configIntent(submitted)){this.form=saved;this.replaceBlocks();}
      else this.form.revision=saved.revision;
      this.baseline=JSON.stringify({...saved,blockedDates:saved.blockedDates.map(b=>({...b,allDay:true,dayOfWeek:b.repeats?b.dayOfWeek:null})),blockedHours:saved.blockedHours.map(b=>({...b,allDay:false,dayOfWeek:b.repeats?b.dayOfWeek:null}))});this.pendingSave=null;this.saveOutcome='confirmed';this.error='';
      this.message='Agenda guardada. Las citas existentes conservan sus horarios.';this.notifySaved('schedule',saved.revision);
    },
    notifySaved(kind,revision) {
      const event={kind,instanceId:this.instanceId,subject:this.selected,contextKey:this.editorContextKey,revision,requestSequence:this.request};
      this.publishEditor();if(this.$store)this.$store.dispatch(ONBOARDING+'saved',event);this.$emit('saved',event);
    },
    async retryCurrent() {if(this.pendingSave || this.pendingTimezone)return this.reconcileSave();if(this.saveOutcome==='conflict')return this.reloadCurrentConfig();return this.loaded ? this.save() : this.selected ? this.load() : this.init();},
    async reconcileSave() {
      if(this.saving || this.timezoneSaving || (!this.pendingSave && !this.pendingTimezone))return false;
      const request=this.request,key=this.editorContextKey,subject=this.selected,submitted=this.pendingSave,zone=this.pendingTimezone;
      this.saving=true;
      try {
        const result=await DAAppointmentService.getConfig(zone ? 'business' : subject);
        if(!this.currentRequest(request,key,subject))return false;
        if(!result || !result.success || !result.data)throw new Error('No pudimos comprobar el guardado. Conserva esta pantalla y reintenta la consulta.');
        const stored=normalizeAppointmentConfig(result.data), expected=zone ? zone.revision : submitted.revision;
        const same=zone ? stored.timezone===zone.timezone : configIntent(stored)===configIntent(submitted);
        if(same && Number(stored.revision)>Number(expected)) {
          if(zone)this.acceptTimezone(stored);else this.acceptSaved(stored,submitted);
          return true;
        }
        if(Number(stored.revision)===Number(expected)) {this.pendingSave=null;this.pendingTimezone=null;this.saveOutcome='failed';this.error='No se confirmó el cambio. Tu captura sigue aquí. Puedes revisar y volver a usar Guardar.';}
        else {this.pendingSave=null;this.pendingTimezone=null;this.saveOutcome='conflict';this.error='La versión guardada es diferente. Conservamos tu captura: revisa la versión vigente antes de guardar.';}
        return false;
      }catch(error){if(this.currentRequest(request,key,subject))this.error=error.message;return false;}
      finally{if(this.currentRequest(request,key,subject)){this.saving=false;this.publishEditor();}}
    },
    async persistTimezone(timezone) {
      if(!this.canManageAllDoctors || this.loading || this.saving || this.timezoneSaving) throw new Error('No se puede cambiar la zona horaria en este momento.');
      if(this.pendingSave || this.pendingTimezone){const confirmed=await this.reconcileSave();if(confirmed && this.form.timezone===timezone)return;throw new Error(this.error || 'Revisa lo guardado antes de cambiar la hora.');}
      const request=this.request,key=this.editorContextKey,subject=this.selected,revision=this.isBusiness ? this.form.revision : this.form.businessRevision;
      this.timezoneSaving=true;this.message='';
      this.pendingTimezone={timezone,revision};
      try {
        const result=await DAAppointmentService.saveTimezone(timezone,revision);
        if(!this.currentRequest(request,key,subject))throw new Error('El contexto cambió. Revisa la hora desde la agenda actual.');
        if(!result.success || !result.data)throw responseFailure(result);
        this.acceptTimezone(result.data);
      }catch(error){
        if(this.currentRequest(request,key,subject)){const status=error.status || (error.response && error.response.status);this.saveOutcome=status===409?'conflict':status>=400 && status<500?'failed':'uncertain';if(this.saveOutcome!=='uncertain')this.pendingTimezone=null;this.error=this.saveOutcome==='uncertain'?'Aún no sabemos si se guardó la hora. Comprueba lo guardado antes de reenviar.':error.message;}
        throw error;
      } finally {if(this.currentRequest(request,key,subject)){this.timezoneSaving=false;this.publishEditor();}}
    },
    acceptTimezone(data) {
      const versionKey=this.isBusiness ? 'revision' : 'businessRevision';this.form.timezone=data.timezone;this.form[versionKey]=data.revision;
      if(this.baseline){const baseline=JSON.parse(this.baseline);baseline.timezone=data.timezone;baseline[versionKey]=data.revision;this.baseline=JSON.stringify(baseline);}
      this.pendingTimezone=null;this.saveOutcome='confirmed';this.error='';this.message='Zona horaria del consultorio guardada. Los cambios de horarios se guardan aparte.';this.notifySaved('timezone',data.revision);
    },
    displayDate(value) { return formatDisplayDate(value); },
    openEditDay(day,event) {
      this.rememberDialogFocus(event);
      this.editingDay = {...day,timeRanges:day.timeRanges.map(range=>({...range}))};
      this.editingDayError='';this.dayDialog=true;
    },
    addEditingRange() {
      const ranges = this.editingDay.timeRanges;
      if(!ranges.length) { ranges.push({id:createId('range'),startTime:'08:00',endTime:'12:00'}); return; }
      const error = this.validateRanges(ranges);
      if(error) { this.editingDayError = 'Corrige los rangos actuales antes de agregar otro. ' + error; return; }
      const ordered = [...ranges].sort((a,b)=>timeToMinutes(a.startTime)-timeToMinutes(b.startTime));
      const gaps = [{start:timeToMinutes(ordered[ordered.length-1].endTime),end:1439}];
      let end = 0;
      ordered.forEach(range=>{ gaps.push({start:end,end:timeToMinutes(range.startTime)}); end=timeToMinutes(range.endTime); });
      const duration = Math.max(5, Number(this.form.defaultAppointmentDuration) || 30);
      const gap = gaps.find(item=>item.end-item.start>=duration);
      if(!gap) {this.editingDayError='No queda un espacio libre para agregar otro rango. Ajusta los horarios existentes.';return;}
      const time = value => `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
      ranges.push({id:createId('range'),startTime:time(gap.start),endTime:time(Math.min(gap.end,gap.start+Math.max(60,duration)))});
      this.editingDayError='';
    },
    validateRanges(ranges) {
      if(!ranges.length) return 'Agrega al menos un rango para este día laboral.';
      const ordered = [...ranges].sort((a,b)=>timeToMinutes(a.startTime)-timeToMinutes(b.startTime));
      for(let i=0;i<ordered.length;i++) {
        const range=ordered[i];
        if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(range.startTime || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(range.endTime || '')) return 'Completa inicio y fin de cada rango.';
        if(timeToMinutes(range.startTime)>=timeToMinutes(range.endTime)) return 'La hora de inicio debe ser menor que la hora fin.';
        if(ordered[i+1] && timeToMinutes(range.endTime)>timeToMinutes(ordered[i+1].startTime)) return 'Los rangos no deben empalmarse.';
      }
      return '';
    },
    applyDay() {
      this.editingDayError=this.editingDay.enabled ? this.validateRanges(this.editingDay.timeRanges) : '';
      if(this.editingDayError) return false;
      const index=this.form.workingDays.findIndex(day=>day.dayOfWeek===this.editingDay.dayOfWeek);
      if(index<0) return false;
      this.form.workingDays.splice(index,1,{...this.editingDay,timeRanges:this.editingDay.timeRanges.map(range=>({...range}))});
      this.message='';this.dayDialog=false;return true;
    },
    openCopyDay(day,event) { this.rememberDialogFocus(event);this.copySourceDay=day;this.copyTargetDays=[];this.copyDialog=true; },
    applyCopy() {
      this.copyTargetDays.forEach(value=>{
        const day=this.form.workingDays.find(item=>item.dayOfWeek===value);
        if(day && day.dayOfWeek!==this.copySourceDay.dayOfWeek) {
          day.enabled=true;day.timeRanges=this.copySourceDay.timeRanges.map(range=>({...range,id:createId('range')}));
        }
      });
      this.message='';this.copyDialog=false;
    },
    openBlockDialog(allDay,index=-1,event) {
      this.rememberDialogFocus(event);
      this.editingBlockIndex=index;
      this.editingBlock=index>=0 ? {...this.blocks[index]} : {date:'',repeats:false,repeatType:'none',dayOfWeek:1,allDay,reason:'',startTime:'13:00',endTime:'14:00'};
      this.blockError='';this.blockAttempted=false;this.blockDialog=true;
    },
    validBlockDate(value) { if(!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;const parsed=new Date(`${value}T12:00:00Z`);return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10)===value; },
    applyBlock() {
      this.blockError='';
      this.blockAttempted=true;
      if(!this.editingBlock.repeats && !this.validBlockDate(this.editingBlock.date)) this.blockError='Selecciona una fecha válida para el bloqueo.';
      else if(this.editingBlock.repeats && !this.weekDays.some(day=>day.value===this.editingBlock.dayOfWeek)) this.blockError='Selecciona el día de la semana.';
      else if(!this.editingBlock.allDay) this.blockError=this.validateRanges([this.editingBlock]);
      if(this.blockError) return false;
      const block={...this.editingBlock,id:this.editingBlock.id || createId('block'),repeatType:this.editingBlock.repeats ? 'weekly' : 'none',date:this.editingBlock.repeats ? '' : this.editingBlock.date,dayOfWeek:this.editingBlock.repeats ? this.editingBlock.dayOfWeek : null};
      if(this.editingBlockIndex>=0) this.blocks.splice(this.editingBlockIndex,1,block);else this.blocks.push(block);
      this.message='';this.blockDialog=false;return true;
    }
  }
};
</script>
<style scoped>
.agenda-guide-target{scroll-margin:24px}.professional-agenda :focus-visible{outline:3px solid #087f80;outline-offset:3px}@media(prefers-reduced-motion:reduce){.professional-agenda *{scroll-behavior:auto!important;transition:none!important}}
.professional-agenda{border-radius:16px;overflow:hidden;min-width:0;color:#526575}
.agenda-header{padding:22px 28px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
.agenda-header-actions{display:flex;align-items:center;flex-wrap:wrap;gap:16px;flex-shrink:0}
.agenda-body{padding:24px 28px}.agenda-scope{display:grid;grid-template-columns:minmax(240px,1fr) minmax(0,1fr);gap:20px;align-items:center;margin-bottom:24px}
.agenda-eyebrow{margin:0 0 4px;color:var(--color-primary-900);font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;overflow-wrap:anywhere}
.agenda-title{margin:0;color:#374151;font-size:18px;font-weight:600}.agenda-description{margin:5px 0 0;color:#6b7280;font-size:14px;line-height:1.5}
.agenda-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:24px}.agenda-summary-business{grid-template-columns:repeat(2,minmax(0,1fr))}
.agenda-panel{min-width:0;border:1px solid #e5e7eb;border-radius:12px;background:#fff;box-shadow:0 3px 10px #24445208;padding:20px}.agenda-summary-card{padding:16px 20px}
.agenda-tabs{border-bottom:1px solid #e5e7eb}.agenda-tab-content{margin-top:20px;background:transparent!important}
.agenda-hours-layout{display:grid;grid-template-columns:minmax(220px,1fr) minmax(0,2fr);gap:20px;align-items:start}.agenda-hours-business{grid-template-columns:1fr}
.agenda-note{padding:14px;background:#f7fafb;border:1px solid #e5eef1;border-radius:8px;font-size:13px;line-height:1.6;margin:16px 0 0}
.agenda-days{display:grid;gap:10px}.agenda-day{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb}
.agenda-day-actions{display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0}.agenda-badge{padding:3px 8px;border:1px solid;border-radius:16px;font-size:11px;font-weight:600}
.agenda-badge-active{background:#ecfdf5;color:#047857;border-color:#a7f3d0}.agenda-badge-inactive{background:#f3f4f6;color:#6b7280;border-color:#e5e7eb}
.agenda-range-chip{padding:4px 10px;background:#fff;border:1px solid var(--color-primary-200);color:var(--color-primary-900);border-radius:6px;font-size:13px;font-weight:600}
.agenda-panel-header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:20px}.agenda-empty{padding:28px 16px;text-align:center;background:#f7fafb;border:1px dashed #d9e6eb;border-radius:10px}
.agenda-blocks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.agenda-block{display:flex;justify-content:space-between;gap:8px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow-wrap:anywhere}
.agenda-preview-date{max-width:220px}.agenda-preview-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:16px}.agenda-slot{padding:6px 10px;border:1px solid #a7f3d0;border-radius:6px;background:#ecfdf5;color:#047857;font-size:13px;font-weight:600}
.agenda-footer{display:flex;align-items:center;justify-content:space-between;gap:20px;border-top:1px solid #e5e7eb;margin-top:24px;padding-top:20px}.agenda-footer .v-btn{flex-shrink:0}
.agenda-notice{margin:16px 0;padding:12px 16px;border:1px solid;border-radius:8px;font-size:14px;line-height:1.6}.agenda-notice-error{color:#991b1b;border-color:#fecaca;background:#fef2f2}.agenda-notice-success{color:#065f46;border-color:#a7f3d0;background:#ecfdf5}
.agenda-link{color:var(--color-primary-900);font-weight:600;padding:6px 0;text-align:left;text-decoration:underline}.professional-agenda button:focus-visible,.agenda-dialog button:focus-visible{outline:2px solid var(--color-primary-700);outline-offset:3px}
.agenda-dialog{border-radius:14px!important}.agenda-dialog-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 24px;border-bottom:1px solid #e5e7eb;background:var(--color-primary-100)}.agenda-dialog-actions{padding:12px 24px 20px;justify-content:flex-end;flex-wrap:wrap;gap:8px}.agenda-dialog-actions .v-btn{margin:0!important}
.agenda-range{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 40px;gap:8px;align-items:center}.agenda-block-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.professional-agenda ::v-deep .v-btn,.agenda-dialog ::v-deep .v-btn{text-transform:none;letter-spacing:0;font-weight:600}.professional-agenda ::v-deep .v-tab{text-transform:none;letter-spacing:.3px;font-weight:600;min-width:0}.professional-agenda ::v-deep .v-slide-group__prev{display:none!important}
@media(max-width:1100px){.agenda-header{flex-direction:column}.agenda-hours-layout{grid-template-columns:1fr}.agenda-hours-layout>.agenda-panel:first-child{display:block}}
@media(max-width:600px){.agenda-header,.agenda-body{padding:20px 16px}.agenda-header-actions{width:100%;justify-content:space-between;gap:10px}.agenda-header-actions .v-btn{font-size:12px;padding:0 12px}.agenda-scope{grid-template-columns:1fr;gap:12px}.agenda-summary{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.agenda-summary-card{padding:14px}.agenda-panel{padding:16px}.agenda-day{flex-direction:column;align-items:flex-start}.agenda-day-actions{width:100%;justify-content:flex-end}.agenda-panel-header{flex-direction:column;gap:16px}.agenda-preview-grid,.agenda-blocks,.agenda-block-form{grid-template-columns:1fr}.agenda-preview-date{width:100%;max-width:none}.agenda-footer{flex-direction:column;align-items:stretch}.agenda-dialog-header{padding:18px 20px}.agenda-dialog-actions{padding:12px 20px 20px}.professional-agenda ::v-deep .v-tab{padding:0 8px;font-size:12px}}
@media(max-width:380px){.agenda-range{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.agenda-range>.v-btn{grid-column:2;justify-self:end}}
.agenda-repair{margin:16px;padding:16px;border:1px solid #b8d4d8;border-radius:12px;background:#f0f8fa;color:#234a52}.agenda-repair p{margin:8px 0;line-height:1.5}.professional-agenda .v-input:focus-within{outline:2px solid #087f80;outline-offset:3px;border-radius:6px}.professional-agenda ::v-deep .v-input input:focus-visible{outline:none}
</style>
