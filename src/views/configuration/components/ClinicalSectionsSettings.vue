<template>
  <section class="clinical-settings" aria-labelledby="clinical-settings-title">
    <header class="clinical-settings__header">
      <div>
        <h2 id="clinical-settings-title">Un expediente a la medida de tu consultorio</h2>
        <p>Elige qué secciones necesita tu equipo y cómo quiere trabajar con ellas. Estos ajustes se comparten en todo el consultorio.</p>
      </div>
      <span class="clinical-settings__scope"><v-icon size="18" color="inherit" aria-hidden="true">mdi-office-building-outline</v-icon> Para todo el equipo</span>
    </header>

    <p v-if="loading" class="clinical-settings__body" role="status">Cargando tus ajustes…</p>
    <v-alert v-else-if="error" type="error" outlined role="alert" class="ma-5">{{ error }} <button type="button" class="clinical-settings__link" @click="$emit('reload')">Reintentar</button></v-alert>
    <template v-else>
      <div class="clinical-settings__tabs" role="tablist" aria-label="Sección que quieres configurar">
        <button v-for="(tab, index) in tabs" :id="'clinical-tab-' + tab.id" :key="tab.id" :ref="'tab-' + tab.id" type="button" role="tab" :aria-selected="String(activeTab === tab.id)" :aria-controls="'clinical-panel-' + tab.id" :tabindex="activeTab === tab.id ? 0 : -1" @click="activeTab = tab.id" @keydown="onTabKey($event, index)">
          <v-icon size="20" color="inherit" aria-hidden="true">{{ tab.icon }}</v-icon>
          <span>{{ tab.label }}</span>
          <span class="clinical-settings__dot" :class="{ 'is-enabled': value[tab.setting] }" aria-hidden="true"></span>
        </button>
      </div>

      <div id="clinical-panel-odontogram" v-show="activeTab === 'odontogram'" role="tabpanel" aria-labelledby="clinical-tab-odontogram" class="clinical-settings__body" tabindex="0">
        <div class="clinical-settings__activation">
          <div>
            <p class="clinical-settings__eyebrow">1 · Activa la sección</p>
            <h3>Odontograma en el expediente</h3>
            <p>Registra y consulta el estado de los dientes de cada paciente. Si tu consultorio no realiza atención dental, puedes mantener esta sección oculta.</p>
          </div>
          <v-switch :input-value="value.odontogramEnabled" :disabled="saving || dentalBusy" aria-label="Mostrar odontograma" inset color="primary" hide-details class="mt-0" @change="update('odontogramEnabled', $event)" />
        </div>
        <p class="clinical-settings__visibility">{{ value.odontogramEnabled ? 'Al guardar, el odontograma estará visible en el expediente.' : 'Al guardar, el odontograma quedará oculto. Sus registros se conservan.' }}</p>
        <odontogram-mode-settings ref="dental" v-show="value.odontogramEnabled" :disabled="saving" @dirty="$emit('dental-dirty', $event)" @busy="onDentalBusy" />
      </div>

      <div id="clinical-panel-treatment" v-show="activeTab === 'treatment'" role="tabpanel" aria-labelledby="clinical-tab-treatment" class="clinical-settings__body" tabindex="0">
        <div class="clinical-settings__activation">
          <div>
            <p class="clinical-settings__eyebrow">Organiza la atención del paciente</p>
            <h3>Plan de tratamiento en el expediente</h3>
            <p>Reúne los tratamientos de cada paciente en un plan activo. Al terminarlo, puedes cerrarlo, consultar su historial y abrir un nuevo plan.</p>
          </div>
          <v-switch :input-value="value.treatmentPlanEnabled" :disabled="saving" aria-label="Mostrar plan de tratamiento" inset color="primary" hide-details class="mt-0" @change="update('treatmentPlanEnabled', $event)" />
        </div>
        <p class="clinical-settings__visibility">{{ value.treatmentPlanEnabled ? 'Al guardar, el plan de tratamiento estará visible en el expediente.' : 'Al guardar, el plan quedará oculto. Los tratamientos registrados se conservan.' }}</p>

        <div v-show="value.treatmentPlanEnabled" class="clinical-settings__plan-grid">
          <fieldset :disabled="saving" class="clinical-settings__options">
            <legend>Qué información verá tu equipo</legend>
            <div class="clinical-settings__option">
              <v-switch :input-value="value.allowTreatmentToothSelection" :disabled="saving || !value.odontogramEnabled" aria-label="Asociar tratamientos a dientes" inset color="primary" hide-details @change="update('allowTreatmentToothSelection', $event)" />
              <div><h4>Elegir los dientes a tratar</h4><p>Agrega un selector para relacionar un tratamiento con uno o varios dientes. Por ejemplo, una resina en el diente 16. Elegir un diente siempre es opcional.</p><p v-if="!value.odontogramEnabled" class="clinical-settings__dependency">Para ofrecer el selector en nuevos tratamientos, activa el odontograma en la otra pestaña.</p><p v-else class="clinical-settings__effect">{{ value.allowTreatmentToothSelection ? 'Activado: podrás elegir dientes al registrar el tratamiento.' : 'Desactivado: los nuevos tratamientos no mostrarán el selector.' }}</p><p v-if="!value.odontogramEnabled || !value.allowTreatmentToothSelection">Los tratamientos que ya tienen dientes asociados conservan su selección y la muestran al editarlos.</p></div>
            </div>
            <div class="clinical-settings__option">
              <v-switch :input-value="value.showTreatmentCosts" :disabled="saving" aria-label="Mostrar costos" inset color="primary" hide-details @change="update('showTreatmentCosts', $event)" />
              <div><h4>Mostrar costos</h4><p>Muestra los importes, el presupuesto del plan y el campo para capturar costos a las personas con permiso para verlos. También se incluyen en las impresiones del plan.</p><p>Al desactivarlo se ocultan esos importes y el campo de costo. Los valores guardados se conservan.</p></div>
            </div>
            <div class="clinical-settings__option">
              <v-switch :input-value="value.showTreatmentStatus" :disabled="saving" aria-label="Mostrar estados" inset color="primary" hide-details @change="update('showTreatmentStatus', $event)" />
              <div><h4>Mostrar el avance de los tratamientos</h4><p>Muestra etiquetas como «Pendiente» o «Terminado», el selector de estado al editar un tratamiento y la columna de estado al imprimir el plan.</p><p>Al desactivarlo se ocultan esos elementos. Los estados guardados y las acciones para avanzar el tratamiento se conservan.</p></div>
            </div>
          </fieldset>
          <aside class="clinical-settings__example" aria-label="Ejemplo del plan con tus opciones">
            <p class="clinical-settings__eyebrow">Vista rápida</p><h4>Así se verá la información</h4>
            <p>Ejemplo ilustrativo que cambia con tus opciones.</p>
            <div class="clinical-settings__sample"><strong>Resina dental</strong><span v-if="value.odontogramEnabled && value.allowTreatmentToothSelection">Diente 16</span><span v-if="value.showTreatmentStatus" class="clinical-settings__badge">Pendiente</span><strong v-if="value.showTreatmentCosts" class="clinical-settings__cost">$800.00</strong></div>
            <div class="clinical-settings__sample"><strong>Limpieza dental</strong><span v-if="value.showTreatmentStatus" class="clinical-settings__badge">Terminado</span><strong v-if="value.showTreatmentCosts" class="clinical-settings__cost">$600.00</strong></div>
            <div v-if="value.showTreatmentCosts" class="clinical-settings__total"><span>Total del ejemplo</span><strong>$1,400.00</strong></div>
            <small>Ejemplo ilustrativo.</small>
          </aside>
        </div>
      </div>

      <footer class="clinical-settings__save">
        <div><strong role="status">{{ dirty ? 'Tienes cambios de secciones sin guardar' : 'Secciones al día' }}</strong><p>Este botón guarda la visibilidad y las opciones del plan. El tipo de odontograma, los atajos y el recorrido tienen su propio botón.</p></div>
        <div class="clinical-settings__save-actions"><button type="button" class="clinical-settings__secondary" :disabled="saving || !dirty" @click="$emit('cancel')">Descartar cambios de secciones</button><button type="button" class="clinical-settings__primary" :disabled="saving || !dirty" @click="$emit('save')">{{ saving ? 'Guardando…' : 'Guardar secciones' }}</button></div>
      </footer>
    </template>
  </section>
</template>

<script>
import OdontogramModeSettings from './OdontogramModeSettings.vue';
export default {
  components: { OdontogramModeSettings },
  props: { value: { type: Object, required: true }, loading: Boolean, saving: Boolean, dirty: Boolean, error: { type: String, default: '' } },
  data: () => ({ activeTab: 'odontogram', dentalBusy: false, tabs: [
    { id: 'odontogram', label: 'Odontograma', icon: 'mdi-tooth-outline', setting: 'odontogramEnabled' },
    { id: 'treatment', label: 'Plan de tratamiento', icon: 'mdi-clipboard-text-outline', setting: 'treatmentPlanEnabled' }
  ] }),
  methods: {
    update(key, value) { this.$emit('input', { ...this.value, [key]: Boolean(value) }); },
    onDentalBusy(value) { this.dentalBusy = value; this.$emit('dental-busy', value); },
    discardDentalChanges() { if (this.$refs.dental) this.$refs.dental.discardChanges(); },
    onTabKey(event, index) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? this.tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + this.tabs.length) % this.tabs.length;
      this.activeTab = this.tabs[next].id;
      this.$nextTick(() => this.$refs['tab-' + this.activeTab][0].focus());
    }
  }
};
</script>

<style scoped>
.clinical-settings p:not(.clinical-settings__eyebrow),.clinical-settings small { font-weight:300; }
.clinical-settings p strong { font-weight:inherit; }
.clinical-settings { background:var(--color-surface); color:var(--color-primary-900); border:1px solid var(--color-forty-500); border-radius:16px; overflow:hidden; }
.clinical-settings h2,.clinical-settings h3,.clinical-settings h4,.clinical-settings p { margin:0; }
.clinical-settings h2 { font-size:22px; font-weight:600; line-height:1.35; }
.clinical-settings h3 { font-size:20px; font-weight:600; }
.clinical-settings h4 { font-size:16px; font-weight:600; }
.clinical-settings p { font-size:14px; line-height:1.65; color:var(--color-grey); margin-top:6px; }
.clinical-settings__header { display:flex; align-items:start; justify-content:space-between; gap:24px; padding:28px; }
.clinical-settings__header p { max-width:700px; }
.clinical-settings__scope { display:flex; gap:7px; align-items:center; white-space:nowrap; color:var(--color-grey); font-size:12px; padding-top:4px; }
.clinical-settings__tabs { display:flex; border-block:1px solid var(--color-forty-500); background:var(--color-gray98); padding:0 24px; }
.clinical-settings__tabs button { min-height:58px; padding:12px 20px; display:flex; gap:10px; align-items:center; border-bottom:3px solid transparent; font-size:15px; font-weight:600; color:var(--color-grey); }
.clinical-settings__tabs button[aria-selected=true] { border-color:var(--color-primary-700); color:var(--color-primary-700); background:var(--color-surface); }
.clinical-settings__dot { width:7px; height:7px; border-radius:50%; background:var(--color-muted); }
.clinical-settings__dot.is-enabled { background:var(--color-success); }
.clinical-settings__body { padding:28px; }
.clinical-settings__activation { display:flex; justify-content:space-between; align-items:start; gap:24px; }
.clinical-settings__activation > div:first-child { max-width:780px; }
.clinical-settings .clinical-settings__eyebrow { margin:0 0 8px; color:var(--color-primary-700); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.09em; }
.clinical-settings .clinical-settings__visibility { margin-top:14px; padding:10px 14px; border-radius:8px; background:var(--color-gray98); }
.clinical-settings__plan-grid { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(250px,1fr); gap:32px; margin-top:28px; align-items:start; }
.clinical-settings__options { min-width:0; border:0; padding:0; }
.clinical-settings__options legend { font-size:16px; font-weight:600; margin-bottom:8px; }
.clinical-settings__option { display:flex; align-items:start; gap:12px; padding:18px 0; border-bottom:1px solid var(--color-forty-500); }
.clinical-settings__option .v-input { margin:0; flex:0 0 auto; }
.clinical-settings .clinical-settings__effect { font-size:13px; color:var(--color-primary-700); }
.clinical-settings .clinical-settings__dependency { font-weight:600; color:var(--color-primary-700); }
.clinical-settings__example { padding:22px; background:var(--color-gray98); border:1px solid var(--color-forty-500); border-radius:12px; }
.clinical-settings__sample { display:flex; flex-wrap:wrap; gap:8px 12px; padding:16px 0; border-bottom:1px solid var(--color-forty-500); font-size:13px; }
.clinical-settings__sample > strong:first-child { width:100%; font-size:15px; }
.clinical-settings__badge { border:1px solid var(--color-forty-500); padding:1px 8px; border-radius:20px; }
.clinical-settings__cost { margin-left:auto; }
.clinical-settings__total { display:flex; justify-content:space-between; gap:8px; padding:16px 0; font-size:13px; }
.clinical-settings small { display:block; font-size:12px; line-height:1.5; color:var(--color-grey); margin-top:14px; }
.clinical-settings__save { border-top:1px solid var(--color-forty-500); padding:20px 28px; display:flex; flex-wrap:wrap; gap:18px; justify-content:space-between; align-items:center; background:var(--color-gray98); }
.clinical-settings__save > div:first-child { flex:1 1 320px; }
.clinical-settings__save strong { font-size:14px; }
.clinical-settings__save p { font-size:12px; max-width:640px; }
.clinical-settings__save-actions { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
.clinical-settings__primary,.clinical-settings__secondary { min-height:44px; padding:10px 18px; border-radius:24px; border:1px solid var(--color-primary-700); font-size:13px; font-weight:600; }
.clinical-settings__primary { background:var(--color-primary-700); color:var(--color-surface); }
.clinical-settings__secondary { color:var(--color-primary-700); }
.clinical-settings__link { text-decoration:underline; min-height:44px; padding:8px; }
.clinical-settings button:disabled { opacity:.5; cursor:not-allowed; }
.clinical-settings button:focus-visible,.clinical-settings [tabindex="0"]:focus-visible { outline:3px solid var(--color-primary-500); outline-offset:3px; }
@media(max-width:900px) { .clinical-settings__scope { display:none; }.clinical-settings__plan-grid { grid-template-columns:1fr; gap:24px; } }
@media(max-width:600px) { .clinical-settings__header,.clinical-settings__body { padding:20px 16px; }.clinical-settings h2 { font-size:20px; }.clinical-settings__tabs { padding:0; }.clinical-settings__tabs button { flex:1; font-size:13px; gap:6px; padding:10px 8px; justify-content:center; }.clinical-settings__dot { display:none; }.clinical-settings__save { padding:20px 16px; }.clinical-settings__save-actions { width:100%; }.clinical-settings__save-actions button { width:100%; }.clinical-settings__activation { gap:8px; }.clinical-settings__example { padding:18px; } }
</style>
