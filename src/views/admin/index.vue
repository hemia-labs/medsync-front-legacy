<template>
    <div class="admin-page-shell">
        <div v-if="availableSections.length" class="admin-settings-grid">
            <admin-settings-sidebar
                v-model="isSettingsNavigationOpen"
                :sections="availableSections"
                :active-section="activeSection"
                @select="goToSection"
            ></admin-settings-sidebar>

            <main class="admin-settings-content" :inert="isSettingsNavigationOpen ? '' : null">
                <router-link v-if="returnToAppointments" to="/px/dates" class="inline-block mb-4 px-4 py-2 rounded-lg bg-white border border-primary-200 text-primary-900">Volver a Citas</router-link>
                <v-alert v-if="deniedSection" type="warning" dense text role="alert">No tienes acceso a ese apartado. Se muestran los ajustes que tienes autorizados.</v-alert>

                <admin-settings-header
                    :navigation-open="isSettingsNavigationOpen"
                    :active-section="activeSection"
                    :administrator="administrator"
                    :sections="availableSections"
                    @open-navigation="isSettingsNavigationOpen = true"
                ></admin-settings-header>

                <da-user-index v-if="activeSection === 'users'"></da-user-index>
                <da-config-index v-else :active-section="activeSection" @contact-plan="openPlanContact"></da-config-index>
            </main>
        </div>
    </div>
</template>

<script>
import './adminSettings.css';
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
            isSettingsNavigationOpen: false,
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
    methods: {
        openPlanContact() {
            if (!this.administrator) return this.$swal.fire({ icon: 'info', title: 'Cambiar plan', text: 'El administrador de tu consultorio puede cambiar el plan desde Plan y facturación.', confirmButtonText: 'Entendido' });
            return this.goToSection('plan-billing');
        },
        goToSection: async function(section) {
            if(section === this.activeSection && this.$route.query.guide !== '1') {
                return false
            }
            const query = section === this.activeSection ? { ...this.$route.query } : { section, ...(this.returnToAppointments ? { returnTo: '/px/dates' } : {}) }
            delete query.guide
            delete query.resume
            delete query.goal
            try {
                await this.$router.push({
                    path: '/admin',
                    query
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
            }
        }
    },
    watch: {
        activeSection: function() {
            this.isSettingsNavigationOpen = false
        }
    }
}
</script>

<style scoped>
.admin-page-shell { width:100%; margin:0; padding:28px 28px 40px var(--settings-sidebar-inset); }
.admin-settings-grid { display:grid; grid-template-columns:var(--settings-sidebar-width) minmax(0,1fr); gap:32px; align-items:start; }
.admin-settings-content { min-width:0; width:100%; }
@media(max-width:1025px) { .admin-settings-grid { grid-template-columns:minmax(0,1fr); } }
@media(max-width:639px) { .admin-page-shell { padding:18px 14px 28px; } }
</style>
