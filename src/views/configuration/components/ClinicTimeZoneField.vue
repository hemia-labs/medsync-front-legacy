<template>
  <div class="clinic-timezone">
    <p class="clinic-timezone-label">Zona horaria del consultorio</p>
    <p class="clinic-timezone-name">{{ currentLabel }}</p>
    <p class="clinic-timezone-code">{{ value }}</p>
    <p v-if="currentPreview" class="clinic-timezone-detail">{{ currentPreview.rule }}</p>
    <p class="clinic-timezone-detail">Todas las agendas usan la zona del consultorio.</p>
    <v-btn v-if="canManage" small outlined rounded :color="color" :disabled="disabled || submitting" @click="open">Cambiar zona del consultorio</v-btn>
    <p v-else class="clinic-timezone-detail">El administrador puede cambiarla.</p>

    <v-dialog v-model="dialog" persistent scrollable max-width="620" :retain-focus="true">
      <v-card class="clinic-timezone-dialog">
        <v-card-title class="clinic-timezone-title">Hora del consultorio</v-card-title>
        <v-card-text>
          <p class="clinic-timezone-intro">Elige dónde está tu consultorio. Usaremos su hora local en todas tus agendas.</p>
          <template v-if="!advanced">
            <v-autocomplete v-model="state" :search-input.sync="stateSearch" :disabled="submitting" :items="states" item-text="label" item-value="value" label="Estado del consultorio" placeholder="Busca y elige tu estado" clearable outlined dense :color="color" :filter="searchLocation" no-data-text="No encontramos ese estado." :menu-props="{ maxHeight: 280, offsetY: true }" @change="selectState"></v-autocomplete>
            <template v-if="municipalities.length">
              <p class="clinic-timezone-detail">En {{ selectedState.label }}, la hora puede cambiar según el municipio.</p>
              <v-autocomplete v-model="municipality" :search-input.sync="municipalitySearch" :disabled="submitting" :items="municipalities" item-text="label" item-value="value" label="Municipio del consultorio" :hint="'Si el tuyo no aparece, elige Otro municipio de ' + selectedState.label + '.'" persistent-hint clearable outlined dense :color="color" :filter="searchMunicipality" :menu-props="{ maxHeight: 280, offsetY: true }" @change="selectMunicipality"></v-autocomplete>
            </template>
          </template>
          <template v-else>
            <v-autocomplete v-model="candidate" :search-input.sync="zoneSearch" :disabled="submitting" :items="zoneOptions" item-text="label" item-value="value" label="Elige una zona horaria" outlined dense :color="color" :filter="searchLocation" @change="selectManual"></v-autocomplete>
            <div v-if="detectedPreview" class="clinic-timezone-device">
              <p class="clinic-timezone-detail">En este equipo son las <strong>{{ detectedPreview.time }}</strong>. Usa esta hora solo si coincide con la de tu consultorio.</p>
              <v-btn small outlined rounded :color="color" :disabled="submitting" @click="useDetected">Usar la hora de este equipo</v-btn>
            </div>
          </template>
          <div v-if="preview" class="clinic-timezone-preview" role="status" aria-live="polite">
            <p class="clinic-timezone-detail">{{ selectionSource === 'device' ? 'Hora elegida desde este equipo' : 'Hora para tu consultorio en' }}</p>
            <p v-if="selectionSource !== 'device'" class="clinic-timezone-name">{{ locationLabel }}</p>
            <p class="clinic-timezone-clock">{{ preview.time }}</p>
            <p class="clinic-timezone-date">{{ preview.date }}</p>
            <p class="clinic-timezone-detail">{{ preview.seasonal ? 'Aquí el reloj cambia en ciertas épocas del año.' : 'Aquí se usa el mismo horario todo el año.' }}</p>
            <p v-if="advanced" class="clinic-timezone-code">{{ candidate }} · {{ preview.rule }}</p>
          </div>
          <div v-else-if="candidate" class="clinic-timezone-preview clinic-timezone-placeholder" :role="selectionConfirmed ? 'alert' : 'status'">{{ selectionConfirmed ? 'Este navegador no puede usar ese horario. Actualízalo y vuelve a intentarlo.' : nextStep }}</div>
          <p v-else class="clinic-timezone-next" role="status">{{ nextStep }}</p>
          <v-btn small text :color="color" :disabled="submitting" class="clinic-timezone-alternative" @click="toggleAdvanced">{{ advanced ? 'Volver a elegir por estado' : 'Elegir el horario de otra forma' }}</v-btn>
          <p class="clinic-timezone-scope">El cambio se aplicará a todas las agendas. Las citas que ya tienes conservarán su fecha y hora.</p>
          <p v-if="saveError" role="alert" class="clinic-timezone-save-error">{{ saveError }}</p>
        </v-card-text>
        <v-card-actions class="clinic-timezone-actions">
          <v-btn rounded outlined :color="color" :disabled="submitting" @click="dialog = false">Cancelar</v-btn>
          <v-btn rounded depressed :color="color" dark class="clinic-timezone-submit" :loading="submitting" :disabled="!preview || disabled" @click="apply">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import { MEXICO_STATES, MEXICO_TIME_ZONES, locationOptions, timezoneForLocation, timezoneLabel, timezonePreview, supportsTimeZone } from '../../../domain/appointments/mexicoTimeZones';

export default {
  props: {
    value: { type: String, default: '' }, canManage: Boolean, disabled: Boolean,
    saveZone: { type: Function, required: true },
    color: { type: String, default: '#087F8C' }
  },
  data: () => ({ dialog: false, clockTimer: null, submitting: false, saveError: '', state: '', stateSearch: '', municipality: '', municipalitySearch: '', candidate: '', zoneSearch: '', detected: '', advanced: false, selectionSource: 'location', states: MEXICO_STATES, zones: MEXICO_TIME_ZONES, referenceDate: new Date() }),
  computed: {
    currentLabel() { return timezoneLabel(this.value); },
    currentPreview() { return timezonePreview(this.value, this.referenceDate); },
    municipalities() { return locationOptions(this.state); },
    selectedState() { return this.states.find(item => item.value === this.state); },
    zoneOptions() { return this.detected && !this.zones.some(item => item.value === this.detected) ? [...this.zones, {value:this.detected,label:'Horario de este equipo'}] : this.zones; },
    selectionConfirmed() {
      if(this.advanced) return this.zoneOptions.some(item => item.value === this.candidate && item.label === this.zoneSearch);
      if(!this.selectedState || this.stateSearch !== this.selectedState.label) return false;
      const municipality = this.municipalities.find(item => item.value === this.municipality);
      return !this.municipalities.length || !!(municipality && this.municipalitySearch === municipality.label);
    },
    locationLabel() {
      if(this.advanced) return timezoneLabel(this.candidate);
      const municipality = this.municipalities.find(item => item.value === this.municipality);
      return municipality && municipality.value !== '__other__' ? municipality.label + ', ' + this.selectedState.label : (this.selectedState || {}).label;
    },
    nextStep() {
      if(this.advanced) return 'Elige una zona para ver la hora antes de guardar.';
      if(!this.selectedState || this.stateSearch !== this.selectedState.label) return 'Elige un estado de la lista para ver su hora.';
      return 'Ahora elige el municipio donde está tu consultorio.';
    },
    detectedPreview() { return timezonePreview(this.detected, this.referenceDate); },
    preview() { return this.selectionConfirmed ? timezonePreview(this.candidate, this.referenceDate) : null; }
  },
  watch: {
    canManage(value) { if (!value) this.dialog = false; },
    disabled(value) { if (value && !this.submitting) this.dialog = false; },
    dialog(value) {
      if(this.clockTimer !== null) clearInterval(this.clockTimer);
      this.clockTimer = value ? setInterval(() => { this.referenceDate = new Date(); }, 30000) : null;
    }
  },
  beforeDestroy() { if(this.clockTimer !== null) clearInterval(this.clockTimer); },
  methods: {
    open() {
      if (!this.canManage || this.disabled || this.submitting) return;
      this.clearLocation(); this.candidate = ''; this.zoneSearch = ''; this.advanced = false; this.selectionSource = 'location';
      this.referenceDate = new Date(); this.detected = ''; this.saveError = '';
      try {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // A device gives a time zone, never a reliable state or municipality.
        if (supportsTimeZone(zone)) this.detected = zone;
      } catch (_) { /* Location selection remains available without detection. */ }
      this.dialog = true;
    },
    searchLocation(item, query, text) {
      const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return normalize(text + ' ' + (item.value || '')).includes(normalize(query));
    },
    searchMunicipality(item, query, text) { return item.value === '__other__' || this.searchLocation(item, query, text); },
    selectState() { this.stateSearch = (this.selectedState || {}).label || ''; this.municipality = ''; this.municipalitySearch = ''; this.selectionSource = 'location'; this.saveError = ''; this.candidate = timezoneForLocation(this.state); },
    selectMunicipality() { this.municipalitySearch = (this.municipalities.find(item => item.value === this.municipality) || {}).label || ''; this.saveError = ''; this.candidate = timezoneForLocation(this.state, this.municipality); },
    clearLocation() { this.state = ''; this.stateSearch = ''; this.municipality = ''; this.municipalitySearch = ''; },
    toggleAdvanced() { this.clearLocation(); this.candidate = ''; this.zoneSearch = ''; this.saveError = ''; this.selectionSource = 'manual'; this.advanced = !this.advanced; },
    selectManual() { this.selectionSource = 'manual'; this.zoneSearch = (this.zoneOptions.find(item => item.value === this.candidate) || {}).label || ''; this.saveError = ''; },
    useDetected() { this.clearLocation(); this.selectionSource = 'device'; this.saveError = ''; this.candidate = this.detected; this.zoneSearch = (this.zoneOptions.find(item => item.value === this.candidate) || {}).label || ''; },
    async apply() {
      if (!this.canManage || this.disabled || this.submitting || !this.preview) return;
      this.submitting = true; this.saveError = '';
      try { await this.saveZone(this.candidate); this.dialog = false; }
      catch (error) { this.saveError = error.message || 'No se pudo guardar la zona horaria. Reintenta.'; }
      finally { this.submitting = false; }
    }
  }
};
</script>
<style scoped>
.clinic-timezone{margin:20px 0}.clinic-timezone-label{font-size:12px;font-weight:600;color:#526779;margin-bottom:6px}.clinic-timezone-name{font-size:16px;font-weight:600;color:#173548;margin-bottom:6px;overflow-wrap:anywhere}.clinic-timezone-code{font-size:12px;color:#526779;overflow-wrap:anywhere;margin-bottom:6px}.clinic-timezone-detail{font-size:13px;color:#526779;line-height:1.6;margin-bottom:12px}.clinic-timezone-dialog{padding:8px}.clinic-timezone-title{word-break:normal;font-size:20px;line-height:1.4}.clinic-timezone-device{padding:12px 0;border-top:1px solid #dbe8eb}.clinic-timezone-device .v-btn{height:auto;min-height:32px;max-width:100%;white-space:normal}.clinic-timezone-device ::v-deep .v-btn__content{white-space:normal}.clinic-timezone-preview{background:#f1f8f8;border:1px solid #cee5e5;padding:16px;margin:12px 0;color:#173548}.clinic-timezone-preview p{line-height:1.6;margin-bottom:8px}.clinic-timezone-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;padding:8px 16px 16px}
.clinic-timezone-save-error{color:#991b1b;background:#fef2f2;border:1px solid #fecaca;padding:12px;line-height:1.6}
.clinic-timezone-actions ::v-deep .clinic-timezone-submit.v-btn--disabled{background:#e7edef!important;color:#526779!important}
.clinic-timezone-preview{min-height:230px}.clinic-timezone-placeholder{display:flex;align-items:center;font-size:13px;color:#526779;line-height:1.6}
.clinic-timezone-intro{line-height:1.65;margin-bottom:24px}.clinic-timezone-clock{font-size:30px;font-weight:600;line-height:1.25!important;margin:12px 0 4px!important;color:#173548}.clinic-timezone-date{font-size:13px;color:#526779}.clinic-timezone-preview .clinic-timezone-detail{margin-bottom:4px}.clinic-timezone-preview .clinic-timezone-date{margin-bottom:14px}.clinic-timezone-scope{font-size:12px;line-height:1.65;color:#526779;margin:16px 0 0}.clinic-timezone-next{font-size:13px;color:#526779;line-height:1.6;margin:0 0 12px}.clinic-timezone-alternative{padding-left:0!important}.clinic-timezone-dialog ::v-deep .v-btn{text-transform:none;letter-spacing:0}.clinic-timezone-device{border-top:0;padding:0 0 12px}.clinic-timezone-device .clinic-timezone-detail{margin-bottom:8px}.clinic-timezone-dialog ::v-deep .v-autocomplete .v-input__slot{margin-bottom:6px}
</style>
