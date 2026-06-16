<template>
  <div class="patient-record-page px-4 py-5 mt-16">
    <div class="patient-record-breadcrumb">
        <button type="button" class="patient-record-back" @click="$router.push('/px/all')">
            <v-icon small>mdi-arrow-left</v-icon>
            <span>Pacientes</span>
        </button>
        <span class="patient-record-separator">/</span>
        <span>Expediente clínico</span>
    </div>

    <div class="mb-4">
        <da-history-header :px="px" v-model="isEditProfile" v-on:edit="isEditProfile = true"></da-history-header>
    </div>
    <div class="mb-4">
        <da-alergy-alert :px="px" v-on:edit="isEdit = true"></da-alergy-alert>
    </div>
    
    <div v-if="!isEdit" :class="{'animate-fade-in-left ease-in-out': !isEdit}">
        <div class="patient-record-shell">
            <v-tabs 
            v-model="tab" 
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
            <v-tabs-items v-model="tab" v-if="allowedTabs && allowedTabs.length > 0" class="patient-record-content">
                <v-tab-item v-for="item in allowedTabs" :key="item.permission" :value="item.component">
                    <component
                      :is="item.component"
                      v-if="tab === item.component"
                      :key="item.component + '-' + activePatientId"
                      :px="px"
                      :document-focus-request="documentFocusRequest"
                      v-on:edit="isEdit = true"
                      v-on:delete="isDelete = true"
                      v-on:open-documents="openTabByComponent('da-patient-documents', $event)">
                    </component>
                </v-tab-item>
            </v-tabs-items>
            <div v-else class="px-6 py-8 text-center text-gray-500">
                No tienes permisos activos para consultar secciones del expediente.
            </div>
        </div>
        
    </div>
    
    <div v-if="isEdit" class="py-5" :class="{'animate-fade-in-left ease-in-out': isEdit}">
        <da-patient-form :id="id" v-on:cancel="onCancelEdit"></da-patient-form>
    </div>

    <da-dialog v-model="isDelete" :persist="true" :maxWidth="'500px'">
        <template #body>
            <da-sweet-confirm 
            :title="'Eliminar Paciente'" 
            :message="'¿Esta seguro de eliminar los datos del paciente seleccionado?'"
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

  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import VuexMixin from '../../mixins/VuexMixin';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import DAHistoryHeader from './components/DAHistoryHeader.vue';
import DAAlergyAlert from './components/DAAlergyAlert.vue';
import DASweetConfirm from '../../core/components/form/dialog/components/DASweetConfirm.vue';
import DocumentsAndSignatures from './Sections/DocumentsAndSignatures.vue';
import { DELETE } from '../../utils/lottieicon';
import { buildProfilePhotoPayload } from '../../domain/photo/photo.builder';


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
            isEditProfile: false,
            isUploadFile: false,
            DELETE,
            tab: 'da-medical-history',
            documentFocusRequest: null,
            configuration: [
                {name: 'Historia clínica', permission: 'px.tab.history', component: 'da-medical-history', icon: 'mdi-clipboard-text-outline'},
                {name: 'Odontograma', permission: 'px.tab.odontogram', component: 'da-odontogram', moduleFlag: 'odontogramEnabled', icon: 'mdi-tooth-outline'},
                // Modulo de fotos deshabilitado temporalmente.
                // {name: 'Fotos', permission: 'px.tab.photos', component: 'da-patient-photo'},
                {name: 'Seguimiento', permission: 'px.tab.monitoring', component: 'da-medical-monitoring', icon: 'mdi-calendar-clock-outline'},
                {name: 'Recetas', permission: 'px.tab.prescriptions', component: 'da-patient-prescriptions', icon: 'mdi-file-document-edit-outline'},
                {name: 'Documentos y firmas', permission: 'documents.view', component: 'da-patient-documents', icon: 'mdi-file-sign'},
                {name: 'Tratamiento', permission: 'px.tab.treatment', component: 'da-patient-treatment', moduleFlag: 'treatmentPlanEnabled', icon: 'mdi-medical-bag'},
            ],
        }
    },
    components: {
        'da-medical-history': () => import('./Sections/MedicalHistory.vue'),
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
    ...mapActions(moduleTypes.PX, [
            fnTypes.getById
    ]),
    ...mapActions(moduleTypes.CONFIGURATION, [
            fnTypes.getClinicalModules
    ]),
    init: async function() {
        await this.ActionWrapp(moduleTypes.CONFIGURATION, fnTypes.getClinicalModules)
        await this.ActionWrapp(moduleTypes.PX, fnTypes.getById, this.id)
        this.applyRequestedTab()
    },
    onCancelEdit: function() {
        this.isEdit = false;
        //this.init();
    },
    onFinish: async function(value) {
        if(value) {
            await this.ActionWrapp(moduleTypes.PX, fnTypes.remove, this.id)
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
    openTabByComponent: function(component, payload = null) {
        if(component === 'da-patient-documents') {
            this.documentFocusRequest = payload
                ? { ...payload, requestId: payload.requestId || Date.now() }
                : { requestId: Date.now() }
        }
        const exists = this.allowedTabs.some((item) => item.component === component)
        if(exists) {
            this.tab = component
        }
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
        return tabs[tab] || null
    },
    applyRequestedTab: function() {
        const requestedTab = this.$route && this.$route.query ? this.$route.query.tab : null
        const component = this.componentFromTabQuery(requestedTab)
        if(component) {
            this.openTabByComponent(component)
            return
        }
        this.ensureValidTab()
    },
    ensureValidTab: function() {
        if(!this.allowedTabs || this.allowedTabs.length === 0) {
            return
        }
        const exists = this.allowedTabs.some((item) => item.component === this.tab)
        if(!exists) {
            this.tab = this.allowedTabs[0].component
        }
    },
  },
  computed: {
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
            return this.px && this.px.person ? this.px.person.id_person : this.id
        },
        allowedTabs: function() {
            return this.configuration.filter((item) => {
                const hasModuleEnabled = !item.moduleFlag || Boolean(this.clinicalModules && this.clinicalModules[item.moduleFlag])
                return hasModuleEnabled && this.hasPermission(item.permission)
            })
        },

    },
    watch:  {
        isUploadFile: function() {
            if(this.isUploadFile) {
                this.isEditProfile = false
            }
        },
        '$route.query.tab': function() {
            this.applyRequestedTab()
        },
        allowedTabs: function() {
            this.ensureValidTab()
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
