<template>
  <section class="professional-agenda bg-white border border-primary-200 shadow-xl">
    <header class="agenda-header border-b border-primary-200 bg-primary-100">
      <div>
        <p class="agenda-eyebrow">Agenda clinica</p>
        <h2 class="m-0 text-2xl font-normal text-gray-700">Configuracion de citas</h2>
        <p class="m-0 mt-2 text-sm text-gray-500">Horarios, duracion de citas y bloqueos de disponibilidad.</p>
      </div>
      <div v-if="selected && loaded" class="agenda-header-actions">
        <v-switch v-model="form.enabled" inset hide-details :label="isBusiness ? 'Consultorio disponible' : 'Agenda activa'" :disabled="saving" :color="themeColor" class="m-0"></v-switch>
        <v-btn rounded depressed :color="themeColor" dark :loading="saving" :disabled="loading" @click="save">Guardar cambios</v-btn>
      </div>
    </header>
    <div class="agenda-body">
      <div class="agenda-scope">
        <v-select :key="selected + '-' + selectorRevision" :value="selected" :items="options" item-text="label" item-value="id" label="Doctor / alcance de la configuracion" outlined dense hide-details :disabled="loading || saving" :color="themeColor" @change="choose"></v-select>
        <div class="text-sm text-gray-600">
          <p class="m-0">{{ !selected ? 'Selecciona el doctor cuya agenda quieres configurar.' : isBusiness ? 'Cierres generales que aplican a todos los doctores.' : 'Estos cambios aplican solo a ' + doctorName + '.' }}</p>
          <p v-if="loaded && !isBusiness" class="m-0 mt-1 text-gray-500">Los cierres del consultorio tambien se respetan.</p>
        </div>
      </div>
      <p v-if="loading" role="status" class="mt-4 text-gray-600">Cargando configuracion…</p>
      <div v-if="!loading && !error && !doctors.length" role="status" class="agenda-notice">
        <p>Todavía no hay doctores con perfil activo. Completa y guarda tu perfil profesional; después configura sus horarios de atención. Los cierres generales no sustituyen la agenda del doctor.</p>
        <router-link to="/admin?section=doctor-identity&returnTo=%2Fpx%2Fdates" class="agenda-link underline">Completar mi perfil profesional</router-link>
      </div>
      <div v-if="error" role="alert" class="agenda-notice agenda-notice-error">
        {{ error }} <button v-if="!loading" type="button" class="agenda-link" @click="loaded ? save() : selected ? load() : init()">Reintentar</button>
      </div>
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
                <v-select v-if="!isBusiness" v-model="form.defaultAppointmentDuration" :items="durationOptions" item-text="label" item-value="value" label="Duracion habitual" outlined dense :disabled="saving" :color="themeColor" class="mt-5"></v-select>
                <v-text-field v-model="form.timezone" label="Zona horaria del consultorio" :readonly="!isBusiness" outlined dense :disabled="saving" :color="themeColor" :class="{ 'mt-5': isBusiness }" :hint="!isBusiness ? 'Se administra en los cierres generales del consultorio.' : ''" :persistent-hint="!isBusiness"></v-text-field>
                <p class="agenda-note">{{ isBusiness ? 'Los horarios de atencion se configuran en la agenda de cada doctor. Los cierres generales aplican a todos.' : 'Las citas creadas desde seguimiento inician como pendientes de confirmar.' }}</p>
              </article>
              <article v-if="!isBusiness" class="agenda-panel">
                <p class="agenda-eyebrow">Semana</p>
                <h3 class="agenda-title">Horarios semanales</h3>
                <p class="agenda-description mb-4">Edita un dia solo cuando necesites cambiar sus rangos.</p>
                <div class="agenda-days">
                  <div v-for="day in form.workingDays" :key="day.dayOfWeek" class="agenda-day">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <h4 class="m-0 text-base font-semibold text-gray-700">{{ dayName(day.dayOfWeek) }}</h4>
                        <span class="agenda-badge" :class="day.enabled ? 'agenda-badge-active' : 'agenda-badge-inactive'">{{ day.enabled ? 'Activo' : 'Inactivo' }}</span>
                      </div>
                      <div class="flex flex-wrap gap-2 mt-2">
                        <span v-if="!day.enabled || !day.timeRanges.length" class="text-sm text-gray-500">Sin atencion</span>
                        <span v-for="(range, i) in day.enabled ? day.timeRanges : []" :key="i" class="agenda-range-chip">{{ range.startTime }} - {{ range.endTime }}</span>
                      </div>
                    </div>
                    <div class="agenda-day-actions">
                      <v-btn small outlined rounded :color="themeColor" :disabled="saving" :aria-label="'Editar ' + dayName(day.dayOfWeek)" @click="openEditDay(day)">Editar</v-btn>
                      <v-btn v-if="day.enabled && day.timeRanges.length" small outlined rounded :color="themeColor" :disabled="saving" :aria-label="'Copiar horario de ' + dayName(day.dayOfWeek)" @click="openCopyDay(day)">Copiar</v-btn>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </v-tab-item>
          <v-tab-item>
            <article class="agenda-panel">
              <div class="agenda-panel-header">
                <div><p class="agenda-eyebrow">{{ isBusiness ? 'Cierres generales' : 'Bloqueos del doctor' }}</p><h3 class="agenda-title">Dias y horarios no disponibles</h3><p class="agenda-description">Agrega vacaciones, cursos o actividades internas.</p></div>
                <div class="flex flex-wrap gap-2">
                  <v-btn small rounded outlined :color="themeColor" :disabled="saving" @click="openBlockDialog(true)">+ Bloquear dia</v-btn>
                  <v-btn small rounded depressed :color="themeColor" dark :disabled="saving" @click="openBlockDialog(false)">+ Bloquear horario</v-btn>
                </div>
              </div>
              <div v-if="!blocks.length" class="agenda-empty"><v-icon :color="themeColor" class="mb-2">mdi-calendar-check-outline</v-icon><h4 class="m-0 font-semibold text-gray-700">No tienes bloqueos configurados</h4><p class="agenda-description">Agrega dias festivos, vacaciones u horarios no disponibles.</p></div>
              <div v-else class="agenda-blocks">
                <div v-for="(block, i) in blocks" :key="i" class="agenda-block">
                  <div class="min-w-0"><p class="m-0 font-semibold text-gray-700">{{ block.repeats ? dayName(block.dayOfWeek) : displayDate(block.date) }}</p><p class="agenda-description">{{ block.allDay ? 'Dia completo' : block.startTime + ' - ' + block.endTime }}{{ block.repeats ? ' · Repite semanalmente' : '' }}</p><p class="m-0 mt-2 text-sm text-gray-600">{{ block.reason || 'Sin motivo' }}</p></div>
                  <div class="flex"><v-btn icon small :color="themeColor" :disabled="saving" :aria-label="'Editar bloqueo ' + (i + 1)" @click="openBlockDialog(block.allDay, i)"><v-icon>mdi-pencil-outline</v-icon></v-btn><v-btn icon small color="#A6001E" :disabled="saving" :aria-label="'Quitar bloqueo ' + (i + 1)" @click="blocks.splice(i, 1)"><v-icon>mdi-delete-outline</v-icon></v-btn></div>
                </div>
              </div>
            </article>
          </v-tab-item>
          <v-tab-item v-if="!isBusiness">
            <article class="agenda-panel">
              <div class="agenda-panel-header"><div><p class="agenda-eyebrow">Vista previa</p><h3 class="agenda-title">Disponibilidad generada</h3><p class="agenda-description">Revisa esta configuracion antes de guardar. No incluye citas ya reservadas.</p></div><v-text-field v-model="previewDate" type="date" label="Fecha de vista previa" outlined dense hide-details :color="themeColor" class="agenda-preview-date"></v-text-field></div>
              <p v-if="!form.enabled || form.businessEnabled === false" class="agenda-note">{{ !form.enabled ? 'La agenda de este doctor esta inactiva.' : 'El consultorio no esta disponible.' }} Activa la configuracion correspondiente para generar horarios.</p>
              <div v-else-if="previewBlocked" class="agenda-notice agenda-notice-error">Este dia esta bloqueado completo.</div>
              <div class="agenda-preview-grid">
                <div class="agenda-note"><p class="agenda-eyebrow">Horario laboral</p><h4 class="m-0 mt-2 font-semibold text-gray-700">{{ previewDayName }}</h4><div class="flex flex-wrap gap-2 mt-3"><span v-if="!previewRanges.length" class="text-sm text-gray-500">Dia sin atencion</span><span v-for="(range, i) in previewRanges" :key="i" class="agenda-range-chip">{{ range.startTime }} - {{ range.endTime }}</span></div></div>
                <div class="agenda-note"><p class="agenda-eyebrow">Horarios disponibles</p><div class="flex flex-wrap gap-2 mt-3"><span v-if="!previewSlots.length" class="text-sm text-gray-500">No hay horarios disponibles para esta fecha.</span><span v-for="slot in previewSlots" :key="slot.startTime" class="agenda-slot">{{ slot.startTime }}</span></div></div>
              </div>
              <div class="agenda-note mt-4"><p class="agenda-eyebrow">Bloqueos aplicados</p><div class="flex flex-wrap gap-2 mt-3"><span v-if="!previewHourBlocks.length && !previewBlocked" class="text-sm text-gray-500">Sin bloqueos para esta fecha.</span><span v-if="previewBlocked" class="text-sm text-gray-600">Dia completo</span><span v-for="(block, i) in previewHourBlocks" :key="i" class="agenda-range-chip">{{ block.startTime }} - {{ block.endTime }} {{ block.reason }}</span></div></div>
            </article>
          </v-tab-item>
        </v-tabs-items>
        <footer class="agenda-footer"><p class="m-0 text-sm text-gray-500">{{ dirty ? 'Tienes cambios sin guardar. ' : '' }}Guardar cambia la disponibilidad; las citas ya creadas conservan su horario.</p><v-btn rounded depressed :color="themeColor" dark :loading="saving" :disabled="loading" @click="save">Guardar cambios</v-btn></footer>
      </template>
    </div>
    <v-dialog v-model="dayDialog" persistent max-width="620">
      <v-card class="agenda-dialog">
        <div class="agenda-dialog-header"><div><p class="agenda-eyebrow">{{ doctorName }} · Horario semanal</p><h3 class="agenda-title">Editar {{ dayName(editingDay.dayOfWeek) }}</h3></div><v-btn icon aria-label="Cerrar edicion de horario" @click="dayDialog = false"><v-icon>mdi-close</v-icon></v-btn></div>
        <v-card-text class="pt-5"><v-switch v-model="editingDay.enabled" inset :color="themeColor" label="Dia laboral"></v-switch>
          <template v-if="editingDay.enabled"><div v-for="(range, i) in editingDay.timeRanges" :key="i" class="agenda-range mb-3"><v-text-field v-model="range.startTime" type="time" :label="'Inicio ' + (i + 1)" outlined dense hide-details :color="themeColor"></v-text-field><v-text-field v-model="range.endTime" type="time" :label="'Fin ' + (i + 1)" outlined dense hide-details :color="themeColor"></v-text-field><v-btn icon color="#A6001E" :aria-label="'Quitar rango ' + (i + 1)" @click="editingDay.timeRanges.splice(i, 1)"><v-icon>mdi-delete-outline</v-icon></v-btn></div><v-btn small rounded outlined :color="themeColor" @click="addEditingRange">+ Agregar rango</v-btn></template>
          <p v-else class="text-gray-500">Este dia no generara horarios disponibles.</p><p v-if="editingDayError" role="alert" class="text-red-700 mt-3">{{ editingDayError }}</p><p class="text-sm text-gray-500 mt-4">Los cambios se guardan al pulsar Guardar cambios en la agenda.</p>
        </v-card-text>
        <v-card-actions class="agenda-dialog-actions"><v-btn rounded outlined :color="themeColor" @click="dayDialog = false">Cancelar</v-btn><v-btn rounded depressed :color="themeColor" dark @click="applyDay">Aplicar horario</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="copyDialog" persistent max-width="500">
      <v-card class="agenda-dialog"><div class="agenda-dialog-header"><div><p class="agenda-eyebrow">{{ doctorName }} · Copiar horario</p><h3 class="agenda-title">Copiar {{ dayName(copySourceDay.dayOfWeek) }}</h3></div><v-btn icon aria-label="Cerrar copia de horario" @click="copyDialog = false"><v-icon>mdi-close</v-icon></v-btn></div><v-card-text class="pt-5"><p>Selecciona los dias que recibiran estos rangos. Reemplazara sus horarios actuales dentro de esta agenda.</p><div class="flex flex-wrap gap-2 mb-3"><span v-for="(range, i) in copySourceDay.timeRanges" :key="i" class="agenda-range-chip">{{ range.startTime }} - {{ range.endTime }}</span></div><v-checkbox v-for="day in copyTargetOptions" :key="day.value" v-model="copyTargetDays" :value="day.value" :label="day.label" :color="themeColor" hide-details></v-checkbox><p class="text-sm text-gray-500 mt-4">Despues pulsa Guardar cambios en la agenda.</p></v-card-text><v-card-actions class="agenda-dialog-actions"><v-btn rounded outlined :color="themeColor" @click="copyDialog = false">Cancelar</v-btn><v-btn rounded depressed :color="themeColor" dark :disabled="!copyTargetDays.length" @click="applyCopy">Copiar horario</v-btn></v-card-actions></v-card>
    </v-dialog>
    <v-dialog v-model="blockDialog" persistent max-width="600">
      <v-card class="agenda-dialog"><div class="agenda-dialog-header"><div><p class="agenda-eyebrow">{{ doctorName }}</p><h3 class="agenda-title">{{ editingBlockIndex === -1 ? 'Agregar' : 'Editar' }} bloqueo</h3></div><v-btn icon aria-label="Cerrar edicion de bloqueo" @click="blockDialog = false"><v-icon>mdi-close</v-icon></v-btn></div><v-card-text class="pt-5"><div class="agenda-block-form"><v-checkbox v-model="editingBlock.repeats" label="Repetir cada semana" :color="themeColor" hide-details></v-checkbox><v-checkbox v-model="editingBlock.allDay" label="Todo el dia" :color="themeColor" hide-details></v-checkbox><v-select v-if="editingBlock.repeats" v-model="editingBlock.dayOfWeek" :items="weekDays" item-text="label" item-value="value" label="Dia de la semana" outlined dense hide-details :color="themeColor"></v-select><v-text-field v-else v-model="editingBlock.date" type="date" label="Fecha del bloqueo" outlined dense hide-details :color="themeColor"></v-text-field><v-text-field v-model="editingBlock.reason" label="Motivo (opcional)" outlined dense hide-details :color="themeColor"></v-text-field><v-text-field v-if="!editingBlock.allDay" v-model="editingBlock.startTime" type="time" label="Inicio del bloqueo" outlined dense hide-details :color="themeColor"></v-text-field><v-text-field v-if="!editingBlock.allDay" v-model="editingBlock.endTime" type="time" label="Fin del bloqueo" outlined dense hide-details :color="themeColor"></v-text-field></div><p v-if="blockError" role="alert" class="text-red-700 mt-3">{{ blockError }}</p><p class="text-sm text-gray-500 mt-4">Los cambios se guardan al pulsar Guardar cambios en la agenda.</p></v-card-text><v-card-actions class="agenda-dialog-actions"><v-btn rounded outlined :color="themeColor" @click="blockDialog = false">Cancelar</v-btn><v-btn rounded depressed :color="themeColor" dark @click="applyBlock">Aplicar bloqueo</v-btn></v-card-actions></v-card>
    </v-dialog>
    <v-dialog v-model="leaveOpen" persistent max-width="500">
      <v-card class="p-5"><h3 class="text-xl font-semibold text-gray-700">Cambios sin guardar</h3><p>Guarda la agenda antes de cambiar de doctor o descarta estos cambios.</p>
        <div class="flex flex-wrap gap-2"><v-btn :color="themeColor" dark :loading="saving" @click="saveAndSwitch">Guardar y cambiar</v-btn><v-btn outlined :disabled="saving" @click="switchTo(pending)">Descartar cambios</v-btn><v-btn text :disabled="saving" @click="leaveOpen = false">Seguir editando</v-btn></div>
      </v-card>
    </v-dialog>
  </section>
</template>
<script>
import { mapGetters } from 'vuex';
import { isTenantAdministrator } from '../../../security/settingsAccess';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { DAAppointmentService } from '../../../services/context/core-proccess-context';
import { normalizeAppointmentConfig, WEEK_DAYS, createId } from '../../../domain/appointments/appointment.storage';
import { generateDaySlots, getDayWorkingConfig, getHourBlocksForDate, isDateBlocked, timeToMinutes, formatDisplayDate } from '../../../domain/appointments/availability';
export default {
  props: { themeColor: { type: String, default: '#087F8C' }, initialDoctorId: { type: String, default: '' } },
  data() {
    const today = new Date();
    return {
      doctors: [], selected: '', form: normalizeAppointmentConfig({enabled:false}), blocks: [], weekDays: WEEK_DAYS, durations:[10,15,20,30,45,60,90,120],
      loading:false, loaded:false, saving:false, error:'', message:'', baseline:'', leaveOpen:false, pending:'', request:0, selectorRevision:0,
      agendaTab:0, dayDialog:false, editingDay:{dayOfWeek:1,enabled:false,timeRanges:[]}, editingDayError:'',
      copyDialog:false, copySourceDay:{dayOfWeek:1,timeRanges:[]}, copyTargetDays:[],
      blockDialog:false, editingBlock:{}, editingBlockIndex:-1, blockError:'',
      previewDate: `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    };
  },
  computed: {
    ...mapGetters(moduleTypes.AUTH, { authUser: fnTypes.getUser, hasPermission: fnTypes.hasPermission, role:fnTypes.getRole }),
    canManageAllDoctors() { return isTenantAdministrator(this.role) && this.hasPermission('admin.config'); },
    options() { const list = this.doctors.filter(d => this.canManageAllDoctors || d.id_login === (this.authUser || {}).id_login).map(d => ({id:d.id_doctor_professional_profile,label:d.display_name})); return this.canManageAllDoctors ? [...list,{id:'business',label:'Consultorio — cierres generales'}] : list; },
    doctorName() { return (this.options.find(d => d.id === this.selected) || {}).label || ''; },
    dirty() { return this.loaded && !!this.baseline && JSON.stringify(this.capture()) !== this.baseline; },
    isBusiness() { return this.selected === 'business'; },
    durationOptions() { return this.durations.map(value => ({value,label:`${value} minutos`})); },
    summary() {
      const days = this.form.workingDays.filter(day => day.enabled);
      const blocks = {label:'Bloqueos',value:this.blocks.length,detail:this.isBusiness ? 'generales del consultorio' : 'de esta agenda'};
      return this.isBusiness ? [{label:'Alcance',value:'Todos',detail:'los doctores del consultorio'},blocks] : [
        {label:'Dias activos',value:days.length,detail:'de 7 dias configurados'},
        {label:'Duracion',value:`${this.form.defaultAppointmentDuration} min`,detail:'por cita'},
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
  mounted() {
    this.init();
    this.removeNavigationGuard = this.$router.beforeEach(async (to, from, next) => {
      if(this.saving) return next(false);
      if(!this.dirty) return next();
      const result = await this.$swal.fire({title:'Cambios sin guardar',text:'Los cambios de agenda aun no se han guardado.',showCancelButton:true,confirmButtonText:'Descartar y salir',cancelButtonText:'Seguir editando',confirmButtonColor:this.themeColor,cancelButtonColor:'#526575'});
      next(result.isConfirmed ? undefined : false);
    });
  },
  beforeDestroy() { this.request++; if(this.removeNavigationGuard)this.removeNavigationGuard(); },
  methods: {
    async init() { this.loading=true;this.error='';try { const r = await DAAppointmentService.doctors(); if(!r.success) { this.error=r.message || 'No se pudieron cargar los doctores.'; return; } this.doctors=r.data || []; const own=this.doctors.find(d => d.id_login === (this.authUser || {}).id_login); this.selected=this.options.some(d=>d.id===this.initialDoctorId) ? this.initialDoctorId : own ? own.id_doctor_professional_profile : this.doctors.length === 1 ? this.doctors[0].id_doctor_professional_profile : ''; if(this.selected) await this.load(); }catch(error){this.error='No se pudieron cargar los doctores. Reintenta.';}finally{this.loading=false;} },
    dayName(value) { return (WEEK_DAYS.find(d => d.value === Number(value)) || {}).label || ''; },
    capture() { return {...this.form,doctorProfileId:this.selected,blockedDates:this.blocks.filter(b=>b.allDay).map(b=>({...b,dayOfWeek:b.repeats?b.dayOfWeek:null})),blockedHours:this.blocks.filter(b=>!b.allDay).map(b=>({...b,dayOfWeek:b.repeats?b.dayOfWeek:null}))}; },
    choose(id) { if(this.dirty) {this.selectorRevision++;this.pending=id;this.leaveOpen=true;} else this.switchTo(id); },
    switchTo(id) { this.leaveOpen=false;if(id==='__close__'){this.$emit('close');return;}this.agendaTab=0;this.dayDialog=false;this.copyDialog=false;this.blockDialog=false;this.selected=id;this.load(); },
    async saveAndSwitch() { if(await this.save()) this.switchTo(this.pending); },
    async load() { if(!this.selected) return; const request=++this.request;this.loading=true;this.loaded=false;this.error='';this.message=''; try {const r=await DAAppointmentService.getConfig(this.selected);if(request!==this.request)return;if(!r.success||!r.data)throw new Error(r.message||'No se pudo cargar esta agenda.');this.form=normalizeAppointmentConfig(r.data);this.blocks=[...this.form.blockedDates.map(b=>({...b,allDay:true})),...this.form.blockedHours.map(b=>({...b,allDay:false}))];this.loaded=true;this.baseline=JSON.stringify(this.capture());}catch(e){if(request===this.request)this.error=e.message;}finally{if(request===this.request)this.loading=false;} },
    async save() { if(this.saving||!this.loaded)return false;this.saving=true;this.error='';this.message='';try {const r=await DAAppointmentService.saveConfig(this.capture());if(!r.success)throw new Error(r.message||'No se pudo guardar. Tus cambios se conservaron.');this.baseline=JSON.stringify(this.capture());this.message='Agenda guardada.';this.$emit('saved');return true;}catch(e){this.error=e.message;return false;}finally{this.saving=false;} },
    displayDate(value) { return formatDisplayDate(value); },
    openEditDay(day) {
      this.editingDay = {...day,timeRanges:day.timeRanges.map(range=>({...range}))};
      this.editingDayError='';this.dayDialog=true;
    },
    addEditingRange() { this.editingDay.timeRanges.push({id:createId('range'),startTime:'08:00',endTime:'12:00'}); },
    validateRanges(ranges) {
      if(!ranges.length) return 'Agrega al menos un rango para este dia laboral.';
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
    openCopyDay(day) { this.copySourceDay=day;this.copyTargetDays=[];this.copyDialog=true; },
    applyCopy() {
      this.copyTargetDays.forEach(value=>{
        const day=this.form.workingDays.find(item=>item.dayOfWeek===value);
        if(day && day.dayOfWeek!==this.copySourceDay.dayOfWeek) {
          day.enabled=true;day.timeRanges=this.copySourceDay.timeRanges.map(range=>({...range,id:createId('range')}));
        }
      });
      this.message='';this.copyDialog=false;
    },
    openBlockDialog(allDay,index=-1) {
      this.editingBlockIndex=index;
      this.editingBlock=index>=0 ? {...this.blocks[index]} : {date:'',repeats:false,repeatType:'none',dayOfWeek:1,allDay,reason:'',startTime:'13:00',endTime:'14:00'};
      this.blockError='';this.blockDialog=true;
    },
    applyBlock() {
      this.blockError='';
      if(!this.editingBlock.repeats && (!/^\d{4}-\d{2}-\d{2}$/.test(this.editingBlock.date || '') || !Number.isFinite(new Date(`${this.editingBlock.date}T00:00:00`).getTime()))) this.blockError='Selecciona una fecha para el bloqueo.';
      else if(this.editingBlock.repeats && !this.weekDays.some(day=>day.value===this.editingBlock.dayOfWeek)) this.blockError='Selecciona el dia de la semana.';
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
.professional-agenda{border-radius:16px;overflow:hidden;min-width:0;color:#526575}
.agenda-header{padding:22px 28px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
.agenda-header-actions{display:flex;align-items:center;flex-wrap:wrap;gap:16px;flex-shrink:0}
.agenda-body{padding:24px 28px}.agenda-scope{display:grid;grid-template-columns:minmax(240px,1fr) minmax(0,1fr);gap:20px;align-items:center;margin-bottom:24px}
.agenda-eyebrow{margin:0 0 4px;color:var(--color-primary-900,#087F8C);font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;overflow-wrap:anywhere}
.agenda-title{margin:0;color:#374151;font-size:18px;font-weight:600}.agenda-description{margin:5px 0 0;color:#6b7280;font-size:14px;line-height:1.5}
.agenda-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:24px}.agenda-summary-business{grid-template-columns:repeat(2,minmax(0,1fr))}
.agenda-panel{min-width:0;border:1px solid #e5e7eb;border-radius:12px;background:#fff;box-shadow:0 3px 10px #24445208;padding:20px}.agenda-summary-card{padding:16px 20px}
.agenda-tabs{border-bottom:1px solid #e5e7eb}.agenda-tab-content{margin-top:20px;background:transparent!important}
.agenda-hours-layout{display:grid;grid-template-columns:minmax(220px,1fr) minmax(0,2fr);gap:20px;align-items:start}.agenda-hours-business{grid-template-columns:1fr}
.agenda-note{padding:14px;background:#f7fafb;border:1px solid #e5eef1;border-radius:8px;font-size:13px;line-height:1.6;margin:16px 0 0}
.agenda-days{display:grid;gap:10px}.agenda-day{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb}
.agenda-day-actions{display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0}.agenda-badge{padding:3px 8px;border:1px solid;border-radius:16px;font-size:11px;font-weight:600}
.agenda-badge-active{background:#ecfdf5;color:#047857;border-color:#a7f3d0}.agenda-badge-inactive{background:#f3f4f6;color:#6b7280;border-color:#e5e7eb}
.agenda-range-chip{padding:4px 10px;background:#fff;border:1px solid var(--color-primary-200,#cbe9ef);color:var(--color-primary-900,#087F8C);border-radius:6px;font-size:13px;font-weight:600}
.agenda-panel-header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:20px}.agenda-empty{padding:28px 16px;text-align:center;background:#f7fafb;border:1px dashed #d9e6eb;border-radius:10px}
.agenda-blocks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.agenda-block{display:flex;justify-content:space-between;gap:8px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow-wrap:anywhere}
.agenda-preview-date{max-width:220px}.agenda-preview-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:16px}.agenda-slot{padding:6px 10px;border:1px solid #a7f3d0;border-radius:6px;background:#ecfdf5;color:#047857;font-size:13px;font-weight:600}
.agenda-footer{display:flex;align-items:center;justify-content:space-between;gap:20px;border-top:1px solid #e5e7eb;margin-top:24px;padding-top:20px}.agenda-footer .v-btn{flex-shrink:0}
.agenda-notice{margin:16px 0;padding:12px 16px;border:1px solid;border-radius:8px;font-size:14px;line-height:1.6}.agenda-notice-error{color:#991b1b;border-color:#fecaca;background:#fef2f2}.agenda-notice-success{color:#065f46;border-color:#a7f3d0;background:#ecfdf5}
.agenda-link{color:var(--color-primary-900,#087F8C);font-weight:600;padding:6px 0;text-align:left;text-decoration:underline}.professional-agenda button:focus-visible,.agenda-dialog button:focus-visible{outline:2px solid var(--color-primary-700,#087F8C);outline-offset:3px}
.agenda-dialog{border-radius:14px!important}.agenda-dialog-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 24px;border-bottom:1px solid #e5e7eb;background:var(--color-primary-100,#effbfc)}.agenda-dialog-actions{padding:12px 24px 20px;justify-content:flex-end;flex-wrap:wrap;gap:8px}.agenda-dialog-actions .v-btn{margin:0!important}
.agenda-range{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 40px;gap:8px;align-items:center}.agenda-block-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.professional-agenda ::v-deep .v-btn,.agenda-dialog ::v-deep .v-btn{text-transform:none;letter-spacing:0;font-weight:600}.professional-agenda ::v-deep .v-tab{text-transform:none;letter-spacing:.3px;font-weight:600;min-width:0}.professional-agenda ::v-deep .v-slide-group__prev{display:none!important}
@media(max-width:1100px){.agenda-header{flex-direction:column}.agenda-hours-layout{grid-template-columns:1fr}.agenda-hours-layout>.agenda-panel:first-child{display:block}}
@media(max-width:600px){.agenda-header,.agenda-body{padding:20px 16px}.agenda-header-actions{width:100%;justify-content:space-between;gap:10px}.agenda-header-actions .v-btn{font-size:12px;padding:0 12px}.agenda-scope{grid-template-columns:1fr;gap:12px}.agenda-summary{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.agenda-summary-card{padding:14px}.agenda-panel{padding:16px}.agenda-day{flex-direction:column;align-items:flex-start}.agenda-day-actions{width:100%;justify-content:flex-end}.agenda-panel-header{flex-direction:column;gap:16px}.agenda-preview-grid,.agenda-blocks,.agenda-block-form{grid-template-columns:1fr}.agenda-preview-date{width:100%;max-width:none}.agenda-footer{flex-direction:column;align-items:stretch}.agenda-dialog-header{padding:18px 20px}.agenda-dialog-actions{padding:12px 20px 20px}.professional-agenda ::v-deep .v-tab{padding:0 8px;font-size:12px}}
@media(max-width:380px){.agenda-range{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.agenda-range>.v-btn{grid-column:2;justify-self:end}}
</style>
