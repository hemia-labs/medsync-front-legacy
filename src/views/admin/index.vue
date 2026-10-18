<template>
    <div class="admin-page-shell mx-auto px-5 py-5">
        <router-link v-if="returnToAppointments" to="/px/dates" class="inline-block mb-4 px-4 py-2 rounded-lg bg-white border border-primary-200 text-primary-900">Volver a Citas</router-link>
        <admin-settings-header
            :value="mobileSection"
            :administrator="administrator"
            :sections="availableSections"
            @change="goToSection"
        ></admin-settings-header>

        <v-alert v-if="deniedSection" type="warning" dense text role="alert">No tienes acceso a ese apartado. Se muestran los ajustes que tienes autorizados.</v-alert>
        <div v-if="availableSections.length" class="admin-settings-grid grid grid-cols-1 lg:grid-cols-12 gap-5">
            <admin-settings-sidebar
                :sections="availableSections"
                :active-section="activeSection"
                @select="goToSection"
            ></admin-settings-sidebar>

            <main class="lg:col-span-9 min-w-0">
                <da-user-index v-if="activeSection === 'users'"></da-user-index>
                <da-config-index v-else :active-section="activeSection" @contact-plan="openPlanContact"></da-config-index>
            </main>
        </div>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { getSettingsSections, isTenantAdministrator } from '../../security/settingsAccess';
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
            hasPermission: fnTypes.hasPermission,
            role: fnTypes.getRole
        }),
        administrator() { return isTenantAdministrator(this.role) },
        returnToAppointments() { return this.$route.query.returnTo === '/px/dates' },
        availableSections() { return getSettingsSections(this.role, this.hasPermission) },
        deniedSection() { return Boolean(this.$route.query.section && !this.availableSections.some(section=>section.key===this.$route.query.section)) },
        activeSection: function() {
            const requested = this.$route.query.section || 'summary'
            const exists = this.availableSections.some((section) => section.key === requested)
            return exists ? requested : (this.availableSections[0] || {}).key || ''
        }
    },
    created() {
        this.mobileSection = this.activeSection
    },
    methods: {
        openPlanContact() {
            this.$swal.fire({ icon: 'info', title: 'Solicitar un cambio de plan', text: 'Comunícate con el equipo de MedSync por el canal donde contrataste el servicio. Indica el nombre de tu consultorio y el plan que necesitas. Puedes seguir trabajando con tu plan actual mientras revisan la solicitud.', confirmButtonText: 'Entendido' })
        },
        goToSection: async function(section) {
            this.mobileSection = section
            if(section === this.activeSection) {
                return false
            }
            try {
                await this.$router.push({
                    path: '/admin',
                    query: { section, ...(this.returnToAppointments ? { returnTo: '/px/dates' } : {}) }
                })
                await this.$nextTick()
                if(typeof window !== 'undefined') window.scrollTo(0, 0)
                return true
            } catch(error) {
                const isNavigationFailure = this.$router.constructor && this.$router.constructor.isNavigationFailure
                const knownFailure = typeof isNavigationFailure === 'function' && isNavigationFailure(error)
                    || error && ['NavigationDuplicated', 'NavigationAborted', 'NavigationCancelled', 'NavigationRedirected'].includes(error.name)
                if(!knownFailure) throw error
                return false
            } finally {
                await this.$nextTick()
                this.mobileSection = this.activeSection
            }
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
.admin-settings-grid { align-items: start; }
@media (max-width: 639px) {
    .admin-page-shell { padding: 1rem .75rem; }
}
</style>
