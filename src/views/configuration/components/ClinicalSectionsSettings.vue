<template>
  <section class="clinical-settings" aria-label="Secciones clínicas">
    <p class="clinical-settings__scope">Estos ajustes se comparten con todo el consultorio.</p>
    <p v-if="loading" class="clinical-settings__body" role="status">Cargando tus ajustes…</p>
    <v-alert v-else-if="error" type="error" outlined role="alert" class="ma-5">{{ error }} <button type="button" class="clinical-settings__link" @click="$emit('reload')">Reintentar</button></v-alert>
    <template v-else>
      <div class="clinical-settings__tabs" role="tablist" aria-label="Sección que quieres configurar">
        <button v-for="(tab, index) in tabs" :id="'clinical-tab-' + tab.id" :key="tab.id" :ref="'tab-' + tab.id" type="button" role="tab" :aria-selected="String(activeTab === tab.id)" :aria-controls="'clinical-panel-' + tab.id" :tabindex="activeTab === tab.id ? 0 : -1" @click="activeTab = tab.id" @keydown="onTabKey($event, index)">
          <v-icon size="20" class="clinical-settings__tab-icon" aria-hidden="true">{{ tab.icon }}</v-icon>
          <span>{{ tab.label }}</span>
          <span class="clinical-settings__dot" :class="{ 'is-enabled': value[tab.setting] }" aria-hidden="true"></span>
        </button>
      </div>

      <div id="clinical-panel-odontogram" v-show="activeTab === 'odontogram'" role="tabpanel" aria-labelledby="clinical-tab-odontogram" class="clinical-settings__body" tabindex="0">
        <div class="clinical-settings__activation">
          <div>
            <h3>Mostrar odontograma</h3>
            <p>Permite registrar y consultar el estado de los dientes en el expediente.</p>
          </div>
          <v-switch :input-value="value.odontogramEnabled" :disabled="saving || dentalBusy" aria-label="Mostrar odontograma" inset color="primary" hide-details class="mt-0" @change="update('odontogramEnabled', $event)" />
        </div>
        <div v-if="activationDirty" class="clinical-settings__inline-save">
          <p role="status">{{ value.odontogramEnabled ? 'Guarda la activación para elegir el tipo de odontograma.' : 'El odontograma se ocultará. Se conservarán sus registros.' }}</p>
          <button type="button" class="clinical-settings__primary" :disabled="saving || dentalBusy || !!conflict" @click="$emit('save', 'activation')">Guardar activación</button>
          <button type="button" class="clinical-settings__secondary" :disabled="saving" @click="update('odontogramEnabled', saved.odontogramEnabled)">Cancelar</button>
        </div>
        <odontogram-mode-settings ref="dental" v-show="value.odontogramEnabled && saved.odontogramEnabled" :disabled="saving || activationDirty" :can-manage-roles="canManageRoles" @dirty="onDentalDirty" @busy="onDentalBusy" />
        <p v-if="dentalDirty && !value.odontogramEnabled" role="status">Tienes cambios dentales pendientes.
          <button type="button" class="clinical-settings__link" @click="discardDentalChanges">Descartar borrador dental</button>
        </p>
      </div>

      <div id="clinical-panel-treatment" v-show="activeTab === 'treatment'" role="tabpanel" aria-labelledby="clinical-tab-treatment" class="clinical-settings__body" tabindex="0">
        <div class="clinical-settings__activation">
          <div>
            <h3>Mostrar plan de tratamiento</h3>
            <p>Agrupa los tratamientos de cada paciente en un plan. Los planes cerrados se pueden consultar en el historial.</p>
          </div>
          <v-switch :input-value="value.treatmentPlanEnabled" :disabled="saving" aria-label="Mostrar plan de tratamiento" inset color="primary" hide-details class="mt-0" @change="update('treatmentPlanEnabled', $event)" />
        </div>
        <p v-if="value.treatmentPlanEnabled !== saved.treatmentPlanEnabled" class="clinical-settings__visibility">{{ value.treatmentPlanEnabled ? 'Al guardar, el plan de tratamiento estará visible en el expediente.' : 'Al guardar, el plan quedará oculto. Los tratamientos registrados se conservan.' }}</p>

        <div class="clinical-settings__plan-grid">
          <div>
            <fieldset v-show="value.treatmentPlanEnabled" :disabled="saving" class="clinical-settings__options">
              <legend>Opciones del plan</legend>
              <button type="button" class="clinical-settings__example-link clinical-settings__link" @click="focusExample">Ver ejemplo con estos ajustes</button>
              <div class="clinical-settings__option">
                <v-switch :input-value="toothAvailable && value.allowTreatmentToothSelection" :disabled="saving || !toothAvailable" aria-label="Permitir elegir dientes al registrar un tratamiento" inset color="primary" hide-details @change="update('allowTreatmentToothSelection', $event)" />
                <div><h4>Permitir elegir dientes al registrar un tratamiento</h4><p>Es opcional. Por ejemplo, una resina en el diente 16.</p><p v-if="!toothAvailable" class="clinical-settings__dependency">Para usar el selector, activa el odontograma y guarda su activación en la otra pestaña.</p><p v-if="!toothAvailable || !value.allowTreatmentToothSelection">Al editar un tratamiento se siguen mostrando sus dientes asociados.</p>
                  <p v-if="!toothAvailable && value.allowTreatmentToothSelection !== saved.allowTreatmentToothSelection" role="status">
                    Tienes un cambio de selección dental pendiente.
                    <button type="button" class="clinical-settings__link" :disabled="saving" @click="update('allowTreatmentToothSelection', saved.allowTreatmentToothSelection)">Descartar ese cambio</button>
                  </p>
                </div>
              </div>
              <div class="clinical-settings__option">
                <v-switch :input-value="value.showTreatmentCosts" :disabled="saving" aria-label="Mostrar costos" inset color="primary" hide-details @change="update('showTreatmentCosts', $event)" />
                <div><h4>Mostrar costos</h4><p>Muestra los importes y el presupuesto en el plan y al imprimirlo, según el permiso de consulta. Para cambiar un costo hace falta permiso de edición.</p><p v-if="!value.showTreatmentCosts">Los importes guardados se conservan.</p></div>
              </div>
              <div class="clinical-settings__option">
                <v-switch :input-value="value.showTreatmentStatus" :disabled="saving" aria-label="Mostrar la etiqueta de estado" inset color="primary" hide-details @change="update('showTreatmentStatus', $event)" />
                <div><h4>Mostrar la etiqueta de estado</h4><p>Muestra «Pendiente» o «Completado» en cada tratamiento activo, el selector al editar y la columna al imprimir. El resumen de avance, los filtros y el historial siguen disponibles.</p></div>
              </div>
            </fieldset>
            <footer class="clinical-settings__save">
              <div><strong role="status">{{ planDirty ? 'Cambios del plan sin guardar' : (value.allowTreatmentToothSelection !== saved.allowTreatmentToothSelection ? 'Selección dental pendiente' : 'Plan al día') }}</strong>
                <p v-if="dentalDirty || activationDirty">También hay cambios pendientes en la pestaña Odontograma.</p>
              </div>
              <div v-if="planDirty" class="clinical-settings__save-actions">
                <button type="button" class="clinical-settings__secondary" :disabled="saving" @click="$emit('cancel', 'plan')">Descartar cambios del plan</button>
                <button type="button" class="clinical-settings__primary" :disabled="saving || dentalBusy || !!conflict" @click="$emit('save', 'plan')">{{ saving ? 'Guardando…' : 'Guardar plan' }}</button>
              </div>
            </footer>
          </div>
          <aside v-show="value.treatmentPlanEnabled" ref="example" tabindex="-1" class="clinical-settings__example" aria-label="Ejemplo del plan con tus opciones">
            <p class="clinical-settings__eyebrow">Vista rápida</p><h4>Así se verá la información</h4>
            <div v-for="item in sampleTreatments" :key="item.name" class="clinical-settings__sample">
              <strong>{{ item.name }}</strong>
              <span v-if="item.teeth">{{ item.teeth }}</span>
              <span v-if="value.showTreatmentStatus" class="clinical-settings__badge">{{ item.status }}</span>
              <strong v-if="value.showTreatmentCosts" class="clinical-settings__cost">{{ item.cost }}</strong>
            </div>
            <div v-if="value.showTreatmentCosts" class="clinical-settings__total"><span>Total del ejemplo</span><strong>{{ sampleBudget }}</strong></div>
            <small>Ejemplo ilustrativo.</small>
            <button ref="printToggle" type="button" class="clinical-settings__link" :aria-expanded="String(printOpen)" aria-controls="clinical-print-example" @click="togglePrint">
              {{ printOpen ? 'Ocultar ejemplo de impresión' : 'Ver ejemplo de impresión' }}
            </button>
          </aside>
          <section v-if="value.treatmentPlanEnabled && printOpen" id="clinical-print-example" class="clinical-settings__print" aria-labelledby="clinical-print-title">
            <h4 id="clinical-print-title" ref="printTitle" tabindex="-1">Ejemplo de impresión</h4>
            <iframe title="Hoja del plan de tratamiento con datos ficticios" sandbox="" :srcdoc="printExample"></iframe>
            <button type="button" class="clinical-settings__link" @click="togglePrint">Cerrar ejemplo de impresión</button>
          </section>
        </div>
      </div>

      <div v-if="conflict" class="clinical-settings__inline-save" role="alert">
        <strong>Otra persona guardó cambios en el consultorio.</strong>
        <p>Tu borrador sigue aquí. Actualiza los valores guardados y revisa tus ajustes antes de volver a guardar.</p>
        <button type="button" class="clinical-settings__secondary" @click="$emit('review-conflict')">Actualizar y revisar mi borrador</button>
      </div>
    </template>
  </section>
</template>

<script>
import { treatmentPlanPrintHtml } from '../../../domain/treatment-plan/plan.print';
import OdontogramModeSettings from './OdontogramModeSettings.vue';
export default {
  components: { OdontogramModeSettings },
  props: { value: { type: Object, required: true }, loading: Boolean, saving: Boolean, saved: { type: Object, required: true }, planDirty: Boolean, conflict: Object, canManageRoles: Boolean, error: { type: String, default: '' } },
  data: () => ({ printOpen: false, activeTab: 'odontogram', dentalBusy: false, dentalDirty: false, tabs: [
    { id: 'odontogram', label: 'Odontograma', icon: 'mdi-tooth-outline', setting: 'odontogramEnabled' },
    { id: 'treatment', label: 'Plan de tratamiento', icon: 'mdi-clipboard-text-outline', setting: 'treatmentPlanEnabled' }
  ] }),
  computed: {
    sampleBudget() { return '$1,400.00'; },
    sampleTreatments() {
      return [
        { name: 'Resina dental', teeth: this.toothAvailable && this.value.allowTreatmentToothSelection ? 'Diente 16' : '', status: 'Pendiente', start: '18/11/2026', end: '25/11/2026', cost: '$800.00' },
        { name: 'Limpieza dental', teeth: '', status: 'Completado', start: '18/11/2026', end: '18/11/2026', cost: '$600.00' }
      ];
    },
    printExample() {
      return treatmentPlanPrintHtml({
        example: true, businessName: 'Consultorio de ejemplo', patientName: 'Paciente de ejemplo', start: '18/11/2026',
        showStatus: this.value.showTreatmentStatus, showCosts: this.value.showTreatmentCosts, budget: this.sampleBudget,
        treatments: this.sampleTreatments
      });
    },
    activationDirty() { return this.value.odontogramEnabled !== this.saved.odontogramEnabled; },
    toothAvailable() { return this.saved.odontogramEnabled && this.value.odontogramEnabled; }
  },
  methods: {
    togglePrint() {
      this.printOpen = !this.printOpen;
      this.$nextTick(() => {
        const target = this.printOpen ? this.$refs.printTitle : this.$refs.printToggle;
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: this.printOpen ? 'start' : 'nearest' });
      });
    },
    focusExample() { this.$refs.example.focus(); this.$refs.example.scrollIntoView({ block: 'center' }); },
    onDentalDirty(value) { this.dentalDirty = value; this.$emit('dental-dirty', value); },
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
.clinical-settings__print { grid-column:1 / -1; min-width:0; }
.clinical-settings__print h4 { scroll-margin-top:72px; }
.clinical-settings__print iframe { display:block; width:100%; height:clamp(400px,58vh,600px); margin-top:10px; border:1px solid var(--color-forty-500); border-radius:8px; background:white; }
.clinical-settings__example .clinical-settings__link,.clinical-settings__print .clinical-settings__link { color:var(--color-primary-700); padding-inline:0; }
.clinical-settings__save { margin-top:12px; border-radius:8px; border-top:1px solid var(--color-forty-500); padding:20px 28px; display:flex; flex-wrap:wrap; gap:18px; justify-content:space-between; align-items:center; background:var(--color-gray98); }
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
@media(max-width:600px) { .clinical-settings__body { padding:20px 16px; }.clinical-settings h2 { font-size:20px; }.clinical-settings__tabs { padding:0; }.clinical-settings__tabs button { flex:1; font-size:13px; gap:6px; padding:10px 8px; justify-content:center; }.clinical-settings__dot { display:none; }.clinical-settings__save { padding:20px 16px; }.clinical-settings__save-actions { width:100%; }.clinical-settings__save-actions button { width:100%; }.clinical-settings__activation { gap:8px; }.clinical-settings__example { padding:18px; } }

.clinical-settings { container: clinical / inline-size; }
.clinical-settings p.clinical-settings__scope { display:block; margin:0; padding:12px 24px; font-weight:400; white-space:normal; }
.clinical-settings .clinical-settings__tab-icon { color:inherit; }
.clinical-settings__inline-save { display:flex; align-items:center; flex-wrap:wrap; gap:8px 12px; padding:14px 0; }
.clinical-settings__inline-save p { flex-basis:100%; margin:0; }
.clinical-settings > .clinical-settings__inline-save { padding:16px 24px; }
.clinical-settings__example-link { display:none; }
@container clinical (max-width: 710px) {
  .clinical-settings .clinical-settings__plan-grid { grid-template-columns:minmax(0,1fr); gap:18px; }
  .clinical-settings .clinical-settings__example-link { display:inline-block; padding-left:0; color:var(--color-primary-700); }
}
</style>
