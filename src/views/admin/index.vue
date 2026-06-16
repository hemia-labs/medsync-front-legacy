<template>
    <div class="admin-page-shell mx-auto px-5 py-5">
        <admin-settings-header
            :value="mobileSection"
            :sections="availableSections"
            @change="goToSection"
        ></admin-settings-header>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <admin-settings-sidebar
                :sections="availableSections"
                :active-section="activeSection"
                @select="goToSection"
            ></admin-settings-sidebar>

            <main class="lg:col-span-9 min-w-0">
                <da-user-index v-if="activeSection === 'users'"></da-user-index>
                <da-config-index v-else :active-section="activeSection"></da-config-index>
            </main>
        </div>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import AdminSettingsHeader from './components/AdminSettingsHeader.vue';
import AdminSettingsSidebar from './components/AdminSettingsSidebar.vue';

export default {
    components: {
        'da-user-index': () => import('../User/DAUser.vue'),
        'da-config-index': () => import('../configuration/index.vue'),
        AdminSettingsHeader,
        AdminSettingsSidebar
    },
    data: function() {
        return {
            mobileSection: 'summary',
        }
    },
    computed: {
        ...mapGetters(moduleTypes.AUTH, {
            hasPermission: fnTypes.hasPermission
        }),
        sections: function() {
            return [
                {
                    key: 'summary',
                    title: 'Resumen',
                    description: 'Vista general del consultorio',
                    icon: 'mdi-view-dashboard-outline'
                },
                {
                    key: 'identity',
                    title: 'Informacion del consultorio',
                    description: 'Datos del consultorio',
                    icon: 'mdi-card-account-details-outline'
                },
                {
                    key: 'account-legal',
                    title: 'Cuenta y legal',
                    description: 'Documentos SaaS y legales',
                    icon: 'mdi-file-certificate-outline',
                    permission: 'admin.config'
                },
                {
                    key: 'users',
                    title: 'Personal y usuarios',
                    description: 'Doctores, asistentes y recepcion',
                    icon: 'mdi-account-group-outline'
                },
                {
                    key: 'roles-permissions',
                    title: 'Puestos y accesos',
                    description: 'Lo que puede hacer cada puesto',
                    icon: 'mdi-shield-key-outline'
                },
                {
                    key: 'doctor-identity',
                    title: 'Identidad del doctor',
                    description: 'Cedula, especialidad y firma',
                    icon: 'mdi-doctor'
                },
                {
                    key: 'prescriptions',
                    title: 'Recetas medicas',
                    description: 'Datos que aparecen en la receta',
                    icon: 'mdi-file-document-edit',
                    permission: 'prescriptions.config'
                },
                {
                    key: 'agenda',
                    title: 'Agenda clinica',
                    description: 'Horarios y dias no disponibles',
                    icon: 'mdi-calendar-clock'
                },
                {
                    key: 'clinical-modules',
                    title: 'Secciones clínicas',
                    description: 'Apartados visibles del expediente',
                    icon: 'mdi-view-module-outline'
                },
                {
                    key: 'clinical-history-template',
                    title: 'Plantilla de historia clínica',
                    description: 'Preguntas de la historia clínica',
                    icon: 'mdi-clipboard-text-outline',
                    permission: 'clinical_history_template.view'
                },
                {
                    key: 'documents',
                    title: 'Documentos y consentimientos',
                    description: 'Plantillas y consentimientos de pacientes',
                    icon: 'mdi-file-document-outline'
                },
                {
                    key: 'appearance',
                    title: 'Apariencia',
                    description: 'Logo y colores del sistema',
                    icon: 'mdi-palette-outline'
                }
            ]
        },
        availableSections: function() {
            return this.sections.filter((section) => {
                const allowedByPermission = !section.permission || this.hasPermission(section.permission)
                return allowedByPermission
            })
        },
        activeSection: function() {
            const requested = this.$route.query.section || 'summary'
            const exists = this.availableSections.some((section) => section.key === requested)
            return exists ? requested : 'summary'
        }
    },
    created() {
        this.mobileSection = this.activeSection
    },
    methods: {
        goToSection: function(section) {
            if(section === this.activeSection) {
                return
            }

            this.$router.push({
                path: '/admin',
                query: { section }
            })
        }
    },
    watch: {
        activeSection: function(value) {
            this.mobileSection = value
        }
    }
}
</script>

<style scoped>
.admin-page-shell {
    width: 100%;
    max-width: 96rem;
}
</style>
