<template>
  <div class="patient-odontogram" :aria-busy="String(loading || saving || sectionBusy)">
    <odontogram-capture v-if="captureMode !== 'v1'" :key="patientId" ref="capture" :patient-id="patientId" :patient-name="patientName" :mode="captureMode" @prepare-treatment="$emit('prepare-treatment', $event)" />
    <odontogram-preview v-else-if="previewAvailable && showPreview" :key="patientId" @close="showPreview = false" />
    <template v-else>
    <div v-if="previewAvailable" class="odontogram-preview-entry">
      <div><strong>Próxima captura del odontograma · CO26</strong><p>Referencia visual para desarrollo: teclado, tableta, dentición mixta y plan. Datos ficticios.</p></div>
      <button class="odontogram-button odontogram-button--secondary" :disabled="saving || sectionBusy || openOdontogramTreatment || addOdontograma || isOpenHistory || isChangeActive" @click="showPreview = true">Ver cascarón visual</button>
    </div>
    <section class="odontogram-hero">
      <div class="odontogram-heading">
        <p class="odontogram-eyebrow">Expediente clínico</p>
        <div class="odontogram-title-row">
          <h2>Odontograma</h2>
          <span class="odontogram-status" :class="{ active: id_odontogram && !loading && !loadError }">{{ loading ? 'Consultando' : loadError ? 'Sin actualizar' : id_odontogram ? 'Activo' : 'Sin activo' }}</span>
        </div>
        <p>Registra y consulta los diagnósticos por región dental del paciente.</p>
      </div>
      <div class="odontogram-actions">
        <button class="odontogram-button odontogram-button--secondary" type="button" :disabled="loading || saving || sectionBusy" aria-label="Ver historial de odontogramas" @click="isOpenHistory = true">
          <v-icon size="18">mdi-history</v-icon>Historial
        </button>
        <button class="odontogram-button odontogram-button--primary" type="button" :disabled="loading || saving || sectionBusy || Boolean(loadError)" aria-label="Crear odontograma" @click="openCreate">
          <v-icon size="18">mdi-plus</v-icon>Nuevo odontograma
        </button>
        <button v-if="id_odontogram && !loading && !loadError" class="odontogram-button odontogram-button--danger" type="button" :disabled="saving || sectionBusy" aria-label="Finalizar odontograma" @click="operationError = ''; isChangeActive = true">
          <v-icon size="18">mdi-check-circle-outline</v-icon>Finalizar
        </button>
      </div>
    </section>

    <div v-if="feedback && !loadError" class="odontogram-feedback" role="status"><v-icon size="18">mdi-check-circle-outline</v-icon><span>{{ feedback }}</span></div>
    <section v-if="loading" class="odontogram-empty" role="status">
      <v-progress-circular indeterminate size="28" width="3" color="var(--color-primary-700, #0e7490)"></v-progress-circular>
      <p>Cargando odontograma…</p>
    </section>
    <section v-else-if="loadError" class="odontogram-empty odontogram-error" role="alert">
      <v-icon size="32" color="error">mdi-alert-circle-outline</v-icon>
      <h3>No se pudo actualizar el odontograma</h3>
      <p>{{ loadError }}</p>
      <button class="odontogram-button odontogram-button--secondary" type="button" @click="init()">Reintentar</button>
    </section>
    <section v-else-if="!id_odontogram" class="odontogram-empty">
      <span class="odontogram-empty-icon"><v-icon size="32">mdi-tooth-outline</v-icon></span>
      <h3>Aún no hay un odontograma activo</h3>
      <p>Crea uno para registrar los diagnósticos por región dental. Los anteriores siguen disponibles en el historial.</p>
      <button class="odontogram-button odontogram-button--primary odontogram-create-button" type="button" @click="openCreate">Crear odontograma</button>
    </section>

    <section v-else class="odontogram-record" aria-label="Diagnósticos dentales">
      <odontogram-clinical-chart :key="patientId + ':' + id_odontogram" :teeth="odontogram" :busy="saving || sectionBusy" @edit="onEditOdontogramTreatment" />
      <div class="odontogram-record-header">
        <div><h3>Regiones dentales</h3><p>{{ activeDentition }}<span v-if="activeDentition"> · </span>{{ diagnosedCount }} de {{ odontogram.length }} con diagnóstico</p></div>
        <v-text-field v-model="search" class="odontogram-search" label="Buscar región o diagnóstico" prepend-inner-icon="mdi-magnify" outlined dense hide-details clearable :color="'var(--color-primary-700, #0e7490)'"></v-text-field>
      </div>
      <div v-if="filteredOdontogram.length" class="odontogram-table-wrap">
        <table class="odontogram-table">
          <caption class="odontogram-sr-only">Diagnósticos del odontograma activo por región dental</caption>
          <thead><tr><th scope="col">Región dental</th><th scope="col">Diagnóstico</th><th scope="col"><span class="odontogram-sr-only">Acciones</span></th></tr></thead>
          <tbody>
            <tr v-for="tooth in filteredOdontogram" :key="tooth.id_tooth">
              <td class="odontogram-region"><span class="region-number">{{ tooth.sec }}</span><span class="region-label">Región dental</span></td>
              <td class="odontogram-diagnosis"><span v-if="tooth.treatment" class="diagnosis-copy">{{ tooth.treatment }}</span><span v-else class="diagnosis-empty">Sin diagnóstico registrado</span></td>
              <td class="odontogram-row-actions">
                <button class="odontogram-edit-button" type="button" :disabled="saving || sectionBusy" :aria-label="(tooth.treatment ? 'Editar' : 'Registrar') + ' diagnóstico de región ' + tooth.sec" @click="onEditOdontogramTreatment(tooth)">
                  <v-icon size="17">mdi-pencil-outline</v-icon>{{ tooth.treatment ? 'Editar' : 'Registrar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="odontogram-no-results" role="status"><v-icon size="28">mdi-magnify</v-icon><h3>No hay regiones que coincidan</h3><p>Prueba con otro número de región o texto del diagnóstico.</p><button v-if="search" class="odontogram-button odontogram-button--secondary" type="button" @click="search = ''">Limpiar búsqueda</button></div>
      <div v-if="filteredOdontogram.length" class="odontogram-record-footer">{{ filteredOdontogram.length }} {{ filteredOdontogram.length === 1 ? 'región visible' : 'regiones visibles' }}</div>
    </section>

    <v-dialog v-model="openOdontogramTreatment" :persistent="sectionBusy" max-width="720" scrollable>
      <da-odontogram-treatment v-if="openOdontogramTreatment" :item="odontogramSelected" @close="openOdontogramTreatment = false" @saved="onDiagnosisSaved" @busy="sectionBusy = $event"></da-odontogram-treatment>
    </v-dialog>
    <odontogram-create-dialog v-model="addOdontograma" :types="toothtypes" :patient-name="patientName" :has-active="Boolean(id_odontogram)" :busy="saving" :error="createError" :requires-reload="createNeedsReload" @create="onSaveParent" @reload="init()"></odontogram-create-dialog>
    <odontogram-confirm-dialog
      :value="isChangeActive" title="Finalizar odontograma" message="El odontograma dejará de estar activo. Sus diagnósticos se conservarán y podrás consultarlo o reactivarlo desde el historial."
      confirm-label="Finalizar odontograma" icon="mdi-check-circle-outline" :busy="saving" :error="operationError"
      @confirm="onChangeActive(id_odontogram, true)" @input="onChangeActive(id_odontogram, false)"
    ></odontogram-confirm-dialog>
    <v-dialog v-model="isOpenHistory" :persistent="sectionBusy" max-width="1040" scrollable>
      <da-odontogram-history :open="isOpenHistory" :id="patientId" @close="isOpenHistory = false" @refresh-error="onHistoryRefreshError" @busy="sectionBusy = $event"></da-odontogram-history>
    </v-dialog>
    </template>
  </div>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
import VuexMixin from '../../../mixins/VuexMixin';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import OdontogramCreateDialog from './components/OdontogramCreateDialog.vue';
import OdontogramConfirmDialog from './components/OdontogramConfirmDialog.vue';
import OdontogramClinicalChart from './components/OdontogramClinicalChart.vue';
import { DAOdontogramV2Service } from '../../../services/context/core-proccess-context';
import {
  buildOdontogramParentPayload,
  buildOdontogramStatusPayload
} from "../../../domain/odontogram/odontogram.builder";

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
      // Temporal: permitir revisar el cascarón también en builds de producción.
      previewAvailable: true,
      captureMode: 'v1',
      showPreview: false,
      addOdontograma: false,
      loading: true,
      saving: false,
      sectionBusy: false,
      operationError: '',
      loadError: '',
      createError: '',
      createNeedsReload: false,
      feedback: '',
      loadRequest: 0,
      openOdontogramTreatment: false,
      isChangeActive: false,
      isOpenHistory: false,
      search: '',
      odontogramSelected: {}
    }
  },
  components: {
    OdontogramCapture: () => import(/* webpackChunkName: "odontogram-co26-capture" */ './components/OdontogramCapture.vue'),
    OdontogramClinicalChart,
    OdontogramPreview: () => import(/* webpackChunkName: "odontogram-co26-preview" */ './components/OdontogramPreview.vue'),
    OdontogramCreateDialog,
    OdontogramConfirmDialog,
    'da-odontogram-treatment': () => import("../components/DAOdontogramTreatment.vue"),
    'da-odontogram-history': () => import("../components/DAOdontogramHistory.vue")
  },
  mounted() {
      this.init();
  },
  created() {
    this.$emit('register-navigation-guard', this.confirmLeave);
    this.removeNavigationGuard = this.$router.beforeEach((to, from, next) => this.confirmLeave().then(next));
  },
  computed: {
    patientId() { return this.px && this.px.person && this.px.person.id_person; },
    patientName() {
      const person = this.px && this.px.person || {};
      return person.fullname || [person.name, person.surname].filter(Boolean).join(' ');
    },
    ...mapGetters(moduleTypes.ODONTOGRAM, {
          toothtypes: fnTypes.getTypeTooth,
          id_odontogram: fnTypes.id_odontogram,
          odontogram: fnTypes.odontogram,
          codetypetooth: fnTypes.codetypetooth,
      }),
    activeDentition() {
      const type = this.toothtypes.find(item => item.code === this.codetypetooth);
      return type ? type.description : '';
    },
    diagnosedCount() { return this.odontogram.filter(tooth => String(tooth.treatment || '').trim()).length; },
    filteredOdontogram() {
      const query = String(this.search || '').trim().toLocaleLowerCase('es');
      return this.odontogram.filter(tooth => !query || String(tooth.sec).includes(query) || String(tooth.treatment || '').toLocaleLowerCase('es').includes(query));
    }
  },
  methods: {
    ...mapActions(moduleTypes.ODONTOGRAM, [
            fnTypes.setOdontogramDetail, fnTypes.status
    ]),
    init: async function() {
      const request = ++this.loadRequest;
      this.loading = true;
      this.loadError = '';
      this.feedback = '';
      this.search = '';
      this.createNeedsReload = false;
      this.addOdontograma = false;
      try {
        if(!this.patientId) throw new Error('Missing patient');
        const capabilities = await DAOdontogramV2Service.capabilities();
        if(request !== this.loadRequest) return;
        if(capabilities.success && capabilities.data && capabilities.data.mode !== 'v1') {
          this.captureMode = capabilities.data.mode;
          return;
        }
        if(!capabilities.success && capabilities.status !== 404) throw new Error('No se pudo consultar el modo del odontograma.');
        this.captureMode = 'v1';
        const response = await this.ActionWrapp(moduleTypes.ODONTOGRAM, fnTypes.initOdontogram, {id: this.patientId});
        if(request !== this.loadRequest) return;
        if(!response || !response.success) {
          this.loadError = 'No se pudo cargar el odontograma. Intenta nuevamente.';
          return;
        }
      } catch(error) {
        if(request === this.loadRequest) this.loadError = 'No se pudo cargar el odontograma. Intenta nuevamente.';
      } finally {
        if(request === this.loadRequest) this.loading = false;
      }
    },
    openCreate() {
      if(this.saving || this.sectionBusy) return;
      if(this.createNeedsReload) return this.init();
      this.createError = '';
      this.createNeedsReload = false;
      this.feedback = '';
      this.addOdontograma = true;
    },
    confirmLeave() { return this.$refs.capture ? this.$refs.capture.confirmLeave() : Promise.resolve(!this.saving && !this.sectionBusy); },
    onEditOdontogramTreatment: function(data) {
      if(this.saving || this.sectionBusy) return;
      this.setOdontogramDetail(data);
      this.odontogramSelected = data;
      this.openOdontogramTreatment = true;
    },
    onDiagnosisSaved(response) {
      this.openOdontogramTreatment = false;
      if(response && response.refreshSuccess === false) this.loadError = 'El diagnóstico se guardó, pero no se pudo actualizar la vista. Pulsa Reintentar para consultarlo.';
      else this.feedback = 'Diagnóstico guardado correctamente.';
    },
    onHistoryRefreshError() {
      this.isOpenHistory = false;
      this.loadError = 'El cambio se guardó, pero no se pudo actualizar el odontograma. Pulsa Reintentar para consultarlo.';
    },
    onSaveParent: async function(code) {
      if(this.saving || this.createNeedsReload || !this.patientId || !this.toothtypes.some(item => item.code === code)) return;
      const patientId = this.patientId;
      this.saving = true;
      this.createError = '';
      try {
        const data = buildOdontogramParentPayload(patientId, code);
        const response = await this.ActionWrapp(moduleTypes.ODONTOGRAM, fnTypes.save, data);
        if(patientId !== this.patientId) return;
        if(!response || !response.success) {
          this.createNeedsReload = true;
          this.createError = 'No se pudo confirmar la creación. Vuelve a cargar para comprobar el estado del odontograma antes de intentarlo de nuevo.';
          return;
        }
        this.addOdontograma = false;
        if(response.refreshSuccess === false) {
          this.loadError = 'El odontograma se creó, pero no se pudieron cargar sus diagnósticos. Pulsa Reintentar para consultarlo.';
        } else {
          this.feedback = 'Odontograma creado correctamente.';
        }
      } catch(error) {
        if(patientId === this.patientId) {
          this.createNeedsReload = true;
          this.createError = 'No se pudo confirmar la creación. Vuelve a cargar el odontograma antes de intentarlo de nuevo.';
        }
      } finally {
        this.saving = false;
      }
    },
    onChangeActive: async function(data, confirm) {
      if(this.saving) return;
      this.operationError = '';
      if(!confirm) {
        this.isChangeActive = false;
        return;
      }
      this.saving = true;
      try {
        const dataModel = buildOdontogramStatusPayload(data, false);
        const response = await this.status({data: dataModel, id: this.patientId});
        if(!response || !response.success) {
          this.operationError = 'No se pudo finalizar el odontograma. Intenta nuevamente.';
          return;
        }
        this.isChangeActive = false;
        if(response.refreshSuccess === false) this.onHistoryRefreshError();
        else this.feedback = 'Odontograma finalizado correctamente. Puedes consultarlo en el historial.';
      }catch(error) {
        this.operationError = 'No se pudo confirmar el cambio. Cierra esta ventana y vuelve a cargar el odontograma.';
      }finally { this.saving = false; }
    },
    
  },
  beforeDestroy() {
    this.loadRequest += 1;
    this.$emit('register-navigation-guard', null);
    if(this.removeNavigationGuard) this.removeNavigationGuard();
  }
}
</script>

<style scoped>
.odontogram-preview-entry { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 16px 20px; margin-bottom: 18px; border: 1px dashed var(--color-primary-500, #0e7490); border-radius: 12px; background: var(--color-surface, #fff); }
.odontogram-preview-entry strong { font-size: 13px; }
.odontogram-preview-entry p { font-size: 12px; margin: 5px 0 0; color: var(--color-text-muted, #64748b); }
.patient-odontogram { padding: 20px; color: var(--color-text, #25364d); }
.odontogram-hero, .odontogram-record, .odontogram-empty { border: 1px solid var(--color-border, #d8e9ef); border-radius: 12px; background: var(--color-surface, #fff); }
.odontogram-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding: 22px 24px; margin-bottom: 18px; }
.odontogram-heading { min-width: 0; }
.odontogram-eyebrow { margin: 0 0 7px; color: var(--color-primary-900, #086783); text-transform: uppercase; font-size: 11px; font-weight: 700; letter-spacing: .09em; }
.odontogram-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.odontogram-title-row h2 { margin: 0; font-size: 23px; font-weight: 700; line-height: 1.3; color: var(--color-text, #25364d); }
.odontogram-heading > p:last-child { margin: 10px 0 0; color: var(--color-text-muted, #64748b); font-size: 14px; line-height: 1.6; }
.odontogram-status { padding: 3px 9px; border: 1px solid var(--color-border, #d8e9ef); border-radius: 999px; color: var(--color-text-muted, #64748b); background: var(--color-bg, #f8fbfd); font-size: 11px; font-weight: 700; }
.odontogram-status.active { color: #047857; border-color: #a7e2c8; background: #ecfdf5; }
.odontogram-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; padding-top: 4px; }
.odontogram-button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 40px; padding: 9px 14px; border: 1px solid var(--color-border, #d8e9ef); border-radius: 8px; font-size: 13px; line-height: 1.4; font-weight: 700; white-space: nowrap; }
.odontogram-button .v-icon, .odontogram-edit-button .v-icon { color: inherit; }
.odontogram-button--primary { color: #fff; background: var(--color-primary-900, #086783); border-color: transparent; }
.odontogram-button--secondary { color: var(--color-text, #25364d); background: var(--color-surface, #fff); }
.odontogram-button--danger { color: #a53b31; border-color: #ecd0cd; background: var(--color-surface, #fff); }
.odontogram-button:disabled, .odontogram-edit-button:disabled { opacity: .5; cursor: default; }
button:focus-visible { outline: 3px solid var(--color-primary-500, #0e7490); outline-offset: 3px; }
.odontogram-feedback { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; padding: 12px 16px; border: 1px solid #a7e2c8; border-radius: 8px; background: #ecfdf5; color: #066244; font-size: 13px; line-height: 1.6; }
.odontogram-feedback .v-icon { color: inherit; }
.odontogram-record { overflow: hidden; }
.odontogram-record-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 20px 24px; border-bottom: 1px solid var(--color-border, #d8e9ef); }
.odontogram-record-header h3 { margin: 0; font-size: 16px; font-weight: 700; }
.odontogram-record-header p { margin: 6px 0 0; color: var(--color-text-muted, #64748b); font-size: 12px; }
.odontogram-search { max-width: 320px; }
.odontogram-search ::v-deep input:focus { outline: none; }
.odontogram-table { width: 100%; border-collapse: collapse; text-align: left; }
.odontogram-table th { padding: 12px 24px; background: var(--color-bg, #f8fbfd); color: var(--color-text-muted, #64748b); font-size: 12px; font-weight: 600; }
.odontogram-table th:first-child { width: 150px; min-width: 150px; }
.odontogram-table td { padding: 15px 24px; border-top: 1px solid var(--color-border, #d8e9ef); vertical-align: middle; font-size: 13px; }
.odontogram-region { width: 150px; white-space: nowrap; }
.region-number { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 36px; border: 1px solid var(--color-primary-200, #b8edf7); border-radius: 8px; background: var(--color-primary-100, #e0f7fc); color: var(--color-primary-900, #006077); font-size: 14px; font-weight: 700; }
.region-label { display: none; }
.odontogram-diagnosis { width: 100%; }
.diagnosis-copy { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; }
.diagnosis-empty { color: var(--color-text-muted, #64748b); font-size: 13px; }
.odontogram-row-actions { text-align: right; }
.odontogram-edit-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px; border: 1px solid var(--color-border, #d8e9ef); border-radius: 8px; color: var(--color-primary-900, #086783); background: var(--color-surface, #fff); font-size: 12px; font-weight: 700; white-space: nowrap; }
.odontogram-edit-button:hover:not(:disabled) { background: var(--color-primary-100, #e0f7fc); }
.odontogram-record-footer { padding: 12px 24px; border-top: 1px solid var(--color-border, #d8e9ef); color: var(--color-text-muted, #64748b); font-size: 12px; }
.odontogram-empty, .odontogram-no-results { display: flex; flex-direction: column; align-items: center; padding: 48px 24px; text-align: center; color: var(--color-text-muted, #64748b); }
.odontogram-empty h3, .odontogram-no-results h3 { margin: 0 0 8px; color: var(--color-text, #25364d); font-size: 18px; font-weight: 600; }
.odontogram-empty p, .odontogram-no-results p { max-width: 440px; margin: 12px 0 20px; font-size: 14px; line-height: 1.7; }
.odontogram-empty-icon { display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 16px; background: var(--color-primary-100, #e0f7fc); color: var(--color-primary-700, #0e7490); margin-bottom: 18px; }
.odontogram-empty-icon .v-icon { color: inherit; }
.odontogram-no-results > .v-icon { margin-bottom: 16px; color: var(--color-text-muted, #64748b); }
.odontogram-error > .v-icon { margin-bottom: 16px; }
.odontogram-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
html[data-theme="clinical-night"] .patient-odontogram { --color-text: #e2e8f0; --color-text-muted: #cbd5e1; --color-surface: #1e293b; --color-bg: #172333; --color-border: #3b4d63; }
html[data-theme="clinical-night"] .odontogram-status.active, html[data-theme="clinical-night"] .odontogram-feedback { background: #123c31; color: #a7f3d0; border-color: #27674e; }
html[data-theme="clinical-night"] .odontogram-button--danger { color: #fda4af; border-color: #75404a; }
html[data-theme="clinical-night"] .odontogram-eyebrow, html[data-theme="clinical-night"] .odontogram-edit-button { color: #7dd3fc; }
html[data-theme="clinical-night"] .odontogram-search ::v-deep input { background-color: transparent !important; }
@media (max-width: 1000px) { .odontogram-hero { flex-direction: column; } .odontogram-actions { justify-content: flex-start; } }
@media (max-width: 600px) {
  .patient-odontogram { padding: 14px; }
  .odontogram-hero { padding: 20px 16px; gap: 14px; }
  .odontogram-title-row h2 { font-size: 21px; }
  .odontogram-actions { width: 100%; }
  .odontogram-actions .odontogram-button { flex: 1; padding: 9px 10px; }
  .odontogram-record-header { flex-direction: column; align-items: stretch; gap: 16px; padding: 18px 16px; }
  .odontogram-search { max-width: none; width: 100%; }
  .odontogram-table, .odontogram-table tbody, .odontogram-table tr, .odontogram-table td { display: block; width: 100%; }
  .odontogram-table thead { display: none; }
  .odontogram-table tr { position: relative; padding: 16px; border-top: 1px solid var(--color-border, #d8e9ef); }
  .odontogram-table tr:first-child { border-top: 0; }
  .odontogram-table td { padding: 0; border: 0; }
  .odontogram-table .odontogram-region { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .region-label { display: inline; font-size: 12px; color: var(--color-text-muted, #64748b); }
  .odontogram-table .odontogram-diagnosis { padding-right: 0; line-height: 1.7; }
  .odontogram-table .odontogram-row-actions { margin-top: 12px; text-align: left; }
  .odontogram-record-footer { padding: 12px 16px; }
  .odontogram-empty, .odontogram-no-results { padding: 36px 16px; }
}
</style>
