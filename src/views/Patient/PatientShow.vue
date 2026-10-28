<template>
  <div class="patient-record-page px-4 py-5 mt-16">
    <div class="patient-record-breadcrumb">
        <button v-if="canReturnToAgenda" type="button" class="patient-record-back" @click="returnToAgenda">
            <v-icon small>mdi-arrow-left</v-icon><span>Volver a la agenda</span>
        </button>
        <button v-else type="button" class="patient-record-back" @click="$router.push('/px/all')">
            <v-icon small>mdi-arrow-left</v-icon>
            <span>Pacientes</span>
        </button>
        <span class="patient-record-separator">/</span>
        <span>Expediente clínico</span>
    </div>

    <div v-if="loadingPatient" class="patient-load-message" role="status">Cargando expediente…</div>
    <div v-else-if="patientError" class="patient-load-message" role="alert">
        <p>{{ patientError }}</p>
        <button type="button" class="patient-record-back" @click="init">Reintentar</button>
    </div>

    <template v-if="patientReady">
    <v-alert v-if="tabAccessNotice" type="warning" text role="alert" class="mb-4">{{ tabAccessNotice }}</v-alert>
    <div class="mb-4">
        <da-history-header :px="px" :can-edit="canManagePatient" :archive-pending="archivePending" :show-clinical="canViewClinical" v-model="isEditProfile" v-on:edit="requestProfileEdit" @archive="requestArchive"></da-history-header>
    </div>
    <div v-if="canViewClinical" class="mb-4">
        <da-alergy-alert :px="px" :can-edit="canEditAllergies" v-on:edit="openAllergyEditor"></da-alergy-alert>
        <p v-if="allergyFeedback" role="status" class="text-sm mt-2">{{ allergyFeedback }}</p>
    </div>

    <div v-if="isArchived || !canViewClinical" class="patient-record-shell pa-5 mb-4">
        <p v-if="isArchived" role="status">Paciente archivado. Su expediente y sus citas se conservan. Restaura al paciente para acceder a las secciones que no estén disponibles.</p>
        <template v-if="!canViewClinical">
            <h2 class="text-lg font-semibold">Ficha administrativa</h2>
            <p>Teléfono: {{ px.person.telephone || 'Sin registrar' }}</p>
            <p>Domicilio: {{ px.address && px.address.direction || 'Sin registrar' }}</p>
        </template>
        <div v-if="canManagePatient" class="flex flex-wrap gap-3 mt-3">
            <v-btn v-if="!isEdit" outlined @click="requestPatientEdit">Editar datos administrativos</v-btn>
            <v-btn v-if="isArchived" outlined :disabled="archivePending" @click="restorePatient">Restaurar paciente</v-btn>
            <v-btn v-else outlined :disabled="archivePending" @click="requestArchive">Archivar paciente</v-btn>
        </div>
    </div>
    
    <div v-if="!isEdit" :class="{'animate-fade-in-left ease-in-out': !isEdit}">
        <div class="patient-record-shell">
            <v-tabs 
            :value="tab"
            :key="tabNavigationRevision"
            @change="requestTabChange"
            color="var(--color-primary-700)" 
            background-color="transparent" 
            next-icon="mdi-chevron-right"
            prev-icon="mdi-chevron-left"
            active-class="patient-tab--active"
            :show-arrows="true"
            center-active
            hide-slider
            class="patient-record-tabs" 
            v-if="allowedTabs && allowedTabs.length > 0" 
           >
                <v-tab v-for="item in allowedTabs" :key="item.permission" :href="'#' + item.component" class="patient-tab">
                    <v-icon small class="mr-2">{{ item.icon }}</v-icon>
                    <span>{{item.name ? item.name : ''}}</span>
                </v-tab>
            </v-tabs>
            <v-tabs-items :value="tab" v-if="allowedTabs && allowedTabs.length > 0" class="patient-record-content">
                <v-tab-item v-for="item in allowedTabs" :key="item.permission" :value="item.component">
                    <component
                      :is="item.component === 'da-medical-history' && !canViewClinical ? 'da-clinical-intake' : item.component"
                      ref="patientSection"
                      v-if="tab === item.component"
                      :key="item.component + '-' + activePatientId"
                      :px="px"
                      :document-focus-request="documentFocusRequest"
                      v-on:edit="requestPatientEdit"
                      v-on:delete="requestArchive"
                      v-on:open-documents="openTabByComponent('da-patient-documents', $event)"
                      v-on:document-focus-consumed="consumeDocumentFocusRequest"
                      v-on:edit-allergies="openAllergyEditor"
                      v-on:register-navigation-guard="registerSectionGuard">
                    </component>
                </v-tab-item>
            </v-tabs-items>
            <div v-else class="px-6 py-8 text-center text-gray-500">
                No tienes permisos activos para consultar secciones del expediente.
            </div>
        </div>
        
    </div>

    <AllergyEditor v-if="canEditAllergies" v-model="showAllergyEditor" :patient-id="activePatientId" :patient-name="px.person.fullname" :record="px.allergy || {}" :legacy-text="allergyLegacyText" @saved="onAllergySaved" />
    
    <div v-if="isEdit" class="py-5" :class="{'animate-fade-in-left ease-in-out': isEdit}">
        <da-patient-form v-if="canEditClinical" :id="id" v-on:cancel="onCancelEdit"></da-patient-form>
        <PatientAdministrativeForm v-else-if="canManagePatient" :patient="px" @cancel="onCancelEdit" @saved="onAdministrativeSaved" />
    </div>

    <da-dialog v-model="isDelete" :persist="true" :maxWidth="'500px'">
        <template #body>
            <da-sweet-confirm 
            :title="'Archivar paciente'"
            :message="'El paciente dejará de aparecer en la búsqueda habitual. Su expediente y sus citas se conservarán. Puedes restaurarlo desde Pacientes activando Incluir archivados.'"
            :lottiepath="DELETE"
            :iconwidth="150"
            :iconheight="150"
            v-on:confirm="onFinish(true)" 
            v-on:close="isDelete = false">
        </da-sweet-confirm>
        </template>
  </da-dialog>

  <da-dialog v-model="isEditProfile" :persist="true" :maxWidth="'500px'">
        <template #body>
            <da-sweet-confirm 
            :title="'Foto de Perfil'" 
            :message="'¿Deseas editar la foto de perfil del paciente?'"
            v-on:confirm="isUploadFile = true" 
            v-on:close="isEditProfile = false">
        </da-sweet-confirm>
        </template>
  </da-dialog>

  <da-upload-file :show="isUploadFile" v-on:close="isUploadFile = false" v-on:save="onSavePicture"></da-upload-file>
    </template>

  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import VuexMixin from '../../mixins/VuexMixin';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import DAHistoryHeader from './components/DAHistoryHeader.vue';
import DAAlergyAlert from './components/DAAlergyAlert.vue';
import AllergyEditor from './components/AllergyEditor.vue';
import PatientAdministrativeForm from './components/PatientAdministrativeForm.vue';
import DAPxService from '../../services/core/px/DAPxService';
import DASweetConfirm from '../../core/components/form/dialog/components/DASweetConfirm.vue';
import DocumentsAndSignatures from './Sections/DocumentsAndSignatures.vue';
import { DELETE } from '../../utils/lottieicon';
import { buildProfilePhotoPayload } from '../../domain/photo/photo.builder';
import { peekAgendaReturn } from '../../domain/appointments/agendaNavigation';


export default {
    mixins: [VuexMixin],
    props: {
        id: {
            type: [String],
            default: ''
        }
    },
    data() {
        return {
            isEdit: false,
            isDelete: false,
            archivePending: false,
            showAllergyEditor: false,
            allergyLegacyText: '',
            allergyFeedback: '',
            isEditProfile: false,
            isUploadFile: false,
            DELETE,
            tab: null,
            tabAccessNotice: '',
            tabNavigationRevision: 0,
            tabNavigationPending: false,
            sectionLeaveGuard: null,
            documentFocusRequest: null,
            documentFocusSequence: 0,
            loadingPatient: true,
            patientError: '',
            patientRequest: 0,
            configuration: [
                {name: 'Historia clínica', permission: 'px.tab.history', component: 'da-medical-history', icon: 'mdi-clipboard-text-outline'},
                {name: 'Odontograma', permission: 'px.tab.odontogram', component: 'da-odontogram', moduleFlag: 'odontogramEnabled', icon: 'mdi-tooth-outline'},
                // Modulo de fotos deshabilitado temporalmente.
                // {name: 'Fotos', permission: 'px.tab.photos', component: 'da-patient-photo'},
                {name: 'Seguimiento', permission: 'px.tab.monitoring', component: 'da-medical-monitoring', icon: 'mdi-calendar-clock-outline'},
                {name: 'Recetas', permission: 'px.tab.prescriptions', component: 'da-patient-prescriptions', icon: 'mdi-file-document-edit-outline'},
                {name: 'Documentos y firmas', permission: 'documents.view', component: 'da-patient-documents', icon: 'mdi-file-sign'},
                {name: 'Tratamiento', permission: 'px.tab.treatment', component: 'da-patient-treatment', moduleFlag: 'treatmentPlanEnabled', icon: 'mdi-clipboard-list-outline'},
            ],
        }
    },
    components: {
        PatientAdministrativeForm,
        AllergyEditor,
        'da-medical-history': () => import('./Sections/MedicalHistory.vue'),
        'da-clinical-intake': () => import('./Sections/ClinicalIntake.vue'),
        'da-history-header': DAHistoryHeader,
        'da-patient-form': () => import('./PatientForm.vue'),
        'da-patient-treatment': () => import('./Sections/TreatmentPlan.vue'),
        // 'da-patient-photo': () => import('./Sections/PhotoManager.vue'),
        'da-sweet-confirm': DASweetConfirm,
        'da-upload-file': () => import('./profile/DAUploadFile.vue'),
        'da-medical-monitoring': () => import('./Sections/MonitoringPlan.vue'),
        'da-patient-prescriptions': () => import('./Sections/Prescriptions.vue'),
        'da-patient-documents': DocumentsAndSignatures,
        'da-odontogram': () => import('./Sections/Odontogram.vue'),
        'da-alergy-alert': DAAlergyAlert
    },
    mounted() {
      this.init()
  },
  methods: {
    async returnToAgenda() {
        if(!this.canReturnToAgenda) return
        if(this.isEdit || this.isEditProfile) { this.tabAccessNotice = 'Guarda o cancela la edición del paciente antes de volver a la agenda.'; return }
        if(await this.confirmSectionLeave() && this.canReturnToAgenda) await this.$router.push({ name: 'Citas' })
    },
    async requestArchive() {
        if(!this.canManagePatient || this.isArchived || this.archivePending) return
        if(await this.confirmSectionLeave()) this.isDelete = true
    },
    requestProfileEdit() { if(this.canManagePatient) this.isEditProfile = true },
    async onAdministrativeSaved() { this.isEdit = false; await this.init() },
    async restorePatient() {
        if(!this.canManagePatient || this.archivePending) return
        this.archivePending = true
        try {
            const response = await DAPxService.restore({ id_person: this.id })
            if(response.success) await this.init()
            else this.$swal.fire({ icon: 'error', title: 'No se pudo restaurar', text: response.message })
        } finally { this.archivePending = false }
    },
    openAllergyEditor(legacyText = '') {
        if(!this.canEditAllergies) return
        this.allergyLegacyText = typeof legacyText === 'string' ? legacyText : ''
        this.showAllergyEditor = true
    },
    onAllergySaved(record) {
        this.$store.commit(`${moduleTypes.PX}/SET_ALLERGY`, record)
        this.allergyFeedback = 'Alergias guardadas. El expediente y los borradores usan el mismo estado.'
    },
    ...mapActions(moduleTypes.PX, [
            fnTypes.getById
    ]),
    ...mapActions(moduleTypes.CONFIGURATION, [
            fnTypes.getClinicalModules
    ]),
    init: async function() {
        const request = ++this.patientRequest
        const patientId = this.id
        this.loadingPatient = true
        this.patientError = ''
        this.tab = null
        this.tabAccessNotice = ''
        try {
            await this.ActionWrapp(moduleTypes.CONFIGURATION, fnTypes.getClinicalModules)
            const response = await this.ActionWrapp(moduleTypes.PX, fnTypes.getById, patientId)
            if(request !== this.patientRequest) return
            const person = response && response.data && response.data.person
            if(!response.success || !person || person.id_person !== patientId) {
                this.patientError = response.message || 'No se pudo cargar el paciente. Reintenta para abrir su expediente.'
                return
            }
            await this.applyRequestedTab()
        } catch (error) {
            if(request === this.patientRequest) this.patientError = 'No se pudo cargar el expediente. Reintenta.'
        } finally {
            if(request === this.patientRequest) this.loadingPatient = false
        }
    },
    onCancelEdit: function() {
        this.isEdit = false;
        //this.init();
    },
    onFinish: async function(value) {
        if(value && this.canManagePatient && !this.archivePending) {
            this.archivePending = true
            try {
                const response = await DAPxService.remove({ id_person: this.id })
                if(response.success) { this.isDelete = false; await this.init() }
                else this.$swal.fire({ icon: 'error', title: 'No se pudo archivar', text: response.message })
            } finally { this.archivePending = false }
        }
    },
    onSavePicture: async function(event) {
      if(event) {
          const idPerson = this.px.person ? this.px.person.id_person : null;
          const profile = buildProfilePhotoPayload(idPerson, event);
          await this.ActionWrapp(moduleTypes.PX, fnTypes.uploadProfile, {data: profile, isnew: false});
          this.isUploadFile = false
      }
    },
    async confirmSectionLeave() {
        return this.sectionLeaveGuard ? this.sectionLeaveGuard() : true
    },
    registerSectionGuard(guard) { this.sectionLeaveGuard = guard },
    async requestPatientEdit() {
        if(!this.canManagePatient) return
        if(await this.confirmSectionLeave()) this.isEdit = true
    },
    async requestTabChange(component) {
        if(component === this.tab || this.tabNavigationPending) return false
        if(!this.allowedTabs.some(item => item.component === component)) {
            this.explainUnavailableTab(component)
            this.ensureValidTab()
            this.tabNavigationRevision++
            return false
        }
        this.tabNavigationPending = true
        try {
            if(!await this.confirmSectionLeave()) {
                this.tabNavigationRevision++
                await this.syncTabUrl()
                return false
            }
            if(!this.allowedTabs.some(item => item.component === component)) {
                this.explainUnavailableTab(component)
                this.ensureValidTab()
                return false
            }
            if(this.tab === 'da-patient-documents') this.documentFocusRequest = null
            this.tab = component
            this.tabAccessNotice = ''
            // Remove the old section's navigation guard before updating the URL.
            await this.$nextTick()
            await this.syncTabUrl()
            return true
        } finally { this.tabNavigationPending = false }
    },
    openTabByComponent: async function(component, payload = null) {
        if(component !== this.tab && !await this.requestTabChange(component)) return
        if(component === 'da-patient-documents') {
            this.documentFocusRequest = payload && (payload.id_patient_document || payload.document_type)
                ? { ...payload, requestId: ++this.documentFocusSequence, id_person: this.activePatientId }
                : null
        }
    },
    consumeDocumentFocusRequest(request) {
        const current = this.documentFocusRequest
        if(current && request && current.requestId === request.requestId && current.id_person === request.id_person) {
            this.documentFocusRequest = null
        }
    },
    async syncTabUrl() {
        if(!this.$route || !this.$router || !this.tab) return
        const keys = { 'da-medical-history': 'medical-history', 'da-patient-documents': 'documents',
            'da-patient-treatment': 'treatment', 'da-medical-monitoring': 'monitoring',
            'da-patient-prescriptions': 'prescriptions', 'da-odontogram': 'odontogram' }
        const tab = keys[this.tab] || this.tab
        if(this.$route.query.tab === tab) return
        const hash = this.componentFromTabQuery((this.$route.hash || '').slice(1)) ? '' : this.$route.hash
        try { await this.$router.replace({ path: this.$route.path, query: { ...this.$route.query, tab }, hash }) }
        catch(error) { if(error.name !== 'NavigationDuplicated') throw error }
    },
    componentFromTabQuery: function(tab) {
        const tabs = {
            history: 'da-medical-history',
            'medical-history': 'da-medical-history',
            clinical_history: 'da-medical-history',
            documents: 'da-patient-documents',
            treatment: 'da-patient-treatment',
            monitoring: 'da-medical-monitoring',
            prescriptions: 'da-patient-prescriptions',
            odontogram: 'da-odontogram'
        }
        return tabs[tab] || (this.configuration.some(item => item.component === tab) ? tab : null)
    },
    explainUnavailableTab(component) {
        const item = this.configuration.find(item => item.component === component)
        const name = item ? item.name : 'esta sección'
        this.tabAccessNotice = item && item.moduleFlag && !(this.clinicalModules && this.clinicalModules[item.moduleFlag])
            ? `${name} no está habilitado en este consultorio. Consulta al administrador.`
            : `No tienes permiso para consultar ${name}. Solicita acceso al administrador del consultorio.`
    },
    applyRequestedTab: async function() {
        const requestedTab = this.$route && this.$route.query && this.$route.query.tab
            || (this.$route && this.$route.hash ? this.$route.hash.slice(1) : null)
        const component = this.componentFromTabQuery(requestedTab)
        if(component && this.allowedTabs.some(item => item.component === component)) {
            await this.openTabByComponent(component, component === 'da-patient-documents' && this.$route.query.returnKey === 'pulse' && this.$route.query.documentId ? {id_patient_document:this.$route.query.documentId,open:false} : null)
            return
        }
        if(component) {
            this.explainUnavailableTab(component)
            const first = this.allowedTabs[0]
            if(first && this.tab !== first.component && await this.confirmSectionLeave()
                && this.allowedTabs.some(item => item.component === first.component)) {
                this.documentFocusRequest = null
                this.tab = first.component
            }
        }
        this.ensureValidTab()
        await this.$nextTick()
        await this.syncTabUrl()
    },
    ensureValidTab: function() {
        if(!this.allowedTabs || this.allowedTabs.length === 0) {
            this.tab = null
            this.documentFocusRequest = null
            return
        }
        const exists = this.allowedTabs.some((item) => item.component === this.tab)
        if(!exists) {
            this.tab = this.allowedTabs[0].component
        }
    },
  },
  computed: {
    canReturnToAgenda() {
        return this.hasPermission('px.dates') && !!peekAgendaReturn(this.$store, this.id)
    },
        canManagePatient() { return this.hasPermission('px.new') },
        canViewClinical() { return this.hasPermission('clinical_history.view') && this.hasPermission('clinical_history.view_sensitive') && Boolean(this.px && this.px.access && this.px.access.clinical) },
        canCaptureIntake() { return !this.isArchived && this.hasPermission('clinical_history.intake') },
        canEditClinical() { return !this.isArchived && this.canViewClinical && this.hasPermission('clinical_history.edit_draft') },
        canEditAllergies() { return !this.isArchived && this.canViewClinical && this.hasPermission('clinical_history.edit_draft') },
        isArchived() { return this.px && this.px.person && Number(this.px.person.active) === 0 },
        ...mapGetters(moduleTypes.PX, {
            px: fnTypes.getPx,
            
        } ),
        ...mapGetters(moduleTypes.AUTH, {
            hasPermission: fnTypes.hasPermission,
        } ),
        ...mapGetters(moduleTypes.CONFIGURATION, {
            clinicalModules: fnTypes.clinicalModules,
        } ),
        activePatientId: function() {
            return this.px && this.px.person && this.px.person.id_person ? this.px.person.id_person : this.id
        },
        patientReady: function() {
            return !this.loadingPatient && !this.patientError && this.px && this.px.person && this.px.person.id_person === this.id
        },
        allowedTabs: function() {
            return this.configuration.filter((item) => {
                const hasModuleEnabled = !item.moduleFlag || Boolean(this.clinicalModules && this.clinicalModules[item.moduleFlag])
                const historySection = item.component === 'da-medical-history'
                const canReadSection = !historySection || this.canViewClinical || this.canCaptureIntake
                return hasModuleEnabled && canReadSection && (this.hasPermission(item.permission) || (historySection && this.canCaptureIntake))
            })
        },

    },
    watch:  {
        id: function() {
            this.showAllergyEditor = false
            this.allergyFeedback = ''
            this.documentFocusRequest = null
            this.isEdit = false
            this.init()
        },
        isUploadFile: function() {
            if(this.isUploadFile) {
                this.isEditProfile = false
            }
        },
        '$route.query.tab': function() {
            if(this.patientReady) this.applyRequestedTab()
        },
        '$route.hash': function() {
            if(this.patientReady) this.applyRequestedTab()
        },
        allowedTabs: async function() {
            // Initial loads must preserve the deep link until patient/access data arrives.
            if(!this.patientReady) return
            this.ensureValidTab()
            await this.$nextTick()
            await this.syncTabUrl()
        }
    }

}
</script>

<style scoped>
.patient-record-page {
    max-width: 82rem;
    margin-left: auto;
    margin-right: auto;
}

.patient-load-message {
    padding: 1.5rem;
    background: #fff;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    color: #334155;
}

.patient-record-breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    color: #64748b;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.02em;
}

.patient-record-back {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--color-primary-900);
    transition: color 0.16s ease;
}

.patient-record-back:hover {
    color: var(--color-primary-700);
}

.patient-record-separator {
    color: #cbd5e1;
}

.patient-record-shell {
    overflow: hidden;
    border: 1px solid var(--color-primary-200);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 16px 35px rgba(15, 23, 42, 0.1);
}

.patient-record-tabs {
    padding: 0.75rem;
    border-bottom: 1px solid var(--color-primary-200);
    background: linear-gradient(180deg, var(--color-primary-100), rgba(255, 255, 255, 0.92));
}

.patient-tab {
    min-height: 2.7rem;
    margin-right: 0.45rem;
    padding: 0 1rem;
    border: 1px solid transparent;
    border-radius: 999px;
    color: #475569 !important;
    text-transform: none !important;
    font-family: sans-serif;
    font-size: 0.86rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.patient-tab::before {
    border-radius: inherit !important;
    background: transparent !important;
    opacity: 0 !important;
}

.patient-tab:hover::before,
.patient-tab:focus::before,
.patient-tab:active::before,
.patient-tab.patient-tab--active::before {
    opacity: 0 !important;
}

.patient-tab:hover {
    background: rgba(255, 255, 255, 0.72);
    color: var(--color-primary-900) !important;
}

.patient-tab--active {
    border-color: var(--color-primary-300);
    background: #fff;
    color: var(--color-primary-900) !important;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.patient-tab--active::after {
    content: "";
    position: absolute;
    left: 1.1rem;
    right: 1.1rem;
    bottom: 0.25rem;
    height: 0.18rem;
    border-radius: 999px;
    background: var(--color-primary-700);
}

.patient-record-content {
    background: #fff;
}

@media (max-width: 768px) {
    .patient-record-page {
        padding-left: 0.75rem;
        padding-right: 0.75rem;
    }

    .patient-tab {
        min-width: max-content;
        font-size: 0.78rem;
        letter-spacing: 0.04em;
    }
}

</style>
